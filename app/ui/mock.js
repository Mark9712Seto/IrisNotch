/* Finto Hermes per la demo nel browser: sessioni, run con eventi, via libera, trascrizione finta.
   Imita il formato degli eventi di /v1/runs/{id}/events (event, run_id, ... ) letto dal codice di Hermes. */
(function () {
  const Iris = (window.Iris = window.Iris || {});
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const now = () => Date.now() / 1000;
  const listeners = { "hermes-event": [], "mic-level": [], ptt: [], "open-island": [], "model-progress": [], "tts-install": [] };
  const emit = (name, p) => listeners[name].forEach((cb) => cb(p));
  // lingua della demo: ?lang=en|it nell'indirizzo, poi l'ultima scelta, poi quella del browser
  const LANG = (() => {
    const q = new URLSearchParams(location.search).get("lang");
    let saved = null; try { saved = localStorage.getItem("irisLang"); } catch (e) {}
    return q === "en" || q === "it" ? q : saved || (/^it\b/i.test(navigator.language || "") ? "it" : "en");
  })();
  const L = (it, en) => (LANG === "en" ? en : it);

  let settings = {
    language: LANG,
    hermesUrl: "http://hermes.local:8642",
    hasHermesKey: true,
    stt: { mode: "local", model: "large-v3-turbo-q5_0", serverType: "openai", serverUrl: "", hasServerKey: false, language: LANG, unloadMinutes: 10, sendWithoutPreview: false, compact: true },
    tts: { auto: false, chime: true, engine: "local", voice: "", serverUrl: "", serverVoice: "", hasServerKey: false, rate: 1, volume: 1, localVoice: L("paola", "lessac"), unloadMinutes: 10 },
    shortcuts: { ptt: "Ctrl+Alt+Space", open: "Ctrl+Alt+I" },
    island: { mode: "top", x: null, y: null, screen: "", open: "hover", zoom: 1, openDelay: 1000, closeDelay: 1500, follow: true, birthday: "", border: 6 },
    autostart: true,
    debug: false,
    islandSessions: [],
    pinnedLocal: [],
  };
  let modelDownloaded = true;
  let localInstalled = true, oldQwenMb = 0;
  let localVoices = [
    { id: "paola", lang: "it", name: L("Paola · donna", "Paola · female"), mb: 61, downloaded: LANG === "it" },
    { id: "riccardo", lang: "it", name: L("Riccardo · uomo, più leggera", "Riccardo · male, lighter"), mb: 27, downloaded: false },
    { id: "lessac", lang: "en", name: L("Lessac · donna (inglese US)", "Lessac · female (US English)"), mb: 61, downloaded: LANG === "en" },
    { id: "ryan", lang: "en", name: L("Ryan · uomo (inglese US)", "Ryan · male (US English)"), mb: 61, downloaded: false },
  ];

  const h = 3600;
  let sessions = [
    { id: "s1", source: "desktop", title: L("Bollette di ottobre", "October bills"), preview: L("Controlla se è arrivata la bolletta della luce", "Check if the electricity bill arrived"), last_active: now() - 120 },
    { id: "s2", source: "desktop", title: L("Script backup NAS", "NAS backup script"), preview: L("Mi scrivi uno script per il backup", "Write me a backup script"), last_active: now() - 26 * h },
    { id: "s3", source: "desktop", title: L("Viaggio a Madeira", "Trip to Madeira"), preview: L("Cosa vedere a Funchal in tre giorni", "What to see in Funchal in three days"), last_active: now() - 3 * 24 * h },
    { id: "s4", source: "telegram", title: L("Clima camera", "Bedroom AC"), preview: L("Accendi il condizionatore a 24", "Turn the AC on at 24"), last_active: now() - 3 * h },
    { id: "s5", source: "telegram", title: L("Posta da sistemare", "Mail to sort"), preview: L("Riassumimi le mail non lette", "Summarize my unread mail"), last_active: now() - 22 * h },
    { id: "s6", source: "cli", title: L("Prova strumenti", "Tool test"), preview: L("Elencami gli strumenti che hai", "List the tools you have"), last_active: now() - 5 * 24 * h },
    { id: "s7", source: "telegram", title: L("Lista della spesa", "Shopping list"), preview: L("Aggiungi latte e uova", "Add milk and eggs"), last_active: now() - 6 * 24 * h },
  ];
  const messages = {
    s1: [
      { role: "user", content: L("Controlla se è arrivata la bolletta della luce e segnamela nel budget", "Check if the electricity bill arrived and add it to the budget") },
      { role: "tool", tool_name: "mail_search", content: "" },
      { role: "assistant", content: L("Trovata: **74,20 €**, scadenza **21/10**. Vuoi che la aggiunga ad Actual Budget nella categoria Bollette?", "Found it: **€74.20**, due **Oct 21**. Want me to add it to Actual Budget under Bills?") },
    ],
    s2: [{ role: "user", content: L("Mi scrivi uno script per il backup del vault sul NAS?", "Can you write me a script to back up the vault to the NAS?") }, { role: "assistant", content: L("Ecco una base con `rsync` e un controllo dello spazio libero prima di partire.", "Here's a starting point with `rsync` and a free-space check before it runs.") }],
    s3: [{ role: "user", content: L("Cosa vedere a Funchal in tre giorni?", "What to see in Funchal in three days?") }, { role: "assistant", content: L("Giorno 1: centro storico e Mercado dos Lavradores. Giorno 2: funivia per Monte e discesa in slitta di vimini. Giorno 3: Cabo Girão e Câmara de Lobos.", "Day 1: old town and Mercado dos Lavradores. Day 2: cable car to Monte and the wicker toboggan ride down. Day 3: Cabo Girão and Câmara de Lobos.") }],
    s4: [{ role: "user", content: L("Accendi il condizionatore a 24", "Turn the AC on at 24") }, { role: "assistant", content: L("Fatto: condizionatore camera acceso, 24 °C, modalità freddo.", "Done: bedroom AC on, 24 °C, cooling mode.") }],
    s5: [{ role: "user", content: L("Riassumimi le mail non lette", "Summarize my unread mail") }, { role: "assistant", content: L("Hai 3 mail non lette: una conferma di prenotazione, una newsletter e un avviso del corriere.", "You have 3 unread emails: a booking confirmation, a newsletter and a delivery notice.") }],
    s6: [{ role: "user", content: L("Elencami gli strumenti che hai", "List the tools you have") }, { role: "assistant", content: L("Ho: browser, file, terminale, memoria, calendario, posta, Home Assistant, ricerca web.", "I have: browser, files, terminal, memory, calendar, mail, Home Assistant, web search.") }],
    s7: [{ role: "user", content: L("Aggiungi latte e uova", "Add milk and eggs") }, { role: "assistant", content: L("Aggiunti alla lista della spesa.", "Added to the shopping list.") }],
  };

  const runs = {};
  let runN = 0;

  // copione della risposta finta, scelto dal testo
  function script(text) {
    const t = text.toLowerCase();
    if (/budget|aggiung|segna|cancella|elimina|invia|manda|bill|add |delete|send/.test(t))
      return { tools: [["actual_budget", L("add_transaction(importo=-74.20, categoria=\"Bollette\")", "add_transaction(amount=-74.20, category=\"Bills\")")]], approval: { description: L("Aggiungere una transazione in Actual Budget", "Add a transaction to Actual Budget"), command: L("actual_budget.add_transaction(\n  conto=\"Conto corrente\",\n  importo=-74.20,\n  categoria=\"Bollette\",\n  beneficiario=\"Fornitore luce\",\n  data=\"2026-10-05\",\n  scadenza=\"2026-10-21\",\n  nota=\"Luce ottobre, periodo 1/9 - 30/9\",\n  ricorrente=False\n)", "actual_budget.add_transaction(\n  account=\"Checking\",\n  amount=-74.20,\n  category=\"Bills\",\n  payee=\"Electricity provider\",\n  date=\"2026-10-05\",\n  due=\"2026-10-21\",\n  note=\"Electricity October, period 9/1 - 9/30\",\n  recurring=False\n)") },
        reply: L("Fatto! Ho aggiunto la bolletta della luce: **74,20 €** nella categoria *Bollette*, con scadenza il 21 ottobre. Vuoi anche un promemoria qualche giorno prima?", "Done! I added the electricity bill: **€74.20** under *Bills*, due October 21. Want a reminder a few days before?") };
    if (/meteo|tempo|piove|weather|rain/.test(t))
      return { tools: [["web_search", L("meteo Roma domani", "weather Rome tomorrow")]], reply: L("Domani a Roma: sereno al mattino con **14 °C** all'alba, qualche nuvola nel pomeriggio e massima di **22 °C** verso le 15. Vento leggero da ovest, umidità intorno al 60%. Niente pioggia prevista, né domani né dopodomani. In serata si scende a 16 °C: se esci dopo cena, una giacca leggera basta.", "Tomorrow in Rome: clear in the morning at **14 °C** at dawn, a few clouds in the afternoon and a high of **22 °C** around 3 pm. Light westerly wind, humidity around 60%. No rain expected, neither tomorrow nor the day after. It drops to 16 °C in the evening: if you go out after dinner, a light jacket is enough.") };
    if (/clima|condizionatore|temperatura|\bac\b|air con|temperature/.test(t))
      // come una risposta vera con più passaggi: testo, azione, testo, azione…
      return { steps: [
        { say: L("Certo, do un'occhiata ai dispositivi del clima.", "Sure, let me look at the climate devices.") }, { tool: ["ha_list_entities", "climate"] },
        { say: L("C'è il condizionatore della camera. Lo accendo a 24 gradi.", "There's the bedroom AC. I'll turn it on at 24 degrees.") }, { tool: ["ha_call_service", "climate.set_temperature"] },
        { say: L("Controllo che abbia preso il comando.", "Checking that it took the command.") }, { tool: ["ha_get_state", "climate.camera"] }, { tool: ["ha_get_state", "climate.camera"] },
        { tool: ["ha_list_entities", "climate"] }, { tool: ["ha_call_service", "climate.turn_on"] },
        { say: L("Fatto: condizionatore della camera acceso, 24 °C, modalità freddo. In camera adesso ci sono 26,5 °C.", "Done: bedroom AC on, 24 °C, cooling mode. It's 26.5 °C in the bedroom right now.") },
      ] };
    return { tools: [["memory", L("cerca nel contesto", "search context")]], reply: L("Certo! Questa è una risposta di prova della demo: nell'app vera qui arriva quello che risponde Iris da Hermes, parola per parola mentre lo scrive.", "Sure! This is a demo reply: in the real app this is where Iris's answer from Hermes appears, word by word as it's written.") };
  }

  async function runScript(runId, sessionId, text) {
    const sc = script(text);
    const ev = (event, f) => emit("hermes-event", Object.assign({ event, run_id: runId, timestamp: now() }, f || {}));
    await sleep(900);
    if (sc.steps) {
      let last = "";
      for (const st of sc.steps) {
        if (runs[runId].stopped) return ev("run.cancelled", {});
        if (st.tool) { ev("tool.started", { tool: st.tool[0], preview: st.tool[1] }); await sleep(700); ev("tool.completed", { tool: st.tool[0], duration: 0.7, error: false }); await sleep(250); continue; }
        last = st.say;
        for (const word of ("\n\n" + st.say).split(/(\s+)/)) { ev("message.delta", { delta: word }); await sleep(word.trim() ? 35 : 0); }
      }
      return finish(ev, sessionId, runId, last);
    }
    for (const [tool, preview] of sc.tools) {
      ev("tool.started", { tool, preview });
      await sleep(1400);
      if (sc.approval && !runs[runId].approved) {
        ev("approval.request", Object.assign({ choices: ["once", "deny"] }, sc.approval));
        const choice = await new Promise((res) => (runs[runId].resolve = res));
        if (choice === "deny") {
          ev("tool.completed", { tool, duration: 0.1, error: true, preview: L("BLOCKED: negato dall'utente", "BLOCKED: denied by the user") });
          await sleep(500);
          return finish(ev, sessionId, runId, L("Va bene, non l'ho aggiunta. Se cambi idea dimmelo.", "Okay, I didn't add it. Let me know if you change your mind."));
        }
        runs[runId].approved = true;
        await sleep(700);
      }
      ev("tool.completed", { tool, duration: 1.2, error: false });
      await sleep(500);
    }
    if (runs[runId].stopped) return;
    let out = "";
    for (const word of sc.reply.split(/(\s+)/)) {
      if (runs[runId].stopped) return ev("run.cancelled", {});
      out += word; ev("message.delta", { delta: word }); await sleep(word.trim() ? 45 : 0);
    }
    finish(ev, sessionId, runId, out);
  }
  function finish(ev, sessionId, runId, out) {
    messages[sessionId].push({ role: "assistant", content: out });
    const s = sessions.find((x) => x.id === sessionId); s.last_active = now();
    ev("run.completed", { output: out, usage: {} });
  }

  // finto microfono: livello che oscilla come una voce
  let micTimer = null, recStart = 0;
  const PHRASES = LANG === "en" ? ["What's the weather tomorrow in Rome?", "Add the October electricity bill to the budget", "Set the AC to twenty-four degrees"] : ["Che tempo fa domani a Roma?", "Segna nel budget la bolletta della luce di ottobre", "Abbassa il condizionatore a ventiquattro gradi"];
  let phraseN = 0;

  Iris.mock = {
    getSettings: async () => JSON.parse(JSON.stringify(settings)),
    saveSettings: async (s, secrets) => {
      settings = Object.assign(settings, s);
      try { if (s.language) localStorage.setItem("irisLang", s.language); } catch (e) {}
      if (secrets && secrets.hermesKey) settings.hasHermesKey = true;
      if (secrets && secrets.sttKey) settings.stt.hasServerKey = true;
      if (secrets && secrets.ttsKey) settings.tts.hasServerKey = true;
      return true;
    },
    testHermes: async () => { await sleep(700); return { ok: true, version: "demo", features: { run_approval: true, sessions: true, runs: true }, toolsets: 18 }; },
    ping: async () => true,
    listSessions: async ({ source }) => {
      await sleep(150);
      return sessions.filter((s) => !source || s.source === source).sort((a, b) => b.last_active - a.last_active).map((s) => Object.assign({}, s));
    },
    createSession: async () => { const id = "s" + (sessions.length + 1) + "_" + Date.now(); sessions.push({ id, source: "desktop", title: "", preview: "", last_active: now() }); messages[id] = []; return { id }; },
    getMessages: async (id) => { await sleep(120); return (messages[id] || []).map((m) => Object.assign({}, m)); },
    sendMessage: async (sessionId, text) => {
      const runId = "run_demo" + ++runN;
      runs[runId] = { stopped: false };
      messages[sessionId].push({ role: "user", content: text });
      const s = sessions.find((x) => x.id === sessionId); if (!s.title) s.title = text.slice(0, 40); s.preview = text; s.last_active = now();
      runScript(runId, sessionId, text);
      return runId;
    },
    approve: async (runId, choice) => { const r = runs[runId]; if (r && r.resolve) { r.resolve(choice); r.resolve = null; } },
    stop: async (runId) => { if (runs[runId]) runs[runId].stopped = true; },
    onEvent: (cb) => listeners["hermes-event"].push(cb),
    startRecording: async () => {
      recStart = performance.now();
      micTimer = setInterval(() => { const t = (performance.now() - recStart) / 1000; emit("mic-level", Math.max(0, Math.min(1, (Math.sin(t * 11) * 0.5 + 0.5) * (Math.sin(t * 3.1) * 0.5 + 0.5) * 1.3 + Math.random() * 0.1))); }, 50);
    },
    stopRecording: async () => { clearInterval(micTimer); emit("mic-level", 0); await sleep(900); return { text: PHRASES[phraseN++ % PHRASES.length], ms: 640 }; },
    cancelRecording: async () => { clearInterval(micTimer); emit("mic-level", 0); },
    onMicLevel: (cb) => listeners["mic-level"].push(cb),
    onPtt: (cb) => listeners.ptt.push(cb),
    voiceKeys: async () => {},
    onVoiceKey: () => {},
    onOpen: (cb) => listeners["open-island"].push(cb),
    modelStatus: async () => ({ downloaded: modelDownloaded, sizeMb: 574, loaded: false, gpu: "Vulkan (demo)" }),
    downloadModel: async () => { for (let p = 0; p <= 100; p += 4) { emit("model-progress", p / 100); await sleep(60); } modelDownloaded = true; },
    onModelProgress: (cb) => listeners["model-progress"].push(cb),
    synthesize: async () => null,
    localStatus: async () => ({ installed: localInstalled, running: false, installing: false, old_qwen_mb: oldQwenMb }),
    localInstall: async (voice) => {
      for (let p = 0; p <= 100; p += 5) { emit("tts-install", { frac: p / 100, msg: L(`Scarico la voce… ${Math.round(p * 0.6)} MB`, `Downloading the voice… ${Math.round(p * 0.6)} MB`) }); await sleep(40); }
      emit("tts-install", { frac: 1, msg: L("Voce locale pronta", "Local voice ready") });
      localInstalled = true; localVoices.forEach((v) => { if (v.id === voice) v.downloaded = true; });
    },
    onLocalInstall: (cb) => listeners["tts-install"].push(cb),
    localVoices: async () => localVoices.map((v) => ({ ...v })),
    localWarm: async () => {},
    listAnimations: async () => ({ dir: "%APPDATA%\\Iris Notch\\animazioni", files: [{ id: "esempio-saluto", text: JSON.stringify({"nome": "Saluto con il cuore", "durata": 5000, "colore_occhi": "#f9a8d4", "occhi": [{"t": 0}, {"t": 0.2, "sorriso": 0.6, "dy": -8}, {"t": 0.75, "sorriso": 0.6, "dy": -8}, {"t": 1, "sorriso": 0, "dy": 0}], "destro": [{"t": 0.4, "palpebra": 0}, {"t": 0.48, "palpebra": 1}, {"t": 0.58, "palpebra": 0}], "oggetti": [{"forma": "cuore", "colore": "#fb7185", "dimensione": 6, "chiavi": [{"t": 0, "x": 80, "y": 110, "scala": 0}, {"t": 0.3, "x": 80, "y": 50, "scala": 1}, {"t": 0.8, "x": 84, "y": 20, "scala": 1, "opacita": 1}, {"t": 1, "x": 86, "y": -10, "scala": 0.6, "opacita": 0}]}, {"forma": "testo", "testo": "ciao!", "colore": "#fde68a", "dimensione": 5, "chiavi": [{"t": 0.35, "x": 18, "y": 40, "opacita": 0}, {"t": 0.45, "x": 18, "y": 35, "opacita": 1}, {"t": 0.85, "x": 18, "y": 35, "opacita": 1}, {"t": 1, "x": 18, "y": 30, "opacita": 0}]}, {"forma": "stella", "colore": "#ffffff", "dimensione": 3, "dietro": true, "chiavi": [{"t": 0, "x": 30, "y": 20, "scala": 0, "rotazione": 0}, {"t": 0.5, "x": 30, "y": 20, "scala": 1, "rotazione": 90}, {"t": 1, "x": 30, "y": 20, "scala": 0, "rotazione": 180}]}]}) }] }),
    openAnimations: async () => {},
    localRemoveOld: async () => { await sleep(400); oldQwenMb = 0; },
    pinSession: async (id, pinned) => { await sleep(120); const s = sessions.find((x) => x.id === id); if (s) s.pinned = pinned; return s; },
    deleteSession: async (id) => { await sleep(150); sessions = sessions.filter((x) => x.id !== id); delete messages[id]; },
    saveSessionsLocal: async () => {},
    renameSession: async (id, title) => { await sleep(150); const s = sessions.find((x) => x.id === id); if (s) s.title = title; return s; },
    // finestra: nel browser l'isola si muove dentro la pagina, che fa da schermo
    screenInfo: async () => ({ name: "", px: 0, py: 0, scale: 1, w: innerWidth, h: innerHeight, wx: 0, wy: 0, ww: innerWidth, wh: innerHeight }),
    setWindowRect: async () => {},
    pointerInfo: null,
    log: async (level, msg) => console.log(`[${level}]`, msg),
    logTail: async () => ({ iris: L("2026-10-03 18:20:11 UTC [errore] tts_synthesize: esempio di errore nella demo", "2026-10-03 18:20:11 UTC [error] tts_synthesize: example error in the demo"), voce: "", dir: "" }),
    openLogs: async () => {},
    checkUpdate: async () => ({ available: false }),
    openLink: async (url) => window.open(url, "_blank"),
    appInfo: async () => ({ version: "0.2.2", repo: "https://github.com/Mark9712Seto/IrisVolto" }),
    localHealth: async () => ({ running: true, ultima_frase: { calcolo_s: 0.31, audio_s: 3.1 } }),
    saveIsland: async () => {},
    // solo demo: simula la scorciatoia "premi e parla"
    _ptt: (down) => emit("ptt", down ? "pressed" : "released"),
    _setReachable: null,
  };
})();
