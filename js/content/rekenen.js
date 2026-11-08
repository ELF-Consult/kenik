/* Kenik - content/rekenen.js
   Generatoren voor rekenen en wiskunde. Elke generator maakt eindeloos nieuwe oefeningen
   binnen de instellingen die de ouder per kind kiest. Alle modules hebben group "Rekenen". */
(function (OK) {
  "use strict";
  const R = OK.rnd, pick = OK.pick, f = OK.fmtNum;
  const big = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  OK.fmtBig = big;
  const gcd = (a, b) => b ? gcd(b, a % b) : Math.abs(a);
  const frac = (a, b) => { const g = gcd(a, b) || 1; return b / g === 1 ? String(a / g) : `${a / g}/${b / g}`; };
  const fb = n => Number.isInteger(n) ? String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ") : f(n);
  const groups = (n, per, what) => `<div class="groups">${Array.from({ length: n }, () => `<div class="grp">${Array.from({ length: per }, () => `<i></i>`).join("")}</div>`).join("")}</div><p class="muted small">${n} groepjes van ${per} ${what}</p>`;

  /* ---- tafels ---- */
  OK.registerModule({
    id: "tafels", order: 1, name: "Tafels en delen", group: "Rekenen", generator: true,
    schema: [
      { key: "tables", label: "Welke tafels", type: "multi", kid: true, options: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => ({ v: n, l: String(n) })) },
      { key: "ops", label: "Wat", type: "select", kid: true, default: "both", options: [{ v: "mul", l: "Maal" }, { v: "div", l: "Delen" }, { v: "both", l: "Allebei" }] }
    ],
    defaultsFor: g => g <= 1 ? null : g === 2 ? { tables: [2, 5, 10], ops: "both" } : g <= 4 ? { tables: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], ops: "both" } : null,
    describe: cfg => "tafels van " + (cfg.tables || []).join(", ") + (cfg.ops === "mul" ? " · maal" : cfg.ops === "div" ? " · delen" : ""),
    pool(cfg) {
      const out = [];
      (cfg.tables || []).forEach(t => { for (let k = 1; k <= 10; k++) {
        if (cfg.ops !== "div") out.push({ key: `t|m|${k}|${t}`, module: "tafels", kind: "number", prompt: { main: `${k} × ${t} = ?` }, answer: String(k * t), hint: groups(k, t, "") , explain: `${k} × ${t} = ${k * t}` });
        if (cfg.ops !== "mul") out.push({ key: `t|d|${k * t}|${t}`, module: "tafels", kind: "number", prompt: { main: `${k * t} : ${t} = ?` }, answer: String(k), hint: `<p>Verdeel ${k * t} eerlijk over ${t} groepjes.</p>` + groups(t, k, ""), explain: `${k * t} : ${t} = ${k}, want ${k} × ${t} = ${k * t}` });
      } });
      return out;
    }
  });

  /* ---- optellen en aftrekken ---- */
  OK.registerModule({
    id: "optellen", order: 2, name: "Hoofdrekenen: optellen en aftrekken", group: "Rekenen", generator: true,
    schema: [
      { key: "max", label: "Tot", type: "select", kid: true, default: 100, options: [{ v: 10, l: "10" }, { v: 20, l: "20" }, { v: 100, l: "100" }, { v: 1000, l: "1000" }, { v: 10000, l: "10 000" }, { v: 100000, l: "100 000" }, { v: 1000000, l: "1 miljoen" }] },
      { key: "ops", label: "Wat", type: "select", kid: true, default: "both", options: [{ v: "add", l: "Optellen" }, { v: "sub", l: "Aftrekken" }, { v: "both", l: "Allebei" }] }
    ],
    defaultsFor: g => g <= 1 ? { max: 20, ops: "both" } : g === 2 ? { max: 100, ops: "both" } : g === 3 ? { max: 1000, ops: "both" } : g === 4 ? { max: 10000, ops: "both" } : g === 5 ? { max: 100000, ops: "both" } : g === 6 ? { max: 1000000, ops: "both" } : null,
    describe: cfg => "tot " + big(cfg.max),
    pool(cfg, ctx) {
      const out = [], max = +cfg.max || 100;
      // bij grote getallen: ronde getallen, anders is het geen hoofdrekenen meer maar cijferen
      const roundTo = max >= 1000000 ? 1000 : max >= 100000 ? 100 : max >= 10000 ? 10 : 1;
      for (let i = 0; i < ctx.n; i++) {
        const add = cfg.ops === "add" || (cfg.ops !== "sub" && Math.random() < .5);
        let a, b; if (add) { a = R(1, max / roundTo - 1) * roundTo; b = R(1, (max - a) / roundTo) * roundTo; } else { a = R(2, max / roundTo) * roundTo; b = R(1, a / roundTo - 1) * roundTo; }
        const ans = add ? a + b : a - b;
        out.push({ key: `o|${add ? "a" : "s"}|${max}`, module: "optellen", kind: "number", prompt: { main: `${big(a)} ${add ? "+" : "−"} ${big(b)} = ?` }, answer: String(ans), explain: add ? `${big(a)} + ${big(b)} = ${big(ans)}` : `${big(a)} − ${big(b)} = ${big(ans)}` });
      }
      return out;
    }
  });

  /* ---- cijferen ---- */
  OK.registerModule({
    id: "cijferen", order: 4, name: "Cijferen", group: "Rekenen", generator: true,
    schema: [{ key: "ops", label: "Bewerkingen", type: "multi", kid: true, options: [{ v: "add", l: "Optellen" }, { v: "sub", l: "Aftrekken" }, { v: "mul", l: "Vermenigvuldigen" }, { v: "div", l: "Delen" }] },
      { key: "size", label: "Grootte", type: "select", default: "m", options: [{ v: "s", l: "tot 1000" }, { v: "m", l: "tot 10 000" }, { v: "l", l: "tot 100 000" }] }],
    defaultsFor: g => g === 3 ? { ops: ["add", "sub"], size: "s" } : g === 4 ? { ops: ["add", "sub", "mul"], size: "m" } : g >= 5 && g <= 6 ? { ops: ["add", "sub", "mul", "div"], size: "l" } : null,
    describe: cfg => (cfg.ops || []).map(o => ({ add: "+", sub: "−", mul: "×", div: ":" })[o]).join(" "),
    pool(cfg, ctx) {
      const out = [], max = cfg.size === "s" ? 999 : cfg.size === "l" ? 99999 : 9999, ops = cfg.ops && cfg.ops.length ? cfg.ops : ["add", "sub"];
      for (let i = 0; i < ctx.n; i++) {
        const op = pick(ops); let a, b, ans, txt;
        if (op === "add") { a = R(100, max); b = R(100, max); ans = a + b; txt = `${a} + ${b}`; }
        else if (op === "sub") { a = R(200, max); b = R(100, a - 1); ans = a - b; txt = `${a} − ${b}`; }
        else if (op === "mul") { a = R(12, Math.min(999, max)); b = cfg.size === "s" ? R(2, 9) : R(2, 99); ans = a * b; txt = `${a} × ${b}`; }
        else { b = R(2, cfg.size === "s" ? 9 : 25); ans = R(12, Math.floor(max / b)); a = ans * b; txt = `${a} : ${b}`; }
        out.push({ key: `c|${op}|${cfg.size || "m"}`, module: "cijferen", kind: "number", prompt: { meta: "cijferen, schrijf het uit op papier", main: `${txt.replace(/\d+/g, m => big(m))} = ?` }, answer: String(ans), explain: `${txt} = ${ans}` });
      }
      return out;
    }
  });

  /* ---- breuken ---- */
  OK.registerModule({
    id: "breuken", order: 5, name: "Breuken", group: "Rekenen", generator: true,
    schema: [{ key: "types", label: "Soorten", type: "multi", kid: true, options: [{ v: "deel", l: "Deel van een getal (3/4 van 20)" }, { v: "vereenv", l: "Vereenvoudigen" }, { v: "optel", l: "Optellen en aftrekken" }, { v: "gelijk", l: "Gelijknamig maken (zelfde noemer)" }, { v: "maal", l: "Vermenigvuldigen" }, { v: "delen", l: "Delen" }, { v: "komma", l: "Breuk als kommagetal" }] }],
    defaultsFor: g => g === 4 ? { types: ["deel"] } : g === 5 ? { types: ["deel", "vereenv", "gelijk"] } : g === 6 ? { types: ["deel", "vereenv", "optel", "maal", "delen", "komma"] } : null,
    describe: cfg => (cfg.types || []).length + " soorten",
    pool(cfg, ctx) {
      const out = [], types = cfg.types && cfg.types.length ? cfg.types : ["deel"];
      for (let i = 0; i < ctx.n; i++) {
        const t = pick(types);
        if (t === "deel") { const b = pick([2, 3, 4, 5, 6, 8, 10]), a = R(1, b - 1), n = b * R(2, 12); out.push({ key: "b|deel", module: "breuken", kind: "number", prompt: { main: `${a}/${b} van ${n} = ?` }, answer: String(a * n / b), explain: `${n} : ${b} = ${n / b}, en ${a} × ${n / b} = ${a * n / b}` }); }
        else if (t === "vereenv") { let a = R(1, 9), b = R(a + 1, 12); const g = gcd(a, b); a /= g; b /= g; const m = R(2, 6); out.push({ key: "b|ver", module: "breuken", kind: "number", exactForm: true, prompt: { main: `Vereenvoudig ${a * m}/${b * m}` }, answer: `${a}/${b}`, explain: `Deel teller en noemer door ${m}: ${a}/${b}` }); }
        else if (t === "optel") { const b = pick([4, 6, 8, 10, 12]), a1 = R(1, b - 1), a2 = R(1, b - a1 > 0 ? b - a1 : 1); const add = Math.random() < .6; const big = Math.max(a1, a2), small = Math.min(a1, a2); const ans = add ? frac(a1 + a2, b) : frac(big - small, b); out.push({ key: "b|opt", module: "breuken", kind: "number", prompt: { main: add ? `${a1}/${b} + ${a2}/${b} = ?` : `${big}/${b} − ${small}/${b} = ?` }, answer: ans, alts: [add ? `${a1 + a2}/${b}` : `${big - small}/${b}`], explain: `Zelfde noemer, dus alleen de tellers: ${add ? a1 + "+" + a2 : big + "−" + small} = ${add ? a1 + a2 : big - small}, dus ${ans}` }); }
        else if (t === "gelijk") { const b = pick([2, 3, 4, 5]), a = R(1, b - 1), m = R(2, 5); out.push({ key: "b|gel", module: "breuken", kind: "number", exactForm: true, prompt: { main: `${a}/${b} = ?/${b * m}` }, answer: String(a * m), explain: `Noemer × ${m}, dus teller ook × ${m}: ${a * m}` }); }
        else if (t === "maal") { const b = pick([2, 3, 4, 5]), a = R(1, b - 1), d = pick([2, 3, 4, 5]), c2 = R(1, d - 1); const whole = Math.random() < .35; if (whole) { const n = R(2, 9); out.push({ key: "b|maal", module: "breuken", kind: "number", simplify: true, prompt: { main: `${a}/${b} × ${n} = ?` }, answer: frac(a * n, b), explain: `Teller × ${n}: ${a * n}/${b}, vereenvoudigd ${frac(a * n, b)}` }); } else out.push({ key: "b|maal", module: "breuken", kind: "number", simplify: true, prompt: { main: `${a}/${b} × ${c2}/${d} = ?` }, answer: frac(a * c2, b * d), explain: `Teller × teller en noemer × noemer: ${a * c2}/${b * d}, vereenvoudigd ${frac(a * c2, b * d)}` }); }
        else if (t === "delen") { const b = pick([2, 3, 4, 5]), a = R(1, b - 1), d = pick([2, 3, 4, 5]), c2 = R(1, d - 1); out.push({ key: "b|delen", module: "breuken", kind: "number", simplify: true, prompt: { main: `${a}/${b} : ${c2}/${d} = ?` }, answer: frac(a * d, b * c2), explain: `Delen door een breuk is vermenigvuldigen met het omgekeerde: ${a}/${b} × ${d}/${c2} = ${frac(a * d, b * c2)}` }); }
        else { const pairs = [[1, 2, "0,5"], [1, 4, "0,25"], [3, 4, "0,75"], [1, 5, "0,2"], [2, 5, "0,4"], [3, 5, "0,6"], [4, 5, "0,8"], [1, 10, "0,1"], [3, 10, "0,3"], [7, 10, "0,7"], [1, 8, "0,125"], [1, 100, "0,01"]]; const [a, b, k] = pick(pairs); out.push({ key: "b|kom", module: "breuken", kind: "number", prompt: { main: `${a}/${b} als kommagetal = ?` }, answer: k, explain: `${a} : ${b} = ${k}` }); }
      }
      return out;
    }
  });

  /* ---- kommagetallen ---- */
  OK.registerModule({
    id: "kommagetallen", order: 6, name: "Kommagetallen", group: "Rekenen", generator: true,
    schema: [{ key: "types", label: "Soorten", type: "multi", kid: true, options: [{ v: "optel", l: "Optellen en aftrekken" }, { v: "x10", l: "× en : 10, 100, 1000" }, { v: "maal", l: "Vermenigvuldigen" }, { v: "afrond", l: "Afronden" }] }],
    defaultsFor: g => g === 5 ? { types: ["optel", "x10"] } : g === 6 ? { types: ["optel", "x10", "maal", "afrond"] } : null,
    describe: cfg => (cfg.types || []).length + " soorten",
    pool(cfg, ctx) {
      const out = [], types = cfg.types && cfg.types.length ? cfg.types : ["optel"];
      const dec = (max, d) => Math.round(Math.random() * max * Math.pow(10, d)) / Math.pow(10, d);
      for (let i = 0; i < ctx.n; i++) {
        const t = pick(types);
        if (t === "optel") { const a = dec(50, 2), b = dec(50, 2); const add = Math.random() < .5; const big = Math.max(a, b), small = Math.min(a, b); const ans = add ? a + b : big - small; out.push({ key: "k|opt", module: "kommagetallen", kind: "number", prompt: { main: add ? `${f(a)} + ${f(b)} = ?` : `${f(big)} − ${f(small)} = ?` }, answer: f(Math.round(ans * 100) / 100), explain: "Zet de komma's onder elkaar." }); }
        else if (t === "x10") { const a = dec(100, R(1, 2)), m = pick([10, 100, 1000]), mul = Math.random() < .5; const ans = mul ? a * m : a / m; out.push({ key: "k|x10", module: "kommagetallen", kind: "number", prompt: { main: `${f(a)} ${mul ? "×" : ":"} ${m} = ?` }, answer: f(Math.round(ans * 100000) / 100000), explain: `De komma schuift ${String(m).length - 1} plaats${String(m).length > 2 ? "en" : ""} naar ${mul ? "rechts" : "links"}.` }); }
        else if (t === "maal") { const a = dec(10, 1), b = R(2, 9); out.push({ key: "k|maal", module: "kommagetallen", kind: "number", prompt: { main: `${f(a)} × ${b} = ?` }, answer: f(Math.round(a * b * 10) / 10), explain: `${f(a)} × ${b} = ${f(Math.round(a * b * 10) / 10)}` }); }
        else { const a = dec(100, 2), to = pick([0, 1]); const ans = Math.round(a * Math.pow(10, to)) / Math.pow(10, to); out.push({ key: "k|afr", module: "kommagetallen", kind: "number", prompt: { main: `Rond ${f(a)} af ${to === 0 ? "tot een geheel getal" : "tot op 1 cijfer na de komma"}` }, answer: f(ans), explain: `Kijk naar het cijfer erna: 5 of meer is naar boven.` }); }
      }
      return out;
    }
  });

  /* ---- procenten ---- */
  OK.registerModule({
    id: "procenten", order: 7, name: "Procenten", group: "Rekenen", generator: true,
    schema: [{ key: "level", label: "Niveau", type: "select", kid: true, default: "basis", options: [{ v: "basis", l: "10%, 25%, 50%, 75%" }, { v: "alle", l: "Alle ronde procenten" }] }],
    defaultsFor: g => g === 6 ? { level: "basis" } : null,
    describe: cfg => cfg.level === "alle" ? "alle ronde procenten" : "basisprocenten",
    pool(cfg, ctx) {
      const out = [], ps = cfg.level === "alle" ? [5, 10, 15, 20, 25, 30, 40, 50, 60, 70, 75, 80, 90] : [10, 25, 50, 75];
      for (let i = 0; i < ctx.n; i++) { const p = pick(ps), n = pick([20, 40, 60, 80, 100, 120, 200, 240, 300, 400, 500, 800, 1000]); const ans = p * n / 100; if (ans !== Math.round(ans)) { i--; continue; } out.push({ key: `p|${p}`, module: "procenten", kind: "number", prompt: { main: `${p}% van ${n} = ?` }, answer: String(ans), explain: `1% van ${n} is ${f(n / 100)}, dus ${p}% is ${ans}` }); }
      return out;
    }
  });

  /* ---- omzettingen ---- */
  const UNITS = { lengte: [["km", 1000], ["hm", 100], ["dam", 10], ["m", 1], ["dm", .1], ["cm", .01], ["mm", .001]], inhoud: [["hl", 100], ["l", 1], ["dl", .1], ["cl", .01], ["ml", .001]], massa: [["ton", 1000000], ["kg", 1000], ["g", 1], ["mg", .001]], tijd: [["uur", 60], ["min", 1]] };
  OK.registerModule({
    id: "omzettingen", order: 8, name: "Metend rekenen", group: "Rekenen", generator: true,
    schema: [{ key: "kinds", label: "Grootheden", type: "multi", kid: true, options: [{ v: "lengte", l: "Lengte" }, { v: "inhoud", l: "Inhoud" }, { v: "massa", l: "Massa" }, { v: "tijd", l: "Tijd" }] }],
    defaultsFor: g => g === 3 ? { kinds: ["lengte", "tijd"] } : g >= 4 && g <= 6 ? { kinds: ["lengte", "inhoud", "massa", "tijd"] } : null,
    describe: cfg => (cfg.kinds || []).join(", "),
    pool(cfg, ctx) {
      const out = [], kinds = cfg.kinds && cfg.kinds.length ? cfg.kinds : ["lengte"];
      for (let i = 0; i < ctx.n; i++) {
        const k = pick(kinds), u = UNITS[k]; let a, b, ratio, tries = 0;
        /* hoogstens een factor 1000 uit elkaar (geen mg naar ton): dat is wat de lagere school oefent */
        do { a = R(0, u.length - 1); b = Math.max(0, Math.min(u.length - 1, a + pick([-3, -2, -1, 1, 2, 3]))); if (a === b) b = a === 0 ? 1 : a - 1; ratio = u[a][1] / u[b][1]; } while (Math.max(ratio, 1 / ratio) > 1000 && ++tries < 20);
        const [ua] = u[a], [ub] = u[b];
        let val = ratio >= 1 ? R(1, 9) * (ratio >= 1000 ? 1 : pick([1, 2, 5])) : R(1, 9) * (1 / ratio) * pick([1, 2, 5]);
        if (k === "tijd" && ratio < 1) val = pick([60, 90, 120, 150, 180, 240]);
        const ans = Math.round(val * ratio * 1000) / 1000;
        out.push({ key: `u|${k}`, module: "omzettingen", kind: "number", prompt: { main: `${fb(val)} ${ua} = ? ${ub}` }, answer: f(ans), explain: `1 ${ua} = ${fb(ratio)} ${ub}` });
      }
      return out;
    }
  });

  /* ---- temperatuur aflezen ---- */
  function thermoSVG(t, lo, hi, step) {
    const H = 160, top = 16, bot = 138, y = v => bot - (v - lo) / (hi - lo) * (bot - top);
    let ticks = "";
    for (let v = lo; v <= hi; v += step) {
      const major = v % 10 === 0, mid = v % 5 === 0;
      ticks += `<line x1="${major ? 34 : mid ? 38 : 41}" y1="${y(v)}" x2="46" y2="${y(v)}" stroke="#333" stroke-width="${major ? 1.6 : 1}"/>`;
      if (major) ticks += `<text x="30" y="${y(v) + 3.5}" font-size="9" text-anchor="end" fill="#222" font-weight="700">${v}</text>`;
    }
    const fillTop = y(t), col = t < 0 ? "#3b82f6" : t < 15 ? "#60a5fa" : t < 25 ? "#f59e0b" : "#ef4444";
    return `<svg viewBox="0 0 90 ${H}" class="thermo"><rect x="1" y="1" width="88" height="${H - 2}" rx="10" fill="#fff" stroke="#333" stroke-width="1.5"/><rect x="47" y="${top - 6}" width="12" height="${bot - top + 8}" rx="6" fill="#fff" stroke="#333" stroke-width="2"/><rect x="50" y="${fillTop}" width="6" height="${bot + 2 - fillTop}" fill="${col}"/><circle cx="53" cy="${bot + 6}" r="8" fill="${col}" stroke="#333" stroke-width="2"/>${ticks}<text x="72" y="${top}" font-size="9" fill="#222">°C</text></svg>`;
  }
  OK.registerModule({
    id: "temperatuur", order: 8.5, name: "Temperatuur aflezen", group: "Rekenen", generator: true,
    schema: [
      { key: "range", label: "Bereik", type: "select", kid: true, default: "plus", options: [{ v: "plus", l: "0 tot 40 °C" }, { v: "min", l: "−20 tot 40 °C (ook onder nul)" }] },
      { key: "prec", label: "Nauwkeurigheid", type: "select", kid: true, default: "1", options: [{ v: "5", l: "Per 5 graden" }, { v: "1", l: "Per graad" }, { v: "0.5", l: "Per halve graad" }] }
    ],
    defaultsFor: g => g === 2 ? { range: "plus", prec: "5" } : g === 3 ? { range: "plus", prec: "1" } : g === 4 ? { range: "min", prec: "1" } : g >= 5 && g <= 6 ? { range: "min", prec: "0.5" } : null,
    describe: cfg => (cfg.range === "min" ? "ook onder nul" : "0 tot 40") + ", " + ({ "5": "per 5°", "1": "per graad", "0.5": "per halve graad" })[cfg.prec] || "",
    pool(cfg, ctx) {
      const out = [], lo = cfg.range === "min" ? -20 : 0, hi = 40, step = +cfg.prec || 1;
      for (let i = 0; i < ctx.n; i++) {
        const n = Math.round((hi - lo) / step); const t = Math.round((lo + R(0, n) * step) * 10) / 10;
        const ans = String(t).replace(".", ",");
        out.push({ key: `temp|${cfg.range || "plus"}|${step}`, module: "temperatuur", kind: "number", prompt: { meta: "Hoeveel graden is het?", svg: thermoSVG(t, lo, hi, step < 1 ? 1 : step === 5 ? 5 : 1) }, answer: String(t), alts: [ans, ans + "°", ans + " °C", ans + "°C"], explain: `De vloeistof staat op ${ans} °C${t < 0 ? ": onder nul, dus een mingetal" : ""}.` });
      }
      return out;
    }
  });

  /* ---- kloklezen ---- */
  function clockSVG(h, m) {
    const ha = (h % 12 + m / 60) * 30, ma = m * 6;
    const hand = (ang, len, w, col) => `<line x1="50" y1="50" x2="${50 + len * Math.sin(ang * Math.PI / 180)}" y2="${50 - len * Math.cos(ang * Math.PI / 180)}" stroke="${col}" stroke-width="${w}" stroke-linecap="round"/>`;
    return `<svg viewBox="0 0 100 100" class="clock"><circle cx="50" cy="50" r="46" fill="#fff" stroke="#333" stroke-width="3"/>${Array.from({ length: 12 }, (_, i) => `<text x="${50 + 36 * Math.sin((i + 1) * 30 * Math.PI / 180)}" y="${50 - 36 * Math.cos((i + 1) * 30 * Math.PI / 180) + 4}" font-size="11" text-anchor="middle" fill="#222" font-weight="700">${i + 1}</text>`).join("")}${hand(ha, 22, 5, "#222")}${hand(ma, 32, 3, "#c0392b")}<circle cx="50" cy="50" r="3" fill="#222"/></svg>`;
  }
  const pad = n => String(n).padStart(2, "0");
  OK.registerModule({
    id: "klok", order: 3, name: "Kloklezen", group: "Rekenen", generator: true,
    schema: [{ key: "prec", label: "Nauwkeurigheid", type: "select", kid: true, default: "half", options: [{ v: "uur", l: "Hele uren" }, { v: "half", l: "Halve uren" }, { v: "kwart", l: "Kwartieren" }, { v: "vijf", l: "Per 5 minuten" }, { v: "min", l: "Per minuut (typ 2:37)" }] }],
    defaultsFor: g => g === 1 ? { prec: "uur" } : g === 2 ? { prec: "half" } : g === 3 ? { prec: "kwart" } : g === 4 ? { prec: "vijf" } : g === 5 ? { prec: "min" } : null,
    describe: cfg => ({ uur: "hele uren", half: "halve uren", kwart: "kwartieren", vijf: "per 5 minuten", min: "per minuut" })[cfg.prec] || "",
    pool(cfg, ctx) {
      const out = [];
      if (cfg.prec === "min") {
        /* per minuut: digitaal typen, 12- en 24-uursnotatie allebei goed */
        for (let i = 0; i < ctx.n; i++) {
          const h = R(1, 12), m = R(0, 59); const ans = `${h}:${pad(m)}`;
          out.push({ key: "kl|min", module: "klok", kind: "text", prompt: { meta: "Hoe laat is het? Schrijf zoals 2:37", svg: clockSVG(h, m) }, answer: ans, alts: [`${pad(h)}:${pad(m)}`, `${h + 12}:${pad(m)}`, `${h}u${pad(m)}`, `${h}.${pad(m)}`, `${h}:${m}`], explain: `Het is ${ans}: de kleine wijzer wijst voorbij ${h}, de grote wijzer op ${m} minuten.` });
        }
        return out;
      }
      const step = { uur: 60, half: 30, kwart: 15, vijf: 5 }[cfg.prec] || 30;
      const words = (h, m) => { const H = h % 12 === 0 ? 12 : h % 12, N = H % 12 + 1; if (m === 0) return `${H} uur`; if (m === 15) return `kwart over ${H}`; if (m === 30) return `half ${N}`; if (m === 45) return `kwart voor ${N}`; if (m < 30) return `${m} over ${H}`; return `${60 - m} voor ${N}`; };
      for (let i = 0; i < ctx.n; i++) {
        const h = R(1, 12), m = R(0, 60 / step - 1) * step; const ans = words(h, m);
        const choices = new Set([ans]); while (choices.size < 4) { const hh = R(1, 12), mm = R(0, 60 / step - 1) * step; choices.add(words(hh, mm)); }
        out.push({ key: `kl|${cfg.prec || "half"}`, module: "klok", kind: "choice", prompt: { meta: "Hoe laat is het?", svg: clockSVG(h, m) }, answer: ans, choices: OK.shuffle([...choices]), explain: `Het is ${ans} (${pad(h)}:${pad(m)}).` });
      }
      return out;
    }
  });
})(window.OK);
