//! Voce -> testo.
//! - Registrazione: cpal, microfono predefinito, mescolato in mono. Il livello va all'interfaccia ("mic-level")
//!   così gli occhi "ascoltano" davvero.
//! - Trascrizione locale: whisper.cpp (whisper-rs). Su Windows con Vulkan, quindi usa la scheda video
//!   senza CUDA. Il modello si carica al primo uso e lascia la scheda video dopo N minuti di inattività.
//! - Trascrizione su server: compatibile OpenAI (/v1/audio/transcriptions) o whisper.cpp server (/inference).

use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use std::path::PathBuf;
use std::sync::mpsc;
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter};
use whisper_rs::{FullParams, SamplingStrategy, WhisperContext, WhisperContextParameters};

const MAX_SECONDS: usize = 120;

/* ---------------- registrazione ---------------- */

pub struct Recorder {
    stop_tx: mpsc::Sender<()>,
    handle: std::thread::JoinHandle<Result<(), String>>,
    samples: Arc<Mutex<Vec<f32>>>,
    rate: Arc<Mutex<u32>>,
}

impl Recorder {
    pub fn start(app: AppHandle) -> Result<Self, String> {
        let samples = Arc::new(Mutex::new(Vec::<f32>::new()));
        let rate = Arc::new(Mutex::new(16000u32));
        let (stop_tx, stop_rx) = mpsc::channel::<()>();
        let (ready_tx, ready_rx) = mpsc::channel::<Result<(), String>>();
        let (s2, r2) = (samples.clone(), rate.clone());
        // lo stream di cpal non si può spostare tra thread: vive tutto qui dentro
        let handle = std::thread::spawn(move || -> Result<(), String> {
            let host = cpal::default_host();
            let dev = match host.default_input_device() {
                Some(d) => d,
                None => {
                    let _ = ready_tx.send(Err("Nessun microfono trovato".into()));
                    return Ok(());
                }
            };
            let cfg = match dev.default_input_config() {
                Ok(c) => c,
                Err(e) => {
                    let _ = ready_tx.send(Err(format!("Microfono non utilizzabile: {e}")));
                    return Ok(());
                }
            };
            let channels = cfg.channels() as usize;
            *r2.lock().unwrap() = cfg.sample_rate().0;
            let max = cfg.sample_rate().0 as usize * MAX_SECONDS;
            let buf = s2.clone();
            let push = move |mono: &mut dyn Iterator<Item = f32>| {
                let mut b = buf.lock().unwrap();
                for v in mono {
                    if b.len() < max {
                        b.push(v);
                    }
                }
            };
            let on_err = |e| eprintln!("errore microfono: {e}");
            let stream = match cfg.sample_format() {
                cpal::SampleFormat::F32 => dev.build_input_stream(
                    &cfg.clone().into(),
                    move |d: &[f32], _: &_| push(&mut d.chunks(channels).map(|c| c.iter().sum::<f32>() / channels as f32)),
                    on_err,
                    None,
                ),
                cpal::SampleFormat::I16 => dev.build_input_stream(
                    &cfg.clone().into(),
                    move |d: &[i16], _: &_| push(&mut d.chunks(channels).map(|c| c.iter().map(|&v| v as f32 / 32768.0).sum::<f32>() / channels as f32)),
                    on_err,
                    None,
                ),
                cpal::SampleFormat::U16 => dev.build_input_stream(
                    &cfg.clone().into(),
                    move |d: &[u16], _: &_| push(&mut d.chunks(channels).map(|c| c.iter().map(|&v| (v as f32 - 32768.0) / 32768.0).sum::<f32>() / channels as f32)),
                    on_err,
                    None,
                ),
                f => {
                    let _ = ready_tx.send(Err(format!("Formato audio del microfono non supportato: {f:?}")));
                    return Ok(());
                }
            };
            let stream = match stream {
                Ok(s) => s,
                Err(e) => {
                    let _ = ready_tx.send(Err(format!("Non riesco ad aprire il microfono: {e}")));
                    return Ok(());
                }
            };
            if let Err(e) = stream.play() {
                let _ = ready_tx.send(Err(format!("Non riesco ad avviare il microfono: {e}")));
                return Ok(());
            }
            let _ = ready_tx.send(Ok(()));
            // livello per gli occhi, ogni 50 ms, finché non arriva lo stop
            let win = (cfg.sample_rate().0 / 20) as usize;
            loop {
                match stop_rx.recv_timeout(Duration::from_millis(50)) {
                    Err(mpsc::RecvTimeoutError::Timeout) => {
                        let b = s2.lock().unwrap();
                        let tail = &b[b.len().saturating_sub(win)..];
                        let rms = (tail.iter().map(|v| v * v).sum::<f32>() / tail.len().max(1) as f32).sqrt();
                        drop(b);
                        let _ = app.emit("mic-level", (rms * 9.0).min(1.0));
                    }
                    _ => break,
                }
            }
            drop(stream);
            let _ = app.emit("mic-level", 0.0f32);
            Ok(())
        });
        match ready_rx.recv_timeout(Duration::from_secs(5)) {
            Ok(Ok(())) => Ok(Self { stop_tx, handle, samples, rate }),
            Ok(Err(e)) => Err(e),
            Err(_) => Err("Il microfono non risponde".into()),
        }
    }

    /// ferma e restituisce l'audio a 16 kHz mono
    pub fn stop(self) -> Vec<f32> {
        let _ = self.stop_tx.send(());
        let _ = self.handle.join();
        let rate = *self.rate.lock().unwrap();
        let s = std::mem::take(&mut *self.samples.lock().unwrap());
        resample(&s, rate, 16000)
    }
}

fn resample(input: &[f32], from: u32, to: u32) -> Vec<f32> {
    if from == to || input.is_empty() {
        return input.to_vec();
    }
    let ratio = from as f64 / to as f64;
    let n = (input.len() as f64 / ratio) as usize;
    (0..n)
        .map(|i| {
            // media sulla finestra della sorgente: evita l'aliasing scendendo da 48 kHz
            let a = (i as f64 * ratio) as usize;
            let b = (((i + 1) as f64 * ratio) as usize).min(input.len()).max(a + 1);
            input[a..b].iter().sum::<f32>() / (b - a) as f32
        })
        .collect()
}

/* ---------------- modelli ---------------- */

pub fn model_url(name: &str) -> Option<&'static str> {
    match name {
        "large-v3-turbo-q5_0" => Some("https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3-turbo-q5_0.bin"),
        "small-q5_1" => Some("https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small-q5_1.bin"),
        _ => None,
    }
}

pub fn model_path(app: &AppHandle, name: &str) -> PathBuf {
    let dir = crate::settings::data_dir(app).join("models");
    let _ = std::fs::create_dir_all(&dir);
    dir.join(format!("ggml-{name}.bin"))
}

pub async fn download_model(app: AppHandle, name: String) -> Result<(), String> {
    use futures_util::StreamExt;
    use tokio::io::AsyncWriteExt;
    let url = model_url(&name).ok_or("Modello sconosciuto")?;
    let dest = model_path(&app, &name);
    let part = dest.with_extension("part");
    let r = reqwest::get(url).await.map_err(|e| format!("Download non riuscito: {e}"))?;
    if !r.status().is_success() {
        return Err(format!("Download non riuscito: {}", r.status()));
    }
    let total = r.content_length().unwrap_or(0);
    let mut f = tokio::fs::File::create(&part).await.map_err(|e| e.to_string())?;
    let mut got = 0u64;
    let mut last = -1i64;
    let mut stream = r.bytes_stream();
    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| format!("Download interrotto: {e}"))?;
        f.write_all(&chunk).await.map_err(|e| e.to_string())?;
        got += chunk.len() as u64;
        if total > 0 {
            let pct = (got * 100 / total) as i64;
            if pct != last {
                last = pct;
                let _ = app.emit("model-progress", got as f64 / total as f64);
            }
        }
    }
    f.flush().await.map_err(|e| e.to_string())?;
    drop(f);
    tokio::fs::rename(&part, &dest).await.map_err(|e| e.to_string())?;
    Ok(())
}

/* ---------------- trascrizione locale ---------------- */

struct Loaded {
    name: String,
    ctx: WhisperContext,
    last_used: Instant,
}

static LOADED: Mutex<Option<Loaded>> = Mutex::new(None);

pub fn is_loaded() -> bool {
    LOADED.lock().map(|l| l.is_some()).unwrap_or(false)
}

/// chiamata periodicamente: libera la scheda video dopo `minutes` di inattività
pub fn unload_if_idle(minutes: u64) {
    if minutes == 0 {
        return;
    }
    if let Ok(mut l) = LOADED.lock() {
        if l.as_ref().is_some_and(|m| m.last_used.elapsed() > Duration::from_secs(minutes * 60)) {
            *l = None;
        }
    }
}

pub fn transcribe_local(path: PathBuf, name: &str, language: &str, audio: &[f32]) -> Result<String, String> {
    if !path.exists() {
        return Err("Modello non ancora scaricato (Impostazioni → Voce → testo → Scarica)".into());
    }
    let mut guard = LOADED.lock().map_err(|_| "stato del modello non disponibile")?;
    if guard.as_ref().map(|m| m.name != name).unwrap_or(true) {
        *guard = None; // libera il vecchio prima di caricare il nuovo
        let ctx = WhisperContext::new_with_params(path.to_str().unwrap_or_default(), WhisperContextParameters::default())
            .map_err(|e| format!("Non riesco a caricare il modello: {e}"))?;
        *guard = Some(Loaded { name: name.to_string(), ctx, last_used: Instant::now() });
    }
    let loaded = guard.as_mut().unwrap();
    loaded.last_used = Instant::now();
    let mut state = loaded.ctx.create_state().map_err(|e| e.to_string())?;
    let mut p = FullParams::new(SamplingStrategy::Greedy { best_of: 1 });
    p.set_language(Some(if language.is_empty() { "auto" } else { language }));
    p.set_n_threads(std::thread::available_parallelism().map(|n| n.get() as i32).unwrap_or(4).min(8));
    p.set_print_progress(false);
    p.set_print_realtime(false);
    p.set_print_special(false);
    p.set_print_timestamps(false);
    p.set_suppress_blank(true);
    p.set_no_context(true);
    state.full(p, audio).map_err(|e| format!("Trascrizione non riuscita: {e}"))?;
    let mut text = String::new();
    for seg in state.as_iter() {
        text.push_str(&seg.to_string());
    }
    Ok(clean(&text))
}

/// whisper a volte "sente" frasi fatte nel silenzio: le togliamo
fn clean(t: &str) -> String {
    let t = t.trim();
    let junk = ["[BLANK_AUDIO]", "(silenzio)", "[Musica]", "Sottotitoli creati dalla comunità Amara.org", "Sottotitoli a cura di QTSS"];
    if junk.iter().any(|j| t.eq_ignore_ascii_case(j)) {
        return String::new();
    }
    t.to_string()
}

/* ---------------- trascrizione su server ---------------- */

fn wav(audio: &[f32]) -> Vec<u8> {
    let data_len = (audio.len() * 2) as u32;
    let mut v = Vec::with_capacity(44 + data_len as usize);
    v.extend_from_slice(b"RIFF");
    v.extend_from_slice(&(36 + data_len).to_le_bytes());
    v.extend_from_slice(b"WAVEfmt ");
    v.extend_from_slice(&16u32.to_le_bytes());
    v.extend_from_slice(&1u16.to_le_bytes()); // PCM
    v.extend_from_slice(&1u16.to_le_bytes()); // mono
    v.extend_from_slice(&16000u32.to_le_bytes());
    v.extend_from_slice(&32000u32.to_le_bytes());
    v.extend_from_slice(&2u16.to_le_bytes());
    v.extend_from_slice(&16u16.to_le_bytes());
    v.extend_from_slice(b"data");
    v.extend_from_slice(&data_len.to_le_bytes());
    for s in audio {
        v.extend_from_slice(&((s.clamp(-1.0, 1.0) * 32767.0) as i16).to_le_bytes());
    }
    v
}

pub async fn transcribe_server(kind: &str, url: &str, key: Option<String>, language: &str, audio: &[f32]) -> Result<String, String> {
    let url = url.trim().trim_end_matches('/');
    if url.is_empty() {
        return Err("Indirizzo del server Whisper non impostato".into());
    }
    let part = reqwest::multipart::Part::bytes(wav(audio)).file_name("audio.wav").mime_str("audio/wav").map_err(|e| e.to_string())?;
    let mut form = reqwest::multipart::Form::new().part("file", part).text("response_format", "json");
    if !language.is_empty() {
        form = form.text("language", language.to_string());
    }
    let endpoint = if kind == "whispercpp" {
        format!("{url}/inference")
    } else {
        form = form.text("model", "whisper-1");
        format!("{url}/v1/audio/transcriptions")
    };
    let mut rb = reqwest::Client::new().post(endpoint).multipart(form).timeout(Duration::from_secs(60));
    if let Some(k) = key {
        rb = rb.bearer_auth(k);
    }
    let r = rb.send().await.map_err(|e| format!("Server Whisper non raggiungibile: {e}"))?;
    let status = r.status();
    let v: serde_json::Value = r.json().await.map_err(|e| format!("Risposta del server Whisper non valida: {e}"))?;
    if !status.is_success() {
        return Err(format!("Il server Whisper ha risposto {status}"));
    }
    Ok(clean(v["text"].as_str().unwrap_or_default()))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn resample_48k_to_16k() {
        let input: Vec<f32> = (0..48000).map(|i| (i as f32 / 48000.0)).collect();
        let out = resample(&input, 48000, 16000);
        assert_eq!(out.len(), 16000);
    }

    #[test]
    fn wav_header() {
        let w = wav(&[0.0, 0.5, -0.5]);
        assert_eq!(&w[0..4], b"RIFF");
        assert_eq!(w.len(), 44 + 6);
    }

    #[test]
    fn cleans_silence_hallucinations() {
        assert_eq!(clean(" [BLANK_AUDIO] "), "");
        assert_eq!(clean(" Che tempo fa? "), "Che tempo fa?");
    }
}
