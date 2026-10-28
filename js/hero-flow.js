// Hero: ~200k particles drifting through a curl-noise current, simulated on the GPU (WebGL2).
// They leave fading light trails. The cursor stirs a vortex; a click sends a shockwave.
// On load every particle bursts out from one point, then the current takes over.
// Falls back to the contour map (terrain.js) when WebGL2 float rendering isn't available.
(function () {
  let canvas = document.getElementById("terrain");
  if (!canvas) return;
  const hero = canvas.parentElement;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function fallback() {
    const fresh = canvas.cloneNode();
    canvas.replaceWith(fresh);
    const s = document.createElement("script");
    s.src = "js/terrain.js";
    document.body.appendChild(s);
  }

  const gl = canvas.getContext("webgl2", { antialias: false, alpha: false, depth: false, stencil: false, powerPreference: "high-performance" });
  if (!gl || !gl.getExtension("EXT_color_buffer_float")) return fallback();

  const NOISE = `
    vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
    vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
    vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
    vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
    float snoise(vec3 v){
      const vec2 C=vec2(1.0/6.0,1.0/3.0); const vec4 D=vec4(0.0,0.5,1.0,2.0);
      vec3 i=floor(v+dot(v,C.yyy)); vec3 x0=v-i+dot(i,C.xxx);
      vec3 g=step(x0.yzx,x0.xyz); vec3 l=1.0-g;
      vec3 i1=min(g.xyz,l.zxy); vec3 i2=max(g.xyz,l.zxy);
      vec3 x1=x0-i1+C.xxx; vec3 x2=x0-i2+C.yyy; vec3 x3=x0-D.yyy;
      i=mod289(i);
      vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
      float n_=0.142857142857; vec3 ns=n_*D.wyz-D.xzx;
      vec4 j=p-49.0*floor(p*ns.z*ns.z);
      vec4 x_=floor(j*ns.z); vec4 y_=floor(j-7.0*x_);
      vec4 x=x_*ns.x+ns.yyyy; vec4 y=y_*ns.x+ns.yyyy;
      vec4 h=1.0-abs(x)-abs(y);
      vec4 b0=vec4(x.xy,y.xy); vec4 b1=vec4(x.zw,y.zw);
      vec4 s0=floor(b0)*2.0+1.0; vec4 s1=floor(b1)*2.0+1.0;
      vec4 sh=-step(h,vec4(0.0));
      vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy; vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
      vec3 p0=vec3(a0.xy,h.x); vec3 p1=vec3(a0.zw,h.y); vec3 p2=vec3(a1.xy,h.z); vec3 p3=vec3(a1.zw,h.w);
      vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
      p0*=norm.x; p1*=norm.y; p2*=norm.z; p3*=norm.w;
      vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0); m=m*m;
      return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
    }`;

  const QUAD_VS = `#version 300 es
    in vec2 a; out vec2 uv;
    void main(){ uv=a*0.5+0.5; gl_Position=vec4(a,0.0,1.0); }`;

  const SIM_FS = `#version 300 es
    precision highp float;
    uniform sampler2D uPos;
    uniform float uTime, uDt, uAspect, uIntro, uSeed, uMouseOn;
    uniform vec2 uMouse, uMouseVel, uOrigin;
    uniform vec3 uPulse; // xy centre, z age in seconds (negative = none)
    in vec2 uv; out vec4 o;
    ${NOISE}
    float hash(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
    vec2 curl(vec3 p){
      float e=0.02;
      float a=snoise(p+vec3(0.0,e,0.0)), b=snoise(p-vec3(0.0,e,0.0));
      float c=snoise(p+vec3(e,0.0,0.0)), d=snoise(p-vec3(e,0.0,0.0));
      return vec2(a-b, -(c-d))/(2.0*e);
    }
    void main(){
      ivec2 id=ivec2(gl_FragCoord.xy);
      vec4 s=texelFetch(uPos,id,0);
      vec2 p=s.xy;

      vec2 v = curl(vec3(p*0.75, uTime*0.05))*0.16 + curl(vec3(p*2.1+11.0, uTime*0.09))*0.05;

      // cursor: a swirling vortex plus a push in the direction the cursor moves
      vec2 d=p-uMouse; float r2=dot(d,d);
      v += vec2(-d.y,d.x)*exp(-r2/0.06)*2.2*uMouseOn;
      v += uMouseVel*exp(-r2/0.035)*28.0*uMouseOn;

      // click: an expanding ring that throws particles outward
      if(uPulse.z>=0.0){
        vec2 q=p-uPulse.xy; float dist=length(q)+1e-4;
        float ring=dist-uPulse.z*1.1;
        v += (q/dist)*exp(-ring*ring/0.006)*exp(-uPulse.z*1.2)*2.6;
      }

      // intro: everything bursts out from one point before the current takes over
      vec2 fromO=p-uOrigin; float lo=length(fromO)+1e-4;
      v = mix((fromO/lo)*(0.25+1.6*(1.0-uIntro)), v, smoothstep(0.0,1.0,uIntro));

      vec2 vel=mix(s.zw, v, 0.2);
      p += vel*uDt;

      float h=hash(vec2(id)+uSeed);
      bool outside = abs(p.x)>uAspect*1.04 || abs(p.y)>1.04;
      if(outside || h < 0.003*uIntro*uIntro){
        p=vec2((hash(vec2(id)*1.7+uSeed+3.1)*2.0-1.0)*uAspect, hash(vec2(id)*2.3+uSeed+7.7)*2.0-1.0);
        vel=vec2(0.0);
      }
      o=vec4(p,vel);
    }`;

  const DRAW_VS = `#version 300 es
    precision highp float;
    uniform sampler2D uPos; uniform int uSize; uniform float uAspect, uPointSize, uGain;
    out vec3 col;
    void main(){
      ivec2 id=ivec2(gl_VertexID % uSize, gl_VertexID / uSize);
      vec4 s=texelFetch(uPos,id,0);
      gl_Position=vec4(s.x/uAspect, s.y, 0.0, 1.0);
      gl_PointSize=uPointSize;
      float sp=clamp(length(s.zw)*2.2, 0.0, 1.0);
      vec3 teal=vec3(0.18,0.55,0.56), moss=vec3(0.49,0.62,0.33), sand=vec3(0.85,0.70,0.44), rust=vec3(0.81,0.45,0.27), snow=vec3(0.96,0.95,0.91);
      vec3 c=mix(teal,moss,smoothstep(0.08,0.28,sp));
      c=mix(c,sand,smoothstep(0.28,0.5,sp));
      c=mix(c,rust,smoothstep(0.5,0.75,sp));
      c=mix(c,snow,smoothstep(0.8,1.0,sp));
      col=c*uGain*(0.6+sp*1.6);
    }`;

  const DRAW_FS = `#version 300 es
    precision highp float; in vec3 col; out vec4 o;
    void main(){ o=vec4(col,1.0); }`;

  const FADE_FS = `#version 300 es
    precision highp float; uniform float uKeep; out vec4 o;
    void main(){ o=vec4(0.0,0.0,0.0,uKeep); }`;

  const SHOW_FS = `#version 300 es
    precision highp float; uniform sampler2D uTrail; in vec2 uv; out vec4 o;
    void main(){
      vec3 t=texture(uTrail,uv).rgb;
      vec3 bg=vec3(12.0,24.0,32.0)/255.0;
      vec3 c=bg+(1.0-exp(-t*1.4));
      c*=mix(1.0,0.72,smoothstep(0.35,0.95,length(uv-0.5)*1.25)); // soft vignette
      o=vec4(c,1.0);
    }`;

  function compile(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }
  function program(vs, fs) {
    const p = gl.createProgram();
    gl.attachShader(p, compile(gl.VERTEX_SHADER, vs));
    gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fs));
    gl.bindAttribLocation(p, 0, "a");
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    const u = {};
    const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) { const name = gl.getActiveUniform(p, i).name; u[name] = gl.getUniformLocation(p, name); }
    return { p, u };
  }

  let sim, draw, fade, show;
  try {
    sim = program(QUAD_VS, SIM_FS);
    draw = program(DRAW_VS, DRAW_FS);
    fade = program(QUAD_VS, FADE_FS);
    show = program(QUAD_VS, SHOW_FS);
  } catch (err) {
    console.warn("Hero flow fell back to the contour map:", err.message);
    return fallback();
  }

  // one oversized triangle covers the screen
  const quad = gl.createVertexArray();
  gl.bindVertexArray(quad);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  const empty = gl.createVertexArray();

  function texture(w, h, internal, format, type, filter, data = null) {
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, internal, w, h, 0, format, type, data);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  }
  function target(tex) {
    const fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    return fb;
  }

  const small = Math.min(window.innerWidth, window.innerHeight) < 700;
  const N = small ? 256 : 448; // particles = N * N
  let W = 0, H = 0, dpr = 1, aspect = 1;
  const origin = { x: 0, y: 0 };

  // particle state: xy position, zw velocity
  const seedData = new Float32Array(N * N * 4);
  function resetParticles() {
    for (let i = 0; i < N * N; i++) {
      const a = Math.random() * Math.PI * 2, r = Math.random() * 0.03;
      seedData[i * 4] = origin.x + Math.cos(a) * r;
      seedData[i * 4 + 1] = origin.y + Math.sin(a) * r;
      seedData[i * 4 + 2] = 0;
      seedData[i * 4 + 3] = 0;
    }
  }
  const state = [0, 1].map(() => {
    const tex = texture(N, N, gl.RGBA32F, gl.RGBA, gl.FLOAT, gl.NEAREST);
    return { tex, fb: target(tex) };
  });
  let cur = 0;

  let trail = null;
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    W = hero.clientWidth;
    H = hero.clientHeight;
    aspect = W / H;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    if (trail) { gl.deleteTexture(trail.tex); gl.deleteFramebuffer(trail.fb); }
    const tex = texture(canvas.width, canvas.height, gl.RGBA16F, gl.RGBA, gl.HALF_FLOAT, gl.LINEAR);
    trail = { tex, fb: target(tex) };
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
  }

  // the burst starts to the right of the name, where there's open space
  resize();
  origin.x = aspect * (W > 860 ? 0.32 : 0.0);
  origin.y = W > 860 ? 0.12 : 0.35;
  resetParticles();
  state.forEach((s) => {
    gl.bindTexture(gl.TEXTURE_2D, s.tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, N, N, 0, gl.RGBA, gl.FLOAT, seedData);
  });

  const mouse = { x: 0, y: 0, px: 0, py: 0, vx: 0, vy: 0, on: 0, inside: false };
  let pulse = null;
  let t = 0, start = performance.now(), visible = true;
  const seed = Math.random() * 100;

  function step(dt, intro) {
    // simulate
    const src = state[cur], dst = state[1 - cur];
    gl.bindFramebuffer(gl.FRAMEBUFFER, dst.fb);
    gl.viewport(0, 0, N, N);
    gl.useProgram(sim.p);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, src.tex);
    gl.uniform1i(sim.u.uPos, 0);
    gl.uniform1f(sim.u.uTime, t);
    gl.uniform1f(sim.u.uDt, dt);
    gl.uniform1f(sim.u.uAspect, aspect);
    gl.uniform1f(sim.u.uIntro, intro);
    gl.uniform1f(sim.u.uSeed, (seed + t * 7.31) % 1000);
    gl.uniform1f(sim.u.uMouseOn, mouse.on);
    gl.uniform2f(sim.u.uMouse, mouse.x, mouse.y);
    gl.uniform2f(sim.u.uMouseVel, mouse.vx, mouse.vy);
    gl.uniform2f(sim.u.uOrigin, origin.x, origin.y);
    gl.uniform3f(sim.u.uPulse, pulse ? pulse.x : 0, pulse ? pulse.y : 0, pulse ? (performance.now() - pulse.t) / 1000 : -1);
    gl.bindVertexArray(quad);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    cur = 1 - cur;
  }

  function render() {
    // fade the old trails, then add this frame's particles on top
    gl.bindFramebuffer(gl.FRAMEBUFFER, trail.fb);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ZERO, gl.SRC_ALPHA);
    gl.useProgram(fade.p);
    gl.uniform1f(fade.u.uKeep, 0.935);
    gl.bindVertexArray(quad);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    gl.blendFunc(gl.ONE, gl.ONE);
    gl.useProgram(draw.p);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, state[cur].tex);
    gl.uniform1i(draw.u.uPos, 0);
    gl.uniform1i(draw.u.uSize, N);
    gl.uniform1f(draw.u.uAspect, aspect);
    gl.uniform1f(draw.u.uPointSize, Math.max(1, dpr));
    gl.uniform1f(draw.u.uGain, small ? 0.05 : 0.026);
    gl.bindVertexArray(empty);
    gl.drawArrays(gl.POINTS, 0, N * N);
    gl.disable(gl.BLEND);

    // show it
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.useProgram(show.p);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, trail.tex);
    gl.uniform1i(show.u.uTrail, 0);
    gl.bindVertexArray(quad);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  let last = performance.now();
  function loop(now) {
    requestAnimationFrame(loop);
    if (!visible) { last = now; return; }
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    t += dt;
    const intro = Math.min(1, (now - start) / 2600);

    // cursor velocity in simulation units, eased so quick flicks feel smooth
    mouse.on += ((mouse.inside ? 1 : 0) - mouse.on) * 0.08;
    mouse.vx = mouse.vx * 0.8 + (mouse.x - mouse.px) * 0.2;
    mouse.vy = mouse.vy * 0.8 + (mouse.y - mouse.py) * 0.2;
    mouse.px = mouse.x; mouse.py = mouse.y;
    if (pulse && now - pulse.t > 3000) pulse = null;

    step(dt, intro);
    render();
  }

  function toSim(e) {
    const r = hero.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width * 2 - 1) * aspect, -((e.clientY - r.top) / r.height * 2 - 1)];
  }
  hero.addEventListener("pointermove", (e) => {
    const [x, y] = toSim(e);
    if (!mouse.inside) { mouse.px = x; mouse.py = y; }
    mouse.x = x; mouse.y = y; mouse.inside = true;
  });
  hero.addEventListener("pointerleave", () => { mouse.inside = false; });
  hero.addEventListener("click", (e) => {
    if (e.target.closest("a, button")) return;
    const [x, y] = toSim(e);
    pulse = { x, y, t: performance.now() };
  });

  canvas.addEventListener("webglcontextlost", (e) => { e.preventDefault(); visible = false; });
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(hero);
  window.addEventListener("resize", () => { resize(); });

  if (reduced) {
    // settle the flow off-screen, then show one still frame
    for (let i = 0; i < 360; i++) { t += 1 / 60; step(1 / 60, 1); if (i > 300) render(); }
    render();
  } else {
    requestAnimationFrame(loop);
  }
})();
