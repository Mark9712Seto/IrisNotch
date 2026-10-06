/* Testo -> voce e suoni.
   Motori:
   - "system": voci di Windows tramite speechSynthesis (in WebView2 ci sono le voci installate);
   - "local":  Piper sul PC (sul processore), gestito dal lato Rust (tts_local.rs);
   - "server": server compatibile OpenAI (/v1/audio/speech).
   Si legge frase per frase: la prima frase parte appena è completa, mentre Iris sta ancora scrivendo,
   e intanto si prepara la successiva. */
(function () {
  const Iris = (window.Iris = window.Iris || {});
  let ctx = null;
  let job = null; // lettura in corso

  function plain(md) {
    return md
      .replace(/```[\s\S]*?```/g, " (codice) ")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/\*\*([^*]+)\*\*/g, "$1").replace(/\*([^*]+)\*/g, "$1")
      .replace(/^#+\s*/gm, "").replace(/^\s*[-*]\s+/gm, "")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/https?:\/\/\S+/g, "link")
      .trim();
  }

  // divide in frasi complete; il resto (frase non ancora finita) torna indietro
  function cut(text, final) {
    const out = [];
    const re = /[^.!?;:\n]+[.!?;:\n]+(?=\s|$)/g;
    let m, last = 0;
    while ((m = re.exec(text))) { out.push(m[0]); last = re.lastIndex; }
    let rest = text.slice(last);
    if (final && rest.trim()) { out.push(rest); rest = ""; }
    // frasi troppo corte si uniscono alla successiva: suonano meglio e costano meno richieste
    const merged = [];
    for (const s of out.map((x) => x.trim()).filter(Boolean)) {
      if (merged.length && merged[merged.length - 1].length < 25) merged[merged.length - 1] += " " + s; else merged.push(s);
    }
    return { sentences: merged, rest };
  }

  function voices() {
    return (window.speechSynthesis ? speechSynthesis.getVoices() : []).map((v) => ({ id: v.voiceURI, name: v.name, lang: v.lang }));
  }

  // volume della voce e dei suoni (impostazioni → Testo → voce), da 0 a 1
  let volume = 1;
  function setVolume(v) { volume = Math.max(0, Math.min(1, Number(v) || 0)); }

  function chime(kind) {
    try {
      ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
      const notes = kind === "attention" ? [[880, 0], [660, 0.12], [880, 0.24]] : [[660, 0], [990, 0.11]];
      for (const [f, at] of notes) {
        const o = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime + at;
        o.type = "sine"; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, 0.12 * volume), t + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
        o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + 0.25);
      }
    } catch (e) { /* audio non disponibile */ }
  }

  /* ---------- motori ---------- */
  function sayWithSystem(text, cfg, j) {
    return new Promise((resolve) => {
      if (!window.speechSynthesis) return resolve();
      const u = new SpeechSynthesisUtterance(text);
      const vs = speechSynthesis.getVoices();
      const en = Iris.lang === "en";
      u.voice = vs.find((v) => v.voiceURI === cfg.voice) || vs.find((v) => (en ? /^en/i : /^it/i).test(v.lang)) || null;
      u.lang = (u.voice && u.voice.lang) || (en ? "en-US" : "it-IT");
      u.rate = cfg.rate || 1;
      u.volume = volume;
      u.onend = u.onerror = () => resolve();
      j.cancel = () => { speechSynthesis.cancel(); resolve(); };
      speechSynthesis.speak(u);
    });
  }
  async function synth(text) {
    const r = await Iris.backend.synthesize(text);
    return r && r.data ? `data:${r.mime};base64,${r.data}` : null;
  }
  function playUrl(url, j) {
    return new Promise((resolve) => {
      const a = new Audio(url);
      a.volume = volume;
      // la voce locale arriva a velocità normale: la velocità si regola qui, senza cambiare il tono
      if (j.cfg.engine === "local") { a.preservesPitch = true; a.playbackRate = j.cfg.rate || 1; }
      a.onended = a.onerror = () => resolve();
      j.cancel = () => { a.pause(); resolve(); };
      a.play().catch(() => resolve());
    });
  }

  /* ---------- coda di frasi ---------- */
  function newJob(id, cfg, onEnd) {
    const j = { id, cfg, queue: [], buffer: "", closed: false, stopped: false, running: false, cancel: null, onEnd, prefetch: null };
    return j;
  }
  async function pump(j) {
    if (j.running) return;
    j.running = true;
    const useAudio = (j.cfg.engine === "local" || j.cfg.engine === "server") && Iris.isTauri;
    while (!j.stopped) {
      if (!j.queue.length) {
        if (j.closed) break;
        await new Promise((r) => setTimeout(r, 60));
        continue;
      }
      const sentence = j.queue.shift();
      try {
        if (useAudio) {
          const url = await (j.prefetch && j.prefetch.text === sentence ? j.prefetch.p : synth(sentence));
          j.prefetch = j.queue.length ? { text: j.queue[0], p: synth(j.queue[0]) } : null; // prepara la prossima
          if (url && !j.stopped) await playUrl(url, j);
        } else {
          await sayWithSystem(sentence, j.cfg, j);
        }
      } catch (e) {
        console.warn("voce:", e);
        if (Iris.onVoiceError) Iris.onVoiceError(String(e));
        break;
      }
    }
    j.running = false;
    if (job === j) job = null;
    j.onEnd && j.onEnd();
  }

  function stop() {
    if (!job) return;
    const j = job; job = null;
    j.stopped = true; j.queue = [];
    if (j.cancel) j.cancel();
  }

  /** legge tutto il testo; onEnd alla fine o se viene interrotta */
  function speak(text, cfg, id, onEnd) {
    stop();
    const j = (job = newJob(id, cfg, onEnd));
    j.queue = cut(plain(text), true).sentences;
    j.closed = true;
    if (!j.queue.length) { job = null; return onEnd && onEnd(); }
    pump(j);
  }

  /** lettura mentre il testo arriva: push(testo completo finora), end(testo finale) */
  function stream(cfg, id, onEnd) {
    stop();
    const j = (job = newJob(id, cfg, onEnd));
    let taken = 0;
    return {
      push(full) {
        if (j.stopped) return;
        const { sentences } = cut(plain(full.slice(taken)), false);
        if (!sentences.length) return;
        // avanza solo fino alla fine dell'ultima frase completa nel testo originale
        const lastEnd = Math.max(full.lastIndexOf(". "), full.lastIndexOf("! "), full.lastIndexOf("? "), full.lastIndexOf("\n"), full.lastIndexOf(": "), full.lastIndexOf("; "));
        if (lastEnd + 1 <= taken) return;
        const chunk = full.slice(taken, lastEnd + 1);
        taken = lastEnd + 1;
        j.queue.push(...cut(plain(chunk), true).sentences);
        pump(j);
      },
      end(full) {
        if (j.stopped) return;
        const tail = full.slice(taken);
        j.queue.push(...cut(plain(tail), true).sentences);
        j.closed = true;
        pump(j);
      },
    };
  }

  Iris.tts = { speak, stream, stop, chime, setVolume, voices, plain, cut, speakingId: () => (job ? job.id : null) };
  if (window.speechSynthesis) speechSynthesis.onvoiceschanged = () => document.dispatchEvent(new Event("iris-voices"));
})();
