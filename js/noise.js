// Small seeded 2D value noise with fractal octaves. Shared by the hero map and the 3D demo.
(function () {
  const perm = new Uint8Array(512);
  let seed = 1337;
  const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  const p = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [p[i], p[j]] = [p[j], p[i]];
  }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  const grad = new Float32Array(256).map(() => rand());

  const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
  const lerp = (a, b, t) => a + (b - a) * t;

  function noise(x, y) {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const X = xi & 255, Y = yi & 255;
    const a = grad[perm[X + perm[Y]]];
    const b = grad[perm[X + 1 + perm[Y]]];
    const c = grad[perm[X + perm[Y + 1]]];
    const d = grad[perm[X + 1 + perm[Y + 1]]];
    const u = fade(xf), v = fade(yf);
    return lerp(lerp(a, b, u), lerp(c, d, u), v);
  }

  function fbm(x, y, octaves = 4) {
    let sum = 0, amp = 0.5, freq = 1, norm = 0;
    for (let o = 0; o < octaves; o++) {
      sum += noise(x * freq, y * freq) * amp;
      norm += amp;
      amp *= 0.5;
      freq *= 2.03;
    }
    return sum / norm;
  }

  // Hypsometric ramp: water-teal, lowland moss, upland sand, ridge rust, summit snow.
  const RAMP = [
    [0.0, [47, 127, 128]],
    [0.35, [125, 159, 85]],
    [0.6, [217, 178, 111]],
    [0.82, [207, 116, 68]],
    [1.0, [244, 241, 232]],
  ];
  function ramp(t) {
    t = Math.min(1, Math.max(0, t));
    for (let i = 1; i < RAMP.length; i++) {
      if (t <= RAMP[i][0]) {
        const [t0, c0] = RAMP[i - 1], [t1, c1] = RAMP[i];
        const k = (t - t0) / (t1 - t0);
        return c0.map((v, j) => Math.round(lerp(v, c1[j], k)));
      }
    }
    return RAMP[RAMP.length - 1][1];
  }

  window.Noise = { noise, fbm, ramp };
})();
