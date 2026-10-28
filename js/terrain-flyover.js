// Hero: a slow flyover of terrain drawn as stacked ridgelines.
// The cursor is a survey scanner: it lifts the ground and lights up the ridges under it.
// Clicking sends a shockwave rolling across the land.
// (The previous contour-map hero lives in terrain.js — swap the script tag to go back.)
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

  const ROWS = 64;
  const Z_NEAR = 1.5, Z_FAR = 14;
  const CAM_H = 1.15;
  const MAX_ELEV = 2600;
  const NIGHT = "#0c1820";

  let W = 0, H = 0, dpr = 1, cols = 0, horizon = 0, focal = 0;
  let travel = 0, start = performance.now(), visible = true;
  const mouse = { x: -9999, y: -9999, tx: -9999, ty: -9999, inside: false, amp: 0 };
  const waves = [];
  let nearest = { d: Infinity, h: 0 };

  // rows are reused every frame: screen x, height, screen y, scanner glow
  let SX, HT, SY, GL;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    W = hero.clientWidth;
    H = hero.clientHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    horizon = H * 0.34;
    focal = Math.max(W, H * 1.4) * 0.55;
    cols = Math.max(60, Math.round(W / 14));
    SX = new Float32Array(cols);
    HT = new Float32Array(ROWS * cols);
    SY = new Float32Array(ROWS * cols);
    GL = new Float32Array(ROWS * cols);
    for (let i = 0; i < cols; i++) SX[i] = -40 + (i / (cols - 1)) * (W + 80);
    if (reduced) draw();
  }

  function ground(x, z) {
    // ridged-ish fractal hills, flattened in the valleys
    const n = fbm(x * 0.28 + 40, z * 0.28, 4);
    const h = Math.max(0, n - 0.32) * 2.4;
    return h * h * 1.6 + n * 0.12;
  }

  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = NIGHT;
    ctx.fillRect(0, 0, W, H);

    // faint glow along the horizon
    const g = ctx.createLinearGradient(0, horizon - 120, 0, horizon + 60);
    g.addColorStop(0, "rgba(47,127,128,0)");
    g.addColorStop(0.75, "rgba(47,127,128,0.10)");
    g.addColorStop(1, "rgba(47,127,128,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, horizon - 120, W, 180);

    const intro = reduced ? 1 : Math.min(1, (performance.now() - start) / 2200);
    const rise = 1 - Math.pow(1 - intro, 3);
    const now = performance.now();
    nearest = { d: Infinity, h: 0 };

    // pass 1: heights, projection and scanner glow for every vertex
    for (let r = 0; r < ROWS; r++) {
      const z = Z_FAR - (r / (ROWS - 1)) * (Z_FAR - Z_NEAR); // far → near
      const k = focal / z;
      for (let i = 0; i < cols; i++) {
        const idx = r * cols + i;
        const wx = (SX[i] - W / 2) / k;
        let h = ground(wx, z + travel) * rise;
        const baseY = horizon + (CAM_H - h) * k;

        // distance from the cursor, squashed vertically so the scanner reads as a pool on the ground
        const dx = SX[i] - mouse.x, dy = (baseY - mouse.y) * 1.7;
        const d2 = dx * dx + dy * dy;
        const glow = mouse.amp * Math.exp(-d2 / (2 * 210 * 210));
        h += glow * 0.8;

        for (const w of waves) {
          const age = (now - w.t) / 1000;
          const wd = Math.hypot(SX[i] - w.x, (baseY - w.y) * 1.7);
          const ring = wd - age * 520;
          h += w.a * Math.exp(-age * 1.1) * Math.exp(-(ring * ring) / (2 * 38 * 38));
        }

        HT[idx] = h;
        SY[idx] = horizon + (CAM_H - h) * k;
        GL[idx] = glow;
        if (d2 < nearest.d) nearest = { d: d2, h };
      }
    }

    // pass 2: draw ridgelines back to front; each row's fill hides the rows behind it
    for (let r = 0; r < ROWS; r++) {
      const depth = r / (ROWS - 1);
      const o = r * cols;
      ctx.beginPath();
      ctx.moveTo(SX[0], SY[o]);
      for (let i = 1; i < cols; i++) ctx.lineTo(SX[i], SY[o + i]);
      ctx.lineTo(W + 40, H + 10);
      ctx.lineTo(-40, H + 10);
      ctx.closePath();
      ctx.fillStyle = NIGHT;
      ctx.fill();

      let sum = 0;
      for (let i = 0; i < cols; i++) sum += HT[o + i];
      const [cr, cg, cb] = ramp(Math.min(1, (sum / cols) * 0.9 + 0.1));
      ctx.beginPath();
      ctx.moveTo(SX[0], SY[o]);
      for (let i = 1; i < cols; i++) ctx.lineTo(SX[i], SY[o + i]);
      ctx.strokeStyle = `rgba(${cr},${cg},${cb},${0.08 + depth * 0.32})`;
      ctx.lineWidth = 0.6 + depth * 0.9;
      ctx.stroke();

      // scanner: re-stroke the lit stretch of this ridge in its true elevation colour
      let open = false;
      for (let i = 0; i < cols; i++) {
        const gl = GL[o + i];
        if (gl > 0.04) {
          if (!open) { ctx.beginPath(); ctx.moveTo(SX[i], SY[o + i]); open = true; }
          else ctx.lineTo(SX[i], SY[o + i]);
        }
        if (open && (gl <= 0.04 || i === cols - 1)) {
          const mid = o + Math.max(0, i - 1);
          const [lr, lg, lb] = ramp(Math.min(1, HT[mid] * 0.7 + 0.35));
          ctx.strokeStyle = `rgba(${lr},${lg},${lb},${Math.min(1, 0.5 + GL[mid]) * (0.55 + depth * 0.45)})`;
          ctx.lineWidth = 1.3 + depth * 1.4 * GL[mid];
          ctx.stroke();
          open = false;
        }
      }
    }
  }

  function updateProbe() {
    if (!mouse.inside) return;
    probeElev.textContent = Math.max(0, Math.round(nearest.h * MAX_ELEV * 0.6)).toLocaleString("en-IN");
    const lat = home.lat + (H / 2 - mouse.ty) * 0.0004;
    const lon = home.lon + (mouse.tx - W / 2) * 0.0004;
    probeCoord.textContent = `${lat.toFixed(4)}° N  ${lon.toFixed(4)}° E`;
    probe.style.transform = `translate(${mouse.tx}px, ${mouse.ty}px)`;
  }

  let last = 0;
  function loop(now) {
    requestAnimationFrame(loop);
    if (!visible || now - last < 30) return;
    last = now;
    travel += 0.018;
    mouse.x += (mouse.tx - mouse.x) * 0.16;
    mouse.y += (mouse.ty - mouse.y) * 0.16;
    mouse.amp += ((mouse.inside ? 1 : 0) - mouse.amp) * 0.07;
    for (let i = waves.length - 1; i >= 0; i--) if (now - waves[i].t > 3500) waves.splice(i, 1);
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
    waves.push({ x: e.clientX - r.left, y: e.clientY - r.top, t: performance.now(), a: 0.5 });
    if (waves.length > 5) waves.shift();
  });

  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(hero);
  window.addEventListener("resize", resize);
  resize();
  if (reduced) draw();
  else requestAnimationFrame(loop);
})();
