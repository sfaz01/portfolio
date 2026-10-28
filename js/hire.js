// "Work with me": services, how a project runs, and a brief form that opens a pre-filled email.
(function () {
  const S = window.SITE;
  const F = S.freelance;
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  if (!$("services")) return;

  $("services").innerHTML = F.services
    .map((sv) => `<li class="service">
        <h3>${esc(sv.name)}</h3>
        <p>${esc(sv.what)}</p>
        <a class="service-proof" href="#p-${sv.proof}">See it in action: ${esc(sv.proofText)}</a>
      </li>`)
    .join("");

  $("steps").innerHTML = F.steps
    .map((st, i) => `<li><span class="step-n">${i + 1}</span><b>${esc(st.name)}</b><p>${esc(st.text)}</p></li>`)
    .join("");

  $("brief-types").innerHTML = F.types
    .map((t) => `<button type="button" class="chip" aria-pressed="false">${esc(t)}</button>`)
    .join("");
  $("brief-types").addEventListener("click", (e) => {
    const b = e.target.closest(".chip");
    if (b) b.setAttribute("aria-pressed", b.getAttribute("aria-pressed") !== "true");
  });
  $("brief-timeline").innerHTML = F.timelines.map((t) => `<option>${esc(t)}</option>`).join("");

  const email = $("hire-email");
  email.href = "mailto:" + S.email;
  email.textContent = S.email;

  const form = $("brief"), msg = $("brief-msg"), send = $("brief-send");
  // with a form key, briefs go straight to my inbox; without one, the visitor's email app opens
  const direct = !!F.formKey;
  if (direct) {
    $("brief-email-field").hidden = false;
    $("brief-how").textContent = "Fill this in and it lands straight in my inbox. I'll reply with questions or a plan.";
    send.textContent = "Send brief";
  }
  const fail = (text, field) => {
    msg.textContent = text;
    msg.classList.add("err");
    field?.focus();
  };

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const types = [...form.querySelectorAll('.chip[aria-pressed="true"]')].map((b) => b.textContent);
    const name = form.elements.name.value.trim();
    const about = form.elements.about.value.trim();
    const from = form.elements.email.value.trim();
    if (direct && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(from)) return fail("Add your email so I can reply to you.", form.elements.email);
    if (!about) return fail("Add a line or two about the project so I know what you need.", form.elements.about);
    msg.classList.remove("err");
    const subject = `Project enquiry${types.length ? ": " + types.join(", ") : ""}${name ? " from " + name : ""}`;
    const body = [
      "Hi Sarfaraz,",
      "",
      about,
      "",
      types.length ? `Type: ${types.join(", ")}` : null,
      `Timeline: ${form.elements.timeline.value}`,
      "",
      name ? `Thanks,\n${name}` : "Thanks",
    ].filter((l) => l !== null).join("\n");
    const openMail = () => {
      window.location.href = `mailto:${S.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    };

    if (!direct) {
      openMail();
      msg.textContent = `Opening your email app. If nothing happens, email ${S.email} directly.`;
      return;
    }

    send.disabled = true;
    send.textContent = "Sending…";
    try {
      const r = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          access_key: F.formKey,
          subject,
          from_name: name || "Portfolio visitor",
          email: from,
          replyto: from,
          message: body,
          botcheck: form.elements.botcheck.checked,
        }),
      });
      const d = await r.json();
      if (!d.success) throw new Error(d.message);
      form.reset();
      form.querySelectorAll(".chip").forEach((c) => c.setAttribute("aria-pressed", "false"));
      msg.textContent = `Sent. I'll reply to ${from} soon.`;
      window.Stats?.event("brief-sent", "Project brief sent");
    } catch {
      fail(`That didn't go through. Your email app is opening with the brief instead, or email ${S.email}.`);
      openMail();
    } finally {
      send.disabled = false;
      send.textContent = "Send brief";
    }
  });
})();
