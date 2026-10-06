//! Voce locale sul PC con Piper: leggera, gira sul processore (niente Python, niente scheda video),
//! ed è molte volte più veloce del parlato anche su PC modesti (misurato: Paola 8×, Riccardo 15× su un processore da server).
//!
//! Tutto sta nella cartella dati dell'app, sotto `piper/`:
//!   piper/            il programma (piper.exe con le sue librerie e i dati di espeak-ng), scaricato da GitHub (rhasspy/piper)
//!   voci/<nome>.onnx  le voci italiane, scaricate da Hugging Face (rhasspy/piper-voices), con il loro .onnx.json
//! Il programma resta acceso con la voce caricata (`--json-input`): ogni frase è una riga JSON, Piper risponde con
//! il percorso del file .wav appena scritto. Si spegne da solo dopo qualche minuto fermo (impostazioni).

use serde_json::{json, Value};
use std::io::{BufRead, BufReader, Write};
use std::path::PathBuf;
use std::process::{Child, ChildStdin, ChildStdout, Command, Stdio};
use std::sync::Mutex;
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter, Manager};

const PIPER_ZIP: &str = "https://github.com/rhasspy/piper/releases/download/2023.11.14-2/piper_windows_amd64.zip";
const PIPER_TGZ: &str = "https://github.com/rhasspy/piper/releases/download/2023.11.14-2/piper_linux_x86_64.tar.gz";
const VOICES_URL: &str = "https://huggingface.co/rhasspy/piper-voices/resolve/main/";

/// (id, lingua, nome mostrato in italiano, in inglese, percorso su Hugging Face, MB)
pub const VOICES: &[(&str, &str, &str, &str, &str, u32)] = &[
    ("paola", "it", "Paola · donna", "Paola · female", "it/it_IT/paola/medium/it_IT-paola-medium", 61),
    ("riccardo", "it", "Riccardo · uomo, più leggera", "Riccardo · male, lighter", "it/it_IT/riccardo/x_low/it_IT-riccardo-x_low", 27),
    ("lessac", "en", "Lessac · donna (inglese US)", "Lessac · female (US English)", "en/en_US/lessac/medium/en_US-lessac-medium", 61),
    ("ryan", "en", "Ryan · uomo (inglese US)", "Ryan · male (US English)", "en/en_US/ryan/medium/en_US-ryan-medium", 61),
];
pub const DEFAULT_VOICE: &str = "paola";

struct Engine {
    child: Child,
    stdin: ChildStdin,
    out: BufReader<ChildStdout>,
    voice: String,
}

pub struct LocalTts {
    engine: Mutex<Option<Engine>>,
    last_used: Mutex<Instant>,
    installing: Mutex<bool>,
    last: Mutex<Option<(f64, f64)>>, // ultima frase: (secondi di calcolo, secondi di voce)
}

impl LocalTts {
    pub fn new() -> Self {
        Self { engine: Mutex::new(None), last_used: Mutex::new(Instant::now()), installing: Mutex::new(false), last: Mutex::new(None) }
    }
}

fn base(app: &AppHandle) -> PathBuf {
    let d = crate::settings::data_dir(app).join("piper");
    let _ = std::fs::create_dir_all(&d);
    d
}
fn exe(app: &AppHandle) -> PathBuf {
    base(app).join("piper").join(if cfg!(windows) { "piper.exe" } else { "piper" })
}
fn voice_file(app: &AppHandle, id: &str) -> PathBuf {
    base(app).join("voci").join(format!("{id}.onnx"))
}
/// una voce sconosciuta (per esempio quella di Qwen nelle impostazioni vecchie) diventa quella predefinita
pub fn voice_id(id: &str) -> &'static str {
    VOICES.iter().find(|v| v.0 == id).map(|v| v.0).unwrap_or(DEFAULT_VOICE)
}
fn has_voice(app: &AppHandle, id: &str) -> bool {
    voice_file(app, id).exists() && voice_file(app, id).with_extension("onnx.json").exists()
}

/// niente finestra nera del terminale su Windows
fn quiet(cmd: &mut Command) -> &mut Command {
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(0x0800_0000);
    }
    cmd
}

/// la cartella della vecchia voce Qwen3-TTS (circa 5 GB): se c'è, le impostazioni propongono di eliminarla
fn old_qwen(app: &AppHandle) -> PathBuf {
    crate::settings::data_dir(app).join("tts")
}
fn dir_size(p: &std::path::Path) -> u64 {
    let Ok(rd) = std::fs::read_dir(p) else { return 0 };
    rd.flatten()
        .map(|e| match e.file_type() {
            Ok(t) if t.is_dir() => dir_size(&e.path()),
            Ok(_) => e.metadata().map(|m| m.len()).unwrap_or(0),
            Err(_) => 0,
        })
        .sum()
}
pub fn remove_old(app: &AppHandle) -> Result<(), String> {
    let p = old_qwen(app);
    if p.exists() {
        std::fs::remove_dir_all(&p).map_err(|e| format!("{} {}: {e}", crate::settings::t("Non riesco a eliminare", "Can't delete"), p.display()))?;
        crate::log::write(app, "info", "eliminata la vecchia voce Qwen3-TTS");
    }
    Ok(())
}

pub fn status(app: &AppHandle, st: &LocalTts) -> Value {
    let old = old_qwen(app);
    json!({
        "installed": exe(app).exists() && VOICES.iter().any(|v| has_voice(app, v.0)),
        "running": st.engine.lock().unwrap().is_some(),
        "installing": *st.installing.lock().unwrap(),
        "old_qwen_mb": if old.exists() { dir_size(&old) / 1_048_576 } else { 0 },
    })
}

pub fn voices(app: &AppHandle) -> Value {
    json!(VOICES
        .iter()
        .map(|(id, lang, it, en, _, mb)| json!({ "id": id, "lang": lang, "name": if crate::settings::en() { en } else { it }, "mb": mb, "downloaded": has_voice(app, id) }))
        .collect::<Vec<_>>())
}

fn progress(app: &AppHandle, frac: Option<f64>, msg: &str) {
    let _ = app.emit("tts-install", json!({ "frac": frac, "msg": msg }));
}

/* ---------------- installazione ---------------- */

async fn download(app: &AppHandle, url: &str, label: &str) -> Result<Vec<u8>, String> {
    use futures_util::StreamExt;
    let r = reqwest::get(url).await.map_err(|e| format!("{} ({label}): {e}", crate::settings::t("Download non riuscito", "Download failed")))?;
    if !r.status().is_success() {
        return Err(format!("{} ({label}): {}", crate::settings::t("Download non riuscito", "Download failed"), r.status()));
    }
    let total = r.content_length().unwrap_or(0);
    let mut data = Vec::with_capacity(total as usize);
    let mut stream = r.bytes_stream();
    let mut last = Instant::now();
    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| format!("{} ({label}): {e}", crate::settings::t("Download interrotto", "Download interrupted")))?;
        data.extend_from_slice(&chunk);
        if last.elapsed() > Duration::from_millis(200) {
            last = Instant::now();
            let f = if total > 0 { Some(data.len() as f64 / total as f64) } else { None };
            progress(app, f, &format!("{} {label}… {} MB", crate::settings::t("Scarico", "Downloading"), data.len() / 1_048_576));
        }
    }
    Ok(data)
}

/// scarica il programma (se manca) e la voce `voice` (se manca)
pub async fn install(app: AppHandle, voice: String) -> Result<(), String> {
    let st = app.state::<LocalTts>();
    {
        let mut i = st.installing.lock().unwrap();
        if *i {
            return Err(crate::settings::t("Installazione già in corso", "Installation already running"));
        }
        *i = true;
    }
    let result = install_inner(&app, voice_id(&voice)).await;
    *app.state::<LocalTts>().installing.lock().unwrap() = false;
    if let Err(e) = &result {
        crate::log::write(&app, "errore", &format!("installazione voce locale: {e}"));
    }
    result
}

async fn install_inner(app: &AppHandle, voice: &str) -> Result<(), String> {
    let b = base(app);
    if !exe(app).exists() {
        if cfg!(windows) {
            let zip = download(app, PIPER_ZIP, &crate::settings::t("il programma Piper", "the Piper program")).await?;
            progress(app, None, &crate::settings::t("Estraggo Piper…", "Extracting Piper…"));
            let mut z = zip::ZipArchive::new(std::io::Cursor::new(zip)).map_err(|e| e.to_string())?;
            z.extract(&b).map_err(|e| format!("{}: {e}", crate::settings::t("Estrazione di Piper non riuscita", "Extracting Piper failed")))?;
        } else {
            // sviluppo su Linux: archivio .tar.gz, estratto con tar
            let tgz = download(app, PIPER_TGZ, &crate::settings::t("il programma Piper", "the Piper program")).await?;
            let f = b.join("piper.tgz");
            std::fs::write(&f, tgz).map_err(|e| e.to_string())?;
            let ok = Command::new("tar").arg("xzf").arg(&f).current_dir(&b).status().map(|s| s.success()).unwrap_or(false);
            let _ = std::fs::remove_file(&f);
            if !ok {
                return Err(crate::settings::t("Estrazione di Piper non riuscita", "Extracting Piper failed"));
            }
        }
        if !exe(app).exists() {
            return Err(crate::settings::t("Piper scaricato, ma non trovo il programma nell'archivio", "Piper downloaded, but the program isn't in the archive"));
        }
    }
    if !has_voice(app, voice) {
        let (_, _, name, _, path, _) = VOICES.iter().find(|v| v.0 == voice).unwrap();
        let dir = b.join("voci");
        std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
        let json_data = download(app, &format!("{VOICES_URL}{path}.onnx.json"), &crate::settings::t("la scheda della voce", "the voice details")).await?;
        let model = download(app, &format!("{VOICES_URL}{path}.onnx"), &format!("{} {}", crate::settings::t("la voce", "the voice"), name.split(' ').next().unwrap_or(voice))).await?;
        // prima il modello in un file temporaneo, poi i nomi definitivi: una voce a metà non risulta mai "scaricata"
        let tmp = dir.join(format!("{voice}.onnx.part"));
        std::fs::write(&tmp, model).map_err(|e| e.to_string())?;
        std::fs::write(voice_file(app, voice).with_extension("onnx.json"), json_data).map_err(|e| e.to_string())?;
        std::fs::rename(&tmp, voice_file(app, voice)).map_err(|e| e.to_string())?;
    }
    progress(app, Some(1.0), &crate::settings::t("Voce locale pronta", "Local voice ready"));
    Ok(())
}

/* ---------------- il programma acceso ---------------- */

fn start(app: &AppHandle, voice: &str) -> Result<Engine, String> {
    if !exe(app).exists() || !has_voice(app, voice) {
        return Err(crate::settings::t("La voce locale non è installata (Impostazioni → Testo → voce → Sul mio PC)", "The local voice isn't installed (Settings → Text to speech → On my PC)"));
    }
    let tmp = std::env::temp_dir().join("iris-notch-voce");
    let _ = std::fs::create_dir_all(&tmp);
    let mut cmd = Command::new(exe(app));
    cmd.arg("--model").arg(voice_file(app, voice)).arg("--json-input").arg("--output_dir").arg(&tmp);
    if let Some(dir) = exe(app).parent() {
        cmd.current_dir(dir);
    }
    // quello che Piper scrive sugli errori va in logs/voce-locale.log
    let err = match crate::log::file(app, "voce-locale.log") {
        Some(mut f) => {
            let _ = writeln!(f, "\n===== {} avvio di Piper (voce {voice}) =====", crate::log::now());
            Stdio::from(f)
        }
        None => Stdio::null(),
    };
    let mut child = quiet(&mut cmd).stdin(Stdio::piped()).stdout(Stdio::piped()).stderr(err).spawn().map_err(|e| format!("{}: {e}", crate::settings::t("Non riesco ad avviare la voce locale", "Can't start the local voice")))?;
    let stdin = child.stdin.take().ok_or("stdin di Piper non disponibile")?;
    let out = BufReader::new(child.stdout.take().ok_or("stdout di Piper non disponibile")?);
    Ok(Engine { child, stdin, out, voice: voice.to_string() })
}

/// una frase: riga JSON a Piper, che risponde con il percorso del .wav
fn say(e: &mut Engine, text: &str) -> Result<Vec<u8>, String> {
    static N: std::sync::atomic::AtomicU64 = std::sync::atomic::AtomicU64::new(0);
    let n = N.fetch_add(1, std::sync::atomic::Ordering::Relaxed);
    let file = std::env::temp_dir().join("iris-notch-voce").join(format!("frase-{}-{n}.wav", std::process::id()));
    let line = json!({ "text": text, "output_file": file }).to_string();
    writeln!(e.stdin, "{line}").and_then(|_| e.stdin.flush()).map_err(|_| "La voce locale si è chiusa".to_string())?;
    let mut answer = String::new();
    if e.out.read_line(&mut answer).map_err(|e| e.to_string())? == 0 {
        return Err(crate::settings::t("La voce locale si è chiusa (dettagli in logs/voce-locale.log)", "The local voice closed (details in logs/voce-locale.log)"));
    }
    let path = PathBuf::from(answer.trim());
    let data = std::fs::read(&path).map_err(|err| format!("{}: {err}", crate::settings::t("Non trovo l'audio della voce locale", "Can't find the local voice audio")))?;
    let _ = std::fs::remove_file(&path);
    Ok(data)
}

/// secondi di voce in un .wav PCM a 16 bit mono (intestazione standard di 44 byte)
fn wav_seconds(w: &[u8]) -> f64 {
    if w.len() < 44 {
        return 0.0;
    }
    let rate = u32::from_le_bytes([w[24], w[25], w[26], w[27]]).max(1) as f64;
    (w.len() - 44) as f64 / (rate * 2.0)
}

pub async fn speak(app: &AppHandle, text: &str, voice: &str, _speed: f32) -> Result<Vec<u8>, String> {
    let text = text.split_whitespace().collect::<Vec<_>>().join(" ");
    if text.is_empty() {
        return Err(crate::settings::t("Niente da leggere", "Nothing to read"));
    }
    // la voce scelta non è ancora scaricata (per esempio appena cambiata lingua): si usa una già presente,
    // prima della stessa lingua, così si sente comunque qualcosa invece di un errore
    let mut voice = voice_id(voice).to_string();
    if !has_voice(app, &voice) {
        let lang = VOICES.iter().find(|v| v.0 == voice).map(|v| v.1).unwrap_or("it");
        if let Some(v) = VOICES.iter().filter(|v| has_voice(app, v.0)).min_by_key(|v| (v.1 != lang) as u8) {
            voice = v.0.to_string();
        }
    }
    let app2 = app.clone();
    tauri::async_runtime::spawn_blocking(move || {
        let st = app2.state::<LocalTts>();
        *st.last_used.lock().unwrap() = Instant::now();
        let mut g = st.engine.lock().unwrap();
        for attempt in 0..2 {
            if g.as_ref().map(|e| e.voice != voice).unwrap_or(true) {
                if let Some(mut old) = g.take() {
                    let _ = old.child.kill();
                }
                *g = Some(start(&app2, &voice)?);
            }
            let t0 = Instant::now();
            match say(g.as_mut().unwrap(), &text) {
                Ok(wav) => {
                    *st.last.lock().unwrap() = Some((t0.elapsed().as_secs_f64(), wav_seconds(&wav)));
                    return Ok(wav);
                }
                Err(e) => {
                    if let Some(mut old) = g.take() {
                        let _ = old.child.kill();
                    }
                    if attempt == 1 {
                        return Err(e);
                    }
                }
            }
        }
        Err(crate::settings::t("La voce locale non risponde", "The local voice isn't responding"))
    })
    .await
    .map_err(|e| e.to_string())?
}

/// carica la voce in anticipo, così la prima frase non aspetta l'avvio
pub async fn warm(app: &AppHandle, voice: &str) -> Result<(), String> {
    let (app2, voice) = (app.clone(), voice_id(voice).to_string());
    tauri::async_runtime::spawn_blocking(move || {
        let st = app2.state::<LocalTts>();
        *st.last_used.lock().unwrap() = Instant::now();
        let mut g = st.engine.lock().unwrap();
        if g.as_ref().map(|e| e.voice != voice).unwrap_or(true) {
            if let Some(mut old) = g.take() {
                let _ = old.child.kill();
            }
            *g = Some(start(&app2, &voice)?);
        }
        Ok(())
    })
    .await
    .map_err(|e| e.to_string())?
}

pub async fn health(app: &AppHandle) -> Value {
    let st = app.state::<LocalTts>();
    let running = st.engine.lock().unwrap().is_some();
    let last = *st.last.lock().unwrap();
    json!({
        "running": running,
        "ultima_frase": last.map(|(c, a)| json!({ "calcolo_s": c, "audio_s": a })),
    })
}

pub fn stop(app: &AppHandle) {
    if let Some(mut e) = app.state::<LocalTts>().engine.lock().unwrap().take() {
        let _ = e.child.kill();
    }
}

pub fn stop_if_idle(app: &AppHandle, minutes: u64) {
    if minutes == 0 {
        return;
    }
    let st = app.state::<LocalTts>();
    if st.last_used.lock().unwrap().elapsed() > Duration::from_secs(minutes * 60) {
        stop(app);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn wav_length() {
        let mut w = vec![0u8; 44];
        w[24..28].copy_from_slice(&22050u32.to_le_bytes());
        w.extend(vec![0u8; 22050 * 2 * 3]);
        assert!((wav_seconds(&w) - 3.0).abs() < 1e-9);
        assert_eq!(wav_seconds(&[0u8; 10]), 0.0);
    }

    #[test]
    fn unknown_voice_becomes_default() {
        assert_eq!(voice_id("iris-vellutata"), "paola");
        assert_eq!(voice_id("riccardo"), "riccardo");
    }
}
