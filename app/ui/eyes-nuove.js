/* Iris: 50 animazioni nuove (proposte del 04/10, sera), da provare prima di metterle nell'app.
   24 varianti degli stati (3 per stato) e 26 easter egg. Si appoggiano al motore di eyes.js:
   - variante: { name, desc, nuova, init(o, g), t(o, T, ts, s, lvl, g), draw(o, t, ts, s, lvl, g) }
   - easter egg: { dur, color, auto, nome, desc, nuova, init(o, g), t(o, T, k, s, a, g), draw(o, t, k, s, a, g) }
   Coordinate della tacca: occhi centrati in x 46 e 74, y 61; area visibile x -27…147, y 43…79. */
(function () {
  const Iris = window.Iris;
  const { mk, clamp, CY, BX, prand, f2, STAR, HEART } = Iris._fx;
  const tr = (n, x, y, sc = 1, rot = 0) => n.setAttribute("transform", `translate(${f2(x)} ${f2(y)}) rotate(${f2(rot)}) scale(${f2(Math.max(0, sc))})`);
  const op = (n, v) => n.setAttribute("opacity", f2(clamp(v, 0, 1)));
  const ease = (k) => k * k * (3 - 2 * k);
  const seg = (k, a, b) => clamp((k - a) / (b - a), 0, 1); // avanzamento dentro un tratto
  // gli occhi guardano il punto (x, y), con forza a
  const look = (T, x, y, a = 1) => { for (const [e, cx] of [[T.L, 46], [T.R, 74]]) { e.dx = clamp((x - cx) * 0.2, -5, 5) * a; e.dy = clamp((y - 61) * 0.35, -4, 4) * a; } };
  const both = (T, f) => { f(T.L); f(T.R); };
  const NOTE = "M1.6 -5 V1.4 A1.8 1.4 0 1 1 0.2 0.1 V-5 Z M1.6 -5 L4.4 -3.6 V-2.2 L1.6 -3.6Z";

  /* =============== VARIANTI DEGLI STATI =============== */
  const V = {
    listening: [
      { name: "Onda sonora", desc: "Sotto gli occhi corre una linea che si muove con la tua voce, come un registratore.",
        init(o, g) { g.p = mk(o.r.vfx, "path", { fill: "none", stroke: "currentColor", "stroke-width": 1.4, "stroke-linecap": "round" }); },
        t(o, T) { T.waves = 0; T.body.rot = 0; both(T, (e) => { e.h = 18; e.dy = -2.5; }); },
        draw(o, t, ts, s, lvl, g) { let d = ""; for (let i = 0; i <= 28; i++) { const x = 28 + i * 2.3, y = 75.5 + Math.sin(i * 0.95 - s * 13) * (0.4 + lvl * 3) * Math.sin((Math.PI * i) / 28); d += (i ? "L" : "M") + f2(x) + " " + f2(y); } g.p.setAttribute("d", d); } },
      { name: "Microfono", desc: "Un microfonino accanto agli occhi, con gli anelli che pulsano quando parli più forte.",
        init(o, g) { const m = mk(o.r.vfx, "g", {}); mk(m, "rect", { x: -2.4, y: -6, width: 4.8, height: 8, rx: 2.4, fill: "currentColor" }); mk(m, "path", { d: "M-4 -1 a4 4 0 0 0 8 0 M0 3 v3 M-2.5 6 h5", fill: "none", stroke: "currentColor", "stroke-width": 1.1, "stroke-linecap": "round" }); g.m = m; g.r = [0, 1].map(() => mk(o.r.vfx, "circle", { r: 6, fill: "none", stroke: "currentColor", "stroke-width": 0.9 })); },
        t(o, T, ts, s, lvl) { T.waves = 0; T.body.rot = -3; both(T, (e) => { e.dx = 3; e.sc = 1 + lvl * 0.06; }); },
        draw(o, t, ts, s, lvl, g) { tr(g.m, 104, CY(o) - 1); g.r.forEach((c, i) => { const k = (s * 1.3 + i / 2) % 1; c.setAttribute("cx", 104); c.setAttribute("cy", f2(CY(o) - 3)); c.setAttribute("r", f2(7 + k * 9)); op(c, (1 - k) * (0.2 + lvl)); }); } },
      { name: "Mano all'orecchio", desc: "Si sporge verso di te con la \"mano\" all'orecchio, per sentire meglio.",
        init(o, g) { g.h = mk(o.r.vfx, "path", { d: "M0 -6 q5 0 5 6 q0 6 -5 6 M1.5 -3 q2 0 2 3 q0 3 -2 3", fill: "none", stroke: "currentColor", "stroke-width": 1.6, "stroke-linecap": "round" }); },
        t(o, T, ts, s, lvl) { T.waves = 0; T.body.rot = -7 + Math.sin(s * 2) * 1; T.L.h = 19; T.R.h = 23 + lvl * 2; T.R.w = 16.5; both(T, (e) => { e.dx = 2.5; }); },
        draw(o, t, ts, s, lvl, g) { tr(g.h, 92 + lvl * 1.5, CY(o), 1 + lvl * 0.15); } },
    ],
    thinking: [
      { name: "Lampadina", desc: "Guarda in alto a destra: una lampadina prova ad accendersi, sfarfalla e alla fine si illumina.",
        init(o, g) { g.b = mk(o.r.vfx, "g", {}); g.glass = mk(g.b, "circle", { cy: -1.5, r: 3.6, fill: "#475569" }); mk(g.b, "rect", { x: -1.8, y: 1.8, width: 3.6, height: 2.6, rx: 0.6, fill: "#94a3b8" }); g.rays = mk(g.b, "g", { stroke: "#fde68a", "stroke-width": 0.9, "stroke-linecap": "round" }); for (let i = 0; i < 7; i++) { const an = (-90 + (i - 3) * 30) * Math.PI / 180; mk(g.rays, "line", { x1: f2(Math.cos(an) * 5.4), y1: f2(-1.5 + Math.sin(an) * 5.4), x2: f2(Math.cos(an) * 7.4), y2: f2(-1.5 + Math.sin(an) * 7.4) }); } },
        t(o, T) { T.dots = 0; both(T, (e) => { e.dx = 3; e.dy = -4; e.h = 18; e.lb = 0.1; }); },
        draw(o, t, ts, s, lvl, g) { const k = (s % 3.2) / 3.2; const on = k > 0.82 || (k > 0.6 && Math.sin(t / 37) > 0.3); g.glass.setAttribute("fill", on ? "#fde047" : "#475569"); op(g.rays, on ? 1 : 0); tr(g.b, 101, 50); } },
      { name: "Clessidra", desc: "Una clessidra accanto agli occhi: la sabbia scende, poi si capovolge e ricomincia.",
        init(o, g) { const c = mk(o.r.vfx, "g", {}); mk(c, "path", { d: "M-3.6 -5 h7.2 M-3.6 5 h7.2 M-3 -5 L0 0 L-3 5 M3 -5 L0 0 L3 5", fill: "none", stroke: "currentColor", "stroke-width": 1, "stroke-linecap": "round" }); g.top = mk(c, "path", { fill: "#fde68a" }); g.bot = mk(c, "path", { fill: "#fde68a" }); g.c = c; },
        t(o, T, ts, s) { T.dots = 0; both(T, (e) => { e.lt = 0.25; e.h = 18; e.dx = 2.5; e.dy = -1; }); },
        draw(o, t, ts, s, lvl, g) { const P = 2.6, k = (s % P) / P, fill = clamp(k / 0.85, 0, 1), flip = k > 0.85 ? ease((k - 0.85) / 0.15) : 0;
          const a = 1 - fill, w = 2.6 * Math.sqrt(a), h1 = 4.2 * Math.sqrt(a); g.top.setAttribute("d", `M${f2(-w)} ${f2(-h1)} L${f2(w)} ${f2(-h1)} L0 0Z`);
          const w2 = 2.6 * Math.sqrt(fill), h2 = 4.2 * Math.sqrt(fill); g.bot.setAttribute("d", `M${f2(-w2)} 4.6 L${f2(w2)} 4.6 L0 ${f2(4.6 - h2)}Z`);
          tr(g.c, 102, CY(o), 1, flip * 180); } },
      { name: "Di qua e di là", desc: "Guarda in alto a sinistra, poi in alto a destra, con un sopracciglio alzato: ci sta ragionando su.",
        t(o, T, ts, s) { T.dots = 0; const side = Math.floor(s / 1.3) % 2 ? 1 : -1, k = ease(clamp(((s % 1.3) / 1.3) * 4, 0, 1)), x = side * (-1 + 2 * k);
          both(T, (e) => { e.dx = x * 4.5 * side * side; e.dy = -3.5; e.h = 19; }); if (side > 0) { T.R.lt = 0.05; T.L.lt = 0.25; T.L.tilt = -8; } else { T.L.lt = 0.05; T.R.lt = 0.25; T.R.tilt = -8; } T.body.rot = x * 2.5; } },
    ],
    tool: [
      { name: "Radar", desc: "Un piccolo radar accanto agli occhi: la linea gira e ogni tanto trova qualcosa.",
        init(o, g) { const r = mk(o.r.vfx, "g", {}); mk(r, "circle", { r: 8, fill: "none", stroke: "currentColor", "stroke-width": 0.7, opacity: 0.45 }); mk(r, "circle", { r: 4, fill: "none", stroke: "currentColor", "stroke-width": 0.5, opacity: 0.3 }); g.l = mk(r, "line", { x1: 0, y1: 0, x2: 0, y2: -8, stroke: "currentColor", "stroke-width": 1.1, "stroke-linecap": "round" }); g.d = mk(r, "circle", { r: 1.2, fill: "#4ade80" }); g.r = r; },
        t(o, T, ts, s) { const an = s * 2.4; both(T, (e) => { e.lt = 0.2; e.h = 17; e.dx = 2.5 + Math.cos(an) * 1.5; e.dy = Math.sin(an) * 1; }); },
        draw(o, t, ts, s, lvl, g) { tr(g.r, 104, CY(o)); const an = (s * 140) % 360; g.l.setAttribute("transform", `rotate(${f2(an)})`); const blip = 210, d = ((an - blip + 360) % 360) / 360; g.d.setAttribute("cx", f2(Math.sin(blip * Math.PI / 180) * 5)); g.d.setAttribute("cy", f2(-Math.cos(blip * Math.PI / 180) * 5)); op(g.d, 1 - d * 1.4); } },
      { name: "Barra di avanzamento", desc: "Una barra che si riempie sotto gli occhi; lo sguardo segue il punto in cui è arrivata.",
        init(o, g) { mk(o.r.vfx, "rect", { x: 34, y: 74.6, width: 52, height: 2.4, rx: 1.2, fill: "currentColor", opacity: 0.18 }); g.f = mk(o.r.vfx, "rect", { x: 34, y: 74.6, height: 2.4, rx: 1.2, fill: "currentColor" }); },
        t(o, T, ts, s) { const k = (s % 2.6) / 2.6; both(T, (e) => { e.dx = -4 + k * 8; e.dy = 2; e.lt = 0.2; e.h = 17; }); },
        draw(o, t, ts, s, lvl, g) { const k = (s % 2.6) / 2.6; g.f.setAttribute("width", f2(52 * ease(clamp(k / 0.9, 0, 1)))); op(g.f, k > 0.95 ? 0.4 : 1); } },
    ],
    replying: [
      { name: "Fumetto", desc: "Accanto agli occhi compare una nuvoletta con i tre puntini, come quando qualcuno sta scrivendo in chat.",
        init(o, g) { const b = mk(o.r.vfx, "g", {}); mk(b, "path", { d: "M-8 -5 h16 a3 3 0 0 1 3 3 v4 a3 3 0 0 1 -3 3 h-12 l-4 3 v-3 a3 3 0 0 1 -3 -3 v-4 a3 3 0 0 1 3 -3z", fill: "none", stroke: "currentColor", "stroke-width": 1 }); g.d = [-4, 0, 4].map((x) => mk(b, "circle", { cx: x, cy: 0, r: 1.2, fill: "currentColor" })); g.b = b; },
        t(o, T, ts, s) { const y = Math.abs(Math.sin(s * 7.5)) * 0.8; both(T, (e) => { e.lb = 0.25; e.dy = -y - 1; e.dx = -2; }); },
        draw(o, t, ts, s, lvl, g) { tr(g.b, 104, CY(o) - 3); g.d.forEach((d, i) => { const k = Math.max(0, Math.sin(s * 7 - i * 0.9)); d.setAttribute("cy", f2(-k * 1.4)); op(d, 0.4 + k * 0.6); }); } },
      { name: "Matita", desc: "Una matita scrive una riga sotto gli occhi, che la seguono parola per parola.",
        init(o, g) { g.l = mk(o.r.vfx, "path", { d: "M32 76 q3 -2.5 6 0 t6 0 t6 0 t6 0 t6 0 t6 0 t6 0 t6 0", fill: "none", stroke: "currentColor", "stroke-width": 1.1, "stroke-linecap": "round", "stroke-dasharray": 60, "stroke-dashoffset": 60 }); const p = mk(o.r.vfx, "g", {}); mk(p, "path", { d: "M0 0 l1.2 -3 l6 -6 l1.8 1.8 l-6 6z", fill: "#fbbf24" }); mk(p, "path", { d: "M0 0 l1.2 -3 l1.8 1.8z", fill: "#f1f5f9" }); g.p = p; },
        t(o, T, ts, s) { const k = (s % 2.4) / 2.4; both(T, (e) => { e.dx = -5 + k * 10; e.dy = 2.5; e.h = 18; e.lb = 0.15; }); },
        draw(o, t, ts, s, lvl, g) { const k = clamp(((s % 2.4) / 2.4) / 0.9, 0, 1); g.l.setAttribute("stroke-dashoffset", f2(60 * (1 - k))); tr(g.p, 32 + k * 48, 76 + Math.sin(k * 50) * 1.2); op(g.l, (s % 2.4) / 2.4 > 0.95 ? 0 : 1); } },
      { name: "A turno", desc: "Gli occhi saltellano a turno, uno e poi l'altro, come chi racconta con entusiasmo.",
        t(o, T, ts, s) { const a = Math.max(0, Math.sin(s * 8)), b = Math.max(0, Math.sin(s * 8 + Math.PI)); T.L.dy = -a * 3; T.L.h = 19 + a * 3; T.R.dy = -b * 3; T.R.h = 19 + b * 3; T.body.rot = (a - b) * 2; T.L.lb = T.R.lb = 0.2; } },
    ],
    done: [
      { name: "Stelline", desc: "Tre stelline spuntano intorno agli occhi felici, una dopo l'altra.",
        init(o, g) { g.s = [[30, 49, "#fde68a"], [92, 47, "#fff"], [90, 75, "#a5f3fc"]].map(([x, y, c]) => ({ n: mk(o.r.vfx, "path", { d: STAR, fill: c, opacity: 0 }), x, y })); },
        t(o, T) { T.L.lb = T.R.lb = 0.55; },
        draw(o, t, ts, s, lvl, g) { g.s.forEach((p, i) => { const k = clamp((ts - 120 - i * 220) / 700, 0, 1), sc = Math.sin(k * Math.PI) * 1.4; tr(p.n, p.x, p.y, sc, ts / 5); op(p.n, k > 0 && k < 1 ? 1 : 0); }); } },
      { name: "Inchino", desc: "Fa un piccolo inchino soddisfatto, poi torna su sorridendo.",
        t(o, T, ts) { const k = clamp(ts / 1100, 0, 1), b = Math.sin(k * Math.PI); T.body.y += b * 5; T.body.sy = 1 - b * 0.06; both(T, (e) => { e.lb = 0.55; e.lt = b * 0.35; e.dy = b * 2; }); } },
      { name: "Raggi", desc: "Una raggiera di trattini si allarga dagli occhi, come un piccolo applauso.",
        init(o, g) { g.r = Array.from({ length: 10 }, (_, i) => ({ n: mk(o.r.vfx, "line", { stroke: "currentColor", "stroke-width": 1.3, "stroke-linecap": "round", opacity: 0 }), an: (i / 10) * Math.PI * 2 })); },
        t(o, T, ts) { T.L.lb = T.R.lb = 0.5; if (ts < 400) { const k = Math.sin((ts / 400) * Math.PI); T.L.sc = T.R.sc = 1 + k * 0.12; } },
        draw(o, t, ts, s, lvl, g) { const k = clamp(ts / 800, 0, 1); g.r.forEach((r) => { const r1 = 16 + k * 14, r2 = r1 + 4; r.n.setAttribute("x1", f2(60 + Math.cos(r.an) * r1 * 1.6)); r.n.setAttribute("y1", f2(61 + Math.sin(r.an) * r1 * 0.55)); r.n.setAttribute("x2", f2(60 + Math.cos(r.an) * r2 * 1.6)); r.n.setAttribute("y2", f2(61 + Math.sin(r.an) * r2 * 0.55)); op(r.n, (1 - k) * 1.2); }); } },
    ],
    approval: [
      { name: "Punto di domanda", desc: "Testa inclinata e un punto di domanda che oscilla: \"posso?\".",
        init(o, g) { g.q = mk(o.r.vfx, "text", { "font-size": 13, "font-weight": 800, "font-family": "system-ui,sans-serif", "text-anchor": "middle", fill: "currentColor" }); g.q.textContent = "?"; },
        t(o, T, ts, s) { T.body.y = 0; T.body.rot = -6 + Math.sin(s * 2) * 1.5; both(T, (e) => { e.w = 17; e.h = 23; e.rr = 8.5; }); T.L.h = 21; },
        draw(o, t, ts, s, lvl, g) { tr(g.q, 100, CY(o) + 5 - Math.abs(Math.sin(s * 4)) * 2, 1, Math.sin(s * 3) * 12); } },
      { name: "Bussa", desc: "Toc toc: bussa due volte e sbircia, aspettando che gli apri.",
        init(o, g) { g.k = [0, 1].map(() => mk(o.r.vfx, "path", { d: "M0 -3 q2.5 3 0 6", fill: "none", stroke: "currentColor", "stroke-width": 1.4, "stroke-linecap": "round", opacity: 0 })); },
        t(o, T, ts, s) { const k = (s % 1.6) / 1.6, knock = (k < 0.1 ? Math.sin((k / 0.1) * Math.PI) : 0) + (k > 0.2 && k < 0.3 ? Math.sin(((k - 0.2) / 0.1) * Math.PI) : 0);
          T.body.y = 0; T.body.x = knock * 2; both(T, (e) => { e.w = 16; e.h = 22; e.rr = 8; e.dx = 3; e.lt = 0.15; }); },
        draw(o, t, ts, s, lvl, g) { const k = (s % 1.6) / 1.6; g.k.forEach((n, i) => { const a = i === 0 ? (k < 0.4 ? 1 - k / 0.4 : 0) : (k > 0.2 && k < 0.6 ? 1 - (k - 0.2) / 0.4 : 0); tr(n, 96 + i * 4, CY(o)); op(n, a); }); } },
      { name: "Cornice che pulsa", desc: "Un anello intorno agli occhi si accende e si allarga a ritmo, come una notifica che chiede attenzione.",
        init(o, g) { g.r = [0, 1].map(() => mk(o.r.vfx, "rect", { fill: "none", stroke: "currentColor", "stroke-width": 1.2 })); },
        t(o, T, ts, s) { T.body.y = 0; both(T, (e) => { e.w = 17; e.h = 23; e.rr = 8.5; }); const p = Math.max(0, Math.sin(s * 5)); T.L.sc = T.R.sc = 1 + p * 0.05; },
        draw(o, t, ts, s, lvl, g) { g.r.forEach((r, i) => { const k = (s * 0.9 + i / 2) % 1, w = 48 + k * 30, h = 26 + k * 12; r.setAttribute("x", f2(60 - w / 2)); r.setAttribute("y", f2(61 - h / 2)); r.setAttribute("width", f2(w)); r.setAttribute("height", f2(h)); r.setAttribute("rx", f2(h / 2)); op(r, (1 - k) * 0.8); }); } },
    ],
    error: [
      { name: "Nuvoletta", desc: "Una nuvoletta grigia piove proprio sopra di lui; occhi tristi.",
        init(o, g) { const c = mk(o.r.vfx, "g", { fill: "#64748b" }); [[-4, 0, 3.2], [0, -2, 4], [4, 0, 3.2]].forEach(([x, y, r]) => mk(c, "circle", { cx: x, cy: y, r })); mk(c, "rect", { x: -7, y: 0, width: 14, height: 3, rx: 1.5 }); g.c = c; g.d = Array.from({ length: 5 }, (_, i) => ({ n: mk(o.r.vfx, "line", { stroke: "#7dd3fc", "stroke-width": 0.9, "stroke-linecap": "round" }), x: -5 + i * 2.5, off: prand(i) })); },
        t(o, T) { T.sweat = 0; both(T, (e) => { e.lt = 0.3; e.tilt = -18; e.dy = 2; e.h = 19; }); T.body.y += 1.5; },
        draw(o, t, ts, s, lvl, g) { const cx = 60 + Math.sin(s * 0.8) * 3; tr(g.c, cx, 46); g.d.forEach((d) => { const k = (s * 1.6 + d.off) % 1, y = 50 + k * 14; d.n.setAttribute("x1", f2(cx + d.x)); d.n.setAttribute("x2", f2(cx + d.x - 0.5)); d.n.setAttribute("y1", f2(y)); d.n.setAttribute("y2", f2(y + 2.2)); op(d.n, 1 - k); }); } },
      { name: "Spirali", desc: "Gli occhi diventano due spirali che girano: un po' frastornato.",
        init(o, g) { g.sp = [46, 74].map(() => { let d = "M0 0"; for (let i = 1; i <= 40; i++) { const an = i * 0.45, r = i * 0.21; d += ` L${f2(Math.cos(an) * r)} ${f2(Math.sin(an) * r)}`; } return mk(o.r.vfx, "path", { d, fill: "none", stroke: "currentColor", "stroke-width": 1.5, "stroke-linecap": "round" }); }); },
        t(o, T, ts, s) { T.L.op = T.R.op = 0; T.sweat = 0; T.body.rot = Math.sin(s * 3) * 3; },
        draw(o, t, ts, s, lvl, g) { g.sp.forEach((p, i) => tr(p, i ? 74 : 46, CY(o), 1, (i ? -1 : 1) * s * 260)); } },
      { name: "Cortocircuito", desc: "Scintille a zigzag e occhi che sfarfallano, come un piccolo cortocircuito.",
        init(o, g) { g.z = [0, 1, 2].map(() => mk(o.r.vfx, "path", { d: "M0 0 l2 -3 l-1 2 l3 -1 l-2 3", fill: "none", stroke: "#fde047", "stroke-width": 1, "stroke-linejoin": "round", opacity: 0 })); g.next = 0; },
        t(o, T, ts, s) { const fl = Math.sin(s * 47) * Math.sin(s * 13) > 0.3 ? 0.35 : 1; both(T, (e) => { e.h = 5; e.w = 16; e.rr = 2; e.op = fl; }); T.body.x = Math.sin(s * 60) * 0.6; T.sweat = 1; },
        draw(o, t, ts, s, lvl, g) { if (t > g.next) { g.next = t + 120; g.z.forEach((z) => { if (Math.random() < 0.5) { tr(z, [30, 60, 90][Math.floor(Math.random() * 3)] + (Math.random() - 0.5) * 10, 50 + Math.random() * 22, 1.2, Math.random() * 360); op(z, 1); } else op(z, 0); }); } } },
    ],
    sleep: [
      { name: "Pecorelle", desc: "Occhi chiusi, e sotto passano le pecorelle che saltano lo steccato: le sta contando.",
        init(o, g) { mk(o.r.vfx, "path", { d: "M96 78 v-6 M100 78 v-6 M94.5 74 h7.5", stroke: "#94a3b8", "stroke-width": 0.9, "stroke-linecap": "round" }); g.sh = [0, 1].map(() => { const p = mk(o.r.vfx, "g", {}); mk(p, "ellipse", { rx: 3, ry: 2.1, fill: "#f1f5f9" }); mk(p, "circle", { cx: 2.8, cy: -0.8, r: 1.2, fill: "#334155" }); mk(p, "path", { d: "M-1.6 1.8 v1.6 M1.4 1.8 v1.6", stroke: "#334155", "stroke-width": 0.6 }); return p; }); },
        t(o, T) { T.zz = 0; both(T, (e) => { e.lt = 0.86; e.op = 0.5; }); },
        draw(o, t, ts, s, lvl, g) { g.sh.forEach((p, i) => { const k = (s * 0.32 + i * 0.5) % 1, x = 78 + k * 44, jump = Math.max(0, Math.sin(((x - 90) / 16) * Math.PI)) * (x > 90 && x < 106 ? 1 : 0); tr(p, x, 74.5 - jump * 7); op(p, k < 0.08 ? k / 0.08 : k > 0.9 ? (1 - k) / 0.1 : 1); }); } },
      { name: "Luna e stelle", desc: "Dorme sotto una falce di luna, con le stelline che si accendono piano.",
        init(o, g) { g.m = mk(o.r.vfx, "path", { d: "M0 -5 a5 5 0 1 0 4.2 7.6 a4 4 0 1 1 -4.2 -7.6z", fill: "#fde68a" }); g.st = [[-14, 50], [126, 48], [134, 70], [-6, 72], [14, 46]].map(([x, y], i) => ({ n: mk(o.r.vfx, "path", { d: STAR, fill: "#fff" }), x, y, ph: i * 1.3 })); },
        t(o, T, ts, s) { T.zz = 0; both(T, (e) => { e.lt = 0.88; e.op = 0.5; }); T.body.y = Math.sin(s) * 1.2; },
        draw(o, t, ts, s, lvl, g) { tr(g.m, 108, 52, 1, Math.sin(s * 0.6) * 6); g.st.forEach((p) => { const v = (Math.sin(s * 1.3 + p.ph) + 1) / 2; tr(p.n, p.x, p.y, 0.4 + v * 0.5); op(p.n, 0.2 + v * 0.8); }); } },
      { name: "Testa che ciondola", desc: "La testa scende piano piano… e di colpo si tira su, occhi aperti per un attimo, poi ricomincia.",
        t(o, T, ts, s) { T.zz = 0; const P = 4.2, k = (s % P) / P; const fall = k < 0.8 ? ease(k / 0.8) : 0, jerk = k >= 0.8 && k < 0.88 ? 1 - (k - 0.8) / 0.08 : 0;
          T.body.y = fall * 4 - jerk * 2; T.body.rot = fall * -4; both(T, (e) => { e.lt = jerk > 0 ? 0.15 : 0.55 + fall * 0.35; e.op = 0.6 + jerk * 0.4; }); } },
    ],
  };
  for (const st in V) V[st].forEach((v) => { v.nuova = true; Iris.VARIANTS[st].push(v); });

  /* =============== EASTER EGG =============== */
  const EG = {
    arcobaleno: { nome: "Arcobaleno", dur: 7000, desc: "Accanto agli occhi si disegna un arcobaleno, colore dopo colore; lui lo guarda contento.",
      init(o, g) { g.a = ["#f87171", "#fb923c", "#fde047", "#4ade80", "#60a5fa", "#a78bfa"].map((c, i) => { const r = 19 - i * 2; return mk(o.r.fx, "path", { d: `M${110 - r} 79 A${r} ${r} 0 0 1 ${110 + r} 79`, fill: "none", stroke: c, "stroke-width": 2, "stroke-dasharray": 70, "stroke-dashoffset": 70, opacity: 0.9 }); }); },
      t(o, T, k, s, a) { both(T, (e) => { e.lb = 0.5 * a; e.dx = 4 * a; e.dy = -2 * a; }); T.body.y -= Math.abs(Math.sin(s * 3)) * a; },
      draw(o, t, k, s, a, g) { g.a.forEach((p, i) => { p.setAttribute("stroke-dashoffset", f2(70 * (1 - ease(seg(k, 0.05 + i * 0.04, 0.35 + i * 0.04))))); op(p, a * 0.9); }); } },
    ombrello: { nome: "Ombrello", dur: 8000, desc: "Inizia a piovere e lui strizza gli occhi; si apre un ombrellino sopra la testa e torna sereno.",
      init(o, g) { g.d = Array.from({ length: 22 }, (_, i) => ({ n: mk(o.r.fx, "line", { stroke: "#7dd3fc", "stroke-width": 0.8, "stroke-linecap": "round" }), x: -25 + prand(i) * 170, off: prand(i, 1), sp: 1.2 + prand(i, 2) })); const u = mk(o.r.fx, "g", {}); mk(u, "path", { d: "M-22 0 A22 9 0 0 1 22 0 q-3.7 -2 -7.3 0 q-3.7 -2 -7.3 0 q-3.7 -2 -7.4 0 q-3.7 -2 -7.3 0 q-3.7 -2 -7.3 0 q-3.7 -2 -7.4 0z", fill: "#f472b6" }); mk(u, "path", { d: "M0 -9 v-1.5", stroke: "#f472b6", "stroke-width": 1.2 }); g.u = u; },
      t(o, T, k, s, a) { const open = seg(k, 0.3, 0.38); both(T, (e) => { e.lt = 0.32 * (1 - open) * a; e.lb = 0.45 * open * a; e.dy = -2 * open * a; }); if (open < 1) T.body.x = Math.sin(s * 40) * 0.4 * a; },
      draw(o, t, k, s, a, g) { const open = ease(seg(k, 0.3, 0.38)); tr(g.u, 60, 52 - (1 - open) * 14, 1); op(g.u, open * a); g.d.forEach((d) => { const q = (s * d.sp + d.off) % 1, y = 40 + q * 42, under = open > 0.5 && d.x > 36 && d.x < 84 && y > 50; d.n.setAttribute("x1", f2(d.x)); d.n.setAttribute("x2", f2(d.x - 0.8)); d.n.setAttribute("y1", f2(y)); d.n.setAttribute("y2", f2(y + 3)); op(d.n, under ? 0 : a * 0.85); }); } },
    temporale: { nome: "Temporale", dur: 6000, desc: "Un lampo illumina tutto, poi il tuono: si spaventa e trema un po'.",
      init(o, g) { g.f = mk(o.r.fxb, "rect", { x: -30, y: 40, width: 180, height: 42, fill: "#e0f2fe", opacity: 0 }); g.b = mk(o.r.fx, "path", { d: "M3 -9 l-5 9 h4 l-3 9 l8 -11 h-4 l3 -7z", fill: "#fde047", opacity: 0 }); },
      t(o, T, k, s, a) { const scared = seg(k, 0.3, 0.35) * (1 - seg(k, 0.85, 0.95)); both(T, (e) => { e.w = 15 - 3 * scared; e.h = 21 + 3 * scared; e.sc = 1 - 0.12 * scared; }); T.body.x = Math.sin(s * 40) * 0.7 * scared; T.sweat = scared > 0.5 ? 1 : 0; },
      draw(o, t, k, s, a, g) { const fl = (k > 0.28 && k < 0.3) || (k > 0.32 && k < 0.335) || (k > 0.62 && k < 0.635) ? 1 : 0; op(g.f, fl * 0.55); op(g.b, fl ? 1 : 0); tr(g.b, k > 0.5 ? 12 : 112, 52, 1.1); } },
    pesciolino: { nome: "Pesciolino", dur: 8500, desc: "Un pesciolino rosso nuota davanti agli occhi facendo bollicine, si gira e torna indietro.",
      init(o, g) { const f = mk(o.r.fx, "g", {}); mk(f, "ellipse", { rx: 5, ry: 3, fill: "#fb923c" }); g.tail = mk(f, "path", { d: "M4.5 0 l4 -3 v6z", fill: "#f97316" }); mk(f, "circle", { cx: -2.6, cy: -0.6, r: 0.8, fill: "#111" }); g.f = f; g.b = Array.from({ length: 4 }, () => mk(o.r.fx, "circle", { r: 0.9, fill: "none", stroke: "#bae6fd", "stroke-width": 0.5, opacity: 0 })); g.trail = []; },
      pos(k) { const p = ease(seg(k, 0.05, 0.48)), q = ease(seg(k, 0.52, 0.95)); return k < 0.5 ? { x: 150 - p * 165, y: 64 + Math.sin(k * 30) * 3, dir: -1 } : { x: -15 + q * 165, y: 58 + Math.sin(k * 30) * 3, dir: 1 }; },
      t(o, T, k, s, a, g) { const p = this.pos(k); look(T, p.x, p.y, a); },
      draw(o, t, k, s, a, g) { const p = this.pos(k); g.f.setAttribute("transform", `translate(${f2(p.x)} ${f2(p.y)}) scale(${-p.dir} 1)`); g.tail.setAttribute("transform", `rotate(${f2(Math.sin(s * 14) * 15)} 4.5 0)`); op(g.f, a);
        g.b.forEach((b, i) => { const q = (s * 0.7 + i / 4) % 1, bx = p.x + p.dir * -6 + Math.sin(q * 8 + i) * 1.5; if (q < 0.05) b._x = bx; b.setAttribute("cx", f2(b._x || bx)); b.setAttribute("cy", f2(p.y - 3 - q * 16)); b.setAttribute("r", f2(0.6 + q * 0.8)); op(b, a * (1 - q)); }); } },
    razzo: { nome: "Razzo", dur: 6500, desc: "Un razzo parte dal basso a sinistra e vola via in alto a destra lasciando la scia; lui fa \"wow\".",
      init(o, g) { const r = mk(o.r.fx, "g", {}); mk(r, "path", { d: "M0 -6 q3 3 2.4 8 h-4.8 q-0.6 -5 2.4 -8z", fill: "#e2e8f0" }); mk(r, "circle", { cy: -1.5, r: 1.1, fill: "#60a5fa" }); mk(r, "path", { d: "M-2.4 2 l-1.6 2.4 h1.6z M2.4 2 l1.6 2.4 h-1.6z", fill: "#f87171" }); g.fl = mk(r, "path", { d: "M-1.6 2.2 L0 7 L1.6 2.2z", fill: "#fb923c" }); g.r = r; g.p = Array.from({ length: 8 }, () => mk(o.r.fxb, "circle", { r: 1.5, fill: "#94a3b8", opacity: 0 })); },
      pos(k) { const q = ease(seg(k, 0.15, 0.8)); return { x: -20 + q * 175, y: 82 - q * 50 - Math.sin(q * Math.PI) * 6 }; },
      t(o, T, k, s, a) { const p = this.pos(k); look(T, p.x, p.y, a); if (k > 0.75) both(T, (e) => { e.w = 17; e.h = 25; e.rr = 8.5; e.dx = 4 * a; e.dy = -3 * a; }); },
      draw(o, t, k, s, a, g) { const p = this.pos(k); tr(g.r, p.x, p.y, 1, 55); op(g.r, k > 0.15 && k < 0.82 ? 1 : 0); g.fl.setAttribute("transform", `scale(1 ${f2(0.7 + Math.abs(Math.sin(s * 30)) * 0.6)})`);
        g.p.forEach((c, i) => { const kk = k - i * 0.025, q = this.pos(kk); c.setAttribute("cx", f2(q.x - 4)); c.setAttribute("cy", f2(q.y + 4)); c.setAttribute("r", f2(1 + i * 0.4)); op(c, kk > 0.16 && kk < 0.8 ? (1 - i / 8) * 0.6 * a : 0); }); } },
    ufo: { nome: "UFO", dur: 8000, desc: "Un disco volante scende e con il raggio solleva gli occhi; poi li lascia cadere e se ne va.",
      init(o, g) { const u = mk(o.r.fx, "g", {}); mk(u, "ellipse", { cy: -2, rx: 4, ry: 3, fill: "#a5f3fc", opacity: 0.8 }); mk(u, "ellipse", { rx: 9, ry: 2.6, fill: "#94a3b8" }); g.l = [-5, 0, 5].map((x) => mk(u, "circle", { cx: x, cy: 0.4, r: 0.8, fill: "#fde047" })); g.u = u; g.beam = mk(o.r.fxb, "path", { d: "M54 48 L36 82 H84 L66 48z", fill: "#a5f3fc", opacity: 0 }); },
      t(o, T, k, s, a) { const lift = ease(seg(k, 0.3, 0.45)) * (1 - seg(k, 0.68, 0.72)), drop = k > 0.7 && k < 0.82 ? Math.abs(Math.sin(seg(k, 0.7, 0.82) * Math.PI * 2)) * (1 - seg(k, 0.7, 0.82)) : 0;
        T.body.y -= lift * 5 - drop * -2; both(T, (e) => { e.dy -= lift * 3; e.sc = 1 - lift * 0.1; e.w = 15 + lift * 2; e.h = 21 + lift * 3; }); if (k < 0.3) look(T, 60, 40, a); },
      draw(o, t, k, s, a, g) { const y = k < 0.2 ? 30 + ease(seg(k, 0.02, 0.2)) * 16 : k > 0.82 ? 46 - ease(seg(k, 0.82, 0.98)) * 20 : 46; const x = 60 + (k > 0.82 ? ease(seg(k, 0.82, 0.98)) * 60 : Math.sin(s * 2) * 2); tr(g.u, x, y); op(g.u, a);
        g.l.forEach((l, i) => op(l, Math.sin(s * 8 + i * 2) > 0 ? 1 : 0.3)); op(g.beam, (seg(k, 0.22, 0.28) - seg(k, 0.66, 0.7)) * 0.28 * (0.8 + Math.sin(s * 20) * 0.2)); } },
    yoyo: { nome: "Yo-yo", dur: 6000, desc: "Gioca con lo yo-yo: scende, gira e risale, e gli occhi vanno su e giù con lui.",
      init(o, g) { g.s = mk(o.r.fx, "line", { x1: 104, y1: 43, x2: 104, stroke: "#cbd5e1", "stroke-width": 0.5 }); const y = mk(o.r.fx, "g", {}); mk(y, "circle", { r: 3.6, fill: "#f87171" }); mk(y, "line", { x1: -3, y1: 0, x2: 3, y2: 0, stroke: "#7f1d1d", "stroke-width": 0.8 }); g.y = y; },
      yy(k, s) { const q = (s % 1.4) / 1.4; return 46 + Math.sin(q * Math.PI) * 28 * Math.min(1, k * 8) * Math.min(1, (1 - k) * 8); },
      t(o, T, k, s, a) { const y = this.yy(k, s); look(T, 104, y, a); T.L.lb = T.R.lb = 0.2 * a; },
      draw(o, t, k, s, a, g) { const y = this.yy(k, s); g.s.setAttribute("y2", f2(y)); tr(g.y, 104, y, 1, s * 720); op(g.y, a); op(g.s, a); } },
    basket: { nome: "Canestro", dur: 8000, desc: "Una palla rimbalza verso il canestro; gli occhi la seguono, ed è canestro!",
      init(o, g) { const h = mk(o.r.fxb, "g", {}); mk(h, "path", { d: "M128 48 v22", stroke: "#94a3b8", "stroke-width": 1 }); mk(h, "path", { d: "M117 52 h11", stroke: "#f97316", "stroke-width": 1.4 }); mk(h, "path", { d: "M118 52 l1.5 6 M122.5 52 v6 M127 52 l-1.5 6 M119 55 h8", stroke: "#e2e8f0", "stroke-width": 0.5 }); g.h = h; const b = mk(o.r.fx, "g", {}); mk(b, "circle", { r: 3.2, fill: "#f97316" }); mk(b, "path", { d: "M-3.2 0 h6.4 M0 -3.2 v6.4", stroke: "#7c2d12", "stroke-width": 0.5 }); g.b = b; },
      pos(k) { if (k < 0.62) { const q = seg(k, 0.04, 0.62), x = -20 + q * 100, bounce = Math.abs(Math.sin(q * Math.PI * 3)) * (22 - q * 10); return { x, y: 76 - bounce }; } const q = seg(k, 0.62, 0.78); const x = 80 + q * 42, y = 66 - Math.sin(q * Math.PI * 0.9) * 26 + q * 4; return k < 0.78 ? { x, y } : { x: 122.5, y: 50 + seg(k, 0.78, 0.86) * 26 }; },
      t(o, T, k, s, a) { const p = this.pos(k); look(T, p.x, p.y, a); if (k > 0.82) { both(T, (e) => { e.lb = 0.55 * a; }); T.body.y -= Math.abs(Math.sin(s * 8)) * 2 * a; } },
      draw(o, t, k, s, a, g) { const p = this.pos(k); tr(g.b, p.x, p.y, 1, s * 400); op(g.b, k < 0.88 ? a : 0); op(g.h, a); } },
    palleggio: { nome: "Palleggio", dur: 7000, desc: "Fa palleggi di testa con un pallone: ogni tocco un saltello, e lo sguardo sempre in alto.",
      init(o, g) { const b = mk(o.r.fx, "g", {}); mk(b, "circle", { r: 3.4, fill: "#f8fafc" }); mk(b, "circle", { r: 1.2, fill: "#1e293b" }); [0, 72, 144, 216, 288].forEach((an) => mk(b, "circle", { cx: f2(Math.cos(an * Math.PI / 180) * 2.7), cy: f2(Math.sin(an * Math.PI / 180) * 2.7), r: 0.6, fill: "#1e293b" })); g.b = b; },
      by(s) { const q = (s % 0.9) / 0.9; return 47 - Math.sin(q * Math.PI) * 4; },
      t(o, T, k, s, a) { const q = (s % 0.9) / 0.9, hit = q < 0.12 ? 1 - q / 0.12 : 0; look(T, 60, 40, a); T.body.y -= hit * 2.5 * a; both(T, (e) => { e.lb = 0.15 * a; }); },
      draw(o, t, k, s, a, g) { tr(g.b, 60 + Math.sin(s * 1.1) * 4, this.by(s), 1, s * 300); op(g.b, a); } },
    tetris: { nome: "Tetris", dur: 9000, desc: "Cadono i pezzi del Tetris ai lati e si impilano; quando la fila è completa lampeggia e sparisce.",
      init(o, g) { const cols = ["#22d3ee", "#facc15", "#a78bfa", "#4ade80", "#f87171", "#fb923c"]; const xs = [-20, -10, 0, 10, 110, 120, 130, 140]; g.p = xs.map((x, i) => ({ n: mk(o.r.fxb, "rect", { x: x - 4.5, width: 9, height: 9, rx: 1.2, fill: cols[i % cols.length], opacity: 0 }), x, i })); },
      t(o, T, k, s, a, g) { const i = Math.min(7, Math.floor(k / 0.1)), p = g.p[i]; look(T, p ? p.x : 60, 60, a * 0.8); if (k > 0.82 && k < 0.92) both(T, (e) => { e.lb = 0.5; }); },
      draw(o, t, k, s, a, g) { g.p.forEach((p) => { const st = p.i * 0.1, q = ease(seg(k, st, st + 0.09)), y = 34 + q * 36; p.n.setAttribute("y", f2(y)); const flash = k > 0.82 && k < 0.9 ? (Math.sin(s * 40) > 0 ? 1 : 0.3) : 1; op(p.n, k < st ? 0 : k > 0.9 ? 0 : a * flash); }); } },
    invasori: { nome: "Invasori spaziali", dur: 8000, desc: "Una fila di alieni pixelati marcia in alto; tra gli occhi parte un raggio e uno alla volta spariscono.",
      init(o, g) { const px = "M-3 -1 h6 v2 h-6z M-2 -2 h1 v1 h-1z M1 -2 h1 v1 h-1z M-3 1 h1 v1 h-1z M2 1 h1 v1 h-1z"; g.a = [0, 1, 2, 3, 4].map((i) => mk(o.r.fx, "path", { d: px, fill: ["#4ade80", "#a78bfa", "#f472b6", "#22d3ee", "#facc15"][i] })); g.las = mk(o.r.fx, "line", { stroke: "#f87171", "stroke-width": 1, opacity: 0 }); },
      t(o, T, k, s, a) { both(T, (e) => { e.dy = -3 * a; e.lt = 0.2 * a; e.h = 19; }); },
      draw(o, t, k, s, a, g) { const dx = Math.sin(s * 1.6) * 20, step = Math.floor(s * 4) % 2; g.a.forEach((n, i) => { const x = 20 + i * 20 + dx, gone = k > 0.25 + i * 0.12; tr(n, x, 46 + step * 0.5, 1); op(n, gone ? 0 : a); });
        const shot = Math.floor((k - 0.2) / 0.12), q = ((k - 0.2) % 0.12) / 0.12; if (k > 0.2 && shot < 5 && q < 0.35) { const x = 20 + shot * 20 + dx; g.las.setAttribute("x1", f2(60)); g.las.setAttribute("y1", 55); g.las.setAttribute("x2", f2(x)); g.las.setAttribute("y2", 47); op(g.las, 1); } else op(g.las, 0); } },
    serpente: { nome: "Serpente", dur: 8500, desc: "Come il vecchio gioco del telefonino: un serpente di quadratini gira intorno agli occhi e mangia la mela.",
      init(o, g) { g.c = Array.from({ length: 14 }, (_, i) => mk(o.r.fx, "rect", { width: 3, height: 3, rx: 0.6, fill: i === 0 ? "#86efac" : "#22c55e", opacity: 0 })); g.apple = mk(o.r.fx, "circle", { cx: 92, cy: 76, r: 1.6, fill: "#f87171" }); },
      pt(q) { const P = [[26, 46], [94, 46], [94, 76], [26, 76]], L = [68, 30, 68, 30], tot = 196; let d = ((q % 1) + 1) % 1 * tot; for (let i = 0; i < 4; i++) { if (d <= L[i]) { const a = P[i], b = P[(i + 1) % 4], f = d / L[i]; return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]; } d -= L[i]; } return P[0]; },
      t(o, T, k, s, a) { const [x, y] = this.pt(s * 0.22); look(T, x, y, a); },
      draw(o, t, k, s, a, g) { const len = k > 0.5 ? 14 : 9; g.c.forEach((c, i) => { const [x, y] = this.pt(s * 0.22 - i * 0.018); c.setAttribute("x", f2(Math.round(x / 3) * 3 - 1.5)); c.setAttribute("y", f2(Math.round(y / 3) * 3 - 1.5)); op(c, i < len ? a : 0); }); op(g.apple, k < 0.5 ? a : 0); } },
    sveglia: { nome: "Sveglia", dur: 5500, desc: "Sta sonnecchiando quando suona la sveglia: salta su con gli occhi spalancati, poi la guarda storto.",
      init(o, g) { const c = mk(o.r.fx, "g", {}); mk(c, "circle", { r: 5, fill: "#f87171" }); mk(c, "circle", { r: 3.8, fill: "#fff" }); mk(c, "path", { d: "M0 0 v-2.6 M0 0 h1.8", stroke: "#111", "stroke-width": 0.6 }); mk(c, "circle", { cx: -3.4, cy: -4.4, r: 1.6, fill: "#f87171" }); mk(c, "circle", { cx: 3.4, cy: -4.4, r: 1.6, fill: "#f87171" }); g.c = c; g.r = [0, 1].map(() => mk(o.r.fx, "path", { d: "M0 -4 q2 4 0 8", fill: "none", stroke: "#fde047", "stroke-width": 0.9, opacity: 0 })); },
      t(o, T, k, s, a) { if (k < 0.3) { both(T, (e) => { e.lt = 0.86; e.op = 0.6; }); T.zz = 0; } else if (k < 0.6) { both(T, (e) => { e.w = 18; e.h = 26; e.rr = 9; e.dx = 3; }); if (k < 0.36) T.body.y -= Math.sin(seg(k, 0.3, 0.36) * Math.PI) * 6; } else { both(T, (e) => { e.lt = 0.38; e.tilt = 20; e.dx = 4; }); } },
      draw(o, t, k, s, a, g) { const ring = k > 0.3 && k < 0.62; tr(g.c, 104, 63, 1, ring ? Math.sin(s * 60) * 12 : 0); op(g.c, a); g.r.forEach((r, i) => { tr(r, i ? 112 : 96, 60, 1, i ? 0 : 180); op(r, ring && Math.sin(s * 20) > 0 ? 1 : 0); }); } },
    commosso: { nome: "Commosso", dur: 6000, desc: "Si commuove: occhi lucidi, un sorriso e una lacrimuccia che scende.",
      init(o, g) { g.t = mk(o.r.fx, "path", { d: "M0 -2.2 Q1.6 0 0 1.6 Q-1.6 0 0 -2.2Z", fill: "#7dd3fc", opacity: 0 }); g.sp = [0, 1].map(() => mk(o.r.fx, "path", { d: STAR, fill: "#fff", opacity: 0 })); },
      t(o, T, k, s, a) { both(T, (e) => { e.lb = 0.3 * a; e.lt = 0.18 * a; e.tilt = -10 * a; e.sc = 1 + 0.04 * a; }); T.body.y += Math.sin(s * 9) * 0.3 * a; },
      draw(o, t, k, s, a, g) { const q = seg(k, 0.3, 0.8); tr(g.t, 40, 68 + q * 10, 1); op(g.t, q > 0 && q < 1 ? a : 0); g.sp.forEach((p, i) => { tr(p, i ? 78 : 50, 55, 0.5 + Math.abs(Math.sin(s * 3 + i)) * 0.4, s * 60); op(p, a); }); } },
    strabico: { nome: "Strabico", dur: 5000, desc: "Fa lo scemo: incrocia gli occhi sempre di più, poi li rimette a posto con una scrollata.",
      t(o, T, k, s, a) { const x = ease(seg(k, 0.05, 0.5)) * (1 - seg(k, 0.7, 0.75)); T.L.dx = 5.5 * x; T.R.dx = -5.5 * x; T.L.dy = T.R.dy = 1.5 * x; T.L.sc = T.R.sc = 1 - 0.08 * x; T.body.rot = Math.sin(s * 3) * 2 * x; if (k > 0.72 && k < 0.85) T.body.rot = Math.sin(s * 40) * 4 * (1 - seg(k, 0.72, 0.85)); if (k > 0.85) T.L.lb = T.R.lb = 0.5 * a; } },
    ciglia: { nome: "Ciglia lunghe", dur: 6000, desc: "Spuntano delle ciglia lunghe: sbatte le palpebre lentamente, civettuolo, e lancia un cuoricino.",
      init(o, g) { g.c = [46, 74].map((x, i) => mk(o.r.fx, "path", { d: i ? "M-5 0 l-2 -3 M0 -1 l0 -3.6 M5 0 l2 -3" : "M-5 0 l-2 -3 M0 -1 l0 -3.6 M5 0 l2 -3", fill: "none", stroke: "currentColor", "stroke-width": 1, "stroke-linecap": "round", opacity: 0 })); g.h = mk(o.r.fx, "path", { d: HEART, fill: "#fb7185", opacity: 0 }); },
      lid(s) { const q = (s % 1.6) / 1.6; return q < 0.3 ? Math.sin((q / 0.3) * Math.PI) * 0.8 : 0; },
      t(o, T, k, s, a) { const l = this.lid(s) * a; both(T, (e) => { e.lt = Math.max(0.12 * a, l); e.lb = 0.25 * a; }); T.body.rot = Math.sin(s * 1.5) * 3 * a; },
      draw(o, t, k, s, a, g) { const l = this.lid(s); g.c.forEach((c, i) => { tr(c, i ? 74 : 46, 51 + l * 20, 1, i ? 6 : -6); op(c, a); }); const q = seg(k, 0.55, 0.9); tr(g.h, 92 + q * 20, 58 - q * 14, 1 + q, 0); op(g.h, q > 0 && q < 1 ? a : 0); } },
    baffi: { nome: "Baffi", dur: 6500, desc: "Gli spuntano dei baffoni arricciati: alza un sopracciglio con aria da intenditore e li fa ballare.",
      init(o, g) { g.m = mk(o.r.fx, "path", { d: "M0 0 q-4 -3 -8 0 q-3 2.5 -6 -1.5 q2 4 6 3 q4 0 8 -1.5 q4 1.5 8 1.5 q4 1 6 -3 q-3 4 -6 1.5 q-4 -3 -8 0z", fill: "#cbd5e1" }); },
      t(o, T, k, s, a) { T.L.lt = 0.3 * a; T.R.lt = 0.05; T.R.tilt = -10 * a; T.R.h = 22; both(T, (e) => { e.dy = -3 * a; }); },
      draw(o, t, k, s, a, g) { const tw = k > 0.45 && k < 0.75 ? Math.sin(s * 18) * 0.15 : 0; g.m.setAttribute("transform", `translate(60 ${f2(75 - Math.abs(tw) * 3)}) scale(${f2(1.1 * a)} ${f2((1 + tw) * a)})`); op(g.m, a); } },
    magia: { nome: "Magia", dur: 7000, desc: "Una bacchetta magica disegna scintille: puf! Gli occhi spariscono in una nuvoletta e ricompaiono.",
      init(o, g) { const w = mk(o.r.fx, "g", {}); mk(w, "line", { x1: 0, y1: 0, x2: 9, y2: 7, stroke: "#e2e8f0", "stroke-width": 1.4, "stroke-linecap": "round" }); mk(w, "path", { d: STAR, fill: "#fde047", transform: "scale(1.2)" }); g.w = w; g.sp = Array.from({ length: 6 }, () => mk(o.r.fx, "path", { d: STAR, fill: "#fde68a", opacity: 0 })); g.cl = [[-8, 0, 6], [0, -3, 7], [8, 0, 6], [0, 3, 6]].map(([x, y, r]) => mk(o.r.fx, "circle", { cx: 60 + x, cy: 61 + y, r, fill: "#e2e8f0", opacity: 0 })); },
      t(o, T, k, s, a) { const gone = seg(k, 0.4, 0.45) * (1 - seg(k, 0.62, 0.68)); both(T, (e) => { e.sc = 1 - 0.95 * gone; }); if (k < 0.4) look(T, 96, 52, a); if (k > 0.68) { both(T, (e) => { e.lb = 0.5 * a; }); } },
      draw(o, t, k, s, a, g) { const wa = Math.sin(s * 6) * 20; tr(g.w, 96, 50, 1, -30 + wa); op(g.w, k < 0.75 ? a : 0); g.sp.forEach((p, i) => { const q = (s * 0.9 + i / 6) % 1; tr(p, 96 - q * 30 + i * 2, 50 + Math.sin(q * 6 + i) * 6, 0.5 * (1 - q)); op(p, k < 0.5 ? a * (1 - q) : 0); });
        const puf = seg(k, 0.4, 0.5) * (1 - seg(k, 0.55, 0.65)); g.cl.forEach((c) => { op(c, puf * 0.9); c.setAttribute("transform", `translate(60 61) scale(${f2(0.5 + puf * 0.8)}) translate(-60 -61)`); }); } },
    ape: { nome: "Ape", dur: 8000, desc: "Un'ape ronza a zigzag con scatti improvvisi: gli occhi faticano a starle dietro.",
      init(o, g) { const b = mk(o.r.fx, "g", {}); g.w = mk(b, "ellipse", { cx: 0, cy: -2.4, rx: 2.2, ry: 1.4, fill: "#e0f2fe", opacity: 0.85 }); mk(b, "ellipse", { rx: 3, ry: 2.1, fill: "#facc15" }); mk(b, "path", { d: "M-1 -2 v4 M1 -2 v4", stroke: "#111", "stroke-width": 0.8 }); mk(b, "circle", { cx: -3, cy: -0.3, r: 1, fill: "#111" }); g.b = b; g.p = { x: 150, y: 50 }; g.tgt = { x: 100, y: 55 }; g.next = 0; },
      t(o, T, k, s, a, g) { look(T, g.p.x, g.p.y, a); if (k > 0.85) { T.L.lt = T.R.lt = 0.2; } },
      draw(o, t, k, s, a, g) { if (t > g.next) { g.next = t + 280 + Math.random() * 300; g.tgt = k > 0.85 ? { x: 160, y: 40 } : { x: -10 + Math.random() * 140, y: 47 + Math.random() * 28 }; } g.p.x += (g.tgt.x - g.p.x) * 0.16; g.p.y += (g.tgt.y - g.p.y) * 0.16; tr(g.b, g.p.x, g.p.y + Math.sin(t / 30) * 0.5); g.w.setAttribute("ry", f2(0.5 + Math.abs(Math.sin(t / 15)))); op(g.b, a); } },
    lucciole: { nome: "Lucciole", dur: 8500, desc: "Arrivano le lucciole: puntini luminosi che vagano piano; lui abbassa la luce degli occhi e ne segue una.",
      init(o, g) { g.f = Array.from({ length: 9 }, (_, i) => ({ n: mk(o.r.fx, "circle", { r: 1.1, fill: "#d9f99d" }), h: mk(o.r.fx, "circle", { r: 3, fill: "#d9f99d", opacity: 0 }), i })); },
      fp(i, s) { return { x: 60 + Math.sin(s * (0.3 + prand(i) * 0.4) + i * 2) * (30 + prand(i, 1) * 50), y: 61 + Math.sin(s * (0.5 + prand(i, 2) * 0.5) + i) * 14 }; },
      t(o, T, k, s, a) { const p = this.fp(0, s); look(T, p.x, p.y, a); both(T, (e) => { e.op = 1 - 0.45 * a; e.lb = 0.2 * a; }); },
      draw(o, t, k, s, a, g) { g.f.forEach((f) => { const p = this.fp(f.i, s), gl = (Math.sin(s * 2.4 + f.i * 1.7) + 1) / 2; f.n.setAttribute("cx", f2(p.x)); f.n.setAttribute("cy", f2(p.y)); f.h.setAttribute("cx", f2(p.x)); f.h.setAttribute("cy", f2(p.y)); op(f.n, a * (0.3 + gl * 0.7)); op(f.h, a * gl * 0.25); }); } },
    aeroplanino: { nome: "Aeroplanino di carta", dur: 7000, desc: "Un aeroplanino di carta plana facendo una giravolta e finisce dritto sull'occhio destro: occhiolino.",
      init(o, g) { g.p = mk(o.r.fx, "path", { d: "M5 0 L-5 -3.4 L-2.4 0 L-5 3.4z M5 0 L-2.4 0", fill: "#f8fafc", stroke: "#94a3b8", "stroke-width": 0.4, "stroke-linejoin": "round" }); },
      pos(k) { const q = seg(k, 0.05, 0.75); if (q < 0.45) { const u = q / 0.45; return { x: -25 + u * 80, y: 52 + Math.sin(u * 3) * 3, r: Math.cos(u * 3) * 10 }; } if (q < 0.7) { const u = (q - 0.45) / 0.25, an = u * Math.PI * 2; return { x: 55 + Math.sin(an) * 12, y: 58 - (1 - Math.cos(an)) * 7, r: -an * 180 / Math.PI }; } const u = (q - 0.7) / 0.3; return { x: 55 + u * 19, y: 58 + u * 3, r: 10 }; },
      t(o, T, k, s, a) { const p = this.pos(k); look(T, p.x, p.y, a); if (k > 0.74 && k < 0.92) { T.R.lt = 0.6; T.R.lb = 0.4; T.L.lb = 0.4; T.body.rot = 3; } },
      draw(o, t, k, s, a, g) { const p = this.pos(k); tr(g.p, p.x, p.y, 1, p.r); op(g.p, k < 0.76 ? a : 0); } },
    equilibrista: { nome: "Equilibrista", dur: 7000, desc: "Tiene in equilibrio una pallina sopra la testa ondeggiando; alla fine gli cade, e lui la segue con lo sguardo.",
      init(o, g) { g.b = mk(o.r.fx, "circle", { r: 2.6, fill: "#f472b6" }); },
      sw(s) { return Math.sin(s * 2.1) * 6 + Math.sin(s * 5.3) * 2; },
      t(o, T, k, s, a) { const sw = this.sw(s); T.body.rot = sw * 0.6 * a; if (k < 0.7) look(T, 60 - sw * 2, 42, a); else { const q = seg(k, 0.7, 0.85); look(T, 60 + q * 40, 45 + q * 30, a); if (k > 0.85) { T.sweat = 1; both(T, (e) => { e.w = 17; e.h = 24; e.rr = 8; }); } } },
      draw(o, t, k, s, a, g) { const sw = this.sw(s); let x = 60 - sw * 1.8, y = 46.5; if (k > 0.7) { const q = seg(k, 0.7, 0.85); x = 60 - this.sw(0.7 * 7) * 1.8 + q * 40; y = 46.5 + q * q * 34; } g.b.setAttribute("cx", f2(x)); g.b.setAttribute("cy", f2(y)); op(g.b, k < 0.86 ? a : 0); } },
    gomma: { nome: "Gomma da masticare", dur: 6000, desc: "Gonfia un palloncino di gomma rosa sempre più grande… finché scoppia e lo sorprende.",
      init(o, g) { g.b = mk(o.r.fx, "circle", { cx: 60, cy: 74, r: 1, fill: "#f9a8d4", opacity: 0, stroke: "#f472b6", "stroke-width": 0.5 }); g.sh = mk(o.r.fx, "ellipse", { rx: 1.4, ry: 0.8, fill: "#fff", opacity: 0 }); g.bits = Array.from({ length: 8 }, (_, i) => ({ n: mk(o.r.fx, "circle", { r: 1, fill: "#f9a8d4", opacity: 0 }), an: (i / 8) * Math.PI * 2 })); },
      r(k) { return k < 0.62 ? 1 + ease(seg(k, 0.08, 0.62)) * 15 : 0; },
      t(o, T, k, s, a) { if (k < 0.62) { both(T, (e) => { e.lt = 0.25 * a; e.dx = 0; e.dy = 2 * a; }); } else if (k < 0.85) { both(T, (e) => { e.w = 18; e.h = 26; e.rr = 9; }); if (k < 0.68) T.body.y -= Math.sin(seg(k, 0.62, 0.68) * Math.PI) * 5; } else both(T, (e) => { e.lb = 0.5 * a; }); },
      draw(o, t, k, s, a, g) { const r = this.r(k); g.b.setAttribute("r", f2(r)); g.b.setAttribute("cy", f2(74 - r * 0.6)); op(g.b, r > 0 ? 0.92 * a : 0); g.sh.setAttribute("transform", `translate(${f2(60 - r * 0.4)} ${f2(74 - r * 1.1)})`); op(g.sh, r > 4 ? 0.6 * a : 0);
        const q = seg(k, 0.62, 0.8); g.bits.forEach((b) => { b.n.setAttribute("cx", f2(60 + Math.cos(b.an) * (6 + q * 30))); b.n.setAttribute("cy", f2(65 + Math.sin(b.an) * (4 + q * 12))); op(b.n, q > 0 && q < 1 ? a * (1 - q) : 0); }); } },
    dado: { nome: "Dado", dur: 6000, desc: "Un dado rotola da destra, si ferma e mostra un numero; se esce il sei fa festa.",
      init(o, g) { const d = mk(o.r.fx, "g", {}); mk(d, "rect", { x: -4.5, y: -4.5, width: 9, height: 9, rx: 2, fill: "#f8fafc" }); g.pips = Array.from({ length: 6 }, () => mk(d, "circle", { r: 0.85, fill: "#111" })); g.d = d; g.n = 1 + Math.floor(Math.random() * 6); g.last = 0; },
      face(g, n) { const P = { 1: [[0, 0]], 2: [[-2, -2], [2, 2]], 3: [[-2, -2], [0, 0], [2, 2]], 4: [[-2, -2], [2, -2], [-2, 2], [2, 2]], 5: [[-2, -2], [2, -2], [0, 0], [-2, 2], [2, 2]], 6: [[-2, -2.2], [2, -2.2], [-2, 0], [2, 0], [-2, 2.2], [2, 2.2]] }[n]; g.pips.forEach((p, i) => { if (P[i]) { p.setAttribute("cx", P[i][0]); p.setAttribute("cy", P[i][1]); op(p, 1); } else op(p, 0); }); },
      t(o, T, k, s, a, g) { const q = ease(seg(k, 0.05, 0.5)), x = 150 - q * 50; look(T, x, 70, a); if (k > 0.6) { if (g.n === 6) { both(T, (e) => { e.lb = 0.55 * a; }); T.body.y -= Math.abs(Math.sin(s * 9)) * 2.5 * a; } else both(T, (e) => { e.lb = 0.2 * a; e.dx = 4 * a; e.dy = 2 * a; }); } },
      draw(o, t, k, s, a, g) { const q = ease(seg(k, 0.05, 0.5)), x = 150 - q * 50, roll = k < 0.5; if (roll && t - g.last > 110) { g.last = t; this.face(g, 1 + Math.floor(Math.random() * 6)); } if (!roll) this.face(g, g.n); tr(g.d, x, 72 - (roll ? Math.abs(Math.sin(q * 12)) * 5 * (1 - q) : 0), 1, roll ? (1 - q) * 720 : 0); op(g.d, a); } },
  };
  for (const id in EG) { EG[id].nuova = true; EG[id].auto = true; Iris.EGGS[id] = EG[id]; }
  Iris.NUOVE = { varianti: V, eggs: Object.keys(EG) };
})();
