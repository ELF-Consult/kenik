/* Kenik - parent.js
   Het ouderpaneel: kinderen en hun modules, opdrachten, aanvragen, lijsten (plakken of foto), werkwoorden,
   beloningen, resultaten en instellingen. */
(function (OK) {
  "use strict";
  const $ = id => document.getElementById(id);
  const S = () => OK.state();
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const GRADES = { get list() { return OK.GRADE_IDS.map(g => [g, OK.gradeName(g)]); }, map(fn) { return this.list.map(fn); }, slice(a, b) { return this.list.slice(a, b); } };
  const armed = (btn, fn) => btn.addEventListener("click", () => { if (btn.dataset.armed) { fn(); } else { btn.dataset.armed = "1"; btn.dataset.label = btn.textContent; btn.textContent = "Zeker? Klik nog eens."; btn.classList.add("armed"); setTimeout(() => { delete btn.dataset.armed; btn.textContent = btn.dataset.label; btn.classList.remove("armed"); }, 3500); } });

  /* Drie ingangen: Overzicht (kennen ze het?), Leerstof (wat ze moeten kennen) en Meer (al de rest). */
  const MAIN = { home: ["home"], stof: ["lists", "tasks", "verbs"], meer: ["kids", "rewards", "results", "family", "settings"] };
  const SUBLABEL = { lists: "Lijsten", tasks: "Opdrachten", verbs: "Werkwoorden", kids: "Kinderen", rewards: "Winkel", results: "Resultaten", family: "Gezin en toestellen", settings: "Instellingen" };
  function showTab(tab) {
    document.querySelectorAll(".ptab").forEach(x => x.classList.toggle("hidden", x.id !== "ptab-" + tab));
    document.querySelectorAll("#psub .tab").forEach(x => x.classList.toggle("active", x.dataset.tab === tab));
    TABS[tab]();
  }
  function showMain(main, tab) {
    document.querySelectorAll("#ptabs .tab").forEach(x => x.classList.toggle("active", x.dataset.main === main));
    const subs = MAIN[main] || [], ps = $("psub"); ps.innerHTML = ""; ps.classList.toggle("hidden", subs.length < 2);
    subs.forEach(t => { const b = el("button", "tab", SUBLABEL[t]); b.type = "button"; b.dataset.tab = t; b.addEventListener("click", () => showTab(t)); ps.appendChild(b); });
    showTab(tab || subs[0]);
  }
  OK.openParent = function (main, tab) { OK.show("s-parent"); showMain(main || "home", tab); paintKidSwitch(); };
  /* de knop naar de kindkant toont de kinderen zelf (max 3 avatars) */
  function paintKidSwitch() { const b = $("kidswitch-avs"); if (!b) return; b.innerHTML = S().children.slice(0, 3).map(c => OK.avatarHTML(c)).join(""); $("btn-parent-exit").classList.toggle("hidden", !S().children.length); }
  /* Beheer: knop in de kop, enkel voor beheerders */
  let adminKnown = null;
  OK.refreshAdminButton = async function () {
    const ses = OK.session(); const b = $("btn-admin");
    if (!ses || ses.type === "child" || !OK.backend.isAdmin) { b.classList.add("hidden"); return; }
    if (adminKnown === null) adminKnown = await OK.backend.isAdmin();
    b.classList.toggle("hidden", !adminKnown);
  };
  $("btn-admin").addEventListener("click", () => { OK.show("s-parent"); document.querySelectorAll("#ptabs .tab").forEach(x => x.classList.remove("active")); $("psub").classList.add("hidden"); showTab("admin"); });
  document.querySelectorAll("#ptabs .tab").forEach(t => t.addEventListener("click", () => showMain(t.dataset.main)));
  const TABS = { home: renderOverview, kids: renderKids, tasks: renderTasks, lists: renderLists, verbs: renderVerbs, rewards: renderRewards, results: renderResults, family: renderFamily, settings: renderSettings, admin: () => OK.renderAdmin && OK.renderAdmin($("ptab-admin")) };

  /* ---------- overzicht: kennen ze het? ---------- */
  const tasksOf = (c, status) => S().tasks.filter(t => t.status === status && (t.child === c.id || t.child === "all" || t.doneBy === c.id) && OK.modules[t.module]);
  function renderOverview() {
    const root = $("ptab-home"); root.innerHTML = ""; const kids = S().children;
    if (!kids.length) {
      const w = el("div", "card stack", `<h2>Welkom bij Kenik</h2><p class="muted">Zet klaar wat je kind moet kennen. Kenik vraagt het af en jij ziet of het erin zit.</p>`);
      const b = el("button", "btn big", "Begin"); b.type = "button"; b.addEventListener("click", () => OK.openWizard()); w.appendChild(b); root.appendChild(w); return;
    }
    root.appendChild(el("div", "q-head", `<h2>Kennen ze het?</h2><span class="muted small">${new Date().toLocaleDateString("nl-BE", { weekday: "long", day: "numeric", month: "long" })}</span>`));
    const reqs = S().requests.filter(q => q.status === "open");
    if (reqs.length) {
      const box = el("div", "card stack"); box.appendChild(el("h3", null, "Aangevraagd in de winkel"));
      reqs.forEach(q => {
        const d = el("div", "item", `<span><strong>${esc(OK.childName(q.child))}</strong> wil: ${esc(q.reward)} <span class="muted small">(${q.cost} coins)</span></span>`); const r = el("div", "row");
        const ok = el("button", "btn mint", "Gegeven"); ok.type = "button"; ok.addEventListener("click", () => { q.status = "ok"; OK.save(); renderOverview(); });
        const no = el("button", "btn ghost", "Weigeren"); no.type = "button"; no.title = "De coins gaan terug"; no.addEventListener("click", () => { q.status = "no"; OK.addPoints(q.child, q.cost, "terug: " + q.reward); renderOverview(); });
        r.append(ok, no); d.appendChild(r); box.appendChild(d);
      });
      root.appendChild(box);
    }
    kids.forEach(c => root.appendChild(kidStatus(c)));
    const add = el("button", "btn big", `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8 h3.5 l1.5 -2.5 h6 l1.5 2.5 h3.5 a1 1 0 0 1 1 1 v9.5 a1 1 0 0 1 -1 1 h-16 a1 1 0 0 1 -1 -1 v-9.5 a1 1 0 0 1 1 -1z"/><circle cx="12" cy="13.5" r="3.6"/></svg> Iets klaarzetten`); add.type = "button"; add.classList.add("wide");
    add.addEventListener("click", () => OK.openWizard(null, { task: true })); root.appendChild(add);
  }
  function kidStatus(c) {
    const card = el("div", "card stack kidstatus");
    const open = tasksOf(c, "open").sort((a, b) => (a.due || "9").localeCompare(b.due || "9"));
    const since = Date.now() - 7 * 864e5;
    const done = tasksOf(c, "done").filter(t => t.doneAt && new Date(t.doneAt) > since && (!t.doneBy || t.doneBy === c.id)).sort((a, b) => b.doneAt.localeCompare(a.doneAt)).slice(0, 2);
    let chip = "";
    if (open.length) { const p = OK.taskProgress(open[0], c.id); chip = p ? (p.known >= p.total ? `<span class="tag good">Kent het</span>` : `<span class="tag warn">Nog ${p.total - p.known} te gaan</span>`) : `<span class="tag warn">Nog te doen</span>`; }
    else if (done.length) chip = `<span class="tag good">${OK.taskLists(done[0]) ? "Kent het" : "Afgewerkt"}</span>`;
    card.appendChild(el("div", "kidhead", `${OK.avatarHTML(c, 40)}<span class="kidname"><strong>${esc(c.name)}</strong><span class="muted small">${esc(OK.gradeName(c.grade))}</span></span>${chip}`));
    open.forEach(t => {
      const p = OK.taskProgress(t, c.id); const row = el("div", "stack taskrow");
      row.appendChild(el("div", "q-head", `<strong>${esc(OK.taskTitle(t))}</strong><span class="muted small">${esc((OK.dueText(t) || "geen datum").toLowerCase())}</span>`));
      if (p) {
        row.appendChild(el("div", "bar thin", `<i style="width:${p.total ? p.known / p.total * 100 : 0}%"></i>`));
        const det = el("details", "unknown", `<summary><span>${p.known} van ${p.total} gekend</span>${p.unknown.length ? `<span class="linklike">Welke nog niet?</span>` : ""}</summary>`);
        if (p.unknown.length) det.appendChild(el("div", "list", p.unknown.map(([q, a]) => `<div class="item slim"><span>${esc(q)}</span>${q === a ? "" : `<strong>${esc(a)}</strong>`}</div>`).join("")));
        row.appendChild(det);
      } else row.appendChild(el("span", "muted small", (t.mode === "test" ? "toets" : t.count + " vragen") + ", nog niet afgewerkt"));
      card.appendChild(row);
    });
    done.forEach(t => card.appendChild(el("div", "q-head taskrow", `<span>${esc(OK.taskTitle(t))}</span><span class="muted small">${OK.taskLists(t) ? "" : esc(t.score || "") + " · "}${OK.fmtDate(t.doneAt)} afgewerkt</span>`)));
    const b = el("button", open.length || done.length ? "linklike" : "btn ghost", open.length || done.length ? `Nog iets klaarzetten voor ${esc(c.name)}` : "Een opdracht klaarzetten"); b.type = "button"; b.addEventListener("click", () => OK.openWizard(c.id, { task: true }));
    /* geen opdracht: het kind kan wel al vrij oefenen met alles van zijn leerjaar; een opdracht is er om te zien of het erin zit */
    if (!open.length && !done.length) card.appendChild(el("span", "muted small", `Nog geen opdracht. ${esc(c.name)} kan intussen vrij oefenen met alles voor ${esc(OK.gradeName(c.grade))}. Zet een opdracht klaar als je wil zien of iets gekend is.`));
    card.appendChild(b);
    return card;
  }

  /* ---------- kinderen ---------- */
  let editing = null, deviceFor = null;
  /* code + QR om een kind op een ander toestel aan te melden, en de lijst van toestellen */
  function devicePanel(c) {
    const wrap = el("div", "stack"); wrap.style.padding = "0 0 8px 0";
    const info = el("p", "muted small", `Open de app op het andere toestel, kies "Ik ben een kind" en scan de QR of typ de code. De code is 15 minuten geldig en werkt één keer; het toestel blijft daarna aangemeld tot jij het hier afmeldt.`);
    wrap.appendChild(info);
    const qr = el("div", "qrbox"); wrap.appendChild(qr);
    const gen = el("button", "btn", "Nieuwe code maken"); gen.type = "button";
    const makeCode = async () => { const r = await OK.backend.createChildCode(c.id); qr.innerHTML = ""; const holder = el("div"); qr.appendChild(holder);
      const url = location.href.split("#")[0] + "#k-" + r.code;
      try { new window.QRCode(holder, { text: url, width: 160, height: 160, correctLevel: window.QRCode.CorrectLevel.M }); } catch (e) { holder.textContent = ""; }
      qr.appendChild(el("div", null, `<div class="code">${r.code}</div><div class="small" style="color:#555">geldig tot ${new Date(r.expires).toLocaleTimeString("nl-BE", { hour: "2-digit", minute: "2-digit" })}</div>`)); };
    gen.addEventListener("click", makeCode); wrap.appendChild(el("div", "row")).appendChild(gen); makeCode();
    const devs = el("div", "stack"); wrap.appendChild(devs);
    OK.backend.listDevices(c.id).then(list => { devs.innerHTML = ""; devs.appendChild(el("p", "muted small", list.length ? "Aangemeld op:" : "Nog op geen enkel ander toestel aangemeld.")); list.forEach(d => { const it = el("div", "item", `<span>${esc(d.label)} <span class="muted small">· sinds ${OK.fmtDate(d.created)}, laatst ${OK.fmtDate(d.lastSeen || d.created)}</span></span>`); const x = el("button", "btn ghost", "Afmelden"); x.type = "button"; x.addEventListener("click", async () => { await OK.backend.revokeDevice(d.id); renderKids(); }); it.appendChild(x); devs.appendChild(it); }); });
    return wrap;
  }
  /* ---------- gezin: andere ouders en dit toestel ---------- */
  function renderFamily() {
    const box = $("ptab-family"); box.innerHTML = "";
    const ses = OK.session() || {};
    box.appendChild(el("h3", null, "Dit toestel"));
    box.appendChild(el("p", "muted small", ses.type === "family" ? `Gezinstoestel${ses.email ? ", aangemeld door " + esc(ses.email) : ""}: de kinderen kiezen hun naam op het startscherm, het ouderpaneel zit achter de oudercode.` : ses.type === "parent" ? `Jouw eigen toestel (${esc(ses.email || "")}): je komt meteen in het ouderpaneel.` : "Niet aangemeld."));
    const r1 = el("div", "row");
    if (ses.type === "family") { const b = el("button", "btn ghost", "Maak er mijn eigen toestel van"); b.type = "button"; b.addEventListener("click", () => { OK.setSession(Object.assign({}, ses, { type: "parent" })); renderFamily(); }); r1.appendChild(b); }
    if (ses.type === "parent") { const b = el("button", "btn ghost", "Maak er een gezinstoestel van"); b.type = "button"; b.addEventListener("click", () => { OK.setSession(Object.assign({}, ses, { type: "family" })); renderFamily(); }); r1.appendChild(b); }
    const out = el("button", "btn ghost", "Afmelden op dit toestel"); out.type = "button"; out.addEventListener("click", async () => { await OK.backend.signOut(); OK.setSession(null); OK.state().current = null; OK.save(); OK.renderLanding(); }); r1.appendChild(out);
    box.appendChild(r1);
    box.appendChild(el("h3", null, "Ouders in dit gezin"));
    box.appendChild(el("p", "muted small", "Elke ouder logt in met een eigen e-mailadres en ziet hetzelfde gezin: dezelfde kinderen, lijsten, opdrachten en resultaten. Nodig de andere ouder uit per e-mail."));
    const ml = el("div", "list"); box.appendChild(ml);
    OK.backend.members().then(({ members, invites }) => {
      ml.innerHTML = "";
      members.forEach(m => { const it = el("div", "item", `<span><strong>${esc(m.email)}</strong> <span class="tag">${m.role === "owner" ? "eerste ouder" : "ouder"}</span>${ses.email === m.email ? ' <span class="muted small">(jij)</span>' : ""}</span>`); if (m.role !== "owner" && ses.email !== m.email) { const x = el("button", "x", "✕"); x.type = "button"; x.title = "Verwijderen uit het gezin"; x.addEventListener("click", async () => { await OK.backend.removeMember(m.email); renderFamily(); }); it.appendChild(x); } ml.appendChild(it); });
      invites.forEach(i => { const it = el("div", "item", `<span>${esc(i.email)} <span class="tag warn">uitgenodigd, nog niet ingelogd</span></span>`); const x = el("button", "x", "✕"); x.type = "button"; x.addEventListener("click", async () => { await OK.backend.removeMember(i.email); renderFamily(); }); it.appendChild(x); ml.appendChild(it); });
      if (!members.length && !invites.length) ml.appendChild(el("p", "muted small", "Nog geen ouders geregistreerd. Meld je aan via het startscherm met je e-mail; dan word jij de eerste ouder."));
    });
    const inv = el("div", "row", `<label class="f">E-mail van de andere ouder<input type="email" id="inv-email" placeholder="naam@voorbeeld.be" autocomplete="off"></label>`); const ib = el("button", "btn", "Uitnodigen"); ib.type = "button"; inv.appendChild(ib); box.appendChild(inv);
    const msg = el("p", "small"); box.appendChild(msg);
    ib.addEventListener("click", async () => { const e = $("inv-email").value.trim().toLowerCase(); if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) { msg.textContent = "Dat lijkt geen e-mailadres."; return; } const r = await OK.backend.inviteParent(e); msg.textContent = r.error || r.note || "Uitnodiging verstuurd."; if (!r.error) renderFamily(); });
    box.appendChild(el("h3", null, "Hoe kinderen aanmelden"));
    box.appendChild(el("div", "stack", `<p class="muted small">Op een gezinstoestel kiezen de kinderen gewoon hun naam. Op een ander toestel (laptop, tablet bij oma, klascomputer) opent het kind de app, kiest "Ik ben een kind" en scant de QR of typt de code die je bij het kind vindt onder Kinderen, knop "Ander toestel". Daar zie je ook op welke toestellen elk kind aangemeld is en kan je er een afmelden.</p>`));
  }
  function renderKids() {
    const box = $("ptab-kids"); box.innerHTML = "";
    if (editing) { const c = OK.childById(editing); if (c) { box.appendChild(childEditor(c)); return; } editing = null; }
    box.appendChild(el("h3", null, "Kinderen"));
    const list = el("div", "kidcards");
    const COLORS = ["#5b8cff", "#3ddc97", "#ff8a1f", "#c06bff", "#ff5d7a", "#2fc4d8"];
    S().children.forEach((c, i) => {
      const groups = {}; Object.keys(c.modules).filter(k => c.modules[k] && OK.modules[k]).forEach(k => { const g = OK.modules[k].group; groups[g] = (groups[g] || 0) + 1; });
      const d = el("div", "kidcard");
      d.innerHTML = `${OK.avatarHTML(c)}
        <div class="kidinfo"><strong>${esc(c.name)}</strong><span class="muted small">${OK.gradeName(c.grade)} · ${c.points} coins</span>
        <div class="row">${Object.entries(groups).map(([g, n]) => `<span class="tag">${esc(g)} <b>${n}</b></span>`).join("") || '<span class="tag bad">nog niets aan</span>'}</div></div>`;
      const btns = el("div", "row");
      const q = el("button", "btn ghost", "Ander toestel"); q.type = "button"; q.title = "Code en QR om dit kind op een ander toestel aan te melden"; q.addEventListener("click", () => { deviceFor = deviceFor === c.id ? null : c.id; renderKids(); });
      const b = el("button", "btn ghost", "Instellen"); b.type = "button"; b.addEventListener("click", () => { editing = c.id; renderKids(); });
      btns.append(q, b); d.appendChild(btns); list.appendChild(d);
      if (deviceFor === c.id) list.appendChild(devicePanel(c));
    });
    if (!S().children.length) list.appendChild(el("p", "muted small", "Nog geen kinderen."));
    box.appendChild(list);
    // nieuw kind
    const add = el("div", "row", `<label class="f">Voornaam<input type="text" id="k-name"></label><label class="f" style="max-width:180px">Leerjaar<select id="k-grade">${GRADES.map(g => `<option value="${g[0]}" ${g[0] === 4 ? "selected" : ""}>${g[1]}</option>`).join("")}</select></label>`);
    const addBtn = el("button", "btn", "Kind toevoegen"); addBtn.type = "button"; add.appendChild(addBtn); box.appendChild(el("h3", null, "Nieuw kind")); box.appendChild(add);
    box.appendChild(el("p", "muted small", "De oefeningen voor dat leerjaar staan meteen klaar. Bijsturen kan via Instellen."));
    addBtn.addEventListener("click", () => { const n = $("k-name").value.trim(); if (!n) return; OK.addChild(n, +$("k-grade").value); renderKids(); });
  }
  function childEditor(c) {
    const wrap = el("div", "stack");
    const head = el("div", "q-head"); head.appendChild(el("h3", null, `Instellingen voor ${esc(c.name)}`)); const back = el("button", "btn ghost", "Terug naar overzicht"); back.type = "button"; back.addEventListener("click", () => { editing = null; renderKids(); }); head.appendChild(back); wrap.appendChild(head);
    const basics = el("div", "row", `<label class="f">Voornaam<input type="text" id="e-name" value="${esc(c.name)}"></label><label class="f" style="max-width:180px">Leerjaar<select id="e-grade">${GRADES.map(g => `<option value="${g[0]}" ${g[0] === c.grade ? "selected" : ""}>${g[1]}</option>`).join("")}</select></label>`);
    wrap.appendChild(basics);
    // icoontje: zo zie je in één oogopslag op wiens account je zit
    let avatar = c.avatar || "";
    const aw = el("div", "stack"); aw.appendChild(el("p", "muted small", "Icoontje (staat bovenaan naast de naam)"));
    const av = el("div", "avpick");
    const paint = () => { av.innerHTML = ""; const none = el("button", "avopt" + (!avatar ? " sel" : ""), `<div class="avatar" style="background:#5b8cff;width:36px;height:36px;font-size:16px">${esc(c.name[0] || "?").toUpperCase()}</div>`); none.type = "button"; none.title = "Beginletter"; none.addEventListener("click", () => { avatar = ""; paint(); }); av.appendChild(none); OK.AVATARS.forEach(e => { const b = el("button", "avopt" + (avatar === e ? " sel" : ""), e); b.type = "button"; b.addEventListener("click", () => { avatar = e; paint(); }); av.appendChild(b); }); };
    paint(); aw.appendChild(av); wrap.appendChild(aw);
    // modules
    wrap.appendChild(el("p", "muted small", "Wat oefent dit kind? Vink aan en stel in. De voorstellen volgen het leerjaar; pas gerust aan."));
    const groups = {}; Object.values(OK.modules).forEach(m => { (groups[m.group] = groups[m.group] || []).push(m); });
    const modRoot = el("div", "stack");
    Object.entries(groups).forEach(([g, mods]) => {
      const avail = mods.filter(m => OK.moduleAvailable(m)); if (!avail.length) return;
      const onCount = avail.filter(m => c.modules[m.id]).length;
      const det = el("details", "modgroup"); det.innerHTML = `<summary><strong>${esc(g)}</strong> <span class="muted small">${onCount} van ${avail.length} aan · ${avail.filter(m => c.modules[m.id]).map(m => esc(m.name)).join(", ") || "niets"}</span></summary>`;
      const inner = el("div", "stack"); det.appendChild(inner); modRoot.appendChild(det);
      avail.forEach(m => {
        const cfg = c.modules[m.id]; const on = !!cfg;
        const box = el("div", "modcfg" + (on ? "" : " off")); box.dataset.mod = m.id;
        const head = el("label", "modhead", `<input type="checkbox" class="switch" data-on="1" ${on ? "checked" : ""}><span class="modname">${m.name}</span><span class="muted small modsub">${on ? "aan" : "uit"}</span>`); box.appendChild(head);
        const fields = el("div", "stack" + (on ? "" : " hidden")); fields.dataset.fields = "1";
        const effective = cfg || (m.defaultsFor && m.defaultsFor(c.grade, OK.region())) || {};
        (m.schema || []).filter(f => f.parent !== false).forEach(f => fields.appendChild(OK.fieldEditor(f, effective[f.key], c, false)));
        const ex = el("div", "example"); fields.appendChild(ex);
        const refresh = () => { const cfg = {}; (m.schema || []).forEach(f => { const v = OK.readField(f, fields); if (v !== undefined) cfg[f.key] = v; }); if (m.normalize) m.normalize(cfg); const t = OK.exampleText(c, m.id, cfg); ex.innerHTML = t ? `<span class="muted small">Voorbeeld</span> <span>${esc(t)}</span> <button class="linklike small" type="button" data-again>nog een</button>` : ""; };
        fields.addEventListener("change", refresh); fields.addEventListener("click", e => { if (e.target.closest("[data-again]")) refresh(); }); refresh();
        box.appendChild(fields);
        head.querySelector("input").addEventListener("change", e => { fields.classList.toggle("hidden", !e.target.checked); box.classList.toggle("off", !e.target.checked); head.querySelector(".modsub").textContent = e.target.checked ? "aan" : "uit"; });
        inner.appendChild(box);
      });
    });
    wrap.appendChild(modRoot);
    const row = el("div", "row"); const save = el("button", "btn mint", "Opslaan"); save.type = "button"; const cancel = el("button", "btn ghost", "Sluiten zonder opslaan"); cancel.type = "button";
    const del = el("button", "btn danger", "Dit kind verwijderen"); del.type = "button"; const reset = el("button", "btn ghost", "Voorstellen voor dit leerjaar herstellen"); reset.type = "button";
    row.append(save, cancel, reset, del); wrap.appendChild(row);
    const msg = el("p", "muted small", ""); wrap.appendChild(msg);
    save.addEventListener("click", () => {
      c.name = $("e-name").value.trim() || c.name; c.grade = +$("e-grade").value; c.avatar = avatar || undefined;
      const mods = {};
      modRoot.querySelectorAll(".modcfg").forEach(box => { const m = OK.modules[box.dataset.mod]; if (!box.querySelector("[data-on]").checked) return; const cfg = {}; (m.schema || []).forEach(f => { const v = OK.readField(f, box); if (v !== undefined) cfg[f.key] = v; }); if (m.normalize) m.normalize(cfg); mods[m.id] = cfg; });
      c.modules = mods; OK.save(); msg.textContent = "Opgeslagen."; setTimeout(() => { editing = null; renderKids(); }, 400);
    });
    cancel.addEventListener("click", () => { editing = null; renderKids(); });
    reset.addEventListener("click", () => { c.modules = OK.defaultModulesFor(+$("e-grade").value); OK.save(); renderKids(); });
    armed(del, () => { S().children = S().children.filter(x => x !== c); if (S().current === c.id) S().current = null; editing = null; OK.save(); renderKids(); });
    return wrap;
  }

  /* ---------- opdrachten ---------- */
  function renderTasks() {
    const box = $("ptab-tasks"); box.innerHTML = "";
    box.appendChild(el("h3", null, "Nieuwe opdracht"));
    box.appendChild(el("p", "muted small", "Een opdracht verschijnt bovenaan op het startscherm van het kind. De instellingen liggen vast; afwerken levert de bonus op."));
    const kids = S().children;
    const row1 = el("div", "row", `<label class="f">Voor wie<select id="t-child"><option value="all">Iedereen</option>${kids.map(k => `<option value="${k.id}" ${k.id === S().current ? "selected" : ""}>${esc(k.name)}</option>`).join("")}</select></label><label class="f">Welke oefening (klap open voor alle vakken)<select id="t-module"></select></label>`);
    box.appendChild(row1);
    const fields = el("div", "stack"); box.appendChild(fields);
    const row2 = el("div", "row", `<label class="f" id="t-count-wrap" style="max-width:160px">Aantal vragen<select id="t-count"><option>10</option><option selected>15</option><option>20</option><option>30</option></select></label><label class="f" style="max-width:180px">Tegen wanneer<input type="date" id="t-due"></label><label class="f" style="max-width:140px">Bonus (coins)<input type="number" id="t-bonus" min="0" value="50"></label>`);
    const addBtn = el("button", "btn", "Opdracht geven"); addBtn.type = "button"; row2.appendChild(addBtn); box.appendChild(row2);
    const msg = el("p", "muted small"); box.appendChild(msg);
    const modSel = row1.querySelector("#t-module");
    function fillModules() {
      const cid = row1.querySelector("#t-child").value; const child = cid === "all" ? null : OK.childById(cid);
      const mods = Object.values(OK.modules).filter(m => !child || child.modules[m.id]);
      const groups = {}; mods.forEach(m => { (groups[m.group] = groups[m.group] || []).push(m); });
      modSel.innerHTML = Object.entries(groups).map(([g, ms]) => `<optgroup label="${esc(g)}">${ms.map(m => `<option value="${m.id}">${esc(m.name)}</option>`).join("")}</optgroup>`).join(""); fillFields();
    }
    function fillFields() {
      fields.innerHTML = ""; const m = OK.modules[modSel.value]; if (!m) return;
      const cid = row1.querySelector("#t-child").value; const child = cid === "all" ? (kids[0] || { id: "x", modules: {} }) : OK.childById(cid);
      const cfg = (child && child.modules[m.id]) || (m.defaultsFor && m.defaultsFor(child ? child.grade : 6)) || {};
      (m.schema || []).forEach(f => fields.appendChild(OK.fieldEditor(f, cfg[f.key], child, "task")));
    }
    row1.querySelector("#t-child").addEventListener("change", fillModules); modSel.addEventListener("change", fillFields); fillModules();
    addBtn.addEventListener("click", () => {
      const m = OK.modules[modSel.value]; if (!m) return; const cfg = {}; let emptyList = false; (m.schema || []).forEach(f => { const v = OK.readField(f, fields); if (v !== undefined) cfg[f.key] = v; if ((f.type === "lists" || f.type === "packs") && Array.isArray(v) && !v.length) emptyList = true; });
      if (emptyList) { OK.toast("Kies eerst welke lijst(en) de opdracht omvat.", true); return; }
      S().tasks.push({ id: OK.uid(), child: row1.querySelector("#t-child").value, module: m.id, config: cfg, mode: "practice", count: +row2.querySelector("#t-count").value, due: row2.querySelector("#t-due").value || null, bonus: +row2.querySelector("#t-bonus").value || 0, status: "open", created: OK.nowISO() });
      OK.save(); msg.textContent = "Opdracht staat klaar."; renderTasks();
    });
    box.appendChild(el("h3", null, "Open opdrachten"));
    const open = el("div", "list"); const openT = S().tasks.filter(t => t.status === "open");
    if (!openT.length) open.appendChild(el("p", "muted small", "Geen open opdrachten."));
    openT.forEach(t => { const m = OK.modules[t.module]; const d = el("div", "item", `<span><strong>${esc(OK.childName(t.child))}</strong>: ${m ? m.name : t.module}${t.mode === "test" ? " (toets)" : ""} <span class="muted">${m && m.describe ? m.describe(t.config || {}, { child: OK.childById(t.child) || kids[0] || { id: "x" } }) : ""}</span><br><span class="muted small">${t.due ? "tegen " + OK.fmtDate(t.due) : "geen deadline"}${t.bonus ? " · bonus " + t.bonus : ""}</span></span>`); const x = el("button", "x", "✕"); x.type = "button"; x.title = "Intrekken"; x.addEventListener("click", () => { S().tasks = S().tasks.filter(q => q !== t); OK.save(); renderTasks(); }); d.appendChild(x); open.appendChild(d); });
    box.appendChild(open);
    box.appendChild(el("h3", null, "Afgewerkt"));
    const done = el("div", "list"); const doneT = S().tasks.filter(t => t.status === "done").sort((a, b) => b.doneAt.localeCompare(a.doneAt)).slice(0, 20);
    if (!doneT.length) done.appendChild(el("p", "muted small", "Nog niets afgewerkt."));
    doneT.forEach(t => { const m = OK.modules[t.module]; done.appendChild(el("div", "item", `<span><strong>${esc(OK.childName(t.doneBy || t.child))}</strong>: ${m ? m.name : t.module}${t.mode === "test" ? " (toets)" : ""}</span><span class="tag good">${t.score} · ${OK.fmtDate(t.doneAt)}</span>`)); });
    box.appendChild(done);
  }

  /* ---------- aanvragen en geschiedenis ---------- */
  function renderRequests(box) {
    box.appendChild(el("h3", null, "Aanvragen van de kinderen"));
    box.appendChild(el("p", "muted small", "Een kind dat coins inwisselt, vraagt de beloning hier aan. Jij geeft ze echt en klikt op Gegeven, of weigert en de coins gaan terug."));
    const list = el("div", "list"); const open = S().requests.filter(q => q.status === "open");
    if (!open.length) list.appendChild(el("p", "muted small", "Geen openstaande aanvragen."));
    open.forEach(q => {
      const d = el("div", "item", `<span><strong>${esc(OK.childName(q.child))}</strong> wil: ${esc(q.reward)} <span class="muted">(${q.cost} coins, ${OK.fmtDate(q.d)})</span></span>`);
      const r = el("div", "row"); const ok = el("button", "btn mint", "Gegeven"); ok.type = "button"; ok.addEventListener("click", () => { q.status = "ok"; OK.save(); renderRewards(); });
      const no = el("button", "btn ghost", "Weigeren, coins terug"); no.type = "button"; no.addEventListener("click", () => { q.status = "no"; OK.addPoints(q.child, q.cost, "terug: " + q.reward); renderRewards(); });
      r.append(ok, no); d.appendChild(r); list.appendChild(d);
    });
    box.appendChild(list);
    const hist = el("details", null, `<summary class="muted small" style="cursor:pointer">Geschiedenis van coins</summary>`); box.appendChild(hist); box = hist;
    const days = {}; S().log.forEach(l => { if (l.what === "ex") { const k = l.d.slice(0, 10) + "|" + l.child; days[k] = days[k] || { d: l.d, child: l.child, n: 0, c: 0 }; days[k].n += l.n; days[k].c++; } });
    const rows = S().log.filter(l => l.what !== "ex").concat(Object.values(days).map(x => ({ d: x.d, child: x.child, what: `${x.c} oefeningen`, n: x.n }))).sort((a, b) => b.d.localeCompare(a.d)).slice(0, 50);
    const wrap = el("div", "table-wrap", `<table><thead><tr><th>Datum</th><th>Kind</th><th>Wat</th><th>Coins</th></tr></thead><tbody>${rows.map(l => `<tr><td>${OK.fmtDate(l.d)}</td><td>${esc(OK.childName(l.child))}</td><td>${esc(l.what.replace("dagdoel", "dagdoel gehaald").replace(/^toets$/, "toetsbonus").replace(/^opdracht$/, "opdracht afgewerkt"))}</td><td style="color:${l.n < 0 ? "var(--rose)" : "var(--mint)"}">${l.n > 0 ? "+" : ""}${l.n}</td></tr>`).join("")}</tbody></table>`);
    box.appendChild(wrap);
  }

  /* ---------- lijsten ---------- */
  /* Eén stroom: naam en vak, dan foto's (hoofdweg) of zelf typen (inklapbaar), dan nakijken in een tabel, dan opslaan. */
  let photoVerbs = [], photoCtl = null, draftItems = null;
  const sampleAvailable = () => OK.ai.available();

  function renderLists() {
    const root = $("ptab-lists"); root.innerHTML = ""; root.className = "stack ptab";
    const kids = S().children;
    const quick = el("div", "card stack", `<h3>Lijst uit het handboek</h3><p class="muted small">Foto van de bladzijde, nakijken, en zeggen tegen wanneer het gekend moet zijn. Meer is het niet.</p>`);
    const qb = el("button", "btn big", "Foto nemen van de bladzijde"); qb.type = "button"; qb.addEventListener("click", () => OK.openWizard()); quick.appendChild(qb); root.appendChild(quick);
    const box = el("details", "card"); box.innerHTML = `<summary class="muted small">Lijst maken met alle opties (meerdere foto's samenvoegen, alleen opslaan zonder opdracht)</summary>`; box.open = !!draftItems; root.appendChild(box);
    const form = el("div", "stack"); form.id = "photo-block"; form.style.marginTop = "14px";
    form.innerHTML = `
      <div class="row"><label class="f">Naam van de lijst<input type="text" id="wl-name" placeholder="bv. Unité 4: à l'école"></label>
        <label class="f" style="max-width:240px">Vak<select id="wl-subject">${OK.SUBJECTS.map(s => `<option>${s}</option>`).join("")}<option value="__pack">Spelling (woordpakket)</option></select></label>
        <label class="f" style="max-width:200px">Voor wie<select id="wl-children"><option value="all">Iedereen</option>${kids.map(k => `<option value="${k.id}">${esc(k.name)}</option>`).join("")}</select></label></div>
      <input type="checkbox" id="wl-pack" class="hidden">
      <p class="muted small hidden" id="wl-pack-hint">Een woordpakket is het rijtje woorden voor het dictee: alleen de woorden, geen vertaling. Kenik gebruikt het voor dictee, "kies de juiste schrijfwijze" en d/t.</p>
      <div class="photo-cta">
        <button class="btn big" id="btn-take-photo" type="button">📷 Foto maken of kiezen</button>
        <span class="muted small" id="photo-status">Neem een foto van de bladzijde met de woordjes, begrippen of vervoegingen. Meerdere bladzijden mag.</span>
        <input type="file" id="photo-input" accept="image/*" multiple class="hidden">
      </div>
      <div class="row thumbs" id="photo-thumbs"></div>
      <div class="row hidden" id="photo-actions"><button class="btn mint" id="btn-read-photos" type="button">Lees de foto's</button><button class="btn ghost" id="btn-clear-photos" type="button">Foto's weg</button><button class="btn ghost hidden" id="btn-stop-photos" type="button">Stop</button></div>
      <p class="small" id="photo-msg"></p>
      <details id="manual-block"><summary class="muted small">Liever zelf typen of plakken?</summary>
        <p class="muted small">Eén paar per regel: vraag en antwoord gescheiden door een streepje, =, puntkomma of tab. Meerdere juiste antwoorden met een komma. Bij een woordpakket: één woord per regel.</p>
        <div class="row"><label class="f" style="max-width:260px">Volgorde in de tekst<select id="wl-order"><option value="q-a">vraag - antwoord</option><option value="a-q">antwoord - vraag</option></select></label></div>
        <textarea id="wl-text" placeholder="de hond - le chien&#10;het huis - la maison&#10;zoeken - chercher"></textarea>
        <div class="row"><button class="btn ghost" id="btn-parse-text" type="button">Zet klaar om na te kijken</button></div>
      </details>
      <div class="stack hidden" id="review"><h3>Nakijken</h3><p class="muted small">Verbeter wat fout gelezen is, schrap wat niet hoort. Dan opslaan.</p><div class="table-wrap"><table class="review"><thead><tr><th id="rv-h1">Vraag</th><th id="rv-h2">Antwoord</th><th></th></tr></thead><tbody id="rv-body"></tbody></table></div>
        <div class="row"><button class="pill-btn" id="btn-add-row" type="button">+ regel</button></div>
        <div class="stack hidden" id="photo-verbs"><p class="muted small">Gevonden vervoegingen:</p><div class="list" id="photo-verb-list"></div><div class="row"><button class="btn ghost" id="btn-add-photo-verbs" type="button">Werkwoorden toevoegen aan de voorraad</button></div></div>
        <div class="row"><button class="btn mint big" id="btn-add-list" type="button">Lijst opslaan</button><button class="btn ghost" id="btn-drop-draft" type="button">Weg ermee</button></div><p class="small" id="wl-msg"></p></div>`;
    box.appendChild(form);
    /* bestaande lijsten: eigen kaart, één regel per lijst met naam, kenmerken en rechts voor wie + verwijderen */
    const card2 = el("div", "card stack"); root.appendChild(card2);
    card2.appendChild(el("div", "q-head", `<h3>Bestaande lijsten</h3><span class="muted small">${S().lists.length} ${S().lists.length === 1 ? "lijst" : "lijsten"}</span>`));
    const list = el("div", "list");
    S().lists.slice().reverse().forEach(l => {
      const d = el("div", "lrow");
      d.innerHTML = `<div class="lrow-main"><strong>${esc(l.name)}</strong><span class="muted small">${l.pack ? `<span class="tag">woordpakket</span>` : `<span class="tag">${esc(l.subject || "")}</span>`} ${l.items.length} ${l.pack ? "woorden" : "paren"}${l.example ? ` <span class="tag">voorbeeld</span>` : ""}</span></div>`;
      const main = d.querySelector(".lrow-main"); main.classList.add("clickable"); main.title = "Bekijken en aanpassen"; main.addEventListener("click", () => OK.openListEdit(l.id));
      const r = el("div", "lrow-actions");
      const who = el("select"); who.title = "Voor wie"; who.innerHTML = `<option value="all">Iedereen</option>${kids.map(k => `<option value="${k.id}" ${Array.isArray(l.children) && l.children[0] === k.id ? "selected" : ""}>${esc(k.name)}</option>`).join("")}`; who.addEventListener("change", () => { l.children = who.value === "all" ? "all" : [who.value]; OK.save(); });
      const x = el("button", "x", "✕"); x.type = "button"; x.title = "Lijst verwijderen"; x.addEventListener("click", () => { if (x.dataset.armed) { S().lists = S().lists.filter(q => q !== l); OK.save(); renderLists(); } else { x.dataset.armed = "1"; x.textContent = "Zeker?"; setTimeout(() => { delete x.dataset.armed; x.textContent = "✕"; }, 2500); } });
      r.append(who, x); d.appendChild(r); list.appendChild(d);
    });
    if (!S().lists.length) list.appendChild(el("p", "muted small", "Nog geen lijsten."));
    card2.appendChild(list);
    const card3 = el("div", "card stack"); root.appendChild(card3);
    renderTexts(card3);

    /* ---- handlers ---- */
    const foreignLabels = () => { const s = $("wl-subject").value === "__pack" ? "Nederlands" : $("wl-subject").value, foreign = OK.langFor(s) !== "nl"; $("wl-order").options[0].text = foreign ? `Nederlands - ${s}` : "vraag - antwoord"; $("wl-order").options[1].text = foreign ? `${s} - Nederlands` : "antwoord - vraag"; $("rv-h1").textContent = $("wl-pack").checked ? "Woord" : foreign ? "Nederlands" : "Vraag"; $("rv-h2").textContent = foreign ? s : "Antwoord"; $("rv-h2").parentElement.classList.toggle("pack", $("wl-pack").checked); };
    const syncPack = () => { const isPack = $("wl-subject").value === "__pack"; $("wl-pack").checked = isPack; $("wl-pack-hint").classList.toggle("hidden", !isPack); $("wl-order").parentElement.classList.toggle("hidden", isPack); $("wl-text").placeholder = isPack ? "schoolreis\nde vrachtwagen\nkasteel" : "de hond - le chien\nhet huis - la maison\nzoeken - chercher"; };
    $("wl-subject").addEventListener("change", () => { syncPack(); foreignLabels(); if (draftItems) showReview(); }); syncPack(); foreignLabels();

    let chosen = [];
    const showFiles = () => { const th = $("photo-thumbs"); th.innerHTML = ""; chosen.slice(0, 6).forEach(f => { const img = document.createElement("img"); img.src = URL.createObjectURL(f); img.onload = () => URL.revokeObjectURL(img.src); th.appendChild(img); }); $("photo-actions").classList.toggle("hidden", !chosen.length); if (chosen.length) $("photo-msg").textContent = `${chosen.length} foto${chosen.length > 1 ? "'s" : ""} klaar. Klik op "Lees de foto's".`; };
    $("btn-take-photo").addEventListener("click", () => $("photo-input").click());
    $("photo-input").addEventListener("change", () => { chosen = chosen.concat([...$("photo-input").files]).slice(0, 6); $("photo-input").value = ""; showFiles(); });
    $("btn-clear-photos").addEventListener("click", () => { chosen = []; showFiles(); $("photo-msg").textContent = ""; });
    form.getFiles = () => chosen; form.clearFiles = () => { chosen = []; showFiles(); };
    $("btn-stop-photos").addEventListener("click", () => { if (photoCtl) photoCtl.abort(); });
    $("btn-read-photos").addEventListener("click", readPhotos);
    sampleAvailable().then(fn => { const st = $("photo-status"); if (!st) return; if (!fn) { st.innerHTML = `<span class="tag bad">Niet beschikbaar</span> ${esc(OK.ai.reason)}`; $("btn-take-photo").disabled = true; $("manual-block").open = true; } });

    $("btn-parse-text").addEventListener("click", () => {
      const pack = $("wl-pack").checked;
      const items = pack ? $("wl-text").value.split(/\r?\n|,|;/).map(w => w.trim()).filter(Boolean).map(w => ({ q: w, a: w })) : OK.parseList($("wl-text").value, $("wl-order").value).map(p => ({ q: p[0], a: p[1] }));
      if (!items.length) { $("photo-msg").textContent = pack ? "Geen woorden herkend. Eén per regel." : "Geen paren herkend. Eén per regel, met een streepje ertussen."; return; }
      draftItems = items; photoVerbs = []; showReview(); $("photo-msg").textContent = "";
    });
    $("btn-add-row").addEventListener("click", () => { draftItems = draftItems || []; draftItems.push({ q: "", a: "" }); showReview(); const rows = $("rv-body").querySelectorAll("tr"); const inp = rows[rows.length - 1].querySelector("input"); if (inp) inp.focus(); });
    $("btn-drop-draft").addEventListener("click", () => { draftItems = null; photoVerbs = []; $("review").classList.add("hidden"); $("wl-msg").textContent = ""; });
    $("btn-add-list").addEventListener("click", () => {
      readReview(); const pack = $("wl-pack").checked, subject = pack ? "Nederlands" : $("wl-subject").value;
      const items = (draftItems || []).map(x => pack ? [x.q.trim().toLowerCase(), x.q.trim().toLowerCase()] : [x.q.trim(), x.a.trim()]).filter(p => p[0] && p[1]);
      const name = $("wl-name").value.trim();
      if (!name) { $("wl-msg").textContent = "Geef de lijst eerst een naam."; $("wl-name").focus(); return; }
      if (!items.length) { $("wl-msg").textContent = "Er staat niets om op te slaan."; return; }
      const who = $("wl-children").value;
      S().lists.push({ id: OK.uid(), name, subject, lang: OK.langFor(subject), children: who === "all" ? "all" : [who], items, pack, created: OK.nowISO() }); OK.save();
      let nv = 0; S().children.forEach(c => { nv += OK.syncVerbsFromLists(c) || 0; });
      draftItems = null; photoVerbs = []; renderLists(); OK.toast(`${items.length} ${pack ? "woorden" : "paren"} opgeslagen${nv ? `, ${nv} werkwoord${nv > 1 ? "en" : ""} toegevoegd aan de werkwoordenoefening` : ""}.`);
    });
    $("btn-add-photo-verbs").addEventListener("click", () => { let n = 0; photoVerbs.forEach(v => { if ((v.lang || "fr") !== "fr") return; const forms = Array.isArray(v.forms) && v.forms.length === 6 ? v.forms.map(String) : null; if (OK.addVerb(String(v.inf), String(v.nl || ""), forms)) n++; }); OK.toast(n ? `${n} werkwoord${n > 1 ? "en" : ""} toegevoegd.` : "Geen nieuwe werkwoorden."); $("photo-verbs").classList.add("hidden"); });
    if (draftItems) showReview();
  }
  /* de nakijktabel tekenen vanuit draftItems en terug inlezen */
  function showReview() {
    const pack = $("wl-pack").checked, tb = $("rv-body"); tb.innerHTML = "";
    (draftItems || []).forEach((it, i) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td><input type="text" data-q value="${esc(it.q)}"></td><td class="${pack ? "hidden" : ""}"><input type="text" data-a value="${esc(it.a)}"></td><td><button class="x" type="button" title="Schrappen">✕</button></td>`;
      tr.querySelector(".x").addEventListener("click", () => { readReview(); draftItems.splice(i, 1); showReview(); });
      tb.appendChild(tr);
    });
    $("rv-h2").classList.toggle("hidden", pack);
    const vb = $("photo-verbs"), vl = $("photo-verb-list"); vl.innerHTML = ""; vb.classList.toggle("hidden", !photoVerbs.length);
    photoVerbs.forEach(v => vl.appendChild(el("div", "item", `<span><strong>${esc(v.inf)}</strong> <span class="muted">${esc(v.nl || "")}</span><br><span class="muted small">${Array.isArray(v.forms) && v.forms.length === 6 ? esc(v.forms.join(", ")) : "wordt uit de ingebouwde catalogus gehaald"}</span></span>`)));
    $("review").classList.remove("hidden");
  }
  function readReview() { draftItems = [...$("rv-body").querySelectorAll("tr")].map(tr => ({ q: tr.querySelector("[data-q]").value, a: (tr.querySelector("[data-a]") || {}).value || tr.querySelector("[data-q]").value })); }

  async function readPhotos() {
    const fn = await sampleAvailable(); if (!fn) { $("photo-msg").textContent = OK.ai.reason; return; }
    const files = $("photo-block").getFiles().slice(0, fn.maxImages || 4); if (!files.length) return;
    const msg = $("photo-msg"), btn = $("btn-read-photos"); btn.disabled = true; $("btn-stop-photos").classList.remove("hidden"); msg.textContent = "De foto's worden gelezen. Dit duurt meestal 10 tot 40 seconden.";
    photoCtl = new AbortController();
    try {
      const wantPack = $("wl-pack").checked;
      const data = await fn.json(wantPack ? OK.packPrompt() : OK.photoPrompt($("wl-subject").value === "__pack" ? "Nederlands" : $("wl-subject").value), { images: files, signal: photoCtl.signal });
      let items; if (wantPack) { const words = Array.isArray(data.words) ? data.words.map(w => String(w).trim()).filter(Boolean) : []; items = words.map(w => ({ q: w, a: w })); photoVerbs = []; }
      else { items = Array.isArray(data.items) ? data.items.filter(w => w && w.q && w.a).map(w => ({ q: String(w.q), a: String(w.a) })) : []; photoVerbs = Array.isArray(data.verbs) ? data.verbs.filter(v => v && v.inf) : []; }
      if (!wantPack && items.length && items.every(w => w.q.trim().toLowerCase() === w.a.trim().toLowerCase())) { $("wl-subject").value = "__pack"; $("wl-subject").dispatchEvent(new Event("change")); }
      if (items.length) { if (!$("wl-name").value.trim() && data.title) $("wl-name").value = String(data.title); if (!wantPack && OK.SUBJECTS.includes(data.subject) && $("wl-subject").value !== "__pack") $("wl-subject").value = data.subject; $("wl-subject").dispatchEvent(new Event("change")); }
      draftItems = (draftItems || []).concat(items); showReview();
      if (items.length || photoVerbs.length) $("photo-block").clearFiles();
      msg.textContent = items.length || photoVerbs.length ? `${items.length} ${wantPack ? "woorden" : "paren"}${photoVerbs.length ? ` en ${photoVerbs.length} werkwoorden` : ""} gevonden${OK.ai.limit ? ` (${OK.ai.used} van ${OK.ai.limit} deze maand)` : ""}. Kijk na en klik op "Lijst opslaan".` : "Niets herkend. Probeer een scherpere foto, recht van boven, met goed licht.";
      $("review").scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (e) { msg.textContent = OK.ai.errorText(e, "Lezen mislukt."); }
    finally { btn.disabled = false; $("btn-stop-photos").classList.add("hidden"); photoCtl = null; }
  }

  let textDraft = null;
  function renderTexts(box) {
    const kids = S().children; S().texts = S().texts || [];
    box.appendChild(el("h3", null, "Leesteksten voor begrijpend lezen"));
    box.appendChild(el("p", "muted small", "Een korte tekst op maat van het leerjaar, met vier meerkeuzevragen. Jij leest na en slaat op; pas dan ziet het kind ze."));
    const form = el("div", "row", `<label class="f">Onderwerp<input type="text" id="tx-topic" placeholder="bv. vulkanen, de Romeinen, een verhaal over een verdwaalde hond"></label><label class="f" style="max-width:170px">Leerjaar<select id="tx-grade">${GRADES.slice(0, 8).map(g => `<option value="${g[0]}" ${g[0] === 4 ? "selected" : ""}>${g[1]}</option>`).join("")}</select></label><label class="f" style="max-width:200px">Soort<select id="tx-kind"><option value="info">informatieve tekst</option><option value="verhaal">verhaal</option></select></label>`);
    const gen = el("button", "btn", "Schrijf een tekst"); gen.type = "button"; form.appendChild(gen); box.appendChild(form);
    const msg = el("p", "small"); box.appendChild(msg);
    const preview = el("div", "stack hidden"); box.appendChild(preview);
    gen.addEventListener("click", async () => {
      const topic = $("tx-topic").value.trim(); if (!topic) { msg.textContent = "Geef een onderwerp."; return; }
      const fn = await sampleAvailable(); if (!fn) { msg.textContent = OK.ai.reason; return; }
      gen.disabled = true; msg.textContent = "De tekst wordt geschreven. Dit duurt meestal 15 tot 40 seconden.";
      const grade = +$("tx-grade").value, kind = $("tx-kind").value;
      try {
        const data = await fn.json(`Schrijf een ${kind === "verhaal" ? "kort verhaal" : "korte informatieve tekst"} in het Nederlands (Vlaanderen) voor een leerling uit het ${OK.gradeName(grade)} over: ${topic}.
Lengte: ${grade <= 2 ? "60 tot 90" : grade <= 4 ? "120 tot 160" : "180 tot 240"} woorden, korte zinnen, woordenschat passend bij die leeftijd, in alinea's gescheiden door een lege regel. Geen titel in de tekst zelf.
Maak daarna vier meerkeuzevragen over de tekst met telkens vier antwoordmogelijkheden waarvan precies één juist is. Minstens één vraag mag niet letterlijk in de tekst staan maar moet afgeleid worden. Geef bij elke vraag in één zin waarom het juiste antwoord juist is.
Antwoord met enkel JSON: {"title": "korte titel", "text": "de tekst met \\n\\n tussen alinea's", "questions": [{"q": "vraag", "choices": ["a","b","c","d"], "a": "het juiste antwoord, letterlijk gelijk aan een van de choices", "why": "uitleg"}]}`, { cache: false });
        if (!data || !data.text || !Array.isArray(data.questions)) throw { code: "invalid_json" };
        textDraft = { id: OK.uid(), title: String(data.title || topic), grade, text: String(data.text), questions: data.questions.filter(q => q && q.q && Array.isArray(q.choices) && q.choices.includes(q.a)).map(q => ({ q: String(q.q), choices: q.choices.map(String), a: String(q.a), why: String(q.why || "") })), children: "all" };
        if (!textDraft.questions.length) throw { code: "invalid_json" };
        preview.classList.remove("hidden"); preview.innerHTML = "";
        preview.appendChild(el("div", "leestekst", `<h3>${esc(textDraft.title)}</h3>${textDraft.text.split(/\n+/).map(p => `<p>${esc(p)}</p>`).join("")}`));
        preview.appendChild(el("div", "list", textDraft.questions.map(q => `<div class="item"><span><strong>${esc(q.q)}</strong><br><span class="muted small">${q.choices.map(c => c === q.a ? `<u>${esc(c)}</u>` : esc(c)).join(" · ")}</span></span></div>`).join("")));
        const r = el("div", "row", `<label class="f" style="max-width:200px">Voor wie<select id="tx-children"><option value="all">Iedereen</option>${kids.map(k => `<option value="${k.id}">${esc(k.name)}</option>`).join("")}</select></label>`);
        const save = el("button", "btn mint", "Tekst opslaan"); save.type = "button"; const drop = el("button", "btn ghost", "Weg ermee"); drop.type = "button"; r.append(save, drop); preview.appendChild(r);
        save.addEventListener("click", () => { const who = $("tx-children").value; textDraft.children = who === "all" ? "all" : [who]; S().texts.push(textDraft); OK.save(); textDraft = null; renderLists(); });
        drop.addEventListener("click", () => { textDraft = null; preview.classList.add("hidden"); preview.innerHTML = ""; });
        msg.textContent = "Lees na. Het onderstreepte antwoord is het juiste.";
      } catch (e) { msg.textContent = OK.ai.errorText(e, "Schrijven mislukt."); }
      finally { gen.disabled = false; }
    });
    const tl = el("div", "list");
    S().texts.forEach(tx => { const d = el("div", "lrow", `<div class="lrow-main"><strong>${esc(tx.title)}</strong><span class="muted small"><span class="tag">${OK.gradeName(tx.grade)}</span> ${tx.questions.length} vragen · ${esc(OK.childName(tx.children === "all" || !tx.children ? "all" : tx.children[0]))}</span></div>`); const x = el("button", "x", "✕"); x.type = "button"; x.addEventListener("click", () => { if (x.dataset.armed) { S().texts = S().texts.filter(q => q !== tx); OK.save(); renderLists(); } else { x.dataset.armed = "1"; x.textContent = "zeker?"; setTimeout(() => { delete x.dataset.armed; x.textContent = "✕"; }, 3000); } }); d.appendChild(x); tl.appendChild(d); });
    if (!S().texts.length) tl.appendChild(el("p", "muted small", "Nog geen teksten."));
    box.appendChild(tl);
  }

  /* ---------- werkwoorden: één tabblad, een blok per taal ---------- */
  function langCard(root, flagColor, lang, intro) { const card = el("div", "card stack"); card.innerHTML = `<div class="q-head"><h3><span class="langtag" style="background:${flagColor}">${lang}</span> Werkwoorden ${lang}</h3></div><p class="muted small">${intro}</p>`; root.appendChild(card); return card; }
  const anyChildHas = (...ids) => S().children.some(c => ids.some(id => c.modules[id]));
  function renderVerbs() {
    const root = $("ptab-verbs"); root.innerHTML = ""; root.className = "stack ptab"; const kids = S().children;
    const showFr = anyChildHas("frans-werkwoorden"), showEn = anyChildHas("engels-werkwoorden"), showNl = anyChildHas("grammatica", "spelling");
    if (!showFr && !showEn && !showNl) { root.appendChild(el("div", "card stack", `<p class="muted small">Geen enkel kind heeft nu een werkwoordenoefening aan (Franse of Engelse werkwoorden, Nederlandse grammatica of spelling). Zet die aan onder Kinderen, dan verschijnt de voorraad hier.</p>`)); return; }
    /* Frans */
    if (showFr) {
    const fr = langCard(root, "#3b6fd6", "Frans", "Vink per kind aan welke werkwoorden Kenik afvraagt. Bij een nieuw kind staan de gangbare uit het 5e en 6e al aan. Werkwoorden uit een gefotografeerde lijst komen er vanzelf bij. De tijden kies je onder Kinderen.");
    const F = OK.frans; const frKids = kids.filter(k => k.modules["frans-werkwoorden"]);
    if (!frKids.length) fr.appendChild(el("p", "muted small", "Geen enkel kind heeft Franse werkwoorden aan. Zet dat aan onder Kinderen."));
    else {
      const who = el("div", "row"); const sel = el("select"); frKids.forEach(k => sel.appendChild(el("option", null, esc(k.name))).value = k.id);
      sel.value = frKids.some(k => k.id === S().current) ? S().current : frKids[0].id;
      who.appendChild(el("label", "f", "Voor wie")).appendChild(sel); fr.appendChild(who);
      const holder = el("div", "stack"); fr.appendChild(holder); const saved = el("span", "muted small", ""); fr.appendChild(saved);
      const draw = () => {
        const k = kids.find(x => x.id === sel.value); const m = OK.modules["frans-werkwoorden"]; const cfg = k.modules["frans-werkwoorden"]; holder.innerHTML = "";
        const f = m.schema.find(x => x.key === "verbs"); const ed = OK.fieldEditor(f, cfg.verbs, k, false); holder.appendChild(ed);
        ed.addEventListener("change", () => { cfg.verbs = OK.readField(f, holder); m.normalize(cfg); OK.save(); saved.textContent = `Bewaard: ${OK.verbsFor(cfg).length} werkwoorden voor ${k.name}.`; });
      };
      sel.addEventListener("change", draw); draw();
    }
    const own = (S().verbs || []); if (own.length) {
      fr.appendChild(el("strong", "small", "Eigen werkwoorden en werkwoorden uit het handboek"));
      const ch = el("div", "chips"); own.forEach(v => { const t = el("span", "tag stock", `${esc(v.inf)} <span class="muted">${esc(v.nl || "")}</span>`); const x = el("button", "x", "✕"); x.type = "button"; x.title = "Verwijderen"; x.addEventListener("click", () => { OK.unstockVerb(v.inf); renderVerbs(); }); t.appendChild(x); ch.appendChild(t); }); fr.appendChild(ch);
    }
    fr.appendChild(el("div", "stack", `<strong class="small">Onregelmatig werkwoord dat Kenik niet kent (vul de zes vormen in)</strong><div class="row"><label class="f">Infinitief<input type="text" id="v-inf" placeholder="bv. donner"></label><label class="f">Nederlands (mag leeg)<input type="text" id="v-nl" placeholder="geven"></label><label class="f">Soort<select id="v-type"><option value="auto">regelmatig (automatisch vervoegen)</option><option value="irr">onregelmatig (zelf invullen)</option></select></label></div>
      <div class="row hidden" id="v-forms">${F.PRON.map((p, i) => `<label class="f">${p}<input type="text" id="vf${i}"></label>`).join("")}</div><div class="row"><button class="btn" id="btn-add-verb" type="button">Werkwoord opslaan</button><span class="muted small" id="v-msg"></span></div>`));
    $("v-type").addEventListener("change", () => $("v-forms").classList.toggle("hidden", $("v-type").value !== "irr"));
    $("btn-add-verb").addEventListener("click", () => {
      const inf = $("v-inf").value.trim().toLowerCase(), nl = $("v-nl").value.trim(); if (!inf) { $("v-msg").textContent = "Infinitief invullen."; return; }
      let forms = null; if ($("v-type").value === "irr") { forms = [0, 1, 2, 3, 4, 5].map(i => $("vf" + i).value.trim()); if (forms.some(f => !f)) { $("v-msg").textContent = "Vul alle zes vormen in."; return; } }
      const res = OK.addVerb(inf, nl, forms); if (!res) { $("v-msg").textContent = "Dat eindigt niet op -er, -ir of -re; vul de vormen zelf in."; return; }
      renderVerbs(); $("v-msg").textContent = `${inf}: ${res.join(", ")}`;
    });
    }
    /* Engels */
    if (showEn) {
    const en = langCard(root, "#c0392b", "Engels", "Zelfde idee: een kleine voorraad, aanvullen uit de lijst wanneer het past. Elk werkwoord heeft past simple en past participle.");
    const enStockBox = el("div", "chips"); OK.englishVerbs().forEach(v => { const t = el("span", "tag stock", `${esc(v[0])} <span class="muted">${esc(v[1])} · ${esc(v[2])}${v[3] ? " · " + esc(v[3]) : ""}</span>`); const x = el("button", "x", "✕"); x.type = "button"; x.addEventListener("click", () => { OK.unstockEnglish(v[0]); renderVerbs(); }); t.appendChild(x); enStockBox.appendChild(t); });
    if (!OK.englishVerbs().length) enStockBox.appendChild(el("span", "muted small", "Nog geen werkwoorden in de voorraad."));
    en.appendChild(el("strong", "small", "In de voorraad")); en.appendChild(enStockBox);
    const enCat = OK.englishCatalogue(); if (enCat.length) { en.appendChild(el("strong", "small", "Nog toe te voegen uit de lijst")); const c = el("div", "chips"); enCat.forEach(v => { const b = el("button", "tag add", `+ ${esc(v[0])} <span class="muted">${esc(v[1])} · ${esc(v[2])}</span>`); b.type = "button"; b.addEventListener("click", () => { OK.stockEnglish(v[0]); renderVerbs(); }); c.appendChild(b); }); en.appendChild(c); }
    en.appendChild(el("div", "stack", `<strong class="small">Onregelmatig werkwoord dat Kenik niet kent (vul de zes vormen in)</strong><div class="row"><label class="f">Infinitief<input type="text" id="ev-inf" placeholder="bv. forget"></label><label class="f">Past simple<input type="text" id="ev-past" placeholder="forgot (leeg = regelmatig)"></label><label class="f">Past participle<input type="text" id="ev-pp" placeholder="forgotten"></label><label class="f">Nederlands (mag leeg)<input type="text" id="ev-nl" placeholder="vergeten"></label></div><div class="row"><button class="btn" id="btn-add-ev" type="button">Werkwoord opslaan</button><span class="muted small" id="ev-msg"></span></div>`));
    $("btn-add-ev").addEventListener("click", () => { const inf = $("ev-inf").value.trim(), nl = $("ev-nl").value.trim(); let past = $("ev-past").value.trim(), pp = $("ev-pp").value.trim(); if (!inf) { $("ev-msg").textContent = "Infinitief invullen."; return; } if (!past) past = /e$/.test(inf) ? inf + "d" : /[^aeiou]y$/.test(inf) ? inf.slice(0, -1) + "ied" : inf + "ed"; if (!pp) pp = past; OK.addEnglishVerb(inf, past, pp, nl); renderVerbs(); $("ev-msg").textContent = `${inf} - ${past} - ${pp} toegevoegd.`; });
    }
    /* Nederlands */
    if (showNl) {
    const nl = langCard(root, "#e67e22", "Nederlands", "Ter info: deze ingebouwde werkwoorden gebruiken Grammatica (tijd herkennen, omzetten, infinitief) en Spelling (d/t, verleden tijd, voltooid deelwoord). Er valt hier niets te kiezen; alle vormen staan vast, zodat de oefeningen altijd kloppen.");
    const dv = OK.dutchVerbs ? OK.dutchVerbs() : [];
    nl.appendChild(el("div", "chips", dv.map(v => `<span class="tag">${esc(v[0])} <span class="muted">${esc(v[2])} · ${esc(v[4])}</span></span>`).join(" ")));
    }
  }

  /* ---------- beloningen ---------- */
  function renderRewards() {
    const root = $("ptab-rewards"); root.innerHTML = ""; root.className = "stack ptab"; const kids = S().children;
    const reqBox = el("div", "card stack"); root.appendChild(reqBox); renderRequests(reqBox);
    const box = el("div", "card stack"); root.appendChild(box);
    box.appendChild(el("h3", null, "De winkel"));
    box.appendChild(el("p", "muted small", "Jij bepaalt wat er te verdienen valt en wat het kost. Richtlijn: een sessie van 15 vragen levert zo'n 100 tot 150 coins op."));
    const add = el("div", "row", `<label class="f">Beloning<input type="text" id="r-name" placeholder="bv. Half uur langer opblijven"></label><label class="f" style="max-width:140px">Kost<input type="number" id="r-cost" min="1" value="150"></label><label class="f" style="max-width:180px">Voor wie<select id="r-children"><option value="all">Iedereen</option>${kids.map(k => `<option value="${k.id}">${esc(k.name)}</option>`).join("")}</select></label>`);
    const b = el("button", "btn", "Toevoegen"); b.type = "button"; add.appendChild(b); box.appendChild(add);
    b.addEventListener("click", () => { const n = $("r-name").value.trim(), c = parseInt($("r-cost").value, 10); if (!n || !(c > 0)) return; const w = $("r-children").value; S().rewards.push({ id: OK.uid(), name: n, cost: c, children: w === "all" ? "all" : [w] }); OK.save(); renderRewards(); });
    const list = el("div", "list");
    S().rewards.forEach(r => { const d = el("div", "item", `<span>${esc(r.name)} <span class="muted small">· ${esc(OK.childName(r.children === "all" || !r.children ? "all" : r.children[0]))}</span></span>`); const right = el("span", "row", `<span class="price"><span class="coin"></span>${r.cost}</span>`); const x = el("button", "x", "✕"); x.type = "button"; x.addEventListener("click", () => { S().rewards = S().rewards.filter(q => q !== r); OK.save(); renderRewards(); }); right.appendChild(x); d.appendChild(right); list.appendChild(d); });
    box.appendChild(list);
  }

  /* ---------- resultaten ---------- */
  function renderResults() {
    const box = $("ptab-results"); box.innerHTML = ""; const kids = S().children;
    if (!kids.length) { box.appendChild(el("p", "muted small", "Nog geen kinderen.")); return; }
    const sel = el("select"); sel.innerHTML = kids.map(k => `<option value="${k.id}" ${k.id === S().current ? "selected" : ""}>${esc(k.name)}</option>`).join(""); sel.style.maxWidth = "240px";
    const lab = el("label", "f", "Kind"); lab.appendChild(sel); box.appendChild(lab);
    const outRoot = el("div", "stack"); box.appendChild(outRoot);
    const cls = s => { if (!s || s.ok + s.wrong === 0) return ""; if (s.wrong === 0 && s.ok >= 2) return "g"; return s.wrong / (s.ok + s.wrong) >= .5 ? "b" : "w"; };
    function draw() {
      const cid = sel.value, st = OK.statsOf(cid), c = OK.childById(cid); let out = outRoot; out.innerHTML = "";
      const sessions = (S().sessions || []).filter(x => x.child === cid);
      if (sessions.length) {
        out.appendChild(el("h3", null, "Oefenbeurten"));
        const sl = el("div", "list");
        sessions.slice(0, 40).forEach(x => {
          const m = OK.modules[x.module]; const tagCls = x.pct >= 90 ? "good" : x.pct >= 60 ? "warn" : "bad";
          const d = el("details", "session"); d.innerHTML = `<summary><span class="row between"><span><strong>${m ? esc(m.name) : esc(x.module)}</strong> <span class="tag">${x.mode === "test" ? "toets" : "oefenen"}${x.task ? " · opdracht" : ""}</span><br><span class="muted small">${new Date(x.d).toLocaleString("nl-BE", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span></span><span class="row"><span class="tag ${tagCls}">${x.ok}/${x.n} · ${x.pct}%</span>${x.points ? `<span class="tag">+${x.points}</span>` : ""}</span></span></summary>
            <div class="table-wrap"><table><thead><tr><th>Vraag</th><th>Antwoord</th><th>Ingevuld</th><th></th></tr></thead><tbody>${x.items.map(it => `<tr><td>${esc(it.label)}</td><td>${esc(it.answer)}</td><td class="${it.ok ? "" : "muted"}">${esc(it.given || "-")}</td><td>${it.ok ? (it.tries ? '<span class="tag warn">2e poging</span>' : '<span class="tag good">juist</span>') : '<span class="tag bad">fout</span>'}</td></tr>`).join("")}</tbody></table></div>`;
          sl.appendChild(d);
        });
        out.appendChild(sl);
      }
      const keys = Object.keys(st); if (!keys.length) { out.appendChild(el("p", "muted small", "Nog geen oefeningen gedaan.")); return; }
      const total = keys.reduce((a, k) => a + st[k].ok + st[k].wrong, 0), wrong = keys.reduce((a, k) => a + st[k].wrong, 0);
      const agg = el("details"); agg.innerHTML = `<summary style="cursor:pointer"><strong>Per oefening, over alle beurten heen</strong> <span class="muted small">${total} antwoorden, ${wrong} fout. Groen is vlot, oranje gaat vooruit, rood moet nog geoefend worden.</span></summary>`;
      out.appendChild(agg); out = agg;
      // werkwoorden
      const vk = keys.filter(k => k.startsWith("v|"));
      if (vk.length) { const h = el("div", "stack", "<h3>Franse werkwoorden</h3>"); const grid = el("div", "heat"); grid.style.gridTemplateColumns = "auto repeat(6,1fr)"; grid.innerHTML = `<span></span>${OK.frans.PRON.map(p => `<span class="muted" style="text-align:center">${p}</span>`).join("")}`; [...new Set(vk.map(k => k.split("|")[1]))].sort().forEach(inf => { grid.insertAdjacentHTML("beforeend", `<span class="lbl">${inf}</span>`); for (let i = 0; i < 6; i++) { const s = st[`v|${inf}|${i}`]; grid.insertAdjacentHTML("beforeend", `<div class="c ${cls(s)}" title="${s ? s.ok + " juist, " + s.wrong + " fout" : ""}">${s ? (s.wrong ? s.wrong + "x" : "✓") : ""}</div>`); } }); h.appendChild(grid); out.appendChild(h); }
      // tafels
      const tk = keys.filter(k => k.startsWith("t|"));
      if (tk.length) { ["m", "d"].forEach(op => { const ks = tk.filter(k => k.split("|")[1] === op); if (!ks.length) return; const h = el("div", "stack", `<h3>${op === "m" ? "Tafels: maal" : "Tafels: delen"}</h3>`); const grid = el("div", "heat"); grid.style.gridTemplateColumns = "auto repeat(10,1fr)"; grid.innerHTML = `<span></span>${Array.from({ length: 10 }, (_, i) => `<span class="muted" style="text-align:center">${i + 1}</span>`).join("")}`; const tables = [...new Set(ks.map(k => +k.split("|")[3]))].sort((a, b) => a - b); tables.forEach(t => { grid.insertAdjacentHTML("beforeend", `<span class="lbl">${op === "m" ? "× " + t : ": " + t}</span>`); for (let k = 1; k <= 10; k++) { const s = st[op === "m" ? `t|m|${k}|${t}` : `t|d|${k * t}|${t}`]; grid.insertAdjacentHTML("beforeend", `<div class="c ${cls(s)}" title="${op === "m" ? k + " × " + t : (k * t) + " : " + t}${s ? ": " + s.ok + " juist, " + s.wrong + " fout" : ""}">${s ? (s.wrong ? s.wrong + "x" : "✓") : ""}</div>`); } }); h.appendChild(grid); out.appendChild(h); }); }
      // overige: tabel moeilijkste bovenaan
      const other = keys.filter(k => !k.startsWith("v|") && !k.startsWith("t|")).map(k => { const s = st[k]; return { k, s, label: labelFor(k, c), rate: s.wrong / (s.ok + s.wrong || 1) }; }).sort((a, b) => b.rate - a.rate || b.s.wrong - a.s.wrong).slice(0, 80);
      if (other.length) { const h = el("div", "stack", "<h3>Andere oefeningen</h3><p class='muted small'>Moeilijkste bovenaan. Tijd is de gemiddelde duur van een juist antwoord; boven de 7 seconden is het nog niet geautomatiseerd.</p>"); h.appendChild(el("div", "table-wrap", `<table><thead><tr><th>Oefening</th><th>Juist</th><th>Fout</th><th>Tijd</th><th></th></tr></thead><tbody>${other.map(r => `<tr><td>${esc(r.label)}</td><td>${r.s.ok}</td><td>${r.s.wrong}</td><td>${r.s.t ? (r.s.t / 1000).toFixed(1) + "s" : "-"}</td><td><span class="tag ${cls(r.s) === "g" ? "good" : cls(r.s) === "b" ? "bad" : "warn"}">${cls(r.s) === "g" ? "vlot" : cls(r.s) === "b" ? "nog oefenen" : "gaat vooruit"}</span></td></tr>`).join("")}</tbody></table>`)); out.appendChild(h); }
    }
    sel.addEventListener("change", draw); draw();
  }
  function labelFor(k, c) {
    const p = k.split("|");
    if (p[0] === "w") { const l = S().lists.find(x => x.id === p[1]); if (!l || !l.items[p[2]]) return "verwijderde lijst"; const [q, a] = l.items[p[2]]; return p[3] === "f" ? `${q} → ${a}` : `${a} → ${q}`; }
    if (p[0] === "g") { const d = OK.maps.be; const what = { pk: "aanduiden", pn: "benoemen", hp: "hoofdplaats", rk: "rivier aanduiden", rn: "rivier benoemen" }[p[1]]; return `Kaart: ${p[2]} (${what})`; }
    const names = { o: "Hoofdrekenen", c: "Cijferen", b: "Breuken", k: "Kommagetallen", p: "Procenten", u: "Metend rekenen", kl: "Kloklezen", mk: "Meetkunde", ord: "Ordenen", sp: "Spelling", gr: "Grammatica", lz: "Lezen", en: "Engels", v: "Frans" };
    return (names[p[0]] || p[0]) + " · " + p.slice(1).join(" ");
  }

  /* ---------- instellingen ---------- */
  function renderSettings() {
    const box = $("ptab-settings"); box.innerHTML = ""; const s = S().settings;
    box.appendChild(el("div", "row", `<label class="f">Coins per juist antwoord (eerste poging)<input type="number" id="set-p1" min="1" value="${s.p1}"></label><label class="f">Coins bij tweede poging<input type="number" id="set-p2" min="0" value="${s.p2}"></label><label class="f">Dagdoel (aantal oefeningen)<input type="number" id="set-goal" min="1" value="${s.goal}"></label><label class="f">Bonus bij dagdoel<input type="number" id="set-goalbonus" min="0" value="${s.goalBonus}"></label>`));
    box.appendChild(el("div", "row", `<label class="f" style="max-width:300px">Land en onderwijs<select id="set-region">${Object.entries(OK.REGIONS).map(([k, r]) => `<option value="${k}" ${k === (s.region || "be-nl") ? "selected" : ""}>${r.name}</option>`).join("")}</select></label><label class="f" style="max-width:220px">Taal van de schermen<select id="set-lang"><option value="nl" ${(s.lang || "nl") === "nl" ? "selected" : ""}>Nederlands</option><option value="fr" ${s.lang === "fr" ? "selected" : ""}>Français (gedeeltelijk)</option></select></label>`));
    box.appendChild(el("p", "muted small", "Het land bepaalt de namen van de leerjaren en welke oefeningen bestaan (de kaart van België, Frans of Engels als eerste vreemde taal). Verander je het land, klik dan bij elk kind op \"Voorstellen voor dit leerjaar herstellen\"."));
    box.appendChild(el("label", "check", `<input type="checkbox" id="set-accents" ${s.accents ? "checked" : ""}><span>Accenten moeten juist zijn (anders: goedgekeurd met een opmerking)</span>`));
    box.appendChild(el("label", "check", `<input type="checkbox" id="set-articles" ${s.articles ? "checked" : ""}><span>Lidwoorden moeten mee getypt worden (le chien, niet chien)</span>`));
    const row = el("div", "row", `<label class="f" style="max-width:220px">Nieuwe oudercode<input type="password" id="set-pin" inputmode="numeric" maxlength="6" placeholder="4 tot 6 cijfers"></label>`);
    const save = el("button", "btn ghost", "Instellingen opslaan"); save.type = "button"; const msg = el("span", "muted small"); row.append(save, msg); box.appendChild(row);
    save.addEventListener("click", () => { s.p1 = +$("set-p1").value || 10; s.p2 = +$("set-p2").value || 0; s.goal = +$("set-goal").value || 15; s.goalBonus = +$("set-goalbonus").value || 0; s.accents = $("set-accents").checked; s.articles = $("set-articles").checked; const regionChanged = s.region !== $("set-region").value || s.lang !== $("set-lang").value; s.region = $("set-region").value; s.lang = $("set-lang").value; if (regionChanged) { OK.save(); OK.applyI18n(); } const pin = $("set-pin").value.trim(); if (pin) { if (!/^\d{4,6}$/.test(pin)) { msg.textContent = "Code: 4 tot 6 cijfers."; return; } S().pin = pin; } OK.save(); msg.textContent = "Opgeslagen."; });
    box.appendChild(el("h3", null, "Coins bijsturen"));
    const kl = el("div", "list");
    S().children.forEach(c => { const d = el("div", "item", `<span><strong>${esc(c.name)}</strong> <span class="muted">${c.points} coins</span></span>`); const r = el("div", "row"); const inp = el("input"); inp.type = "number"; inp.placeholder = "± coins"; inp.style.width = "110px"; const b = el("button", "btn ghost", "Aanpassen"); b.type = "button"; b.addEventListener("click", () => { const n = parseInt(inp.value, 10); if (!n) return; OK.addPoints(c.id, n, "aanpassing door ouder"); renderSettings(); }); r.append(inp, b); d.appendChild(r); kl.appendChild(d); });
    box.appendChild(kl);
    box.appendChild(el("h3", null, "Back-up"));
    const online = OK.backend.mode === "supabase";
    box.appendChild(el("p", "muted small", online ? "Alles van je gezin staat veilig op de Kenik-server en komt automatisch op elk toestel waar je inlogt. Een back-up kopiëren kan extra, bv. om iets over te zetten naar een testomgeving." : "Alles wordt bewaard in deze browser op dit toestel. Kopieer af en toe een back-up, of zet ze over naar een ander toestel."));
    const brow = el("div", "row"); const ex = el("button", "btn ghost", "Back-up kopiëren"); ex.type = "button"; const im = el("button", "btn ghost", "Back-up plakken"); im.type = "button"; brow.append(ex, im); box.appendChild(brow);
    const ta = el("textarea", "hidden"); ta.placeholder = "Plak hier je back-up en klik nogmaals op 'Back-up plakken'"; box.appendChild(ta);
    ex.addEventListener("click", () => { ta.classList.remove("hidden"); ta.value = JSON.stringify(S()); ta.select(); try { navigator.clipboard.writeText(ta.value).then(() => { msg.textContent = "Back-up gekopieerd naar het klembord."; }, () => { }); } catch (e) { } });
    im.addEventListener("click", () => { if (ta.classList.contains("hidden")) { ta.classList.remove("hidden"); ta.value = ""; ta.focus(); return; } try { const o = JSON.parse(ta.value); if (!o.children || !o.lists) throw 0; OK.replaceState(o); location.reload(); } catch (e) { msg.textContent = "Dat is geen geldige back-up."; } });
    box.appendChild(el("h3", null, "Gevaarlijke knop"));
    box.appendChild(el("p", "muted small", "Wist alle kinderen, lijsten, opdrachten, beloningen en resultaten van jouw gezin" + (online ? ", ook op de server. Andere gezinnen worden nooit geraakt. Je blijft ingelogd." : ".")));
    const del = el("button", "btn danger", "Alles wissen en opnieuw beginnen"); del.type = "button";
    armed(del, async () => { del.disabled = true; del.textContent = "Bezig met wissen..."; if (OK.backend.wipeFamily) { const r = await OK.backend.wipeFamily(); if (r && r.error) { msg.textContent = r.error; del.disabled = false; del.textContent = "Alles wissen en opnieuw beginnen"; return; } } OK.resetAll(!online); location.reload(); });
    box.appendChild(el("div", "row")).appendChild(del);
  }

  /* ---------- nieuwe leerstof: stap voor stap, één vraag per scherm ---------- */
  /* kind (naam en leerjaar) -> foto -> nakijken -> tegen wanneer -> doorgeven. Alles krijgt een standaardwaarde;
     wat een ouder zelden aanpast (aantal vragen, toets, bonus) zit achter "Meer opties". */
  let wz = null;
  const WZ_N = { kid: 1, ready: 0, what: 0, who: 1, photo: 2, type: 2, phone: 2, reading: 2, review: 3, when: 4, done: 0 };
  const cap = t => t.charAt(0).toUpperCase() + t.slice(1);
  const localISO = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const wzHead = (title, sub) => el("div", "stack wz-head", `<h1>${esc(title)}</h1>${sub ? `<p class="muted">${esc(sub)}</p>` : ""}`);
  const wzMsg = t => { const m = $("wz-msg"); if (m) m.textContent = t; };
  OK.openWizardNewKid = function () { wz = { child: null, step: null, hist: [], items: [], verbs: [], name: "", subject: "Frans", listId: null, taskId: null }; OK.show("s-wizard"); wzGo("kid"); };
  OK.openWizard = function (childId, opts) {
    const kids = S().children; opts = opts || {};
    wz = { child: childId || (kids.length === 1 ? kids[0].id : null), step: null, hist: [], items: [], verbs: [], name: "", subject: "Frans", listId: null, taskId: null, task: !!opts.task };
    OK.show("s-wizard"); wzGo(!kids.length ? "kid" : wz.child ? (wz.task ? "what" : "photo") : "who");
  };
  function wzGo(step, noHist) {
    if (wz.step && !noHist && wz.step !== "reading") wz.hist.push(wz.step);
    wz.step = step; const n = WZ_N[step];
    $("wz-step").textContent = n ? `Stap ${n} van 4` : ""; $("wz-bar").classList.toggle("hidden", !n);
    [...$("wz-bar").children].forEach((i, k) => i.classList.toggle("on", k < n));
    $("wz-back").textContent = wz.hist.length ? "Terug" : "Sluiten"; $("wz-back").classList.toggle("hidden", step === "done");
    const body = $("wz-body"); body.innerHTML = ""; WZ[step](body); window.scrollTo(0, 0);
  }
  $("wz-back").addEventListener("click", () => { if (!wz) return; if (photoCtl) photoCtl.abort(); stopPhone(); if (wz.hist.length) wzGo(wz.hist.pop(), true); else { const wasEdit = wz.edit; wz = null; if (wasEdit) OK.openParent("stof", "lists"); else OK.openParent(); } });
  const wzChild = () => OK.childById(wz.child);
  const wzList = () => S().lists.find(l => l.id === wz.listId);
  /* bestaande lijst bekijken of aanpassen: dezelfde nakijktabel als na een foto; opslaan brengt je terug naar de lijsten */
  OK.openListEdit = function (listId) {
    const l = S().lists.find(x => x.id === listId); if (!l) return; const kids = S().children;
    wz = { child: Array.isArray(l.children) && l.children[0] && kids.some(k => k.id === l.children[0]) ? l.children[0] : (kids[0] ? kids[0].id : null), step: null, hist: [], items: l.items.map(it => ({ q: it[0], a: it[1] })), verbs: [], name: l.name, subject: l.pack ? "__pack" : (l.subject || "Frans"), listId: l.id, taskId: null, edit: true };
    OK.show("s-wizard"); wzGo("review");
  };

  async function wzRead(files) {
    const fn = await sampleAvailable(); if (!fn || !wz) return;
    files = files.slice(0, fn.maxImages || 4); if (!files.length) return;
    wz.listId = null; wzGo("reading"); photoCtl = new AbortController();
    try {
      const data = await fn.json(OK.photoPrompt(), { images: files, signal: photoCtl.signal });
      if (!wz || wz.step !== "reading") return;
      wzApply(data);
    } catch (e) { if (wz && wz.step === "reading") { wzGo("photo", true); wzMsg(OK.ai.errorText(e, "Lezen mislukt.")); } }
    finally { photoCtl = null; }
  }
  /* resultaat van een gelezen foto (laptop of gsm) naar de nakijkstap */
  function wzApply(data) {
    data = data || {};
    const items = Array.isArray(data.items) ? data.items.filter(w => w && w.q && w.a).map(w => ({ q: String(w.q), a: String(w.a), check: !!w.check })) : [];
    if (!items.length) { wzGo("photo", true); wzMsg("Niets herkend. Probeer een scherpere foto, recht van boven, met goed licht."); return; }
    wz.verbs = Array.isArray(data.verbs) ? data.verbs.filter(v => v && v.inf) : [];
    const pack = items.every(w => w.q.trim().toLowerCase() === w.a.trim().toLowerCase());
    wz.items = items; wz.name = data.title ? String(data.title) : ""; wz.subject = pack ? "__pack" : (OK.SUBJECTS.includes(data.subject) ? data.subject : "Andere");
    wzGo("review", true);
  }
  let phoneTimer = null;
  const stopPhone = () => { if (phoneTimer) clearInterval(phoneTimer); phoneTimer = null; };

  const ICO_CAM = `<svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8 h3.5 l1.5 -2.5 h6 l1.5 2.5 h3.5 a1 1 0 0 1 1 1 v9.5 a1 1 0 0 1 -1 1 h-16 a1 1 0 0 1 -1 -1 v-9.5 a1 1 0 0 1 1 -1z"/><circle cx="12" cy="13.5" r="3.6"/></svg>`;
  const ICO_GEN = `<svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8 h8 M8 12 h8 M8 16 h5"/></svg>`;
  const WZ = {
    /* wie: bestaand kind kiezen of een nieuw toevoegen */
    who(body) {
      body.appendChild(wzHead("Voor wie is het?"));
      const grid = el("div", "players");
      S().children.forEach(c => { const b = el("button", "player", `${OK.avatarHTML(c)}<strong>${esc(c.name)}</strong><span class="muted small">${esc(OK.gradeName(c.grade))}</span>`); b.type = "button"; b.addEventListener("click", () => { wz.child = c.id; wzGo(wz.task ? "what" : "photo"); }); grid.appendChild(b); });
      body.appendChild(grid);
      const nw = el("button", "btn ghost", "Nieuw kind toevoegen"); nw.type = "button"; nw.addEventListener("click", () => wzGo("kid")); body.appendChild(nw);
    },
    /* nieuw kind: alleen voornaam en leerjaar; de oefeningen voor dat leerjaar staan vanzelf klaar */
    kid(body) {
      body.appendChild(wzHead("Voor wie is het?", S().children.length ? "" : "Begin met één kind. De anderen voeg je straks toe."));
      body.appendChild(el("label", "f", `Voornaam<input type="text" id="wz-name" autocomplete="off" autocapitalize="words">`));
      body.appendChild(el("p", "muted small", "Leerjaar"));
      let grade = null; const grid = el("div", "pickgrid"); const more = el("div", "pickgrid");
      const next = el("button", "btn big wide", "Verder"); next.type = "button"; next.disabled = true;
      const sync = () => { next.disabled = !($("wz-name").value.trim() && grade); };
      OK.GRADE_IDS.forEach(g => { const b = el("button", "pick", esc(OK.gradeName(g))); b.type = "button"; b.addEventListener("click", () => { grade = g; body.querySelectorAll(".pick").forEach(x => x.classList.toggle("sel", x === b)); sync(); }); (g <= 6 ? grid : more).appendChild(b); });
      body.appendChild(grid);
      const det = el("details", null, `<summary class="muted small">Middelbaar</summary>`); more.style.marginTop = "10px"; det.appendChild(more); body.appendChild(det);
      body.appendChild(el("p", "muted small", "Kenik zet de oefeningen voor dat leerjaar al klaar. Je hoeft niets aan te vinken."));
      body.appendChild(next);
      $("wz-name").addEventListener("input", sync); setTimeout(() => { const i = $("wz-name"); if (i) i.focus(); }, 50);
      next.addEventListener("click", () => { const c = OK.addChild($("wz-name").value.trim(), grade); wz.child = c.id; wz.hist = []; wzGo("ready", true); });
    },
    /* het kind bestaat en kan al oefenen: een lijst uit het handboek is een plus, geen voorwaarde om te beginnen */
    ready(body) {
      const c = wzChild();
      const mods = Object.keys(c.modules || {}).map(id => OK.modules[id]).filter(Boolean).sort((a, b) => (a.order || 99) - (b.order || 99));
      const groups = mods.filter(m => m.generator !== false).map(m => m.name); /* "Lijsten" werkt pas met eigen inhoud */
      body.appendChild(wzHead(`${esc(c.name)} kan beginnen`, `Voor ${esc(OK.gradeName(c.grade))} staat dit al klaar, zonder dat je iets moet ingeven:`));
      const ul = el("ul", "ready-list"); groups.forEach(g => ul.appendChild(el("li", null, esc(g)))); body.appendChild(ul);
      body.appendChild(el("p", "muted", `Woordjes, begrippen of vervoegingen uit het handboek van ${esc(c.name)} voeg je toe met een foto. Dat kan nu, of later vanuit het overzicht.`));
      const go = el("button", "btn big wide", "Woordjes uit het handboek toevoegen"); go.type = "button"; go.addEventListener("click", () => wzGo("photo")); body.appendChild(go);
      const later = el("button", "linklike", "Later, naar het overzicht"); later.type = "button"; later.addEventListener("click", () => { wz = null; OK.openParent(); }); body.appendChild(later);
    },
    /* opdracht klaarzetten: uit het handboek (foto) of een oefening die Kenik al heeft (tafels, klok, ...) */
    what(body) {
      const c = wzChild();
      body.appendChild(wzHead(`Wat moet ${esc(c.name)} kennen?`));
      const two = el("div", "choice2");
      const a = el("button", "photo-drop", `<span class="photo-ico">${ICO_CAM}</span><strong>Uit het handboek</strong><span class="muted small">Woordjes, begrippen of vervoegingen van een foto</span>`); a.type = "button"; a.addEventListener("click", () => wzGo("photo"));
      const b = el("button", "photo-drop", `<span class="photo-ico">${ICO_GEN}</span><strong>Een oefening van Kenik</strong><span class="muted small">Tafels, kloklezen, spelling, breuken, ...</span>`); b.type = "button"; b.addEventListener("click", () => { const cid = c.id; wz = null; OK.openParent("stof", "tasks"); const sel = $("t-child"); if (sel) { sel.value = cid; sel.dispatchEvent(new Event("change")); } });
      two.append(a, b); body.appendChild(two);
    },
    /* foto eerst: geen naam, vak of instelling vooraf */
    photo(body) {
      const c = wzChild();
      body.appendChild(wzHead(`Wat moet ${c.name} kennen?`, "Trek een foto van de bladzijde in het boek of schrift. Woordjes, begrippen of vervoegingen: Kenik leest ze zelf."));
      const camIco = `<span class="photo-ico"><svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8 h3.5 l1.5 -2.5 h6 l1.5 2.5 h3.5 a1 1 0 0 1 1 1 v9.5 a1 1 0 0 1 -1 1 h-16 a1 1 0 0 1 -1 -1 v-9.5 a1 1 0 0 1 1 -1z"/><circle cx="12" cy="13.5" r="3.6"/></svg></span>`;
      const fileIco = `<span class="photo-ico"><svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3.5" y="5" width="17" height="14" rx="2"/><circle cx="9" cy="10" r="1.8"/><path d="M4 17.5 l5 -4.5 l3.5 3 l3 -2.5 l5 4"/></svg></span>`;
      /* gsm of tablet: aanraakscherm zonder muis, of een mobiele browser (iPad meldt zich als Mac, vandaar ook maxTouchPoints). Daar opent "Foto maken" meteen de camera. */
      const touch = (window.matchMedia && window.matchMedia("(pointer: coarse)").matches) || /iPhone|iPad|iPod|Android|Mobile/i.test(navigator.userAgent) || (navigator.maxTouchPoints || 0) > 1;
      const phoneOk = !!OK.backend.createPhotoSession && !touch;
      const inp = el("input"); inp.type = "file"; inp.accept = "image/*"; inp.multiple = true; inp.className = "hidden";
      inp.addEventListener("change", () => wzRead([...inp.files]));
      const tile = (ico, title, sub, onClick) => { const b = el("button", "photo-drop", `${ico}<strong>${title}</strong><span class="muted small">${sub}</span>`); b.type = "button"; b.addEventListener("click", onClick); return b; };
      const two = el("div", "choice2");
      if (phoneOk) {
        /* aan een laptop: eerst de gsm (QR-code), daarnaast een bestand van de computer */
        two.append(tile(camIco, "Foto maken met je gsm", "Scan een code, de woordjes komen hier", () => wzGo("phone")),
                   tile(fileIco, "Foto kiezen op deze computer", "Een foto of scan die hier al staat", () => inp.click()));
      } else {
        /* gsm of tablet: "capture" opent meteen de camera (zonder dat toont iOS eerst een keuzemenu); de bibliotheek apart, daar mag je meerdere kiezen */
        const cam = el("input"); cam.type = "file"; cam.accept = "image/*"; cam.setAttribute("capture", "environment"); cam.className = "hidden";
        cam.addEventListener("change", () => wzRead([...cam.files])); body.appendChild(cam);
        two.append(tile(camIco, "Foto maken", "Eén bladzijde per keer", () => cam.click()),
                   tile(fileIco, "Kiezen uit je foto's", "Meerdere bladzijden mag", () => inp.click()));
      }
      body.appendChild(two);
      body.appendChild(inp); body.appendChild(el("p", "small", "")).id = "wz-msg";
      const links = el("div", "stack wz-links");
      /* een voorbeeld dat bij het leerjaar past: een vreemde taal pas vanaf het vijfde, wereldoriëntatie vanaf het derde, voor de jongsten geen */
      const exOk = l => l.example && !l.pack && OK.forChild(l, c.id) && (OK.langFor(l.subject) !== "nl" ? c.grade >= 5 : c.grade >= 3);
      const exs = S().lists.filter(exOk); const ex = exs.find(l => (l.lang || OK.langFor(l.subject)) === OK.region().firstForeign) || exs[0];
      if (ex) { const b = el("button", "linklike", "Geen boek bij de hand? Probeer een voorbeeldlijst"); b.type = "button"; b.addEventListener("click", () => { wz.listId = ex.id; wzGo("when"); }); links.appendChild(b); }
      /* aan een laptop zonder camera: de foto met de gsm nemen via een QR-code */
      const ty = el("button", "linklike", "Liever zelf typen of plakken"); ty.type = "button"; ty.addEventListener("click", () => wzGo("type")); links.appendChild(ty);
      body.appendChild(links);
      sampleAvailable().then(fn => { if (!fn && wz && wz.step === "photo") { body.querySelectorAll(".photo-drop").forEach(b => b.disabled = true); wzMsg(OK.ai.reason); } });
    },
    /* gsm: QR tonen, wachten tot de foto gelezen is, dan nakijken */
    async phone(body) {
      body.appendChild(wzHead("Neem de foto met je gsm", "Scan deze code met de camera van je gsm. Daar neem je de foto; de woordjes verschijnen hier vanzelf."));
      const box = el("div", "phone-box row"); const qr = el("div"); qr.id = "phone-qr"; const side = el("div", "stack");
      side.innerHTML = `<p class="muted small">Of typ op je gsm:<br><strong id="phone-url"></strong></p><p class="small" id="wz-msg">Code maken...</p>`;
      box.append(qr, side); body.appendChild(box);
      const r = await OK.backend.createPhotoSession(OK.photoPrompt());
      if (!wz || wz.step !== "phone") return;
      if (!r || r.error) { wzMsg("Kon geen code maken: " + (r && r.error || "onbekend")); return; }
      const url = location.origin + location.pathname.replace(/[^/]*$/, "") + "foto.html#" + r.token;
      try { new window.QRCode(qr, { text: url, width: 170, height: 170, correctLevel: window.QRCode.CorrectLevel.M }); } catch (e) { qr.textContent = ""; }
      $("phone-url").textContent = url.replace(/^https?:\/\//, ""); wzMsg("Wachten op de foto... De code is 15 minuten geldig.");
      stopPhone();
      phoneTimer = setInterval(async () => {
        if (!wz || wz.step !== "phone") { stopPhone(); return; }
        const ps = await OK.backend.photoSession(r.token); if (!ps) return;
        if (ps.status === "reading") wzMsg("Foto ontvangen, Kenik leest ze...");
        if (ps.status === "error") { stopPhone(); wzMsg("Mislukt: " + (ps.error || "onbekend") + " Ga terug en probeer opnieuw."); }
        if (ps.status === "done") { stopPhone(); wzApply(ps.result); }
      }, 2500);
    },
    reading(body) {
      body.appendChild(el("div", "stack wz-wait", `<div class="spinner" aria-hidden="true"></div><h2>Kenik leest de foto</h2><p class="muted">Dit duurt meestal 10 tot 40 seconden.</p>`));
      const st = el("button", "btn ghost", "Stop"); st.type = "button"; st.addEventListener("click", () => { if (photoCtl) photoCtl.abort(); }); body.appendChild(st);
    },
    type(body) {
      body.appendChild(wzHead("Typ of plak de lijst", "Eén paar per regel, met een streepje ertussen. Bij een woordpakket: één woord per regel."));
      body.appendChild(el("label", "f", `Vak<select id="wz-tsubject">${OK.SUBJECTS.map(x => `<option ${x === wz.subject ? "selected" : ""}>${x}</option>`).join("")}<option value="__pack" ${wz.subject === "__pack" ? "selected" : ""}>Spelling (woordpakket)</option></select>`));
      const ta = el("textarea"); ta.id = "wz-text"; ta.placeholder = "de hond - le chien\nhet huis - la maison\nzoeken - chercher"; body.appendChild(ta);
      body.appendChild(el("p", "small", "")).id = "wz-msg";
      const next = el("button", "btn big wide", "Verder"); next.type = "button"; body.appendChild(next);
      next.addEventListener("click", () => {
        const sub = $("wz-tsubject").value, pack = sub === "__pack";
        const items = pack ? ta.value.split(/\r?\n|,|;/).map(w => w.trim()).filter(Boolean).map(w => ({ q: w, a: w })) : OK.parseList(ta.value, "q-a").map(x => ({ q: x[0], a: x[1] }));
        if (!items.length) { wzMsg(pack ? "Geen woorden herkend. Eén per regel." : "Geen paren herkend. Eén per regel, met een streepje ertussen."); return; }
        wz.items = items; wz.verbs = []; wz.subject = sub; wz.listId = null; wzGo("review");
      });
    },
    /* nakijken: Kenik stelt naam en vak voor, twijfelgevallen zijn gemarkeerd */
    review(body) {
      const pack = wz.subject === "__pack", foreign = !pack && OK.langFor(wz.subject) !== "nl";
      body.appendChild(wz.edit ? wzHead(esc(wz.name), `${wz.items.length} ${pack || foreign ? "woorden" : "paren"}. Pas aan wat je wil en sla op.`) : wzHead("Klopt dit?", `${wz.items.length} ${pack || foreign ? "woorden" : "paren"} gevonden. Verbeter wat fout gelezen is.`));
      body.appendChild(el("div", "row", `<label class="f">Naam<input type="text" id="wz-lname" value="${esc(wz.name)}" placeholder="bv. Unité 4: à l'école"></label><label class="f" style="max-width:220px">Vak<select id="wz-subject">${OK.SUBJECTS.map(x => `<option ${x === wz.subject ? "selected" : ""}>${x}</option>`).join("")}<option value="__pack" ${pack ? "selected" : ""}>Spelling (woordpakket)</option></select></label>`));
      const tw = el("div", "table-wrap", `<table class="review"><thead><tr><th>${pack ? "Woord" : foreign ? "Nederlands" : "Vraag"}</th>${pack ? "" : `<th>${foreign ? esc(wz.subject) : "Antwoord"}</th>`}<th></th></tr></thead><tbody></tbody></table>`); body.appendChild(tw);
      const tb = tw.querySelector("tbody");
      const read = () => { wz.name = $("wz-lname").value; wz.items = [...tb.querySelectorAll("tr")].map(tr => ({ q: tr.querySelector("[data-q]").value, a: (tr.querySelector("[data-a]") || tr.querySelector("[data-q]")).value, check: tr.classList.contains("check") })); };
      const draw = () => { tb.innerHTML = ""; wz.items.forEach((it, i) => {
        const tr = el("tr", it.check ? "check" : "", `<td><input type="text" data-q value="${esc(it.q)}"></td>${pack ? "" : `<td><input type="text" data-a value="${esc(it.a)}">${it.check ? `<span class="checknote">Even nakijken</span>` : ""}</td>`}<td><button class="x" type="button" title="Schrappen" aria-label="Schrappen">✕</button></td>`);
        tr.querySelector(".x").addEventListener("click", () => { read(); wz.items.splice(i, 1); draw(); });
        tr.addEventListener("input", () => { tr.classList.remove("check"); const n = tr.querySelector(".checknote"); if (n) n.remove(); });
        tb.appendChild(tr); }); };
      draw();
      const addr = el("button", "pill-btn", "+ regel"); addr.type = "button"; addr.addEventListener("click", () => { read(); wz.items.push({ q: "", a: "" }); draw(); const rows = tb.querySelectorAll("tr"); rows[rows.length - 1].querySelector("input").focus(); }); body.appendChild(el("div", "row")).appendChild(addr);
      $("wz-subject").addEventListener("change", () => { read(); wz.subject = $("wz-subject").value; wzGo("review", true); });
      body.appendChild(el("p", "small", "")).id = "wz-msg";
      const save = el("button", "btn big wide", wz.edit ? "Opslaan" : "Klopt, opslaan"); save.type = "button"; body.appendChild(save);
      save.addEventListener("click", () => {
        read(); const name = wz.name.trim();
        const items = wz.items.map(x => pack ? [x.q.trim().toLowerCase(), x.q.trim().toLowerCase()] : [x.q.trim(), x.a.trim()]).filter(x => x[0] && x[1]);
        if (!name) { wzMsg("Geef de lijst eerst een naam."); $("wz-lname").focus(); return; }
        if (!items.length) { wzMsg("Er staat niets om op te slaan."); return; }
        const subject = pack ? "Nederlands" : wz.subject; const data = { name, subject, lang: OK.langFor(subject), children: [wz.child], items, pack };
        let l = wzList(); if (l && (!l.example || wz.edit)) Object.assign(l, data); else { l = Object.assign({ id: OK.uid(), created: OK.nowISO() }, data); S().lists.push(l); wz.listId = l.id; }
        wz.verbs.forEach(v => { if ((v.lang || "fr") !== "fr") return; OK.addVerb(String(v.inf), String(v.nl || ""), Array.isArray(v.forms) && v.forms.length === 6 ? v.forms.map(String) : null); }); wz.verbs = [];
        OK.save(); S().children.forEach(c => OK.syncVerbsFromLists(c));
        if (wz.edit) { wz = null; OK.openParent("stof", "lists"); return; }
        wzGo("when");
      });
    },
    /* één vraag die de opdracht aanmaakt */
    when(body) {
      const c = wzChild(), l = wzList(); if (!l) { wzGo("photo", true); return; }
      body.appendChild(wzHead(`Tegen wanneer moet ${c.name} dit kennen?`, `${l.name}, ${l.items.length} ${l.pack || (l.lang && l.lang !== "nl") ? "woorden" : "vragen"}`));
      let due; const opts = el("div", "stack wz-opts");
      const next = el("button", "btn big wide", "Klaarzetten"); next.type = "button"; next.disabled = true;
      const pick = (b, v) => { due = v; opts.querySelectorAll(".opt-row").forEach(x => x.classList.toggle("sel", x === b)); next.disabled = v === undefined; };
      const row = (label, sub, v) => { const b = el("button", "opt-row", `<span>${esc(label)}</span><span class="muted small">${esc(sub || "")}</span>`); b.type = "button"; b.addEventListener("click", () => pick(b, v)); opts.appendChild(b); return b; };
      for (let k = 1, n = 0; n < 3 && k < 10; k++) { const d = new Date(); d.setDate(d.getDate() + k); if (d.getDay() === 0 || d.getDay() === 6) continue; n++;
        row(k === 1 ? "Morgen" : cap(d.toLocaleDateString("nl-BE", { weekday: "long" })), d.toLocaleDateString("nl-BE", k === 1 ? { weekday: "long", day: "numeric", month: "long" } : { day: "numeric", month: "long" }), localISO(d)); }
      const other = el("label", "opt-row", `<span>Andere dag</span><input type="date" id="wz-date" min="${localISO(new Date())}">`); opts.appendChild(other);
      other.querySelector("input").addEventListener("change", e => pick(other, e.target.value || undefined));
      row("Geen datum, gewoon oefenen", "", null);
      body.appendChild(opts);
      body.appendChild(el("p", "muted small", `${esc(c.name)} ziet dit bovenaan bij het openen van Kenik. Jij ziet wanneer het gekend is.`));
      const det = el("details", "wz-more", `<summary class="linklike">Meer opties: aantal vragen, bonus</summary>
        <div class="row" style="margin-top:12px"><label class="f" style="max-width:170px">Vragen per beurt<select id="wz-count"><option>10</option><option ${c.grade > 2 ? "selected" : ""}>15</option><option>20</option><option>30</option></select></label>
        <label class="f" style="max-width:150px">Bonus (coins)<input type="number" id="wz-bonus" min="0" value="50"></label></div>`); body.appendChild(det);
      body.appendChild(next);
      next.addEventListener("click", () => {
        if (due === undefined) return;
        if (wz.taskId) S().tasks = S().tasks.filter(t => t.id !== wz.taskId);
        const module = l.pack ? "spelling" : "lijsten", m = OK.modules[module];
        const config = l.pack ? { types: ["dictee", "kies"], packs: [], own: [l.id] } : { lists: [l.id], dir: "q-a" };
        if (!c.modules[module]) c.modules[module] = (!l.pack ? null : m.defaultsFor && m.defaultsFor(c.grade, OK.region())) || (l.pack ? { types: ["dictee", "kies"], packs: [], own: "all" } : { lists: [l.id], dir: "q-a" });
        const t = { id: OK.uid(), child: c.id, module, config, mode: "practice", count: +$("wz-count").value, due: due || null, bonus: Math.max(0, +$("wz-bonus").value || 0), status: "open", created: OK.nowISO() };
        S().tasks.push(t); wz.taskId = t.id; OK.save(); wzGo("done");
      });
    },
    /* doorgeven: hier, en niet bij het inloggen, komt de vraag op welk toestel het kind oefent */
    done(body) {
      const c = wzChild(), l = wzList(), t = S().tasks.find(x => x.id === wz.taskId);
      body.appendChild(el("span", "done-ico", `<svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5 l4.5 4.5 l9.5 -10"/></svg>`));
      body.appendChild(wzHead(`Klaar. Nu is het aan ${c.name}.`, `${l ? l.name : "De leerstof"} staat klaar${t && t.due ? " " + OK.dueText(t).toLowerCase() : ""}. Waar gaat ${c.name} oefenen?`));
      const here = el("button", "way primary", `<svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="6.5" y="2.5" width="11" height="19" rx="2.5"/><path d="M10.5 18.5 h3"/></svg><span><strong>Op dit toestel</strong><span class="small">Geef het door, ${esc(c.name)} kan meteen starten</span></span>`); here.type = "button";
      const there = el("button", "way", `<svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3.5" y="3.5" width="6.5" height="6.5" rx="1"/><rect x="14" y="3.5" width="6.5" height="6.5" rx="1"/><rect x="3.5" y="14" width="6.5" height="6.5" rx="1"/><path d="M14 14 h3 v3 M20.5 14 v6.5 h-6.5 v-0.5"/></svg><span><strong>Op een ander toestel</strong><span class="small muted">Toon een QR-code om te scannen</span></span>`); there.type = "button";
      const extra = el("div", "stack"); body.append(here, there, extra);
      const handOver = () => { const ses = OK.session() || {}; OK.setSession(Object.assign({}, ses, { type: "family" })); S().current = c.id; OK.save(); wz = null; OK.renderHome(); };
      here.addEventListener("click", () => {
        if (S().pin) { handOver(); return; }
        /* op een toestel dat de kinderen gebruiken zit het ouderdeel achter een code */
        extra.innerHTML = ""; const box = el("div", "card stack", `<p>Kies eerst een oudercode van 4 tot 6 cijfers. Daarmee blijft het ouderdeel op dit toestel van jou.</p><div class="row"><input type="password" id="wz-pin" inputmode="numeric" maxlength="6" placeholder="code" style="max-width:160px"><button class="btn" type="button" id="wz-pin-ok">Doorgeven</button></div><p class="small" id="wz-msg" style="color:var(--rose)"></p>`); extra.appendChild(box);
        $("wz-pin").focus(); $("wz-pin-ok").addEventListener("click", () => { const v = $("wz-pin").value.trim(); if (!/^\d{4,6}$/.test(v)) { wzMsg("4 tot 6 cijfers."); return; } S().pin = v; OK.save(); handOver(); });
      });
      there.addEventListener("click", () => { extra.innerHTML = ""; extra.appendChild(devicePanel(c)); });
      const links = el("div", "stack wz-links");
      const again = el("button", "linklike", "Nog een kind toevoegen"); again.type = "button"; again.addEventListener("click", () => { wz = { child: null, step: null, hist: [], items: [], verbs: [], name: "", subject: "Frans", listId: null, taskId: null }; wzGo("kid"); });
      const home = el("button", "linklike", "Naar mijn overzicht"); home.type = "button"; home.addEventListener("click", () => { wz = null; OK.openParent(); });
      links.append(again, home); body.appendChild(links);
    }
  };
})(window.OK);
