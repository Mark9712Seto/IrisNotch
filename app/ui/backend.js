/* Collegamento tra interfaccia e programma.
   Dentro Tauri le chiamate vanno al lato Rust (che parla con Hermes, registra il microfono, trascrive).
   Fuori da Tauri (demo nel browser) si usa Iris.mock, un finto Hermes in memoria. */
(function () {
  const Iris = (window.Iris = window.Iris || {});
  const T = window.__TAURI__;

  if (!T) { Iris.backend = Iris.mock; Iris.isTauri = false; return; }

  Iris.isTauri = true;
  // ogni comando che fallisce finisce nel log (logs/iris.log nella cartella dell'app)
  const raw = T.core.invoke;
  const invoke = (cmd, args) => raw(cmd, args).catch((e) => {
    if (cmd !== "log_ui" && cmd !== "hermes_ping") raw("log_ui", { level: "errore", msg: `${cmd}: ${e}` }).catch(() => {});
    throw e;
  });
  const listen = T.event.listen;
  const on = (name) => (cb) => listen(name, (e) => cb(e.payload));

  Iris.backend = {
    // impostazioni: le chiavi non tornano mai all'interfaccia, solo "presente sì/no"
    getSettings: () => invoke("get_settings"),
    saveSettings: (settings, secrets) => invoke("save_settings", { settings, secrets: secrets || {} }),
    testHermes: () => invoke("hermes_test"),
    ping: () => invoke("hermes_ping"),
    // sessioni
    listSessions: (opts) => invoke("list_sessions", { source: opts.source || null, limit: opts.limit || 50 }),
    createSession: () => invoke("create_session"),
    getMessages: (id) => invoke("get_messages", { sessionId: id }),
    // run
    sendMessage: (sessionId, text) => invoke("send_message", { sessionId, text }),
    approve: (runId, choice) => invoke("approve", { runId, choice }),
    stop: (runId) => invoke("stop_run", { runId }),
    onEvent: on("hermes-event"),
    // voce -> testo
    startRecording: () => invoke("start_recording"),
    stopRecording: () => invoke("stop_recording"),
    cancelRecording: () => invoke("cancel_recording"),
    onMicLevel: on("mic-level"),
    onPtt: on("ptt"),
    voiceKeys: (on) => invoke("voice_keys", { on }).catch(() => {}),
    onVoiceKey: on("voice-key"),
    onOpen: on("open-island"),
    modelStatus: () => invoke("model_status"),
    downloadModel: () => invoke("download_model"),
    onModelProgress: on("model-progress"),
    // testo -> voce (motore server; la voce di Windows la usa direttamente l'interfaccia)
    synthesize: (text) => invoke("tts_synthesize", { text }),
    // voce locale (Piper sul PC)
    localStatus: () => invoke("tts_local_status"),
    localInstall: (voice) => invoke("tts_local_install", { voice }),
    onLocalInstall: on("tts-install"),
    localVoices: () => invoke("tts_local_voices"),
    localWarm: () => invoke("tts_local_warm"),
    localRemoveOld: () => invoke("tts_local_remove_old"),
    renameSession: (sessionId, title) => invoke("rename_session", { sessionId, title }),
    pinSession: (sessionId, pinned) => invoke("pin_session", { sessionId, pinned }),
    deleteSession: (sessionId) => invoke("delete_session", { sessionId }),
    saveSessionsLocal: (island, pinned) => invoke("save_sessions_local", { island, pinned }),
    // finestra: la posizione la calcola l'interfaccia, il programma sposta la finestra
    screenInfo: (name) => invoke("screen_info", { name: name || null }),
    setWindowRect: (x, y, width, height) => invoke("set_window_rect", { x, y, width, height }),
    pointerInfo: () => invoke("pointer_info"),
    listAnimations: () => invoke("list_animations"),
    openAnimations: () => invoke("open_animations"),
    dragBegin: (offX, offY, width, height) => invoke("drag_begin", { offX, offY, width, height }),
    dragEnd: () => invoke("drag_end"),
    onDrag: on("island-drag"),
    onDragEnd: on("island-drag-end"),
    setClickThrough: (ignore) => invoke("set_click_through", { ignore }),
    checkUpdate: () => invoke("check_update"),
    log: (level, msg) => invoke("log_ui", { level, msg: String(msg).slice(0, 2000) }).catch(() => {}),
    logTail: () => invoke("log_tail"),
    openLogs: () => invoke("open_logs"),
    openLink: (url) => invoke("open_link", { url }),
    appInfo: () => invoke("app_info"),
    localHealth: () => invoke("tts_local_health"),
    saveIsland: (island) => invoke("save_island", { island }),
  };
})();
