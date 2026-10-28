// Moving between sections:
//  - weighted smooth scrolling (Lenis), with anchor links gliding to their section
//  - each section is a panel that slides up over the last one: it arrives narrower with
//    rounded top corners and widens to full bleed, while the panel it covers sinks back and dims
//  - crossing into a section flashes its altitude on the right, rolling from the old height
//  - section headings rise out of a mask once, as their section arrives
(function () {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const panels = [...document.querySelectorAll("main > section")];
  const root = document.documentElement;

  /* ---------- smooth scroll ---------- */
  let lenis = null;
  const easeInOutExpo = (x) => (x === 0 ? 0 : x === 1 ? 1 : x < 0.5 ? Math.pow(2, 20 * x - 10) / 2 : (2 - Math.pow(2, -20 * x + 10)) / 2);
  if (!reduced && window.Lenis) {
    lenis = new window.Lenis({ lerp: 0.09, wheelMultiplier: 0.95 });
    (function raf(t) { lenis.raf(t); requestAnimationFrame(raf); })(performance.now());
  }
  window.SiteScroll = (el) => {
    if (!el) return;
    if (lenis) lenis.scrollTo(el, { duration: 1.6, easing: easeInOutExpo });
    else el.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
  };
  document.addEventListener("click", (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a || a.getAttribute("href").length < 2) return;
    const target = document.querySelector(a.getAttribute("href"));
    if (!target) return;
    e.preventDefault();
    window.SiteScroll(target);
    history.replaceState(null, "", a.getAttribute("href"));
  });

  /* ---------- colour journey ---------- */
  // The page descends from the summit to the sea: cold blue-grey at the top, warming through
  // moss and sand in the middle, then deep teal at sea level. Each section is one step.
  const DEPTH = {
    top: "#0c1820",
    shell: "#0b1a26",
    projects: "#0d1c24",
    work: "#101d22",
    stack: "#131e20",
    hire: "#161f1d",
    chess: "#1a1f1a",
    contact: "#06191e",
  };
  panels.forEach((p) => { if (DEPTH[p.id]) p.style.setProperty("--night", DEPTH[p.id]); });

  if (reduced) return;

  /* ---------- heading reveals ---------- */
  const heads = document.querySelectorAll(".section-head h2, .room-title, .contact-big");
  heads.forEach((h) => {
    h.innerHTML = `<span class="rv"><span class="rv-in">${h.innerHTML}</span></span>`;
  });
  const headObs = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add("rv-on"); headObs.unobserve(e.target); }
    });
  }, { threshold: 0.6 });
  heads.forEach((h) => headObs.observe(h));

  /* ---------- stacked panels ---------- */
  panels.forEach((p, i) => { p.classList.add("panel"); p.style.zIndex = String(i + 1); });
  const clamp = (v) => Math.max(0, Math.min(1, v));
  const ease = (x) => 1 - Math.pow(1 - x, 3);

  let lastY = -1, lastW = 0;
  function frame() {
    requestAnimationFrame(frame);
    const y = window.scrollY, vw = root.clientWidth, vh = window.innerHeight;
    if (y === lastY && vw === lastW) return;
    lastY = y; lastW = vw;

    panels.forEach((p, i) => {
      const r = p.getBoundingClientRect();

      // arriving: 0 when its top is at the bottom of the screen, 1 once it's 15% from the top
      const pin = i === 0 ? 1 : ease(clamp((vh - r.top) / (vh * 0.85)));
      if (pin < 1) {
        const side = (1 - pin) * Math.min(48, vw * 0.04);
        const rad = (1 - pin) * 36;
        const right = side - (vw - r.right); // plain sections are narrower than the screen; bleed to the edge
        p.style.clipPath = `inset(0px ${right}px 0px ${side - r.left}px round ${rad}px ${rad}px 0px 0px)`;
      } else if (p.style.clipPath) {
        p.style.clipPath = "";
      }

      // leaving: 0 while its bottom is below the screen, 1 when the next panel has covered it
      const next = panels[i + 1];
      const pout = next ? clamp((vh - next.getBoundingClientRect().top) / vh) : 0;
      if (pout > 0 && pout < 1) {
        const k = ease(pout);
        p.style.transform = `translate3d(0, ${k * vh * 0.28}px, 0) scale(${1 - k * 0.07})`;
        p.style.opacity = String(1 - k * 0.65);
        p.style.willChange = "transform, opacity";
      } else if (p.style.transform) {
        p.style.transform = "";
        p.style.opacity = "";
        p.style.willChange = "";
      }
    });
  }
  requestAnimationFrame(frame);
  addEventListener("resize", () => { lastW = 0; });

  /* ---------- altitude crossing HUD ---------- */
  const links = [...document.querySelectorAll(".altimeter a")];
  const marks = links.map((a) => ({ el: document.querySelector(a.getAttribute("href")), alt: +a.dataset.alt, name: a.textContent }));
  const hud = document.createElement("div");
  hud.className = "alt-hud";
  hud.setAttribute("aria-hidden", "true");
  hud.innerHTML = `<span class="alt-hud-num"></span><span class="alt-hud-name"></span>`;
  document.body.appendChild(hud);
  const num = hud.querySelector(".alt-hud-num"), name = hud.querySelector(".alt-hud-name");

  let active = -1, shown = 8848, hideTimer = 0, rolling = 0;
  const ready = performance.now() + 1500; // don't flash during the opening sequence
  function roll(to) {
    cancelAnimationFrame(rolling);
    const from = shown, t0 = performance.now();
    (function tick(now) {
      const k = Math.min(1, (now - t0) / 900);
      shown = Math.round(from + (to - from) * ease(k));
      num.textContent = shown.toLocaleString("en-IN") + " m";
      if (k < 1) rolling = requestAnimationFrame(tick);
    })(t0);
  }
  function check() {
    const vh = window.innerHeight;
    let a = 0;
    marks.forEach((m, i) => { if (m.el && m.el.getBoundingClientRect().top < vh * 0.45) a = i; });
    if (a === active) return;
    const first = active === -1;
    active = a;
    if (first || performance.now() < ready) { shown = marks[a].alt; return; }
    name.textContent = marks[a].name;
    roll(marks[a].alt);
    hud.classList.remove("on");
    void hud.offsetWidth;
    hud.classList.add("on");
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => hud.classList.remove("on"), 1700);
  }
  addEventListener("scroll", check, { passive: true });
  check();
})();
