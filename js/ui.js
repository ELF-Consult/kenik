/* Kenik - ui.js
   Schermen voor het kind: kiezen wie je bent, thuis (tuin of schatkist), instellen, spelen, resultaat, winkel.
   Het ouderpaneel staat in parent.js. */
(function (OK) {
  "use strict";
  const $ = id => document.getElementById(id);
  const S = () => OK.state();
  OK.load();

  /* ---------- navigatie en thema ---------- */
  const SCREENS = ["s-landing", "s-who", "s-home", "s-setup", "s-play", "s-result", "s-shop", "s-pin", "s-parent"];
  let prev = "s-who";
  OK.show = function (id) {
    const cur = SCREENS.find(s => !$(s).classList.contains("hidden"));
    if (cur && cur !== id && cur !== "s-pin") prev = cur;
    SCREENS.forEach(s => $(s).classList.toggle("hidden", s !== id));
    const c = OK.child(), kist = c && c.theme.style === "kist"; const ses = OK.session();
    $("coins").classList.toggle("hidden", !kist || id === "s-who" || id === "s-parent" || id === "s-landing");
    const showBadge = !!c && id !== "s-who" && id !== "s-parent" && id !== "s-landing";
    $("btn-switch").classList.toggle("hidden", !showBadge);
    if (showBadge) { $("who-avatar").innerHTML = OK.avatarHTML(c, 30); $("who-name").textContent = c.name; $("who-sub").textContent = OK.isChildSession() ? "" : OK.t("switch"); $("btn-switch").disabled = OK.isChildSession(); }
    $("btn-parent").classList.toggle("hidden", id === "s-landing" || id === "s-parent" || OK.isChildSession());
    $("btn-logout").classList.toggle("hidden", !ses || id === "s-landing" || (ses.type === "family" && id !== "s-parent"));
    window.scrollTo(0, 0);
  };
  OK.applyTheme = function (child) {
    const style = child ? child.theme.style : "kist";
    document.body.dataset.style = style;
    if (style === "tuin") { const v = OK.gardenVariants[child.theme.variant] || OK.gardenVariants.hondjes; const sc = OK.scenes[v.scene]; document.body.style.setProperty("--sky", sc.sky[0]); document.body.style.setProperty("--sky2", sc.sky[1]); document.body.style.setProperty("--grass", sc.ground[0]); document.body.style.setProperty("--grass2", sc.ground[1]); }
  };
  OK.toast = function (msg, err) { const f = document.createElement("div"); f.className = "float" + (err ? " err" : ""); f.textContent = msg; document.body.appendChild(f); setTimeout(() => f.remove(), 1400); };
  document.addEventListener("click", e => { const b = e.target.closest("[data-go]"); if (!b) return; const g = b.dataset.go; if (g === "home") renderHome(); else if (g === "back") OK.show(prev); });

  /* ---------- wie ben jij ---------- */
  const COLORS = ["#5b8cff", "#3ddc97", "#ff8a1f", "#c06bff", "#ff5d7a", "#2fc4d8"];
  function renderWho() {
    OK.applyTheme(null);
    const box = $("players"); box.innerHTML = "";
    S().children.forEach((c, i) => {
      const b = document.createElement("button"); b.type = "button"; b.className = "player";
      const sub = c.theme.style === "kist" ? `${c.points} plumkes` : `${c.garden.collected.length} ${(OK.gardenVariants[c.theme.variant] || OK.gardenVariants.hondjes).friends}`;
      b.innerHTML = `${OK.avatarHTML(c)}<strong>${c.name}</strong><span class="muted small">${OK.gradeName(c.grade)} · ${sub}</span>`;
      b.addEventListener("click", () => { S().current = c.id; OK.save(); renderHome(); });
      box.appendChild(b);
    });
    $("who-hint").classList.toggle("hidden", S().children.length > 0);
    OK.show("s-who");
  }
  OK.renderWho = renderWho;
  $("btn-switch").addEventListener("click", () => { S().current = null; OK.save(); renderWho(); });

  /* ---------- thuis ---------- */
  function enabledModules(child) { return Object.values(OK.modules).filter(m => child.modules[m.id] && OK.moduleAvailable(m)); }
  function renderHome() {
    const c = OK.child(); if (!c) { renderWho(); return; }
    if (OK.syncVerbsFromLists) OK.syncVerbsFromLists(c);
    OK.applyTheme(c);
    const kist = c.theme.style === "kist";
    $("coin-count").textContent = c.points;
    $("home-stats").classList.toggle("hidden", !kist); $("shop-card").classList.toggle("hidden", !kist); $("test-card").classList.toggle("hidden", !kist);
    $("garden").classList.toggle("hidden", kist);
    if (kist) {
      $("hello").textContent = `Salut ${c.name}!`;
      const t = OK.todayCount(c.id), g = S().settings.goal;
      $("st-today").textContent = t; $("st-goal").textContent = g; $("st-week").textContent = OK.weekPoints(c.id); $("st-best").textContent = c.best;
      $("goal-bar").style.width = Math.min(100, t / g * 100) + "%";
      $("goal-text").textContent = t >= g ? `Dagdoel gehaald. Bonus van ${S().settings.goalBonus} plumkes binnen.` : `Nog ${g - t} oefeningen tot je dagdoel (+${S().settings.goalBonus} plumkes).`;
      $("streak-tag").textContent = c.streak > 1 ? `${c.streak} op rij` : "";
      const sp = $("shop-preview"); sp.innerHTML = ""; rewardsFor(c).slice(0, 3).forEach(r => sp.appendChild(rewardCard(r, true)));
      $("practice-title").textContent = OK.t("practice"); $("practice-sub").textContent = OK.t("practice_sub");
    } else { renderGarden(c); $("practice-title").textContent = `Wat ga je oefenen, ${c.name}?`; $("practice-sub").textContent = ""; }
    const pb = $("practice-btns"), tb = $("test-btns"); pb.innerHTML = ""; tb.innerHTML = "";
    const mods = enabledModules(c).sort((a, b) => (a.order || 50) - (b.order || 50));
    if (c.grade >= 5) mods.sort((a, b) => (a.group === "Talen en kennis" ? 0 : 1) - (b.group === "Talen en kennis" ? 0 : 1));
    if (!mods.length) pb.innerHTML = `<p class="muted small">Er staat nog niets aan. Papa of mama kiest in het ouderpaneel wat je oefent.</p>`;
    mods.forEach(m => {
      const desc = m.describe ? m.describe(c.modules[m.id], { child: c }) : "";
      const b = document.createElement("button"); b.type = "button"; b.className = "modbtn"; b.innerHTML = `<strong>${m.name}</strong><span class="muted small">${desc}</span>`;
      b.addEventListener("click", () => kist ? startSetup(m.id, "practice") : startNow(m.id, "practice")); pb.appendChild(b);
      if (kist) { const t = b.cloneNode(true); t.addEventListener("click", () => startSetup(m.id, "test")); tb.appendChild(t); }
    });
    renderTodo(c);
    OK.show("s-home");
  }
  OK.renderHome = renderHome;

  function renderGarden(c) {
    const v = OK.gardenVariants[c.theme.variant] || OK.gardenVariants.hondjes; const g = $("garden");
    g.className = "garden scene-" + v.scene;
    const inRound = c.garden.flowers % 10;
    let html = `<svg class="backdrop" viewBox="0 0 1000 170" preserveAspectRatio="xMidYMax slice">${OK.scenes[v.scene].svg}</svg>`;
    /* 10 items worden ingeruild voor een vriendje: je ziet dus nooit meer dan 9 */
    const nf = c.garden.collected.length, friendsTxt = nf ? ` · ${nf} ${nf === 1 ? v.friend : v.friends}` : "";
    html += `<div class="garden-label">${inRound ? `${inRound} ${inRound === 1 ? v.item : v.items}${friendsTxt}` : (nf ? `Rij vol, nieuwe ${v.friend} erbij${friendsTxt}` : `Nog geen ${v.items}`)}</div>`;
    html += `<div class="grow">${Array.from({ length: 10 }, (_, i) => `<div class="g${i < inRound ? "" : " seed"}">${v.grow(OK.growColor(i))}</div>`).join("")}</div>`;
    html += `<div class="friends">${c.garden.collected.map(i => `<div class="fr">${v.collect(i)}</div>`).join("")}</div>`;
    g.innerHTML = html;
  }

  /* ---------- opdrachten (kindkant) ---------- */
  function renderTodo(c) {
    const mine = S().tasks.filter(t => t.status === "open" && (t.child === c.id || t.child === "all") && OK.modules[t.module]).sort((a, b) => (a.due || "9").localeCompare(b.due || "9"));
    $("todo-card").classList.toggle("hidden", !mine.length);
    $("todo-title").textContent = c.theme.style === "kist" ? OK.t("todo") : OK.t("todo_parents");
    $("todo-count").textContent = mine.length + (mine.length === 1 ? " opdracht" : " opdrachten");
    const box = $("todo-list"); box.innerHTML = "";
    mine.forEach(t => {
      const m = OK.modules[t.module]; const late = t.due && t.due < OK.today();
      const d = document.createElement("div"); d.className = "item";
      d.innerHTML = `<span><strong>${m.name}${t.mode === "test" ? ": toets" : ""}</strong> <span class="muted">${m.describe ? m.describe(t.config || {}, { child: c }) : ""}${t.mode !== "test" ? " · " + t.count + " vragen" : ""}</span><br><span class="small ${late ? "" : "muted"}" style="${late ? "color:var(--rose)" : ""}">${t.due ? (late ? "Deadline was " : "Tegen ") + OK.fmtDate(t.due) : "Geen deadline"}${t.bonus && c.theme.style === "kist" ? " · bonus " + t.bonus : ""}</span></span>`;
      const b = document.createElement("button"); b.type = "button"; b.className = "btn coin-btn"; b.textContent = "Start";
      b.addEventListener("click", () => startSession({ moduleId: t.module, config: t.config, mode: t.mode, count: t.count, taskId: t.id }));
      d.appendChild(b); box.appendChild(d);
    });
  }

  /* ---------- instellen ---------- */
  let setup = null;
  function startNow(moduleId, mode) { const c = OK.child(); startSession({ moduleId, config: c.modules[moduleId], mode, count: 10 }); }
  function startSetup(moduleId, mode) {
    const c = OK.child(), m = OK.modules[moduleId], cfg = c.modules[moduleId] || {};
    setup = { moduleId, mode };
    $("setup-title").textContent = (mode === "test" ? "Toets: " : "Oefenen: ") + m.name.toLowerCase();
    const box = $("setup-fields"); box.innerHTML = "";
    (m.schema || []).filter(f => f.kid).forEach(f => box.appendChild(OK.fieldEditor(f, cfg[f.key], c, true)));
    $("setup-hint").classList.toggle("hidden", !box.querySelector("input[type=checkbox]"));
    $("setup-count-wrap").classList.toggle("hidden", mode === "test" && !m.generator);
    OK.show("s-setup");
  }
  $("setup-all").addEventListener("click", () => { $("setup-fields").querySelectorAll("input[type=checkbox]").forEach(i => i.checked = true); });
  $("btn-go").addEventListener("click", () => {
    const c = OK.child(), m = OK.modules[setup.moduleId]; const cfg = Object.assign({}, c.modules[setup.moduleId] || {});
    let empty = false;
    (m.schema || []).filter(f => f.kid).forEach(f => {
      const v = OK.readField(f, $("setup-fields")); if (v !== undefined) cfg[f.key] = v;
      const hasOptions = !!$("setup-fields").querySelector(`input[type=checkbox][name="${f.key}"], input[type=checkbox][data-key="${f.key}"]`);
      if (Array.isArray(v) && !v.length && hasOptions && ["multi", "lists", "verbs", "packs"].includes(f.type)) empty = true;
    });
    if (empty) { OK.toast("Vink eerst aan wat je wil oefenen, of kies Alles.", true); return; }
    startSession({ moduleId: setup.moduleId, config: cfg, mode: setup.mode, count: +$("setup-count").value });
  });

  /* Veld-editor gedeeld met het ouderpaneel. restrictTo = enkel opties die de ouder aanzette. */
  OK.fieldEditor = function (f, value, child, restrict) {
    const wrap = document.createElement("div"); wrap.className = "stack"; wrap.dataset.key = f.key;
    const lbl = document.createElement("p"); lbl.className = "muted small"; lbl.textContent = f.label; wrap.appendChild(lbl);
    /* korte labels worden knopjes naast elkaar, langere een nette lijst onder elkaar */
    const chip = (type, name, v, l, checked) => { const c = document.createElement("label"); c.className = "chip"; c.innerHTML = `<input type="${type}" name="${name}" value="${String(v).replace(/"/g, "&quot;")}" ${checked ? "checked" : ""}><span>${l}</span>`; return c; };
    const row = (type, name, v, l, sub, checked) => { const c = document.createElement("label"); c.className = restrict ? "check" : "opt"; c.innerHTML = `<input type="${type}" name="${name}" value="${String(v).replace(/"/g, "&quot;")}" ${checked ? "checked" : ""}><span>${l}${sub ? ` <span class="muted small">${sub}</span>` : ""}</span>`; return c; };
    const container = (asRows) => { const d = document.createElement("div"); d.className = asRows ? "list" : "chips"; wrap.appendChild(d); return d; };
    let box;
    if (f.type === "multi") {
      let opts = f.options; const sel = Array.isArray(value) ? value : [];
      if (restrict && child && child.modules && sel.length) opts = opts.filter(o => sel.map(String).includes(String(o.v)));
      const asRows = opts.some(o => String(o.l).length > 16); box = container(asRows);
      /* in het instelscherm van het kind begint alles leeg: aanvinken wat je nu wil oefenen (of "Alles") */
      opts.forEach(o => { const on = restrict ? false : sel.map(String).includes(String(o.v)); box.appendChild(asRows ? row("checkbox", f.key, o.v, o.l, "", on) : chip("checkbox", f.key, o.v, o.l, on)); });
    } else if (f.type === "select") {
      const group = f.key + "-" + OK.uid(); const asRows = f.options.some(o => String(o.l).length > 16); box = container(asRows);
      f.options.forEach(o => { const on = String(value == null ? f.default : value) === String(o.v); box.appendChild(asRows ? row("radio", group, o.v, o.l, "", on) : chip("radio", group, o.v, o.l, on)); });
    } else if (f.type === "lists") {
      const all = S().lists.filter(l => OK.forChild(l, child.id)); const sel = value === "all" || !value ? all.map(l => l.id) : value;
      const shown = restrict ? all.filter(l => sel.includes(l.id)) : all; box = container(true);
      if (!shown.length) box.innerHTML = `<p class="muted small">Nog geen lijsten voor dit kind. Die maak je onder het tabblad Lijsten.</p>`;
      shown.forEach(l => box.appendChild(row("checkbox", f.key, l.id, l.name, `${l.items.length} ${l.items.length === 1 ? "paar" : "paren"}${l.subject ? " · " + l.subject : ""}`, restrict ? false : sel.includes(l.id))));
      if (!restrict) { const a = document.createElement("label"); a.className = "check"; a.innerHTML = `<input type="checkbox" data-all="1" ${value === "all" || !value ? "checked" : ""}><span>Alle lijsten voor dit kind, ook lijsten die je later toevoegt</span>`; box.appendChild(a); }
    } else if (f.type === "packs") {
      const all = S().lists.filter(l => l.pack && OK.forChild(l, child.id)); const sel = value === "all" || !value ? all.map(l => l.id) : value;
      const shown = restrict ? all.filter(l => sel.includes(l.id)) : all; box = container(true);
      if (!shown.length) box.innerHTML = `<p class="muted small">Nog geen woordpakketten. Die maak je onder Lijsten, met het vinkje "woordpakket".</p>`;
      shown.forEach(l => box.appendChild(row("checkbox", f.key, l.id, l.name, `${l.items.length} woorden`, restrict ? false : sel.includes(l.id))));
      if (!restrict) { const a = document.createElement("label"); a.className = "check"; a.innerHTML = `<input type="checkbox" data-all="1" ${value === "all" || !value ? "checked" : ""}><span>Alle woordpakketten voor dit kind, ook latere</span>`; box.appendChild(a); }
    } else if (f.type === "verbs") {
      const sel = Array.isArray(value) ? value : []; const all = OK.allVerbs(); const shown = restrict && sel.length ? all.filter(v => sel.includes(v.inf)) : all; box = container(false);
      shown.forEach(v => box.appendChild(chip("checkbox", f.key, v.inf, v.inf, restrict ? false : sel.includes(v.inf))));
      const add = document.createElement("div"); add.className = "row"; if (restrict) add.classList.add("hidden");
      add.innerHTML = `<input type="text" data-add-inf placeholder="nieuw werkwoord, bv. donner" style="max-width:220px"><input type="text" data-add-nl placeholder="betekenis" style="max-width:180px"><button class="pill-btn" type="button" data-add-verb>Toevoegen</button><span class="muted small" data-add-msg></span>`;
      add.querySelector("[data-add-verb]").addEventListener("click", () => {
        const inf = add.querySelector("[data-add-inf]").value.trim().toLowerCase(), nl = add.querySelector("[data-add-nl]").value.trim(), msg = add.querySelector("[data-add-msg]");
        if (!inf) return; const forms = OK.addVerb(inf, nl, null);
        if (!forms) { msg.textContent = "Dat is onregelmatig of geen -er/-ir/-re werkwoord; vraag papa of mama om het toe te voegen."; return; }
        if (!box.querySelector(`input[value="${inf}"]`)) box.appendChild(chip("checkbox", f.key, inf, inf, true)); else box.querySelector(`input[value="${inf}"]`).checked = true;
        if (child && child.modules && child.modules["frans-werkwoorden"] && restrict) { const cfgv = child.modules["frans-werkwoorden"].verbs || []; if (!cfgv.includes(inf)) { cfgv.push(inf); child.modules["frans-werkwoorden"].verbs = cfgv; OK.save(); } }
        msg.textContent = `${inf}: ${forms.join(", ")}`; add.querySelector("[data-add-inf]").value = ""; add.querySelector("[data-add-nl]").value = "";
      });
      wrap.appendChild(add);
    }
    if (restrict && (f.type === "multi" || f.type === "lists" || f.type === "packs" || f.type === "verbs")) { const r = document.createElement("div"); r.className = "row"; r.innerHTML = `<button class="pill-btn" type="button" data-sel="all">Alles</button><button class="pill-btn" type="button" data-sel="none">Niets</button>`; r.addEventListener("click", e => { const b = e.target.closest("[data-sel]"); if (b) box.querySelectorAll("input").forEach(i => i.checked = b.dataset.sel === "all"); }); wrap.appendChild(r); }
    return wrap;
  };
  OK.readField = function (f, root) {
    const wrap = root.querySelector(`[data-key="${f.key}"]`); if (!wrap) return undefined;
    if (f.type === "select") { const i = wrap.querySelector("input:checked"); return i ? (isNaN(+i.value) || i.value === "" ? i.value : +i.value) : f.default; }
    if (f.type === "lists" || f.type === "packs") { const all = wrap.querySelector("[data-all]"); if (all && all.checked) return "all"; }
    const vals = [...wrap.querySelectorAll(".chips input:checked, .list input:checked")].filter(i => !i.dataset.all).map(i => isNaN(+i.value) || f.type !== "multi" ? i.value : +i.value);
    return vals;
  };

  /* ---------- spelen ---------- */
  let sess = null, lastOpts = null;
  function startSession(opts) {
    const c = OK.child(); lastOpts = opts;
    sess = OK.Session(Object.assign({ child: c }, opts));
    if (!sess.qs.length) { OK.toast("Geen vragen gevonden. Kies iets anders.", true); return; }
    $("play-mode").textContent = (opts.mode === "test" ? "Toets" : "Oefenen") + (opts.taskId ? " · opdracht" : "");
    OK.show("s-play"); showQ();
  }
  /* tuin: rij van 10 die tijdens het oefenen volloopt; elke juiste = één item, bij 10 komt er een vriendje bij */
  function renderPlayGrow(c, pulse) {
    const box = $("play-grow"); if (c.theme.style !== "tuin") { box.classList.add("hidden"); return; }
    const v = OK.gardenVariants[c.theme.variant] || OK.gardenVariants.hondjes; const n = c.garden.flowers % 10;
    box.classList.remove("hidden");
    box.innerHTML = `<div class="pg-row">${Array.from({ length: 10 }, (_, i) => `<div class="pg${i < n ? "" : " seed"}${pulse && i === n - 1 ? " pop" : ""}">${v.grow(OK.growColor(i))}</div>`).join("")}</div><span class="pg-text">${n === 0 && c.garden.flowers ? `10 ${v.items} vol: ${v.friend} erbij!` : `nog ${10 - n} ${10 - n === 1 ? v.item : v.items} tot een nieuwe ${v.friend}`}</span>`;
  }
  function showQ() {
    const q = sess.current(); if (!q) { finish(); return; }
    sess.start(); renderPlayGrow(OK.child(), false);
    $("play-progress").textContent = OK.t("question_of", sess.i + 1, sess.qs.length); $("play-bar").style.width = (sess.i / sess.qs.length * 100) + "%";
    const p = q.prompt || {}; let html = p.meta ? `<span class="meta">${p.meta}</span>` : "";
    if (p.main) html += p.main;
    if (p.svg) html += `<div class="svgwrap">${p.svg}</div>`;
    if (q.map && q.highlight) html += `<div class="svgwrap" style="max-width:560px">${OK.mapSVG(q.map, { highlight: q.highlight })}</div>`;
    $("question").innerHTML = html;
    const fb = $("feedback"); fb.textContent = ""; fb.className = "feedback"; $("hint").classList.add("hidden"); $("hint").innerHTML = "";
    if (q.flash) {
      /* flitswoord: eerst tonen, dan weg, dan pas typen */
      $("input-area").innerHTML = ""; $("question").innerHTML = `<span class="meta">${p.meta || ""}</span><span class="flashword">${q.flash.word}</span>`;
      const s0 = sess; setTimeout(() => { if (sess !== s0 || sess.current() !== q) return; $("question").innerHTML = `<span class="meta">Wat stond er?</span>____`; renderInput(q); }, q.flash.ms);
      return;
    }
    renderInput(q);
    if (q.speak) setTimeout(() => OK.speak(q.speak), 150);
  }
  $("question").addEventListener("click", e => { const b = e.target.closest("[data-speak]"); if (b) OK.speak(b.dataset.speak); });
  function renderInput(q) {
    const area = $("input-area"); area.innerHTML = "";
    const tuin = OK.child().theme.style === "tuin";
    if (q.kind === "text" || q.kind === "number") {
      const row = document.createElement("div"); row.className = "answer";
      row.innerHTML = `<input type="text" id="answer" autocomplete="off" autocapitalize="off" spellcheck="false" inputmode="${q.kind === "number" ? "decimal" : "text"}" placeholder="${q.kind === "number" ? "" : "typ je antwoord"}"><button class="btn" id="btn-check" type="button">OK</button>`;
      area.appendChild(row);
      if (q.kind === "text" && q.lang === "fr") { const acc = document.createElement("div"); acc.className = "accents"; "é è ê à ç ù î ô ë ï".split(" ").forEach(ch => { const b = document.createElement("button"); b.type = "button"; b.textContent = ch; b.addEventListener("mousedown", e => e.preventDefault()); b.addEventListener("click", () => { const a = $("answer"); const s = a.selectionStart == null ? a.value.length : a.selectionStart; a.value = a.value.slice(0, s) + ch + a.value.slice(a.selectionEnd == null ? s : a.selectionEnd); a.focus(); a.setSelectionRange(s + 1, s + 1); }); acc.appendChild(b); }); area.appendChild(acc); }
      if (q.kind === "number" && (tuin || "ontouchstart" in window)) {
        const kp = document.createElement("div"); kp.className = "keypad";
        /* komma en deelteken alleen als de antwoorden in deze beurt ze nodig hebben; de onderste rij blijft altijd gevuld */
        const answers = sess.qs.map(x => String(x.answer) + (x.alts || []).join(" "));
        const needComma = answers.some(a => a.includes(",")), needSlash = answers.some(a => a.includes("/")), needMinus = answers.some(a => /^-/.test(a.trim()));
        const row4 = [needComma ? "," : (needMinus ? "-" : "del"), "0", needSlash ? "/" : (needComma || needMinus ? "del" : "del2")];
        const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9"].concat(row4).concat(row4.includes("del") || row4.includes("del2") ? ["ok3"] : ["del", "ok"]);
        keys.forEach(k => { if (k === "del2") { const sp = document.createElement("span"); kp.appendChild(sp); return; } const b = document.createElement("button"); b.type = "button"; const isOk = k === "ok" || k === "ok3"; b.className = "key" + (isOk ? " ok" : k === "del" ? " del" : ""); if (k === "ok3") b.style.gridColumn = "span 3"; b.textContent = isOk ? "OK" : k === "del" ? "wis" : k; b.dataset.k = isOk ? "ok" : k; kp.appendChild(b); });
        kp.addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; const a = $("answer"); if (b.dataset.k === "ok") check(); else if (b.dataset.k === "del") a.value = a.value.slice(0, -1); else if (a.value.length < 10) a.value += b.dataset.k; });
        area.appendChild(kp); row.querySelector("#btn-check").classList.add("hidden");
      }
      $("btn-check").addEventListener("click", () => check());
      $("answer").addEventListener("keydown", e => { if (e.key === "Enter") check(); });
      if (!tuin) setTimeout(() => $("answer").focus(), 50);
    } else if (q.kind === "choice") {
      const box = document.createElement("div"); box.className = "choices";
      q.choices.forEach(ch => { const b = document.createElement("button"); b.type = "button"; b.className = "choice"; b.textContent = ch; b.addEventListener("click", () => { if (sess.locked) return; const res = check(ch); if (res && res.status === "ok") b.classList.add("right"); else { b.classList.add("wrong"); if (res && res.status === "reveal") box.querySelectorAll(".choice").forEach(x => { if (x.textContent === q.answer) x.classList.add("right"); }); } }); box.appendChild(b); });
      area.appendChild(box);
    } else if (q.kind === "map") {
      const box = document.createElement("div"); box.innerHTML = OK.mapSVG(q.map, { interactive: true }); area.appendChild(box);
      box.addEventListener("click", e => { const el = e.target.closest("[data-layer]"); if (!el || sess.locked) return; if (el.dataset.layer !== q.target.layer) return;
        const res = check(el.dataset.id); if (res && res.status === "ok") el.classList.add("right"); else { el.classList.add("wrong"); if (res && res.status === "reveal") { const t = box.querySelector(`[data-layer="${q.target.layer}"][data-id="${q.target.id}"]`); if (t) t.classList.add("right"); } } });
    } else if (q.kind === "words") {
      /* klik op woorden in de zin */
      const wrap = document.createElement("div"); wrap.className = "stack";
      const sent = document.createElement("div"); sent.className = "sentence"; let picked = [];
      q.words.forEach((w, i) => { const b = document.createElement("button"); b.type = "button"; b.className = "word"; b.textContent = w; b.dataset.i = i;
        b.addEventListener("click", () => { if (sess.locked) return; if (!q.multi) { const res = check(String(i)); b.classList.add(res && res.status === "ok" ? "right" : "wrong"); if (res && res.status === "reveal") markRight(); return; }
          b.classList.toggle("sel"); picked = [...sent.querySelectorAll(".word.sel")].map(x => +x.dataset.i); done.disabled = !picked.length; }); sent.appendChild(b); });
      const markRight = () => String(q.answer).split(",").forEach(i => { const el = sent.querySelector(`.word[data-i="${i}"]`); if (el) { el.classList.remove("wrong", "sel"); el.classList.add("right"); } });
      const done = document.createElement("button"); done.type = "button"; done.className = "btn mint"; done.textContent = "Klaar"; done.disabled = true; done.style.alignSelf = "center";
      done.addEventListener("click", () => { if (sess.locked || !picked.length) return; const res = check(picked.join(",")); if (res && res.status === "ok") markRight(); else { sent.querySelectorAll(".word.sel").forEach(x => { x.classList.remove("sel"); x.classList.add("wrong"); }); picked = []; done.disabled = true; if (res && res.status === "reveal") markRight(); else setTimeout(() => sent.querySelectorAll(".word.wrong").forEach(x => x.classList.remove("wrong")), 900); } });
      wrap.appendChild(sent); if (q.multi) wrap.appendChild(done); area.appendChild(wrap);
    } else if (q.kind === "order") {
      /* tik de items in volgorde; ze verhuizen naar de antwoordrij */
      const wrap = document.createElement("div"); wrap.className = "stack";
      wrap.innerHTML = `<div class="order-answer" data-slots></div><div class="choices order-pool" data-pool></div><div class="row" style="justify-content:center"><button class="btn ghost" type="button" data-reset>Opnieuw</button></div>`;
      const pool = wrap.querySelector("[data-pool]"), slots = wrap.querySelector("[data-slots]");
      let picked = [];
      const draw = () => {
        slots.innerHTML = picked.length ? picked.map(x => `<span class="order-chip">${x}</span>`).join(`<span class="muted">→</span>`) : `<span class="muted small">Tik de items in de juiste volgorde</span>`;
        pool.innerHTML = ""; q.items.filter(x => !picked.includes(x)).forEach(x => { const b = document.createElement("button"); b.type = "button"; b.className = "choice"; b.textContent = x; b.addEventListener("click", () => { if (sess.locked) return; picked.push(x); draw(); if (picked.length === q.items.length) { const res = check(picked.join("|")); if (res && res.status !== "ok") { slots.querySelectorAll(".order-chip").forEach((c, i) => c.classList.toggle("wrong", q.answer.split("|")[i] !== picked[i])); if (res.status === "retry") setTimeout(() => { picked = []; draw(); }, 900); } } }); pool.appendChild(b); });
      };
      wrap.querySelector("[data-reset]").addEventListener("click", () => { if (sess.locked) return; picked = []; draw(); });
      draw(); area.appendChild(wrap);
    }
  }
  function check(given) {
    const q = sess.current(); if (!q || sess.locked) return null;
    if (given === undefined) { const a = $("answer"); if (!a) return null; given = a.value.trim(); if (!given) return null; if (q.stripPron) given = given.replace(/^(je|j'|tu|il|elle|on|nous|vous|ils|elles)\s*'?\s*/i, ""); }
    const res = sess.answer(given); const fb = $("feedback");
    if (res.status === "ok") {
      fb.className = "feedback " + (res.r.exact ? "ok" : "warn"); fb.textContent = res.r.exact ? OK.pick(OK.t("praise")) : res.r.note;
      if (res.pts) { $("coin-count").textContent = OK.child().points; if (OK.child().theme.style === "kist") OK.toast(`+${res.pts}${res.goalBonus ? " en dagdoel +" + res.goalBonus : ""}`); }
      if (OK.child().theme.style === "tuin" && sess.mode !== "test") { const v = OK.gardenVariants[OK.child().theme.variant] || OK.gardenVariants.hondjes; renderPlayGrow(OK.child(), true); OK.toast(`+1 ${v.item}`); }
      if (q.explain && (sess.tries > 0 || q.kind === "number" && /:/.test(q.prompt.main || ""))) { $("hint").innerHTML = `<p>${q.explain}</p>`; $("hint").classList.remove("hidden"); }
      const a = $("answer"); if (a) a.disabled = true;
      const s0 = sess; setTimeout(() => { if (sess !== s0) return; if (sess.next()) showQ(); else finish(); }, res.r.exact ? 800 : 1700);
    } else if (res.status === "retry") {
      fb.className = "feedback bad"; fb.textContent = OK.t("retry");
      const a = $("answer"); if (a) { a.value = ""; a.focus(); }
      if (q.hint) { $("hint").innerHTML = q.hint; $("hint").classList.remove("hidden"); }
    } else {
      reveal(q);
    }
    return res;
  }
  function reveal(q) {
    const fb = $("feedback"); fb.className = "feedback bad"; fb.innerHTML = `${OK.t("it_is")} <strong>${OK.display(q)}</strong>`;
    if (q.explain) { $("hint").innerHTML = `<p>${q.explain}</p>`; $("hint").classList.remove("hidden"); }
    const a = $("answer"); if (a) a.disabled = true;
    if (q.kind === "map") { const t = $("input-area").querySelector(`[data-layer="${q.target.layer}"][data-id="${q.target.id}"]`); if (t) t.classList.add("right"); }
    if (q.kind === "words") String(q.answer).split(",").forEach(i => { const el = $("input-area").querySelector(`.word[data-i="${i}"]`); if (el) el.classList.add("right"); });
    const s0 = sess; setTimeout(() => { if (sess !== s0) return; if (sess.next()) showQ(); else finish(); }, 2300);
  }
  $("btn-skip").addEventListener("click", () => { if (!sess || sess.locked) return; const q = sess.current(); sess.skip(); reveal(q); });
  $("btn-quit").addEventListener("click", () => { if (sess && sess.results.length) finish(); else renderHome(); });

  function finish() {
    const c = OK.child(); const r = sess.finish(); const mode = sess.mode; sess = null;
    const kist = c.theme.style === "kist";
    $("result-title").textContent = (mode === "test" ? `Toets: ${r.ok} op ${r.n} (${r.pct}%)` : `Klaar: ${r.ok} van ${r.n} juist`) + (r.taskDone ? " · opdracht afgewerkt" : "");
    const v = OK.gardenVariants[c.theme.variant] || OK.gardenVariants.hondjes; const left = (10 - c.garden.flowers % 10) % 10 || 10;
    $("result-stats").innerHTML = `<div class="stat"><b>${r.ok}/${r.n}</b><span>juist</span></div><div class="stat"><b>${r.pct}%</b><span>score</span></div>` + (kist ? `<div class="stat"><b>+${r.total}</b><span>plumkes verdiend</span></div>` : (mode !== "test" ? `<div class="stat"><b>+${r.ok}</b><span>${v.items}</span></div>` : ""));
    if (!kist && mode !== "test") { const p = document.createElement("p"); p.className = "muted small"; p.id = "result-garden"; p.textContent = `Elke juiste oefening is één ${v.item}. Bij 10 ${v.items} komt er een ${v.friend} bij in je wereld. Nog ${left} ${left === 1 ? v.item : v.items} tot de volgende.`; $("result-stats").after(p); const old = document.querySelectorAll("#result-garden"); if (old.length > 1) old[0].remove(); }
    else { const old = $("result-garden"); if (old) old.remove(); }
    const list = $("result-list"); list.innerHTML = "";
    if (r.wrong.length) { const h = document.createElement("p"); h.className = "muted small"; h.textContent = "Nog eens bekijken:"; list.appendChild(h); }
    r.wrong.forEach(x => { const d = document.createElement("div"); d.className = "item"; const q = x.q; d.innerHTML = `<span>${(q.prompt.main || q.prompt.meta || "").replace(/<[^>]+>/g, "")}</span><strong>${OK.display(q)}</strong>`; list.appendChild(d); });
    $("coin-count").textContent = c.points;
    OK.show("s-result");
    if (!kist) celebrateIfNeeded(c);
  }
  $("btn-again").addEventListener("click", () => { if (lastOpts) { const o = Object.assign({}, lastOpts); delete o.taskId; startSession(o); } });

  /* ---------- tuin: verzamelen ---------- */
  function celebrateIfNeeded(c) {
    const v = OK.gardenVariants[c.theme.variant] || OK.gardenVariants.hondjes;
    const earned = Math.floor(c.garden.flowers / 10) - (c.garden.parties || 0);
    if (earned <= 0) return;
    c.garden.parties = (c.garden.parties || 0) + 1;
    const remaining = Array.from({ length: v.count }, (_, i) => i).filter(i => !c.garden.collected.includes(i));
    let idx, title, text;
    if (remaining.length) { idx = OK.pick(remaining); c.garden.collected.push(idx); title = `Een nieuwe ${v.friend}!`; text = `${v.names[idx]} komt erbij. Je hebt nu ${c.garden.collected.length} ${c.garden.collected.length === 1 ? v.friend : v.friends}.`; }
    else { idx = OK.pick(c.garden.collected); title = `Iedereen is er!`; text = `${v.names[idx]} en de anderen vieren feest. Wat een pracht van ${v.items}!`; }
    OK.save();
    $("overlay-fig").innerHTML = v.collect(idx); $("overlay-title").textContent = title; $("overlay-text").textContent = text;
    $("overlay").classList.remove("hidden"); confetti();
  }
  $("btn-overlay-ok").addEventListener("click", () => { $("overlay").classList.add("hidden"); });
  function confetti() { const c = $("confetti"); c.innerHTML = ""; const cols = ["#ffc93c", "#e8597a", "#4a90e2", "#7bc47f", "#ff8c42", "#9b59b6"]; for (let i = 0; i < 60; i++) { const s = document.createElement("i"); s.style.left = Math.random() * 100 + "%"; s.style.background = cols[i % 6]; s.style.animationDelay = Math.random() * .8 + "s"; s.style.animationDuration = 1.8 + Math.random() * 1.4 + "s"; c.appendChild(s); } setTimeout(() => { c.innerHTML = ""; }, 3500); }

  /* ---------- winkel ---------- */
  function rewardsFor(c) { return S().rewards.filter(r => OK.forChild(r, c.id)); }
  function rewardCard(r, preview) {
    const c = OK.child(); const d = document.createElement("div"); d.className = "reward"; const can = c.points >= r.cost;
    d.innerHTML = `<h3>${r.name}</h3><div class="price"><span class="coin"></span>${r.cost}</div>`;
    if (!preview) { const b = document.createElement("button"); b.type = "button"; b.className = "btn coin-btn"; b.textContent = can ? "Inwisselen" : `Nog ${r.cost - c.points} te gaan`; b.disabled = !can;
      b.addEventListener("click", () => { if (c.points < r.cost) return; OK.addPoints(c.id, -r.cost, "winkel: " + r.name); S().requests.unshift({ id: OK.uid(), child: c.id, reward: r.name, cost: r.cost, d: OK.nowISO(), status: "open" }); OK.save(); renderShop(); }); d.appendChild(b); }
    return d;
  }
  function renderShop() {
    const c = OK.child(); $("coin-count").textContent = c.points;
    const sh = $("shop"); sh.innerHTML = ""; rewardsFor(c).forEach(r => sh.appendChild(rewardCard(r, false)));
    if (!sh.children.length) sh.innerHTML = `<p class="muted small">Nog geen beloningen. Papa of mama vult de winkel in het ouderpaneel.</p>`;
    const my = $("my-requests"); my.innerHTML = ""; const mine = S().requests.filter(q => q.child === c.id);
    if (!mine.length) my.innerHTML = `<p class="muted small">Nog niets aangevraagd.</p>`;
    mine.forEach(q => { const d = document.createElement("div"); d.className = "item"; d.innerHTML = `<span>${q.reward}</span><span class="tag ${q.status === "ok" ? "good" : q.status === "no" ? "bad" : "warn"}">${q.status === "ok" ? "gekregen" : q.status === "no" ? "geweigerd, plumkes terug" : "aangevraagd"}</span>`; my.appendChild(d); });
    OK.show("s-shop");
  }
  $("btn-shop").addEventListener("click", renderShop);

  /* ---------- oudercode ---------- */
  $("btn-parent").addEventListener("click", () => {
    if (OK.session() && OK.session().type === "parent") { OK.openParent(); return; }
    $("pin").value = ""; $("pin-error").textContent = "";
    $("pin-text").textContent = S().pin ? "Geef de oudercode in." : "Kies een oudercode van 4 tot 6 cijfers. Die heb je vanaf nu nodig om hier binnen te komen.";
    $("btn-pin").textContent = S().pin ? "OK" : "Code instellen"; OK.show("s-pin"); $("pin").focus();
  });
  $("btn-pin").addEventListener("click", () => {
    const v = $("pin").value.trim();
    if (!S().pin) { if (!/^\d{4,6}$/.test(v)) { $("pin-error").textContent = "4 tot 6 cijfers."; return; } S().pin = v; OK.save(); OK.openParent(); return; }
    if (v === S().pin) OK.openParent(); else $("pin-error").textContent = "Dat is niet de juiste code.";
  });
  $("pin").addEventListener("keydown", e => { if (e.key === "Enter") $("btn-pin").click(); });
  $("btn-parent-exit").addEventListener("click", () => { if (OK.child()) renderHome(); else renderWho(); });

  /* ---------- start ---------- */
  /* ---------- aanmelden ---------- */
  function renderLanding(part) {
    OK.applyTheme(null); ["land-parent", "land-child", "land-device"].forEach(id => $(id).classList.toggle("hidden", id !== part));
    $("btn-land-scan").classList.toggle("hidden", !("BarcodeDetector" in window && navigator.mediaDevices));
    OK.show("s-landing");
  }
  $("btn-land-parent").addEventListener("click", () => { renderLanding("land-parent"); $("land-email").focus(); $("land-parent-msg").innerHTML = OK.backend.mode === "supabase" ? "" : `<span class="muted">Testmodus: er wordt geen mail verstuurd, alles blijft in deze browser.</span>`; });
  $("btn-land-child").addEventListener("click", () => { renderLanding("land-child"); $("land-code").focus(); });
  $("btn-land-login").addEventListener("click", async () => {
    const email = $("land-email").value.trim().toLowerCase(); if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { $("land-parent-msg").textContent = "Dat lijkt geen e-mailadres."; return; }
    const r = await OK.backend.signInParent(email); if (r.error) { $("land-parent-msg").textContent = r.error; return; }
    pendingEmail = email; $("land-parent-msg").textContent = r.note || "";
    if (!r.pending) renderLanding("land-device");   // bij een echte inloglink wachten we tot de link geklikt is (OK.onParentAuthed)
  });
  let pendingEmail = null;
  OK.onParentAuthed = email => { if (OK.session() && OK.session().type !== "child") return; pendingEmail = email; renderLanding("land-device"); };
  OK.onRemoteChange = () => { const cur = ["s-home", "s-who", "s-parent"].find(id => !$(id).classList.contains("hidden")); if (cur === "s-home" && OK.child()) renderHome(); else if (cur === "s-who") renderWho(); };
  $("btn-dev-family").addEventListener("click", () => { OK.setSession({ type: "family", email: pendingEmail, since: OK.nowISO() }); S().current = null; OK.save(); renderWho(); });
  $("btn-dev-parent").addEventListener("click", () => { OK.setSession({ type: "parent", email: pendingEmail, since: OK.nowISO() }); OK.openParent(); });
  async function childLoginWith(code) {
    const r = await OK.backend.childLogin(code); if (r.error) { $("land-child-msg").textContent = r.error; return false; }
    OK.setSession({ type: "child", child: r.child, device: r.device, since: OK.nowISO() }); S().current = r.child; OK.save(); renderHome(); return true;
  }
  $("btn-land-code").addEventListener("click", () => childLoginWith($("land-code").value));
  $("land-code").addEventListener("keydown", e => { if (e.key === "Enter") childLoginWith($("land-code").value); });
  $("btn-land-scan").addEventListener("click", async () => {
    /* QR scannen met de camera; werkt alleen waar de browser dat toelaat (eigen site, Chrome/Android) */
    try { const det = new window.BarcodeDetector({ formats: ["qr_code"] }); const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      const v = $("land-video"); v.srcObject = stream; await v.play(); $("land-scan").classList.remove("hidden");
      const tick = async () => { if (!v.srcObject) return; try { const codes = await det.detect(v); const hit = codes.find(c => /#k-/.test(c.rawValue) || /^[A-Z]{3}-[A-Z0-9]{4}$/.test(c.rawValue)); if (hit) { stream.getTracks().forEach(t => t.stop()); v.srcObject = null; $("land-scan").classList.add("hidden"); const m = hit.rawValue.match(/#k-([A-Z0-9-]+)/i); childLoginWith(m ? m[1] : hit.rawValue); return; } } catch (e) { } requestAnimationFrame(tick); }; tick();
    } catch (e) { $("land-child-msg").textContent = "De camera is hier niet beschikbaar. Typ de code."; }
  });
  $("btn-logout").addEventListener("click", async () => { await OK.backend.signOut(); OK.setSession(null); S().current = null; OK.save(); renderLanding(); });
  OK.renderLanding = renderLanding;

  function boot() {
    const ses = OK.loadSession();
    const m = location.hash.match(/^#k-([A-Z0-9-]+)$/i); if (m && !ses) { renderLanding("land-child"); $("land-code").value = m[1].toUpperCase(); childLoginWith(m[1]); history.replaceState(null, "", location.pathname + location.search); return; }
    if (!ses) { if (S().children.length && !S().family) { OK.setSession({ type: "family", email: null, legacy: true }); } else { renderLanding(); return; } }
    const s2 = OK.session();
    if (s2.type === "child") { if (OK.backend.deviceValid && !OK.backend.deviceValid(s2.device)) { OK.setSession(null); $("land-child-msg").textContent = "Dit toestel is afgemeld door papa of mama. Vraag een nieuwe code."; renderLanding("land-child"); return; } if (OK.backend.touchDevice) OK.backend.touchDevice(s2.device); S().current = s2.child; OK.save(); if (OK.child()) renderHome(); else { OK.setSession(null); renderLanding("land-child"); } return; }
    if (s2.type === "parent") { OK.openParent(); return; }
    if (OK.child()) renderHome(); else renderWho();
  }
  window.addEventListener("hashchange", () => { const m = location.hash.match(/^#k-([A-Z0-9-]+)$/i); if (m && !OK.isChildSession()) { renderLanding("land-child"); $("land-code").value = m[1].toUpperCase(); childLoginWith(m[1]); history.replaceState(null, "", location.pathname + location.search); } });
  OK.applyI18n();
  OK.geoReady.then(boot);
})(window.OK);
