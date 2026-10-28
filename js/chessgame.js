// Replays my most recent game, move by move, on the board.
(function () {
  const S = window.SITE;
  const boardEl = document.getElementById("board");
  if (!boardEl || !window.Chess) return;
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const GLYPH = { k: "♚", q: "♛", r: "♜", b: "♝", n: "♞", p: "♟" };
  const files = "abcdefgh";
  const me = S.replayUsername.toLowerCase();

  let frames = [{ fen: new Chess().fen(), from: null, to: null, san: "" }];
  let ply = 0, flipped = false, playing = !reduced, timer = 0, visible = false, mateSq = null;

  // build the 64 squares once, then only update their contents
  const squares = {};
  function buildBoard() {
    boardEl.innerHTML = "";
    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        const file = flipped ? 7 - f : f, rank = flipped ? r + 1 : 8 - r;
        const sq = files[file] + rank;
        const d = document.createElement("div");
        d.className = "sq" + ((file + rank) % 2 === 1 ? " light" : "");
        if (f === 0) d.insertAdjacentHTML("beforeend", `<span class="coord">${rank}</span>`);
        if (r === 7) d.insertAdjacentHTML("beforeend", `<span class="coord file">${files[file]}</span>`);
        d.insertAdjacentHTML("beforeend", `<span class="pc"></span>`);
        boardEl.appendChild(d);
        squares[sq] = d;
      }
    }
  }

  function draw() {
    const fr = frames[ply];
    const rows = fr.fen.split(" ")[0].split("/");
    rows.forEach((row, i) => {
      let f = 0;
      for (const ch of row) {
        if (/\d/.test(ch)) {
          for (let k = 0; k < +ch; k++) squares[files[f++] + (8 - i)].querySelector(".pc").textContent = "";
        } else {
          const pc = squares[files[f++] + (8 - i)].querySelector(".pc");
          pc.textContent = GLYPH[ch.toLowerCase()] + "︎";
          pc.className = "pc " + (ch === ch.toUpperCase() ? "w" : "b");
        }
      }
    });
    Object.entries(squares).forEach(([sq, d]) => {
      d.classList.toggle("last", sq === fr.from || sq === fr.to);
      d.classList.toggle("mate", ply === frames.length - 1 && sq === mateSq);
    });
    $("rp-scrub").value = ply;
    $("rp-label").textContent = ply === 0
      ? "Starting position"
      : `Move ${Math.ceil(ply / 2)}${ply % 2 ? "." : "..."} ${fr.san}`;
    boardEl.setAttribute("aria-label", `Chess board. ${$("rp-label").textContent}.`);
  }

  function go(n) {
    ply = Math.max(0, Math.min(frames.length - 1, n));
    draw();
  }

  function setPlaying(on) {
    playing = on;
    $("rp-play").classList.toggle("paused", !on);
    $("rp-play").setAttribute("aria-label", on ? "Pause" : "Play");
    schedule();
  }

  function schedule() {
    clearTimeout(timer);
    if (!playing || !visible) return;
    const atEnd = ply >= frames.length - 1;
    timer = setTimeout(() => {
      go(atEnd ? 0 : ply + 1);
      schedule();
    }, atEnd ? 4000 : ply === 0 ? 1200 : 850);
  }

  const user = (p) => p.user?.name || (p.aiLevel ? `Stockfish level ${p.aiLevel}` : "Anonymous");
  function playerHTML(p, colour) {
    const diff = p.ratingDiff;
    return `<span class="pl-dot ${colour}"></span>
      <span class="pl-name">${esc(user(p))}</span>
      ${p.rating ? `<span class="pl-rating">${p.rating}</span>` : ""}
      ${diff ? `<span class="pl-diff ${diff > 0 ? "up" : "down"}">${diff > 0 ? "+" : ""}${diff}</span>` : ""}`;
  }

  const STATUS = {
    mate: "checkmate", resign: "resignation", outoftime: "time", timeout: "abandonment",
    stalemate: "stalemate", draw: "agreement", aborted: "abort", noStart: "no start",
  };

  function describe(g, myColour) {
    const facts = [];
    if (g.status === "started") facts.push(["Result", "Still being played"]);
    else if (!g.winner) facts.push(["Result", `Draw by ${STATUS[g.status] || g.status}`]);
    else facts.push(["Result", `${g.winner === myColour ? "Won" : "Lost"} by ${STATUS[g.status] || g.status}`]);
    facts.push(["Played as", myColour === "white" ? "White" : "Black"]);
    if (g.opening?.name) facts.push(["Opening", g.opening.name]);
    facts.push(["Time control", g.speed[0].toUpperCase() + g.speed.slice(1)]);
    if (g.lastMoveAt || g.createdAt) {
      facts.push(["Played", new Date(g.lastMoveAt || g.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })]);
    }
    $("game-facts").innerHTML = facts.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join("");
  }

  async function load() {
    try {
      const r = await fetch(`https://lichess.org/api/user/${encodeURIComponent(S.replayUsername)}/current-game?moves=true&opening=true`, {
        headers: { Accept: "application/json" },
      });
      if (!r.ok) throw 0;
      const g = await r.json();
      const myColour = g.players.white.user?.id === me ? "white" : "black";
      flipped = myColour === "black";

      const chess = new Chess();
      frames = [{ fen: chess.fen(), from: null, to: null, san: "" }];
      for (const san of (g.moves || "").split(" ").filter(Boolean)) {
        const m = chess.move(san, { sloppy: true });
        if (!m) break;
        frames.push({ fen: chess.fen(), from: m.from, to: m.to, san: m.san });
      }
      if (chess.in_checkmate()) {
        const loser = chess.turn(); // side to move is mated
        const rows = chess.fen().split(" ")[0].split("/");
        rows.forEach((row, i) => {
          let f = 0;
          for (const ch of row) {
            if (/\d/.test(ch)) f += +ch;
            else { if (ch === (loser === "w" ? "K" : "k")) mateSq = files[f] + (8 - i); f++; }
          }
        });
      }

      const top = flipped ? g.players.white : g.players.black;
      const bottom = flipped ? g.players.black : g.players.white;
      $("player-top").innerHTML = playerHTML(top, flipped ? "white" : "black");
      $("player-bottom").innerHTML = playerHTML(bottom, flipped ? "black" : "white");
      describe(g, myColour);
    } catch {
      $("game-facts").innerHTML = `<div><dt>Latest game</dt><dd>Couldn't load it right now. Try again in a minute.</dd></div>`;
    }
    $("rp-scrub").max = frames.length - 1;
    buildBoard();
    go(0);
    setPlaying(playing);
  }

  $("rp-first").addEventListener("click", () => { setPlaying(false); go(0); });
  $("rp-prev").addEventListener("click", () => { setPlaying(false); go(ply - 1); });
  $("rp-next").addEventListener("click", () => { setPlaying(false); go(ply + 1); });
  $("rp-last").addEventListener("click", () => { setPlaying(false); go(frames.length - 1); });
  $("rp-play").addEventListener("click", () => {
    if (!playing && ply >= frames.length - 1) go(0);
    setPlaying(!playing);
  });
  $("rp-scrub").addEventListener("input", (e) => { setPlaying(false); go(+e.target.value); });

  new IntersectionObserver(([e]) => { visible = e.isIntersecting; schedule(); }, { threshold: 0.3 }).observe(boardEl);

  buildBoard();
  draw();
  load();
})();
