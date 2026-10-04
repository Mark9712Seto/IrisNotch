//! Registro (log) in un file nella cartella dati dell'app, sotto `logs/`:
//!   iris.log         errori sempre; con la modalità debug anche tutte le azioni
//!   voce-locale.log  quello che scrive il motore della voce locale (Python)
//! I file oltre 2 MB vengono rinominati in `.old.log`, così non crescono all'infinito.
//! Non si scrivono mai chiavi; i testi dei messaggi solo in modalità debug.

use std::io::Write;
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::AppHandle;

const MAX: u64 = 2 * 1024 * 1024;

pub fn dir(app: &AppHandle) -> PathBuf {
    let d = crate::settings::data_dir(app).join("logs");
    let _ = std::fs::create_dir_all(&d);
    d
}

/// il file pronto per scriverci in coda (ruotato se troppo grande)
pub fn file(app: &AppHandle, name: &str) -> Option<std::fs::File> {
    let p = dir(app).join(name);
    if std::fs::metadata(&p).map(|m| m.len() > MAX).unwrap_or(false) {
        let _ = std::fs::rename(&p, p.with_extension("old.log"));
    }
    std::fs::OpenOptions::new().create(true).append(true).open(p).ok()
}

/// data e ora (UTC) senza dipendenze in più
pub fn now() -> String {
    let s = SystemTime::now().duration_since(UNIX_EPOCH).map(|d| d.as_secs()).unwrap_or(0) as i64;
    let (days, rem) = (s.div_euclid(86400), s.rem_euclid(86400));
    // da giorni dal 1970 a data civile (algoritmo di Howard Hinnant)
    let z = days + 719468;
    let era = z.div_euclid(146097);
    let doe = z - era * 146097;
    let yoe = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = doy - (153 * mp + 2) / 5 + 1;
    let m = if mp < 10 { mp + 3 } else { mp - 9 };
    let y = yoe + era * 400 + if m <= 2 { 1 } else { 0 };
    format!("{y:04}-{m:02}-{d:02} {:02}:{:02}:{:02} UTC", rem / 3600, rem % 3600 / 60, rem % 60)
}

pub fn write(app: &AppHandle, level: &str, msg: &str) {
    if let Some(mut f) = file(app, "iris.log") {
        let _ = writeln!(f, "{} [{level}] {}", now(), msg.replace('\n', " ⏎ "));
    }
}

/// ultime righe di un file di log (per mostrarle nelle impostazioni)
pub fn tail(app: &AppHandle, name: &str, lines: usize) -> String {
    let t = std::fs::read_to_string(dir(app).join(name)).unwrap_or_default();
    let v: Vec<&str> = t.lines().collect();
    v[v.len().saturating_sub(lines)..].join("\n")
}

#[cfg(test)]
mod tests {
    #[test]
    fn date_format() {
        let n = super::now();
        assert_eq!(n.len(), 23);
        assert!(n.starts_with("20"));
    }
}
