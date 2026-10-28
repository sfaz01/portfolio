// Privacy-friendly visitor stats via GoatCounter (no cookies). Off until a site code is set in data.js.
// Counts page views, plus two events: resume downloads and project briefs sent.
(function () {
  const code = window.SITE.analytics && window.SITE.analytics.goatcounter;
  window.Stats = { event() {} };
  if (!code) return;

  const s = document.createElement("script");
  s.async = true;
  s.src = "https://gc.zgo.at/count.js";
  s.dataset.goatcounter = `https://${code}.goatcounter.com/count`;
  document.head.appendChild(s);

  window.Stats.event = (path, title) => {
    if (window.goatcounter && window.goatcounter.count) window.goatcounter.count({ path, title, event: true });
  };
  document.addEventListener("click", (e) => {
    if (e.target.closest('a[href$=".pdf"]')) window.Stats.event("resume-download", "Resume downloaded");
  });
})();
