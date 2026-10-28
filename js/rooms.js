// The lower half of the page: "Right now", the listening room, the screening room and the sea-level finale.
(function () {
  const S = window.SITE;
  const $ = (sel) => document.querySelector(sel);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const onView = (el, fn, threshold = 0) =>
    new IntersectionObserver(([e]) => fn(e.isIntersecting), { threshold }).observe(el);

  /* ---------- right now ---------- */
  const nowGrid = $("#now-grid");
  nowGrid.innerHTML = S.now
    .map((n) => `<div class="now-item"><dt>${esc(n.label)}</dt><dd${n.from ? ` data-from="${n.from}"` : ""}>${esc(n.text)}</dd></div>`)
    .join("");

  /* ---------- listening room ---------- */
  const room = $("#music");
  const crate = $("#crate");
  const bgA = $("#music-bg"), bgB = $("#music-bg-next");
  const disc = $("#disc"), discImg = $("#disc-img");
  const turntable = $("#turntable");
  const power = $("#power");
  const embed = $("#np-embed");
  let current = -1, playing = false, front = bgA;

  crate.innerHTML = S.artists
    .map((a, i) => `<button type="button" class="sleeve" role="option" aria-selected="false" data-i="${i}">
        <span class="sleeve-vinyl" aria-hidden="true"></span>
        <img src="${a.img}" alt="" loading="lazy" />
        <span class="sleeve-name">${esc(a.name)}</span>
      </button>`)
    .join("");
  const sleeves = [...crate.querySelectorAll(".sleeve")];

  // average the photo's colour (weighted toward saturated pixels) to tint the room
  const tintCache = {};
  function tintOf(src) {
    return new Promise((res) => {
      if (tintCache[src]) return res(tintCache[src]);
      const img = new Image();
      img.onload = () => {
        const c = document.createElement("canvas");
        c.width = c.height = 24;
        const x = c.getContext("2d");
        x.drawImage(img, 0, 0, 24, 24);
        const d = x.getImageData(0, 0, 24, 24).data;
        let r = 0, g = 0, b = 0, w = 0;
        for (let i = 0; i < d.length; i += 4) {
          const mx = Math.max(d[i], d[i + 1], d[i + 2]), mn = Math.min(d[i], d[i + 1], d[i + 2]);
          const wt = (mx - mn) / 255 + 0.05;
          r += d[i] * wt; g += d[i + 1] * wt; b += d[i + 2] * wt; w += wt;
        }
        res((tintCache[src] = [r / w, g / w, b / w].map(Math.round)));
      };
      img.onerror = () => res([90, 110, 120]);
      img.src = src;
    });
  }

  async function select(i, { scroll = false } = {}) {
    if (i === current) return;
    const a = S.artists[i];
    current = i;
    sleeves.forEach((s, k) => s.setAttribute("aria-selected", k === i));
    if (scroll) {
      // scroll only the crate; scrollIntoView would also shift the clipped room sideways
      const s = sleeves[i];
      crate.scrollTo({ left: s.offsetLeft - (crate.clientWidth - s.offsetWidth) / 2, behavior: reduced ? "auto" : "smooth" });
    }

    // swap the record: lift it off, change the label, set it back down
    turntable.classList.add("swapping");
    setTimeout(() => {
      discImg.src = a.img;
      turntable.classList.remove("swapping");
    }, reduced ? 0 : 380);

    const back = front === bgA ? bgB : bgA;
    back.src = a.img;
    back.classList.add("on");
    front.classList.remove("on");
    front = back;

    $("#np-genre").textContent = a.genre;
    $("#np-name").textContent = a.name;
    $("#np-record").textContent = a.record;
    $("#np-year").textContent = `(${a.year})`;
    $("#np-open").href = `https://open.spotify.com/artist/${a.spotify}`;
    document.querySelectorAll('[data-from="artists"]').forEach((d) => (d.textContent = `${a.name}, on repeat`));

    if (embed.firstChild) loadEmbed(); // keep the player in sync if it's already open

    const [r, g, b] = await tintOf(a.img);
    if (current === i) room.style.setProperty("--tint", `${r}, ${g}, ${b}`);
  }

  function loadEmbed() {
    const a = S.artists[current];
    embed.innerHTML = `<iframe title="${esc(a.name)} on Spotify" src="https://open.spotify.com/embed/artist/${a.spotify}?theme=0"
      width="100%" height="152" frameborder="0" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>`;
  }

  function setPlaying(on) {
    playing = on;
    turntable.classList.toggle("playing", on);
    power.setAttribute("aria-pressed", on);
    power.setAttribute("aria-label", on ? "Stop the record" : "Start the record");
  }

  crate.addEventListener("click", (e) => {
    const s = e.target.closest(".sleeve");
    if (!s) return;
    select(+s.dataset.i);
    setPlaying(true);
  });
  crate.addEventListener("keydown", (e) => {
    if (!["ArrowRight", "ArrowLeft"].includes(e.key)) return;
    e.preventDefault();
    const n = (current + (e.key === "ArrowRight" ? 1 : -1) + sleeves.length) % sleeves.length;
    select(n, { scroll: true });
    sleeves[n].focus();
  });
  power.addEventListener("click", () => setPlaying(!playing));
  $("#np-play").addEventListener("click", () => { loadEmbed(); setPlaying(true); });

  select(0);

  /* ---------- screening room ---------- */
  const reel = $("#reel");
  const glow = $("#screen-glow");
  if (S.links.letterboxd) { const lb = $("#lb-link"); lb.href = S.links.letterboxd; lb.hidden = false; }

  reel.innerHTML = S.films
    .map((f) => `<li>
        <a class="film" href="https://letterboxd.com/film/${f.slug}/" target="_blank" rel="noopener" data-img="${f.img}">
          <span class="poster"><img src="${f.img}" alt="${esc(f.title)} poster" loading="lazy" /><span class="glare"></span></span>
          <span class="stub">
            <span class="stub-title">${esc(f.title)}</span>
            <span class="stub-meta">${f.year}, ${esc(f.director)}</span>
            <span class="stub-run">${f.runtime} min</span>
          </span>
        </a>
      </li>`)
    .join("");

  const films = [...reel.querySelectorAll(".film")];
  function light(film) {
    reel.classList.toggle("hovering", !!film);
    films.forEach((f) => f.classList.toggle("lit", f === film));
    if (film) glow.style.backgroundImage = `url("${film.dataset.img}")`;
    glow.classList.toggle("on", !!film);
  }
  films.forEach((f) => {
    f.addEventListener("pointerenter", () => light(f));
    f.addEventListener("focus", () => light(f));
    f.addEventListener("blur", () => light(null));
    if (!reduced && matchMedia("(hover: hover)").matches) {
      const p = f.querySelector(".poster");
      f.addEventListener("pointermove", (e) => {
        const r = p.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        p.style.transform = `rotateY(${(x - 0.5) * 16}deg) rotateX(${(0.5 - y) * 12}deg) translateZ(20px)`;
        p.style.setProperty("--gx", x * 100 + "%");
        p.style.setProperty("--gy", y * 100 + "%");
      });
      f.addEventListener("pointerleave", () => { p.style.transform = ""; });
    }
  });
  reel.addEventListener("pointerleave", () => light(null));

  // dust drifting through the projector beam
  const dust = $("#dust");
  if (dust && !reduced) {
    const c = dust.getContext("2d");
    let w = 0, h = 0, vis = false;
    const motes = Array.from({ length: 90 }, () => ({ x: Math.random(), y: Math.random(), s: Math.random() * 1.6 + 0.4, v: Math.random() * 0.0006 + 0.0002, p: Math.random() * 6.28 }));
    const size = () => { w = dust.clientWidth; h = dust.clientHeight; dust.width = w; dust.height = h; };
    function frame(t) {
      requestAnimationFrame(frame);
      if (!vis) return;
      c.clearRect(0, 0, w, h);
      for (const m of motes) {
        m.y -= m.v; m.x += Math.sin(t / 2000 + m.p) * 0.0003;
        if (m.y < 0) { m.y = 1; m.x = Math.random(); }
        // only visible inside the cone of light coming from the top centre
        const spread = 0.06 + m.y * 0.38;
        const inBeam = Math.abs(m.x - 0.5) < spread;
        if (!inBeam) continue;
        const a = (1 - Math.abs(m.x - 0.5) / spread) * 0.55 * (0.4 + 0.6 * Math.sin(t / 700 + m.p) ** 2);
        c.fillStyle = `rgba(244, 241, 232, ${a})`;
        c.beginPath(); c.arc(m.x * w, m.y * h, m.s, 0, 6.29); c.fill();
      }
    }
    addEventListener("resize", size);
    onView(dust, (v) => (vis = v));
    size();
    requestAnimationFrame(frame);
  }

  /* ---------- sea level ---------- */
  const sea = $("#sea");
  if (sea) {
    const c = sea.getContext("2d");
    const host = sea.parentElement;
    let w = 0, h = 0, dpr = 1, vis = false, t = 0;
    const ptr = { x: -999, y: -999, a: 0, on: false };
    const size = () => {
      dpr = Math.min(devicePixelRatio || 1, 1.5);
      w = host.clientWidth; h = host.clientHeight;
      sea.width = w * dpr; sea.height = h * dpr;
    };
    function draw() {
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      c.clearRect(0, 0, w, h);
      const lines = 22, top = h * 0.5;
      for (let k = 0; k < lines; k++) {
        const depth = k / (lines - 1);
        const base = top + depth * depth * (h - top) * 1.02;
        c.beginPath();
        for (let x = 0; x <= w; x += 8) {
          const dx = x - ptr.x, dy = base - ptr.y;
          const ripple = ptr.a * 18 * Math.exp(-(dx * dx + dy * dy) / 9000) * Math.sin(Math.hypot(dx, dy) / 14 - t * 4);
          const y = base + Math.sin(x * 0.006 + t + k * 0.6) * (4 + depth * 10) + Math.sin(x * 0.017 - t * 1.3 + k) * (2 + depth * 4) + ripple;
          x === 0 ? c.moveTo(x, y) : c.lineTo(x, y);
        }
        c.strokeStyle = `rgba(${47 + depth * 40}, ${127 + depth * 30}, ${128 + depth * 20}, ${0.12 + depth * 0.45})`;
        c.lineWidth = 0.8 + depth * 0.8;
        c.stroke();
      }
    }
    function frame() {
      requestAnimationFrame(frame);
      if (!vis) return;
      t += 0.012;
      ptr.a += ((ptr.on ? 1 : 0) - ptr.a) * 0.05;
      draw();
    }
    host.addEventListener("pointermove", (e) => {
      const r = host.getBoundingClientRect();
      ptr.x = e.clientX - r.left; ptr.y = e.clientY - r.top; ptr.on = true;
      if (reduced) { ptr.a = 1; draw(); }
    });
    host.addEventListener("pointerleave", () => (ptr.on = false));
    addEventListener("resize", () => { size(); draw(); });
    size();
    if (reduced) draw();
    else { onView(host, (v) => (vis = v)); requestAnimationFrame(frame); }
  }
})();
