// Renders the data-driven sections and their small interactive demos.
(function () {
  const S = window.SITE;
  const $ = (sel) => document.querySelector(sel);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const wait = (ms) => new Promise((r) => setTimeout(r, reduced ? 0 : ms));
  const onView = (el, fn, threshold = 0.35) =>
    new IntersectionObserver(([e]) => fn(e.isIntersecting), { threshold }).observe(el);

  /* ---------- projects ---------- */
  // On wide screens the copy scrolls on the left while one sticky stage on the right shows the
  // demo of whichever project is in the middle of the screen. On narrow screens each demo sits
  // under its own project.
  function renderProjects() {
    const root = $("#project-list");
    root.innerHTML = `<div class="project-copies"></div><div class="stage"><div class="stage-inner"></div></div>`;
    const copies = root.querySelector(".project-copies");
    const stage = root.querySelector(".stage-inner");
    const pairs = S.projects.map((p) => {
      const art = document.createElement("article");
      art.className = "project";
      art.id = "p-" + p.id;
      art.innerHTML = `
        <div class="project-copy">
          <p class="project-what">${esc(p.what)}</p>
          <h3 class="project-name">${esc(p.name)}</h3>
          <p class="project-summary">${esc(p.summary)}</p>
          <ul class="project-facts">${p.facts.map((f) => `<li>${esc(f)}</li>`).join("")}</ul>
          <div class="tech">${p.tech.map((t) => `<span>${esc(t)}</span>`).join("")}</div>
          <a class="project-link" href="${p.repo}" target="_blank" rel="noopener">View the code on GitHub</a>
        </div>`;
      const demo = document.createElement("div");
      demo.className = "demo";
      demo.dataset.demo = p.demo;
      copies.appendChild(art);
      return { art, demo };
    });

    const wide = window.matchMedia("(min-width: 861px)");
    function place() {
      pairs.forEach(({ art, demo }) => (wide.matches ? stage : art).appendChild(demo));
    }
    place();
    wide.addEventListener("change", place);
    pairs.forEach(({ demo }) => demos[demo.dataset.demo]?.(demo));

    function activate(i) {
      pairs.forEach(({ art, demo }, k) => {
        art.classList.toggle("is-active", k === i);
        demo.classList.toggle("is-active", k === i);
      });
    }
    activate(0);
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) activate(pairs.findIndex((p) => p.art === e.target)); });
    }, { rootMargin: "-45% 0px -45% 0px" });
    pairs.forEach(({ art }) => io.observe(art));
  }

  /* ---------- timeline ---------- */
  $("#timeline").innerHTML = S.experience
    .map((e) => `<li>
        <h3>${esc(e.role)}</h3>
        <span class="when">${esc(e.when)}</span>
        <span class="org">${esc(e.org)}</span>
        <ul>${e.points.map((p) => `<li>${esc(p)}</li>`).join("")}</ul>
      </li>`)
    .join("");

  /* ---------- stack explorer ---------- */
  const usedBy = (skill) => S.projects.filter((p) => p.tech.some((t) => t.toLowerCase() === skill.toLowerCase()));
  const skillsEl = $("#skills");
  const sp = $("#stack-projects");
  skillsEl.innerHTML = Object.entries(S.skills)
    .map(([group, items]) => `<div class="skill-group"><h3>${esc(group)}</h3><div>${items
      .map((s) => `<button type="button" class="skill${usedBy(s).length ? " used" : ""}" data-skill="${esc(s)}">${esc(s)}</button>`)
      .join("")}</div></div>`)
    .join("");
  sp.innerHTML = S.projects.map((p) => `<li data-id="${p.id}"><b>${esc(p.name)}</b><span>${esc(p.what)}</span></li>`).join("");
  $("#creds").innerHTML = S.credentials.map((c) => `<li>${esc(c)}</li>`).join("");

  let pinned = null;
  function focusSkill(skill) {
    skillsEl.querySelectorAll(".skill").forEach((b) => b.classList.toggle("on", b.dataset.skill === skill));
    skillsEl.classList.toggle("focusing", !!skill);
    sp.classList.toggle("filtering", !!skill);
    const ids = skill ? usedBy(skill).map((p) => p.id) : [];
    sp.querySelectorAll("li").forEach((li) => li.classList.toggle("match", ids.includes(li.dataset.id)));
  }
  skillsEl.addEventListener("pointerover", (e) => { const b = e.target.closest(".skill"); if (b && !pinned) focusSkill(b.dataset.skill); });
  skillsEl.addEventListener("pointerleave", () => { if (!pinned) focusSkill(null); });
  skillsEl.addEventListener("focusin", (e) => { const b = e.target.closest(".skill"); if (b && !pinned) focusSkill(b.dataset.skill); });
  skillsEl.addEventListener("click", (e) => {
    const b = e.target.closest(".skill");
    if (!b) return;
    pinned = pinned === b.dataset.skill ? null : b.dataset.skill;
    focusSkill(pinned);
  });

  /* ---------- chess ratings ---------- */
  const ratings = $("#ratings");
  if (S.chessUsername) {
    ratings.innerHTML = `<p class="ratings-note">Fetching live ratings…</p>`;
    fetch(`https://api.chess.com/pub/player/${encodeURIComponent(S.chessUsername)}/stats`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        const modes = [["chess_rapid", "Rapid"], ["chess_blitz", "Blitz"], ["chess_bullet", "Bullet"], ["chess_daily", "Daily"]];
        const cells = modes.filter(([k]) => d[k]?.last).map(([k, label]) => `
          <div class="rating"><div class="r" data-count="${d[k].last.rating}">0</div><div class="k">${label}</div>
          ${d[k].best ? `<div class="best">best ${d[k].best.rating}</div>` : ""}</div>`);
        if (d.tactics?.highest) cells.push(`<div class="rating"><div class="r" data-count="${d.tactics.highest.rating}">0</div><div class="k">Puzzles</div></div>`);
        ratings.innerHTML = cells.join("") + `<p class="ratings-note">Live from <a href="https://www.chess.com/member/${encodeURIComponent(S.chessUsername)}" target="_blank" rel="noopener">chess.com/member/${esc(S.chessUsername)}</a></p>`;
        onView(ratings, (v) => v && countUp(ratings.querySelectorAll("[data-count]")));
      })
      .catch(() => { ratings.innerHTML = `<p class="ratings-note">Chess.com didn't respond. Ratings will show when it's back.</p>`; });
  } else {
    ratings.innerHTML = `<p class="ratings-note">Live ratings appear here once a Chess.com username is set in <code>js/data.js</code>.</p>`;
  }

  function countUp(nodes) {
    nodes.forEach((n) => {
      if (n.dataset.done) return;
      n.dataset.done = 1;
      const end = +n.dataset.count, t0 = performance.now(), dur = reduced ? 0 : 1200;
      const step = (now) => {
        const k = dur ? Math.min(1, (now - t0) / dur) : 1;
        n.textContent = Math.round(end * (1 - Math.pow(1 - k, 3)));
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }

  /* ---------- contact ---------- */
  $("#email-text").textContent = S.email;
  $("#copy-email").addEventListener("click", async () => {
    const hint = $("#email-hint");
    try {
      await navigator.clipboard.writeText(S.email);
      hint.textContent = "Copied to clipboard";
    } catch {
      location.href = "mailto:" + S.email;
      hint.textContent = "Opening your email app";
    }
    setTimeout(() => (hint.textContent = "Copy"), 2200);
  });

  /* ================= project demos ================= */
  const demos = {
    // FreshRoute: spoilage comparison + 30 random tests
    bars(el) {
      el.innerHTML = `<div class="bars">
          <div class="bar-row fefo"><span class="lab">FEFO</span><span class="track"><span class="fill"></span></span><span class="val" data-to="23.3">0%</span></div>
          <div class="bar-row fr"><span class="lab">FreshRoute</span><span class="track"><span class="fill"></span></span><span class="val" data-to="14.7">0%</span></div>
          <div><p class="tests-lab">Random tests won: <b class="won">0</b> of 30</p><div class="tests">${"<i></i>".repeat(30)}</div></div>
        </div>
        <span class="demo-caption">Produce spoiled, lower is better</span>
        <button class="btn btn-ghost btn-sm demo-btn" type="button">Run again</button>`;
      const fills = el.querySelectorAll(".fill"), vals = el.querySelectorAll(".val"), cells = el.querySelectorAll(".tests i"), won = el.querySelector(".won");
      let running = false;
      async function run() {
        if (running) return;
        running = true;
        fills.forEach((f) => (f.style.width = "0"));
        vals.forEach((v) => (v.textContent = "0%"));
        cells.forEach((c) => c.classList.remove("win"));
        won.textContent = 0;
        await wait(120);
        vals.forEach((v, i) => {
          const to = +v.dataset.to;
          fills[i].style.width = (to / 26) * 100 + "%";
          const t0 = performance.now();
          const step = (now) => {
            const k = reduced ? 1 : Math.min(1, (now - t0) / 1400);
            v.textContent = (to * (1 - Math.pow(1 - k, 3))).toFixed(1) + "%";
            if (k < 1) requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
        });
        await wait(900);
        for (let i = 0; i < cells.length; i++) {
          cells[i].classList.add("win");
          won.textContent = i + 1;
          await wait(45);
        }
        running = false;
      }
      el.querySelector(".demo-btn").addEventListener("click", run);
      let done = false;
      onView(el, (v) => { if (v && !done) { done = true; run(); } });
    },

    // bitandbites: streaming generation per tenant + a blocked cross-tenant read
    stream(el) {
      const tenants = {
        "Crumb Bakery": ["Why sourdough loves a cold night", "Long, cold fermentation gives wild yeast time to build flavour. Bakers retard their dough overnight at around 4°C, which slows the yeast while the bacteria keep producing acids."],
        "Lumen Clinic": ["Blue light and sleep, explained", "Screens emit short-wavelength light that can delay melatonin release. Studies suggest dimming screens an hour before bed helps most people fall asleep faster."],
        "Trailhead Co": ["Packing for a two-day hike", "Start with the big three: shelter, sleep system and pack. Keep their combined weight low and everything else gets easier, including the climb on day two."],
      };
      const names = Object.keys(tenants);
      el.innerHTML = `<div class="stream">
          <div class="tenants" role="group" aria-label="Choose a tenant">${names.map((n, i) => `<button type="button" aria-pressed="${i === 0}">${n}</button>`).join("")}
            <button type="button" class="leak">Read another tenant's posts</button></div>
          <div class="stream-out" aria-live="polite"></div>
        </div>
        <span class="demo-caption">Each tenant only ever sees its own data</span>`;
      const outEl = el.querySelector(".stream-out");
      const btns = [...el.querySelectorAll(".tenants button:not(.leak)")];
      let current = names[0], token = 0;
      async function generate(name) {
        const my = ++token;
        const [title, text] = tenants[name];
        outEl.innerHTML = `<h4></h4><p></p>`;
        const h = outEl.querySelector("h4"), p = outEl.querySelector("p");
        for (const w of title.split(" ")) { if (my !== token) return; h.textContent += w + " "; await wait(60); }
        for (const w of text.split(" ")) { if (my !== token) return; p.textContent += w + " "; await wait(35); }
        if (my !== token) return;
        await wait(300);
        outEl.insertAdjacentHTML("beforeend", `<span class="chk">✓ 3 claims fact-checked · schema valid · ready to publish</span>`);
      }
      btns.forEach((b) => b.addEventListener("click", () => {
        btns.forEach((x) => x.setAttribute("aria-pressed", x === b));
        current = b.textContent;
        generate(current);
      }));
      el.querySelector(".leak").addEventListener("click", () => {
        token++;
        const other = names.find((n) => n !== current);
        outEl.innerHTML = `<p class="blocked">SELECT * FROM posts WHERE tenant = '${other}';</p>
          <p class="blocked">ERROR: 0 rows. Blocked by row-level security policy "tenant_isolation".</p>
          <span class="chk">✓ Signed in as ${esc(current)}, so ${esc(other)}'s data stays invisible.</span>`;
      });
      let done = false;
      onView(el, (v) => { if (v && !done) { done = true; generate(current); } });
    },

    // DepthWizard: drag-to-rotate wireframe terrain
    terrain(el) {
      el.innerHTML = `<canvas aria-label="3D terrain. Drag to rotate." role="img"></canvas><span class="demo-caption">Drag to rotate · scroll the page as usual</span>`;
      const cv = el.querySelector("canvas"), c = cv.getContext("2d");
      const { fbm, ramp } = window.Noise;
      const N = 42;
      const hgt = [];
      for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
        const x = i / N, y = j / N;
        const edge = Math.min(x, y, 1 - x, 1 - y) * 4;
        hgt.push(Math.pow(fbm(x * 3 + 7, y * 3 + 2, 5), 1.6) * 2.1 * Math.min(1, edge + 0.2));
      }
      let yaw = 0.7, pitch = 0.95, drag = null, vis = false, w = 0, h = 0, dpr = 1;
      function size() {
        dpr = Math.min(devicePixelRatio || 1, 2);
        w = el.clientWidth; h = el.clientHeight;
        cv.width = w * dpr; cv.height = h * dpr;
      }
      function proj(i, j) {
        const x = i / (N - 1) - 0.5, z = j / (N - 1) - 0.5, y = hgt[j * N + i] * 0.42;
        const cx = Math.cos(yaw), sx = Math.sin(yaw);
        const x1 = x * cx - z * sx, z1 = x * sx + z * cx;
        const cp = Math.cos(pitch), sp = Math.sin(pitch);
        // camera sits above the terrain looking down: far rows rise up the screen
        const y2 = y * cp + z1 * sp, z2 = z1 * cp - y * sp;
        const s = Math.min(w, h) * 1.05 / (2.2 + z2);
        return [w / 2 + x1 * s * 1.6, h * 0.6 - y2 * s * 1.6];
      }
      function draw() {
        c.setTransform(dpr, 0, 0, dpr, 0, 0);
        c.clearRect(0, 0, w, h);
        c.lineWidth = 0.9;
        const P = [];
        for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) P.push(proj(i, j));
        for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
          const k = j * N + i, [r, g, b] = ramp(hgt[k] / 0.75);
          c.strokeStyle = `rgba(${r},${g},${b},0.8)`;
          c.beginPath();
          if (i < N - 1) { c.moveTo(...P[k]); c.lineTo(...P[k + 1]); }
          if (j < N - 1) { c.moveTo(...P[k]); c.lineTo(...P[k + N]); }
          c.stroke();
        }
      }
      function loop() {
        if (vis) {
          if (!drag && !reduced) yaw += 0.003;
          draw();
        }
        requestAnimationFrame(loop);
      }
      el.addEventListener("pointerdown", (e) => { drag = { x: e.clientX, y: e.clientY, yaw, pitch }; el.setPointerCapture(e.pointerId); });
      el.addEventListener("pointermove", (e) => {
        if (!drag) return;
        yaw = drag.yaw + (e.clientX - drag.x) * 0.01;
        pitch = Math.max(0.25, Math.min(1.4, drag.pitch + (e.clientY - drag.y) * 0.006));
        if (reduced) draw();
      });
      el.addEventListener("pointerup", () => (drag = null));
      el.style.touchAction = "pan-y";
      el.style.cursor = "grab";
      window.addEventListener("resize", () => { size(); draw(); });
      // the demo can start hidden on the stage, so measure again whenever it appears
      onView(el, (v) => { vis = v; if (v) { size(); draw(); } }, 0);
      size(); draw();
      requestAnimationFrame(loop);
    },

    // OmniShell: a looping transcript of the agent recovering from an error
    shell(el) {
      el.innerHTML = `<div class="mini-shell" aria-label="OmniShell example session"></div><span class="demo-caption">The agent fixes its own failed commands</span>`;
      const box = el.querySelector(".mini-shell");
      const script = [
        ["u", "› compress the log files bigger than 100MB"],
        ["a", "plan: find + gzip"],
        ["", "$ find /var/log -size +100M -exec gzip {} \\;"],
        ["no", "gzip: /var/log/syslog.1: Permission denied"],
        ["a", "↻ error read: needs elevated permissions, retrying"],
        ["", "$ sudo find /var/log -size +100M -exec gzip {} \\;"],
        ["ok", "✓ 3 files compressed, 1.2 GB freed"],
        ["u", "› which process is using port 3000?"],
        ["", "$ lsof -i :3000"],
        ["ok", "✓ node (pid 4812)"],
      ];
      let playing = false, vis = false;
      async function play() {
        if (playing) return;
        playing = true;
        while (vis) {
          box.innerHTML = "";
          for (const [cls, text] of script) {
            if (!vis) break;
            const d = document.createElement("div");
            d.className = cls;
            box.appendChild(d);
            if (cls === "u" || cls === "") {
              for (const ch of text) { d.textContent += ch; await wait(18); }
            } else d.textContent = text;
            await wait(cls === "u" ? 500 : 380);
          }
          await wait(2600);
        }
        playing = false;
      }
      onView(el, (v) => { vis = v; if (v) play(); });
    },
  };

  renderProjects();
})();
