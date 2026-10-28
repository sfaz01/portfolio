// Hero: a live topographic contour map drawn with marching squares.
// The cursor raises the ground under it; clicks leave peaks that slowly erode.
(function () {
  const canvas = document.getElementById("terrain");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const hero = canvas.parentElement;
  const probe = document.getElementById("probe");
  const probeElev = document.getElementById("probe-elev");
  const probeCoord = document.getElementById("probe-coord");
  const { fbm, ramp } = window.Noise;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const home = window.SITE.location;

  const CELL = 12;
  const LEVELS = 16;
  const SCALE = 0.0032;
  const MAX_ELEV = 2600;

  let W = 0, H = 0, dpr = 1, cols = 0, rows = 0, field = null;
  let t = 0, start = performance.now(), visible = true, raf = 0;
  const mouse = { x: -9999, y: -9999, tx: -9999, ty: -9999, inside: false, amp: 0 };
  const peaks = [];

  const colors = Array.from({ length: LEVELS }, (_, i) => {
    const [r, g, b] = ramp(i / (LEVELS - 1));
    return `rgb(${r},${g},${b})`;
  });

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    W = hero.clientWidth;
    H = hero.clientHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    cols = Math.ceil(W / CELL) + 1;
    rows = Math.ceil(H / CELL) + 1;
    field = new Float32Array(cols * rows);
    if (reduced) draw();
  }

  function bump(x, y, cx, cy, r, a) {
    const dx = x - cx, dy = y - cy;
    return a * Math.exp(-(dx * dx + dy * dy) / (2 * r * r));
  }

  function height(x, y) {
    // base terrain drifts slowly, like clouds of elevation moving across the map
    let h = fbm(x * SCALE + t * 0.018, y * SCALE - t * 0.011, 4);
    h = (h - 0.25) * 1.6;
    if (mouse.amp > 0.001) h += bump(x, y, mouse.x, mouse.y, 120, 0.34 * mouse.amp);
    for (const p of peaks) h += bump(x, y, p.x, p.y, p.r, p.a);
    return h;
  }

  function sample() {
    for (let j = 0; j < rows; j++) {
      const y = j * CELL;
      for (let i = 0; i < cols; i++) field[j * cols + i] = height(i * CELL, y);
    }
  }

  function draw() {
    sample();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const intro = reduced ? 1 : Math.min(1, (performance.now() - start) / 1800);

    for (let l = 0; l < LEVELS; l++) {
      const iso = (l + 0.5) / LEVELS;
      const reveal = Math.min(1, Math.max(0, intro * LEVELS * 1.4 - l * 0.9) / 1.5);
      if (reveal <= 0) continue;
      const index = l % 4 === 3;
      ctx.strokeStyle = colors[l];
      ctx.globalAlpha = (index ? 0.85 : 0.42) * reveal;
      ctx.lineWidth = index ? 1.4 : 0.8;
      ctx.beginPath();
      for (let j = 0; j < rows - 1; j++) {
        const y0 = j * CELL;
        for (let i = 0; i < cols - 1; i++) {
          const k = j * cols + i;
          const a = field[k], b = field[k + 1], c = field[k + cols + 1], d = field[k + cols];
          const code = (a > iso ? 8 : 0) | (b > iso ? 4 : 0) | (c > iso ? 2 : 0) | (d > iso ? 1 : 0);
          if (code === 0 || code === 15) continue;
          const x0 = i * CELL;
          // edge crossing points: top, right, bottom, left
          const top = () => [x0 + CELL * (iso - a) / (b - a), y0];
          const right = () => [x0 + CELL, y0 + CELL * (iso - b) / (c - b)];
          const bottom = () => [x0 + CELL * (iso - d) / (c - d), y0 + CELL];
          const left = () => [x0, y0 + CELL * (iso - a) / (d - a)];
          const seg = (p, q) => { ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); };
          switch (code) {
            case 1: case 14: seg(left(), bottom()); break;
            case 2: case 13: seg(bottom(), right()); break;
            case 3: case 12: seg(left(), right()); break;
            case 4: case 11: seg(top(), right()); break;
            case 5: seg(left(), top()); seg(bottom(), right()); break;
            case 6: case 9: seg(top(), bottom()); break;
            case 7: case 8: seg(left(), top()); break;
            case 10: seg(left(), bottom()); seg(top(), right()); break;
          }
        }
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function updateProbe() {
    if (!mouse.inside) return;
    const h = height(mouse.tx, mouse.ty);
    const elev = Math.max(0, Math.round(h * MAX_ELEV));
    probeElev.textContent = elev.toLocaleString("en-IN");
    const lat = home.lat + (H / 2 - mouse.ty) * 0.0004;
    const lon = home.lon + (mouse.tx - W / 2) * 0.0004;
    probeCoord.textContent = `${lat.toFixed(4)}° N  ${lon.toFixed(4)}° E`;
    probe.style.transform = `translate(${mouse.tx}px, ${mouse.ty}px)`;
  }

  let last = 0;
  function loop(now) {
    raf = requestAnimationFrame(loop);
    if (!visible || now - last < 33) return; // ~30fps is plenty for a slow map
    last = now;
    t += 0.033 * 1.2;
    mouse.x += (mouse.tx - mouse.x) * 0.18;
    mouse.y += (mouse.ty - mouse.y) * 0.18;
    mouse.amp += ((mouse.inside ? 1 : 0) - mouse.amp) * 0.08;
    for (let i = peaks.length - 1; i >= 0; i--) {
      const p = peaks[i];
      if (p.grow < 1) { p.grow = Math.min(1, p.grow + 0.05); p.a = p.max * p.grow; }
      else p.a *= 0.996;
      if (p.a < 0.01) peaks.splice(i, 1);
    }
    draw();
    updateProbe();
  }

  hero.addEventListener("pointermove", (e) => {
    const r = hero.getBoundingClientRect();
    mouse.tx = e.clientX - r.left;
    mouse.ty = e.clientY - r.top;
    if (!mouse.inside) { mouse.x = mouse.tx; mouse.y = mouse.ty; }
    mouse.inside = true;
    probe.classList.add("on");
    if (reduced) { mouse.x = mouse.tx; mouse.y = mouse.ty; mouse.amp = 1; draw(); updateProbe(); }
  });
  hero.addEventListener("pointerleave", () => {
    mouse.inside = false;
    probe.classList.remove("on");
  });
  hero.addEventListener("click", (e) => {
    if (e.target.closest("a, button")) return;
    const r = hero.getBoundingClientRect();
    peaks.push({ x: e.clientX - r.left, y: e.clientY - r.top, r: 70 + Math.random() * 60, max: 0.45, a: 0, grow: 0 });
    if (peaks.length > 8) peaks.shift();
    if (reduced) { peaks[peaks.length - 1].a = 0.45; peaks[peaks.length - 1].grow = 1; draw(); }
  });

  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(hero);
  window.addEventListener("resize", resize);
  resize();
  if (reduced) draw();
  else raf = requestAnimationFrame(loop);
})();
