//! Testo -> voce su server compatibile OpenAI (POST /v1/audio/speech): per esempio Piper o Kokoro dietro
//! openedai-speech, Kokoro-FastAPI o speaches. La voce di Windows invece la usa direttamente l'interfaccia.

use serde_json::json;
use std::time::Duration;

pub async fn synthesize(url: &str, voice: &str, speed: f32, key: Option<String>, text: &str) -> Result<Vec<u8>, String> {
    let url = url.trim().trim_end_matches('/');
    if url.is_empty() {
        return Err(crate::settings::t("Indirizzo del server TTS non impostato", "TTS server address not set"));
    }
    let body = json!({
        "model": "tts-1",
        "input": text,
        "voice": if voice.is_empty() { "alloy" } else { voice },
        "response_format": "mp3",
        "speed": speed,
    });
    let mut rb = reqwest::Client::new().post(format!("{url}/v1/audio/speech")).json(&body).timeout(Duration::from_secs(60));
    if let Some(k) = key {
        rb = rb.bearer_auth(k);
    }
    let r = rb.send().await.map_err(|e| format!("{}: {e}", crate::settings::t("Server TTS non raggiungibile", "TTS server can't be reached")))?;
    if !r.status().is_success() {
        return Err(format!("{} {}", crate::settings::t("Il server TTS ha risposto", "The TTS server replied"), r.status()));
    }
    Ok(r.bytes().await.map_err(|e| e.to_string())?.to_vec())
}
