// OmniShell-style terminal: understands commands and plain English,
// and recovers from typos the way the real agent recovers from failed commands.
(function () {
  const S = window.SITE;
  const body = document.getElementById("term-body");
  const form = document.getElementById("term-form");
  const input = document.getElementById("term-in");
  const status = document.getElementById("term-status");
  const chips = document.getElementById("term-chips");
  if (!body) return;

  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const out = (html, cls = "") => {
    const d = document.createElement("div");
    d.className = "ln " + cls;
    d.innerHTML = html;
    body.appendChild(d);
    body.scrollTop = body.scrollHeight;
    return d;
  };
  const kv = (pairs) => out(pairs.map(([k, v]) => `<span>${esc(k)}</span><span>${v}</span>`).join(""), "kv");
  const link = (href, text) => `<a href="${href}" target="_blank" rel="noopener">${esc(text || href)}</a>`;
  const goTo = (id) => window.SiteScroll?.(document.getElementById(id));

  const commands = {
    help: {
      desc: "list commands",
      run() {
        out("Commands. You can also just ask in plain English.", "dim");
        kv(Object.entries(commands).filter(([, c]) => !c.hidden).map(([k, c]) => [k, esc(c.desc)]));
      },
    },
    whoami: {
      desc: "who I am",
      run() {
        out(`<span class="hl">${esc(S.name)}</span>`);
        out(esc(S.tagline));
        kv([
          ["studying", "B.Tech Computer Science, KIET University (2025–2029), CGPA 8.00"],
          ["based in", esc(S.location.city)],
          ["looking for", "SWE, AI/ML and full-stack internships"],
        ]);
      },
    },
    projects: {
      desc: "list what I've built",
      run() {
        S.projects.forEach((p) => kv([[p.id, `<span class="hl">${esc(p.name)}</span> — ${esc(p.what)}`]]));
        out("Type <span class=\"hl\">open &lt;name&gt;</span> for details, e.g. open freshroute", "dim");
      },
    },
    open: {
      desc: "open <project> for details",
      run(arg) {
        const p = S.projects.find((x) => x.id === arg || x.name.toLowerCase() === arg);
        if (!p) {
          out(`open: no project called "${esc(arg || "")}". Try: ${S.projects.map((x) => x.id).join(", ")}`, "err");
          return;
        }
        out(`<span class="hl">${esc(p.name)}</span> — ${esc(p.what)}`);
        out(esc(p.summary));
        p.facts.forEach((f) => out("  • " + esc(f)));
        out("stack: " + esc(p.tech.join(", ")), "dim");
        out("code: " + link(p.repo));
      },
    },
    experience: {
      desc: "where I've worked",
      run() {
        S.experience.forEach((e) => {
          out(`<span class="hl">${esc(e.role)}</span>, ${esc(e.org)}  <span class="dim">${esc(e.when)}</span>`);
          e.points.forEach((p) => out("  • " + esc(p)));
        });
      },
    },
    skills: {
      desc: "my stack",
      run() { kv(Object.entries(S.skills).map(([k, v]) => [k.toLowerCase(), esc(v.join(", "))])); },
    },
    chess: {
      desc: "chess, and my latest game",
      run() {
        out("Chess is how I switch off. I mostly love tactics.");
        out("My latest game is on the board, replayed move by move. Taking you there…", "dim");
        setTimeout(() => goTo("chess"), 600);
      },
    },
    music: {
      desc: "what I listen to",
      run() {
        out("On repeat: " + S.artists.map((a) => `<span class="hl">${esc(a.name)}</span>`).join(", "));
        setTimeout(() => goTo("music"), 600);
      },
    },
    films: {
      desc: "my four favourite films",
      run() {
        S.films.forEach((f) => out(`  ${esc(f.title)} <span class="dim">(${f.year}, ${esc(f.director)})</span>`));
        setTimeout(() => goTo("films"), 600);
      },
    },
    contact: {
      desc: "how to reach me",
      run() {
        kv([
          ["email", `<a href="mailto:${S.email}">${esc(S.email)}</a>`],
          ["github", link(S.links.github)],
          ["linkedin", link(S.links.linkedin)],
          ["leetcode", link(S.links.leetcode)],
        ]);
      },
    },
    freelance: {
      desc: "hire me for a project",
      run() {
        out("Yes, I take on freelance projects. Here's what I build:");
        S.freelance.services.forEach((sv) => out(`  • <span class="hl">${esc(sv.name)}</span>  <span class="dim">${esc(sv.proofText)}</span>`));
        out(`Send a brief from the form, or email <a href="mailto:${S.email}?subject=Project%20enquiry">${esc(S.email)}</a>. Taking you to the form…`, "dim");
        setTimeout(() => goTo("hire"), 900);
      },
    },
    resume: {
      desc: "download my resume",
      run() {
        out(`Downloading… if nothing happens, <a href="${S.resume}" download>click here</a>.`);
        const a = document.createElement("a");
        a.href = S.resume; a.download = "";
        document.body.appendChild(a); a.click(); a.remove();
      },
    },
    github: { desc: "open my GitHub", run() { out("Opening " + link(S.links.github)); window.open(S.links.github, "_blank", "noopener"); } },
    linkedin: { desc: "open my LinkedIn", run() { out("Opening " + link(S.links.linkedin)); window.open(S.links.linkedin, "_blank", "noopener"); } },
    neofetch: {
      desc: "system info, but it's me",
      run() {
        const art = [
          "        /\\          ",
          "       /  \\    /\\   ",
          "      /    \\  /  \\  ",
          "   /\\/      \\/    \\ ",
          "  /   ~~~~~~~~~~   \\",
        ];
        const info = [
          `<span class="hl">sarfaraz</span>@<span class="hl">kiet</span>`,
          `os       B.Tech CS, year 2`,
          `kernel   C++ / Python / TypeScript`,
          `uptime   building since 2025`,
          `shell    omnishell (self-correcting)`,
        ];
        art.forEach((a, i) => out(`<span class="plan">${esc(a)}</span>   ${info[i]}`));
      },
    },
    date: { desc: "current date", run() { out(new Date().toString()); } },
    clear: { desc: "clear the screen", run() { body.innerHTML = ""; } },
    sudo: {
      hidden: true,
      desc: "",
      run(arg) {
        if (arg.startsWith("hire")) {
          out("[sudo] password for recruiter: ********", "dim");
          out("Access granted. Excellent decision.", "plan");
          out(`Next step: email <a href="mailto:${S.email}?subject=Internship%20opportunity">${esc(S.email)}</a> or grab the ${`<a href="${S.resume}" download>resume</a>`}.`);
        } else out("sarfaraz is not in the sudoers file. This incident will be reported.", "err");
      },
    },
  };

  // plain-English intents → commands
  const intents = [
    [/\b(freelanc|clients?|quote|pricing|price|cost|rates?|work with|build (me|my|us|a|an)|website for|app for|project for|commission)/, "freelance"],
    [/\b(hire|hiring|recruit)/, "sudo hire-me"],
    [/\b(built|build|projects?|made|portfolio|work on)\b/, "projects"],
    [/\b(fresh ?route|dispatch|produce|spoilage)/, "open freshroute"],
    [/\b(bit ?and ?bites|blog|saas|tenant)/, "open bitandbites"],
    [/\b(depth ?wizard|satellite|terrain|isro|sih)/, "open depthwizard"],
    [/\b(omni ?shell|agent|langgraph)/, "open omnishell"],
    [/\b(experience|intern|job|work(ed)?|outlier)\b/, "experience"],
    [/\b(skills?|stack|languages?|tech|know)\b/, "skills"],
    [/\b(chess|rating|elo|puzzle)/, "chess"],
    [/\b(music|songs?|artists?|listen)/, "music"],
    [/\b(films?|movies?|letterboxd|watch)/, "films"],
    [/\b(contact|email|reach|mail|talk)/, "contact"],
    [/\b(resume|cv)\b/, "resume"],
    [/\b(github|code|repos?)\b/, "github"],
    [/\b(linkedin)\b/, "linkedin"],
    [/\b(who|about|yourself|introduce)\b/, "whoami"],
  ];

  function lev(a, b) {
    const m = Array.from({ length: a.length + 1 }, (_, i) => [i]);
    for (let j = 1; j <= b.length; j++) m[0][j] = j;
    for (let i = 1; i <= a.length; i++)
      for (let j = 1; j <= b.length; j++)
        m[i][j] = Math.min(m[i - 1][j] + 1, m[i][j - 1] + 1, m[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    return m[a.length][b.length];
  }

  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const history = [];
  let hIdx = 0, busy = false;

  async function execute(raw) {
    await boot();
    const text = raw.trim();
    out(`<span class="p">❯</span> ${esc(text)}`, "cmd");
    if (!text) return;
    history.push(text); hIdx = history.length;
    const [name, ...rest] = text.toLowerCase().split(/\s+/);
    const arg = rest.join(" ");

    if (commands[name]) return commands[name].run(arg);

    busy = true;
    status.textContent = "thinking";
    status.classList.add("busy");
    await wait(380);

    // 1) looks like a mistyped command → self-correct
    const best = Object.keys(commands).map((k) => [k, lev(name, k)]).sort((a, b) => a[1] - b[1])[0];
    const isSentence = text.split(/\s+/).length > 2 || /\?$/.test(text);
    if (!isSentence && best && best[1] <= 2) {
      out(`command not found: ${esc(name)}`, "err");
      await wait(260);
      out(`↻ self-correcting → <span class="hl">${best[0]}${arg ? " " + esc(arg) : ""}</span>`, "plan");
      commands[best[0]].run(arg);
    } else {
      // 2) plain English → plan a command
      const hit = intents.find(([re]) => re.test(text.toLowerCase()));
      if (hit) {
        out(`↳ plan: <span class="hl">${esc(hit[1])}</span>`, "plan");
        await wait(240);
        const [n, ...a] = hit[1].split(" ");
        commands[n].run(a.join(" "));
      } else {
        out("I couldn't turn that into a command. Try <span class=\"hl\">help</span>, or ask about projects, chess, music or films.", "err");
      }
    }
    busy = false;
    status.textContent = "ready";
    status.classList.remove("busy");
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (busy) return;
    const v = input.value;
    input.value = "";
    execute(v);
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowUp" && history.length) {
      e.preventDefault();
      hIdx = Math.max(0, hIdx - 1);
      input.value = history[hIdx];
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      hIdx = Math.min(history.length, hIdx + 1);
      input.value = history[hIdx] || "";
    } else if (e.key === "Tab") {
      const v = input.value.toLowerCase();
      const matches = Object.keys(commands).filter((k) => !commands[k].hidden && k.startsWith(v));
      if (v && matches.length) { e.preventDefault(); input.value = matches[0] + " "; }
    } else if (e.key === "l" && e.ctrlKey) {
      e.preventDefault(); body.innerHTML = "";
    }
  });

  ["what have you built?", "can you build my website?", "do you play chess?", "neofetch", "sudo hire-me"].forEach((s) => {
    const b = document.createElement("button");
    b.type = "button"; b.textContent = s;
    b.addEventListener("click", () => { if (!busy) execute(s); input.focus({ preventScroll: true }); });
    chips.appendChild(b);
  });

  // boot sequence plays once the terminal scrolls into view
  let booted = null;
  function boot() {
    return (booted ||= bootLines());
  }
  async function bootLines() {
    const lines = [
      ["omnishell v3 · natural language → shell", "dim"],
      ["loading profile… <span class=\"hl\">sarfaraz</span> ✓", "dim"],
      ["Hi. Ask me anything about Sarfaraz, or type <span class=\"hl\">help</span>.", ""],
    ];
    for (const [l, c] of lines) { out(l, c); await wait(window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 280); }
  }
  new IntersectionObserver(([e], o) => { if (e.isIntersecting) { boot(); o.disconnect(); } }, { threshold: 0.3 }).observe(body);

  // Until someone uses it, the terminal demonstrates itself by typing a few questions.
  // It stops the moment the visitor clicks, types or picks a suggestion.
  let touched = false, idleRunning = false, idleDone = false, inView = false;
  const touch = () => { touched = true; };
  input.addEventListener("focus", touch);
  input.addEventListener("keydown", touch);
  chips.addEventListener("pointerdown", touch);
  async function idleDemo() {
    if (idleRunning || idleDone || touched || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    idleRunning = true;
    await boot();
    await wait(1600);
    for (const q of ["whoami", "what have you built?", "neofetch"]) {
      if (touched || !inView) break;
      input.placeholder = "";
      for (const ch of q) {
        if (touched) break;
        input.value += ch;
        await wait(60 + Math.random() * 50);
      }
      if (touched) break;
      await wait(400);
      input.value = "";
      await execute(q);
      await wait(2800);
    }
    if (touched) input.value = "";
    else idleDone = inView;
    input.placeholder = "try: help";
    idleRunning = false;
  }
  new IntersectionObserver(([e]) => { inView = e.isIntersecting; if (inView) idleDemo(); }, { threshold: 0.5 }).observe(document.getElementById("terminal"));

  window.Shell = {
    focus() {
      boot();
      window.SiteScroll?.(document.getElementById("shell"));
      setTimeout(() => input.focus({ preventScroll: true }), 500);
    },
  };
})();
