/* Kenik - engine.js
   De motor: moduleregister, vragenpool, adaptieve keuze, antwoordcontrole en puntenlogica.
   Weet niets van vakken; een module levert items in één vast formaat:
   { key, module, kind:'text'|'number'|'choice'|'map', prompt:{meta,main,svg}, answer, alts, choices, lang, explain, hint, display }
*/
(function (OK) {
  "use strict";
  OK.modules = OK.modules || {};
  OK.registerModule = m => { OK.modules[m.id] = m; };

  /* ---------- normalisatie en controle ---------- */
  const strip = s => s.normalize("NFD").replace(/[̀-ͯ]/g, "");
  const ART = /^(le|la|les|l'|un|une|des|du|de|het|een|'t|the|a|an)\s+/i;
  function norm(s, o) {
    s = String(s == null ? "" : s).trim().toLowerCase().replace(/[’`´]/g, "'").replace(/\s+/g, " ").replace(/\s*'\s*/g, "'").replace(/\s*-\s*/g, "-");
    if (o && o.noArticle) s = s.replace(ART, "").replace(/^l'/, "");
    if (o && o.noAccent) s = strip(s);
    return s;
  }
  OK.alts = s => String(s).split(/\s*[,/;]\s*/).map(x => x.trim()).filter(Boolean);
  function parseNum(s) {
    s = String(s).trim().replace(/\s/g, "").replace(",", ".");
    if (/^-?\d+\/\d+$/.test(s)) { const [a, b] = s.split("/").map(Number); return b ? a / b : NaN; }
    if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s);
    return NaN;
  }
  OK.fmtNum = n => (Math.round(n * 1000) / 1000).toString().replace(".", ",");

  /* judge(item, given) -> {ok, exact, note} */
  OK.judge = function (item, given) {
    const st = OK.state().settings;
    if (item.kind === "map" || item.kind === "choice" || item.kind === "order") return { ok: norm(given) === norm(item.answer), exact: true };
    if (item.kind === "words") { const srt = x => String(x).split(",").map(v => v.trim()).filter(Boolean).map(Number).sort((a, b) => a - b).join(","); return { ok: srt(given) === srt(item.answer), exact: true }; }
    if (item.kind === "number") {
      const cands = [item.answer].concat(item.alts || []);
      if (item.exactForm) return { ok: cands.some(c => norm(c) === norm(given)), exact: true };
      const g = parseNum(given); if (isNaN(g)) return { ok: false };
      for (const c of cands) { const v = parseNum(c); if (!isNaN(v) && Math.abs(v - g) < 1e-6) { if (item.simplify && norm(c) !== norm(given)) return { ok: true, exact: false, note: "Juist, maar vereenvoudig: " + c }; return { ok: true, exact: true }; } }
      return { ok: false };
    }
    // tekst
    const exp = [item.answer].concat(item.alts || []).flatMap(OK.alts);
    const g0 = norm(given);
    if (exp.some(e => norm(e) === g0)) return { ok: true, exact: true };
    for (const e of exp) {
      if (!st.accents && norm(e, { noAccent: true }) === norm(given, { noAccent: true })) return { ok: true, exact: false, note: "Let op de accenten: " + e };
      if (!st.articles && norm(e, { noArticle: true }) === norm(given, { noArticle: true })) return { ok: true, exact: false, note: "Met lidwoord: " + e };
      if (!st.accents && !st.articles && norm(e, { noAccent: true, noArticle: true }) === norm(given, { noAccent: true, noArticle: true })) return { ok: true, exact: false, note: "Juist, maar schrijf: " + e };
    }
    return { ok: false };
  };

  /* ---------- pool en keuze ---------- */
  OK.shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  OK.pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  OK.rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));

  /* Bouw een pool voor een kind en een module met een configuratie.
     Generatoren leveren items op aanvraag; pool() geeft dan n items. */
  /* Eén voorbeeldvraag in leesbare tekst, voor het ouderpaneel ("zo ziet een vraag eruit"). */
  OK.exampleText = function (child, moduleId, config) {
    try {
      const items = OK.buildPool(child, moduleId, config, 3); if (!items.length) return "";
      const q = items[Math.floor(Math.random() * items.length)]; const strip = h => String(h || "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
      let t = strip(q.prompt && q.prompt.main); const meta = strip(q.prompt && q.prompt.meta);
      if (!t) t = q.prompt && q.prompt.svg ? (q.kind === "map" ? "kaartvraag: " + meta : "tekening: " + meta) : meta;
      else if (meta && !/^cijferen/.test(meta)) t = meta + " · " + t;
      if (q.kind === "choice" && q.choices) t += "  →  " + q.choices.map(c => strip(c)).join(" / ");
      if (q.kind === "order" || q.kind === "words") return t;
      let a = strip(OK.display ? OK.display(q) : q.answer); if (q.kind === "number" && /^\d{5,}$/.test(a)) a = a.replace(/\B(?=(\d{3})+$)/g, " "); return t + "  (antwoord: " + a + ")";
    } catch (e) { return ""; }
  };
  OK.buildPool = function (child, moduleId, config, n) {
    const m = OK.modules[moduleId]; if (!m) return [];
    const ctx = { child, state: OK.state(), n: n || 20 };
    return m.pool(config || {}, ctx) || [];
  };

  /* Adaptief: fouten wegen zwaarder, nog niet geziene items krijgen voorrang, vlotte items komen zelden terug. */
  OK.pickAdaptive = function (child, pool, n) {
    const st = OK.statsOf(child.id);
    const w = pool.map(q => {
      const s = st[q.key]; if (!s) return 3;
      let x = 1 + s.wrong * 2.5;
      if (s.ok >= 3 && s.wrong === 0) x = 0.3;
      if (s.t > 7000) x += 1;
      return x;
    });
    const out = [], used = new Set();
    while (out.length < n && used.size < pool.length) {
      let tot = 0; w.forEach((x, i) => { if (!used.has(i)) tot += x; });
      let r = Math.random() * tot;
      for (let i = 0; i < pool.length; i++) { if (used.has(i)) continue; r -= w[i]; if (r <= 0) { used.add(i); out.push(pool[i]); break; } }
    }
    return out;
  };

  /* ---------- sessie ---------- */
  /* Session({child, moduleId, config, mode:'practice'|'test', count, taskId}) */
  OK.Session = function (opts) {
    const child = opts.child, m = OK.modules[opts.moduleId];
    const isGen = !!m.generator;
    const n = opts.mode === "test" ? (isGen ? (opts.count || 15) : null) : (opts.count || 15);
    let pool = OK.buildPool(child, opts.moduleId, opts.config, isGen ? (n || 15) * 3 : 0);
    let qs;
    if (opts.mode === "test") qs = isGen ? pool.slice(0, n) : OK.shuffle(pool.slice());
    else qs = OK.pickAdaptive(child, pool, Math.min(n, pool.length));
    const s = { child, module: m, mode: opts.mode, taskId: opts.taskId || null, qs, i: 0, tries: 0, results: [], points: 0, locked: false, t0: 0 };
    s.current = () => s.qs[s.i];
    s.start = () => { s.tries = 0; s.locked = false; s.t0 = Date.now(); };
    /* answer(given) -> {status:'ok'|'retry'|'reveal', r, pts, streakBonus, goalBonus} */
    s.answer = function (given) {
      const q = s.current(); if (!q || s.locked) return null;
      const r = OK.judge(q, given); const set = OK.state().settings;
      if (r.ok) {
        s.locked = true;
        const st = OK.stat(child.id, q.key); st.ok++; st.t = Math.round(st.t * 0.6 + (Date.now() - s.t0) * 0.4); st.last = Date.now();
        let pts = s.mode === "test" ? 0 : (s.tries === 0 ? set.p1 : set.p2), streakBonus = 0, goalBonus = 0;
        if (s.mode !== "test") { child.streak++; child.best = Math.max(child.best, child.streak); if (child.streak % 5 === 0) { streakBonus = 10; pts += 10; } }
        const before = OK.todayCount(child.id);
        OK.logExercise(child.id, pts);
        if (s.mode !== "test" && before + 1 === set.goal && set.goalBonus) { OK.addPoints(child.id, set.goalBonus, "dagdoel"); goalBonus = set.goalBonus; }
        s.points += pts + goalBonus;
        if (s.mode !== "test") { child.garden.flowers++; }
        s.results.push({ q, ok: true, tries: s.tries, given });
        OK.save();
        return { status: "ok", r, pts, streakBonus, goalBonus };
      }
      s.tries++; OK.stat(child.id, q.key).wrong++; child.streak = 0; OK.save();
      if (s.mode === "test" || s.tries >= 2) { s.locked = true; s.results.push({ q, ok: false, given }); return { status: "reveal", r }; }
      return { status: "retry", r };
    };
    s.skip = function () { const q = s.current(); if (!q || s.locked) return; OK.stat(child.id, q.key).wrong++; child.streak = 0; s.locked = true; s.results.push({ q, ok: false, given: "" }); OK.save(); };
    s.next = () => { s.i++; return s.i < s.qs.length; };
    s.finish = function () {
      const n = s.results.length, ok = s.results.filter(r => r.ok).length, pct = n ? Math.round(ok / n * 100) : 0;
      let bonus = 0, taskDone = false;
      if (s.mode === "test" && n >= 5) { bonus = pct >= 90 ? 80 : pct >= 75 ? 40 : pct >= 50 ? 15 : 0; if (bonus) OK.addPoints(child.id, bonus, "toets"); }
      if (s.taskId && n >= s.qs.length) {
        const t = OK.state().tasks.find(x => x.id === s.taskId);
        if (t && t.status === "open") { t.status = "done"; t.doneAt = OK.nowISO(); t.doneBy = child.id; t.score = ok + "/" + n; if (t.bonus) { OK.addPoints(child.id, t.bonus, "opdracht"); bonus += t.bonus; } taskDone = true; }
      }
      /* bewaar de beurt voor het ouderpaneel */
      if (n) {
        const st = OK.state(); st.sessions = st.sessions || [];
        st.sessions.unshift({ id: OK.uid(), child: child.id, module: m.id, mode: s.mode, d: OK.nowISO(), n, ok, pct, points: s.points + bonus, task: !!taskDone,
          items: s.results.map(r => ({ label: OK.itemLabel(r.q), answer: OK.display(r.q), given: r.given || "", ok: r.ok, tries: r.tries || 0 })) });
        if (st.sessions.length > 400) st.sessions.length = 400;
      }
      OK.save();
      return { n, ok, pct, bonus, total: s.points + bonus, taskDone, wrong: s.results.filter(r => !r.ok || r.tries > 0) };
    };
    return s;
  };

  /* Korte omschrijving van een vraag, voor overzichten */
  OK.itemLabel = q => { const p = q.prompt || {}; if (q.kind === "words") return (p.meta || "") + ": " + q.words.join(" "); if (q.flash) return "Flitswoord"; if (q.speak) return "Dictee"; const t = (p.main || p.meta || "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim(); return (t || (q.kind === "order" ? (q.items || []).join(", ") : q.key)).slice(0, 120); };
  /* Weergave van een antwoord voor "het is: ..." */
  OK.display = q => q.display ? q.display(q.answer) : q.kind === "words" ? String(q.answer).split(",").map(i => q.words[+i]).join(" ") : (q.kind === "number" ? String(q.answer).replace(".", ",") : OK.alts(q.answer)[0]);
})(window.OK);
