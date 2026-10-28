// Page-level wiring: hero typing, the altimeter nav, top bar state and the "/" shortcut.
(function () {
  const S = window.SITE;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // type the tagline once the name has risen in
  const tag = document.getElementById("hero-tag");
  const caret = '<span class="caret" aria-hidden="true"></span>';
  tag.setAttribute("aria-label", S.tagline);
  if (reduced) tag.textContent = S.tagline;
  else {
    let i = 0;
    setTimeout(function type() {
      tag.innerHTML = S.tagline.slice(0, ++i) + caret;
      if (i < S.tagline.length) setTimeout(type, 18 + Math.random() * 28);
    }, 1000);
  }

  // LeetCode readout: show the saved numbers, then swap in the live count if it loads
  const C = 2 * Math.PI * 18;
  const lcTotal = document.getElementById("lc-total");
  let shown = 0;
  function renderLC({ easy, medium, hard }) {
    const total = easy + medium + hard;
    if (!total) return;
    document.getElementById("lc-split").textContent = `${easy} easy, ${medium} medium, ${hard} hard`;
    document.getElementById("lc").setAttribute("aria-label", `${total} LeetCode problems solved: ${easy} easy, ${medium} medium, ${hard} hard. Opens my LeetCode profile.`);
    let offset = 0;
    [["easy", easy], ["medium", medium], ["hard", hard]].forEach(([k, n]) => {
      const len = Math.max(0, (n / total) * C - (n ? 1.5 : 0)); // small gap between segments
      const arc = document.querySelector(".lc-" + k);
      arc.style.strokeDasharray = `${len} ${C}`;
      arc.style.strokeDashoffset = -offset;
      offset += (n / total) * C;
    });
    const from = shown, t0 = performance.now(), dur = reduced ? 0 : 1100;
    shown = total;
    (function step(now) {
      const k = dur ? Math.min(1, (now - t0) / dur) : 1;
      lcTotal.textContent = Math.round(from + (total - from) * (1 - Math.pow(1 - k, 3)));
      if (k < 1) requestAnimationFrame(step);
    })(t0);
  }
  const lc = S.leetcode;
  setTimeout(() => renderLC(lc.fallback), reduced ? 0 : 2000);
  const sources = [
    `https://leetcode-api-faisalshohag.vercel.app/${lc.username}`,
    `https://alfa-leetcode-api.onrender.com/${lc.username}/solved`,
  ];
  (async () => {
    for (const url of sources) {
      try {
        const ctrl = new AbortController();
        setTimeout(() => ctrl.abort(), 8000);
        const d = await (await fetch(url, { signal: ctrl.signal })).json();
        if (Number.isFinite(d.easySolved)) {
          const live = { easy: d.easySolved, medium: d.mediumSolved, hard: d.hardSolved };
          setTimeout(() => renderLC(live), reduced ? 0 : 2000);
          return;
        }
      } catch {}
    }
  })();

  // altimeter: page scroll mapped from Everest's summit down to sea level
  const links = [...document.querySelectorAll(".altimeter a")];
  const sections = links.map((a) => document.querySelector(a.getAttribute("href")));
  const altValue = document.getElementById("alt-value");
  const topbar = document.querySelector(".topbar");
  let ticking = false;
  function onScroll() {
    ticking = false;
    const y = window.scrollY;
    const max = document.documentElement.scrollHeight - innerHeight;
    if (altValue) altValue.textContent = Math.round(8848 * (1 - Math.min(1, y / max))).toLocaleString("en-IN");
    topbar.classList.toggle("scrolled", y > innerHeight * 0.6);
    let active = 0;
    sections.forEach((s, i) => { if (s && s.getBoundingClientRect().top < innerHeight * 0.4) active = i; });
    if (y >= max - 4) active = sections.length - 1;
    links.forEach((a, i) => a.classList.toggle("active", i === active));
  }
  addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();

  // "/" anywhere focuses the terminal
  document.querySelectorAll("[data-focus-shell]").forEach((b) => b.addEventListener("click", () => window.Shell.focus()));
  addEventListener("keydown", (e) => {
    if (e.key !== "/" || e.metaKey || e.ctrlKey) return;
    if (e.target.closest("input, textarea, [contenteditable]")) return;
    e.preventDefault();
    window.Shell.focus();
  });
})();
