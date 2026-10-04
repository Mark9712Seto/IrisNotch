/* Isola di Iris: interfaccia.
   Stati degli occhi guidati dagli eventi veri di Hermes (/v1/runs/{id}/events). */
(function () {
  const Iris = window.Iris;
  const B = Iris.backend;
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  /* ---------- icone ---------- */
  const ICONS = {
    plus: '<path d="M12 5v14M5 12h14"/>', down: '<path d="M6 9l6 6 6-6"/>', right: '<path d="M9 6l6 6-6 6"/>', back: '<path d="M15 6l-6 6 6 6"/>',
    pin: '<path d="M12 17v5"/><path d="M9 3h6l-1 6 3 3v2H7v-2l3-3z"/>',
    sliders: '<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>',
    mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
    send: '<path d="M5 12h13M13 6l6 6-6 6"/>', stop: '<rect x="7" y="7" width="10" height="10" rx="2"/>',
    vol: '<path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/>',
    voloff: '<path d="M11 5 6 9H3v6h3l5 4z"/><path d="M16 9l5 6M21 9l-5 6"/>',
    check: '<path d="M5 12l5 5 9-10"/>', x: '<path d="M6 6l12 12M18 6 6 18"/>',
    copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
    alert: '<path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17v.5"/>',
    tool: '<path d="M14.5 6.5a4 4 0 0 0-5 5L4 17l3 3 5.5-5.5a4 4 0 0 0 5-5l-2.5 2.5-3-3z"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/><path d="M10 11v6M14 11v6"/>',
  };
  const icon = (n) => `<i data-i="${n}"><svg viewBox="0 0 24 24">${ICONS[n]}</svg></i>`;
  function paintIcons(root) { root.querySelectorAll("i[data-i]").forEach((el) => { if (!el.firstChild) el.innerHTML = `<svg viewBox="0 0 24 24">${ICONS[el.dataset.i]}</svg>`; }); }
  paintIcons(document);

  /* ---------- stato ---------- */
  const isl = $("island");
  const eyes = Iris.createEyes($("eyes"), { island: true, autoEggs: false }); // gli easter egg a sorpresa li decide il timer più sotto
  // ogni stato ha più versioni (ascolta, pensa, parla…): a ogni volta ne esce una a caso
  Object.keys(Iris.VARIANTS).forEach((st) => eyes.setVariant(st, "random"));
  let settings = null;
  let session = null;           // {id,title}
  let run = null;               // {id, el, text, tool}
  let pinned = false, expanded = false, reachable = true;
  let voiceMode = null;         // null | "rec" | "busy" | "preview"
  let voiceFromPtt = false;
  let doneTimer = null;

  const LABEL = {
    idle: "", listening: "Ti ascolto…", transcribing: "Trascrivo…", thinking: "Sto pensando…", tool: "Uso uno strumento…",
    replying: "Rispondo…", approval: "Mi serve il via libera", done: "Fatto", error: "Qualcosa è andato storto", sleep: "Hermes non raggiungibile",
  };
  const TOOL_NAMES = {
    terminal: "terminale", file: "file", read_file: "leggo un file", write_file: "scrivo un file", web: "web", web_search: "cerco sul web", browser: "browser",
    memory: "memoria", homeassistant: "casa", mail_search: "posta", email: "posta", calendar: "calendario", todo: "attività", code_execution: "eseguo codice",
    vision: "guardo un'immagine", delegation: "chiedo a un aiutante", session_search: "cerco nelle conversazioni", skills: "abilità", cronjob: "lavori programmati",
    actual_budget: "budget",
  };
  const toolName = (t) => TOOL_NAMES[t] || TOOL_NAMES[String(t).split(/[._]/)[0]] || t;

  // modalità debug: nel log tutte le azioni (gli errori ci vanno sempre)
  const dlog = (msg) => { if (settings && settings.debug && B.log) B.log("debug", msg); };
  function setState(s, text) {
    if (isl.dataset.state !== s) dlog(`stato: ${s}${text ? " (" + text + ")" : ""}`);
    eyes.setState(s);
    isl.dataset.state = s;
    document.documentElement.style.setProperty("--accent", Iris.EYE_COLOR[s] || Iris.EYE_COLOR.idle);
    const label = text != null ? text : LABEL[s] || "";
    $("status").textContent = label;
    isl.classList.toggle("active", !!label);
    isl.classList.toggle("attn", s === "approval");
    if (!expanded && !drag) place(true);
  }

  /* ---------- finestra: posizione, apertura, trascinamento ----------
     L'isola vive su uno schermo: le sue misure sono in pixel logici relativi a quello schermo (scr).
     La finestra di Windows la contiene con un margine trasparente per l'ombra; il programma la sposta in pixel fisici.
     In cima allo schermo è una tacca; tirata giù si stacca e diventa una bolla, riportata in cima torna tacca.
     Nel browser la pagina fa da schermo. */
  const EXP = { w: 460, h: 580 };
  const MARGIN = { top: { l: 24, r: 24, t: 0, b: 34 }, bubble: { l: 24, r: 24, t: 24, b: 34 } };
  const SNAP = 24; // sotto questa distanza dal bordo alto la bolla torna tacca
  const cl = (v, a, b) => Math.max(a, Math.min(b, v));
  /* Dimensione (impostazioni → Generale): uno zoom di tutta l'app. La pagina si ingrandisce con CSS zoom e, per la
     geometria, lo schermo "si restringe" dello stesso fattore: tutte le misure qui restano in px dell'app, e solo
     scale (px fisici per px dell'app) cresce. zs() applica lo zoom a uno schermo letto dal programma. */
  const zoom = () => (settings && settings.island && settings.island.zoom) || 1;
  function zs(sc) {
    if (!sc || sc.name === undefined) return sc;
    const z = zoom(), r = sc.raw || sc;
    return Object.assign({}, r, { raw: r, scale: r.scale * z, w: r.w / z, h: r.h / z, wx: r.wx / z, wy: r.wy / z, ww: r.ww / z, wh: r.wh / z });
  }
  function applyZoom() { document.documentElement.style.zoom = String(zoom()); }
  const pageScreen = () => { const z = zoom(); return { name: "", px: 0, py: 0, scale: z, w: innerWidth / z, h: innerHeight / z, wx: 0, wy: 0, ww: innerWidth / z, wh: innerHeight / z }; };
  let scr = pageScreen();
  let cur = null, win = { x: 0, y: 0, w: 0, h: 0 }, drag = null;
  const I = () => settings.island;
  const bubble = () => I().mode === "bubble";
  async function readScreen() { if (!Iris.isTauri) return; try { scr = zs(await B.screenInfo(I().screen || null)); } catch (e) {} }

  // area delle animazioni 122×26 px; intorno il bordo nero (impostazioni → Isola), uguale da tacca e da bolla
  const AW = 122, AH = 26;
  const border = () => (settings && settings.island.border != null ? settings.island.border : 6);
  let measureCtx = null;
  function statusWidth() {
    const el = $("status"); if (!el.textContent) return 0;
    measureCtx = measureCtx || document.createElement("canvas").getContext("2d");
    const cs = getComputedStyle(el); measureCtx.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    return Math.ceil(measureCtx.measureText(el.textContent).width);
  }
  function collapsedRect() {
    const b = border(), h = AH + 2 * b;
    // con una scritta ("Sto pensando…") la tacca si allarga quanto basta, la scritta parte subito dopo gli occhi
    const P = b + 10; // con la scritta: stesso spazio prima degli occhi e dopo la scritta
    const w = isl.classList.contains("active") ? cl(2 * P + 50 + statusWidth() + 4, AW + 2 * b, 380) : AW + 2 * b;
    const cx = I().x != null ? I().x : scr.w / 2;
    if (bubble()) {
      const cy = I().y != null ? I().y : scr.wy + scr.wh - 60;
      return { x: cl(cx - w / 2, 8, scr.w - w - 8), y: cl(cy - h / 2, 0, scr.wy + scr.wh - h - 8), w, h };
    }
    return { x: cl(cx - w / 2, 0, scr.w - w), y: 0, w, h };
  }
  function expandedRect() {
    const c = collapsedRect(), w = Math.min(EXP.w, scr.w), h = Math.min(EXP.h, scr.wh - 16);
    if (bubble()) {
      // si apre verso il lato dove c'è più spazio, partendo dall'angolo della bolla
      const left = c.x + c.w / 2 < scr.w / 2, up = c.y + c.h / 2 < scr.wy + scr.wh / 2;
      return { x: cl(left ? c.x : c.x + c.w - w, scr.wx + 8, scr.wx + scr.ww - w - 8), y: cl(up ? c.y : c.y + c.h - h, scr.wy + 8, scr.wy + scr.wh - h - 8), w, h };
    }
    return { x: cl(c.x + c.w / 2 - w / 2, 0, scr.w - w), y: 0, w, h };
  }
  function winFor(r) { const m = MARGIN[bubble() ? "bubble" : "top"]; return { x: r.x - m.l, y: r.y - m.t, w: r.w + m.l + m.r, h: r.h + m.t + m.b }; }
  function union(a, b) { const x = Math.min(a.x, b.x), y = Math.min(a.y, b.y); return { x, y, w: Math.max(a.x + a.w, b.x + b.w) - x, h: Math.max(a.y + a.h, b.y + b.h) - y }; }
  function setIsland(r, anim) {
    isl.classList.toggle("noanim", !anim);
    Object.assign(isl.style, { left: r.x - win.x + "px", top: r.y - win.y + "px", width: r.w + "px", height: r.h + "px" });
    if (!anim) void isl.offsetWidth;
  }
  let winKey = "";
  async function setWin(w) {
    win = w;
    if (!Iris.isTauri) return;
    const k = Math.round(scr.px + w.x * scr.scale), t = Math.round(scr.py + w.y * scr.scale), pw = Math.round(w.w * scr.scale), ph = Math.round(w.h * scr.scale);
    const key = [k, t, pw, ph].join(); if (key === winKey) return;
    winKey = key; await B.setWindowRect(k, t, pw, ph);
  }
  // curve: la tacca ha gli angoli in alto dritti e sotto arrotondati, la bolla tutti arrotondati;
  // l'area degli occhi segue la stessa curva, rientrata del bordo
  function shape() {
    const b = border(), h = AH + 2 * b, R = bubble() ? h / 2 : Math.round(h * 0.55), ri = Math.max(0, R - b), e = $("eyes").style;
    isl.style.borderRadius = expanded ? (bubble() ? "26px" : "0 0 26px 26px") : bubble() ? `${R}px` : `0 0 ${R}px ${R}px`;
    if (expanded) { e.left = "10px"; e.top = "13px"; e.borderRadius = "13px"; }
    else { e.left = b + "px"; e.top = b + "px"; e.borderRadius = bubble() ? `${ri}px` : `0 0 ${ri}px ${ri}px`; }
    // con la scritta ("Sto pensando…") gli occhi scivolano a sinistra: l'occhio sinistro parte a P dal bordo
    // (dentro l'area è a 46 px), la scritta subito dopo i puntini, e a destra resta lo stesso P
    const P = b + 10;
    if (!expanded && isl.classList.contains("active")) e.left = P - 46 + "px";
    $("bar").style.height = h + "px";
    $("status").style.left = P + 50 + "px"; $("status").style.right = "0"; $("status").style.lineHeight = h + "px";
  }
  /* La finestra di Windows resta grande quanto l'isola aperta e non si ridimensiona aprendo e chiudendo
     (ridimensionarla a fine animazione faceva sfarfallare gli occhi). La parte fuori dall'isola lascia
     passare i clic alle finestre sotto: lo decide hitTest() guardando dov'è il mouse. Si sposta solo trascinando. */
  async function place(anim) {
    if (!settings) return;
    isl.classList.toggle("bubble", bubble());
    shape();
    const t = expanded ? expandedRect() : collapsedRect();
    cur = t;
    if (!Iris.isTauri) { win = { x: 0, y: 0 }; setIsland(t, anim); return; }
    const w = winFor(union(collapsedRect(), expandedRect()));
    const moved = w.x !== win.x || w.y !== win.y || w.w !== win.w || w.h !== win.h;
    if (moved) { await setWin(w); setIsland(t, false); } else setIsland(t, anim);
  }
  addEventListener("resize", () => { if (!Iris.isTauri) { scr = pageScreen(); place(false); } });

  // con le risposte a voce attive la voce locale si carica in anticipo (all'avvio, aprendo l'isola, accendendo l'altoparlante)
  let lastWarm = 0;
  function warmVoice(force) {
    if (!settings || !settings.tts.auto || settings.tts.engine !== "local" || !B.localWarm) return;
    if (!force && Date.now() - lastWarm < 60000) return;
    lastWarm = Date.now(); B.localWarm().catch(() => {});
  }
  function expand() {
    if (expanded) return;
    warmVoice();
    stopCountdown(); expanded = true;
    isl.classList.add("expanded"); isl.classList.remove("collapsed"); place(true);
    if (dorme) { dorme = false; eyes.stopEgg(); }
    animazioneOra();
    setTimeout(autoGrow, 520);
    if (!session) loadInitialSession();
  }
  function blocked() { return pinned || voiceMode || (setDirty && $("settings").classList.contains("show")) || $("approval").classList.contains("show") || (document.activeElement === $("input") && $("input").value) || renaming; }
  function collapse(force) {
    if (!expanded) return;
    if (!force && blocked()) return;
    stopCountdown(); expanded = false; closeMenu(); closeSettings();
    isl.classList.remove("expanded"); isl.classList.add("collapsed"); place(true);
  }
  // apertura e chiusura: i tempi si scelgono nelle impostazioni (con un po' di attesa c'è tempo di prenderla e spostarla)
  let hoverT = null, leaveT = null;
  function stopCountdown() { clearTimeout(leaveT); $("cd").classList.remove("run", "go"); }
  function startCountdown() {
    const ms = I().closeDelay || 1500, c = $("cd");
    if (ms >= 1000) { c.style.transitionDuration = ms + "ms"; c.classList.add("run"); requestAnimationFrame(() => requestAnimationFrame(() => c.classList.add("go"))); }
    leaveT = setTimeout(() => { stopCountdown(); collapse(false); }, ms);
  }
  function onEnter() { stopCountdown(); clearTimeout(hoverT); if (!drag && !expanded && I().open !== "click") hoverT = setTimeout(expand, I().openDelay != null ? I().openDelay : 1000); }
  function onLeave() { clearTimeout(hoverT); if (!drag && expanded && !blocked()) { stopCountdown(); startCountdown(); } }
  // nel browser bastano gli eventi del mouse; dentro Tauri entrata e uscita le decide hitTest()
  if (!Iris.isTauri) { isl.addEventListener("mouseenter", onEnter); isl.addEventListener("mouseleave", onLeave); }

  /* trascinamento: tieni premuto (o tira subito) e la porti dove vuoi, anche su un altro schermo.
     Da aperta si prende dagli occhi: si richiude e segue il mouse. */
  async function pointer(e) {
    if (!Iris.isTauri) return { x: e.clientX, y: e.clientY, screen: null };
    const p = await B.pointerInfo();
    const sc = p.screen && p.screen.name !== undefined ? zs(p.screen) : scr;
    return { x: (p.px - sc.px) / sc.scale, y: (p.py - sc.py) / sc.scale, screen: p.screen && p.screen.name !== undefined ? sc : p.screen };
  }
  isl.addEventListener("pointerdown", async (e) => {
    if (e.button !== 0) return;
    const onEyes = $("eyes").contains(e.target);
    if (expanded && !onEyes) return;
    const d = (drag = { on: false, onEyes, sx: e.clientX, sy: e.clientY });
    try { isl.setPointerCapture(e.pointerId); } catch (err) {}
    d.t = setTimeout(() => beginDrag(e), 280);
  });
  async function beginDrag(e) {
    const d = drag; if (!d || d.on) return;
    d.on = true; clearTimeout(hoverT); stopCountdown();
    isl.classList.add("dragging");
    const p = await pointer(e);
    if (p.screen && p.screen.name !== undefined && p.screen.name !== scr.name) scr = p.screen;
    if (expanded && pinned && Iris.isTauri && B.dragBegin) {
      // aperta e fissata con la puntina: si sposta tutta la finestra aperta, senza richiuderla
      const c = collapsedRect();
      d.keep = true; d.native = true; d.off = { x: p.x - (c.x + c.w / 2), y: p.y - (c.y + c.h / 2) };
      const z = zoom();
      B.dragBegin((p.x - win.x) * z, (p.y - win.y) * z, win.w * z, win.h * z).catch(() => {});
      return;
    }
    if (expanded) {
      // presa da aperta: si richiude e la bolla piccola nasce sotto il puntatore, non dove stava prima
      expanded = false; closeMenu(); closeSettings(); isl.classList.remove("expanded"); isl.classList.add("collapsed");
      I().mode = p.y - (AH + 2 * border()) / 2 < SNAP ? "top" : "bubble"; I().x = p.x; I().y = p.y;
      if (!Iris.isTauri) await place(false);
    }
    if (eyes.state === "idle") eyes.setState("surprised");
    const c = collapsedRect();
    // dove l'hai presa, rispetto al centro: così non salta sotto il puntatore
    d.off = { x: p.x - (c.x + c.w / 2), y: p.y - (c.y + c.h / 2) };
    if (!Iris.isTauri || !B.dragBegin) return;
    /* dentro Tauri la finestra la sposta il programma: qui diventa piccola quanto la bolla (più il margine
       per l'ombra) e da ora segue il puntatore da sola. Durante il cambio l'isola resta nascosta un istante,
       così non si vede mai nel posto sbagliato. */
    isl.classList.toggle("bubble", bubble()); shape(); cur = c;
    const m = MARGIN.bubble, w = { x: c.x - m.l, y: c.y - m.t, w: c.w + m.l + m.r, h: c.h + m.t + m.b };
    isl.style.visibility = "hidden";
    await setWin(w); setIsland(c, false);
    isl.style.visibility = ""; // subito: aspettando il fotogramma dopo, mentre la finestra si muove poteva restare invisibile
    d.native = true;
    const z = zoom(); // il programma conta in px logici dello schermo, l'app in px zoomati
    B.dragBegin((p.x - w.x) * z, (p.y - w.y) * z, w.w * z, w.h * z).catch(() => {});
  }
  // posizione durante il trascinamento nativo: serve solo a sapere se è tacca o bolla e su quale schermo
  if (Iris.isTauri && B.onDrag) {
    B.onDrag((q) => {
      const d = drag; if (!d || !d.native || d.keep) return;
      const sc = q.screen && q.screen.name !== undefined ? zs(q.screen) : scr;
      if (sc.name !== scr.name) scr = sc;
      const x = (q.px - sc.px) / sc.scale, y = (q.py - sc.py) / sc.scale, h = AH + 2 * border(), cx = x - d.off.x, cy = y - d.off.y;
      const mode = cy - h / 2 < SNAP ? "top" : "bubble"; // in cima è tacca, più giù è bolla
      I().x = cx; I().y = cy;
      if (mode !== I().mode) { I().mode = mode; isl.classList.toggle("bubble", bubble()); shape(); }
    });
    B.onDragEnd(() => endDrag({ type: "native" }));
  }
  let moving = false;
  isl.addEventListener("pointermove", async (e) => {
    const d = drag; if (!d) return;
    if (!d.on && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) > 5) { clearTimeout(d.t); await beginDrag(e); }
    if (!d.on || !d.off || d.native || moving) return;
    moving = true;
    try {
      const p = await pointer(e);
      if (p.screen && p.screen.name !== scr.name) scr = p.screen; // passata su un altro schermo
      const h = AH + 2 * border(), cx = p.x - d.off.x, cy = p.y - d.off.y;
      I().mode = cy - h / 2 < SNAP ? "top" : "bubble"; // in cima è tacca, più giù è bolla
      I().x = cx; I().y = cy;
      await place(false);
    } finally { moving = false; }
  });
  function endDrag(e) {
    const d = drag; if (!d) return;
    drag = null; clearTimeout(d.t);
    if (d.on) {
      isl.classList.remove("dragging"); if (eyes.state === "surprised") eyes.setState("idle");
      const save = () => {
        // si salva dove è rimasta davvero (la tacca resta appoggiata al bordo)
        const c = collapsedRect(); I().x = c.x + c.w / 2; I().y = bubble() ? c.y + c.h / 2 : null; I().screen = scr.name || "";
        B.saveIsland(I()).catch(() => {});
      };
      if (!d.native) return save();
      // fine del trascinamento nativo: posizione esatta del puntatore, poi la finestra torna grande come prima
      // con l'isola dove l'hai lasciata (nascosta per un istante durante il cambio)
      B.dragEnd().catch(() => {});
      isl.style.visibility = "hidden";
      (async () => {
        try {
          const p = await pointer(e);
          if (p.screen && p.screen.name !== undefined) scr = p.screen;
          const cx = p.x - d.off.x, cy = p.y - d.off.y;
          I().mode = cy - (AH + 2 * border()) / 2 < SNAP ? "top" : "bubble"; I().x = cx; I().y = cy;
        } catch (err) {}
        await place(false);
        isl.style.visibility = "";
        save();
      })();
      return;
    }
    if (e.type !== "pointerup") return;
    // un clic, non un trascinamento
    if (!expanded) { clearTimeout(hoverT); expand(); }
    else if (d.onEyes) eyes.poke();
  }
  isl.addEventListener("pointerup", endDrag);
  isl.addEventListener("pointercancel", endDrag);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") { if ($("settings").classList.contains("show")) closeSettings(); else if (voiceMode) cancelVoice(); else collapse(true); } });
  $("pinBtn").onclick = () => { pinned = !pinned; $("pinBtn").classList.toggle("on", pinned); };

  /* gli occhi seguono il mouse (anche fuori dalla finestra: la posizione la dà il programma) */
  function eyesCenter() { const r = cur || collapsedRect(), b = border(); return expanded ? { x: r.x + 10 + 61, y: r.y + 13 + 13 } : { x: r.x + b + 61, y: r.y + b + 13 }; }
  /* Come guarda il mouse: l'umore cambia ogni 2-6 minuti. "curioso" lo segue da lontano e con attenzione,
     "normale" come sempre, "distratto" lo guarda solo ogni tanto. */
  const UMORI = { curioso: { gain: 1.5, raggio: 1100, quota: 1 }, normale: { gain: 1, raggio: 700, quota: 1 }, distratto: { gain: 0.6, raggio: 400, quota: 0.25 } };
  let umore = "normale", cambioUmore = Date.now() + 120000, guarda = true, cambioGuarda = 0;
  function lookToward(px, py) {
    if (!settings || !I().follow) return eyes.lookAt(null);
    const now = Date.now();
    if (now > cambioUmore) { const r = Math.random(); umore = r < 0.25 ? "curioso" : r < 0.75 ? "normale" : "distratto"; cambioUmore = now + (2 + Math.random() * 4) * 60000; dlog(`occhi: umore ${umore}`); }
    const u = UMORI[umore];
    if (now > cambioGuarda) { guarda = Math.random() < u.quota; cambioGuarda = now + 1500 + Math.random() * 3500; }
    const c = eyesCenter(), dx = px - c.x, dy = py - c.y;
    if (!guarda || Math.hypot(dx, dy) > u.raggio) eyes.lookAt(null); else eyes.lookAt(clampN(dx / 260 * u.gain), clampN(dy / 170 * u.gain));
  }
  const clampN = (v) => Math.max(-1.6, Math.min(1.6, v));
  /* Il mouse: se va velocissimo si spaventa (e se insiste gli gira la testa); se nessuno lo tocca per 12 minuti
     si appisola, e quando torni si sveglia di colpo. Solo a isola chiusa e ferma. */
  let ultimoPunto = null, ultimoMoto = Date.now(), velociDiFila = 0, prossimaReazione = 0, dorme = false;
  function osservaMouse(x, y) {
    const now = Date.now();
    if (ultimoPunto) {
      const v = Math.hypot(x - ultimoPunto.x, y - ultimoPunto.y) / Math.max(1, now - ultimoPunto.t) * 1000; // px al secondo
      if (v > 2) {
        ultimoMoto = now;
        if (dorme) { dorme = false; eyes.stopEgg(); eyes.setState("surprised"); setTimeout(() => eyes.state === "surprised" && !drag && eyes.setState("idle"), 900); dlog("occhi: svegliato dal mouse"); }
      }
      const libero = !expanded && !drag && eyes.state === "idle" && !eyes.egg;
      if (v > 4500) velociDiFila++; else if (v < 1500) velociDiFila = Math.max(0, velociDiFila - 1);
      if (libero && now > prossimaReazione && velociDiFila >= 3) {
        prossimaReazione = now + 90000; velociDiFila = 0;
        if (Math.random() < 0.35) eyes.playEgg("giramento");
        else { eyes.setState("surprised"); setTimeout(() => eyes.state === "surprised" && !drag && eyes.setState("idle"), 800); }
      }
      if (libero && !dorme && now - ultimoMoto > 12 * 60000) { dorme = true; eyes.playEgg("pisolino"); }
      if (dorme && !eyes.egg && libero) eyes.playEgg("pisolino"); // il pisolino continua finché non torni
    }
    ultimoPunto = { x, y, t: now };
  }
  // aprendo l'isola, una volta per fascia oraria: occhiaie a notte fonda, assonnato all'alba, caffè, stiracchiata, sera
  let ultimaFascia = "", ultimaFasciaT = 0;
  function animazioneOra() {
    const name = Iris.timeEgg(new Date());
    if (!name || (name === ultimaFascia && Date.now() - ultimaFasciaT < 90 * 60000)) return;
    if (name === "stiracchiata" && Math.random() < 0.5) return; // nel tardo pomeriggio non sempre
    ultimaFascia = name; ultimaFasciaT = Date.now();
    setTimeout(() => { if (eyes.state === "idle" && !eyes.egg) eyes.playEgg(name); }, 700);
  }
  // dentro Tauri: ogni 60 ms si guarda dov'è il mouse, per entrata/uscita, clic attraverso e sguardo
  let inside = null, polling = false;
  async function hitTest() {
    if (!settings || polling) return;
    polling = true;
    try {
      const p = await B.pointerInfo(), x = (p.px - scr.px) / scr.scale, y = (p.py - scr.py) / scr.scale, r = cur || collapsedRect();
      const now = !!drag || (x >= r.x - 1 && x <= r.x + r.w + 1 && y >= r.y - 1 && y <= r.y + r.h + 1);
      if (now !== inside) {
        const first = inside === null; inside = now;
        await B.setClickThrough(!now);
        if (!first) (now ? onEnter : onLeave)();
      }
      if (I().follow && !drag) lookToward(x, y); else if (!I().follow) eyes.lookAt(null);
      osservaMouse(x, y);
    } catch (e) {}
    polling = false;
  }
  if (Iris.isTauri) setInterval(hitTest, 60);
  else document.addEventListener("pointermove", (e) => { lookToward(e.clientX, e.clientY); osservaMouse(e.clientX, e.clientY); });

  /* ---------- sessioni ---------- */
  const ago = (ts) => {
    const d = Date.now() / 1000 - ts;
    if (d < 60) return "ora"; if (d < 3600) return Math.round(d / 60) + " min"; if (d < 86400) return Math.round(d / 3600) + " h";
    if (d < 7 * 86400) return ["dom", "lun", "mar", "mer", "gio", "ven", "sab"][new Date(ts * 1000).getDay()];
    return new Date(ts * 1000).toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit" });
  };
  const SRC = { telegram: "Telegram", cli: "CLI", cron: "cron", desktop: "isola", api_server: "API", dashboard: "pannello", hermes_browser: "browser" };
  let allSessions = [];

  function itemHtml(s, badge) {
    // ordine: puntina · provenienza · nome · quando · rinomina · elimina
    return `<div class="it ${session && s.id === session.id ? "cur" : ""}" data-id="${esc(s.id)}" role="button" tabindex="0">
      <button class="rb pin ${isPinned(s) ? "on" : ""}" title="${isPinned(s) ? "Togli dalle fissate" : "Fissa in alto"}">${icon("pin")}</button>
      ${badge ? `<span class="badge ${esc(s.source)}">${esc(SRC[s.source] || s.source)}</span>` : ""}
      <span class="t"><b>${esc(s.title || s.preview || "Senza titolo")}</b>${s.title && s.preview ? `<small>${esc(s.preview)}</small>` : ""}</span>
      <span class="when">${ago(s.last_active || s.started_at || 0)}</span>
      <button class="rb ren" title="Rinomina">${icon("edit")}</button>
      <button class="rb del" title="Elimina">${icon("trash")}</button></div>`;
  }
  async function refreshSessions() {
    try { allSessions = await B.listSessions({ limit: 60 }); } catch (e) { allSessions = []; }
    renderMenu();
  }
  // sessioni nate dall'isola: quelle che Hermes segna "desktop" più quelle che l'app si ricorda di aver creato
  // (alcune versioni di Hermes ignorano la provenienza e le salvano come "api_server")
  let mineIds = new Set(), pinIds = new Set();
  const isMine = (s) => s.source === "desktop" || mineIds.has(s.id) || (s._lineage_root_id && mineIds.has(s._lineage_root_id));
  const isPinned = (s) => !!s.pinned || pinIds.has(s.id);
  function saveLocal() { if (B.saveSessionsLocal) B.saveSessionsLocal([...mineIds], [...pinIds]).catch(() => {}); }
  function renderMenu() {
    const q = $("search").value.trim().toLowerCase();
    const pinned = allSessions.filter(isPinned);
    const mine = allSessions.filter((s) => !isPinned(s) && isMine(s)).slice(0, 5);
    const others = allSessions.filter((s) => !isPinned(s) && !isMine(s) && (!q || ((s.title || "") + " " + (s.preview || "")).toLowerCase().includes(q)));
    $("pinWrap").style.display = pinned.length ? "" : "none";
    $("menuPinned").innerHTML = pinned.map((s) => itemHtml(s, !isMine(s))).join("");
    $("menuMine").innerHTML = mine.length ? mine.map((s) => itemHtml(s, false)).join("") : `<div class="empty">Ancora nessuna conversazione dall'isola.</div>`;
    $("menuOthers").innerHTML = others.length ? others.map((s) => itemHtml(s, true)).join("") : `<div class="empty">Nessuna sessione trovata.</div>`;
    document.querySelectorAll("#menu .it").forEach((b) => {
      const s = allSessions.find((x) => x.id === b.dataset.id);
      b.onclick = () => openSession(s);
      b.onkeydown = (e) => { if (e.key === "Enter") openSession(s); };
      b.querySelector(".ren").onclick = (e) => { e.stopPropagation(); renameInRow(b, s); };
      b.querySelector(".pin").onclick = (e) => { e.stopPropagation(); togglePin(s); };
      b.querySelector(".del").onclick = (e) => { e.stopPropagation(); askDelete(b, s); };
    });
  }
  function closeMenu() { if (!renaming) $("menu").classList.remove("show"); }
  // la freccia accanto al titolo segue il menu (aperto/chiuso), da qualunque parte venga aperto o chiuso
  new MutationObserver(() => $("sessBtn").classList.toggle("open", $("menu").classList.contains("show"))).observe($("menu"), { attributes: true, attributeFilter: ["class"] });

  /* ---------- rinomina: il nome nuovo va su Hermes, quindi si vede anche da Telegram e dal pannello ---------- */
  let renaming = false;
  function editBox(host, value, done) {
    renaming = true;
    const inp = document.createElement("input"); inp.value = value; inp.maxLength = 120;
    host.replaceWith(inp); inp.focus(); inp.select();
    let fin = false;
    const finish = (ok) => { if (fin) return; fin = true; renaming = false; inp.replaceWith(host); if (ok && inp.value.trim() && inp.value.trim() !== value) done(inp.value.trim()); };
    inp.onkeydown = (e) => { e.stopPropagation(); if (e.key === "Enter") finish(true); else if (e.key === "Escape") finish(false); };
    inp.onclick = (e) => e.stopPropagation();
    inp.onblur = () => finish(true);
    return inp;
  }
  async function rename(id, title) {
    try {
      await B.renameSession(id, title);
      const s = allSessions.find((x) => x.id === id); if (s) s.title = title;
      if (session && session.id === id) { session.title = title; $("sessTitle").textContent = title; }
      renderMenu();
    } catch (e) { setState("error", "Rinomina: " + String(e.message || e)); setTimeout(() => isl.dataset.state === "error" && setState("idle"), 3000); }
  }
  // fissa in alto: lo salva Hermes (si vede anche nel pannello); se la versione di Hermes non lo sa fare, lo ricorda l'app
  async function togglePin(s) {
    const want = !isPinned(s);
    try { await B.pinSession(s.id, want); s.pinned = want; if (!want) pinIds.delete(s.id); }
    catch (e) { s.pinned = false; want ? pinIds.add(s.id) : pinIds.delete(s.id); saveLocal(); dlog("fissa solo nell'app: " + e); }
    renderMenu();
  }
  // elimina: il primo clic sul cestino lo trasforma in una spunta rossa, il secondo conferma.
  // Se non si conferma entro 3 secondi torna cestino.
  function askDelete(row, s) {
    const btn = row.querySelector(".del");
    if (!btn.classList.contains("sure")) {
      btn.classList.add("sure"); btn.innerHTML = icon("check"); btn.title = "Clicca di nuovo per eliminare (non si può annullare)";
      row.classList.add("ask");
      btn._t = setTimeout(() => { btn.classList.remove("sure"); btn.innerHTML = icon("trash"); btn.title = "Elimina"; row.classList.remove("ask"); }, 3000);
      return;
    }
    clearTimeout(btn._t);
    (async () => {
      try {
        await B.deleteSession(s.id);
        allSessions = allSessions.filter((x) => x.id !== s.id); mineIds.delete(s.id); pinIds.delete(s.id); saveLocal();
        if (session && session.id === s.id) showHello();
      } catch (err) { setState("error", "Eliminazione: " + String(err.message || err)); setTimeout(() => isl.dataset.state === "error" && setState("idle"), 3000); }
      renderMenu();
    })();
  }
  // nella riga si modifica solo il titolo, al suo posto: la riga non cambia altezza
  function renameInRow(row, s) {
    const b = row.querySelector(".t b"), txt = document.createElement("span");
    txt.textContent = b.textContent; b.textContent = ""; b.appendChild(txt);
    row.classList.add("editing");
    const inp = editBox(txt, s.title || s.preview || "", (t) => rename(s.id, t));
    inp.className = "row-edit";
    const done = () => row.classList.remove("editing");
    inp.addEventListener("blur", done); inp.addEventListener("keydown", (ev) => { if (ev.key === "Enter" || ev.key === "Escape") done(); });
  }
  // doppio clic sul titolo in alto: rinomina la conversazione aperta
  $("sessBtn").addEventListener("dblclick", (e) => {
    e.preventDefault(); e.stopPropagation(); if (!session) return; $("menu").classList.remove("show");
    const span = $("sessTitle"), btn = $("sessBtn"), inp = editBox(span, session.title, (t) => rename(session.id, t));
    inp.className = "title-edit"; btn.classList.add("editing");
    inp.addEventListener("blur", () => btn.classList.remove("editing"));
    inp.addEventListener("keydown", (ev) => { if (ev.key === "Enter" || ev.key === "Escape") btn.classList.remove("editing"); });
  });
  $("sessBtn").onclick = async (e) => { e.stopPropagation(); if (renaming) return; const m = $("menu"); if (m.classList.toggle("show")) await refreshSessions(); };
  $("moreBtn").onclick = () => { const o = $("others").classList.toggle("show"); $("moreBtn").classList.toggle("open", o); if (o) $("search").focus(); };
  $("search").oninput = renderMenu;
  document.addEventListener("click", (e) => { if (!$("menu").contains(e.target) && e.target !== $("sessBtn")) closeMenu(); });
  $("newBtn").onclick = () => newSession();

  async function loadInitialSession() {
    await refreshSessions();
    const last = allSessions.find(isMine);
    if (last && Date.now() / 1000 - (last.last_active || 0) < 6 * 3600) openSession(last); else showHello();
  }
  function showHello() {
    session = null; $("sessTitle").textContent = "Nuova conversazione";
    $("chat").innerHTML = `<div class="hello"><b>Ciao! Come posso aiutarti?</b>Scrivi qui sotto, oppure tieni premuto <b style="display:inline;font-size:inherit">${esc((settings && settings.shortcuts.ptt) || "la scorciatoia")}</b> e parla.</div>`;
  }
  function newSession() { closeMenu(); showHello(); $("input").focus(); }
  async function openSession(s) {
    closeMenu(); if (!s) return;
    session = { id: s.id, title: s.title || s.preview || "Senza titolo" };
    $("sessTitle").textContent = session.title;
    $("chat").innerHTML = "";
    const msgs = await B.getMessages(s.id);
    for (const m of msgs) {
      if (m.role === "user") addMsg("user", m.content);
      else if (m.role === "assistant" && m.content) addMsg("assistant", m.content);
      else if (m.role === "tool" && m.tool_name) addAct(m.tool_name, "", true);
    }
    scrollDown();
  }

  /* ---------- chat ---------- */
  function md(s) {
    return esc(s).replace(/`([^`]+)`/g, "<code>$1</code>").replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>").replace(/(^|\W)\*([^*\n]+)\*(?=\W|$)/g, "$1<i>$2</i>");
  }
  let msgN = 0;
  function addMsg(role, text) {
    const el = document.createElement("div");
    el.className = "msg " + role; el.dataset.id = "m" + msgN++;
    el.innerHTML = `<div class="txt">${md(text)}</div>`;
    el._text = text;
    if (role === "assistant") addActs(el);
    const hello = $("chat").querySelector(".hello"); if (hello) hello.remove();
    $("chat").appendChild(el);
    return el;
  }
  function addActs(el) {
    const a = document.createElement("div"); a.className = "acts";
    a.innerHTML = `<button data-a="speak">${icon("vol")}<span>Ascolta</span></button><button data-a="copy">${icon("copy")}<span>Copia</span></button>`;
    a.querySelector('[data-a="speak"]').onclick = () => toggleSpeak(el);
    a.querySelector('[data-a="copy"]').onclick = (e) => { navigator.clipboard && navigator.clipboard.writeText(el._text); flash(e.currentTarget.querySelector("span"), "Copiato"); };
    el.appendChild(a);
  }
  function flash(span, txt) { const old = span.textContent; span.textContent = txt; setTimeout(() => (span.textContent = old), 1200); }
  function addAct(tool, preview, done) {
    const el = document.createElement("div");
    el.className = "act" + (done ? " done" : "");
    el.innerHTML = `${icon("tool")}<span>${esc(toolName(tool))}${preview ? " · " + esc(String(preview).slice(0, 60)) : ""}</span>`;
    $("chat").appendChild(el); scrollDown();
    return el;
  }
  function scrollDown() { const c = $("chat"); c.scrollTop = c.scrollHeight; }

  /* ---------- lettura ad alta voce ---------- */
  function toggleSpeak(el) {
    if (Iris.tts.speakingId() === el.dataset.id) { Iris.tts.stop(); return; }
    speakEl(el);
  }
  // mentre Iris parla (anche rileggendo una risposta vecchia) gli occhi "parlano"
  let speaking = 0;
  function speakingEyes(on) {
    speaking = Math.max(0, speaking + (on ? 1 : -1));
    if (speaking && !run && ["idle", "done", "replying"].includes(isl.dataset.state)) setState("replying", "Parlo…");
    if (!speaking && !run && isl.dataset.state === "replying") setState("idle");
  }
  function speakingUI(el, on) {
    if (on) document.querySelectorAll(".acts.speaking").forEach((a) => a.parentNode !== el && speakingUI(a.parentNode, false));
    const was = el.querySelector(".acts") && el.querySelector(".acts").classList.contains("speaking");
    if (was !== on) speakingEyes(on);
    const btn = el.querySelector('[data-a="speak"]'), acts = el.querySelector(".acts");
    if (!btn) return;
    btn.classList.toggle("speaking", on); acts.classList.toggle("speaking", on);
    btn.innerHTML = on ? `${icon("stop")}<span>Ferma</span>` : `${icon("vol")}<span>Ascolta</span>`;
  }
  function speakEl(el) {
    speakingUI(el, true);
    Iris.tts.speak(el._text, settings.tts, el.dataset.id, () => speakingUI(el, false));
  }
  Iris.onVoiceError = (msg) => {
    if (B.log) B.log("errore", "voce: " + msg);
    if ($("settings").classList.contains("show")) { $("sTtsRes").className = "res err"; $("sTtsRes").textContent = msg; }
    setState("error", "Voce: " + msg); setTimeout(() => isl.dataset.state === "error" && setState("idle"), 3500); };
  function renderTtsBtn() { const on = settings.tts.auto; $("ttsBtn").classList.toggle("on", on); $("ttsBtn").innerHTML = icon(on ? "vol" : "voloff"); $("ttsBtn").title = on ? "Risposte a voce: attive" : "Risposte a voce: spente"; }
  $("ttsBtn").onclick = async () => { settings.tts.auto = !settings.tts.auto; if (!settings.tts.auto) Iris.tts.stop(); renderTtsBtn(); await B.saveSettings(settings); warmVoice(true); };

  /* ---------- invio e eventi di Hermes ---------- */
  async function send(text) {
    text = text.trim(); if (!text || run) return;
    if (!session) {
      const s = await B.createSession();
      session = { id: s.id, title: text.slice(0, 48) }; $("sessTitle").textContent = session.title;
      mineIds.add(s.id); saveLocal(); dlog("sessione nuova dall'isola: " + s.id);
    }
    addMsg("user", text); scrollDown();
    // con la lettura attiva la voce locale si prepara mentre Iris pensa
    warmVoice();
    $("input").value = ""; autoGrow();
    setState("thinking");
    try {
      const id = await B.sendMessage(session.id, text);
      run = { id, el: null, text: "", tool: null };
      setSendMode(true);
    } catch (e) { failRun(String(e)); }
  }
  function setSendMode(running) { const b = $("sendBtn"); b.classList.toggle("stop", running); b.innerHTML = icon(running ? "stop" : "send"); b.title = running ? "Ferma" : "Invia"; }
  $("sendBtn").onclick = () => { if (run) B.stop(run.id); else send($("input").value); };
  $("input").addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send($("input").value); } });
  // la casella cresce con il testo; la barra di scorrimento compare solo oltre le 4-5 righe
  // (vuota torna alla misura di una riga: con l'isola chiusa la casella è stretta e la scritta d'esempio andrebbe a capo)
  function autoGrow() {
    const t = $("input");
    if (!t.value || !expanded) { t.style.height = ""; t.style.overflowY = "hidden"; return; }
    t.style.height = "auto"; const h = t.scrollHeight + 2; t.style.height = Math.min(110, h) + "px"; t.style.overflowY = h > 110 ? "auto" : "hidden";
  }
  $("input").addEventListener("input", autoGrow);

  B.onEvent((ev) => {
    if (ev.event !== "message.delta") dlog(`hermes: ${ev.event}${ev.tool ? " " + ev.tool : ""}${ev.error ? " — " + ev.error : ""}`);
    if (!run || ev.run_id !== run.id) return;
    switch (ev.event) {
      case "message.delta":
        if (!run.el) { run.el = addMsg("assistant", ""); run.el.querySelector(".txt").classList.add("caret"); if (settings.tts.chime) Iris.tts.chime("reply"); }
        run.text += ev.delta || ""; run.el._text = run.text;
        run.el.querySelector(".txt").innerHTML = md(run.text); scrollDown();
        // risposte a voce: si comincia a leggere appena c'è una frase completa
        if (settings.tts.auto) {
          if (!run.speech) { const el = run.el; speakingUI(el, true); run.speech = Iris.tts.stream(settings.tts, el.dataset.id, () => speakingUI(el, false)); }
          run.speech.push(run.text);
        }
        if (isl.dataset.state !== "replying") setState("replying");
        break;
      case "tool.started":
        run.tool = addAct(ev.tool, ev.preview); setState("tool", "Uso: " + toolName(ev.tool)); break;
      case "tool.completed":
        if (run.tool) { run.tool.classList.add(ev.error ? "err" : "done"); run.tool = null; }
        if (isl.dataset.state === "tool") setState("thinking"); break;
      case "subagent.start": setState("tool", "Chiedo a un aiutante…"); break;
      case "approval.request": showApproval(ev); break;
      case "run.completed": finishRun(ev.output); break;
      case "run.failed": case "run.interrupted": failRun(ev.error || "La richiesta non è andata a buon fine"); break;
      case "run.cancelled": endRun(); setState("idle"); break;
    }
  });
  function finishRun(output) {
    if (!run.el && output) { run.el = addMsg("assistant", output); if (settings.tts.chime) Iris.tts.chime("reply"); }
    if (run.el) { const t = output || run.text; run.el._text = t; run.el.querySelector(".txt").innerHTML = md(t); run.el.querySelector(".txt").classList.remove("caret"); }
    const el = run.el, speech = run.speech; endRun(); setState("done");
    if (speech) speech.end(el._text);
    else if (el && settings.tts.auto) speakEl(el);
    clearTimeout(doneTimer); doneTimer = setTimeout(() => { if (isl.dataset.state === "done") (speaking ? setState("replying", "Parlo…") : setState("idle")); }, 3000);
    scrollDown();
  }
  function failRun(msg) {
    endRun(); setState("error");
    const el = document.createElement("div"); el.className = "act err"; el.innerHTML = `${icon("alert")}<span>${esc(msg)}</span>`; $("chat").appendChild(el); scrollDown();
    clearTimeout(doneTimer); doneTimer = setTimeout(() => { if (isl.dataset.state === "error") setState(reachable ? "idle" : "sleep"); }, 4000);
  }
  function endRun() { if (run && run.el) run.el.querySelector(".txt").classList.remove("caret"); run = null; setSendMode(false); hideApproval(); }

  /* ---------- via libera ---------- */
  function showApproval(ev) {
    $("apDesc").textContent = ev.description || "Iris vuole eseguire questa azione:";
    $("apCmd").textContent = ev.command || ev.pattern_key || "";
    $("apCmd").style.display = $("apCmd").textContent ? "block" : "none";
    $("approval").classList.add("show"); setState("approval");
    Iris.tts.chime("attention"); expand(); scrollDown();
  }
  function hideApproval() { $("approval").classList.remove("show"); }
  async function decide(choice) {
    if (!run) return hideApproval();
    hideApproval(); setState("thinking");
    await B.approve(run.id, choice);
  }
  $("apOnce").onclick = () => decide("once");
  $("apDeny").onclick = () => decide("deny");

  /* ---------- voce: premi e parla ---------- */
  const meter = $("meter");
  meter.innerHTML = Array.from({ length: 22 }, () => "<span></span>").join("");
  const bars = [...meter.children];
  let levels = new Array(22).fill(0);
  B.onMicLevel((v) => {
    eyes.setLevel(v);
    levels.push(v); levels = levels.slice(-22);
    bars.forEach((b, i) => (b.style.height = 4 + levels[i] * 28 + "px"));
  });

  async function startVoice(fromPtt) {
    if (voiceMode === "rec" || run) return;
    Iris.tts.stop();
    voiceFromPtt = !!fromPtt; expand();
    voiceMode = "rec";
    const v = $("voice"); v.classList.add("show"); v.classList.remove("preview");
    $("vTitle").textContent = "Ti ascolto…";
    $("vHint").textContent = fromPtt ? "rilascia per finire" : "clicca di nuovo il microfono per finire";
    $("micBtn").classList.add("rec"); setState("listening");
    try { await B.startRecording(); } catch (e) { voiceError(e); }
  }
  async function stopVoice() {
    if (voiceMode !== "rec") return;
    voiceMode = "busy"; $("micBtn").classList.remove("rec"); eyes.setLevel(null);
    $("vTitle").textContent = "Trascrivo…"; $("vHint").textContent = ""; setState("transcribing");
    try {
      const r = await B.stopRecording();
      const text = (r && r.text ? r.text : "").trim();
      if (!text) { voiceError("Non ho sentito niente"); return; }
      if (settings.stt.sendWithoutPreview) { closeVoice(); return send(text); }
      voiceMode = "preview";
      $("voice").classList.add("preview"); $("vTitle").textContent = "Ho capito questo"; $("vHint").textContent = "correggi se serve";
      $("vText").value = text; setState("idle");
      setTimeout(() => { $("vText").focus(); $("vText").setSelectionRange(text.length, text.length); }, 50);
    } catch (e) { voiceError(e); }
  }
  function voiceError(e) { closeVoice(); setState("error", String(e && e.message ? e.message : e)); setTimeout(() => { if (isl.dataset.state === "error") setState("idle"); }, 3000); }
  function closeVoice() { voiceMode = null; $("voice").classList.remove("show", "preview"); $("micBtn").classList.remove("rec"); eyes.setLevel(null); }
  function cancelVoice() { if (voiceMode === "rec") B.cancelRecording(); closeVoice(); setState("idle"); }
  $("micBtn").onclick = () => (voiceMode === "rec" ? stopVoice() : startVoice(false));
  $("vSend").onclick = () => { const t = $("vText").value; closeVoice(); send(t); };
  $("vCancel").onclick = cancelVoice;
  $("vRedo").onclick = () => { closeVoice(); startVoice(false); };
  $("vText").addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); $("vSend").click(); } });
  B.onPtt((s) => { if (s === "pressed") startVoice(true); else if (s === "released" && voiceFromPtt) stopVoice(); });
  B.onOpen(() => (expanded ? collapse(true) : (expand(), setTimeout(() => $("input").focus(), 200))));

  /* ---------- impostazioni ---------- */
  function seg(id, val, onPick) {
    const el = $(id);
    el.querySelectorAll("button").forEach((b) => { b.classList.toggle("on", b.dataset.v === val); b.onclick = () => { seg(id, b.dataset.v, onPick); onPick(b.dataset.v); }; });
    const sec = el.closest("section");
    sec.querySelectorAll("[data-show]").forEach((d) => (d.style.display = d.dataset.show === val ? "" : "none"));
  }
  function fillVoices() {
    const vs = Iris.tts.voices(), sel = $("sVoice");
    const it = vs.filter((v) => /^it/i.test(v.lang)), rest = vs.filter((v) => !/^it/i.test(v.lang));
    sel.innerHTML = `<option value="">Automatica (italiana)</option>` + [...it, ...rest].map((v) => `<option value="${esc(v.id)}">${esc(v.name)} · ${esc(v.lang)}</option>`).join("");
    sel.value = settings.tts.voice || "";
  }
  document.addEventListener("iris-voices", () => settings && fillVoices());
  async function refreshModel() {
    try {
      const m = await B.modelStatus();
      $("sModelState").textContent = m.downloaded ? `Scaricato${m.gpu ? " · " + m.gpu : ""}` : "Non ancora scaricato";
      $("sModelState").className = "res" + (m.downloaded ? " ok" : "");
      $("sModelDl").style.display = m.downloaded ? "none" : "";
    } catch (e) { $("sModelState").textContent = String(e); }
  }
  /* voce locale (Piper: sul processore, leggera) */
  let localState = { installed: false };
  async function refreshLocal() {
    try { localState = await B.localStatus(); } catch (e) { localState = { installed: false }; }
    $("lNotInstalled").style.display = localState.installed || localState.installing ? "none" : "";
    $("lInstalled").style.display = localState.installed ? "" : "none";
    $("lProgress").classList.toggle("show", !!localState.installing);
    // i 5 GB della vecchia voce Qwen3-TTS, se sono ancora sul disco
    const old = $("lOld");
    if (localState.old_qwen_mb > 50) {
      old.innerHTML = `<b>C'è ancora la vecchia voce locale</b> (Qwen3-TTS): occupa ${(localState.old_qwen_mb / 1024).toFixed(1)} GB e non serve più.<div class="row2"><button class="btn ok" data-y>Elimina</button><button class="btn" data-n>Non ora</button></div>`;
      old.classList.add("show");
      old.querySelector("[data-y]").onclick = async () => { old.innerHTML = "Elimino…"; try { await B.localRemoveOld(); old.classList.remove("show"); } catch (e) { old.textContent = String(e); } };
      old.querySelector("[data-n]").onclick = () => old.classList.remove("show");
    } else old.classList.remove("show");
    if (localState.installed) {
      const vs = await B.localVoices();
      $("lVoice").innerHTML = vs.map((v) => `<option value="${esc(v.id)}">${esc(v.name)}${v.downloaded ? "" : ` · da scaricare (${v.mb} MB)`}</option>`).join("");
      const cur = vs.find((v) => v.id === settings.tts.localVoice && v.downloaded) || vs.find((v) => v.downloaded) || vs[0];
      $("lVoice").value = cur ? cur.id : "";
      $("lVoice").onchange = () => {
        const v = vs.find((x) => x.id === $("lVoice").value);
        if (v && !v.downloaded) askConfirm(`<b>Scarico la voce ${esc(v.name.split(" ")[0])}?</b><ul><li>Dimensione: ${v.mb} MB</li></ul>`, () => installLocal(v.id), () => ($("lVoice").value = cur.id));
        else if (v) settings.tts.localVoice = v.id;
      };
      showSpeed();
    }
  }
  // quanto è veloce la voce sul PC: se il calcolo è più lungo dell'audio, la lettura va a singhiozzo
  async function showSpeed() {
    const el = $("lSpeed"); el.textContent = "";
    if (!B.localHealth) return;
    try {
      const h = await B.localHealth();
      const f = h && h.ultima_frase;
      if (!f || !f.audio_s) { el.textContent = h && h.running ? "Voce caricata e pronta." : "Si accende alla prima frase."; return; }
      const k = f.audio_s / Math.max(0.01, f.calcolo_s);
      el.textContent = `Ultima frase: ${f.calcolo_s.toFixed(2)} s di calcolo per ${f.audio_s.toFixed(1)} s di voce (${k >= 1 ? k.toFixed(0) + "× più veloce del parlato" : "più lenta del parlato: andrà a singhiozzo"})`;
    } catch (e) {}
  }
  document.querySelectorAll(".try").forEach((b) => b.addEventListener("click", () => setTimeout(showSpeed, 4000)));
  function askConfirm(html, onYes, onNo) {
    const c = $("lConfirm"); c.innerHTML = html + `<div class="row2"><button class="btn ok" data-y>Scarica</button><button class="btn" data-n>Annulla</button></div>`;
    c.classList.add("show");
    c.querySelector("[data-y]").onclick = () => { c.classList.remove("show"); onYes(); };
    c.querySelector("[data-n]").onclick = () => { c.classList.remove("show"); onNo && onNo(); };
  }
  async function installLocal(voice) {
    $("lNotInstalled").style.display = "none"; $("lProgress").classList.add("show"); $("lProg").style.width = "0";
    try { await B.localInstall(voice); settings.tts.localVoice = voice; $("lMsg").className = "res ok"; }
    catch (e) { $("lMsg").className = "res err"; $("lMsg").textContent = String(e); if (!localState.installed) $("lNotInstalled").style.display = ""; return; }
    setTimeout(() => $("lProgress").classList.remove("show"), 1500);
    await refreshLocal();
  }
  B.onLocalInstall((p) => { $("lMsg").className = "res"; $("lMsg").textContent = p.msg || ""; if (p.frac != null) $("lProg").style.width = Math.round(p.frac * 100) + "%"; });
  $("lInstall").onclick = () => askConfirm(
    `<b>Scarico la voce locale?</b><ul><li>Dimensione: circa 85 MB (programma Piper 22 MB + voce Paola 61 MB)</li><li>Gira sul processore: va bene anche su PC poco potenti, niente scheda video</li><li>Si installa nella cartella dell'app, non tocca il resto del PC</li></ul>`,
    () => installLocal("paola"));

  function openSettings() {
    const s = settings;
    setSnap = JSON.parse(JSON.stringify(settings)); markDirty(false); // per "Annulla": com'era all'apertura
    $("sZoom").value = String(zoom());
    const vol = Math.round((s.tts.volume != null ? s.tts.volume : 1) * 100); $("sVol").value = vol; $("sVolVal").textContent = vol + "%";
    $("sUrl").value = s.hermesUrl || ""; $("sKey").value = ""; $("sKey").placeholder = s.hasHermesKey ? "•••••••• salvata (scrivi per cambiarla)" : "incolla la chiave";
    seg("sSttMode", s.stt.mode, (v) => (s.stt.mode = v));
    $("sModel").value = s.stt.model; $("sUnload").value = String(s.stt.unloadMinutes);
    $("sSttType").value = s.stt.serverType; $("sSttUrl").value = s.stt.serverUrl || ""; $("sSttKey").value = ""; $("sSttKey").placeholder = s.stt.hasServerKey ? "•••••••• salvata" : "";
    $("sNoPreview").checked = !!s.stt.sendWithoutPreview;
    $("sTtsAuto").checked = !!s.tts.auto; $("sChime").checked = !!s.tts.chime;
    seg("sTtsEngine", s.tts.engine, (v) => { s.tts.engine = v; if (v === "local") refreshLocal(); });
    $("lUnload").value = String(s.tts.unloadMinutes != null ? s.tts.unloadMinutes : 10);
    if (s.tts.engine === "local") refreshLocal();
    fillVoices();
    $("sTtsUrl").value = s.tts.serverUrl || ""; $("sTtsVoice").value = s.tts.serverVoice || ""; $("sTtsKey").value = ""; $("sTtsKey").placeholder = s.tts.hasServerKey ? "•••••••• salvata" : "";
    $("sRate").value = s.tts.rate || 1;
    $("sPtt").value = s.shortcuts.ptt; $("sOpen").value = s.shortcuts.open;
    $("sAutostart").checked = !!s.autostart; $("sDebug").checked = !!s.debug;
    $("sTtsRes").textContent = ""; $("sLog").classList.remove("show");
    $("sOpenWhen").value = s.island.open === "click" ? "click" : String(s.island.openDelay != null ? s.island.openDelay : 1000);
    if (!$("sOpenWhen").value) $("sOpenWhen").value = "1000";
    $("sCloseAfter").value = String(s.island.closeDelay || 1500); if (!$("sCloseAfter").value) $("sCloseAfter").value = "1500";
    $("sFollow").checked = !!s.island.follow;
    { const [d, m] = (s.island.birthday || "").split("/"); $("sBDay").value = d ? String(+d) : ""; $("sBMonth").value = m ? String(+m) : ""; }
    $("sBorder").value = border(); $("sBorderVal").textContent = border() + " px";
    $("sShowArea").checked = isl.classList.contains("show-area");
    $("sTestRes").textContent = ""; refreshModel();
    $("settings").classList.add("show");
  }
  function readSettings() {
    const s = settings;
    s.hermesUrl = $("sUrl").value.trim().replace(/\/+$/, "");
    s.stt.model = $("sModel").value; s.stt.unloadMinutes = +$("sUnload").value;
    s.stt.serverType = $("sSttType").value; s.stt.serverUrl = $("sSttUrl").value.trim().replace(/\/+$/, "");
    s.stt.sendWithoutPreview = $("sNoPreview").checked;
    s.tts.auto = $("sTtsAuto").checked; s.tts.chime = $("sChime").checked; s.tts.voice = $("sVoice").value;
    s.tts.serverUrl = $("sTtsUrl").value.trim().replace(/\/+$/, ""); s.tts.serverVoice = $("sTtsVoice").value.trim(); s.tts.rate = +$("sRate").value;
    if ($("lVoice").value) s.tts.localVoice = $("lVoice").value;
    s.tts.unloadMinutes = +$("lUnload").value;
    s.shortcuts.ptt = $("sPtt").value.trim() || "Ctrl+Alt+Space"; s.shortcuts.open = $("sOpen").value.trim() || "Ctrl+Alt+I";
    s.autostart = $("sAutostart").checked; s.debug = $("sDebug").checked;
    s.island.follow = $("sFollow").checked; if (!s.island.follow) eyes.lookAt(null);
    const ow = $("sOpenWhen").value; s.island.open = ow === "click" ? "click" : "hover"; if (ow !== "click") s.island.openDelay = +ow;
    s.island.closeDelay = +$("sCloseAfter").value;
    const bd = $("sBDay").value, bm = $("sBMonth").value;
    s.island.birthday = bd && bm ? `${bd.padStart(2, "0")}/${bm.padStart(2, "0")}` : "";
    Iris.birthday = s.island.birthday;
    const secrets = {};
    if ($("sKey").value) secrets.hermesKey = $("sKey").value;
    if ($("sSttKey").value) secrets.sttKey = $("sSttKey").value;
    if ($("sTtsKey").value) secrets.ttsKey = $("sTtsKey").value;
    return secrets;
  }
  // compleanno: giorno e mese scelti da due tendine
  $("sBDay").innerHTML = `<option value="">giorno</option>` + Array.from({ length: 31 }, (_, i) => `<option value="${i + 1}">${i + 1}</option>`).join("");
  $("sBMonth").innerHTML = `<option value="">mese</option>` + ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"].map((n, i) => `<option value="${i + 1}">${n}</option>`).join("");
  // "?": la spiegazione compare al passaggio del mouse (e il clic non accende l'interruttore)
  const tip = document.createElement("div"); tip.className = "tip"; document.body.appendChild(tip);
  document.addEventListener("mouseover", (e) => {
    const q = e.target.closest && e.target.closest("[data-tip]");
    if (!q) { tip.classList.remove("show"); return; }
    tip.textContent = q.dataset.tip; tip.classList.add("show");
    const r = q.getBoundingClientRect(), box = $("settings").getBoundingClientRect(), w = tip.offsetWidth, h = tip.offsetHeight;
    const x = Math.min(Math.max(box.left + 8, r.left + r.width / 2 - w / 2), box.right - w - 8);
    tip.style.left = x + "px"; tip.style.top = (r.top - h - 6 < box.top + 4 ? r.bottom + 6 : r.top - h - 6) + "px";
  });
  document.addEventListener("click", (e) => { if (e.target.closest && e.target.closest(".q")) e.preventDefault(); }, true);
  // impostazioni: le modifiche valgono solo con Salva. Con modifiche in sospeso l'isola non si richiude da sola;
  // freccia indietro, Annulla, Esc o di nuovo l'icona delle impostazioni le scartano e chiudono.
  let setSnap = null; var setDirty = false;
  function markDirty(v) { setDirty = !!v; document.querySelector(".set-f").classList.toggle("dirty", setDirty); }
  function closeSettings() {
    if (!$("settings").classList.contains("show")) return;
    if (setDirty && setSnap) {
      const zPrima = zoom();
      settings = JSON.parse(JSON.stringify(setSnap)); // si torna a com'era: anche bordo, volume e dimensione, cambiati dal vivo
      if (zoom() !== zPrima) { applyZoom(); scr = Iris.isTauri ? zs(scr) : pageScreen(); }
      Iris.tts.setVolume(settings.tts.volume != null ? settings.tts.volume : 1);
      place(false); renderTtsBtn();
    }
    markDirty(false);
    $("settings").classList.remove("show"); tip.classList.remove("show");
  }
  $("settings").addEventListener("input", (e) => { if (e.target.closest(".set-body") && e.target.matches("input,select,textarea")) markDirty(true); });
  $("settings").addEventListener("change", (e) => { if (e.target.closest(".set-body") && e.target.matches("input,select,textarea")) markDirty(true); });
  $("settings").addEventListener("click", (e) => { if (e.target.closest(".set-body .seg button")) markDirty(true); });
  $("sUndo").onclick = closeSettings;
  // dopo un salvataggio (Salva, Test, Prova voce) non c'è più niente da annullare
  function saved() { setSnap = JSON.parse(JSON.stringify(settings)); markDirty(false); Iris.tts.setVolume(settings.tts.volume != null ? settings.tts.volume : 1); }
  $("setBtn").onclick = () => ($("settings").classList.contains("show") ? closeSettings() : openSettings());
  // il bordo si vede cambiare subito sulla tacca (si salva lasciando il cursore)
  // Dimensione: si vede subito; la posizione salvata (in px dell'app) si converte, così l'isola resta dov'era
  function setZoom(nz) {
    const oz = zoom(); if (nz === oz) return;
    if (I().x != null) I().x = I().x * oz / nz;
    if (I().y != null) I().y = I().y * oz / nz;
    settings.island.zoom = nz; applyZoom();
    scr = Iris.isTauri ? zs(scr) : pageScreen(); place(false);
  }
  $("sZoom").onchange = () => setZoom(+$("sZoom").value);
  $("sVol").oninput = () => { settings.tts.volume = +$("sVol").value / 100; $("sVolVal").textContent = $("sVol").value + "%"; Iris.tts.setVolume(settings.tts.volume); };
  $("sVol").onchange = () => Iris.tts.chime("reply");
  $("sBorder").oninput = () => { settings.island.border = +$("sBorder").value; $("sBorderVal").textContent = settings.island.border + " px"; place(false); };
  $("sShowArea").onchange = () => isl.classList.toggle("show-area", $("sShowArea").checked);
  $("sIslCenter").onclick = async () => { Object.assign(settings.island, { mode: "top", x: null, y: null, screen: "" }); scr = Iris.isTauri ? zs(await B.screenInfo(null).catch(() => scr)) : scr; place(false); B.saveIsland(settings.island).catch(() => {}); };
  $("setBack").onclick = closeSettings;
  $("sSave").onclick = async () => {
    const secrets = readSettings();
    try { await B.saveSettings(settings, secrets); settings = await B.getSettings(); saved(); Iris.birthday = settings.island.birthday || ""; renderTtsBtn(); B.saveIsland(settings.island).catch(() => {}); flash($("sSave").lastChild, "Salvato"); $("sKey").value = ""; checkHealth(); }
    catch (e) { $("sTestRes").textContent = String(e); $("sTestRes").className = "res err"; }
  };
  $("sTest").onclick = async () => {
    const r = $("sTestRes"); r.className = "res"; r.textContent = "Provo…";
    const secrets = readSettings(); await B.saveSettings(settings, secrets); settings = await B.getSettings(); saved();
    try {
      const t = await B.testHermes();
      if (!t.ok) throw new Error(t.error || "non risponde");
      const miss = ["runs", "run_approval", "sessions"].filter((k) => !t.features[k]);
      r.className = "res " + (miss.length ? "err" : "ok");
      r.textContent = miss.length ? `Raggiungibile, ma mancano: ${miss.join(", ")} (Hermes da aggiornare)` : `Collegata${t.version ? " · Hermes " + t.version : ""}`;
    } catch (e) { r.className = "res err"; r.textContent = String(e.message || e); }
  };
  $("sModelDl").onclick = async () => { $("sModelDl").disabled = true; document.querySelector(".bar-p").classList.add("show"); try { await B.downloadModel(); } catch (e) { $("sModelState").textContent = String(e); } $("sModelDl").disabled = false; document.querySelector(".bar-p").classList.remove("show"); refreshModel(); };
  B.onModelProgress((p) => ($("sModelProg").style.width = Math.round(p * 100) + "%"));
  document.querySelectorAll(".try").forEach((b) => (b.onclick = tryVoice));
  async function tryVoice() {
    const sec = readSettings(); await B.saveSettings(settings, sec); saved();
    $("sTtsRes").className = "res"; $("sTtsRes").textContent = settings.tts.engine === "local" ? "Preparo la voce… (la prima volta ci vuole un po')" : "";
    dlog(`prova voce: motore ${settings.tts.engine}`);
    Iris.tts.speak("Ciao, sono Iris. Così suona la mia voce.", settings.tts, "try", () => { if ($("sTtsRes").className === "res") $("sTtsRes").textContent = ""; });
  }
  $("sLogOpen").onclick = () => B.openLogs && B.openLogs().catch((e) => { $("sLog").textContent = String(e); $("sLog").classList.add("show"); });
  $("sLogShow").onclick = async () => {
    const box = $("sLog");
    if (box.classList.toggle("show")) {
      try { const t = await B.logTail(); box.textContent = `— Iris (${t.dir}\\iris.log) —\n${t.iris || "vuoto"}\n\n— Voce locale (voce-locale.log) —\n${t.voce || "vuoto"}`; box.scrollTop = box.scrollHeight; }
      catch (e) { box.textContent = String(e); }
    }
  };

  /* ---------- versione nuova su GitHub? solo un avviso, si scarica e si installa a mano ---------- */
  let update = null;
  async function checkUpdate() {
    if (!B.checkUpdate) return;
    try { update = await B.checkUpdate(); } catch (e) { return; }
    const on = !!update.available;
    $("updDot").classList.toggle("show", on); $("upd").classList.toggle("show", on);
    if (on) $("updTxt").textContent = `C'è una versione nuova su GitHub: ${update.latest}`;
  }
  $("updOpen").onclick = () => update && update.url && B.openLink(update.url);
  // Informazioni: versione e collegamenti al repository (licenza, privacy, crediti, codice)
  let info = null;
  (async () => {
    try { info = B.appInfo ? await B.appInfo() : null; } catch (e) {}
    if (info) { $("aboutVer").textContent = info.version; $("verTxt").textContent = "versione " + info.version; }
    document.querySelectorAll("[data-link]").forEach((b) => (b.onclick = () => info && B.openLink(info.repo + b.dataset.link)));
  })();

  /* ---------- Hermes raggiungibile? ---------- */
  async function checkHealth() {
    let ok = false; try { ok = await B.ping(); } catch (e) { ok = false; }
    if (!ok && reachable) { reachable = false; if (!run && !voiceMode) setState("sleep"); }
    else if (ok && !reachable) { reachable = true; if (isl.dataset.state === "sleep") { setState("idle"); eyes.setState("hello"); setTimeout(() => eyes.state === "hello" && eyes.setState("idle"), 2400); } }
  }

  /* ---------- avvio ---------- */
  (async function init() {
    settings = await B.getSettings();
    if (!settings.island) settings.island = { mode: "top", x: null, y: null, screen: "", open: "hover", openDelay: 1000, closeDelay: 1500, follow: true, birthday: "", border: 6 };
    Iris.birthday = settings.island.birthday || "";
    mineIds = new Set(settings.islandSessions || []); pinIds = new Set(settings.pinnedLocal || []);
    await readScreen();
    renderTtsBtn();
    setState("idle");
    await place(false); autoGrow();
    eyes.setState("hello"); setTimeout(() => eyes.state === "hello" && eyes.setState("idle"), 2400);
    // nei giorni speciali (Natale, Halloween, compleanno…) saluta con l'easter egg di stagione
    const sea = Iris.seasonalEggs(new Date());
    if (sea.length) setTimeout(() => { if (eyes.state === "idle" && !expanded) eyes.playEgg(sea[0]); }, 4000);
    Iris.tts.setVolume(settings.tts.volume != null ? settings.tts.volume : 1);
    caricaAnimazioni();
    sorpresa((3 + Math.random() * 7) * 60000); // il primo easter egg a sorpresa tra 3 e 10 minuti
    setInterval(() => { if (!expanded && !drag) readScreen().then(() => place(false)); }, 15000);
    setTimeout(() => warmVoice(true), 3000);
    checkUpdate(); setInterval(checkUpdate, 6 * 3600 * 1000);
    checkHealth(); setInterval(checkHealth, 15000);
    if (!settings.hermesUrl || !settings.hasHermesKey) { expand(); openSettings(); }
  })();

  /* ---------- animazioni personali (cartella "animazioni", file .json) ---------- */
  let mie = [];
  async function caricaAnimazioni() {
    if (!B.listAnimations) return;
    let r; try { r = await B.listAnimations(); } catch (e) { return; }
    mie = []; let errori = 0;
    for (const f of r.files || []) {
      try {
        if (f.error) throw new Error(f.error);
        mie.push(Iris.registerEgg(f.id, JSON.parse(f.text)));
      } catch (e) { errori++; if (B.log) B.log("errore", `animazione ${f.id}.json: ${e.message || e}`); }
    }
    $("aCount").textContent = `${mie.length} caricate` + (errori ? ` · ${errori} con errori (vedi Ultimi errori)` : "");
    $("aCount").className = "res" + (errori ? " err" : mie.length ? " ok" : "");
  }
  $("aOpen").onclick = () => B.openAnimations && B.openAnimations().catch(() => {});
  $("aReload").onclick = caricaAnimazioni;
  $("aTry").onclick = () => {
    if (!mie.length) return ($("aCount").textContent = "Nessuna animazione nella cartella");
    let i = 0; const una = () => { if (i >= mie.length) return; const id = mie[i++]; eyes.playEgg(id); setTimeout(una, Iris.EGGS[id].dur + 800); }; una();
  };

  /* ---------- easter egg a sorpresa ----------
     Un timer casuale: il prossimo arriva tra 5 e 40 minuti, ogni volta diverso (a volte dopo poco, a volte dopo
     mezz'ora e più). Parte solo se l'isola è chiusa e ferma; se in quel momento è occupata, riprova dopo 30 secondi. */
  let lastEgg = null;
  function sorpresa(ms) {
    setTimeout(() => {
      const libera = !expanded && !drag && eyes.state === "idle" && !eyes.egg && !document.hidden;
      if (!libera) return sorpresa(30000);
      lastEgg = Iris.pickEgg(lastEgg);
      dlog(`easter egg a sorpresa: ${lastEgg}`);
      eyes.playEgg(lastEgg);
      sorpresa((5 + Math.random() * 35) * 60000);
    }, ms);
  }

  /* ---------- solo demo nel browser ---------- */
  if (!Iris.isTauri) {
    document.body.classList.add("demo");
    const bar = $("demoBar");
    bar.innerHTML = `<b>Demo</b>
      <button id="dOpen">Apri / chiudi</button>
      <button id="dPtt">Tieni premuto: parla</button>
      <button id="dAsk">Chiedi il meteo</button>
      <button id="dBudget">Azione con via libera</button>
      <button id="dSleep">Hermes irraggiungibile</button>
      <button id="dEgg">Easter egg</button>
      <button id="dSet">Impostazioni</button>`;
    $("dOpen").onclick = () => (expanded ? collapse(true) : expand());
    $("dPtt").onmousedown = () => Iris.mock._ptt(true);
    $("dPtt").onmouseup = $("dPtt").onmouseleave = () => voiceFromPtt && voiceMode === "rec" && Iris.mock._ptt(false);
    $("dAsk").onclick = () => { expand(); setTimeout(() => send("Che tempo fa domani a Roma?"), 300); };
    $("dBudget").onclick = () => { expand(); setTimeout(() => send("Segna nel budget la bolletta della luce"), 300); };
    $("dSleep").onclick = () => { reachable ? ((reachable = false), setState("sleep")) : ((reachable = true), setState("idle")); };
    let eggN = 0; const eggs = Object.keys(Iris.EGGS).filter((k) => !["solletico", "giramento"].includes(k));
    $("dEgg").onclick = () => { collapse(true); eyes.playEgg(eggs[eggN++ % eggs.length]); };
    $("dSet").onclick = () => { expand(); setTimeout(openSettings, 250); };
  }
})();
