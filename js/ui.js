/* Kenik - ui.js
   Schermen voor het kind: kiezen wie je bent, thuis (wat te doen staat, spaardoel, vrij oefenen), instellen, spelen, resultaat, winkel.
   Het ouderpaneel staat in parent.js. */
(function (OK) {
  "use strict";
  const $ = id => document.getElementById(id);
  const S = () => OK.state();
  OK.load();

  /* ---------- navigatie en ontwerp ---------- */
  const SCREENS = ["s-landing", "s-who", "s-home", "s-setup", "s-play", "s-result", "s-shop", "s-pin", "s-wizard", "s-parent"];
  const KID_SCREENS = ["s-who", "s-home", "s-setup", "s-play", "s-result", "s-shop"];
  const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const h = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
  let prev = "s-who";
  OK.show = function (id) {
    const cur = SCREENS.find(s => !$(s).classList.contains("hidden"));
    if (cur && cur !== id && cur !== "s-pin") prev = cur;
    SCREENS.forEach(s => $(s).classList.toggle("hidden", s !== id));
    /* twee ontwerpen op één structuur: kleurrijk voor het kind, sober voor de ouder */
    document.body.dataset.mode = KID_SCREENS.includes(id) ? "kind" : "ouder";
    const c = OK.child(), ses = OK.session(); const kid = !!c && KID_SCREENS.includes(id) && id !== "s-who";
    document.body.dataset.young = kid && c.grade <= 2 ? "1" : "0";
    $("coins").classList.toggle("hidden", !kid); if (kid) $("coin-count").textContent = c.points;
    $("btn-switch").classList.toggle("hidden", !kid);
    if (kid) { $("who-avatar").innerHTML = OK.avatarHTML(c, 30); $("who-name").textContent = c.name; $("who-sub").textContent = OK.isChildSession() ? "" : OK.t("switch"); $("btn-switch").disabled = OK.isChildSession(); }
    const adult = id === "s-parent" || id === "s-wizard";
    $("btn-parent").classList.toggle("hidden", id === "s-landing" || adult || id === "s-play" || OK.isChildSession());
    $("btn-logout").classList.toggle("hidden", !ses || id === "s-landing" || id === "s-wizard" || id === "s-play" || (ses.type === "family" && id !== "s-parent") || (ses.type === "parent" && kid));
    if (id === "s-landing" || id === "s-play" || (ses && ses.type === "family" && id !== "s-parent")) $("btn-admin").classList.add("hidden"); else if (OK.refreshAdminButton) OK.refreshAdminButton();
    window.scrollTo(0, 0);
  };
  OK.applyTheme = function () { /* het ontwerp volgt het scherm (zie OK.show); deze functie blijft bestaan voor oudere aanroepen */ };
  /* fouten niet stil laten verdwijnen: toon ze kort onderaan, met bestand en regel, zodat een melding van een ouder bruikbaar is */
  window.addEventListener("error", e => { try { OK.toast("Er liep iets mis: " + (e.message || "onbekende fout") + " (" + String(e.filename || "").split("/").pop().split("?")[0] + ":" + e.lineno + ")", true); } catch (x) { } });
  window.addEventListener("unhandledrejection", e => { try { OK.toast("Er liep iets mis: " + (e.reason && e.reason.message || String(e.reason)), true); } catch (x) { } });
  OK.toast = function (msg, err) { const f = document.createElement("div"); f.className = "float" + (err ? " err" : ""); f.textContent = msg; document.body.appendChild(f); setTimeout(() => f.remove(), 1400); };
  document.addEventListener("click", e => { const b = e.target.closest("[data-go]"); if (!b) return; const g = b.dataset.go; if (g === "home") renderHome(); else if (g === "back") OK.show(prev); });
  $("coins").addEventListener("click", () => { if ($("s-play").classList.contains("hidden") && OK.child()) renderShop(); });

  /* ---------- wie ben jij ---------- */
  const COLORS = ["#5b8cff", "#3ddc97", "#ff8a1f", "#c06bff", "#ff5d7a", "#2fc4d8"];
  function renderWho() {
    const box = $("players"); box.innerHTML = "";
    S().children.forEach((c, i) => {
      const b = document.createElement("button"); b.type = "button"; b.className = "player";
      const sub = `${c.points} coins`;
      b.innerHTML = `${OK.avatarHTML(c)}<strong>${esc(c.name)}</strong><span class="muted small">${OK.gradeName(c.grade)} · ${sub}</span>`;
      b.addEventListener("click", () => { S().current = c.id; OK.save(); renderHome(); });
      box.appendChild(b);
    });
    /* ouder ingelogd op dit toestel: een + om meteen een kind toe te voegen (opent de wizard "nieuw kind") */
    if (OK.session() && OK.session().type === "parent") {
      const add = document.createElement("button"); add.type = "button"; add.className = "player player-add"; add.title = "Kind toevoegen";
      add.innerHTML = `<div class="avatar add">+</div><strong>Kind toevoegen</strong><span class="muted small">Naam en leerjaar, meer niet</span>`;
      add.addEventListener("click", () => { OK.show("s-parent"); OK.openWizardNewKid(); }); box.appendChild(add);
    }
    $("who-hint").classList.toggle("hidden", S().children.length > 0);
    OK.show("s-who");
  }
  OK.renderWho = renderWho;
  $("btn-switch").addEventListener("click", () => { S().current = null; OK.save(); renderWho(); });

  /* ---------- thuis ---------- */
  function enabledModules(child) { return Object.values(OK.modules).filter(m => child.modules[m.id] && OK.moduleAvailable(m)); }
  function openTasks(c) { return S().tasks.filter(t => t.status === "open" && (t.child === c.id || t.child === "all") && OK.modules[t.module]).sort((a, b) => (a.due || "9").localeCompare(b.due || "9")); }
  function dueText(t) {
    if (!t.due) return ""; if (t.due === OK.today()) return "Tegen vandaag";
    return (t.due < OK.today() ? "Was tegen " : "Tegen ") + new Date(t.due).toLocaleDateString("nl-BE", { weekday: "long", day: "numeric", month: "short" });
  }
  OK.dueText = dueText;
  function startTask(t) { startSession({ moduleId: t.module, config: t.config, mode: t.mode, count: t.count, taskId: t.id }); }
  /* opdrachten die de voorbije week afgewerkt zijn: daar hoort een proeftoets bij (zonder hulp, met score en extra coins) */
  /* enkel opdrachten die (bijna) foutloos afgewerkt zijn: score "9/10" of beter */
  function scorePct(t) { const m = /^(\d+)\/(\d+)$/.exec(t.score || ""); return m && +m[2] ? +m[1] / +m[2] * 100 : (t.score ? 0 : 100); }
  function recentDone(c) { const since = Date.now() - 7 * 864e5; return S().tasks.filter(t => t.status === "done" && t.doneAt && new Date(t.doneAt) > since && (t.doneBy === c.id || t.child === c.id) && OK.modules[t.module] && !t.tested && scorePct(t) >= 90).sort((a, b) => b.doneAt.localeCompare(a.doneAt)); }
  function startProef(t) { t.tested = true; OK.save(); startSession({ moduleId: t.module, config: t.config, mode: "test", count: t.count, taskId: null }); }
  /* ---------- de wereld van het kind: één groei-item per juist antwoord, een vriendje per 10 ---------- */
  function renderGarden(c) {
    const g = $("garden"); if (!g) return; c.garden = c.garden || { flowers: 0, collected: [] }; const v = OK.variantOf(c);
    g.className = "garden scene-" + v.scene; g.classList.remove("hidden");
    const sc = OK.scenes[v.scene]; g.style.setProperty("--sky", sc.sky[0]); g.style.setProperty("--grass", sc.ground[0]);
    const inRound = c.garden.flowers % 10;
    let html = `<svg class="backdrop" viewBox="0 0 1000 170" preserveAspectRatio="xMidYMax slice">${OK.scenes[v.scene].svg}</svg>`;
    /* 10 items worden ingeruild voor een vriendje: je ziet dus nooit meer dan 9 */
    const nf = c.garden.collected.length, friendsTxt = nf ? ` · ${nf} ${nf === 1 ? v.friend : v.friends}` : "";
    html += `<div class="garden-label">${inRound ? `${inRound} ${inRound === 1 ? v.item : v.items}${friendsTxt}` : (nf ? `Rij vol, nieuwe ${v.friend} erbij${friendsTxt}` : `Nog geen ${v.items}`)}</div>`;
    html += `<button class="world-switch" type="button" id="btn-world">Andere wereld</button>`;
    html += `<div class="grow">${Array.from({ length: 10 }, (_, i) => `<div class="g${i < inRound ? "" : " seed"}">${v.grow(OK.growColor(i))}</div>`).join("")}</div>`;
    html += `<div class="friends">${c.garden.collected.map(i => `<div class="fr">${v.collect(i)}</div>`).join("")}</div>`;
    g.innerHTML = html;
    $("btn-world").addEventListener("click", () => pickWorld(c));
  }
  /* wereld kiezen: de verzameling blijft (dezelfde nummers, andere figuren) */
  function pickWorld(c) {
    const cur = (c.theme && c.theme.variant) || "hondjes";
    const box = h("div", "world-pick");
    Object.entries(OK.gardenVariants).forEach(([k, v]) => { const b = h("button"); b.type = "button"; if (k === cur) b.classList.add("sel"); b.innerHTML = `<div class="fig">${v.collect(0)}</div><span>${v.name}</span>`; b.addEventListener("click", () => { c.theme = { style: "kist", variant: k }; OK.save(); $("overlay").classList.add("hidden"); renderGarden(c); }); box.appendChild(b); });
    $("overlay-fig").innerHTML = ""; $("overlay-title").textContent = "Kies je wereld"; const t = $("overlay-text"); t.innerHTML = ""; t.appendChild(box);
    $("overlay").classList.remove("hidden");
  }
  /* tijdens het oefenen: rij van 10 die volloopt; bij 10 komt er een vriendje bij */
  function renderPlayGrow(c, pulse) {
    const box = $("play-grow"); if (!box) return; if (!sess || sess.mode === "test") { box.classList.add("hidden"); return; }
    c.garden = c.garden || { flowers: 0, collected: [] }; const v = OK.variantOf(c); const n = c.garden.flowers % 10;
    box.classList.remove("hidden");
    box.innerHTML = `<div class="pg-row">${Array.from({ length: 10 }, (_, i) => `<div class="pg${i < n ? "" : " seed"}${pulse && i === n - 1 ? " pop" : ""}">${v.grow(OK.growColor(i))}</div>`).join("")}</div><span class="pg-text">${n === 0 && c.garden.flowers ? `10 ${v.items} vol: ${v.friend} erbij!` : `nog ${10 - n} ${10 - n === 1 ? v.item : v.items} tot een nieuwe ${v.friend}`}</span>`;
  }
  function celebrateIfNeeded(c) {
    c.garden = c.garden || { flowers: 0, collected: [] }; const v = OK.variantOf(c);
    const earned = Math.floor(c.garden.flowers / 10) - (c.garden.parties || 0);
    if (earned <= 0) return;
    c.garden.parties = (c.garden.parties || 0) + 1;
    const remaining = Array.from({ length: v.count }, (_, i) => i).filter(i => !c.garden.collected.includes(i));
    let idx, title, text;
    if (remaining.length) { idx = OK.pick(remaining); c.garden.collected.push(idx); title = `Een nieuwe ${v.friend}!`; text = `${v.names[idx]} komt erbij. Je hebt nu ${c.garden.collected.length} ${c.garden.collected.length === 1 ? v.friend : v.friends}.`; }
    else { idx = OK.pick(c.garden.collected); title = "Iedereen is er!"; text = `${v.names[idx]} en de anderen vieren feest. Wat een pracht van ${v.items}!`; }
    OK.save();
    $("overlay-fig").innerHTML = v.collect(idx); $("overlay-title").textContent = title; $("overlay-text").textContent = text;
    $("overlay").classList.remove("hidden"); confetti();
  }
  function renderProef(c) {
    const box = $("proef-card"); if (!box) return; box.innerHTML = ""; const done = recentDone(c).slice(0, 3); box.classList.toggle("hidden", !done.length); if (!done.length) return;
    box.appendChild(h("h3", null, "Proeftoets"));
    box.appendChild(h("p", "muted small", "Dit ging goed. Durf je het ook zonder hulp en zonder tweede kans? Bij 90% of meer krijg je 80 coins extra."));
    done.forEach(t => { const d = h("div", "item"); d.appendChild(h("strong", null, OK.taskTitle(t))); const b = h("button", "btn", "Proeftoets"); b.type = "button"; b.addEventListener("click", () => startProef(t)); d.appendChild(b); box.appendChild(d); });
  }
  function renderHome() {
    const c = OK.child(); if (!c) { renderWho(); return; }
    if (OK.syncVerbsFromLists) OK.syncVerbsFromLists(c);
    const tasks = openTasks(c);
    renderHero(c, tasks[0]); renderTodo(c, tasks.slice(1)); renderProef(c); renderGarden(c);
    const goal = renderGoal($("goal-card"), c); $("btn-shop").classList.toggle("hidden", goal);
    const pb = $("practice-btns"); pb.innerHTML = "";
    const mods = enabledModules(c).sort((a, b) => (a.order || 50) - (b.order || 50));
    if (c.grade >= 5) mods.sort((a, b) => (a.group === "Talen en kennis" ? 0 : 1) - (b.group === "Talen en kennis" ? 0 : 1));
    if (!mods.length) pb.innerHTML = `<p class="muted small">Er staat nog niets aan. Papa of mama kiest in het ouderpaneel wat je oefent.</p>`;
    mods.forEach(m => {
      const desc = m.describe ? m.describe(c.modules[m.id], { child: c }) : "";
      /* klik op de tegel = meteen starten met de instellingen van papa of mama; het kleine knopje erop laat het kind zelf kiezen (enkel als er iets te kiezen valt) */
      const wrap = h("div", "modtile");
      const b = h("button", "modbtn"); b.type = "button"; b.innerHTML = `<strong>${m.name}</strong><span class="muted small">${desc}</span>`;
      b.addEventListener("click", () => startNow(m.id, "practice")); wrap.appendChild(b);
      if ((m.schema || []).some(f => f.kid)) { const k = h("button", "modpick", "Zelf kiezen"); k.type = "button"; k.title = "Kies zelf wat je oefent"; k.addEventListener("click", e => { e.stopPropagation(); startSetup(m.id, "practice"); }); wrap.appendChild(k); }
      pb.appendChild(wrap);
    });
    $("practice-card").open = !tasks.length;
    $("practice-title").textContent = tasks.length ? "Iets anders oefenen" : "Kies wat je oefent";
    OK.show("s-home");
  }
  OK.renderHome = renderHome;

  /* bovenaan: de eerste opdracht, met één grote knop */
  function renderHero(c, t) {
    const box = $("todo-hero"); box.innerHTML = "";
    if (!t) { box.className = "hero-task empty"; box.appendChild(h("h1", null, `Dag ${c.name}`)); box.appendChild(h("p", null, recentDone(c).length ? "Geen nieuwe opdracht. Kies zelf wat je oefent, of waag je aan de proeftoets." : "Er staat niets klaar. Kies hieronder zelf wat je oefent.")); return; }
    box.className = "hero-task";
    const p = OK.taskProgress(t, c.id), m = OK.modules[t.module];
    const due = dueText(t); if (due) box.appendChild(h("span", "hero-due", due));
    box.appendChild(h("h1", null, OK.taskTitle(t)));
    if (p) {
      const bar = h("div", "bar"); const i = h("i"); i.style.width = (p.total ? p.known / p.total * 100 : 0) + "%"; bar.appendChild(i); box.appendChild(bar);
      box.appendChild(h("p", null, p.known ? `Je kent er al ${p.known} van de ${p.total}` : `${p.total} om te leren`));
    } else box.appendChild(h("p", null, (m.describe ? m.describe(t.config || {}, { child: c }) + " · " : "") + (t.mode === "test" ? "toets" : t.count + " vragen")));
    const b = h("button", "btn big start", OK.t("start")); b.type = "button"; b.addEventListener("click", () => startTask(t)); box.appendChild(b);
    if (t.bonus) { const bo = h("span", "hero-bonus"); bo.innerHTML = `${p ? "Alles gekend" : "Afwerken"} levert <span class="coin"></span><strong>${t.bonus} extra</strong>`; box.appendChild(bo); }
  }
  /* de andere opdrachten, kleiner */
  function renderTodo(c, rest) {
    $("todo-card").classList.toggle("hidden", !rest.length);
    const box = $("todo-list"); box.innerHTML = "";
    rest.forEach(t => {
      const p = OK.taskProgress(t, c.id); const d = h("div", "item"); const left = h("span");
      left.appendChild(h("strong", null, OK.taskTitle(t))); left.appendChild(document.createElement("br"));
      left.appendChild(h("span", "muted small", [dueText(t), p ? `${p.known} van ${p.total} gekend` : (t.mode === "test" ? "toets" : t.count + " vragen")].filter(Boolean).join(" · ")));
      const b = h("button", "btn", OK.t("start")); b.type = "button"; b.addEventListener("click", () => startTask(t));
      d.append(left, b); box.appendChild(d);
    });
  }
  /* spaardoel: de eerstvolgende beloning die nog niet betaalbaar is. Geeft terug of er iets getoond wordt. */
  function renderGoal(box, c) {
    box.innerHTML = ""; const rs = rewardsFor(c).slice().sort((a, b) => a.cost - b.cost);
    const next = rs.find(r => r.cost > c.points), can = rs.filter(r => r.cost <= c.points).length;
    const show = !!(next || can); box.classList.toggle("hidden", !show); if (!show) return false;
    if (next) {
      box.appendChild(h("span", "muted small", `Nog ${next.cost - c.points} coins tot`)); box.appendChild(h("strong", "goal-name", next.name));
      const bar = h("div", "bar coinbar"); const i = h("i"); i.style.width = Math.min(100, c.points / next.cost * 100) + "%"; bar.appendChild(i); box.appendChild(bar);
    }
    if (can) box.appendChild(h("p", "small", `Je kan nu al ${can === 1 ? "iets" : can + " dingen"} aanvragen.`));
    const b = h("button", "linklike", "Naar de winkel"); b.type = "button"; b.addEventListener("click", renderShop); box.appendChild(b);
    return true;
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
  /* restrict: true = instelscherm van het kind (leeg beginnen), false = ouderpaneel, "task" = opdracht (concreet kiezen, geen "alles") */
  OK.fieldEditor = function (f, value, child, mode) {
    const restrict = mode === true, task = mode === "task";
    const wrap = document.createElement("div"); wrap.className = "stack"; wrap.dataset.key = f.key;
    const lbl = document.createElement("p"); lbl.className = "muted small"; lbl.textContent = f.label; wrap.appendChild(lbl);
    /* korte labels worden knopjes naast elkaar, langere een nette lijst onder elkaar */
    const chip = (type, name, v, l, checked) => { const c = document.createElement("label"); c.className = "chip"; c.innerHTML = `<input type="${type}" name="${name}" value="${String(v).replace(/"/g, "&quot;")}" ${checked ? "checked" : ""}><span>${l}</span>`; return c; };
    const row = (type, name, v, l, sub, checked) => { const c = document.createElement("label"); c.className = restrict ? "check" : "opt"; c.innerHTML = `<input type="${type}" name="${name}" value="${String(v).replace(/"/g, "&quot;")}" ${checked ? "checked" : ""}><span>${l}${sub ? ` <span class="muted small">${sub}</span>` : ""}</span>`; return c; };
    /* lijsten kiezen: nieuwste eerst, gegroepeerd per vak zodra er veel zijn, met zoekveld */
    const newListBtn = (box, child, label) => { const b = document.createElement("button"); b.type = "button"; b.className = "linklike"; b.textContent = label; b.addEventListener("click", () => OK.wizardNewList && OK.wizardNewList(child && child.id)); box.appendChild(b); };
    const listPicker = (box, lists, key, subOf, checkedOf) => {
      const ordered = lists.slice().reverse();
      const many = ordered.length > 6; const groups = {}; ordered.forEach(l => { const g = l.subject || "Andere"; (groups[g] = groups[g] || []).push(l); });
      const gnames = Object.keys(groups);
      if (ordered.length > 8) {
        const q = document.createElement("input"); q.type = "text"; q.placeholder = "Zoek een lijst..."; q.className = "list-search"; box.appendChild(q);
        q.addEventListener("input", () => { const t = q.value.trim().toLowerCase(); box.querySelectorAll("label.check, label.opt").forEach(lb => lb.classList.toggle("hidden", !!t && !lb.textContent.toLowerCase().includes(t))); box.querySelectorAll("details.lgroup").forEach(d => { if (t) d.open = true; }); });
      }
      const addRows = (parent, items) => items.forEach(l => parent.appendChild(row("checkbox", key, l.id, l.name, subOf(l), checkedOf(l))));
      if (!many || gnames.length < 2) { addRows(box, ordered); return; }
      gnames.forEach(g => {
        const det = document.createElement("details"); det.className = "modgroup lgroup"; const n = groups[g].filter(checkedOf).length; det.open = n > 0 || gnames.length <= 3;
        const sum = document.createElement("summary"); sum.innerHTML = `<strong>${g}</strong> <span class="muted small" data-count></span>`; det.appendChild(sum);
        const inner = document.createElement("div"); inner.className = "list"; addRows(inner, groups[g]); det.appendChild(inner); box.appendChild(det);
        const upd = () => { sum.querySelector("[data-count]").textContent = `${inner.querySelectorAll("input:checked").length} van ${groups[g].length} gekozen`; };
        inner.addEventListener("change", upd); upd();
      });
    };
    const container = (asRows) => { const d = document.createElement("div"); d.className = asRows ? "list" : "chips"; wrap.appendChild(d); return d; };
    let box;
    if (f.type === "multi") {
      let opts = f.options; const sel = Array.isArray(value) ? value : [];
      if (restrict && child && child.modules && sel.length) opts = opts.filter(o => sel.map(String).includes(String(o.v)));
      const asRows = opts.some(o => String(o.l).length > 16 || o.sub); box = container(asRows);
      /* in het instelscherm van het kind begint alles leeg: aanvinken wat je nu wil oefenen (of "Alles") */
      opts.forEach(o => { const on = restrict ? false : sel.map(String).includes(String(o.v)); box.appendChild(asRows ? row("checkbox", f.key, o.v, o.l, o.sub || "", on) : chip("checkbox", f.key, o.v, o.l, on)); });
    } else if (f.type === "select") {
      const group = f.key + "-" + OK.uid(); const asRows = f.options.some(o => String(o.l).length > 16); box = container(asRows);
      f.options.forEach(o => { const on = String(value == null ? f.default : value) === String(o.v); box.appendChild(asRows ? row("radio", group, o.v, o.l, "", on) : chip("radio", group, o.v, o.l, on)); });
    } else if (f.type === "lists") {
      const all = S().lists.filter(l => OK.forChild(l, child.id)); const sel = value === "all" || !value ? all.map(l => l.id) : value;
      const shown = restrict ? all.filter(l => sel.includes(l.id)) : all; box = container(true);
      if (!shown.length) box.innerHTML = `<p class="muted small">Nog geen lijsten voor dit kind.</p>`;
      listPicker(box, shown, f.key, l => `${l.items.length} ${l.items.length === 1 ? "paar" : "paren"}`, l => restrict || task ? false : sel.includes(l.id));
      if (!restrict) newListBtn(box, child, shown.length ? "Staat de juiste lijst er niet bij? Nieuwe lijst maken van een foto" : "Nieuwe lijst maken van een foto");
      if (!restrict && !task) { const a = document.createElement("label"); a.className = "check"; a.innerHTML = `<input type="checkbox" data-all="1" ${value === "all" || !value ? "checked" : ""}><span>Alle lijsten voor dit kind, ook lijsten die je later toevoegt</span>`; box.appendChild(a); }
    } else if (f.type === "packs") {
      const all = S().lists.filter(l => l.pack && OK.forChild(l, child.id)); const sel = value === "all" || !value ? all.map(l => l.id) : value;
      const shown = restrict ? all.filter(l => sel.includes(l.id)) : all; box = container(true);
      if (!shown.length) box.innerHTML = `<p class="muted small">Nog geen woordpakketten voor dit kind.</p>`;
      listPicker(box, shown, f.key, l => `${l.items.length} woorden`, l => restrict ? false : sel.includes(l.id));
      if (!restrict) newListBtn(box, child, shown.length ? "Staat het juiste pakket er niet bij? Nieuw woordpakket maken van een foto" : "Nieuw woordpakket maken van een foto");
      if (!restrict) { const a = document.createElement("label"); a.className = "check"; a.innerHTML = `<input type="checkbox" data-all="1" ${value === "all" || !value ? "checked" : ""}><span>Alle woordpakketten voor dit kind, ook latere</span>`; box.appendChild(a); }
    } else if (f.type === "verbpick") {
      /* per soort enkel de gangbare werkwoorden (5e en 6e) plus wat er voor dit kind bij kwam (handboek of zelf toegevoegd);
         de rest van de catalogus blijft onzichtbaar tot je ze toevoegt, dan komen ze vanzelf in de juiste soort */
      const sel = new Set(Array.isArray(value) ? value : []); box = container(true); box.className = "stack";
      const abc = (a, b) => a.inf.localeCompare(b.inf, "fr"); const boxes = {};
      const groupBox = (g, verbs) => {
        const det = document.createElement("details"); det.className = "modgroup lgroup"; det.open = true;
        const sum = document.createElement("summary"); sum.innerHTML = `<strong>${g.l}</strong> <span class="muted small" data-count></span>`; det.appendChild(sum);
        const ch = document.createElement("div"); ch.className = "chips verbchips"; det.appendChild(ch);
        const add = v => { const c = chip("checkbox", f.key, v.inf, v.inf, sel.has(v.inf)); c.dataset.inf = v.inf; if (v.nl) c.title = v.nl; /* betekenis enkel bij aanwijzen */
          const after = [...ch.children].find(x => x.dataset.inf.localeCompare(v.inf, "fr") > 0); ch.insertBefore(c, after || null); return c; }; /* alfabetisch, ook wat je later toevoegt */
        verbs.forEach(add);
        const upd = () => { sum.querySelector("[data-count]").textContent = `${ch.querySelectorAll("input:checked").length} van ${ch.querySelectorAll("input").length} aan`; }; ch.addEventListener("change", upd); upd();
        box.appendChild(det); boxes[g.v] = { ch, add, upd };
      };
      OK.verbGroups().forEach(g => groupBox(g, OK.verbsInGroup(g.v).filter(v => OK.verbIsCore(v.inf) || sel.has(v.inf)).concat(OK.customVerbs().filter(v => OK.verbGroupOf(v.inf) === g.v && sel.has(v.inf))).sort(abc)));
      /* zelf een werkwoord toevoegen: uit de catalogus of regelmatig (automatisch vervoegd); onregelmatig onbekend -> met de zes vormen op de werkwoordenpagina */
      const addRow = document.createElement("div"); addRow.className = "row";
      addRow.innerHTML = `<input type="text" data-add-inf placeholder="Werkwoord toevoegen, bv. donner" style="max-width:260px"><button class="pill-btn" type="button" data-add-verb>Toevoegen</button><span class="muted small" data-add-msg></span>`;
      addRow.querySelector("[data-add-verb]").addEventListener("click", () => {
        const inf = addRow.querySelector("[data-add-inf]").value.trim().toLowerCase(), nl = "", msg = addRow.querySelector("[data-add-msg]"); if (!inf) return;
        let v = OK.verbDef ? OK.verbDef(inf) : null;
        if (!v) { const forms = OK.addVerb(inf, nl, null); if (!forms) { msg.textContent = "Dat ken ik niet en het is geen regelmatig -er/-ir/-re werkwoord. Voeg het met de zes vormen toe onder Leerstof › Werkwoorden."; return; } v = OK.verbDef(inf); }
        const g = OK.verbGroupOf(inf), gb = boxes[g]; const ex = gb.ch.querySelector(`[data-inf="${inf}"] input`);
        if (ex) ex.checked = true; else gb.add(v).querySelector("input").checked = true;
        gb.upd(); msg.textContent = `${inf} staat bij "${(OK.verbGroups().find(x => x.v === g) || {}).l}".`; addRow.querySelector("[data-add-inf]").value = "";
        gb.ch.dispatchEvent(new Event("change", { bubbles: true }));
      });
      addRow.querySelector("[data-add-inf]").addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); addRow.querySelector("[data-add-verb]").click(); } });
      wrap.appendChild(addRow);
      const hint = document.createElement("p"); hint.className = "muted small"; hint.textContent = "Werkwoorden uit een gefotografeerde lijst komen er vanzelf bij, in de juiste soort."; wrap.appendChild(hint);
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
    $("play-mode").textContent = "Toets"; $("play-mode").classList.toggle("hidden", opts.mode !== "test");
    OK.show("s-play"); showQ();
  }
  function showQ() {
    const q = sess.current(); if (!q) { finish(); return; }
    sess.start(); renderPlayGrow(OK.child(), false); hideSheet();
    $("play-progress").textContent = `${sess.i + 1} / ${sess.qs.length}`; $("play-bar").style.width = (sess.i / sess.qs.length * 100) + "%";
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
  /* tijdens een beurt: cijfers, Backspace en Enter werken altijd, ook als het antwoordvak de focus kwijt is */
  document.addEventListener("keydown", e => {
    const a = $("answer"); if (!a || !sess || document.activeElement === a || !$("s-play") || $("s-play").classList.contains("hidden")) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === "Enter") { e.preventDefault(); if (sess.locked) { if (Date.now() - sheetAt > 250) advance(); } else check(); }
    else if (e.key === "Backspace") { e.preventDefault(); a.value = a.value.slice(0, -1); }
    else if (e.key.length === 1 && a.value.length < 40) { e.preventDefault(); a.value += e.key; a.focus(); }
  });
  $("question").addEventListener("click", e => { const b = e.target.closest("[data-speak]"); if (b) OK.speak(b.dataset.speak); });
  function renderInput(q) {
    const area = $("input-area"); area.innerHTML = "";
    /* cijferklavier op aanraakschermen en voor de jongsten: grote toetsen, geen schermtoetsenbord */
    const pad = q.kind === "number" && (OK.child().grade <= 2 || "ontouchstart" in window);
    if (q.kind === "text" || q.kind === "number") {
      const row = document.createElement("div"); row.className = "answer";
      row.innerHTML = `<input type="text" id="answer" autocomplete="off" autocapitalize="off" spellcheck="false" inputmode="${q.kind === "number" ? "decimal" : "text"}" placeholder="${q.kind === "number" ? "" : "typ je antwoord"}"><button class="btn" id="btn-check" type="button">OK</button>`;
      area.appendChild(row);
      if (q.kind === "text" && q.lang === "fr") { const acc = document.createElement("div"); acc.className = "accents"; "é è ê à ç ù î ô ë ï".split(" ").forEach(ch => { const b = document.createElement("button"); b.type = "button"; b.textContent = ch; b.addEventListener("mousedown", e => e.preventDefault()); b.addEventListener("click", () => { const a = $("answer"); const s = a.selectionStart == null ? a.value.length : a.selectionStart; a.value = a.value.slice(0, s) + ch + a.value.slice(a.selectionEnd == null ? s : a.selectionEnd); a.focus(); a.setSelectionRange(s + 1, s + 1); }); acc.appendChild(b); }); area.appendChild(acc); }
      if (pad) {
        const kp = document.createElement("div"); kp.className = "keypad";
        /* komma en deelteken alleen als de antwoorden in deze beurt ze nodig hebben; de onderste rij blijft altijd gevuld */
        const answers = sess.qs.map(x => String(x.answer) + (x.alts || []).join(" "));
        const needComma = answers.some(a => a.includes(",")), needSlash = answers.some(a => a.includes("/")), needMinus = answers.some(a => /^-/.test(a.trim()));
        const row4 = [needComma ? "," : (needMinus ? "-" : "del"), "0", needSlash ? "/" : (needComma || needMinus ? "del" : "del2")];
        const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9"].concat(row4).concat(row4.includes("del") || row4.includes("del2") ? ["ok3"] : ["del", "ok"]);
        keys.forEach(k => { if (k === "del2") { const sp = document.createElement("span"); kp.appendChild(sp); return; } const b = document.createElement("button"); b.type = "button"; const isOk = k === "ok" || k === "ok3"; b.className = "key" + (isOk ? " ok" : k === "del" ? " del" : ""); if (k === "ok3") b.style.gridColumn = "span 3"; b.textContent = isOk ? "OK" : k === "del" ? "wis" : k; b.dataset.k = isOk ? "ok" : k; kp.appendChild(b); });
        kp.addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; const a = $("answer"); if (b.dataset.k === "ok") check(); else if (b.dataset.k === "del") a.value = a.value.slice(0, -1); else if (a.value.length < 10) a.value += b.dataset.k; });
        kp.addEventListener("mousedown", e => e.preventDefault()); /* klik op een toets haalt de focus niet uit het vak: typen blijft werken */
        area.appendChild(kp); row.querySelector("#btn-check").classList.add("hidden");
        /* op een aanraakscherm geen schermtoetsenbord (het klavier staat er al), maar een echt toetsenbord werkt wel */
        if ("ontouchstart" in window) row.querySelector("#answer").setAttribute("inputmode", "none");
      }
      $("btn-check").addEventListener("click", () => check());
      $("answer").addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); check(); } });
      setTimeout(() => { const a = $("answer"); if (a) a.focus(); }, 50);
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
  /* feedback schuift onderaan in beeld: groen bij juist (gaat vanzelf verder), oranje bij fout (het kind leest op eigen tempo en tikt Verder) */
  let sheetTimer = null, sheetAt = 0;
  function showSheet(kind, title, bodyHTML, pts, auto) {
    const sh = $("sheet"); sh.className = "sheet " + kind + (auto ? " auto" : ""); $("sheet-title").textContent = title; $("sheet-body").innerHTML = bodyHTML || "";
    const sp = $("sheet-pts"); sp.classList.toggle("hidden", !pts); if (pts) sp.innerHTML = `<span class="coin"></span>+${pts}`;
    sheetAt = Date.now(); clearTimeout(sheetTimer); const s0 = sess;
    try { sh.scrollIntoView({ block: "nearest", behavior: "smooth" }); } catch (e) { }
    if (auto) sheetTimer = setTimeout(() => { if (sess === s0) advance(); }, auto);
    else setTimeout(() => { if (sess === s0 && !sh.classList.contains("hidden")) $("btn-sheet").focus({ preventScroll: true }); }, 60);
  }
  function hideSheet() { clearTimeout(sheetTimer); $("sheet").classList.add("hidden"); }
  function advance() { if (!sess) return; hideSheet(); if (sess.next()) showQ(); else finish(); }
  $("btn-sheet").addEventListener("click", () => { if (sess && sess.locked && Date.now() - sheetAt > 250) advance(); });

  function check(given) {
    const q = sess.current(); if (!q || sess.locked) return null;
    if (given === undefined) { const a = $("answer"); if (!a) return null; given = a.value.trim(); if (!given) return null; if (q.stripPron) given = given.replace(/^(je|j'|tu|il|elle|on|nous|vous|ils|elles)\s*'?\s*/i, ""); }
    const res = sess.answer(given); const fb = $("feedback");
    if (res.status === "ok") {
      fb.textContent = ""; fb.className = "feedback"; $("hint").classList.add("hidden"); renderPlayGrow(OK.child(), true);
      let body = res.r.exact ? "" : `<p>${esc(res.r.note)}</p>`;
      if (q.explain && (sess.tries > 0 || q.kind === "number" && /:/.test(q.prompt.main || ""))) body += `<div class="sheet-explain">${q.explain}</div>`;
      const pts = (res.pts || 0) + (res.goalBonus || 0);
      $("coin-count").textContent = OK.child().points;
      const a = $("answer"); if (a) a.disabled = true;
      /* juist: vanzelf verder, zonder klik. Met uitleg of opmerking iets langer in beeld; enkel bij een fout blijft "Verder" staan */
      showSheet(res.r.exact ? "ok" : "ok note", res.r.exact ? OK.pick(OK.t("praise")) : "Juist, maar let op", body, pts, body ? 2000 : 900);
    } else if (res.status === "retry") {
      fb.className = "feedback bad"; fb.textContent = OK.t("retry");
      const a = $("answer"); if (a) { a.value = ""; a.focus(); }
      if (q.hint) { $("hint").innerHTML = q.hint; $("hint").classList.remove("hidden"); }
    } else {
      reveal(q, sess.mode === "test" ? "Niet juist" : "Bijna!");
    }
    return res;
  }
  function reveal(q, title) {
    const fb = $("feedback"); fb.textContent = ""; fb.className = "feedback"; $("hint").classList.add("hidden");
    const a = $("answer"); if (a) a.disabled = true;
    if (q.kind === "map") { const t = $("input-area").querySelector(`[data-layer="${q.target.layer}"][data-id="${q.target.id}"]`); if (t) t.classList.add("right"); }
    if (q.kind === "words") String(q.answer).split(",").forEach(i => { const el = $("input-area").querySelector(`.word[data-i="${i}"]`); if (el) el.classList.add("right"); });
    showSheet("bad", title, `<p class="sheet-label">${OK.t("it_is")}</p><p class="sheet-answer">${esc(OK.display(q))}</p>` + (q.explain ? `<div class="sheet-explain">${q.explain}</div>` : ""), 0, 0);
  }
  $("btn-skip").addEventListener("click", () => { if (!sess || sess.locked) return; const q = sess.current(); sess.skip(); reveal(q, "Zo zit het"); });
  $("btn-quit").addEventListener("click", () => { if (sess && sess.results.length) finish(); else { hideSheet(); sess = null; renderHome(); } });

  function finish() {
    hideSheet();
    const c = OK.child(); const r = sess.finish(); const mode = sess.mode; sess = null; const p = r.progress;
    $("result-title").textContent = mode === "test" ? `Toets: ${r.ok} op ${r.n} (${r.pct}%)` : r.taskDone ? (p ? "Je kent ze allemaal!" : "Opdracht klaar!") : "Klaar!";
    /* eerste tegel = deze beurt; de stand van de hele lijst komt apart eronder, anders lijken de getallen niet te kloppen (15 vragen, lijst van 19) */
    $("result-stats").innerHTML = `<div class="stat good"><b>${r.ok} van ${r.n}</b><span>meteen juist</span></div><div class="stat coin-stat"><b>+${r.total}</b><span>coins verdiend</span></div>`;
    const list = $("result-list"); list.innerHTML = "";
    if (p) {
      const left = p.total - p.known, notAsked = Math.max(0, left - r.wrong.length);
      const parts = []; if (r.wrong.length) parts.push(`${r.wrong.length} ${r.wrong.length === 1 ? "woord dat" : "woorden die"} niet meteen ${r.wrong.length === 1 ? "lukte" : "lukten"}`); if (notAsked) parts.push(`${notAsked} ${notAsked === 1 ? "woord dat" : "woorden die"} nog niet aan bod ${notAsked === 1 ? "kwam" : "kwamen"}`);
      list.appendChild(h("p", null, r.taskDone ? `De hele lijst van ${p.total} is gekend.` : `De lijst: ${p.known} van ${p.total} gekend. Nog ${left} te gaan${parts.length ? " (" + parts.join(" en ") + ")" : ""}. Die komen de volgende keer terug.`));
    }
    if (r.wrong.length) list.appendChild(h("p", "muted small", "Nog eens bekijken:"));
    r.wrong.forEach(x => { const d = h("div", "item"); const q = x.q; const left = h("span"); left.appendChild(h("span", null, (q.prompt.main || q.prompt.meta || "").replace(/<[^>]+>/g, ""))); left.appendChild(h("span", "muted small", x.ok ? "  (pas de tweede keer juist)" : x.given ? `  (jij zei ${x.given})` : "  (overgeslagen)")); d.appendChild(left); d.appendChild(h("strong", null, OK.display(q))); list.appendChild(d); });
    renderGoal($("result-goal"), c);
    if (mode !== "test") setTimeout(() => celebrateIfNeeded(c), 400);
    /* grote knop: de volgende opdracht als er nog een klaarstaat, anders terug naar het startscherm */
    const nxt = openTasks(c).find(t => t.id !== (lastOpts && lastOpts.taskId)); const nb = $("btn-result-next"); nb.textContent = nxt ? "Volgende: " + OK.taskTitle(nxt) : "Klaar"; nb.onclick = () => nxt ? startTask(nxt) : renderHome();
    $("btn-again").textContent = p && !r.taskDone ? `Nog een beurt (nog ${p.total - p.known} te gaan)` : "Nog een beurt";
    OK.show("s-result");
    if (r.taskDone || (mode !== "test" && r.n >= 5 && r.pct === 100)) confetti();
  }
  $("btn-again").addEventListener("click", () => { if (lastOpts) { const o = Object.assign({}, lastOpts); if (o.taskId) { const t = S().tasks.find(x => x.id === o.taskId); if (!t || t.status !== "open") delete o.taskId; } startSession(o); } });

  $("btn-overlay-ok").addEventListener("click", () => { $("overlay").classList.add("hidden"); if (OK.child() && !$("s-home").classList.contains("hidden")) renderGarden(OK.child()); });
  function confetti() { const c = $("confetti"); c.innerHTML = ""; const cols = ["#ffb830", "#2f5be0", "#1a7d52", "#b35c00", "#6a43c4", "#f3b61f"]; for (let i = 0; i < 60; i++) { const s = document.createElement("i"); s.style.left = Math.random() * 100 + "%"; s.style.background = cols[i % 6]; s.style.animationDelay = Math.random() * .8 + "s"; s.style.animationDuration = 1.8 + Math.random() * 1.4 + "s"; c.appendChild(s); } setTimeout(() => { c.innerHTML = ""; }, 3500); }

  /* ---------- winkel ---------- */
  function rewardsFor(c) { return S().rewards.filter(r => OK.forChild(r, c.id)); }
  function rewardCard(r) {
    const c = OK.child(); const d = h("div", "reward"); const can = c.points >= r.cost;
    const top = h("div", "reward-top"); top.appendChild(h("h3", null, r.name)); const pr = h("div", "price"); pr.innerHTML = `<span class="coin"></span>${r.cost}`; top.appendChild(pr); d.appendChild(top);
    if (can) {
      d.classList.add("can"); const b = h("button", "btn", "Aanvragen"); b.type = "button";
      b.addEventListener("click", () => { if (c.points < r.cost) return; OK.addPoints(c.id, -r.cost, "winkel: " + r.name); S().requests.unshift({ id: OK.uid(), child: c.id, reward: r.name, cost: r.cost, d: OK.nowISO(), status: "open" }); OK.save(); renderShop(); }); d.appendChild(b);
    } else {
      const bar = h("div", "bar coinbar"); const i = h("i"); i.style.width = Math.min(100, c.points / r.cost * 100) + "%"; bar.appendChild(i); d.appendChild(bar);
      d.appendChild(h("span", "muted small", `Nog ${r.cost - c.points} coins`));
    }
    return d;
  }
  function renderShop() {
    const c = OK.child();
    const sh = $("shop"); sh.innerHTML = ""; rewardsFor(c).slice().sort((a, b) => a.cost - b.cost).forEach(r => sh.appendChild(rewardCard(r)));
    if (!sh.children.length) sh.innerHTML = `<p class="muted small">Nog geen beloningen. Papa of mama vult de winkel in het ouderpaneel.</p>`;
    const my = $("my-requests"); my.innerHTML = ""; const mine = S().requests.filter(q => q.child === c.id);
    if (!mine.length) my.innerHTML = `<p class="muted small">Nog niets aangevraagd.</p>`;
    mine.forEach(q => { const d = h("div", "item"); d.appendChild(h("span", null, q.reward)); d.appendChild(h("span", "tag " + (q.status === "ok" ? "good" : q.status === "no" ? "bad" : "warn"), q.status === "ok" ? "gekregen" : q.status === "no" ? "geweigerd, coins terug" : "wacht op papa of mama")); my.appendChild(d); });
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
    ["land-parent", "land-child"].forEach(id => $(id).classList.toggle("hidden", id !== part));
    $("btn-land-scan").classList.toggle("hidden", !("BarcodeDetector" in window && navigator.mediaDevices));
    OK.show("s-landing");
  }
  $("btn-land-parent").addEventListener("click", () => { renderLanding("land-parent"); $("land-email").focus(); $("land-parent-msg").innerHTML = OK.backend.mode === "supabase" ? "" : `<span class="muted">Testmodus: er wordt geen mail verstuurd, alles blijft in deze browser.</span>`; });
  $("btn-land-child").addEventListener("click", () => { renderLanding("land-child"); $("land-code").focus(); });
  $("btn-land-login").addEventListener("click", async () => {
    const email = $("land-email").value.trim().toLowerCase(); if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { $("land-parent-msg").textContent = "Dat lijkt geen e-mailadres."; return; }
    const r = await OK.backend.signInParent(email); if (r.error) { $("land-parent-msg").textContent = r.error; return; }
    $("land-parent-msg").textContent = r.note || "";
    if (!r.pending) afterParentLogin(email);   // bij een echte inloglink wachten we tot de link geklikt is (OK.onParentAuthed)
  });
  /* na het inloggen meteen aan de slag: wie nog geen kinderen heeft, begint met de stappen; de rest ziet het overzicht.
     De vraag "gezinstoestel of niet" komt pas wanneer de ouder het toestel aan een kind geeft. */
  function afterParentLogin(email) { OK.setSession({ type: "parent", email, since: OK.nowISO() }); if (S().children.length) OK.openParent(); else OK.openWizard(); }
  OK.onParentAuthed = email => { if (OK.session() && OK.session().type !== "child") return; afterParentLogin(email); };
  OK.onRemoteChange = () => { if (OK.paintKidSwitch) OK.paintKidSwitch(); const cur = ["s-home", "s-who", "s-parent"].find(id => !$(id).classList.contains("hidden")); if (cur === "s-home" && OK.child()) renderHome(); else if (cur === "s-who") renderWho(); };
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
    if (s2.type === "parent") { if (S().children.length) OK.openParent(); else OK.openWizard(); return; }
    if (OK.child()) renderHome(); else renderWho();
  }
  window.addEventListener("hashchange", () => { const m = location.hash.match(/^#k-([A-Z0-9-]+)$/i); if (m && !OK.isChildSession()) { renderLanding("land-child"); $("land-code").value = m[1].toUpperCase(); childLoginWith(m[1]); history.replaceState(null, "", location.pathname + location.search); } });
  OK.applyI18n();
  OK.geoReady.then(boot);
})(window.OK);
