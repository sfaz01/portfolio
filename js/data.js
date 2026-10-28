// Everything personal lives here. Edit this file to update the site.
// Entries marked SAMPLE are placeholders — replace them with your own.

window.SITE = {
  name: "Mohd Sarfaraz",
  handle: "sfaz01",
  location: { city: "Ghaziabad, India", lat: 28.6692, lon: 77.4538 },
  tagline: "I love building things, exploring new ideas and figuring out how stuff works.",
  status: "B.Tech CS at KIET, 2025–2029 · looking for SWE, AI/ML and full-stack internships",
  email: "sarfaraz92006@gmail.com",
  resume: "assets/Mohd_Sarfaraz_Resume.pdf",

  links: {
    github: "https://github.com/sfaz01",
    linkedin: "https://linkedin.com/in/sfaz01",
    leetcode: "https://leetcode.com/u/sfaz_01",
    letterboxd: "https://letterboxd.com/sfaz_01/",
  },

  // Freelance: what I build for clients. `proof` points at a project id below.
  freelance: {
    services: [
      {
        name: "Websites and web apps",
        what: "Fast, good-looking sites and full products: landing pages, dashboards, booking and admin tools. Built with React and Next.js, deployed and ready to use.",
        proof: "bitandbites",
        proofText: "A multi-tenant SaaS, live with its first client",
      },
      {
        name: "AI features and agents",
        what: "Chatbots that know your business, content pipelines, document Q&A and agents that take real actions, built on Claude or OpenAI with checks so they don't make things up.",
        proof: "omnishell",
        proofText: "An agent that turns English into shell commands",
      },
      {
        name: "Automation and internal tools",
        what: "Scripts, integrations and small tools that remove repetitive work, plus optimisation for scheduling, routing or planning problems.",
        proof: "freshroute",
        proofText: "A solver that cut produce spoilage by over a third",
      },
      {
        name: "3D and interactive visuals",
        what: "Product viewers, data visualisations and interactive pages with Three.js and WebGL, like the background on this site.",
        proof: "depthwizard",
        proofText: "3D terrain from a single satellite photo",
      },
    ],
    steps: [
      { name: "Tell me the idea", text: "Send a short brief. Rough is fine, a few sentences is enough." },
      { name: "Get a plan", text: "I reply with what I'd build, how long it takes and what it costs." },
      { name: "Watch it come together", text: "You get a live preview link early and see progress as it happens." },
      { name: "Launch", text: "I deploy it, hand over the code and walk you through running it." },
    ],
    types: ["Website", "Web app", "AI feature", "Automation", "3D or visuals", "Something else"],
    timelines: ["As soon as possible", "Within a month", "In 1–3 months", "Flexible"],
    // Web3Forms access key (free, from https://web3forms.com). With a key, briefs are sent straight
    // to your inbox. Leave "" and the form opens the visitor's email app instead.
    formKey: "",
  },

  // Visitor stats with GoatCounter (free, from https://www.goatcounter.com). Put your site code here,
  // e.g. "sarfaraz" for sarfaraz.goatcounter.com. Leave "" to turn stats off.
  analytics: { goatcounter: "" },

  // The "Right now" strip. Keep these short and current.
  now: [
    { label: "Building", text: "OmniShell, at the AI Skills Lab" },
    { label: "Training", text: "LLMs on code and reasoning, at Outlier" },
    { label: "Studying", text: "DSA, OOP, DBMS and discrete maths" },
    { label: "Listening", text: "", from: "artists" },
  ],

  // LeetCode username. The numbers below show until the live count loads (or if it can't).
  leetcode: { username: "sfaz_01", fallback: { easy: 207, medium: 68, hard: 4 } },

  // Set to your Chess.com username to show live ratings. Leave "" to hide them.
  chessUsername: "TimeTraveller_33",
  // Account whose latest game is replayed on the chess board.
  replayUsername: "TimeTraveller_33",

  experience: [
    {
      role: "AI Research Intern",
      org: "AI Skills Lab, KIET University",
      when: "Dec 2025 – now",
      points: [
        "Built OmniShell, an LLM agent (TypeScript, LangGraph) that turns plain English into Linux commands.",
        "Designed self-correcting error recovery that cut command lookup time by about 70% across 15+ workflows.",
        "Prototyped agentic workflows with tool calling, multi-step planning and prompt engineering.",
      ],
    },
    {
      role: "AI Training Contributor",
      org: "Outlier · freelance, remote",
      when: "Jul 2026 – now",
      points: [
        "Rank LLM answers on coding and reasoning tasks for correctness, instruction following and safety.",
        "Write reference solutions in Python and C++ used as RLHF and fine-tuning data.",
      ],
    },
  ],

  projects: [
    {
      id: "freshroute",
      name: "FreshRoute",
      what: "Dispatch optimizer for perishable produce",
      summary:
        "A mixed-integer program that decides which truck carries which crate, solved to a certified optimum right in the browser with HiGHS compiled to WebAssembly.",
      facts: [
        "Spoilage down from 23.3% to 14.7% against first-expiry-first-out, over 11 scenarios",
        "Beat both baselines in 30 of 30 random tests",
        "Every plan stress-tested on 100 sampled futures with Monte Carlo",
        "57 Vitest tests, deployed by GitHub Actions",
      ],
      tech: ["TypeScript", "React", "WebAssembly", "MIP/LP", "Monte Carlo", "Vitest", "GitHub Actions"],
      repo: "https://github.com/sfaz01/freshroute",
      demo: "bars",
    },
    {
      id: "bitandbites",
      name: "bitandbites",
      what: "Multi-tenant AI blogging SaaS",
      summary:
        "Turns a client's rough idea into a fact-checked, SEO-ready blog post. Each tenant's data is walled off by Postgres row-level security, and a test suite tries to break the wall.",
      facts: [
        "Streaming, Zod-validated generation pipeline on the Claude API",
        "Automated fact-checking before anything is published",
        "Super-admin console for onboarding and usage tracking",
        "Dockerized, 80+ unit tests, first paying client onboarded",
      ],
      tech: ["Next.js", "TypeScript", "PostgreSQL", "Supabase", "Generative AI", "Docker", "Tailwind CSS", "Vitest"],
      repo: "https://github.com/sfaz01/bitandbites-blog",
      demo: "stream",
    },
    {
      id: "depthwizard",
      name: "DepthWizard",
      what: "Satellite image to 3D terrain · SIH 2026, ISRO problem statement",
      summary:
        "Rebuilds metric 3D terrain from one RGB satellite image, with no stereo pair and no LiDAR. Depth comes from a deep network, and RANSAC calibration against SRTM pins it to real elevations.",
      facts: [
        "0.02% slope error after stratified RANSAC, against 8.12% for least squares",
        "Depth Anything V2 on PyTorch, served by FastAPI",
        "WebGL2 viewer with flythrough and live elevation readout",
      ],
      tech: ["Python", "PyTorch", "Computer Vision", "Deep Learning", "FastAPI", "RANSAC", "Three.js", "WebGL"],
      repo: "https://github.com/sfaz01/depth-wizard3D",
      demo: "terrain",
    },
    {
      id: "omnishell",
      name: "OmniShell",
      what: "Natural language to Linux commands",
      summary:
        "An LLM agent that reads what you mean and runs what you need. When a command fails it reads the error, plans a fix and tries again. The terminal on this page works the same way.",
      facts: [
        "LangGraph agent with tool calling and multi-step planning",
        "Self-correcting error recovery",
        "About 70% faster command lookup over 15+ workflows",
      ],
      tech: ["TypeScript", "Python", "LLMs", "AI Agents", "Linux"],
      repo: "https://github.com/sfaz01/Omnishell-V3",
      demo: "shell",
    },
  ],

  skills: {
    Languages: ["C++", "Python", "TypeScript", "JavaScript", "Java", "SQL"],
    "Web & backend": ["React", "Next.js", "Node.js", "FastAPI", "Spring Boot", "Tailwind CSS", "Three.js", "WebGL"],
    Data: ["PostgreSQL", "Supabase", "MySQL", "Redis", "MongoDB"],
    "AI & ML": ["LLMs", "AI Agents", "Generative AI", "RAG", "Deep Learning", "Computer Vision", "PyTorch"],
    "Cloud & DevOps": ["AWS", "Docker", "GitHub Actions", "Linux", "WebAssembly"],
    "Optimization & testing": ["MIP/LP", "Monte Carlo", "RANSAC", "Vitest", "Pytest"],
  },

  credentials: [
    "AWS Certified Cloud Practitioner",
    "Red Hat Linux Fundamentals",
    "Smart India Hackathon 2026 — DepthWizard for ISRO",
  ],

  // `record` is the album shown on the turntable label; `spotify` is the artist ID.
  artists: [
    { name: "Radiohead", genre: "Art rock", record: "OK Computer", year: 1997, img: "assets/img/artists/radiohead.jpg", spotify: "4Z8W4fKeB5YxbusRsdQVPb" },
    { name: "The Smashing Pumpkins", genre: "Alternative rock", record: "Siamese Dream", year: 1993, img: "assets/img/artists/smashing-pumpkins.jpg", spotify: "40Yq4vzPs9VNUrIBG5Jr2i" },
    { name: "Pink Floyd", genre: "Progressive rock", record: "The Dark Side of the Moon", year: 1973, img: "assets/img/artists/pink-floyd.jpg", spotify: "0k17h0D3J5VfsdmQ1iZtE9" },
    { name: "Mac DeMarco", genre: "Slacker rock", record: "Salad Days", year: 2014, img: "assets/img/artists/mac-demarco.jpg", spotify: "3Sz7ZnJQBIHsXLUSo0OQtM" },
    { name: "Deftones", genre: "Alternative metal", record: "White Pony", year: 2000, img: "assets/img/artists/deftones.jpg", spotify: "6Ghvu1VvMGScGpOUJBAHNH" },
  ],

  // Letterboxd four favourites. `slug` is the film's letterboxd.com/film/<slug>/ path.
  films: [
    { title: "The Perks of Being a Wallflower", year: 2012, director: "Stephen Chbosky", runtime: 103, img: "assets/img/films/perks.jpg", slug: "the-perks-of-being-a-wallflower" },
    { title: "Dune: Part Two", year: 2024, director: "Denis Villeneuve", runtime: 166, img: "assets/img/films/dune-part-two.jpg", slug: "dune-part-two" },
    { title: "Memento", year: 2000, director: "Christopher Nolan", runtime: 113, img: "assets/img/films/memento.jpg", slug: "memento" },
    { title: "Heat", year: 1995, director: "Michael Mann", runtime: 170, img: "assets/img/films/heat.jpg", slug: "heat-1995" },
  ],
};
