//! Isola di Iris: finestra sempre in cima, senza bordi, trasparente, centrata sul bordo alto dello schermo.
//! L'interfaccia (app/ui) chiama i comandi qui sotto; gli eventi tornano con `emit`.

mod hermes;
mod log;
mod settings;
mod tts;
mod tts_local;
mod voice;

use base64::Engine;
use hermes::Hermes;
use serde_json::{json, Value};
use settings::{Secrets, Settings};
use std::sync::Mutex;
use tauri::menu::{Menu, MenuItem};
use tauri::tray::TrayIconBuilder;
use tauri::{AppHandle, Emitter, LogicalSize, Manager, PhysicalPosition, State, WebviewWindow};
use tauri_plugin_autostart::ManagerExt;
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutState};

struct AppState {
    settings: Mutex<Settings>,
    recorder: Mutex<Option<voice::Recorder>>,
    shortcuts: Mutex<(Option<Shortcut>, Option<Shortcut>)>, // (premi e parla, apri)
    /// Invio ed Esc presi in prestito mentre si vede l'anteprima della voce compatta (isola chiusa, il focus è altrove)
    voice_keys: Mutex<Option<(Shortcut, Shortcut)>>,
}

fn hermes(st: &State<AppState>) -> Result<Hermes, String> {
    let url = st.settings.lock().unwrap().hermes_url.clone();
    Hermes::new(&url, settings::get_secret("hermes"))
}

/* ---------------- impostazioni ---------------- */

#[tauri::command]
fn get_settings(st: State<AppState>) -> Value {
    settings::for_ui(&st.settings.lock().unwrap())
}

#[tauri::command]
fn save_settings(app: AppHandle, st: State<AppState>, settings: Settings, secrets: Secrets) -> Result<(), String> {
    for (name, v) in [("hermes", &secrets.hermes_key), ("stt", &secrets.stt_key), ("tts", &secrets.tts_key)] {
        if let Some(v) = v.as_deref().map(str::trim).filter(|v| !v.is_empty()) {
            settings::set_secret(name, v)?;
        }
    }
    settings::save(&app, &settings)?;
    let autostart = settings.autostart;
    *st.settings.lock().unwrap() = settings;
    register_shortcuts(&app);
    // il menu dell'icona segue la lingua scelta
    if let Some(t) = app.try_state::<TrayItems>() {
        let (o, q) = tray_texts();
        let _ = t.0.set_text(o);
        let _ = t.1.set_text(q);
    }
    let al = app.autolaunch();
    let _ = if autostart { al.enable() } else { al.disable() };
    Ok(())
}

/// le due voci del menu dell'icona nell'area di notifica
struct TrayItems(MenuItem<tauri::Wry>, MenuItem<tauri::Wry>);
fn tray_texts() -> (String, String) {
    (settings::t("Apri / chiudi l'isola", "Open / close the island"), settings::t("Esci da Iris Notch", "Quit Iris Notch"))
}

/* ---------------- Hermes ---------------- */

#[tauri::command]
async fn hermes_ping(st: State<'_, AppState>) -> Result<bool, String> {
    let url = st.settings.lock().unwrap().hermes_url.clone();
    Ok(Hermes::ping(&url).await)
}

#[tauri::command]
async fn hermes_test(st: State<'_, AppState>) -> Result<Value, String> {
    match hermes(&st)?.test().await {
        Ok(v) => Ok(v),
        Err(e) => Ok(json!({ "ok": false, "error": e })),
    }
}

#[tauri::command]
async fn list_sessions(st: State<'_, AppState>, source: Option<String>, limit: Option<u32>) -> Result<Value, String> {
    hermes(&st)?.list_sessions(source, limit.unwrap_or(50)).await
}

#[tauri::command]
async fn create_session(st: State<'_, AppState>) -> Result<Value, String> {
    hermes(&st)?.create_session().await
}

#[tauri::command]
async fn rename_session(st: State<'_, AppState>, session_id: String, title: String) -> Result<Value, String> {
    let title = title.trim();
    if title.is_empty() {
        return Err(crate::settings::t("Il nome non può essere vuoto", "The name can't be empty"));
    }
    hermes(&st)?.rename_session(&session_id, title).await
}

#[tauri::command]
async fn pin_session(st: State<'_, AppState>, session_id: String, pinned: bool) -> Result<Value, String> {
    hermes(&st)?.pin_session(&session_id, pinned).await
}

#[tauri::command]
async fn delete_session(app: AppHandle, st: State<'_, AppState>, session_id: String) -> Result<(), String> {
    hermes(&st)?.delete_session(&session_id).await?;
    log::write(&app, "info", &format!("sessione eliminata: {session_id}"));
    Ok(())
}

/// ricorda le sessioni nate dall'isola e quelle fissate solo qui
#[tauri::command]
fn save_sessions_local(app: AppHandle, st: State<AppState>, island: Vec<String>, pinned: Vec<String>) -> Result<(), String> {
    let mut s = st.settings.lock().unwrap();
    s.island_sessions = island.into_iter().rev().take(200).collect::<Vec<_>>().into_iter().rev().collect();
    s.pinned_local = pinned;
    settings::save(&app, &s)
}

#[tauri::command]
async fn get_messages(st: State<'_, AppState>, session_id: String) -> Result<Value, String> {
    hermes(&st)?.messages(&session_id).await
}

#[tauri::command]
async fn send_message(app: AppHandle, st: State<'_, AppState>, session_id: String, text: String) -> Result<String, String> {
    let h = hermes(&st)?;
    let run_id = h.start_run(&session_id, &text).await?;
    // un client nuovo per seguire gli eventi in sottofondo
    let follower = hermes(&st)?;
    let id = run_id.clone();
    tauri::async_runtime::spawn(async move {
        follower.follow(id, move |ev| { let _ = app.emit("hermes-event", ev); }).await
    });
    Ok(run_id)
}

#[tauri::command]
async fn approve(st: State<'_, AppState>, run_id: String, choice: String) -> Result<(), String> {
    hermes(&st)?.approve(&run_id, &choice).await
}

#[tauri::command]
async fn stop_run(st: State<'_, AppState>, run_id: String) -> Result<(), String> {
    hermes(&st)?.stop(&run_id).await
}

/* ---------------- voce -> testo ---------------- */

#[tauri::command]
fn start_recording(app: AppHandle, st: State<AppState>) -> Result<(), String> {
    let mut rec = st.recorder.lock().unwrap();
    if rec.is_some() {
        return Ok(());
    }
    *rec = Some(voice::Recorder::start(app)?);
    Ok(())
}

#[tauri::command]
fn cancel_recording(st: State<AppState>) {
    if let Some(r) = st.recorder.lock().unwrap().take() {
        let _ = r.stop();
    }
}

#[tauri::command]
async fn stop_recording(app: AppHandle, st: State<'_, AppState>) -> Result<Value, String> {
    let rec = st.recorder.lock().unwrap().take().ok_or("Non stavo registrando")?;
    let audio = tauri::async_runtime::spawn_blocking(move || rec.stop()).await.map_err(|e| e.to_string())?;
    if audio.len() < 16000 / 4 {
        return Err(crate::settings::t("Registrazione troppo corta", "Recording too short"));
    }
    let stt = st.settings.lock().unwrap().stt.clone();
    let t0 = std::time::Instant::now();
    let text = if stt.mode == "server" {
        voice::transcribe_server(&stt.server_type, &stt.server_url, settings::get_secret("stt"), &stt.language, &audio).await?
    } else {
        let path = voice::model_path(&app, &stt.model);
        let (model, lang) = (stt.model.clone(), stt.language.clone());
        tauri::async_runtime::spawn_blocking(move || voice::transcribe_local(path, &model, &lang, &audio))
            .await
            .map_err(|e| e.to_string())??
    };
    Ok(json!({ "text": text, "ms": t0.elapsed().as_millis() as u64 }))
}

#[tauri::command]
fn model_status(app: AppHandle, st: State<AppState>) -> Value {
    let s = st.settings.lock().unwrap();
    let p = voice::model_path(&app, &s.stt.model);
    json!({
        "downloaded": p.exists(),
        "sizeMb": p.metadata().map(|m| m.len() / 1_048_576).unwrap_or(0),
        "loaded": voice::is_loaded(),
        "gpu": if cfg!(windows) { "Vulkan" } else { "CPU" },
    })
}

#[tauri::command]
async fn download_model(app: AppHandle, st: State<'_, AppState>) -> Result<(), String> {
    let name = st.settings.lock().unwrap().stt.model.clone();
    voice::download_model(app, name).await
}

/* ---------------- testo -> voce (server) ---------------- */

#[tauri::command]
async fn tts_synthesize(app: AppHandle, st: State<'_, AppState>, text: String) -> Result<Value, String> {
    let t = st.settings.lock().unwrap().tts.clone();
    let (audio, mime) = if t.engine == "local" {
        match tts_local::speak(&app, &text, &t.local_voice, t.rate).await {
            Ok(a) => (a, "audio/wav"),
            Err(e) => {
                log::write(&app, "errore", &format!("voce locale: {e}"));
                return Err(e);
            }
        }
    } else {
        (tts::synthesize(&t.server_url, &t.server_voice, t.rate, settings::get_secret("tts"), &text).await?, "audio/mpeg")
    };
    Ok(json!({ "mime": mime, "data": base64::engine::general_purpose::STANDARD.encode(audio) }))
}

/* ---------------- voce locale (Piper) ---------------- */

#[tauri::command]
fn tts_local_status(app: AppHandle) -> Value {
    tts_local::status(&app, &app.state::<tts_local::LocalTts>())
}

#[tauri::command]
async fn tts_local_install(app: AppHandle, voice: String) -> Result<(), String> {
    tts_local::install(app, voice).await
}

#[tauri::command]
async fn tts_local_health(app: AppHandle) -> Value {
    tts_local::health(&app).await
}

#[tauri::command]
async fn tts_local_warm(app: AppHandle, st: State<'_, AppState>) -> Result<(), String> {
    let voice = st.settings.lock().unwrap().tts.local_voice.clone();
    tts_local::warm(&app, &voice).await
}

#[tauri::command]
fn tts_local_voices(app: AppHandle) -> Value {
    tts_local::voices(&app)
}

/// elimina la cartella della vecchia voce Qwen3-TTS (circa 5 GB)
#[tauri::command]
fn tts_local_remove_old(app: AppHandle) -> Result<(), String> {
    tts_local::remove_old(&app)
}

/* ---------------- finestra ---------------- */

/* L'interfaccia ragiona in pixel logici relativi allo schermo dove sta l'isola; ogni schermo ha la sua scala.
   Qui si traduce da e verso i pixel fisici di Windows, così la bolla può passare da uno schermo all'altro. */

fn mon_json(m: &tauri::Monitor) -> Value {
    let sc = m.scale_factor();
    let (p, z, wa) = (m.position(), m.size(), m.work_area());
    json!({
        "name": m.name().cloned().unwrap_or_default(),
        "px": p.x, "py": p.y, "scale": sc,
        "w": z.width as f64 / sc, "h": z.height as f64 / sc,
        "wx": (wa.position.x - p.x) as f64 / sc, "wy": (wa.position.y - p.y) as f64 / sc,
        "ww": wa.size.width as f64 / sc, "wh": wa.size.height as f64 / sc,
    })
}

/// lo schermo con quel nome (dove era stata lasciata l'isola), altrimenti quello attuale o il principale
#[tauri::command]
fn screen_info(window: WebviewWindow, name: Option<String>) -> Result<Value, String> {
    let all = window.available_monitors().map_err(|e| e.to_string())?;
    if let Some(n) = name.filter(|n| !n.is_empty()) {
        if let Some(m) = all.iter().find(|m| m.name() == Some(&n)) {
            return Ok(mon_json(m));
        }
    }
    let m = window
        .current_monitor()
        .map_err(|e| e.to_string())?
        .or(window.primary_monitor().map_err(|e| e.to_string())?)
        .or(all.into_iter().next())
        .ok_or("Nessuno schermo trovato")?;
    Ok(mon_json(&m))
}

/// dov'è il puntatore e su quale schermo (per trascinare l'isola e per gli occhi che lo seguono)
#[tauri::command]
fn pointer_info(window: WebviewWindow) -> Result<Value, String> {
    let c = window.cursor_position().map_err(|e| e.to_string())?;
    let m = window.monitor_from_point(c.x, c.y).map_err(|e| e.to_string())?;
    let screen = m.as_ref().map(mon_json).unwrap_or(Value::Null);
    // "down": tasto sinistro premuto (serve al trascinamento per sapere quando l'hai lasciata)
    Ok(json!({ "px": c.x, "py": c.y, "screen": screen, "down": left_button_down() }))
}

/// la parte della finestra fuori dall'isola lascia passare i clic alle finestre sotto
#[tauri::command]
fn set_click_through(window: WebviewWindow, ignore: bool) -> Result<(), String> {
    window.set_ignore_cursor_events(ignore).map_err(|e| e.to_string())
}

/// sposta e dimensiona la finestra in un colpo solo (su Windows con una sola SetWindowPos: con due chiamate
/// separate per un attimo si vedeva la finestra nuova nel posto vecchio, cioè una "copia fantasma")
fn move_window(window: &WebviewWindow, x: i32, y: i32, width: u32, height: u32) -> Result<(), String> {
    move_window_ex(window, x, y, width, height, false)
}

/// con `keep_size` sposta soltanto: durante il trascinamento la grandezza non cambia, e così la pagina
/// (WebView2) non riceve a ogni passo un ridimensionamento da rifare
fn move_window_ex(window: &WebviewWindow, x: i32, y: i32, width: u32, height: u32, keep_size: bool) -> Result<(), String> {
    #[cfg(windows)]
    {
        use windows_sys::Win32::UI::WindowsAndMessaging::{SetWindowPos, SWP_NOACTIVATE, SWP_NOSIZE, SWP_NOZORDER};
        let h = window.hwnd().map_err(|e| e.to_string())?;
        let flags = SWP_NOZORDER | SWP_NOACTIVATE | if keep_size { SWP_NOSIZE } else { 0 };
        let ok = unsafe { SetWindowPos(h.0 as _, std::ptr::null_mut(), x, y, width.max(1) as i32, height.max(1) as i32, flags) };
        if ok == 0 {
            return Err("SetWindowPos non riuscita".into());
        }
    }
    #[cfg(not(windows))]
    {
        if !keep_size {
            window.set_size(tauri::PhysicalSize::new(width.max(1), height.max(1))).map_err(|e| e.to_string())?;
        }
        window.set_position(PhysicalPosition::new(x, y)).map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// sposta e dimensiona la finestra, in pixel fisici
#[tauri::command]
fn set_window_rect(window: WebviewWindow, x: i32, y: i32, width: u32, height: u32) -> Result<(), String> {
    move_window(&window, x, y, width, height)?;
    if !window.is_visible().unwrap_or(true) {
        let _ = window.show();
    }
    Ok(())
}

/* Trascinamento: la finestra segue il puntatore direttamente da qui, circa 120 volte al secondo, senza
   passare ogni volta dall'interfaccia (prima ogni passo era cursore → interfaccia → finestra, e con il mouse
   veloce la finestra restava indietro e lasciava scie). L'interfaccia riceve "island-drag" solo per sapere
   dov'è (tacca o bolla, quale schermo) e chiude con drag_end; se il tasto del mouse si alza, si ferma da sola. */
static DRAG_GEN: std::sync::atomic::AtomicU64 = std::sync::atomic::AtomicU64::new(0);

#[cfg(windows)]
fn left_button_down() -> bool {
    use windows_sys::Win32::UI::Input::KeyboardAndMouse::{GetAsyncKeyState, VK_LBUTTON, VK_RBUTTON};
    use windows_sys::Win32::UI::WindowsAndMessaging::{GetSystemMetrics, SM_SWAPBUTTON};
    // GetAsyncKeyState guarda il tasto fisico: con i tasti invertiti il "sinistro" è il destro
    let vk = if unsafe { GetSystemMetrics(SM_SWAPBUTTON) } != 0 { VK_RBUTTON } else { VK_LBUTTON };
    (unsafe { GetAsyncKeyState(vk as i32) } as u16 & 0x8000) != 0
}
#[cfg(not(windows))]
fn left_button_down() -> bool {
    true
}

/// off_x/off_y: dove sta il puntatore dentro la finestra; width/height: grandezza della finestra (pixel logici)
#[tauri::command]
fn drag_begin(window: WebviewWindow, off_x: f64, off_y: f64, width: f64, height: f64) {
    use std::sync::atomic::Ordering;
    let gen = DRAG_GEN.fetch_add(1, Ordering::SeqCst) + 1;
    std::thread::spawn(move || {
        let (mut last, mut last_emit) = ((i32::MIN, i32::MIN, 0u32, 0u32), std::time::Instant::now());
        while DRAG_GEN.load(Ordering::SeqCst) == gen {
            if !left_button_down() {
                let _ = window.emit("island-drag-end", ());
                break;
            }
            if let Ok(c) = window.cursor_position() {
                let m = window.monitor_from_point(c.x, c.y).ok().flatten();
                let sc = m.as_ref().map(|m| m.scale_factor()).unwrap_or(1.0);
                let r = ((c.x - off_x * sc).round() as i32, (c.y - off_y * sc).round() as i32, (width * sc).round() as u32, (height * sc).round() as u32);
                if r != last {
                    let _ = move_window_ex(&window, r.0, r.1, r.2, r.3, (r.2, r.3) == (last.2, last.3));
                    last = r;
                    if last_emit.elapsed().as_millis() >= 30 {
                        last_emit = std::time::Instant::now();
                        let screen = m.as_ref().map(mon_json).unwrap_or(Value::Null);
                        let _ = window.emit("island-drag", json!({ "px": c.x, "py": c.y, "screen": screen }));
                    }
                }
            }
            std::thread::sleep(std::time::Duration::from_millis(8));
        }
    });
}

#[tauri::command]
fn drag_end() {
    DRAG_GEN.fetch_add(1, std::sync::atomic::Ordering::SeqCst);
}

/// salva solo la posizione e il modo di apertura (trascinando non si toccano le altre impostazioni)
#[tauri::command]
fn save_island(app: AppHandle, st: State<AppState>, island: settings::Island) -> Result<(), String> {
    let mut s = st.settings.lock().unwrap();
    s.island = island;
    settings::save(&app, &s)
}

fn place(window: &WebviewWindow, width: f64, height: f64) -> tauri::Result<()> {
    window.set_size(LogicalSize::new(width, height))?;
    if let Some(m) = window.current_monitor()?.or(window.primary_monitor()?) {
        let scale = m.scale_factor();
        let x = m.position().x + ((m.size().width as f64 - width * scale) / 2.0) as i32;
        window.set_position(PhysicalPosition::new(x, m.position().y))?;
    }
    Ok(())
}

/* ---------------- registro (log) ---------------- */

/// l'interfaccia scrive nel registro: gli errori sempre, il resto solo con la modalità debug
#[tauri::command]
fn log_ui(app: AppHandle, st: State<AppState>, level: String, msg: String) {
    if level == "errore" || st.settings.lock().unwrap().debug {
        log::write(&app, &level, &msg);
    }
}

#[tauri::command]
fn log_tail(app: AppHandle) -> Value {
    json!({ "iris": log::tail(&app, "iris.log", 40), "voce": log::tail(&app, "voce-locale.log", 40), "dir": log::dir(&app).to_string_lossy() })
}

/// apre la cartella dei log in Esplora risorse
#[tauri::command]
fn open_logs(app: AppHandle) -> Result<(), String> {
    let d = log::dir(&app);
    #[cfg(windows)]
    let r = std::process::Command::new("explorer").arg(&d).spawn();
    #[cfg(not(windows))]
    let r = std::process::Command::new("xdg-open").arg(&d).spawn();
    r.map(|_| ()).map_err(|e| e.to_string())
}

/* ---------------- animazioni personali ----------------
   Cartella %APPDATA%\Iris Notch\animazioni: file .json di sola descrizione (niente codice), letti dall'interfaccia.
   La prima volta ci si mettono la guida e un esempio. */
const ANIM_GUIDA: &str = include_str!("../animazioni/GUIDA.md");
const ANIM_ESEMPIO: &str = include_str!("../animazioni/esempio-saluto.json");

fn animations_dir(app: &AppHandle) -> std::path::PathBuf {
    let d = settings::data_dir(app).join("animazioni");
    if !d.exists() {
        let _ = std::fs::create_dir_all(&d);
        let _ = std::fs::write(d.join("esempio-saluto.json"), ANIM_ESEMPIO);
    }
    // la guida si aggiorna con l'app (le animazioni dell'utente non si toccano mai)
    if std::fs::read_to_string(d.join("GUIDA.md")).ok().as_deref() != Some(ANIM_GUIDA) {
        let _ = std::fs::write(d.join("GUIDA.md"), ANIM_GUIDA);
    }
    d
}

/// i file .json della cartella (al massimo 50, ognuno al massimo 64 KB), con il testo così com'è
#[tauri::command]
fn list_animations(app: AppHandle) -> Value {
    let d = animations_dir(&app);
    let mut out = vec![];
    if let Ok(rd) = std::fs::read_dir(&d) {
        let mut files: Vec<_> = rd.flatten().map(|e| e.path()).filter(|p| p.extension().map(|x| x == "json").unwrap_or(false)).collect();
        files.sort();
        for f in files.into_iter().take(50) {
            let name = f.file_stem().map(|s| s.to_string_lossy().to_string()).unwrap_or_default();
            match std::fs::metadata(&f) {
                Ok(m) if m.len() > 64 * 1024 => out.push(json!({ "id": name, "error": "file troppo grande (più di 64 KB)" })),
                _ => match std::fs::read_to_string(&f) {
                    Ok(text) => out.push(json!({ "id": name, "text": text })),
                    Err(e) => out.push(json!({ "id": name, "error": e.to_string() })),
                },
            }
        }
    }
    json!({ "dir": d.to_string_lossy(), "files": out })
}

#[tauri::command]
fn open_animations(app: AppHandle) -> Result<(), String> {
    let d = animations_dir(&app);
    #[cfg(windows)]
    let r = std::process::Command::new("explorer").arg(&d).spawn();
    #[cfg(not(windows))]
    let r = std::process::Command::new("xdg-open").arg(&d).spawn();
    r.map(|_| ()).map_err(|e| e.to_string())
}

/* ---------------- aggiornamenti ----------------
   Solo un avviso: l'app chiede a GitHub qual è l'ultima Release e, se è più nuova, lo dice.
   Non scarica e non installa niente da sola: la pagina della Release la apre chi usa l'app. */

const REPO: &str = "Mark9712Seto/IrisNotch";

fn version_tuple(v: &str) -> (u64, u64, u64) {
    let mut it = v.trim().trim_start_matches('v').split(|c: char| c == '.' || c == '-').map(|x| x.parse::<u64>().unwrap_or(0));
    (it.next().unwrap_or(0), it.next().unwrap_or(0), it.next().unwrap_or(0))
}

#[tauri::command]
async fn check_update() -> Result<Value, String> {
    let current = env!("CARGO_PKG_VERSION");
    let r = reqwest::Client::builder()
        .user_agent(format!("IrisVolto/{current}"))
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .map_err(|e| e.to_string())?
        // tutte le Release, non solo "latest": le 0.x sono pre-release e "latest" le salta
        .get(format!("https://api.github.com/repos/{REPO}/releases?per_page=20"))
        .send()
        .await
        .map_err(|e| e.to_string())?;
    // repo privato o nessuna Release ancora: nessun avviso
    if !r.status().is_success() {
        return Ok(json!({ "available": false, "current": current }));
    }
    let list: Value = r.json().await.map_err(|e| e.to_string())?;
    // la versione più alta tra quelle pubblicate (le bozze no)
    let best = list
        .as_array()
        .into_iter()
        .flatten()
        .filter(|v| !v["draft"].as_bool().unwrap_or(false))
        .filter_map(|v| Some((v["tag_name"].as_str()?.trim_start_matches('v').to_string(), v["html_url"].as_str().unwrap_or_default().to_string())))
        .max_by(|a, b| version_tuple(&a.0).cmp(&version_tuple(&b.0)));
    let (latest, url) = best.unwrap_or_default();
    let available = !latest.is_empty() && version_tuple(&latest) > version_tuple(current);
    Ok(json!({ "available": available, "current": current, "latest": latest, "url": url }))
}

/// apre nel browser una pagina del repository (Release, licenza, privacy, codice): solo indirizzi di questo repo
#[tauri::command]
fn open_link(url: String) -> Result<(), String> {
    let ok = url.starts_with(&format!("https://github.com/{REPO}"))
        && url.chars().all(|c| c.is_ascii_alphanumeric() || "/:.-_#".contains(c));
    if !ok {
        return Err(crate::settings::t("Indirizzo non valido", "Invalid address"));
    }
    #[cfg(windows)]
    let r = std::process::Command::new("explorer").arg(&url).spawn();
    #[cfg(not(windows))]
    let r = std::process::Command::new("xdg-open").arg(&url).spawn();
    r.map(|_| ()).map_err(|e| e.to_string())
}

/// versione installata e indirizzo del repository, per "Informazioni"
#[tauri::command]
fn app_info(app: AppHandle) -> Value {
    json!({ "version": app.package_info().version.to_string(), "repo": format!("https://github.com/{REPO}") })
}

/* ---------------- scorciatoie ---------------- */

/// Voce compatta: con l'isola chiusa la tastiera è di un altro programma, quindi per confermare l'anteprima con
/// Invio (o annullarla con Esc) i due tasti si registrano per un momento come scorciatoie globali, e si rilasciano
/// appena l'anteprima sparisce (l'interfaccia li rilascia comunque dopo 15 secondi).
#[tauri::command]
fn voice_keys(app: AppHandle, st: State<AppState>, on: bool) {
    let gs = app.global_shortcut();
    let mut k = st.voice_keys.lock().unwrap();
    if let Some((a, b)) = k.take() {
        let _ = gs.unregister(a);
        let _ = gs.unregister(b);
    }
    if on {
        if let (Ok(enter), Ok(esc)) = ("Enter".parse::<Shortcut>(), "Escape".parse::<Shortcut>()) {
            if gs.register(enter).is_ok() && gs.register(esc).is_ok() {
                *k = Some((enter, esc));
            } else {
                let _ = gs.unregister(enter);
                let _ = gs.unregister(esc);
            }
        }
    }
}

fn parse_shortcut(s: &str) -> Option<Shortcut> {
    let keys: Vec<&str> = s
        .split('+')
        .map(|k| match k.trim() {
            k if k.eq_ignore_ascii_case("ctrl") => "Control",
            k if k.eq_ignore_ascii_case("spazio") => "Space",
            k if k.eq_ignore_ascii_case("maiusc") => "Shift",
            k => k,
        })
        .collect();
    keys.join("+").parse::<Shortcut>().ok()
}

fn register_shortcuts(app: &AppHandle) {
    let st = app.state::<AppState>();
    let s = st.settings.lock().unwrap().shortcuts.clone();
    let gs = app.global_shortcut();
    let _ = gs.unregister_all();
    *st.voice_keys.lock().unwrap() = None; // tolte anche Invio ed Esc prese in prestito
    let ptt = parse_shortcut(&s.ptt);
    let open = parse_shortcut(&s.open);
    for sc in [ptt, open].into_iter().flatten() {
        if let Err(e) = gs.register(sc) {
            eprintln!("scorciatoia non registrata ({sc}): {e}");
        }
    }
    *st.shortcuts.lock().unwrap() = (ptt, open);
}

/* ---------------- avvio ---------------- */

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_autostart::init(tauri_plugin_autostart::MacosLauncher::LaunchAgent, None))
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, sc, ev| {
                    let st = app.state::<AppState>();
                    let (ptt, open) = *st.shortcuts.lock().unwrap();
                    if let Some((enter, esc)) = *st.voice_keys.lock().unwrap() {
                        if ev.state() == ShortcutState::Pressed && (*sc == enter || *sc == esc) {
                            let _ = app.emit("voice-key", if *sc == enter { "enter" } else { "escape" });
                            return;
                        }
                    }
                    if Some(*sc) == ptt {
                        let s = if ev.state() == ShortcutState::Pressed { "pressed" } else { "released" };
                        let _ = app.emit("ptt", s);
                    } else if Some(*sc) == open && ev.state() == ShortcutState::Pressed {
                        let _ = app.emit("open-island", ());
                        if let Some(w) = app.get_webview_window("main") {
                            let _ = w.set_focus();
                        }
                    }
                })
                .build(),
        )
        .setup(|app| {
            settings::migrate(app.handle());
            let s = settings::load(app.handle());
            log::write(app.handle(), "info", &format!("avvio di Iris Notch {}", app.package_info().version));
            app.manage(tts_local::LocalTts::new());
            app.manage(AppState { settings: Mutex::new(s), recorder: Mutex::new(None), shortcuts: Mutex::new((None, None)), voice_keys: Mutex::new(None) });
            register_shortcuts(app.handle());

            // icona nell'area di notifica: è l'unico modo di chiudere il programma (non sta nella barra delle applicazioni)
            let (t_open, t_quit) = tray_texts();
            let open = MenuItem::with_id(app, "open", t_open, true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", t_quit, true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&open, &quit])?;
            app.manage(TrayItems(open.clone(), quit.clone()));
            TrayIconBuilder::new()
                .icon(app.default_window_icon().cloned().expect("icona"))
                .tooltip("Iris Notch")
                .menu(&menu)
                .on_menu_event(|app, e| match e.id().as_ref() {
                    "open" => {
                        let _ = app.emit("open-island", ());
                    }
                    "quit" => app.exit(0),
                    _ => {}
                })
                .build(app)?;

            // libera la scheda video quando il modello non serve da un po'
            let handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                loop {
                    tokio::time::sleep(std::time::Duration::from_secs(30)).await;
                    let (stt_min, tts_min) = {
                        let s = handle.state::<AppState>();
                        let s = s.settings.lock().unwrap();
                        (s.stt.unload_minutes, s.tts.unload_minutes)
                    };
                    voice::unload_if_idle(stt_min);
                    tts_local::stop_if_idle(&handle, tts_min);
                }
            });

            if let Some(w) = app.get_webview_window("main") {
                let _ = place(&w, 180.0, 70.0);
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            voice_keys,
            get_settings,
            save_settings,
            hermes_ping,
            hermes_test,
            list_sessions,
            create_session,
            get_messages,
            send_message,
            approve,
            stop_run,
            start_recording,
            stop_recording,
            cancel_recording,
            model_status,
            download_model,
            tts_synthesize,
            tts_local_status,
            tts_local_install,
            tts_local_warm,
            tts_local_health,
            tts_local_voices,
            tts_local_remove_old,
            rename_session,
            pin_session,
            delete_session,
            save_sessions_local,
            screen_info,
            set_window_rect,
            list_animations,
            open_animations,
            drag_begin,
            drag_end,
            pointer_info,
            set_click_through,
            check_update,
            log_ui,
            log_tail,
            open_logs,
            open_link,
            app_info,
            save_island
        ])
        .build(tauri::generate_context!())
        .expect("errore all'avvio di Iris")
        .run(|app, ev| {
            // all'uscita si spegne anche il motore vocale locale
            if let tauri::RunEvent::Exit = ev {
                tts_local::stop(app);
            }
        });
}

#[cfg(test)]
mod tests {
    use super::parse_shortcut;

    #[test]
    fn versions_compare() {
        use super::version_tuple;
        assert!(version_tuple("v0.2.0") > version_tuple("0.1.9"));
        assert!(version_tuple("0.10.0") > version_tuple("0.9.3"));
        assert_eq!(version_tuple("v1.2.3-beta"), (1, 2, 3));
    }

    #[test]
    fn shortcuts_in_italian_and_english() {
        assert!(parse_shortcut("Ctrl+Alt+Space").is_some());
        assert!(parse_shortcut("Control+Alt+Space").is_some());
        assert_eq!(parse_shortcut("ctrl+alt+spazio"), parse_shortcut("Control+Alt+Space"));
        assert!(parse_shortcut("Ctrl+Maiusc+K").is_some());
        assert!(parse_shortcut("non una scorciatoia").is_none());
    }
}
