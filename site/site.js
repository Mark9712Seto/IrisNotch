/* Lingua (inglese / italiano) e tacche vive con il motore degli occhi dell'app (eyes.js). */
(function () {
  const root = document.documentElement;
  let lang = "en";
  try { lang = localStorage.getItem("iris-lang") || ""; } catch (e) { lang = ""; }
  if (lang !== "en" && lang !== "it") lang = /^it\b/i.test(navigator.language || "") ? "it" : "en";
  function setLang(l) {
    lang = l; root.lang = l;
    document.querySelectorAll(".lang button").forEach((b) => b.classList.toggle("on", b.dataset.l === l));
    try { localStorage.setItem("iris-lang", l); } catch (e) {}
    document.dispatchEvent(new Event("iris-lang"));
  }
  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".lang button").forEach((b) => (b.onclick = () => setLang(b.dataset.l)));
    setLang(lang);
  });
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  window.Site = {
    lang: () => lang,
    reduce,
    // crea una tacca viva dentro el (un .pill con dentro .e)
    notch(el, opts) {
      el.classList.add("pill");
      el.innerHTML = '<div class="e"></div>';
      return Iris.createEyes(el.firstChild, Object.assign({ island: true }, opts || {}));
    },
    // ripete un easter egg finché la tacca è visibile
    loopEgg(eyes, el, id, delay) {
      let timer = null, visible = false;
      const play = () => { clearTimeout(timer); if (!visible) return; eyes.playEgg(id); timer = setTimeout(play, Math.min(Iris.EGGS[id].dur, 9000) + 2000); };
      el.addEventListener("click", () => { visible = true; play(); });
      new IntersectionObserver((es) => es.forEach((e) => { const was = visible; visible = e.isIntersecting; if (visible && !was && !reduce) timer = setTimeout(play, delay || 300); if (!visible) clearTimeout(timer); })).observe(el);
    },
  };
})();
