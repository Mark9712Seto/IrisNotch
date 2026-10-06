//! Impostazioni dell'isola. Il file JSON sta nella cartella di configurazione dell'app;
//! le chiavi (Hermes, server Whisper, server TTS) stanno nel Gestore credenziali di Windows
//! e non tornano mai all'interfaccia: l'interfaccia vede solo se ci sono.

use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use tauri::{AppHandle, Manager};

const KEYRING_SERVICE: &str = "IrisVolto";

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct Stt {
    /// "local" (Whisper sul PC) oppure "server"
    pub mode: String,
    pub model: String,
    /// "openai" (/v1/audio/transcriptions) oppure "whispercpp" (/inference)
    pub server_type: String,
    pub server_url: String,
    pub language: String,
    /// minuti di inattività dopo cui il modello lascia la scheda video (0 = mai)
    pub unload_minutes: u64,
    pub send_without_preview: bool,
    /// voce compatta: con l'isola chiusa la scorciatoia "premi e parla" usa solo la tacca, senza aprire la chat
    pub compact: bool,
}

impl Default for Stt {
    fn default() -> Self {
        Self {
            mode: "local".into(),
            model: "large-v3-turbo-q5_0".into(),
            server_type: "openai".into(),
            server_url: String::new(),
            language: "it".into(),
            unload_minutes: 10,
            send_without_preview: false,
            compact: true,
        }
    }
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct Tts {
    pub auto: bool,
    pub chime: bool,
    /// "system" (voci di Windows) oppure "server" (/v1/audio/speech)
    pub engine: String,
    pub voice: String,
    pub server_url: String,
    pub server_voice: String,
    pub rate: f32,
    /// volume della voce e dei suoni, da 0 a 1
    pub volume: f32,
    /// voce locale (Piper) scelta: "paola" o "riccardo"
    pub local_voice: String,
    /// minuti di inattività dopo cui il motore vocale locale si spegne (0 = mai)
    pub unload_minutes: u64,
}

impl Default for Tts {
    fn default() -> Self {
        Self {
            auto: false,
            chime: true,
            engine: "system".into(),
            voice: String::new(),
            server_url: String::new(),
            server_voice: String::new(),
            rate: 1.0,
            volume: 1.0,
            local_voice: "paola".into(),
            unload_minutes: 10,
        }
    }
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct Shortcuts {
    pub ptt: String,
    pub open: String,
}

impl Default for Shortcuts {
    fn default() -> Self {
        Self { ptt: "Ctrl+Alt+Space".into(), open: "Ctrl+Alt+I".into() }
    }
}

/// dove sta l'isola e come si apre
#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct Island {
    /// "top" (tacca in cima allo schermo) oppure "bubble" (staccata e messa dove si vuole)
    pub mode: String,
    /// centro dell'isola in pixel logici dal bordo sinistro dello schermo; None = al centro
    pub x: Option<f64>,
    /// solo per la bolla: centro dall'alto dello schermo
    pub y: Option<f64>,
    /// nome dello schermo dove è stata lasciata (con più schermi)
    pub screen: String,
    /// "hover" (passando sopra) oppure "click"
    pub open: String,
    /// grandezza di tutta l'app, a passi da −3 a +4: 0.85, 0.9, 0.95, 1 (normale), 1.05, 1.1, 1.2, 1.3
    pub zoom: f64,
    /// passando sopra: dopo quanti millisecondi si apre
    pub open_delay: u32,
    /// uscito il mouse: dopo quanti millisecondi si richiude
    pub close_delay: u32,
    /// gli occhi seguono il puntatore del mouse
    pub follow: bool,
    /// compleanno "GG/MM" per i coriandoli (vuoto = niente)
    pub birthday: String,
    /// bordo nero intorno all'area delle animazioni, in pixel
    pub border: u32,
}

impl Default for Island {
    fn default() -> Self {
        Self {
            mode: "top".into(),
            x: None,
            y: None,
            screen: String::new(),
            open: "hover".into(),
            zoom: 1.0,
            open_delay: 1000,
            close_delay: 1500,
            follow: true,
            birthday: String::new(),
            border: 6,
        }
    }
}

#[derive(Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase", default)]
pub struct Settings {
    /// lingua dell'app: "it" o "en" (vuota = la sceglie l'interfaccia dalla lingua di Windows)
    pub language: String,
    pub hermes_url: String,
    pub stt: Stt,
    pub tts: Tts,
    pub shortcuts: Shortcuts,
    pub autostart: bool,
    pub island: Island,
    /// modalità debug: nel registro finiscono tutte le azioni, non solo gli errori
    pub debug: bool,
    /// sessioni nate dall'isola (ultime 200): così stanno in "Dall'isola" anche se Hermes non salva la provenienza
    pub island_sessions: Vec<String>,
    /// sessioni fissate in alto quando Hermes non sa fissarle (versioni vecchie)
    pub pinned_local: Vec<String>,
}

/// Le chiavi che l'interfaccia può mandare quando salva (campi vuoti = non cambiare).
#[derive(Deserialize, Default)]
#[serde(rename_all = "camelCase", default)]
pub struct Secrets {
    pub hermes_key: Option<String>,
    pub stt_key: Option<String>,
    pub tts_key: Option<String>,
}

/// la cartella dei dati porta il nome del programma: su Windows %APPDATA%\Iris Notch
/// (impostazioni, log, modello di trascrizione, voce locale)
pub fn data_dir(app: &AppHandle) -> PathBuf {
    match app.path().data_dir() {
        Ok(d) => d.join("Iris Notch"),
        Err(_) => app.path().app_data_dir().expect("cartella dati"),
    }
}

/// dalla 0.1.1 i dati stavano in %APPDATA%\it.irisvolto.app: si spostano una volta nella cartella nuova,
/// così non si riscaricano i modelli (la voce locale pesa circa 5 GB)
pub fn migrate(app: &AppHandle) {
    let new = data_dir(app);
    if new.exists() {
        return;
    }
    if let Ok(old) = app.path().app_data_dir() {
        if old.exists() && old != new && std::fs::rename(&old, &new).is_ok() {
            // l'ambiente Python della voce ricorda dov'era il suo Python: si aggiorna il percorso
            let cfg = new.join("tts").join("venv").join("pyvenv.cfg");
            if let Ok(t) = std::fs::read_to_string(&cfg) {
                let _ = std::fs::write(&cfg, t.replace(&*old.to_string_lossy(), &new.to_string_lossy()));
            }
        }
    }
    if let Ok(cfg) = app.path().app_config_dir() {
        let (from, to) = (cfg.join("settings.json"), new.join("settings.json"));
        if from.exists() && !to.exists() {
            let _ = std::fs::create_dir_all(&new);
            let _ = std::fs::copy(&from, &to);
        }
    }
}

fn path(app: &AppHandle) -> PathBuf {
    let dir = data_dir(app);
    let _ = std::fs::create_dir_all(&dir);
    dir.join("settings.json")
}

/// lingua dei messaggi che partono da qui (errori, avanzamento, menu dell'icona): segue le impostazioni
static EN: AtomicBool = AtomicBool::new(false);
pub fn en() -> bool {
    EN.load(Ordering::Relaxed)
}
/// il testo nella lingua scelta
pub fn t(it: &str, en: &str) -> String {
    (if self::en() { en } else { it }).to_string()
}
fn set_lang(s: &Settings) {
    EN.store(s.language == "en", Ordering::Relaxed);
}

pub fn load(app: &AppHandle) -> Settings {
    let s: Settings = std::fs::read_to_string(path(app))
        .ok()
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default();
    set_lang(&s);
    s
}

pub fn save(app: &AppHandle, s: &Settings) -> Result<(), String> {
    set_lang(s);
    let json = serde_json::to_string_pretty(s).map_err(|e| e.to_string())?;
    std::fs::write(path(app), json).map_err(|e| format!("{}: {e}", t("Non riesco a salvare le impostazioni", "Can't save the settings")))
}

pub fn get_secret(name: &str) -> Option<String> {
    keyring::Entry::new(KEYRING_SERVICE, name).ok()?.get_password().ok().filter(|s| !s.is_empty())
}

pub fn set_secret(name: &str, value: &str) -> Result<(), String> {
    let entry = keyring::Entry::new(KEYRING_SERVICE, name).map_err(|e| e.to_string())?;
    entry.set_password(value).map_err(|e| format!("{}: {e}", t("Non riesco a salvare la chiave nel Gestore credenziali", "Can't save the key in Credential Manager")))
}

/// Quello che vede l'interfaccia: le impostazioni più "chiave presente sì/no".
pub fn for_ui(s: &Settings) -> serde_json::Value {
    let mut v = serde_json::to_value(s).unwrap_or_default();
    v["hasHermesKey"] = get_secret("hermes").is_some().into();
    v["stt"]["hasServerKey"] = get_secret("stt").is_some().into();
    v["tts"]["hasServerKey"] = get_secret("tts").is_some().into();
    v
}
