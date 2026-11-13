/* Kenik - admin.js
   Beheertab in het ouderpaneel: geaggregeerde cijfers uit admin_stats() (enkel voor beheerders, zie supabase/schema.sql).
   Geen namen, geen e-mails: alleen aantallen en trends. */
(function (OK) {
  "use strict";
  const $ = id => document.getElementById(id);
const MOD = { tafels: "Tafels en delen", optellen: "Hoofdrekenen", cijferen: "Cijferen", breuken: "Breuken", kommagetallen: "Kommagetallen", procenten: "Procenten", omzettingen: "Metend rekenen", temperatuur: "Temperatuur", klok: "Kloklezen", meetkunde: "Meetkunde", ordenen: "Ordenen", "kaart-be": "Kaart van België", lijsten: "Lijsten (woordjes)", "frans-werkwoorden": "Franse werkwoorden", "engels-werkwoorden": "Engelse werkwoorden", spelling: "Spelling", grammatica: "Grammatica", lezen: "Lezen" };
  const name = m => MOD[m] || m;
  const GRADE = g => g <= 0 ? "kleuter" : g <= 6 ? g + "e leerjaar" : (g - 6) + "e middelbaar";
  const fmt = n => Number(n || 0).toLocaleString("nl-BE");

  const HTML = `<section class="card stack"><div class="q-head"><h2>Kerncijfers</h2><span class="muted small" id="gen"></span></div><div class="stats" id="tiles"></div></section>
    <div class="grid2"><section class="card stack"><h3>Nieuwe gezinnen per week</h3><svg class="chart" id="c-fam"></svg></section>
    <section class="card stack"><h3>Oefenbeurten per dag (30 dagen)</h3><svg class="chart" id="c-sess"></svg><div class="legend"><span><i style="background:var(--blue)"></i>oefenen</span><span><i style="background:var(--mint)"></i>toets</span></div></section></div>
    <section class="card stack"><h3>Kinderen per leerjaar</h3><div class="table-wrap" id="t-grade"></div></section>
    <section class="card stack"><h3>Wat wordt er geoefend (laatste 30 dagen)</h3><p class="muted small">Beurten per vak, gemiddelde score en aantal kinderen. Grijs: vakken die aanstaan bij kinderen maar niet gebruikt werden.</p><div class="table-wrap" id="t-mod"></div></section>
    <section class="card stack"><h3>Inhoud en gezondheid</h3><div class="stats" id="tiles2"></div></section>`;

  OK.renderAdmin = async function (root) {
    root.innerHTML = `<section class="card"><p class="muted">Cijfers ophalen...</p></section>`;
    if (!OK.backend.adminStats) { root.innerHTML = `<section class="card"><p class="muted">Beheer werkt enkel met de echte server.</p></section>`; return; }
    const d = await OK.backend.adminStats();
    if (!d || d.error) { root.innerHTML = `<section class="card"><h3>Geen toegang</h3><p class="muted">${d && d.error ? d.error : "Dit account is geen beheerder."}</p></section>`; return; }
    root.innerHTML = HTML; render(d);
  };
  function tile(label, value, sub) { return `<div class="stat"><b>${fmt(value)}</b><span>${label}${sub ? `<br>${sub}` : ""}</span></div>`; }
  function table(head, rows, opts) {
    opts = opts || {}; const max = Math.max(1, ...rows.map(r => +r.cells[opts.barCol] || 0));
    return `<table><thead><tr>${head.map((h, i) => `<th class="${i ? "num" : ""}">${h}</th>`).join("")}</tr></thead><tbody>${rows.map(r => `<tr class="${r.muted ? "muted-row" : ""}">${r.cells.map((c, i) => i === opts.barCol ? `<td class="num"><div class="bar-cell"><i style="width:${Math.round(60 * c / max)}px"></i>${fmt(c)}</div></td>` : `<td class="${i ? "num" : ""}">${c}</td>`).join("")}</tr>`).join("") || `<tr><td colspan="${head.length}" class="muted">Nog niets</td></tr>`}</tbody></table>`;
  }
  function bars(svg, items, keys) {
    const W = 600, H = 160, pad = 24, n = Math.max(1, items.length), max = Math.max(1, ...items.map(it => keys.reduce((a, k) => a + (+it[k] || 0), 0)));
    const bw = (W - pad * 2) / n; let s = `<line class="grid" x1="${pad}" y1="${H - 20}" x2="${W - pad}" y2="${H - 20}"/>`;
    items.forEach((it, i) => { let y = H - 20; keys.forEach((k, ki) => { const h = (+it[k] || 0) / max * (H - 40); y -= h; s += `<rect class="${ki ? "cbar2" : "cbar"}" x="${pad + i * bw + bw * .15}" y="${y}" width="${bw * .7}" height="${h}" rx="2"/>`; }); if (n <= 14 || i % Math.ceil(n / 10) === 0) s += `<text x="${pad + i * bw + bw / 2}" y="${H - 6}" text-anchor="middle">${it.label}</text>`; });
    s += `<text x="${pad}" y="12">${fmt(max)}</text>`; svg.setAttribute("viewBox", `0 0 ${W} ${H}`); svg.innerHTML = s;
  }
  function render(d) {
    $("gen").textContent = "bijgewerkt " + new Date(d.generated_at).toLocaleString("nl-BE");
    $("tiles").innerHTML = tile("gezinnen", d.families, `${fmt(d.new_families_7d)} nieuw deze week`) + tile("ouders", d.parents) + tile("kinderen", d.children, `${fmt(d.children_active_7d)} actief deze week`)
      + tile("actieve gezinnen", d.families_active_7d, "laatste 7 dagen") + tile("actieve gezinnen", d.families_active_30d, "laatste 30 dagen")
      + tile("beurten vandaag", d.sessions_today) + tile("beurten deze week", d.sessions_7d, `${fmt(d.exercises_7d)} oefeningen`);
    // weken opvullen zodat lege weken zichtbaar zijn
    const weeks = []; const now = new Date(); for (let i = 11; i >= 0; i--) { const dt = new Date(now); dt.setDate(dt.getDate() - i * 7 - ((dt.getDay() + 6) % 7)); const key = dt.toISOString().slice(0, 10); const f = (d.families_per_week || []).find(x => x.week === key); weeks.push({ label: `${dt.getDate()}/${dt.getMonth() + 1}`, n: f ? f.n : 0 }); }
    bars($("c-fam"), weeks, ["n"]);
    const days = []; for (let i = 29; i >= 0; i--) { const dt = new Date(now); dt.setDate(dt.getDate() - i); const key = dt.toISOString().slice(0, 10); const f = (d.sessions_per_day || []).find(x => x.day === key); days.push({ label: `${dt.getDate()}/${dt.getMonth() + 1}`, practice: f ? f.practice : 0, test: f ? f.test : 0 }); }
    bars($("c-sess"), days, ["practice", "test"]);
    $("t-grade").innerHTML = table(["Leerjaar", "Kinderen"], (d.children_per_grade || []).map(x => ({ cells: [GRADE(x.grade), x.n] })), { barCol: 1 });
    const used = new Set((d.modules || []).map(m => m.module));
    const rows = (d.modules || []).map(m => ({ cells: [name(m.module), m.sessions, m.avg_pct + "%", m.children] }))
      .concat((d.modules_enabled || []).filter(m => !used.has(m.module)).map(m => ({ muted: true, cells: [name(m.module), 0, "", m.children] })));
    $("t-mod").innerHTML = table(["Vak", "Beurten", "Gem. score", "Kinderen (aan)"], rows, { barCol: 1 });
    const rq = d.requests || {};
    $("tiles2").innerHTML = tile("eigen lijsten", d.own_lists) + tile("leesteksten", d.own_texts) + tile("opdrachten", d.tasks_total) + tile("kindtoestellen", d.devices) + tile("open codes", d.codes_open)
      + tile("aanvragen open", rq.open) + tile("goedgekeurd", rq.ok) + tile("geweigerd", rq.no)
      + (d.regions || []).map(r => tile("gezinnen " + r.region, r.n)).join("");
  }
})(window.OK);
