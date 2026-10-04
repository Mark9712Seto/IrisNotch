/* Due occhi: motore di espressioni.
   Ogni occhio = rettangolo arrotondato luminoso + palpebra sopra (inclinabile) + guancia sotto (curva),
   ritagliati sulla forma dell'occhio. Ogni stato è una combinazione di parametri; i passaggi sono interpolati.
   Tutto è mosso da JS via attributi SVG: le animazioni CSS su gruppi SVG fanno rasterizzare a Chromium. */
(function () {
  const Iris = (window.Iris = window.Iris || {});

  const COLOR = {
    idle: "#7cc4ff", listening: "#38bdf8", thinking: "#a78bfa", tool: "#f59e0b", replying: "#5eead4",
    approval: "#fb7185", done: "#4ade80", error: "#f87171", sleep: "#64748b", transcribing: "#38bdf8",
    hello: "#7cc4ff", wink: "#7cc4ff", love: "#f9a8d4", laugh: "#7cc4ff", surprised: "#7cc4ff",
    curious: "#7cc4ff", doubt: "#7cc4ff", focus: "#7cc4ff", shy: "#f9a8d4", sleepy: "#94a3b8",
    scared: "#c4b5fd", angry: "#f87171", sad: "#93c5fd", dizzy: "#c4b5fd",
  };
  Iris.EYE_COLOR = COLOR;
  const FACE = "#000";
  // w,h · rr arrotondamento · dx,dy sguardo · lt palpebra (0 aperta, 1 chiusa) · tilt (+ arrabbiata, - triste) · lb guancia (felice) · sc scala · op luminosità
  const BASE = { w: 15, h: 21, rr: 6, dx: 0, dy: 0, lt: 0, tilt: 0, lb: 0, sc: 1, op: 1 };
  const E = (o) => Object.assign({}, BASE, o);
  const rnd = (a, b) => a + Math.random() * (b - a);
  const f2 = (v) => v.toFixed(2);

  function target(st, t, ts, level) {
    const s = t / 1000;
    let L = E({}), R = E({}), body = { y: 0, sx: 1, sy: 1, x: 0, rot: 0 }, dots = 0, zz = 0, sweat = 0, waves = 0, lvl = 0;
    body.y = Math.sin(s * 1.7) * 0.8;
    switch (st) {
      case "idle": break;
      case "listening": {
        // ti ascolta: testa un po' inclinata verso di te, occhi attenti, onde del suono ai lati che seguono la voce
        lvl = level != null ? level : (Math.sin(s * 9) * 0.5 + 0.5) * (Math.sin(s * 2.3) * 0.5 + 0.5);
        const nod = Math.sin(s * 2.2) * 0.8;
        L = E({ h: 23, w: 16, dy: -1 + nod * 0.4, sc: 1 + lvl * 0.1 }); R = E({ h: 23, w: 16, dy: -1 + nod * 0.4, sc: 1 + lvl * 0.1 });
        body.rot = -5 + nod; waves = 1;
        if (ts < 350) { const k = Math.sin((ts / 350) * Math.PI); L.sc += k * 0.12; R.sc += k * 0.12; }
        break;
      }
      case "transcribing": L = E({ lt: 0.3, lb: 0.18, h: 18, w: 16 }); R = E({ lt: 0.3, lb: 0.18, h: 18, w: 16 }); dots = 1; break;
      case "thinking": { const fl = Math.sin(s * 0.8) > 0.6 ? -4 : 4; L = E({ h: 17, dx: fl, dy: -4, lb: 0.12 }); R = E({ h: 19, dx: fl, dy: -4, lb: 0.12 }); dots = 1; break; }
      case "tool": { const r = (s * 0.7) % 1, dx = r < 0.85 ? -5 + (r / 0.85) * 10 : 5 - ((r - 0.85) / 0.15) * 10; L = E({ w: 17, h: 13, dy: 3, dx, lt: 0.22 }); R = E({ w: 17, h: 13, dy: 3, dx, lt: 0.22 }); break; }
      case "replying": { const y = Math.abs(Math.sin(s * 7.5)) * Math.abs(Math.sin(s * 2.1 + 1)); L = E({ h: 19 + y * 3.5, dy: -y * 1.5 }); R = E({ h: 19 + y * 3.5, dy: -y * 1.5 }); body.y += -y * 1.4; break; }
      case "approval": {
        const ph = (t % 900) / 900, hop = Math.max(0, Math.sin(ph * Math.PI * 2)) * (ph < 0.5 ? 1 : 0);
        L = E({ w: 17, h: 23, rr: 8.5 }); R = E({ w: 17, h: 23, rr: 8.5 });
        body.y = -hop * 5; body.sx = 1 + 0.03 * (1 - hop); body.sy = 1 - 0.03 * (1 - hop);
        if (ts < 300) { const k = Math.sin((ts / 300) * Math.PI); L.sc += k * 0.25; R.sc += k * 0.25; }
        break;
      }
      case "done": { L = E({ lb: 0.55, dy: -1 }); R = E({ lb: 0.55, dy: -1 }); if (ts < 900) { const k = Math.abs(Math.sin((ts / 900) * Math.PI * 2)) * (1 - ts / 900); body.y -= k * 7; body.sy = 1 + k * 0.05; body.sx = 1 - k * 0.03; } break; }
      case "error": { L = E({ h: 4, w: 16, rr: 2 }); R = E({ h: 4, w: 16, rr: 2 }); if (ts < 1300) { const d = 1 - ts / 1300; body.x = Math.sin(ts / 35) * 4 * d; } sweat = 1; break; }
      case "sleep": { L = E({ lt: 0.86, op: 0.5 }); R = E({ lt: 0.86, op: 0.5 }); body.y = Math.sin(s) * 1.6; body.sy = 1 + Math.sin(s) * 0.015; zz = 1; if (Math.sin(s * 0.31) > 0.97) L.lt = 0.7; break; }
      case "hello": { const k = ts % 2400; if (k < 700) { L = E({ lb: 0.6 }); R = E({}); } else { L = E({ lb: 0.55 }); R = E({ lb: 0.55 }); } body.y -= Math.abs(Math.sin(ts / 220)) * 2 * (k < 1200 ? 1 : 0); break; }
      case "wink": L = E({ lb: 0.6, lt: 0.1 }); R = E({ sc: 1.05 }); body.rot = -3; break;
      case "love": L = E({ lb: 0.5, sc: 1.05 }); R = E({ lb: 0.5, sc: 1.05 }); body.y -= Math.abs(Math.sin(s * 4)) * 2; break;
      case "laugh": { const k = Math.abs(Math.sin(s * 9)); L = E({ lb: 0.6, lt: 0.05 }); R = E({ lb: 0.6, lt: 0.05 }); body.y -= k * 2.5; body.rot = Math.sin(s * 4.5) * 2; break; }
      case "surprised": L = E({ w: 18, h: 26, rr: 9 }); R = E({ w: 18, h: 26, rr: 9 }); if (ts < 250) body.y -= Math.sin((ts / 250) * Math.PI) * 5; break;
      case "curious": L = E({ h: 16, lt: 0.15, dx: 2 }); R = E({ h: 24, w: 17, dx: 2, dy: -1 }); body.rot = -6 + Math.sin(s * 1.3) * 1.5; break;
      case "doubt": L = E({ lt: 0.05 }); R = E({ lt: 0.32, tilt: -14, h: 19 }); L.dx = R.dx = Math.sin(s * 0.9) * 2.5; body.rot = 3; break;
      case "focus": L = E({ lt: 0.3, lb: 0.18, h: 18, w: 16 }); R = E({ lt: 0.3, lb: 0.18, h: 18, w: 16 }); break;
      case "shy": L = E({ dx: -5, dy: 3, lb: 0.3, sc: 0.92 }); R = E({ dx: -5, dy: 3, lb: 0.3, sc: 0.92 }); body.rot = 4; break;
      case "sleepy": { const n = Math.max(0, Math.sin(s * 0.9)); L = E({ lt: 0.5 + n * 0.25, op: 0.85 }); R = E({ lt: 0.5 + n * 0.25, op: 0.85 }); body.y = n * 2; body.rot = n * -3; break; }
      case "scared": { const sh = Math.sin(s * 40) * 0.6; L = E({ w: 12, h: 24, rr: 6, sc: 0.85, dx: sh }); R = E({ w: 12, h: 24, rr: 6, sc: 0.85, dx: sh }); sweat = 1; break; }
      case "angry": L = E({ lt: 0.38, tilt: 22, h: 19 }); R = E({ lt: 0.38, tilt: 22, h: 19 }); body.x = Math.sin(s * 30) * 0.4; break;
      case "sad": L = E({ lt: 0.3, tilt: -18, dy: 2, h: 19 }); R = E({ lt: 0.3, tilt: -18, dy: 2, h: 19 }); body.y += 1.5; break;
      case "dizzy": L = E({ sc: 0.9, dx: Math.cos(s * 6) * 3, dy: Math.sin(s * 6) * 3 }); R = E({ sc: 0.9, dx: -Math.cos(s * 6) * 3, dy: -Math.sin(s * 6) * 3 }); body.rot = Math.sin(s * 3) * 5; break;
    }
    return { L, R, body, dots, zz, sweat, waves, lvl };
  }

  // piccoli gesti spontanei a riposo
  const GESTURES = {
    glance: { dur: 1400, w: 5, f: (k, T, g) => { const d = k < 0.15 ? k / 0.15 : k > 0.85 ? (1 - k) / 0.15 : 1; for (const e of [T.L, T.R]) { e.dx += g.dir * 5.5 * d; e.dy += g.dy * d; } } },
    smile: { dur: 1500, w: 2, f: (k, T) => { const d = Math.sin(k * Math.PI); T.L.lb += 0.5 * d; T.R.lb += 0.5 * d; } },
    yawn: { dur: 2600, w: 0.3, f: (k, T) => { const a = k < 0.45 ? Math.sin((k / 0.45) * Math.PI / 2) : 1 - (k - 0.45) / 0.55, d = Math.max(0, a); T.L.h += 6 * d; T.R.h += 6 * d; T.L.lt += 0.55 * d; T.R.lt += 0.55 * d; T.body.sy += 0.03 * d; } },
    squint: { dur: 1200, w: 1.5, f: (k, T) => { const d = Math.sin(k * Math.PI); T.L.lt += 0.35 * d; T.R.lt += 0.35 * d; T.L.lb += 0.15 * d; T.R.lb += 0.15 * d; } },
    lookUser: { dur: 1600, w: 2, f: (k, T) => { const d = Math.sin(k * Math.PI); T.L.sc += 0.07 * d; T.R.sc += 0.07 * d; for (const e of [T.L, T.R]) { e.dx *= 1 - d; e.dy *= 1 - d; } } },
    wiggle: { dur: 900, w: 1, f: (k, T) => { T.body.rot += Math.sin(k * Math.PI * 4) * 4 * (1 - k); } },
  };

  /* ---------- easter egg: ogni tanto, quando si annoia ---------- */
  // pong: gli occhi diventano racchette ai lati e giocano da soli con una pallina
  // scanner: un solo occhio stretto che scorre avanti e indietro
  // musica: gli occhi saltano come le barre di un equalizzatore
  const EGGS = {
    pong: { dur: 11000, color: null },
    scanner: { dur: 6000, color: "#f87171" },
    music: { dur: 6500, color: "#c4b5fd" },
  };

  /* ---------- easter egg nuovi (proposte del 03/10) ----------
     Ognuno: dur, color, auto (parte da solo quando si annoia), init (crea gli effetti),
     t (modifica gli occhi), draw (muove gli effetti). k = avanzamento 0..1, s = secondi, a = entrata/uscita morbida */
  const NS = "http://www.w3.org/2000/svg";
  const mk = (p, tag, at) => { const n = document.createElementNS(NS, tag); for (const k in at) n.setAttribute(k, at[k]); p.appendChild(n); return n; };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const CY = (o) => (o.island ? 61 : 71);
  // area visibile in cui giocano gli effetti: con island è tutta la tacca (132×36 px), non solo il riquadro degli occhi
  const BX = (o) => (o.island ? { l: -27, r: 147, t: 43, b: 79 } : { l: 18, r: 102, t: 42, b: 96 });
  const W = (o) => { const b = BX(o); return (b.r - b.l) / 2; };
  // numeri pseudo-casuali ripetibili (stessa disposizione a ogni giro, niente colonne)
  const prand = (i, k = 0) => { const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); };
  const HEART = "M0 1.6 C-3 -0.6 -1.6 -3 0 -1.4 C1.6 -3 3 -0.6 0 1.6Z";
  Object.assign(EGGS, {
    // una mosca gira intorno, gli occhi la seguono; si posa sul naso e diventano strabici
    mosca: {
      dur: 9000, color: null, auto: true,
      init(o, g) { const f = mk(o.r.fx, "g", {}); g.w1 = mk(f, "ellipse", { cx: -1.3, cy: -1.3, rx: 1.7, ry: 1, fill: "#e2e8f0" }); g.w2 = mk(f, "ellipse", { cx: 1.3, cy: -1.3, rx: 1.7, ry: 1, fill: "#e2e8f0" }); mk(f, "circle", { r: 1.25, fill: "#94a3b8" }); g.f = f; g.p = { x: BX(o).r + 6, y: CY(o) - 14 }; },
      t(o, T, k, s, a, g) {
        const cy = CY(o); let tx, ty;
        if (k < 0.66) { tx = 60 + (W(o) - 14) * Math.sin(s * 1.3) * Math.cos(s * 0.45); ty = cy - 3 + (o.island ? 11 : 9) * Math.sin(s * 2.3); }
        else if (k < 0.86) { tx = 60; ty = cy + 1; } else { const q = (k - 0.86) / 0.14; tx = 60 + q * (W(o) + 20); ty = cy + 1 - q * 40; }
        g.p.x += (tx - g.p.x) * (k < 0.66 ? 0.25 : 0.12); g.p.y += (ty - g.p.y) * (k < 0.66 ? 0.25 : 0.12);
        for (const [e, cx] of [[T.L, 46], [T.R, 74]]) { e.dx = clamp((g.p.x - cx) * 0.22, -5, 5) * a; e.dy = clamp((g.p.y - cy) * 0.35, -4, 4) * a; }
        if (k > 0.7 && k < 0.88) { T.L.dx = 5.5; T.R.dx = -5.5; T.L.dy = T.R.dy = 2.5; T.L.sc = T.R.sc = 0.92; }
        if (k >= 0.88) { const d = 1 - (k - 0.88) / 0.12; T.body.rot = Math.sin(s * 14) * 3 * d; T.L.lt = T.R.lt = 0.3 * d; }
      },
      draw(o, t, k, s, a, g) { g.f.setAttribute("transform", `translate(${f2(g.p.x)} ${f2(g.p.y)})`); const fl = Math.abs(Math.sin(t / 18)); g.w1.setAttribute("ry", f2(0.3 + fl)); g.w2.setAttribute("ry", f2(0.3 + fl)); g.f.setAttribute("opacity", k > 0.97 ? "0" : "1"); },
    },
    // pac-man passa sotto gli occhi mangiando i puntini, con il fantasmino dietro
    pacman: {
      dur: 9000, color: null, auto: true,
      init(o, g) { const y = CY(o) + (o.island ? 12.5 : 15); g.y = y; const b = BX(o); g.x0 = b.l - 10; g.x1 = b.r + 26; g.dots = Array.from({ length: 11 }, (_, i) => b.l + 14 + i * (b.r - b.l - 28) / 10).map((x) => mk(o.r.fx, "circle", { cx: x, cy: y, r: 1, fill: "#fde68a" })); g.pac = mk(o.r.fx, "path", { fill: "#facc15" }); const gh = mk(o.r.fx, "g", {}); mk(gh, "path", { d: "M-3.6 4 V-0.4 A3.6 3.6 0 0 1 3.6 -0.4 V4 l-1.2 -1.2 -1.2 1.2 -1.2 -1.2 -1.2 1.2 -1.2 -1.2 -1.2 1.2Z", fill: "#f472b6" }); mk(gh, "circle", { cx: -1.3, cy: -0.4, r: 1, fill: "#fff" }); mk(gh, "circle", { cx: 1.5, cy: -0.4, r: 1, fill: "#fff" }); g.gh = gh; },
      px(k, g) { return g.x0 + clamp((k - 0.06) / 0.84, 0, 1) * (g.x1 - g.x0); },
      t(o, T, k, s, a, g) { const x = this.px(k, g); for (const [e, cx] of [[T.L, 46], [T.R, 74]]) { e.dx = clamp((x - cx) * 0.15, -5, 5) * a; e.dy = 1 * a; e.h = 21 - 6 * a; } if (k > 0.9) { T.L.lb = T.R.lb = 0.5; } },
      draw(o, t, k, s, a, g) {
        const x = this.px(k, g), y = g.y, r = 4.2, m = Math.abs(Math.sin(s * 14)) * 0.42 + 0.03;
        g.pac.setAttribute("d", `M${f2(x)} ${f2(y)} L${f2(x + r * Math.cos(m))} ${f2(y - r * Math.sin(m))} A${r} ${r} 0 1 0 ${f2(x + r * Math.cos(m))} ${f2(y + r * Math.sin(m))}Z`);
        g.dots.forEach((d) => d.setAttribute("opacity", +d.getAttribute("cx") > x ? "1" : "0"));
        g.gh.setAttribute("transform", `translate(${f2(x - 15)} ${f2(y - 0.5 + Math.sin(s * 9) * 0.6)})`);
      },
    },
    // nascondino: gli occhi scappano a destra, sbirciano da sinistra, poi "bu!"
    nascondino: {
      dur: 7000, color: null, auto: true,
      t(o, T, k) {
        const out = W(o) + 40, peek = W(o) + 16; // fuori del tutto / solo l'occhio più vicino al bordo
        let dx = 0, sc = 1;
        if (k < 0.32) dx = out; else if (k < 0.5) dx = -peek; else if (k < 0.62) dx = -out; else if (k < 0.7) { dx = 0; sc = 0.2; } else if (k < 0.82) sc = 1.25;
        for (const e of [T.L, T.R]) { e.dx = dx; e.sc = sc; }
        if (k >= 0.32 && k < 0.5) { T.R.lt = 0.25; T.L.lt = 0.25; T.R.dx += 2; T.body.rot = 4; }
        if (k >= 0.7 && k < 0.82) { T.L.w = T.R.w = 18; T.L.h = T.R.h = 25; T.L.rr = T.R.rr = 9; }
        if (k >= 0.82) { T.L.lb = T.R.lb = 0.6; T.body.y -= Math.abs(Math.sin(k * 60)) * 2; }
      },
    },
    // starnuto: "ah… ah…" e poi "etciù!"
    starnuto: {
      dur: 4200, color: null, auto: true,
      init(o, g) { g.drops = Array.from({ length: 7 }, () => mk(o.r.fx, "circle", { r: 0.9, fill: "#7dd3fc", opacity: 0 })); g.txt = mk(o.r.fx, "text", { x: o.island ? 92 : 74, y: o.island ? 52 : 46, "font-size": 6.5, "font-weight": 700, "font-family": "system-ui", fill: "currentColor", opacity: 0 }); g.txt.textContent = "etciù!"; },
      t(o, T, k, s) {
        if (k < 0.55) { const q = k / 0.55; for (const e of [T.L, T.R]) { e.lt = 0.1 + 0.5 * q; e.dy = -2 * q; e.dx += Math.sin(s * 30) * 0.3 * q; } T.body.y -= 3 * q; T.body.sy = 1 + 0.04 * q; }
        else if (k < 0.66) { for (const e of [T.L, T.R]) { e.lt = 1; e.sc = 0.9; } T.body.y += 4; T.body.sy = 0.94; }
        else { const d = 1 - (k - 0.66) / 0.34; T.L.lt = T.R.lt = 0.25 * d; T.body.rot = Math.sin(s * 10) * 2.5 * d; T.L.dx = 1.5 * Math.sin(s * 5) * d; T.R.dx = -1.5 * Math.sin(s * 5) * d; }
      },
      draw(o, t, k, s, a, g) {
        const p = (k - 0.55) / 0.3, cy = CY(o);
        g.drops.forEach((d, i) => { if (p <= 0 || p >= 1) return d.setAttribute("opacity", "0"); const an = (-30 + i * 35) * Math.PI / 180; d.setAttribute("cx", f2(60 + Math.cos(an) * p * (o.island ? 34 : 16))); d.setAttribute("cy", f2(cy + 8 + Math.sin(an) * p * 8 + p * p * 6)); d.setAttribute("opacity", f2(1 - p)); });
        g.txt.setAttribute("opacity", k > 0.55 && k < 0.85 ? "1" : "0");
      },
    },
    // discoteca: colori che cambiano, occhi che saltano a tempo, brillantini
    disco: {
      dur: 7000, color: null, auto: true,
      init(o, g) { const b = BX(o); g.st = Array.from({ length: 9 }, (_, i) => [b.l + 6 + prand(i) * (b.r - b.l - 12), b.t + 3 + prand(i, 1) * (b.b - b.t - 6)]).filter(([x, y]) => Math.abs(x - 60) > 26 || Math.abs(y - CY(o)) > 13).map(([x, y]) => mk(o.r.fxb, "path", { d: "M0 -2.4 L0.6 -0.6 2.4 0 0.6 0.6 0 2.4 -0.6 0.6 -2.4 0 -0.6 -0.6Z", transform: `translate(${x} ${y})`, fill: "#fff", opacity: 0 })); },
      t(o, T, k, s, a) { T.L.dy = -Math.abs(Math.sin(s * 6)) * 4 * a; T.R.dy = -Math.abs(Math.sin(s * 6 + 1.57)) * 4 * a; T.L.lb = T.R.lb = 0.35 * a; T.body.rot = Math.sin(s * 3) * 4 * a; },
      draw(o, t, k, s, a, g) { o.svg.style.transition = "none"; o.svg.style.color = `hsl(${Math.round((s * 140) % 360)} 90% 68%)`; g.st.forEach((p, i) => p.setAttribute("opacity", f2(Math.max(0, Math.sin(s * 5 + i * 1.7)) * a))); },
    },
    // stiracchiata: si allunga in alto, poi di lato, poi sorride
    stiracchiata: {
      dur: 4200, color: null, auto: true,
      t(o, T, k, s) {
        if (k < 0.3) { for (const e of [T.L, T.R]) { e.h = 28; e.w = 11; e.dy = -3; e.lt = 0.35; } T.body.sy = 1.05; }
        else if (k < 0.6) { for (const e of [T.L, T.R]) { e.w = 22; e.h = 9; e.rr = 4; e.lt = 0.2; } T.L.dx = -3; T.R.dx = 3; T.body.sx = 1.04; T.body.rot = Math.sin(s * 3) * 3; }
        else if (k < 0.72) { T.body.rot = Math.sin(s * 25) * 2; }
        else { T.L.lb = T.R.lb = 0.5; T.L.lt = T.R.lt = 0.1; }
      },
    },
    // matrix: pioggia di caratteri verdi dietro gli occhi
    matrix: {
      dur: 6500, color: "#4ade80", auto: true,
      init(o, g) { const b = BX(o), cols = Math.round((b.r - b.l) / 8.6); g.c = Array.from({ length: cols }, (_, i) => { const n = mk(o.r.fxb, "text", { x: b.l + 2 + i * 8.6, "font-size": 5.5, "font-family": "ui-monospace,monospace", fill: "currentColor", opacity: 0.4 }); n.textContent = "1"; return { n, sp: 12 + prand(i) * 12, off: prand(i, 2) * 50 }; }); g.next = 0; },
      t(o, T, k, s, a) { for (const e of [T.L, T.R]) { e.lt = 0.3 * a; e.lb = 0.15 * a; e.h = 18; } },
      draw(o, t, k, s, a, g) { const ch = "01アイウエカキ01"; g.c.forEach((c) => { const b = BX(o); c.n.setAttribute("y", f2(b.t + ((s * c.sp + c.off) % (b.b - b.t + 6)))); c.n.setAttribute("opacity", f2(0.4 * a)); }); if (t > g.next) { g.next = t + 140; const c = g.c[Math.floor(Math.random() * g.c.length)]; c.n.textContent = ch[Math.floor(Math.random() * ch.length)]; } },
    },
    // cuoricini che salgono
    cuori: {
      dur: 4500, color: "#f9a8d4", auto: true,
      init(o, g) { g.h = [0, 1, 2].map(() => mk(o.r.fx, "path", { d: HEART, fill: "#f9a8d4", opacity: 0 })); },
      t(o, T, k, s, a) { for (const e of [T.L, T.R]) { e.lb = 0.5 * a; e.sc = 1 + 0.06 * Math.abs(Math.sin(s * 5)) * a; } T.body.y -= Math.abs(Math.sin(s * 4)) * 1.5 * a; },
      draw(o, t, k, s, a, g) { g.h.forEach((h, i) => { const q = ((s - i * 0.6) % 1.8) / 1.8; if (s < i * 0.6 || k > 0.92) return h.setAttribute("opacity", "0"); h.setAttribute("transform", `translate(${f2(60 + Math.sin(q * 6 + i) * 4 + (i - 1) * (o.island ? 14 : 6))} ${f2(CY(o) + 2 - q * 22)}) scale(${f2(0.9 + q * 0.5)})`); h.setAttribute("opacity", f2(Math.sin(q * Math.PI))); }); },
    },
    /* --- stagionali: partono da soli nei giorni giusti --- */
    neve: {
      dur: 9000, color: "#bae6fd", auto: false, season: "natale",
      init(o, g) { const b = BX(o), n = o.island ? 34 : 14; g.f = Array.from({ length: n }, (_, i) => ({ n: mk(o.r.fxb, "circle", { r: 0.45 + prand(i, 3) * 0.75, fill: "#e0f2fe" }), x: b.l + prand(i) * (b.r - b.l), sp: 4 + prand(i, 1) * 6, off: prand(i, 2) * 60, ph: prand(i, 4) * 6 })); },
      t(o, T, k, s, a) { for (const e of [T.L, T.R]) { e.dy = -3 * a; e.lb = 0.35 * a; e.dx = Math.sin(s * 0.8) * 3 * a; } },
      draw(o, t, k, s, a, g) { const b = BX(o), h = b.b - b.t + 6; g.f.forEach((f) => { f.n.setAttribute("cx", f2(f.x + Math.sin(s * 0.9 + f.ph) * 2.5)); f.n.setAttribute("cy", f2(b.t - 3 + ((s * f.sp + f.off) % h))); f.n.setAttribute("opacity", f2(0.9 * a)); }); },
    },
    coriandoli: {
      dur: 6000, color: null, auto: false, season: "compleanno / capodanno",
      init(o, g) { const col = ["#f472b6", "#facc15", "#4ade80", "#60a5fa", "#c084fc", "#fb923c"]; const b = BX(o), n = o.island ? 40 : 18; g.c = Array.from({ length: n }, (_, i) => ({ n: mk(o.r.fx, "rect", { width: 1.8, height: 1.1, fill: col[i % col.length] }), x: b.l + prand(i) * (b.r - b.l), sp: 9 + prand(i, 1) * 9, off: prand(i, 2) * 50, r: prand(i, 3) * 360 })); },
      t(o, T, k, s, a) { for (const e of [T.L, T.R]) { e.lb = 0.6 * a; e.lt = 0.05; } T.body.y -= Math.abs(Math.sin(s * 8)) * 2 * a; T.body.rot = Math.sin(s * 4) * 2 * a; },
      draw(o, t, k, s, a, g) { const b = BX(o); g.c.forEach((c) => { const y = b.t - 3 + ((s * c.sp + c.off) % (b.b - b.t + 6)); c.n.setAttribute("transform", `translate(${f2(c.x + Math.sin(s * 2 + c.r) * 3)} ${f2(y)}) rotate(${f2(c.r + s * 200)})`); c.n.setAttribute("opacity", f2(a)); }); },
    },
    zucca: {
      dur: 6000, color: "#fb923c", auto: false, season: "halloween",
      t(o, T, k, s, a) { const fl = 0.8 + 0.2 * Math.sin(s * 23) * Math.sin(s * 7); for (const e of [T.L, T.R]) { e.tilt = 24 * a; e.lt = 0.32 * a; e.rr = 6 - 4 * a; e.w = 16; e.h = 19; e.op = fl; } T.body.y += Math.sin(s * 2) * 1; },
    },
    /* --- interattivi: partono quando li tocchi --- */
    solletico: { dur: 1900, color: null, auto: false, t(o, T, k, s) { for (const e of [T.L, T.R]) { e.lb = 0.6; e.lt = 0.05; } T.body.y -= Math.abs(Math.sin(s * 14)) * 2.5; T.body.rot = Math.sin(s * 9) * 3; } },
    giramento: { dur: 2800, color: "#c4b5fd", auto: false, t(o, T, k, s) { T.L.sc = T.R.sc = 0.9; T.L.dx = Math.cos(s * 7) * 3; T.L.dy = Math.sin(s * 7) * 3; T.R.dx = -Math.cos(s * 7) * 3; T.R.dy = -Math.sin(s * 7) * 3; T.body.rot = Math.sin(s * 3.5) * 5; } },
  });

  /* ---------- varianti degli stati di base (proposte del 03/10, sera) ----------
     Ogni stato può avere più versioni: la 0 è quella classica (target()), le altre la modificano.
     Una variante: { name, init(o, g) crea gli effetti nel gruppo vfx, t(o, T, ts, s, lvl, g) cambia gli occhi,
     draw(o, t, ts, s, lvl, g) muove gli effetti }. ts = ms dall'inizio dello stato, s = secondi assoluti. */
  const STAR = "M0 -2.6 L0.7 -0.7 2.6 0 0.7 0.7 0 2.6 -0.7 0.7 -2.6 0 -0.7 -0.7Z";
  const VARIANTS = {
    listening: [
      { name: "Classico", desc: "Testa inclinata verso di te e onde del suono ai lati." },
      { name: "Equalizzatore", desc: "Gli occhi si allungano e si accorciano con la tua voce, come le barre di un equalizzatore.",
        t(o, T, ts, s, lvl) { T.waves = 0; T.body.rot = 0; const a = lvl, b = Math.max(0, Math.sin(s * 9 + 1)) * lvl; T.L.h = 11 + a * 16; T.R.h = 11 + b * 16 + lvl * 4; T.L.dy = T.R.dy = 0; T.L.rr = T.R.rr = 5; } },
      { name: "Annuisce", desc: "Ti guarda contento e annuisce piano mentre parli.",
        t(o, T, ts, s, lvl) { T.waves = 0; T.body.rot = 0; const n = Math.sin(s * 3.2); T.body.y = n * 1.8; for (const e of [T.L, T.R]) { e.lb = 0.32; e.dy = n * 0.8; e.sc = 1 + lvl * 0.05; } } },
      { name: "Cerchi", desc: "Cerchi che si allargano dal centro, più forti quando parli più forte.",
        init(o, g) { g.c = [0, 1, 2].map(() => mk(o.r.vfx, "circle", { cx: 60, cy: CY(o), r: 4, fill: "none", stroke: "currentColor", "stroke-width": 1.2 })); },
        t(o, T, ts, s, lvl) { T.waves = 0; T.body.rot = 0; T.L.sc = T.R.sc = 1.04; },
        draw(o, t, ts, s, lvl, g) { g.c.forEach((c, i) => { const k = (s * 0.8 + i / 3) % 1; c.setAttribute("r", f2(8 + k * 40)); c.setAttribute("opacity", f2((1 - k) * (0.25 + lvl * 0.75))); }); } },
    ],
    thinking: [
      { name: "Classico", desc: "Guarda in alto, i tre puntini salgono a destra." },
      { name: "Giro", desc: "Gli occhi girano piano in tondo, come quando si cerca un'idea." },
      { name: "Scintilla", desc: "Guarda in alto a destra, dove brilla una scintilla: l'idea sta arrivando.",
        init(o, g) { g.st = mk(o.r.vfx, "path", { d: STAR, fill: "#fde68a" }); },
        t(o, T) { T.dots = 0; for (const e of [T.L, T.R]) { e.dx = 3; e.dy = -4; e.h = 18; e.lb = 0.1; } },
        draw(o, t, ts, s, lvl, g) { const p = 0.7 + Math.abs(Math.sin(s * 2.6)) * 0.6 + (Math.sin(s * 0.9) > 0.95 ? 0.6 : 0); g.st.setAttribute("transform", `translate(98 48) scale(${f2(p)}) rotate(${f2(s * 40)})`); } },
      { name: "Caricamento", desc: "Occhi concentrati e un cerchietto che gira, come il caricamento di un programma.",
        init(o, g) { g.a = mk(o.r.vfx, "circle", { cx: 0, cy: 0, r: 4.2, fill: "none", stroke: "currentColor", "stroke-width": 1.6, "stroke-linecap": "round", "stroke-dasharray": "14 13" }); },
        t(o, T) { T.dots = 0; for (const e of [T.L, T.R]) { e.lt = 0.3; e.lb = 0.15; e.h = 18; e.dx = -2; } },
        draw(o, t, ts, s, lvl, g) { g.a.setAttribute("transform", `translate(98 ${CY(o)}) rotate(${f2((s * 360) % 360)})`); } },
    ],
    tool: [
      { name: "Classico", desc: "Occhi stretti che scorrono da sinistra a destra, come chi legge." },
      { name: "Ingranaggio", desc: "Guarda un ingranaggio che gira accanto a lui.",
        init(o, g) { const gr = mk(o.r.vfx, "g", {}); mk(gr, "circle", { r: 3.4, fill: "currentColor" }); for (let i = 0; i < 8; i++) mk(gr, "rect", { x: -1, y: -5.4, width: 2, height: 2.6, rx: 0.5, fill: "currentColor", transform: `rotate(${i * 45})` }); mk(gr, "circle", { r: 1.3, fill: "#000" }); g.g = gr; },
        t(o, T) { for (const e of [T.L, T.R]) { e.dx = 4; e.lt = 0.22; e.h = 16; } },
        draw(o, t, ts, s, lvl, g) { g.g.setAttribute("transform", `translate(100 ${CY(o)}) rotate(${f2((s * 120) % 360)})`); } },
      { name: "Battitura", desc: "Guarda in basso e \"batte sui tasti\": una fila di tasti si accende sotto.",
        init(o, g) { g.k = Array.from({ length: 7 }, (_, i) => mk(o.r.vfx, "rect", { x: 39 + i * 6.4, y: 75, width: 4.6, height: 2.6, rx: 0.8, fill: "currentColor", opacity: 0.2 })); g.next = 0; },
        t(o, T, ts, s) { const f = Math.sin(s * 14) > 0; T.L.h = f ? 14 : 17; T.R.h = f ? 17 : 14; for (const e of [T.L, T.R]) { e.dy = -2; e.lt = 0.25; e.dx = 0; } },
        draw(o, t, ts, s, lvl, g) { if (t > g.next) { g.next = t + 90; g.k.forEach((k) => k.setAttribute("opacity", "0.2")); g.k[Math.floor(Math.random() * g.k.length)].setAttribute("opacity", "0.95"); } } },
    ],
    replying: [
      { name: "Classico", desc: "Gli occhi saltellano al ritmo delle parole." },
      { name: "Boccuccia", desc: "Compare una boccuccia sotto gli occhi che si apre e si chiude mentre parla.",
        init(o, g) { g.m = mk(o.r.vfx, "rect", { fill: "currentColor" }); },
        t(o, T) { for (const e of [T.L, T.R]) { e.h = 16; e.dy = -3; } T.body.y = 0; },
        draw(o, t, ts, s, lvl, g) { const v = Math.abs(Math.sin(s * 11)) * Math.abs(Math.sin(s * 3.1 + 1)), h = 1.2 + v * 5, w = 7 + v * 2; g.m.setAttribute("x", f2(60 - w / 2)); g.m.setAttribute("y", f2(72.5 - h / 2)); g.m.setAttribute("width", f2(w)); g.m.setAttribute("height", f2(h)); g.m.setAttribute("rx", f2(Math.min(h, w) / 2)); } },
      { name: "Onde verso di te", desc: "Occhi felici e onde che partono verso destra, come la voce che esce.",
        init(o, g) { g.w = [0, 1, 2].map(() => mk(o.r.vfx, "path", { d: "M0 -5 Q3.5 0 0 5", fill: "none", stroke: "currentColor", "stroke-width": 1.6, "stroke-linecap": "round" })); },
        t(o, T, ts, s) { const y = Math.abs(Math.sin(s * 7.5)); for (const e of [T.L, T.R]) { e.lb = 0.3; e.dy = -y; } },
        draw(o, t, ts, s, lvl, g) { g.w.forEach((w, i) => { const k = (s * 1.4 + i / 3) % 1; w.setAttribute("transform", `translate(${f2(86 + k * 40)} ${CY(o)}) scale(${f2(0.8 + k * 0.6)})`); w.setAttribute("opacity", f2(1 - k)); }); } },
    ],
    done: [
      { name: "Classico", desc: "Occhi felici e un saltello." },
      { name: "Spunta", desc: "Occhi felici e una spunta verde che si disegna accanto.",
        init(o, g) { g.c = mk(o.r.vfx, "path", { d: "M92 61 l4 4 l8 -9", fill: "none", stroke: "#4ade80", "stroke-width": 2.4, "stroke-linecap": "round", "stroke-linejoin": "round", "stroke-dasharray": 20, "stroke-dashoffset": 20 }); },
        t(o, T) { T.L.lb = T.R.lb = 0.55; },
        draw(o, t, ts, s, lvl, g) { g.c.setAttribute("stroke-dashoffset", f2(20 * (1 - clamp((ts - 150) / 500, 0, 1)))); } },
      { name: "Occhiolino", desc: "Fa l'occhiolino con un brillantino.",
        init(o, g) { g.st = mk(o.r.vfx, "path", { d: STAR, fill: "#fff" }); },
        t(o, T, ts) { T.L.lb = 0.62; T.L.lt = 0.1; T.R.sc = 1.06; T.body.rot = -3; },
        draw(o, t, ts, s, lvl, g) { const k = clamp((ts - 200) / 700, 0, 1), p = Math.sin(k * Math.PI); g.st.setAttribute("transform", `translate(86 50) scale(${f2(p * 1.2)}) rotate(${f2(ts / 6)})`); } },
    ],
    approval: [
      { name: "Classico", desc: "Occhi grandi che saltellano, bordo acceso: ti chiede il via libera." },
      { name: "Punto esclamativo", desc: "Occhi spalancati e un punto esclamativo che rimbalza accanto.",
        init(o, g) { const e = mk(o.r.vfx, "g", { fill: "currentColor" }); mk(e, "rect", { x: -1.2, y: -7, width: 2.4, height: 9, rx: 1.2 }); mk(e, "circle", { cx: 0, cy: 5.2, r: 1.4 }); g.e = e; },
        t(o, T) { T.body.y = 0; T.body.sx = T.body.sy = 1; for (const e of [T.L, T.R]) { e.w = 17; e.h = 23; e.rr = 8.5; } },
        draw(o, t, ts, s, lvl, g) { const h = Math.abs(Math.sin(s * 5)) * 3; g.e.setAttribute("transform", `translate(98 ${f2(CY(o) - h)}) rotate(${f2(Math.sin(s * 5) * 6)})`); } },
    ],
    error: [
      { name: "Classico", desc: "Occhi a lineetta, un brivido e una goccia di sudore." },
      { name: "Occhi a X", desc: "Gli occhi diventano due X, come nei fumetti.",
        init(o, g) { g.x = [46, 74].map((x) => mk(o.r.vfx, "path", { d: `M${x - 4.5} ${CY(o) - 4.5} l9 9 M${x + 4.5} ${CY(o) - 4.5} l-9 9`, stroke: "currentColor", "stroke-width": 2.6, "stroke-linecap": "round" })); },
        t(o, T) { T.L.op = T.R.op = 0; T.sweat = 0; },
        draw(o, t, ts, s, lvl, g) { const d = Math.max(0, 1 - ts / 900), x = Math.sin(ts / 35) * 3 * d; g.x.forEach((p) => p.setAttribute("transform", `translate(${f2(x)} 0)`)); } },
    ],
    sleep: [
      { name: "Classico", desc: "Palpebre giù e tre zeta che salgono." },
      { name: "Bolla dal naso", desc: "Dorme profondo con la bolla che si gonfia e si sgonfia, come nei cartoni.",
        init(o, g) { g.b = mk(o.r.vfx, "circle", { cx: 66, cy: CY(o) + 9, r: 1, fill: "rgba(186,230,253,.25)", stroke: "#bae6fd", "stroke-width": 0.8 }); },
        t(o, T) { T.zz = 0; },
        draw(o, t, ts, s, lvl, g) { const k = (Math.sin(s * 1.1) + 1) / 2, r = 1 + k * 5; g.b.setAttribute("r", f2(r)); g.b.setAttribute("cx", f2(64 + r * 0.6)); g.b.setAttribute("opacity", Math.sin(s * 0.37) > 0.97 ? "0" : "1"); } },
    ],
  };
  // "Giro" del pensiero: cambia solo lo sguardo
  VARIANTS.thinking[1].t = (o, T, ts, s) => { for (const e of [T.L, T.R]) { e.dx = Math.cos(s * 1.8) * 4.5; e.dy = Math.sin(s * 1.8) * 3 - 1.5; e.lt = 0.08; e.h = 19; } };
  Iris.VARIANTS = VARIANTS;

  /* ---------- easter egg nuovi (proposte del 03/10, sera) ---------- */
  Object.assign(EGGS, {
    // il logo del DVD: gli occhi rimbalzano sui bordi e cambiano colore a ogni urto
    dvd: {
      dur: 10000, color: null, auto: true,
      init(o, g) { g.hue = 200; g.last = 0; },
      t(o, T, k, s, a, g) {
        const xr = o.island ? 62 : 14, yr = o.island ? 7 : 12, px = 2 * xr, py = 2 * yr;
        const tx = ((s * 30) % (2 * px)), ty = ((s * 11 + yr) % (2 * py));
        const dx = (tx < px ? tx : 2 * px - tx) - xr, dy = (ty < py ? ty : 2 * py - ty) - yr;
        const hits = Math.floor(s * 30 / px) + Math.floor((s * 11 + yr) / py);
        if (hits !== g.last) { g.last = hits; g.hue = (g.hue + 67) % 360; }
        for (const e of [T.L, T.R]) { e.dx = dx * a; e.dy = dy * a; e.sc = 1 - 0.18 * a; }
      },
      draw(o, t, k, s, a, g) { o.svg.style.transition = "none"; o.svg.style.color = a > 0.5 ? `hsl(${g.hue} 85% 68%)` : COLOR[o.state] || COLOR.idle; },
    },
    // una farfalla svolazza, gli occhi la seguono, si posa sull'occhio sinistro
    farfalla: {
      dur: 9000, color: null, auto: true,
      init(o, g) { const f = mk(o.r.fx, "g", {}); g.w1 = mk(f, "ellipse", { cx: -1.6, cy: 0, rx: 2, ry: 2.6, fill: "#f9a8d4" }); g.w2 = mk(f, "ellipse", { cx: 1.6, cy: 0, rx: 2, ry: 2.6, fill: "#c4b5fd" }); mk(f, "rect", { x: -0.4, y: -2.2, width: 0.8, height: 4.4, rx: 0.4, fill: "#334155" }); g.f = f; g.p = { x: BX(o).l, y: CY(o) - 8 }; },
      t(o, T, k, s, a, g) {
        const cy = CY(o), b = BX(o); let tx, ty;
        if (k < 0.7) { tx = 60 + (W(o) - 16) * Math.sin(s * 0.9) * Math.cos(s * 0.31); ty = cy - 6 + 8 * Math.sin(s * 1.7); }
        else if (k < 0.88) { tx = 46; ty = cy - 13; } else { const q = (k - 0.88) / 0.12; tx = 46 - q * 80; ty = cy - 13 - q * 10; }
        g.p.x += (tx - g.p.x) * 0.08; g.p.y += (ty - g.p.y) * 0.08;
        for (const [e, cx] of [[T.L, 46], [T.R, 74]]) { e.dx = clamp((g.p.x - cx) * 0.2, -5, 5) * a; e.dy = clamp((g.p.y - cy) * 0.35, -4, 4) * a; }
        if (k > 0.72 && k < 0.88) { T.L.lt = 0.35; T.R.lb = 0.4; T.L.dy = T.R.dy = -2; }
      },
      draw(o, t, k, s, a, g) { const fl = 0.35 + Math.abs(Math.sin(t / (k > 0.72 && k < 0.88 ? 260 : 70))) * 0.65; g.w1.setAttribute("rx", f2(2 * fl)); g.w2.setAttribute("rx", f2(2 * fl)); g.f.setAttribute("transform", `translate(${f2(g.p.x)} ${f2(g.p.y)})`); g.f.setAttribute("opacity", k > 0.98 ? "0" : "1"); },
    },
    // bolle di sapone che salgono; alla fine una scoppia davanti agli occhi e lui sbatte le palpebre
    bolle: {
      dur: 8000, color: "#bae6fd", auto: true,
      init(o, g) { const b = BX(o); g.b = Array.from({ length: 7 }, (_, i) => ({ n: mk(o.r.fx, "circle", { r: 1.5 + prand(i, 5) * 2.2, fill: "rgba(186,230,253,.12)", stroke: "#bae6fd", "stroke-width": 0.6 }), x: b.l + 10 + prand(i) * (b.r - b.l - 20), sp: 5 + prand(i, 1) * 5, off: prand(i, 2) * 40 })); },
      t(o, T, k, s, a) { for (const e of [T.L, T.R]) { e.dy = -2 * a; e.lb = 0.25 * a; e.dx = Math.sin(s * 0.7) * 3 * a; } if (k > 0.8 && k < 0.86) { T.L.lt = T.R.lt = 1; } },
      draw(o, t, k, s, a, g) { const b = BX(o), h = b.b - b.t + 10; g.b.forEach((q, i) => { const y = b.b + 4 - ((s * q.sp + q.off) % h); q.n.setAttribute("cx", f2(q.x + Math.sin(s * 1.3 + i) * 2.5)); q.n.setAttribute("cy", f2(y)); q.n.setAttribute("opacity", f2(a * (i === 0 && k > 0.8 ? 0 : 1))); }); },
    },
    // stella cadente: la vede passare, spalanca gli occhi, poi esprime un desiderio (occhi chiusi felici)
    stella: {
      dur: 6000, color: null, auto: true,
      init(o, g) { g.tail = mk(o.r.fxb, "path", { stroke: "#fde68a", "stroke-width": 1, "stroke-linecap": "round", fill: "none", opacity: 0 }); g.st = mk(o.r.fxb, "path", { d: STAR, fill: "#fff7cc", opacity: 0 }); },
      pos(o, k) { const b = BX(o), q = clamp((k - 0.1) / 0.35, 0, 1); return { x: b.l + q * (b.r - b.l), y: b.t + 2 + q * 10, q }; },
      t(o, T, k) { const p = this.pos(o, k); if (k > 0.1 && k < 0.5) { for (const [e, cx] of [[T.L, 46], [T.R, 74]]) { e.dx = clamp((p.x - cx) * 0.12, -5, 5); e.dy = -3; e.w = 17; e.h = 24; e.rr = 8.5; } } else if (k >= 0.55 && k < 0.92) { for (const e of [T.L, T.R]) { e.lb = 0.6; e.lt = 0.2; } } },
      draw(o, t, k, s, a, g) { const p = this.pos(o, k), on = p.q > 0 && p.q < 1; g.st.setAttribute("transform", `translate(${f2(p.x)} ${f2(p.y)}) scale(0.9)`); g.st.setAttribute("opacity", on ? "1" : "0"); g.tail.setAttribute("d", `M${f2(p.x - 16)} ${f2(p.y - 3.5)} L${f2(p.x)} ${f2(p.y)}`); g.tail.setAttribute("opacity", on ? "0.7" : "0"); },
    },
    // occhiali da sole che scendono dall'alto: "cool"
    occhiali: {
      dur: 6500, color: null, auto: true,
      init(o, g) { const c = mk(o.r.fx, "g", {}); mk(c, "rect", { x: 36.5, y: -6, width: 19, height: 12, rx: 4, fill: "#0b0b0f", stroke: "#94a3b8", "stroke-width": 0.9 }); mk(c, "rect", { x: 64.5, y: -6, width: 19, height: 12, rx: 4, fill: "#0b0b0f", stroke: "#94a3b8", "stroke-width": 0.9 }); mk(c, "path", { d: "M55.5 -2 Q60 -4.5 64.5 -2", stroke: "#94a3b8", "stroke-width": 1, fill: "none" }); mk(c, "path", { d: "M40 -3 L44 -3", stroke: "#fff", "stroke-width": 0.8, opacity: 0.6 }); g.c = c; },
      t(o, T, k) { if (k > 0.25 && k < 0.85) { for (const e of [T.L, T.R]) { e.lb = 0.3; } T.body.rot = Math.sin(k * 30) * 2; } },
      draw(o, t, k, s, a, g) { const cy = CY(o), down = k < 0.2 ? k / 0.2 : k > 0.85 ? Math.max(0, 1 - (k - 0.85) / 0.12) : 1, y = cy - 30 + down * 30; g.c.setAttribute("transform", `translate(0 ${f2(y)})`); },
    },
    // orecchie da gatto e boccuccia "w"
    gattino: {
      dur: 5500, color: "#fbcfe8", auto: true,
      init(o, g) { const cy = CY(o); g.e = mk(o.r.fx, "g", { fill: "currentColor" }); mk(g.e, "path", { d: `M38 ${cy - 9} L41 ${cy - 17} L45 ${cy - 10}Z` }); mk(g.e, "path", { d: `M75 ${cy - 10} L79 ${cy - 17} L82 ${cy - 9}Z` }); g.m = mk(o.r.fx, "path", { d: `M54 ${cy + 11} q3 3 6 0 q3 3 6 0`, fill: "none", stroke: "currentColor", "stroke-width": 1.3, "stroke-linecap": "round" }); },
      t(o, T, k, s, a) { for (const e of [T.L, T.R]) { e.lb = 0.6 * a; e.h = 17; e.dy = -2; } T.body.rot = Math.sin(s * 3) * 3 * a; },
      draw(o, t, k, s, a, g) { const up = clamp(k / 0.12, 0, 1) * clamp((1 - k) / 0.12, 0, 1); g.e.setAttribute("transform", `translate(0 ${f2((1 - up) * 8)})`); g.e.setAttribute("opacity", f2(up)); g.m.setAttribute("opacity", f2(up)); },
    },
    // legge un libro: righe da sinistra a destra, a capo, e ogni tanto gira pagina (battito di ciglia)
    lettura: {
      dur: 8000, color: null, auto: true,
      t(o, T, k, s, a) { const line = (s * 0.55) % 1, row = Math.floor(s * 0.55) % 3, x = line < 0.85 ? -5 + (line / 0.85) * 10 : 5 - ((line - 0.85) / 0.15) * 10; for (const e of [T.L, T.R]) { e.dx = x * a; e.dy = (-2 + row * 2) * a; e.lt = 0.25; e.h = 17; } if (Math.floor(s * 0.55) % 3 === 2 && line > 0.9) { T.L.lt = T.R.lt = 1; } },
    },
    // un palloncino sale da sotto e vola via, gli occhi lo seguono in su
    palloncino: {
      dur: 7000, color: null, auto: true,
      init(o, g) { const b = mk(o.r.fx, "g", {}); mk(b, "path", { d: "M0 3 Q-1.2 7 0.8 11", stroke: "#cbd5e1", "stroke-width": 0.5, fill: "none" }); mk(b, "ellipse", { cx: 0, cy: -2, rx: 4.2, ry: 5, fill: "#f87171" }); mk(b, "path", { d: "M-0.8 2.8 L0 3.6 L0.8 2.8Z", fill: "#f87171" }); mk(b, "ellipse", { cx: -1.5, cy: -3.6, rx: 0.9, ry: 1.4, fill: "#fff", opacity: 0.55 }); g.b = b; },
      pos(o, k, s) { const b = BX(o), q = clamp(k / 0.85, 0, 1); return { x: b.l + 25 + q * (b.r - b.l - 40) + Math.sin(s * 1.6) * 3, y: b.b + 14 - q * (b.b - b.t + 34) }; },
      t(o, T, k, s, a) { const p = this.pos(o, k, s), cy = CY(o); for (const [e, cx] of [[T.L, 46], [T.R, 74]]) { e.dx = clamp((p.x - cx) * 0.12, -5, 5) * a; e.dy = clamp((p.y - cy) * 0.3, -4, 4) * a; } if (k > 0.8) { T.L.lb = T.R.lb = 0.4; } },
      draw(o, t, k, s, a, g) { const p = this.pos(o, k, s); g.b.setAttribute("transform", `translate(${f2(p.x)} ${f2(p.y)}) rotate(${f2(Math.sin(s * 1.6) * 6)})`); },
    },
  });
  Iris.EGGS = EGGS;
  // stagionali: quali valgono oggi. birthday "GG/MM" (facoltativo, dalle impostazioni)
  Iris.birthday = "";
  /* ---------- easter egg di date, eventi e momenti (03/10, sera) ----------
     Partono solo nei loro giorni o nelle loro ore (vedi CALENDARIO più sotto). */
  const sparkle = (p, x, y, c) => mk(p, "path", { d: STAR, fill: c || "#fff", transform: `translate(${x} ${y})`, opacity: 0 });
  Object.assign(EGGS, {
    // Capodanno: fuochi d'artificio, gli occhi guardano in su e prendono il colore dello scoppio
    fuochi: {
      dur: 8000, color: null, auto: false,
      init(o, g) { const b = BX(o), col = ["#f472b6", "#facc15", "#4ade80", "#60a5fa", "#c084fc", "#fb923c"]; g.f = [0, 1, 2].map((i) => ({ x: b.l + 25 + i * ((b.r - b.l - 50) / 2), y: b.t + 8 + (i % 2) * 6, c: col[i * 2], off: i * 0.9, p: Array.from({ length: 10 }, () => mk(o.r.fxb, "circle", { r: 0.9, fill: col[i * 2], opacity: 0 })) })); },
      t(o, T, k, s, a) { for (const e of [T.L, T.R]) { e.dy = -3 * a; e.lb = 0.3 * a; e.w = 16; e.h = 22; } },
      draw(o, t, k, s, a, g) { let lit = null; g.f.forEach((f) => { const q = ((s + f.off) % 2.7) / 2.7; f.p.forEach((c, i) => { const an = (i / f.p.length) * Math.PI * 2, r = q * 13; c.setAttribute("cx", f2(f.x + Math.cos(an) * r)); c.setAttribute("cy", f2(f.y + Math.sin(an) * r + q * q * 4)); c.setAttribute("opacity", f2(a * (q < 0.9 ? 1 - q : 0))); }); if (q < 0.25) lit = f.c; }); o.svg.style.transition = "color .2s"; o.svg.style.color = lit || COLOR.idle; },
    },
    // 6 gennaio: passa la Befana sulla scopa
    befana: {
      dur: 6500, color: null, auto: false,
      init(o, g) { const b = mk(o.r.fx, "g", { fill: "none", stroke: "#cbd5e1", "stroke-width": 1, "stroke-linecap": "round" }); mk(b, "path", { d: "M-9 2 L7 -1" }); mk(b, "path", { d: "M7 -1 l4 -2 M7 -1 l4.4 0 M7 -1 l4 2" }); const w = mk(b, "g", { fill: "#94a3b8", stroke: "none" }); mk(w, "path", { d: "M-3 0 L-1 -6 L1 -6 L2 0Z" }); mk(w, "path", { d: "M-2.5 -6 L0 -10 L2 -6Z", fill: "#475569" }); mk(w, "circle", { cx: 0, cy: -6.5, r: 1.3, fill: "#e2e8f0" }); g.b = b; },
      pos(o, k, s) { const b = BX(o), q = clamp((k - 0.05) / 0.8, 0, 1); return { x: b.r + 12 - q * (b.r - b.l + 30), y: b.t + 9 + Math.sin(s * 3) * 2 }; },
      t(o, T, k, s, a) { const p = this.pos(o, k, s); for (const [e, cx] of [[T.L, 46], [T.R, 74]]) { e.dx = clamp((p.x - cx) * 0.12, -5, 5) * a; e.dy = -3 * a; } if (k > 0.88) T.L.lb = T.R.lb = 0.5; },
      draw(o, t, k, s, a, g) { const p = this.pos(o, k, s); g.b.setAttribute("transform", `translate(${f2(p.x)} ${f2(p.y)}) rotate(-8)`); },
    },
    // San Valentino: gli occhi diventano due cuori che battono
    innamorato: {
      dur: 5500, color: "#fb7185", auto: false,
      init(o, g) { g.h = [46, 74].map((x) => mk(o.r.fx, "path", { d: HEART, fill: "#fb7185", transform: `translate(${x} ${CY(o)}) scale(0)` })); },
      t(o, T, k) { const on = k > 0.08 && k < 0.92; T.L.op = T.R.op = on ? 0 : 1; T.body.y -= on ? Math.abs(Math.sin(k * 40)) * 1.5 : 0; },
      draw(o, t, k, s, a, g) { const beat = 4.4 + Math.max(0, Math.sin(s * 7)) ** 6 * 1.2; g.h.forEach((h, i) => h.setAttribute("transform", `translate(${[46, 74][i]} ${CY(o)}) scale(${f2(a * beat)})`)); },
    },
    // Carnevale: mascherina colorata sugli occhi e coriandoli
    maschera: {
      dur: 6500, color: null, auto: false,
      init(o, g) { const cy = CY(o); g.m = mk(o.r.fx, "path", { d: `M30 ${cy - 6} Q46 ${cy - 13} 60 ${cy - 4} Q74 ${cy - 13} 90 ${cy - 6} Q90 ${cy + 8} 74 ${cy + 7} Q60 ${cy + 3} 46 ${cy + 7} Q30 ${cy + 8} 30 ${cy - 6}Z M40 ${cy - 4} h12 v8 h-12Z M68 ${cy - 4} h12 v8 h-12Z`, "fill-rule": "evenodd", fill: "#a855f7", stroke: "#facc15", "stroke-width": 0.8, opacity: 0 }); const b = BX(o), col = ["#f472b6", "#facc15", "#4ade80", "#60a5fa"]; g.c = Array.from({ length: 22 }, (_, i) => ({ n: mk(o.r.fxb, "rect", { width: 1.6, height: 1, fill: col[i % 4] }), x: b.l + prand(i) * (b.r - b.l), sp: 8 + prand(i, 1) * 8, off: prand(i, 2) * 40 })); },
      t(o, T, k, s, a) { for (const e of [T.L, T.R]) { e.w = 11; e.h = 7; e.rr = 3; e.lb = 0.2; } T.body.rot = Math.sin(s * 3) * 3 * a; },
      draw(o, t, k, s, a, g) { g.m.setAttribute("opacity", f2(a)); const b = BX(o); g.c.forEach((c) => { c.n.setAttribute("transform", `translate(${f2(c.x + Math.sin(s * 2 + c.off) * 2)} ${f2(b.t - 3 + ((s * c.sp + c.off) % (b.b - b.t + 6)))}) rotate(${f2(s * 180 + c.off * 9)})`); c.n.setAttribute("opacity", f2(a)); }); },
    },
    // 1 aprile: un pesce attraversa la tacca, gli occhi lo seguono, poi ride
    pesce: {
      dur: 6500, color: null, auto: false,
      init(o, g) { const f = mk(o.r.fx, "g", {}); mk(f, "ellipse", { cx: 0, cy: 0, rx: 5.5, ry: 3.2, fill: "#38bdf8" }); mk(f, "path", { d: "M5 0 L9 -3 L9 3Z", fill: "#38bdf8" }); mk(f, "circle", { cx: -3, cy: -0.8, r: 0.8, fill: "#0c4a6e" }); g.f = f; g.bub = [0, 1, 2].map(() => mk(o.r.fx, "circle", { r: 0.8, fill: "none", stroke: "#7dd3fc", "stroke-width": 0.5, opacity: 0 })); },
      pos(o, k, s) { const b = BX(o), q = clamp((k - 0.05) / 0.75, 0, 1); return { x: b.r + 10 - q * (b.r - b.l + 25), y: CY(o) + 10 + Math.sin(s * 4) * 1.5 }; },
      t(o, T, k, s, a) { const p = this.pos(o, k, s); for (const [e, cx] of [[T.L, 46], [T.R, 74]]) { e.dx = clamp((p.x - cx) * 0.12, -5, 5) * a; e.dy = 2 * a; } if (k > 0.82) { T.L.lb = T.R.lb = 0.6; T.body.y -= Math.abs(Math.sin(s * 14)) * 2; } },
      draw(o, t, k, s, a, g) { const p = this.pos(o, k, s); g.f.setAttribute("transform", `translate(${f2(p.x)} ${f2(p.y)}) rotate(${f2(Math.sin(s * 8) * 6)})`); g.bub.forEach((b, i) => { const q = (s * 0.9 + i / 3) % 1; b.setAttribute("cx", f2(p.x - 6 + i * 2)); b.setAttribute("cy", f2(p.y - 3 - q * 10)); b.setAttribute("opacity", f2((1 - q) * a)); }); },
    },
    // primavera: petali rosa che scendono
    petali: {
      dur: 8000, color: "#fbcfe8", auto: false,
      init(o, g) { const b = BX(o); g.p = Array.from({ length: 16 }, (_, i) => ({ n: mk(o.r.fxb, "ellipse", { rx: 1.4, ry: 0.8, fill: i % 3 ? "#f9a8d4" : "#fce7f3" }), x: b.l + prand(i) * (b.r - b.l), sp: 4 + prand(i, 1) * 4, off: prand(i, 2) * 50, ph: prand(i, 3) * 6 })); },
      t(o, T, k, s, a) { for (const e of [T.L, T.R]) { e.lb = 0.35 * a; e.dy = -2 * a; e.dx = Math.sin(s * 0.6) * 3 * a; } },
      draw(o, t, k, s, a, g) { const b = BX(o), h = b.b - b.t + 8; g.p.forEach((p) => { p.n.setAttribute("transform", `translate(${f2(p.x + Math.sin(s * 1.2 + p.ph) * 4)} ${f2(b.t - 4 + ((s * p.sp + p.off) % h))}) rotate(${f2(Math.sin(s * 2 + p.ph) * 60)})`); p.n.setAttribute("opacity", f2(a)); }); },
    },
    // Pasqua: un uovo decorato dondola, si crepa e spunta un pulcino
    uovo: {
      dur: 7000, color: null, auto: false,
      init(o, g) { const cy = CY(o) + 8; g.e = mk(o.r.fx, "g", {}); mk(g.e, "ellipse", { cx: 0, cy: 0, rx: 4.6, ry: 6, fill: "#fde68a" }); mk(g.e, "path", { d: "M-4.4 -1 q2.2 -2 4.4 0 t4.4 0", stroke: "#f472b6", "stroke-width": 0.9, fill: "none" }); mk(g.e, "path", { d: "M-4 2.5 q2 1.6 4 0 t4 0", stroke: "#60a5fa", "stroke-width": 0.9, fill: "none" }); g.cr = mk(g.e, "path", { d: "M-4.6 -2 l1.5 1.5 l1.5 -1.5 l1.5 1.5 l1.5 -1.5 l1.5 1.5 l1.5 -1.5", stroke: "#78350f", "stroke-width": 0.6, fill: "none", opacity: 0 }); g.ch = mk(o.r.fx, "g", { opacity: 0 }); mk(g.ch, "circle", { cx: 0, cy: 0, r: 3.4, fill: "#facc15" }); mk(g.ch, "circle", { cx: -1.1, cy: -0.6, r: 0.5, fill: "#111" }); mk(g.ch, "circle", { cx: 1.1, cy: -0.6, r: 0.5, fill: "#111" }); mk(g.ch, "path", { d: "M-0.8 0.6 L0 1.6 L0.8 0.6Z", fill: "#fb923c" }); g.cy = cy; },
      t(o, T, k, s, a) { for (const e of [T.L, T.R]) { e.dy = 2 * a; } if (k > 0.55 && k < 0.65) { for (const e of [T.L, T.R]) { e.w = 17; e.h = 24; e.rr = 8.5; } } if (k >= 0.65) { T.L.lb = T.R.lb = 0.55; } },
      draw(o, t, k, s, a, g) { const wob = k < 0.5 ? Math.sin(s * 9) * 10 * k : 0; g.e.setAttribute("transform", `translate(98 ${g.cy}) rotate(${f2(wob)})`); g.cr.setAttribute("opacity", k > 0.45 ? "1" : "0"); g.e.setAttribute("opacity", f2(a * (k > 0.6 ? 0.25 : 1))); g.ch.setAttribute("opacity", f2(k > 0.58 ? a : 0)); g.ch.setAttribute("transform", `translate(98 ${f2(g.cy - (k > 0.58 ? Math.min(1, (k - 0.58) * 12) * 5 : 0))})`); },
    },
    // 2 giugno (e 25 aprile): passano le Frecce Tricolori
    frecce: {
      dur: 6000, color: null, auto: false,
      init(o, g) { g.l = ["#22c55e", "#f8fafc", "#ef4444"].map((c) => mk(o.r.fxb, "path", { stroke: c, "stroke-width": 1.8, "stroke-linecap": "round", fill: "none", opacity: 0.9 })); g.j = [0, 1, 2].map(() => mk(o.r.fx, "path", { d: "M0 0 l-3 -1.2 l0.8 1.2 l-0.8 1.2Z", fill: "#e2e8f0" })); },
      t(o, T, k) { const b = 0, p = clamp((k - 0.1) / 0.6, 0, 1); for (const [e, cx] of [[T.L, 46], [T.R, 74]]) { e.dx = (-5 + p * 10); e.dy = -2; e.w = 16; e.h = 22; } if (k > 0.75) T.L.lb = T.R.lb = 0.55; },
      draw(o, t, k, s, a, g) { const b = BX(o), p = clamp((k - 0.1) / 0.6, 0, 1), x = b.l + p * (b.r - b.l + 20); g.l.forEach((l, i) => { const y = b.t + 6 + i * 3.2 + Math.sin(p * 6) * 2; l.setAttribute("d", `M${f2(b.l - 10)} ${f2(y + 2)} Q${f2((b.l + x) / 2)} ${f2(y - 3)} ${f2(x - 3)} ${f2(y)}`); l.setAttribute("opacity", f2(0.9 * a)); g.j[i].setAttribute("transform", `translate(${f2(x)} ${f2(y)})`); g.j[i].setAttribute("opacity", f2(p > 0 && p < 1 ? 1 : 0)); }); },
    },
    // estate e Ferragosto: sole che splende e occhiali da sole
    sole: {
      dur: 7000, color: "#fde047", auto: false,
      init(o, g) { const sn = mk(o.r.fxb, "g", {}); mk(sn, "circle", { r: 4.5, fill: "#fde047" }); for (let i = 0; i < 8; i++) mk(sn, "rect", { x: -0.5, y: -8.5, width: 1, height: 2.6, rx: 0.5, fill: "#fde047", transform: `rotate(${i * 45})` }); g.s = sn; EGGS.occhiali.init(o, g); },
      t(o, T, k, s, a) { EGGS.occhiali.t(o, T, k); for (const e of [T.L, T.R]) e.lt = Math.max(e.lt, 0.2); },
      draw(o, t, k, s, a, g) { g.s.setAttribute("transform", `translate(${BX(o).r - 10} ${BX(o).t + 9}) rotate(${f2(s * 30)}) scale(${f2(a)})`); EGGS.occhiali.draw(o, t, k, s, a, g); },
    },
    // autunno: foglie che cadono girando
    foglie: {
      dur: 8000, color: "#fdba74", auto: false,
      init(o, g) { const b = BX(o), col = ["#f97316", "#eab308", "#b45309", "#ef4444"]; g.f = Array.from({ length: 12 }, (_, i) => ({ n: mk(o.r.fxb, "path", { d: "M0 -2.4 Q2 0 0 2.4 Q-2 0 0 -2.4Z", fill: col[i % 4] }), x: b.l + prand(i) * (b.r - b.l), sp: 4 + prand(i, 1) * 4, off: prand(i, 2) * 50, ph: prand(i, 3) * 6 })); },
      t(o, T, k, s, a) { for (const e of [T.L, T.R]) { e.dy = -1.5 * a; e.lb = 0.2 * a; e.dx = Math.sin(s * 0.5) * 3 * a; } },
      draw(o, t, k, s, a, g) { const b = BX(o), h = b.b - b.t + 8; g.f.forEach((f) => { f.n.setAttribute("transform", `translate(${f2(f.x + Math.sin(s * 1.4 + f.ph) * 5)} ${f2(b.t - 4 + ((s * f.sp + f.off) % h))}) rotate(${f2(s * 90 + f.ph * 40)})`); f.n.setAttribute("opacity", f2(a)); }); },
    },
    // Halloween: un fantasmino passa e gli occhi si spaventano
    fantasma: {
      dur: 6500, color: "#c4b5fd", auto: false,
      init(o, g) { const f = mk(o.r.fx, "g", {}); mk(f, "path", { d: "M-5 6 V-1 A5 5 0 0 1 5 -1 V6 l-1.7 -1.6 -1.6 1.6 -1.7 -1.6 -1.7 1.6 -1.6 -1.6 -1.7 1.6Z", fill: "#f1f5f9", opacity: 0.92 }); mk(f, "ellipse", { cx: -1.8, cy: -0.5, rx: 0.9, ry: 1.3, fill: "#111" }); mk(f, "ellipse", { cx: 1.8, cy: -0.5, rx: 0.9, ry: 1.3, fill: "#111" }); g.f = f; },
      pos(o, k, s) { const b = BX(o), q = clamp((k - 0.05) / 0.8, 0, 1); return { x: b.l - 10 + q * (b.r - b.l + 20), y: CY(o) - 2 + Math.sin(s * 2.5) * 4 }; },
      t(o, T, k, s, a) { const p = this.pos(o, k, s), near = Math.abs(p.x - 60) < 40; for (const [e, cx] of [[T.L, 46], [T.R, 74]]) { e.dx = clamp((p.x - cx) * 0.15, -5, 5) * a; if (near) { e.w = 12; e.h = 24; e.sc = 0.85; } } if (near) T.sweat = 1; },
      draw(o, t, k, s, a, g) { const p = this.pos(o, k, s); g.f.setAttribute("transform", `translate(${f2(p.x)} ${f2(p.y)})`); g.f.setAttribute("opacity", f2(a)); },
    },
    // 24-26 dicembre: un regalo che si apre con uno scintillio
    regalo: {
      dur: 6000, color: null, auto: false,
      init(o, g) { const cy = CY(o) + 7; g.box = mk(o.r.fx, "g", {}); mk(g.box, "rect", { x: -5, y: -4, width: 10, height: 8, rx: 1, fill: "#ef4444" }); mk(g.box, "rect", { x: -0.8, y: -4, width: 1.6, height: 8, fill: "#facc15" }); g.lid = mk(o.r.fx, "g", {}); mk(g.lid, "rect", { x: -5.8, y: -1.6, width: 11.6, height: 2.6, rx: 0.8, fill: "#dc2626" }); mk(g.lid, "path", { d: "M0 -1.6 q-3 -3 -3.4 -0.4 q0.4 1 3.4 0.4 q3 -3 3.4 -0.4 q-0.4 1 -3.4 0.4", fill: "#facc15" }); g.sp = [0, 1, 2, 3].map(() => sparkle(o.r.fx, 0, 0, "#fde68a")); g.cy = cy; },
      t(o, T, k, s, a) { for (const e of [T.L, T.R]) e.dy = 2 * a; if (k > 0.45) { T.L.lb = T.R.lb = 0.55; T.body.y -= Math.abs(Math.sin(s * 10)) * 1.5 * a; } },
      draw(o, t, k, s, a, g) { const x = 99, open = clamp((k - 0.4) / 0.1, 0, 1), sh = k < 0.4 ? Math.sin(s * 30) * k : 0; g.box.setAttribute("transform", `translate(${f2(x + sh)} ${g.cy}) scale(${f2(a)})`); g.lid.setAttribute("transform", `translate(${f2(x + sh + open * 5)} ${f2(g.cy - 4.6 - open * 6)}) rotate(${f2(open * 35)}) scale(${f2(a)})`); g.sp.forEach((p, i) => { const q = clamp((k - 0.45 - i * 0.04) / 0.3, 0, 1), an = -Math.PI / 2 + (i - 1.5) * 0.6; p.setAttribute("transform", `translate(${f2(x + Math.cos(an) * q * 12)} ${f2(g.cy - 4 + Math.sin(an) * q * 12)}) scale(${f2(Math.sin(q * Math.PI))})`); p.setAttribute("opacity", q > 0 && q < 1 ? "1" : "0"); }); },
    },
    // compleanno: torta con candelina; la fiamma tremola, poi la spegne con un soffio
    torta: {
      dur: 6500, color: null, auto: false,
      init(o, g) { const cy = CY(o) + 9; g.t = mk(o.r.fx, "g", {}); mk(g.t, "rect", { x: -6, y: -3, width: 12, height: 6, rx: 1.4, fill: "#f9a8d4" }); mk(g.t, "path", { d: "M-6 -1 q1.5 1.5 3 0 t3 0 t3 0 t3 0", stroke: "#fff", "stroke-width": 0.9, fill: "none" }); mk(g.t, "rect", { x: -0.5, y: -8, width: 1, height: 5, fill: "#60a5fa" }); g.fl = mk(g.t, "ellipse", { cx: 0, cy: -9.4, rx: 1, ry: 1.6, fill: "#fbbf24" }); g.sm = mk(o.r.fx, "path", { d: "M0 0 q-1.5 -2 0 -4 q1.5 -2 0 -4", stroke: "#94a3b8", "stroke-width": 0.7, fill: "none", opacity: 0 }); g.cy = cy; },
      t(o, T, k, s, a) { if (k < 0.55) { for (const e of [T.L, T.R]) { e.dx = 3 * a; e.dy = 2 * a; e.w = 16; e.h = 22; } } else if (k < 0.65) { T.body.sx = 1.05; for (const e of [T.L, T.R]) e.lt = 0.4; } else { T.L.lb = T.R.lb = 0.6; T.body.y -= Math.abs(Math.sin(s * 12)) * 2 * a; } },
      draw(o, t, k, s, a, g) { const x = 99; g.t.setAttribute("transform", `translate(${x} ${g.cy}) scale(${f2(a)})`); const lit = k < 0.6; g.fl.setAttribute("opacity", lit ? "1" : "0"); g.fl.setAttribute("ry", f2(1.4 + Math.sin(s * 23) * 0.3)); const q = clamp((k - 0.6) / 0.25, 0, 1); g.sm.setAttribute("transform", `translate(${x} ${f2(g.cy - 10 - q * 4)})`); g.sm.setAttribute("opacity", f2(q > 0 && q < 1 ? 1 - q : 0)); },
    },
    // notti di luna piena: sorge la luna tra le stelle, occhi assonnati e contenti
    luna: {
      dur: 8000, color: "#e2e8f0", auto: false,
      init(o, g) { const b = BX(o); g.m = mk(o.r.fxb, "circle", { r: 6, fill: "#f1f5f9" }); g.cr = [[-2, -1, 1.2], [2, 2, 0.8], [1.5, -2.5, 0.6]].map(([x, y, r]) => mk(o.r.fxb, "circle", { cx: x, cy: y, r, fill: "#cbd5e1" })); g.st = Array.from({ length: 6 }, (_, i) => sparkle(o.r.fxb, b.l + 8 + prand(i) * (b.r - b.l - 16), b.t + 3 + prand(i, 1) * 12, "#e2e8f0")); },
      t(o, T, k, s, a) { for (const e of [T.L, T.R]) { e.lt = 0.4 * a; e.lb = 0.3 * a; e.dx = 3 * a; e.dy = -2 * a; } T.body.y += Math.sin(s * 1.2) * 0.8; },
      draw(o, t, k, s, a, g) { const b = BX(o), up = clamp(k / 0.3, 0, 1), x = b.r - 18, y = b.b + 8 - up * (b.b - b.t - 4); g.m.setAttribute("cx", f2(x)); g.m.setAttribute("cy", f2(y)); g.cr.forEach((c, i) => c.setAttribute("transform", `translate(${f2(x)} ${f2(y)})`)); g.m.setAttribute("opacity", f2(a)); g.st.forEach((p, i) => p.setAttribute("opacity", f2(a * Math.max(0, Math.sin(s * 2 + i * 1.7))))); g.st.forEach((p, i) => p.setAttribute("transform", p.getAttribute("transform").replace(/ scale\(.*\)/, "") + " scale(0.55)")); },
    },
    // la mattina: tazza di caffè fumante, occhi assonnati, un sorso e si sveglia
    caffe: {
      dur: 7000, color: null, auto: false,
      init(o, g) { const cy = CY(o) + 7; g.c = mk(o.r.fx, "g", {}); mk(g.c, "path", { d: "M-5 -3 h9 v4 a4.5 4 0 0 1 -9 0Z", fill: "#e2e8f0" }); mk(g.c, "path", { d: "M4 -2 a2.2 2.2 0 0 1 0 4", stroke: "#e2e8f0", "stroke-width": 1, fill: "none" }); mk(g.c, "rect", { x: -4.4, y: -3, width: 7.8, height: 1.2, fill: "#78350f" }); g.sm = [0, 1].map((i) => mk(o.r.fx, "path", { d: "M0 0 q-1.4 -2 0 -4 q1.4 -2 0 -4", stroke: "#cbd5e1", "stroke-width": 0.7, fill: "none" })); g.cy = cy; },
      t(o, T, k, s, a) { if (k < 0.55) { for (const e of [T.L, T.R]) { e.lt = 0.55; e.dx = 3; e.dy = 2; } T.body.y += Math.sin(s * 1.5); } else if (k < 0.65) { for (const e of [T.L, T.R]) e.lt = 0.85; } else { for (const e of [T.L, T.R]) { e.w = 17; e.h = 24; e.rr = 8.5; } if (k > 0.8) T.L.lb = T.R.lb = 0.5; } },
      draw(o, t, k, s, a, g) { const x = 100; g.c.setAttribute("transform", `translate(${x} ${g.cy}) scale(${f2(a)}) rotate(${k > 0.55 && k < 0.65 ? -25 : 0})`); g.sm.forEach((p, i) => { const q = (s * 0.7 + i / 2) % 1; p.setAttribute("transform", `translate(${x - 1.5 + i * 3} ${f2(g.cy - 4 - q * 5)})`); p.setAttribute("opacity", f2(a * (1 - q) * 0.8)); }); },
    },
    // venerdì 17: passa un gatto nero, gli occhi si spaventano
    gattonero: {
      dur: 6000, color: null, auto: false,
      init(o, g) { const c = mk(o.r.fx, "g", { fill: "#0f172a", stroke: "#94a3b8", "stroke-width": 0.6 }); mk(c, "ellipse", { cx: 0, cy: 0, rx: 6, ry: 3 }); mk(c, "circle", { cx: -6, cy: -2.5, r: 2.6 }); mk(c, "path", { d: "M-8 -4.5 l0.6 -2.4 l1.4 1.6Z M-5.4 -4.6 l0.8 -2.2 l1 1.8Z" }); mk(c, "path", { d: "M6 -1 q4 -2 3 -6", fill: "none", "stroke-width": 1.2, stroke: "#020617" }); mk(c, "circle", { cx: -6.9, cy: -2.8, r: 0.45, fill: "#facc15", stroke: "none" }); mk(c, "circle", { cx: -5.2, cy: -2.8, r: 0.45, fill: "#facc15", stroke: "none" }); g.c = c; },
      pos(o, k) { const b = BX(o), q = clamp((k - 0.05) / 0.8, 0, 1); return { x: b.r + 10 - q * (b.r - b.l + 25), y: b.b - 4 }; },
      t(o, T, k, s, a) { const p = this.pos(o, k), near = Math.abs(p.x - 60) < 45; for (const [e, cx] of [[T.L, 46], [T.R, 74]]) { e.dx = clamp((p.x - cx) * 0.12, -5, 5) * a; e.dy = 3 * a; if (near) { e.w = 12; e.h = 23; e.sc = 0.88; e.dx += Math.sin(s * 40) * 0.5; } } },
      draw(o, t, k, s, a, g) { const p = this.pos(o, k); g.c.setAttribute("transform", `translate(${f2(p.x)} ${f2(p.y + Math.abs(Math.sin(s * 8)) * -0.6)})`); },
    },
  });

  /* ---------- feste nel mondo (04/10): riconoscibili anche fuori dall'Italia ---------- */
  // fuochi d'artificio con i colori di una bandiera (4 luglio, 14 luglio): stessa animazione di Capodanno
  const fuochiColori = (col) => ({
    dur: 8000, color: null, auto: false,
    init(o, g) { const b = BX(o); g.f = [0, 1, 2].map((i) => ({ x: b.l + 25 + i * ((b.r - b.l - 50) / 2), y: b.t + 8 + (i % 2) * 6, c: col[i % col.length], off: i * 0.9, p: Array.from({ length: 10 }, () => mk(o.r.fxb, "circle", { r: 0.9, fill: col[i % col.length], opacity: 0 })) })); },
    t(o, T, k, s, a) { EGGS.fuochi.t(o, T, k, s, a); },
    draw(o, t, k, s, a, g) { EGGS.fuochi.draw(o, t, k, s, a, g); },
  });
  // pioggia di piccoli oggetti (trifogli, petali, calendule): una funzione per tutti
  function pioggia(o, g, n, crea) { const b = BX(o); g.p = Array.from({ length: n }, (_, i) => ({ n: crea(i), x: b.l + prand(i) * (b.r - b.l), sp: 4 + prand(i, 1) * 4, off: prand(i, 2) * 50, ph: prand(i, 3) * 6 })); }
  function cade(o, g, s, a, giro = 60) { const b = BX(o), h = b.b - b.t + 8; g.p.forEach((p) => { p.n.setAttribute("transform", `translate(${f2(p.x + Math.sin(s * 1.3 + p.ph) * 4)} ${f2(b.t - 4 + ((s * p.sp + p.off) % h))}) rotate(${f2(s * giro + p.ph * 30)})`); p.n.setAttribute("opacity", f2(a)); }); }
  Object.assign(EGGS, {
    // San Patrizio (17 marzo): occhi verdi e trifogli che cadono
    trifoglio: {
      dur: 7500, color: "#4ade80", auto: false,
      init(o, g) { pioggia(o, g, 12, (i) => { const n = mk(o.r.fxb, "g", {}); [0, 120, 240].forEach((r) => mk(n, "path", { d: HEART, fill: i % 2 ? "#22c55e" : "#4ade80", transform: `rotate(${r}) translate(0 -1.5) scale(0.5)` })); mk(n, "path", { d: "M0 0 q0.6 1.6 1.6 2.4", stroke: "#16a34a", "stroke-width": 0.4, fill: "none" }); return n; }); },
      t(o, T, k, s, a) { for (const e of [T.L, T.R]) { e.lb = 0.45 * a; e.dy = -1.5 * a; } T.body.rot = Math.sin(s * 4) * 3 * a; },
      draw(o, t, k, s, a, g) { cade(o, g, s, a); },
    },
    // Pi Day (14 marzo, 3/14): passa il pi greco con le sue cifre, gli occhi le leggono
    pigreco: {
      dur: 7000, color: "#a5b4fc", auto: false,
      init(o, g) { g.t = mk(o.r.fx, "text", { y: CY(o) + 14, "font-size": 5.5, "font-family": "ui-monospace,Consolas,monospace", fill: "#c7d2fe" }); g.t.textContent = "π = 3,14159 26535 89793 23846"; g.pi = mk(o.r.fx, "text", { x: 98, y: CY(o) - 3, "font-size": 11, "font-weight": 700, "font-family": "Georgia,serif", fill: "#a5b4fc", opacity: 0 }); g.pi.textContent = "π"; },
      pos(o, k) { const b = BX(o); return b.r + 5 - clamp((k - 0.05) / 0.85, 0, 1) * (b.r - b.l + 95); },
      t(o, T, k, s, a) { const x = this.pos(o, k); for (const e of [T.L, T.R]) { e.dx = clamp((x + 40 - 60) * 0.06, -5, 5) * a; e.dy = 3 * a; e.lt = 0.2 * a; } },
      draw(o, t, k, s, a, g) { g.t.setAttribute("x", f2(this.pos(o, k))); g.t.setAttribute("opacity", f2(a)); g.pi.setAttribute("opacity", f2(a * (0.6 + 0.4 * Math.sin(s * 3)))); },
    },
    // Star Wars Day (4 maggio, "May the 4th"): si accende una spada laser, occhi decisi
    spada: {
      dur: 6500, color: "#86efac", auto: false,
      init(o, g) { const x = 100, y = CY(o) + 13; g.glow = mk(o.r.fxb, "line", { x1: x, y1: y, x2: x, y2: y, stroke: "#4ade80", "stroke-width": 3.2, "stroke-linecap": "round", opacity: 0.35 }); g.lama = mk(o.r.fx, "line", { x1: x, y1: y, x2: x, y2: y, stroke: "#f0fdf4", "stroke-width": 1.1, "stroke-linecap": "round" }); g.elsa = mk(o.r.fx, "rect", { x: x - 1.1, y: y, width: 2.2, height: 5, rx: 0.5, fill: "#94a3b8" }); g.x = x; g.y = y; },
      t(o, T, k, s, a) { for (const e of [T.L, T.R]) { e.lt = 0.35 * a; e.dx = 4 * a; e.h = 18; } T.body.rot = -4 * a; },
      draw(o, t, k, s, a, g) { const on = clamp((k - 0.12) / 0.1, 0, 1) * clamp((0.92 - k) / 0.08, 0, 1), len = 26 * on, an = -0.35 + Math.sin(s * 2) * 0.12; const x2 = g.x + Math.sin(an) * len, y2 = g.y - Math.cos(an) * len; for (const l of [g.glow, g.lama]) { l.setAttribute("x2", f2(x2)); l.setAttribute("y2", f2(y2)); } g.glow.setAttribute("opacity", f2((0.3 + Math.sin(s * 40) * 0.05) * a)); g.elsa.setAttribute("opacity", f2(a)); },
    },
    // Hanami (fine marzo - inizio aprile): un ramo di ciliegio in fiore e petali che volano
    sakura: {
      dur: 8000, color: "#fbcfe8", auto: false,
      init(o, g) { const b = BX(o); g.r = mk(o.r.fxb, "g", {}); mk(g.r, "path", { d: `M${b.r + 2} ${b.t + 2} Q${b.r - 20} ${b.t + 6} ${b.r - 38} ${b.t + 4} M${b.r - 18} ${b.t + 5} q-4 5 -9 6`, stroke: "#78350f", "stroke-width": 1, fill: "none" }); [[b.r - 8, b.t + 4], [b.r - 20, b.t + 6], [b.r - 30, b.t + 5], [b.r - 37, b.t + 3], [b.r - 26, b.t + 10]].forEach(([x, y]) => { for (let i = 0; i < 5; i++) mk(g.r, "circle", { cx: f2(x + Math.cos(i * 1.256) * 1.3), cy: f2(y + Math.sin(i * 1.256) * 1.3), r: 1, fill: "#fbcfe8" }); mk(g.r, "circle", { cx: x, cy: y, r: 0.5, fill: "#f472b6" }); }); pioggia(o, g, 10, (i) => mk(o.r.fxb, "ellipse", { rx: 1.3, ry: 0.75, fill: i % 2 ? "#f9a8d4" : "#fce7f3" })); },
      t(o, T, k, s, a) { for (const e of [T.L, T.R]) { e.lb = 0.4 * a; e.dx = 4 * a; e.dy = -2.5 * a; } },
      draw(o, t, k, s, a, g) { g.r.setAttribute("opacity", f2(a)); cade(o, g, s, a, 90); },
    },
    // Giornata della Terra (22 aprile): un piccolo mondo che gira, occhi contenti
    terra: {
      dur: 7000, color: "#7dd3fc", auto: false,
      init(o, g) { const cy = CY(o) + 6; g.cl = mk(o.r.fx, "clipPath", { id: "terraclip" + Math.random().toString(36).slice(2) }); mk(g.cl, "circle", { cx: 0, cy: 0, r: 6 }); g.w = mk(o.r.fx, "g", {}); mk(g.w, "circle", { cx: 0, cy: 0, r: 6, fill: "#2563eb" }); g.land = mk(g.w, "g", { "clip-path": `url(#${g.cl.getAttribute("id")})` }); g.c = [[-4, -2, 3.2, 2.2], [3, 1.5, 2.6, 3], [-1, 4, 2.4, 1.4], [9, -2, 3.2, 2.2], [16, 1.5, 2.6, 3]].map(([x, y, rx, ry]) => mk(g.land, "ellipse", { cx: x, cy: y, rx, ry, fill: "#22c55e" })); mk(g.w, "circle", { cx: 0, cy: 0, r: 6, fill: "none", stroke: "#bfdbfe", "stroke-width": 0.5 }); g.cy = cy; },
      t(o, T, k, s, a) { for (const e of [T.L, T.R]) { e.lb = 0.55 * a; e.dx = 3 * a; e.dy = 1.5 * a; } T.body.y -= Math.abs(Math.sin(s * 3)) * 0.8 * a; },
      draw(o, t, k, s, a, g) { g.w.setAttribute("transform", `translate(99 ${g.cy}) scale(${f2(a)})`); const off = (s * 5) % 13; g.c.forEach((c, i) => c.setAttribute("transform", `translate(${f2(-off)} 0)`)); },
    },
    // 4 luglio (Stati Uniti): fuochi rossi, bianchi e blu
    usa: fuochiColori(["#ef4444", "#f8fafc", "#3b82f6"]),
    // 14 luglio (Francia): fuochi blu, bianchi e rossi
    francia: fuochiColori(["#3b82f6", "#f8fafc", "#ef4444"]),
    // Oktoberfest (fine settembre - inizio ottobre): boccale di birra con la schiuma, occhi un po' brilli
    birra: {
      dur: 7000, color: "#fcd34d", auto: false,
      init(o, g) { const cy = CY(o) + 6; g.b = mk(o.r.fx, "g", {}); mk(g.b, "rect", { x: -4.5, y: -6, width: 9, height: 12, rx: 1, fill: "#f59e0b", opacity: 0.95 }); mk(g.b, "path", { d: "M4.5 -3 h2 a2 2 0 0 1 2 2 v3 a2 2 0 0 1 -2 2 h-2", stroke: "#fde68a", "stroke-width": 1.1, fill: "none" }); g.sch = [-3, 0, 3].map((x) => mk(g.b, "circle", { cx: x, cy: -6.5, r: 2.4, fill: "#fffbeb" })); g.bol = [0, 1, 2, 3].map(() => mk(g.b, "circle", { r: 0.5, fill: "#fef3c7" })); g.cy = cy; },
      t(o, T, k, s, a) { for (const e of [T.L, T.R]) { e.lt = 0.3 * a; e.lb = 0.35 * a; e.dx = 3 * a; } T.body.rot = Math.sin(s * 2.2) * 6 * a; T.body.y += Math.sin(s * 2.2 + 1) * 1 * a; },
      draw(o, t, k, s, a, g) { g.b.setAttribute("transform", `translate(100 ${g.cy}) rotate(${f2(Math.sin(s * 2.2) * 8)}) scale(${f2(a)})`); g.sch.forEach((c, i) => c.setAttribute("r", f2(2.2 + Math.sin(s * 3 + i) * 0.3))); g.bol.forEach((b, i) => { const q = (s * 0.8 + i / 4) % 1; b.setAttribute("cx", f2(-3 + i * 2)); b.setAttribute("cy", f2(5 - q * 10)); b.setAttribute("opacity", f2(1 - q)); }); },
    },
    // Día de los Muertos (1-2 novembre): occhi arancioni con le decorazioni del teschio di zucchero e calendule
    muertos: {
      dur: 7500, color: "#fb923c", auto: false,
      init(o, g) { const cy = CY(o); g.d = [46, 74].map((x) => { const n = mk(o.r.fx, "g", { opacity: 0 }); for (let i = 0; i < 8; i++) { const an = i * Math.PI / 4; mk(n, "circle", { cx: f2(x + Math.cos(an) * 11), cy: f2(cy + Math.sin(an) * 13), r: 1.6, fill: i % 2 ? "#f472b6" : "#facc15" }); } return n; }); pioggia(o, g, 12, (i) => { const n = mk(o.r.fxb, "g", {}); for (let j = 0; j < 6; j++) mk(n, "circle", { cx: f2(Math.cos(j * 1.05) * 1.1), cy: f2(Math.sin(j * 1.05) * 1.1), r: 0.9, fill: i % 3 ? "#f97316" : "#fbbf24" }); return n; }); },
      t(o, T, k, s, a) { for (const e of [T.L, T.R]) { e.w = 15; e.h = 15; e.rr = 7.5; e.lb = 0.15 * a; } T.body.y += Math.sin(s * 2) * 0.8; },
      draw(o, t, k, s, a, g) { g.d.forEach((d, i) => { d.setAttribute("opacity", f2(a)); d.setAttribute("transform", `rotate(${f2(Math.sin(s * 1.5 + i) * 6)} ${[46, 74][i]} ${CY(o)})`); }); cade(o, g, s, a, 40); },
    },
    // Thanksgiving (quarto giovedì di novembre): passa un tacchino con la coda a ventaglio
    tacchino: {
      dur: 6500, color: null, auto: false,
      init(o, g) { const n = mk(o.r.fx, "g", {}); ["#b45309", "#ea580c", "#facc15", "#ea580c", "#b45309"].forEach((c, i) => mk(n, "ellipse", { cx: 0, cy: -4, rx: 1.6, ry: 4.6, fill: c, transform: `rotate(${(i - 2) * 28} 0 0)` })); mk(n, "ellipse", { cx: 0, cy: 0, rx: 3.6, ry: 3, fill: "#78350f" }); mk(n, "circle", { cx: -3.2, cy: -2.6, r: 1.6, fill: "#92400e" }); mk(n, "path", { d: "M-4.8 -2.6 l-1.3 0.5 l1.3 0.5Z", fill: "#facc15" }); mk(n, "path", { d: "M-4.2 -1.6 q-0.4 1.6 0.4 2", stroke: "#ef4444", "stroke-width": 0.7, fill: "none" }); mk(n, "circle", { cx: -3.6, cy: -3, r: 0.35, fill: "#111" }); g.n = n; },
      pos(o, k) { const b = BX(o), q = clamp((k - 0.05) / 0.8, 0, 1); return { x: b.r + 10 - q * (b.r - b.l + 25), y: b.b - 6 }; },
      t(o, T, k, s, a) { const p = this.pos(o, k); for (const [e, cx] of [[T.L, 46], [T.R, 74]]) { e.dx = clamp((p.x - cx) * 0.12, -5, 5) * a; e.dy = 3 * a; } if (k > 0.85) T.L.lb = T.R.lb = 0.5; },
      draw(o, t, k, s, a, g) { const p = this.pos(o, k); g.n.setAttribute("transform", `translate(${f2(p.x)} ${f2(p.y - Math.abs(Math.sin(s * 7)) * 0.8)})`); },
    },
    // Capodanno cinese: lanterne rosse che salgono, occhi rossi e oro
    lanterne: {
      dur: 8000, color: "#f87171", auto: false,
      init(o, g) { const b = BX(o); g.l = Array.from({ length: 5 }, (_, i) => { const n = mk(o.r.fxb, "g", {}); mk(n, "line", { x1: 0, y1: -5.5, x2: 0, y2: -4, stroke: "#facc15", "stroke-width": 0.5 }); mk(n, "ellipse", { cx: 0, cy: 0, rx: 3.4, ry: 4, fill: "#dc2626" }); mk(n, "rect", { x: -2, y: -4.4, width: 4, height: 1, fill: "#facc15" }); mk(n, "rect", { x: -2, y: 3.4, width: 4, height: 1, fill: "#facc15" }); mk(n, "line", { x1: 0, y1: 4.4, x2: 0, y2: 7, stroke: "#facc15", "stroke-width": 0.5 }); return { n, x: b.l + 15 + i * ((b.r - b.l - 30) / 4), sp: 3 + prand(i, 1) * 2, off: prand(i, 2) * 30 }; }); },
      t(o, T, k, s, a) { for (const e of [T.L, T.R]) { e.dy = -3 * a; e.lb = 0.3 * a; } },
      draw(o, t, k, s, a, g) { const b = BX(o), h = b.b - b.t + 16; g.l.forEach((l, i) => { l.n.setAttribute("transform", `translate(${f2(l.x + Math.sin(s + i) * 2)} ${f2(b.b + 8 - ((s * l.sp + l.off) % h))}) rotate(${f2(Math.sin(s * 1.5 + i) * 6)})`); l.n.setAttribute("opacity", f2(a)); }); },
    },
    // Diwali: lampade a olio che tremolano e scintille dorate
    diwali: {
      dur: 7500, color: "#fbbf24", auto: false,
      init(o, g) { const b = BX(o); g.d = [0, 1, 2, 3].map((i) => { const n = mk(o.r.fx, "g", {}); mk(n, "path", { d: "M-3.4 0 Q0 3.4 3.4 0Z", fill: "#c2410c" }); const f = mk(n, "ellipse", { cx: 0, cy: -2, rx: 0.9, ry: 1.8, fill: "#fbbf24" }); return { n, f, x: b.l + 22 + i * ((b.r - b.l - 44) / 3) }; }); g.st = Array.from({ length: 6 }, (_, i) => sparkle(o.r.fxb, b.l + 10 + prand(i) * (b.r - b.l - 20), b.t + 4 + prand(i, 1) * 14, "#fde68a")); },
      t(o, T, k, s, a) { for (const e of [T.L, T.R]) { e.dy = 1.5 * a; e.lb = 0.45 * a; } },
      draw(o, t, k, s, a, g) { const b = BX(o); g.d.forEach((d, i) => { d.n.setAttribute("transform", `translate(${f2(d.x)} ${b.b - 3}) scale(${f2(a)})`); d.f.setAttribute("ry", f2(1.6 + Math.sin(s * 19 + i * 2) * 0.4)); }); g.st.forEach((p, i) => p.setAttribute("opacity", f2(a * Math.max(0, Math.sin(s * 2.5 + i * 1.3))))); },
    },
    // Holi: nuvole di polvere colorata che esplodono, gli occhi cambiano colore
    holi: {
      dur: 7500, color: null, auto: false,
      init(o, g) { const b = BX(o), col = ["#f472b6", "#facc15", "#22d3ee", "#a3e635", "#c084fc", "#fb923c"]; g.c = col; g.p = col.map((c, i) => ({ c, x: b.l + 15 + prand(i) * (b.r - b.l - 30), y: b.t + 6 + prand(i, 1) * 24, off: i * 0.55, n: Array.from({ length: 9 }, () => mk(o.r.fxb, "circle", { r: 1.6, fill: c, opacity: 0 })) })); },
      t(o, T, k, s, a) { for (const e of [T.L, T.R]) { e.lb = 0.5 * a; } T.body.y -= Math.abs(Math.sin(s * 5)) * 1 * a; },
      draw(o, t, k, s, a, g) { let lit = null; g.p.forEach((p) => { const q = ((s + p.off) % 3.3) / 3.3; p.n.forEach((c, i) => { const an = (i / p.n.length) * Math.PI * 2, r = 2 + q * 11; c.setAttribute("cx", f2(p.x + Math.cos(an) * r)); c.setAttribute("cy", f2(p.y + Math.sin(an) * r * 0.7)); c.setAttribute("r", f2(1.2 + q * 2.4)); c.setAttribute("opacity", f2(a * 0.75 * (1 - q))); }); if (q < 0.2) lit = p.c; }); o.svg.style.transition = "color .3s"; o.svg.style.color = lit || COLOR.idle; },
    },
  });

  /* ---------- l'ora del giorno e il mouse (04/10) ---------- */
  function zeta(o, g, n) { g.z = Array.from({ length: n }, (_, i) => { const z = mk(o.r.fx, "text", { "font-size": 4.5 + i, "font-weight": 700, "font-family": "system-ui,sans-serif", fill: "#94a3b8", opacity: 0 }); z.textContent = "z"; return z; }); }
  function zetaSale(o, g, s, a, x0) { g.z.forEach((z, i) => { const q = (s * 0.35 + i / g.z.length) % 1; z.setAttribute("x", f2(x0 + q * 10 + i * 2)); z.setAttribute("y", f2(CY(o) - 4 - q * 14)); z.setAttribute("opacity", f2(a * Math.sin(q * Math.PI))); }); }
  Object.assign(EGGS, {
    // notte fonda (00:30-4): occhiaie, palpebre pesanti, dondola dal sonno
    occhiaie: {
      dur: 5500, color: "#a5b4fc", auto: false,
      init(o, g) { const cy = CY(o) + 13; g.o = [46, 74].map((x) => mk(o.r.fx, "path", { d: `M${x - 7} ${cy} Q${x} ${cy + 4} ${x + 7} ${cy}`, stroke: "#6d28d9", "stroke-width": 1.6, "stroke-linecap": "round", fill: "none", opacity: 0 })); },
      t(o, T, k, s, a) { for (const e of [T.L, T.R]) { e.lt = (0.5 + Math.max(0, Math.sin(s * 1.3)) * 0.3) * a; e.dy = 1.5 * a; } T.body.rot = Math.sin(s * 1.1) * 4 * a; T.body.y += Math.sin(s * 1.1) * 1 * a; },
      draw(o, t, k, s, a, g) { g.o.forEach((p) => p.setAttribute("opacity", f2(0.75 * a))); },
    },
    // prestissimo (4-6:30): assonnato, sbadiglio e qualche "z"
    alba: {
      dur: 6000, color: "#fda4af", auto: false,
      init(o, g) { zeta(o, g, 3); },
      t(o, T, k, s, a) { const sb = k > 0.35 && k < 0.6 ? Math.sin((k - 0.35) / 0.25 * Math.PI) : 0; for (const e of [T.L, T.R]) { e.lt = Math.max(0, 0.55 - sb * 0.45) * a; e.h += sb * 5; e.dy = 1 * a; } T.body.sy += sb * 0.04; },
      draw(o, t, k, s, a, g) { zetaSale(o, g, s, a * (k < 0.35 ? 1 : 0.4), 84); },
    },
    // sera (21-00:30): occhi rilassati e qualche stellina
    sera: {
      dur: 5500, color: "#fcd34d", auto: false,
      init(o, g) { const b = BX(o); g.st = [0, 1, 2, 3].map((i) => sparkle(o.r.fxb, b.l + 18 + i * 40 + prand(i) * 10, b.t + 5 + prand(i, 1) * 8, "#fde68a")); },
      t(o, T, k, s, a) { for (const e of [T.L, T.R]) { e.lb = 0.4 * a; e.lt = 0.15 * a; e.dy = -1 * a; } T.body.y += Math.sin(s * 1.5) * 0.8 * a; },
      draw(o, t, k, s, a, g) { g.st.forEach((p, i) => { p.setAttribute("opacity", f2(a * Math.max(0, Math.sin(s * 2 + i * 1.6)))); p.setAttribute("transform", p.getAttribute("transform").replace(/ scale\(.*\)/, "") + " scale(0.6)"); }); },
    },
    // nessuno usa il computer da un po': si appisola (finché il mouse non si muove)
    pisolino: {
      dur: 30000, color: "#94a3b8", auto: false,
      init(o, g) { zeta(o, g, 3); },
      t(o, T, k, s, a) { for (const e of [T.L, T.R]) { e.lt = 0.9 * Math.min(1, k * 20); e.dy = 3 * a; } T.body.y += Math.sin(s * 1.2) * 1.2; T.body.sy = 1 + Math.sin(s * 1.2) * 0.02; },
      draw(o, t, k, s, a, g) { zetaSale(o, g, s, a, 84); },
    },
  });
  // le animazioni dell'ora (partono aprendo l'isola, una volta per fascia): quale vale adesso
  Iris.timeEgg = function (d) {
    const h = d.getHours() + d.getMinutes() / 60;
    if (h >= 0.5 && h < 4) return "occhiaie";
    if (h >= 4 && h < 6.5) return "alba";
    if (h >= 6.5 && h < 9.5) return "caffe";
    if (h >= 17 && h < 19) return "stiracchiata";
    if (h >= 21 || h < 0.5) return "sera";
    return null;
  };

  /* ---------- animazioni personali (file JSON nella cartella "animazioni") ----------
     Sono solo descrizioni, mai codice: momenti chiave per gli occhi e per qualche forma, che qui si animano.
     Misure in percentuale dell'area delle animazioni: x 0 = bordo sinistro, 100 = bordo destro; y 0 = sopra, 100 = sotto.
     Formato completo e regole: GUIDA.md nella cartella. */
  const lerpK = (a, b, k) => a + (b - a) * k;
  const EASE = { lineare: (k) => k, morbido: (k) => k * k * (3 - 2 * k), rimbalzo: (k) => 1 - Math.abs(Math.cos(k * Math.PI * 2.5)) * (1 - k) };
  // valore di una proprietà al tempo k (0-1), dai momenti chiave [{t, ...}]
  function chiave(keys, prop, k, def) {
    const ks = keys.filter((x) => x[prop] != null);
    if (!ks.length) return def;
    if (k <= ks[0].t) return ks[0][prop];
    for (let i = 1; i < ks.length; i++) if (k <= ks[i].t) { const a = ks[i - 1], b = ks[i], q = (k - a.t) / Math.max(1e-6, b.t - a.t); return lerpK(a[prop], b[prop], (EASE[b.curva] || EASE.morbido)(q)); }
    return ks[ks.length - 1][prop];
  }
  const num = (v, a, b, d) => (typeof v === "number" && isFinite(v) ? Math.max(a, Math.min(b, v)) : d);
  const colore = (c, d) => (typeof c === "string" && /^#[0-9a-f]{3,8}$/i.test(c) ? c : d);
  function pulisciChiavi(arr) {
    return (Array.isArray(arr) ? arr : []).slice(0, 40).map((x) => {
      const o = { t: num(x.t, 0, 1, 0), curva: EASE[x.curva] ? x.curva : "morbido" };
      for (const p of ["x", "y", "dx", "dy", "larghezza", "altezza", "sorriso", "palpebra", "inclinazione", "visibile", "scala", "rotazione", "opacita"]) if (typeof x[p] === "number" && isFinite(x[p])) o[p] = x[p];
      return o;
    }).sort((a, b) => a.t - b.t);
  }
  Iris.customEggs = []; // [{ id, nome, quando }]
  Iris.registerEgg = function (id, spec) {
    if (!spec || typeof spec !== "object") throw new Error("non è un oggetto JSON");
    const durata = num(spec.durata, 1000, 30000, 6000);
    const occhi = pulisciChiavi(spec.occhi), sin = pulisciChiavi(spec.sinistro), des = pulisciChiavi(spec.destro);
    const oggetti = (Array.isArray(spec.oggetti) ? spec.oggetti : []).slice(0, 30).map((g) => ({
      forma: ["cerchio", "rettangolo", "testo", "cuore", "stella"].includes(g.forma) ? g.forma : "cerchio",
      colore: colore(g.colore, "#ffffff"), dimensione: num(g.dimensione, 1, 40, 4), testo: String(g.testo || "").slice(0, 40),
      dietro: !!g.dietro, chiavi: pulisciChiavi(g.chiavi),
    }));
    const key = "mia-" + id;
    EGGS[key] = {
      dur: durata, color: colore(spec.colore_occhi, null), auto: false, nome: String(spec.nome || id).slice(0, 60),
      init(o, g) {
        const b = BX(o), W = b.r - b.l;
        g.n = oggetti.map((ob) => {
          const p = ob.dietro ? o.r.fxb : o.r.fx, s = ob.dimensione * W / 100;
          if (ob.forma === "rettangolo") return mk(p, "rect", { x: -s / 2, y: -s / 2, width: s, height: s, rx: s / 5, fill: ob.colore, opacity: 0 });
          if (ob.forma === "testo") { const n = mk(p, "text", { "font-size": s, "font-weight": 700, "font-family": "system-ui,sans-serif", "text-anchor": "middle", "dominant-baseline": "middle", fill: ob.colore, opacity: 0 }); n.textContent = ob.testo; return n; }
          if (ob.forma === "cuore") return mk(p, "path", { d: HEART, fill: ob.colore, opacity: 0 });
          if (ob.forma === "stella") return mk(p, "path", { d: STAR, fill: ob.colore, opacity: 0 });
          return mk(p, "circle", { r: s / 2, fill: ob.colore, opacity: 0 });
        });
      },
      t(o, T, k, s, a) {
        const b = BX(o), ux = (b.r - b.l) / 100, uy = (b.b - b.t) / 100;
        const occhio = (e, propri) => {
          const v = (p, d) => chiave(propri, p, k, chiave(occhi, p, k, d));
          e.dx += v("dx", 0) * ux * a; e.dy += v("dy", 0) * uy * a;
          e.w *= lerpK(1, num(v("larghezza", 1), 0.2, 2.5, 1), a); e.h *= lerpK(1, num(v("altezza", 1), 0.05, 2.5, 1), a);
          e.lb = Math.max(e.lb, num(v("sorriso", 0), 0, 1, 0) * a); e.lt = Math.max(e.lt, num(v("palpebra", 0), 0, 1, 0) * a);
          e.tilt += num(v("inclinazione", 0), -45, 45, 0) * a; e.op *= lerpK(1, num(v("visibile", 1), 0, 1, 1), a);
        };
        occhio(T.L, sin); occhio(T.R, des);
      },
      draw(o, t, k, s, a, g) {
        const b = BX(o), ux = (b.r - b.l) / 100, uy = (b.b - b.t) / 100;
        oggetti.forEach((ob, i) => {
          const n = g.n[i], c = ob.chiavi, x = b.l + chiave(c, "x", k, 50) * ux, y = b.t + chiave(c, "y", k, 50) * uy;
          const sc = chiave(c, "scala", k, 1) * (ob.forma === "cuore" || ob.forma === "stella" ? ob.dimensione * (b.r - b.l) / 100 / 4 : 1);
          n.setAttribute("transform", `translate(${f2(x)} ${f2(y)}) rotate(${f2(chiave(c, "rotazione", k, 0))}) scale(${f2(Math.max(0, sc))})`);
          n.setAttribute("opacity", f2(num(chiave(c, "opacita", k, 1), 0, 1, 1) * a));
        });
      },
    };
    // quando: date "MM-GG" o intervalli "MM-GG..MM-GG", ore "HH:MM-HH:MM"; senza "quando" va tra le sorprese di ogni giorno
    const q = spec.quando && typeof spec.quando === "object" ? spec.quando : null;
    const date = q && Array.isArray(q.date) ? q.date.map(String).filter((d) => /^\d{2}-\d{2}(\.\.\d{2}-\d{2})?$/.test(d)).slice(0, 20) : [];
    const ore = q && typeof q.ore === "string" && /^\d{2}:\d{2}-\d{2}:\d{2}$/.test(q.ore) ? q.ore : null;
    if (!date.length && !ore) EGGS[key].auto = true;
    Iris.customEggs = Iris.customEggs.filter((x) => x.id !== key).concat([{ id: key, nome: EGGS[key].nome, date, ore }]);
    return key;
  };
  // le animazioni personali che valgono adesso (date e ore scritte nel loro "quando")
  function customOggi(d) {
    const md = (d.getMonth() + 1) * 100 + d.getDate(), hm = d.getHours() * 60 + d.getMinutes();
    const toMd = (s) => +s.slice(0, 2) * 100 + +s.slice(3, 5), toHm = (s) => +s.slice(0, 2) * 60 + +s.slice(3, 5);
    return Iris.customEggs.filter((c) => {
      const okData = !c.date.length || c.date.some((x) => { const [a, b] = x.split(".."); const A = toMd(a), B = b ? toMd(b) : A; return A <= B ? md >= A && md <= B : md >= A || md <= B; });
      const okOra = !c.ore || (() => { const [a, b] = c.ore.split("-"), A = toHm(a), B = toHm(b); return A <= B ? hm >= A && hm < B : hm >= A || hm < B; })();
      return (c.date.length || c.ore) && okData && okOra;
    }).map((c) => c.id);
  }

  /* calendario: quali easter egg valgono oggi (e a quest'ora). birthday "GG/MM" dalle impostazioni */
  Iris.birthday = "";
  function easter(y) { // domenica di Pasqua (algoritmo anonimo gregoriano)
    const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(y, month - 1, day);
  }
  const dayDiff = (a, b) => Math.round((new Date(a.getFullYear(), a.getMonth(), a.getDate()) - new Date(b.getFullYear(), b.getMonth(), b.getDate())) / 86400000);
  function fullMoon(d) { const age = ((d.getTime() / 86400000 - 10957.76) % 29.530588853 + 29.530588853) % 29.530588853; return age > 13.4 && age < 16.2; } // dalla luna nuova del 6/1/2000
  Iris.CALENDARIO = [
    ["fuochi", "Capodanno", "31 dicembre e 1 gennaio"], ["befana", "Befana", "6 gennaio"], ["innamorato", "San Valentino", "14 febbraio"],
    ["maschera", "Carnevale", "da giovedì grasso a martedì grasso (si calcola dalla Pasqua)"], ["petali", "Primavera", "dal 20 marzo al 20 aprile"],
    ["pesce", "Pesce d'aprile", "1 aprile"], ["uovo", "Pasqua", "Pasqua e Pasquetta (si calcola ogni anno)"], ["frecce", "Festa della Repubblica e Liberazione", "2 giugno e 25 aprile"],
    ["sole", "Estate e Ferragosto", "dal 21 giugno al 31 luglio, e dal 10 al 20 agosto"], ["stella", "Notte di San Lorenzo", "dal 9 al 12 agosto"],
    ["foglie", "Autunno", "dal 22 settembre al 15 novembre"], ["fantasma", "Halloween", "dal 25 ottobre al 2 novembre (con la zucca)"],
    ["neve", "Natale", "dall'8 dicembre al 6 gennaio"], ["regalo", "Natale", "24, 25 e 26 dicembre"], ["torta", "Il tuo compleanno", "il giorno messo nelle impostazioni (con i coriandoli)"],
    ["gattonero", "Venerdì 17", "ogni venerdì 17"], ["luna", "Luna piena", "le notti di luna piena, dalle 21 alle 5"], ["caffe", "Buongiorno", "le mattine dalle 6:30 alle 9:30"],
    // feste nel mondo (il quarto campo le distingue nella demo)
    ["lanterne", "Capodanno cinese", "il giorno e i 2 seguenti (data lunare, tabella 2026-2035)", "mondo"],
    ["holi", "Holi (India)", "il giorno di Holi (data lunare, tabella 2026-2035)", "mondo"],
    ["pigreco", "Pi Day", "14 marzo (3/14)", "mondo"], ["trifoglio", "San Patrizio (Irlanda)", "17 marzo", "mondo"],
    ["sakura", "Hanami (Giappone)", "dal 25 marzo al 10 aprile", "mondo"], ["terra", "Giornata della Terra", "22 aprile", "mondo"],
    ["spada", "Star Wars Day", "4 maggio (\"May the 4th\")", "mondo"], ["usa", "Indipendenza USA", "4 luglio", "mondo"],
    ["francia", "Presa della Bastiglia (Francia)", "14 luglio", "mondo"], ["birra", "Oktoberfest (Germania)", "dal 19 settembre al 5 ottobre", "mondo"],
    ["diwali", "Diwali (India)", "il giorno e i 2 seguenti (data lunare, tabella 2026-2035)", "mondo"], ["muertos", "Día de los Muertos (Messico)", "1 e 2 novembre", "mondo"],
    ["tacchino", "Thanksgiving (USA)", "quarto giovedì di novembre", "mondo"],
  ];
  // feste a data lunare: giorno (MMGG) per anno. Fonti: calendari pubblicati; da allungare dopo il 2035
  const LUNARI = {
    lanterne: { 2026: 217, 2027: 206, 2028: 126, 2029: 213, 2030: 203, 2031: 123, 2032: 211, 2033: 131, 2034: 219, 2035: 208 },
    holi: { 2026: 304, 2027: 322, 2028: 311, 2029: 301, 2030: 320, 2031: 309, 2032: 327, 2033: 316, 2034: 305, 2035: 324 },
    diwali: { 2026: 1108, 2027: 1029, 2028: 1017, 2029: 1105, 2030: 1026, 2031: 1114, 2032: 1102, 2033: 1022, 2034: 1110, 2035: 1030 },
  };
  // sceglie un easter egg a sorpresa: nei giorni di festa 6 volte su 10 quello di stagione, mai lo stesso due volte di fila
  Iris.pickEgg = function (last) {
    const sea = Iris.seasonalEggs(new Date());
    let n = sea.length && Math.random() < 0.6 ? sea : Object.keys(EGGS).filter((e) => EGGS[e].auto !== false);
    if (n.length > 1) n = n.filter((e) => e !== last);
    return n[Math.floor(Math.random() * n.length)];
  };
  Iris.seasonalEggs = function (d) {
    const m = d.getMonth() + 1, g = d.getDate(), h = d.getHours() + d.getMinutes() / 60, out = [];
    const md = m * 100 + g, between = (a, b) => (a <= b ? md >= a && md <= b : md >= a || md <= b);
    const E = easter(d.getFullYear()), toE = dayDiff(d, E);
    if (between(1208, 106)) out.push("neve");
    if (between(1224, 1226)) out.push("regalo");
    if (between(1231, 101)) out.push("fuochi", "coriandoli");
    if (md === 106) out.push("befana");
    if (md === 214) out.push("innamorato");
    if (toE >= -52 && toE <= -47) out.push("maschera");
    if (toE === 0 || toE === 1) out.push("uovo");
    if (between(320, 420)) out.push("petali");
    if (md === 401) out.push("pesce");
    if (md === 602 || md === 425) out.push("frecce");
    if (between(621, 731) || between(810, 820)) out.push("sole");
    if (between(809, 812)) out.push("stella");
    if (between(922, 1115)) out.push("foglie");
    if (between(1025, 1102)) out.push("zucca", "fantasma");
    if (d.getDay() === 5 && g === 17) out.push("gattonero");
    if ((h >= 21 || h < 5) && fullMoon(d)) out.push("luna");
    if (h >= 6.5 && h < 9.5) out.push("caffe");
    // feste nel mondo
    const y = d.getFullYear(), entro = (mmgg, giorni) => { if (!mmgg) return false; const s = new Date(y, Math.floor(mmgg / 100) - 1, mmgg % 100); const k = dayDiff(d, s); return k >= 0 && k <= giorni; };
    if (entro(LUNARI.lanterne[y], 2)) out.push("lanterne");
    if (entro(LUNARI.holi[y], 0)) out.push("holi");
    if (entro(LUNARI.diwali[y], 2)) out.push("diwali");
    if (md === 314) out.push("pigreco");
    if (md === 317) out.push("trifoglio");
    if (between(325, 410)) out.push("sakura");
    if (md === 422) out.push("terra");
    if (md === 504) out.push("spada");
    if (md === 704) out.push("usa");
    if (md === 714) out.push("francia");
    if (between(919, 1005)) out.push("birra");
    if (md === 1101 || md === 1102) out.push("muertos");
    if (m === 11 && d.getDay() === 4 && g >= 22 && g <= 28) out.push("tacchino");
    const bd = /^(\d{1,2})\/(\d{1,2})$/.exec(Iris.birthday || "");
    if (bd && +bd[1] === g && +bd[2] === m) out.push("torta", "coriandoli");
    out.push(...customOggi(d)); // animazioni personali con il loro "quando"
    return out;
  };
  function eggTarget(o, t, T) {
    const g = o.egg, k = (t - g.start) / EGGS[g.name].dur, s = (t - g.start) / 1000;
    const inn = Math.min(1, k * 10), out = Math.min(1, (1 - k) * 10), a = Math.min(inn, out); // entra ed esce morbido
    if (g.name === "pong") {
      const b = pongBall(o, t);
      // le racchette inseguono la pallina, quella lontana con un po' di ritardo
      for (const [e, side] of [[T.L, -1], [T.R, 1]]) {
        Object.assign(e, { w: 3.6, h: o.island ? 11 : 15, rr: 1.6, lb: 0, lt: 0, tilt: 0, sc: 1 });
        e.dx = side * (o.island ? 68 : 22) * a;
        const near = side < 0 ? b.vx < 0 : b.vx > 0;
        e.dy = (b.y - (o.island ? 61 : 71)) * (near ? 0.9 : 0.45) * a;
      }
    } else if (g.name === "scanner") {
      const x = Math.sin(s * 2.4) * (o.island ? 64 : 18) * a;
      Object.assign(T.L, { w: 10, h: 5, rr: 2.5, dx: x + 14 * a, dy: 0, lb: 0, lt: 0 });
      Object.assign(T.R, { w: 10, h: 5, rr: 2.5, dx: x - 14 * a, dy: 0, lb: 0, lt: 0 });
    } else if (g.name === "music") {
      const hL = 6 + Math.abs(Math.sin(s * 7.1)) * 17, hR = 6 + Math.abs(Math.sin(s * 5.3 + 1.2)) * 17;
      Object.assign(T.L, { w: 9, h: hL, rr: 2.5, dy: (21 - hL) / 2, lb: 0, lt: 0 });
      Object.assign(T.R, { w: 9, h: hR, rr: 2.5, dy: (21 - hR) / 2, lb: 0, lt: 0 });
      T.body.y += -Math.abs(Math.sin(s * 3.5)) * 1.5; T.body.rot = Math.sin(s * 1.75) * 3;
    } else if (EGGS[g.name].t) EGGS[g.name].t(o, T, k, s, a, g.fx);
  }
  // pallina del pong: rimbalza tra le racchette e sui bordi alto/basso
  function pongBall(o, t) {
    const g = o.egg, s = (t - g.start) / 1000;
    const x0 = o.island ? -17.9 : 29, x1 = o.island ? 137.9 : 91, y0 = o.island ? 45 : 58, y1 = o.island ? 77 : 84;
    const sx = o.island ? 105 : 42, sy = o.island ? 30 : 23;
    const px = (x1 - x0), py = (y1 - y0);
    const tx = ((s * sx) % (2 * px) + 2 * px) % (2 * px), ty = ((s * sy + py * 0.3) % (2 * py) + 2 * py) % (2 * py);
    return { x: x0 + (tx < px ? tx : 2 * px - tx), y: y0 + (ty < py ? ty : 2 * py - ty), vx: tx < px ? 1 : -1 };
  }
  function drawEgg(o, t) {
    const show = o.egg && o.egg.name === "pong" && (t - o.egg.start) > 700 && (t - o.egg.start) < EGGS.pong.dur - 500;
    o.r.ball.setAttribute("opacity", show ? "1" : "0");
    if (show) { const b = pongBall(o, t); o.r.ball.setAttribute("cx", f2(b.x)); o.r.ball.setAttribute("cy", f2(b.y)); }
    if (o.egg && EGGS[o.egg.name].draw) { const g = o.egg, k = (t - g.start) / EGGS[g.name].dur, a = Math.min(1, k * 10, (1 - k) * 10); EGGS[g.name].draw(o, t, k, (t - g.start) / 1000, Math.max(0, a), g.fx); }
  }
  function startEgg(o, name, t) {
    if (o.egg) clearFx(o);
    o.egg = { name, start: t, fx: {} }; o.gesture = null;
    if (EGGS[name].color) o.svg.style.color = EGGS[name].color;
    if (EGGS[name].init) EGGS[name].init(o, o.egg.fx);
  }
  function endEgg(o, t) {
    clearFx(o); o.egg = null; o.svg.style.transition = "color .35s"; o.svg.style.color = COLOR[o.state] || COLOR.idle;
    o.gesture = { name: "smile", start: t, dir: 1, dy: 0 }; // finisce con un sorriso soddisfatto
  }

  function startVariant(o) {
    o.r.vfx.replaceChildren();
    const list = VARIANTS[o.state], pick = o.variants[o.state];
    let i = pick === "random" && list ? Math.floor(Math.random() * list.length) : pick || 0;
    if (!list || !list[i]) i = 0;
    o.vv = list && i ? { v: list[i], g: {} } : null;
    if (o.vv && o.vv.v.init) o.vv.v.init(o, o.vv.g);
  }
  function clearFx(o) { o.r.fx.replaceChildren(); o.r.fxb.replaceChildren(); }

  const lerp = (a, b, k) => a + (b - a) * k;
  function mix(a, b, k) { const o = {}; for (const key in b) o[key] = typeof b[key] === "object" ? mix(a[key], b[key], k) : lerp(a[key], b[key], k); return o; }
  function setRect(n, x, y, w, h, rx) { n.setAttribute("x", f2(x)); n.setAttribute("y", f2(y)); n.setAttribute("width", f2(Math.max(0, w))); n.setAttribute("height", f2(Math.max(0, h))); if (rx != null) n.setAttribute("rx", f2(rx)); }

  let uid = 0;
  const all = new Set();

  /** island=true: niente pillola, gli occhi stanno nel nero del contenitore */
  Iris.createEyes = function (el, opts = {}) {
    const id = "eyes" + uid++;
    const island = !!opts.island;
    const eye = (s) => `<clipPath id="${id}c${s}"><rect data-r="clip${s}"/></clipPath>
      <g clip-path="url(#${id}c${s})"><rect data-r="eye${s}" fill="currentColor"/><rect data-r="shine${s}" fill="#fff" opacity=".32"/>
      <rect data-r="lid${s}" fill="${FACE}"/><ellipse data-r="cheek${s}" fill="${FACE}"/></g>`;
    // island: la vista copre tutta l'area di gioco della tacca, cioè la tacca meno 5 px di bordo nero
    // (122×26 px, sempre 0,684 px per unità: occhi della stessa grandezza di prima)
    const vb = island ? "-29.2 42 178.4 38" : "0 30 120 76";
    el.innerHTML = `<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg" style="display:block;width:100%;height:100%;color:${COLOR.idle};transition:color .35s">
      <clipPath id="${id}b"><rect x="14" y="40" width="92" height="58" rx="29"/></clipPath>
      <g data-r="body">
        ${island ? "" : `<rect x="14" y="40" width="92" height="58" rx="29" fill="${FACE}"/>`}
        <g ${island ? "" : `clip-path="url(#${id}b)"`}>
          <g data-r="fxb"></g>${eye("L")}${eye("R")}<g data-r="fx"></g><g data-r="vfx"></g>
          <g data-r="dots" fill="currentColor" opacity="0"><circle cx="85" r="1.4"/><circle cx="91" r="1.85"/><circle cx="97.5" r="2.3"/></g>
          <circle data-r="ball" r="2.3" fill="currentColor" opacity="0"/>
          <g data-r="waves" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" opacity="0">
            <path d="M86 56 Q89.5 61 86 66"/><path d="M90.5 53 Q96 61 90.5 69"/><path d="M34 56 Q30.5 61 34 66"/><path d="M29.5 53 Q24 61 29.5 69"/></g>
          <g data-r="zz" fill="#94a3b8" font-family="system-ui" font-weight="700" opacity="0"><text data-r="z1" font-size="9">z</text><text data-r="z2" font-size="6.5">z</text></g>
          <g data-r="sweat" opacity="0"><path d="M0 -3 Q2.2 0 0 2 Q-2.2 0 0 -3Z" fill="#7dd3fc"/></g>
        </g>
      </g></svg>`;
    const r = {}; el.querySelectorAll("[data-r]").forEach((n) => (r[n.dataset.r] = n));
    const svg = el.querySelector("svg");
    const o = {
      island, r, svg, cur: null, state: "idle", prev: "idle", at: performance.now(), level: null,
      blinkT: -1, blinkDouble: false, nextBlink: performance.now() + 1500,
      look: { x: 0, y: 0 }, lookT: 0, gesture: null, nextGesture: performance.now() + 4000, idleLife: opts.idleLife !== false, autoEggs: opts.autoEggs !== false,
      setState(s) {
        if (s === this.state) return;
        this.prev = this.state; this.state = s; this.at = performance.now();
        if (this.prev !== "sleep" && !["done", "hello", "wink", "love", "laugh"].includes(s)) { this.blinkT = performance.now(); this.blinkDouble = false; }
        this.gesture = null; this.nextGesture = performance.now() + rnd(3000, 6000);
        svg.style.color = COLOR[s] || COLOR.idle;
        startVariant(this);
      },
      setLevel(v) { this.level = v; },
      // variante per uno stato: un numero (0 = classica) oppure "random" (a ogni volta una diversa)
      variants: {},
      setVariant(state, v) { this.variants[state] = v; if (state === this.state) startVariant(this); },
      playEgg(name) { if (this.state !== "idle") this.setState("idle"); startEgg(this, name || "pong", performance.now()); },
      stopEgg() { if (this.egg) endEgg(this, performance.now()); },
      // tocchi sugli occhi: 3 di fila = solletico, 7 = gira la testa
      poke() {
        const t = performance.now(); this.pokes = (this.pokes || []).filter((x) => t - x < 1500); this.pokes.push(t);
        if (this.state !== "idle") return;
        if (this.pokes.length >= 7) { this.pokes = []; startEgg(this, "giramento", t); }
        else if (this.pokes.length >= 3) { if (!this.egg || this.egg.name !== "solletico") startEgg(this, "solletico", t); else this.egg.start = t - 300; }
        else if (!this.egg) this.gesture = { name: "squint", start: t, dir: 1, dy: 0 };
      },
      // segue un punto (x, y tra -1 e 1); null = torna a guardarsi intorno
      lookAt(x, y) { this.follow = x == null ? null : { x: clamp(x, -1, 1), y: clamp(y, -1, 1) }; },
      destroy() { all.delete(o); },
    };
    all.add(o);
    return o;
  };

  function blinkAmount(o, t) {
    const no = !!o.egg || ["sleep", "error", "done", "love", "laugh", "hello", "wink", "sleepy"].includes(o.state);
    if (o.blinkT < 0 && t > o.nextBlink && !no) { o.blinkT = t; o.blinkDouble = Math.random() < 0.22; o.nextBlink = t + rnd(2200, 6000); }
    if (o.blinkT < 0) return 0;
    const len = o.blinkDouble ? 380 : 150, p = (t - o.blinkT) / len;
    if (p >= 1) { o.blinkT = -1; return 0; }
    return o.blinkDouble ? Math.abs(Math.sin(p * Math.PI * 2)) : Math.sin(p * Math.PI);
  }

  function drawEye(r, s, p, cx, cy, blink) {
    const w = p.w * p.sc, h = p.h * p.sc, x = cx - w / 2 + p.dx, y = cy - h / 2 + p.dy, rr = Math.min(p.rr, w / 2, h / 2);
    setRect(r["eye" + s], x, y, w, h, rr); setRect(r["clip" + s], x - 0.9, y - 0.9, w + 1.8, h + 1.8, rr + 0.9);
    r["eye" + s].setAttribute("opacity", f2(p.op));
    const lt = Math.min(1, Math.max(p.lt, blink)), lidY = y + lt * h, sign = s === "L" ? 1 : -1;
    setRect(r["lid" + s], x - 6, lidY - 40, w + 12, 40);
    r["lid" + s].setAttribute("transform", `rotate(${f2(p.tilt * sign)} ${f2(x + w / 2)} ${f2(lidY)})`);
    const ch = r["cheek" + s], ry = h * 0.62;
    ch.setAttribute("cx", f2(x + w / 2)); ch.setAttribute("rx", f2(w * 0.95)); ch.setAttribute("ry", f2(ry)); ch.setAttribute("cy", f2(y + h + ry - p.lb * h * 1.15));
    setRect(r["shine" + s], x + w * 0.18, y + h * 0.14, w * 0.22, h * 0.22, w * 0.11); r["shine" + s].setAttribute("opacity", f2(0.32 * p.op));
  }

  function step(o, t) {
    const ts = t - o.at;
    if (o.follow) { o.look.x = o.follow.x * 5; o.look.y = o.follow.y * 3.5; o.lookT = t + 1500; }
    else if (t > o.lookT) { o.lookT = t + rnd(900, 3500); const big = Math.random() < 0.25; o.look.x = big ? rnd(-4, 4) : rnd(-1.4, 1.4); o.look.y = big ? rnd(-2.2, 2.2) : rnd(-0.8, 0.8); }
    const T = target(o.state, t, ts, o.level);
    const lvl = o.level != null ? o.level : (Math.sin(t / 111) * 0.5 + 0.5) * (Math.sin(t / 435) * 0.5 + 0.5);
    if (o.vv && o.vv.v.t) o.vv.v.t(o, T, ts, t / 1000, lvl, o.vv.g);
    const damp = o.egg ? 0 : ["tool", "thinking", "transcribing", "error", "dizzy", "shy", "scared"].includes(o.state) ? 0.2 : 1;
    for (const k of ["L", "R"]) { T[k].dx += o.look.x * damp; T[k].dy += o.look.y * damp; }
    if (o.egg && o.state !== "idle") endEgg(o, t);
    if (o.egg) { if (t - o.egg.start > EGGS[o.egg.name].dur) endEgg(o, t); else eggTarget(o, t, T); }
    if (o.state === "idle" && o.idleLife && !o.egg) {
      // annoiato (a riposo da più di 45 s): ogni tanto, al posto di un gesto, parte un easter egg
      // easter egg rari: solo dopo 2 minuti fermo, una volta ogni tanto, e poi passano 3-7 minuti prima del prossimo.
      // Nei giorni (o nelle ore) giusti, 6 volte su 10 parte quello di stagione. Mai lo stesso due volte di fila.
      if (o.autoEggs && !o.gesture && t > o.nextGesture && ts > 120000 && t > (o.nextEgg || 0) && Math.random() < 0.08) {
        const sea = Iris.seasonalEggs ? Iris.seasonalEggs(new Date()) : [];
        let n = sea.length && Math.random() < 0.6 ? sea : Object.keys(EGGS).filter((e) => EGGS[e].auto !== false);
        if (n.length > 1) n = n.filter((e) => e !== o.lastEgg);
        o.lastEgg = n[Math.floor(Math.random() * n.length)];
        startEgg(o, o.lastEgg, t); o.nextGesture = t + rnd(20000, 40000); o.nextEgg = t + rnd(180000, 420000);
      }
      if (!o.gesture && !o.egg && t > o.nextGesture) {
        const names = Object.keys(GESTURES), w = (n) => (n === "yawn" && ts > 20000 ? 2 : GESTURES[n].w);
        let x = Math.random() * names.reduce((a, n) => a + w(n), 0), name = names[0];
        for (const n of names) { x -= w(n); if (x <= 0) { name = n; break; } }
        o.gesture = { name, start: t, dir: Math.random() < 0.5 ? -1 : 1, dy: rnd(-2, 1.5) };
      }
      if (o.gesture) { const g = GESTURES[o.gesture.name], k = (t - o.gesture.start) / g.dur; if (k >= 1) { o.gesture = null; o.nextGesture = t + rnd(2500, 7000); } else g.f(k, T, o.gesture); }
    }
    if (o.prev === "sleep" && o.state !== "sleep" && ts < 700) { const k = ts / 700; T.L.lt = Math.max(T.L.lt, Math.abs(Math.cos(k * Math.PI * 2)) * (1 - k)); T.R.lt = T.L.lt; T.body.y -= Math.sin(k * Math.PI) * 4; }
    if (!o.cur) o.cur = JSON.parse(JSON.stringify(T));
    o.cur = mix(o.cur, T, 0.17);
    const c = o.cur, r = o.r, blink = blinkAmount(o, t), cy = o.island ? 61 : 71;
    drawEye(r, "L", c.L, 46, cy, blink); drawEye(r, "R", c.R, 74, cy, blink);
    const b = c.body;
    r.body.setAttribute("transform", `translate(${f2(b.x)} ${f2(b.y)}) rotate(${f2(b.rot)} 60 98) translate(60 98) scale(${b.sx.toFixed(4)} ${b.sy.toFixed(4)}) translate(-60 -98)`);
    // puntini a scalare, salgono verso destra; restano dentro la bolla
    const dy = o.island ? [50, 47.5, 45] : [56, 53, 50];
    r.dots.setAttribute("opacity", f2(c.dots));
    if (c.dots > 0.02) [...r.dots.children].forEach((d, i) => { const k = Math.max(0, Math.sin(t / 170 - i * 0.9)); d.setAttribute("cy", f2(dy[i] - k * 1.8)); d.setAttribute("opacity", f2(0.45 + k * 0.55)); });
    drawEgg(o, t);
    if (o.vv && o.vv.v.draw) o.vv.v.draw(o, t, ts, t / 1000, lvl, o.vv.g);
    r.waves.setAttribute("opacity", f2(c.waves));
    if (c.waves > 0.02) {
      const ws = [...r.waves.children], dyw = o.island ? 0 : 10;
      r.waves.setAttribute("transform", `translate(0 ${dyw})`);
      ws.forEach((w, i) => { const k = i % 2, beat = Math.max(0, Math.sin(t / 200 - k * 1.1)); w.setAttribute("opacity", f2(0.25 + 0.75 * Math.min(1, c.lvl * 1.6 + beat * 0.35) * (k ? 0.8 : 1))); });
    }
    r.zz.setAttribute("opacity", f2(c.zz));
    if (c.zz > 0.02) {
      const base = o.island ? { x: 83, y: 56 } : { x: 86, y: 62 };
      [[r.z1, 0], [r.z2, 0.5]].forEach(([z, off]) => { const k = (t / 2600 + off) % 1; z.setAttribute("x", f2(base.x + k * 5 + (off ? 4 : 0))); z.setAttribute("y", f2(base.y - k * (o.island ? 8 : 12))); z.setAttribute("opacity", f2(Math.sin(k * Math.PI))); });
    }
    if (c.sweat > 0.02) { const k = (t / 1600) % 1; r.sweat.setAttribute("transform", `translate(${o.island ? 86 : 88} ${f2((o.island ? 50 : 56) + k * 6)})`); r.sweat.setAttribute("opacity", f2(c.sweat * (1 - k))); }
    else r.sweat.setAttribute("opacity", "0");
  }

  function loop(t) { all.forEach((o) => { if (o.svg.isConnected) step(o, t); }); requestAnimationFrame(loop); }
  requestAnimationFrame(loop);
})();
