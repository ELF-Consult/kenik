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

  OK.openParent = function () { OK.applyTheme(null); OK.show("s-parent"); const first = document.querySelector("#ptabs .tab"); first.click(); };
  /* Beheer: knop in de kop, enkel voor beheerders; opent het ouderpaneel op het (verborgen) tabblad Beheer */
  let adminKnown = null;
  OK.refreshAdminButton = async function () {
    const ses = OK.session(); const b = $("btn-admin");
    if (!ses || ses.type === "child" || !OK.backend.isAdmin) { b.classList.add("hidden"); return; }
    if (adminKnown === null) adminKnown = await OK.backend.isAdmin();
    b.classList.toggle("hidden", !adminKnown);
  };
  $("btn-admin").addEventListener("click", () => { OK.applyTheme(null); OK.show("s-parent"); $("tab-admin").click(); });
  document.querySelectorAll("#ptabs .tab").forEach(t => t.addEventListener("click", () => {
    document.querySelectorAll("#ptabs .tab").forEach(x => x.classList.toggle("active", x === t));
    document.querySelectorAll(".ptab").forEach(p => p.classList.toggle("hidden", p.id !== "ptab-" + t.dataset.tab));
    TABS[t.dataset.tab]();
  }));
  const TABS = { kids: renderKids, tasks: renderTasks, lists: renderLists, verbs: renderVerbs, rewards: renderRewards, results: renderResults, family: renderFamily, settings: renderSettings, admin: () => OK.renderAdmin && OK.renderAdmin($("ptab-admin")) };

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
      const v = OK.gardenVariants[c.theme.variant];
      const groups = {}; Object.keys(c.modules).filter(k => c.modules[k] && OK.modules[k]).forEach(k => { const g = OK.modules[k].group; groups[g] = (groups[g] || 0) + 1; });
      const d = el("div", "kidcard");
      d.innerHTML = `${OK.avatarHTML(c)}
        <div class="kidinfo"><strong>${esc(c.name)}</strong><span class="muted small">${OK.gradeName(c.grade)} · ${c.theme.style === "kist" ? "schatkist" : (v ? v.name.toLowerCase() : "wereld")}</span>
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
    const add = el("div", "row", `<label class="f">Voornaam<input type="text" id="k-name"></label><label class="f" style="max-width:180px">Leerjaar<select id="k-grade">${GRADES.map(g => `<option value="${g[0]}" ${g[0] === 4 ? "selected" : ""}>${g[1]}</option>`).join("")}</select></label><label class="f" style="max-width:260px">Stijl<select id="k-style"><option value="tuin">Wereld: verzamelen</option><option value="kist">Schatkist: coins en winkel</option></select></label>`);
    const addBtn = el("button", "btn", "Kind toevoegen"); addBtn.type = "button"; add.appendChild(addBtn); box.appendChild(el("h3", null, "Nieuw kind")); box.appendChild(add);
    addBtn.addEventListener("click", () => { const n = $("k-name").value.trim(); if (!n) return; const g = +$("k-grade").value, st = $("k-style").value; const c = OK.addChild(n, g, { style: st, variant: "hondjes" }); editing = c.id; renderKids(); });
  }
  function childEditor(c) {
    const wrap = el("div", "stack");
    const head = el("div", "q-head"); head.appendChild(el("h3", null, `Instellingen voor ${esc(c.name)}`)); const back = el("button", "btn ghost", "Terug naar overzicht"); back.type = "button"; back.addEventListener("click", () => { editing = null; renderKids(); }); head.appendChild(back); wrap.appendChild(head);
    const basics = el("div", "row", `<label class="f">Voornaam<input type="text" id="e-name" value="${esc(c.name)}"></label><label class="f" style="max-width:180px">Leerjaar<select id="e-grade">${GRADES.map(g => `<option value="${g[0]}" ${g[0] === c.grade ? "selected" : ""}>${g[1]}</option>`).join("")}</select></label><label class="f" style="max-width:260px">Stijl<select id="e-style"><option value="tuin" ${c.theme.style === "tuin" ? "selected" : ""}>Wereld: verzamelen</option><option value="kist" ${c.theme.style === "kist" ? "selected" : ""}>Schatkist: coins en winkel</option></select></label>`);
    wrap.appendChild(basics);
    // icoontje: zo zie je in één oogopslag op wiens account je zit
    let avatar = c.avatar || "";
    const aw = el("div", "stack"); aw.appendChild(el("p", "muted small", "Icoontje (staat bovenaan naast de naam)"));
    const av = el("div", "avpick");
    const paint = () => { av.innerHTML = ""; const none = el("button", "avopt" + (!avatar ? " sel" : ""), `<div class="avatar" style="background:#5b8cff;width:36px;height:36px;font-size:16px">${esc(c.name[0] || "?").toUpperCase()}</div>`); none.type = "button"; none.title = "Beginletter"; none.addEventListener("click", () => { avatar = ""; paint(); }); av.appendChild(none); OK.AVATARS.forEach(e => { const b = el("button", "avopt" + (avatar === e ? " sel" : ""), e); b.type = "button"; b.addEventListener("click", () => { avatar = e; paint(); }); av.appendChild(b); }); };
    paint(); aw.appendChild(av); wrap.appendChild(aw);
    // varianten
    const vwrap = el("div", "stack" + (c.theme.style === "tuin" ? "" : " hidden")); vwrap.appendChild(el("p", "muted small", "Welke wereld?"));
    basics.querySelector("#e-style").addEventListener("change", e => vwrap.classList.toggle("hidden", e.target.value !== "tuin"));
    const vs = el("div", "variants"); let chosen = c.theme.variant || "hondjes";
    Object.entries(OK.gardenVariants).forEach(([k, v]) => { const b = el("button", "variant" + (k === chosen ? " sel" : ""), `${v.collect(0)}<span>${v.name}</span>`); b.type = "button"; b.dataset.v = k; b.addEventListener("click", () => { chosen = k; vs.querySelectorAll(".variant").forEach(x => x.classList.toggle("sel", x.dataset.v === k)); }); vs.appendChild(b); });
    vwrap.appendChild(vs); wrap.appendChild(vwrap);
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
        (m.schema || []).forEach(f => fields.appendChild(OK.fieldEditor(f, effective[f.key], c, false)));
        const ex = el("div", "example"); fields.appendChild(ex);
        const refresh = () => { const cfg = {}; (m.schema || []).forEach(f => { const v = OK.readField(f, fields); if (v !== undefined) cfg[f.key] = v; }); const t = OK.exampleText(c, m.id, cfg); ex.innerHTML = t ? `<span class="muted small">Voorbeeld</span> <span>${esc(t)}</span> <button class="linklike small" type="button" data-again>nog een</button>` : ""; };
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
      c.name = $("e-name").value.trim() || c.name; c.grade = +$("e-grade").value; c.theme = { style: $("e-style").value, variant: chosen }; c.avatar = avatar || undefined;
      const mods = {};
      modRoot.querySelectorAll(".modcfg").forEach(box => { const m = OK.modules[box.dataset.mod]; if (!box.querySelector("[data-on]").checked) return; const cfg = {}; (m.schema || []).forEach(f => { const v = OK.readField(f, box); if (v !== undefined) cfg[f.key] = v; }); mods[m.id] = cfg; });
      c.modules = mods; OK.save(); msg.textContent = "Opgeslagen."; setTimeout(() => { editing = null; renderKids(); }, 400);
    });
    cancel.addEventListener("click", () => { editing = null; renderKids(); });
    reset.addEventListener("click", () => { c.modules = OK.defaultModulesFor(+$("e-grade").value); OK.save(); renderKids(); });
    armed(del, () => { S().children = S().children.filter(x => x !== c); if (S().current === c.id) S().current = null; editing = null; OK.save(); renderKids(); });
    return wrap;
  }

  /* ---------- opdrachten ---------- */
  function renderTasks() {
    const root = $("ptab-tasks"); root.innerHTML = ""; root.className = "stack ptab";
    const box = el("div", "card stack"); root.appendChild(box);
    box.appendChild(el("h3", null, "Nieuwe opdracht"));
    box.appendChild(el("p", "muted small", "Een opdracht verschijnt bovenaan op het startscherm van het kind. De instellingen liggen vast; afwerken levert de bonus op."));
    const kids = S().children;
    const row1 = el("div", "row", `<label class="f">Voor wie<select id="t-child"><option value="all">Iedereen</option>${kids.map(k => `<option value="${k.id}" ${k.id === S().current ? "selected" : ""}>${esc(k.name)}</option>`).join("")}</select></label><label class="f">Welke oefening (klap open voor alle vakken)<select id="t-module"></select></label><label class="f" style="max-width:200px">Vorm<select id="t-mode"><option value="practice">Oefenen</option><option value="test">Toets</option></select></label>`);
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
      S().tasks.push({ id: OK.uid(), child: row1.querySelector("#t-child").value, module: m.id, config: cfg, mode: row1.querySelector("#t-mode").value, count: +row2.querySelector("#t-count").value, due: row2.querySelector("#t-due").value || null, bonus: +row2.querySelector("#t-bonus").value || 0, status: "open", created: OK.nowISO() });
      OK.save(); msg.textContent = "Opdracht staat klaar."; renderTasks();
    });
    const cardOpen = el("div", "card stack"); root.appendChild(cardOpen);
    const openT = S().tasks.filter(t => t.status === "open");
    cardOpen.appendChild(el("div", "q-head", `<h3>Open opdrachten</h3><span class="muted small">${openT.length}</span>`));
    const open = el("div", "list");
    if (!openT.length) open.appendChild(el("p", "muted small", "Geen open opdrachten."));
    openT.forEach(t => { const m = OK.modules[t.module]; const d = el("div", "item", `<span><strong>${esc(OK.childName(t.child))}</strong>: ${m ? m.name : t.module}${t.mode === "test" ? " (toets)" : ""} <span class="muted">${m && m.describe ? m.describe(t.config || {}, { child: OK.childById(t.child) || kids[0] || { id: "x" } }) : ""}</span><br><span class="muted small">${t.due ? "tegen " + OK.fmtDate(t.due) : "geen deadline"}${t.bonus ? " · bonus " + t.bonus : ""}</span></span>`); const x = el("button", "x", "✕"); x.type = "button"; x.title = "Intrekken"; x.addEventListener("click", () => { S().tasks = S().tasks.filter(q => q !== t); OK.save(); renderTasks(); }); d.appendChild(x); open.appendChild(d); });
    cardOpen.appendChild(open);
    const cardDone = el("div", "card stack"); root.appendChild(cardDone);
    cardDone.appendChild(el("h3", null, "Afgewerkt"));
    const done = el("div", "list"); const doneT = S().tasks.filter(t => t.status === "done").sort((a, b) => b.doneAt.localeCompare(a.doneAt)).slice(0, 20);
    if (!doneT.length) done.appendChild(el("p", "muted small", "Nog niets afgewerkt."));
    doneT.forEach(t => { const m = OK.modules[t.module]; done.appendChild(el("div", "item", `<span><strong>${esc(OK.childName(t.doneBy || t.child))}</strong>: ${m ? m.name : t.module}${t.mode === "test" ? " (toets)" : ""}</span><span class="tag good">${t.score} · ${OK.fmtDate(t.doneAt)}</span>`)); });
    cardDone.appendChild(done);
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
    const box = el("div", "card stack"); root.appendChild(box);
    const form = el("div", "stack"); form.id = "photo-block";
    form.innerHTML = `<h3>Nieuwe lijst</h3>
      <div class="row"><label class="f">Naam van de lijst<input type="text" id="wl-name" placeholder="bv. Unité 4: à l'école"></label>
        <label class="f" style="max-width:240px">Vak<select id="wl-subject">${OK.SUBJECTS.map(s => `<option>${s}</option>`).join("")}<option value="__pack">Spelling (woordpakket)</option></select></label>
        <label class="f" style="max-width:200px">Voor wie<select id="wl-children"><option value="all">Iedereen</option>${kids.map(k => `<option value="${k.id}">${esc(k.name)}</option>`).join("")}</select></label></div>
      <input type="checkbox" id="wl-pack" class="hidden">
      <p class="muted small hidden" id="wl-pack-hint">Een woordpakket is het rijtje woorden voor het dictee: alleen de woorden, geen vertaling. Kenik gebruikt het voor dictee, "kies de juiste schrijfwijze" en d/t.</p>
      <div class="choice2">
        <button class="tile primary" id="btn-take-photo" type="button"><span class="tile-icon">📷</span><strong>Foto van het handboek</strong><span>Neem een foto van de bladzijde met de woordjes of begrippen. Meerdere bladzijden mag. Je kijkt daarna alles na.</span></button>
        <button class="tile" id="btn-manual" type="button"><span class="tile-icon">⌨️</span><strong>Zelf typen of plakken</strong><span>Uit een mail, Word of gewoon overtypen. Eén paar per regel.</span></button>
        <input type="file" id="photo-input" accept="image/*" multiple class="hidden">
      </div>
      <p class="muted small hidden" id="photo-status"></p>
      <div class="row thumbs" id="photo-thumbs"></div>
      <div class="row hidden" id="photo-actions"><button class="btn mint" id="btn-read-photos" type="button">Lees de foto's</button><button class="btn ghost" id="btn-clear-photos" type="button">Foto's weg</button><button class="btn ghost hidden" id="btn-stop-photos" type="button">Stop</button></div>
      <p class="small" id="photo-msg"></p>
      <div class="stack hidden" id="manual-block">
        <p class="muted small">Eén paar per regel: vraag en antwoord gescheiden door een streepje, =, puntkomma of tab. Meerdere juiste antwoorden met een komma. Bij een woordpakket: één woord per regel.</p>
        <div class="row"><label class="f" style="max-width:260px">Volgorde in de tekst<select id="wl-order"><option value="q-a">vraag - antwoord</option><option value="a-q">antwoord - vraag</option></select></label></div>
        <textarea id="wl-text" placeholder="de hond - le chien&#10;het huis - la maison&#10;zoeken - chercher"></textarea>
        <div class="row"><button class="btn" id="btn-parse-text" type="button">Zet klaar om na te kijken</button></div>
      </div>
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
    sampleAvailable().then(fn => { const st = $("photo-status"); if (!st) return; if (!fn) { st.classList.remove("hidden"); st.innerHTML = `<span class="tag bad">Foto's lezen niet beschikbaar</span> ${esc(OK.ai.reason)}`; $("btn-take-photo").disabled = true; $("btn-take-photo").classList.remove("primary"); $("btn-manual").classList.add("primary"); } });
    $("btn-manual").addEventListener("click", () => { $("manual-block").classList.toggle("hidden"); if (!$("manual-block").classList.contains("hidden")) $("wl-text").focus(); });

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
    const root = $("ptab-verbs"); root.innerHTML = ""; root.className = "stack ptab";
    const showFr = anyChildHas("frans-werkwoorden"), showEn = anyChildHas("engels-werkwoorden"), showNl = anyChildHas("grammatica", "spelling");
    if (!showFr && !showEn && !showNl) { root.appendChild(el("div", "card stack", `<p class="muted small">Geen enkel kind heeft nu een werkwoordenoefening aan (Franse of Engelse werkwoorden, Nederlandse grammatica of spelling). Zet die aan onder Kinderen, dan verschijnt de voorraad hier.</p>`)); return; }
    /* Frans */
    if (showFr) {
    const fr = langCard(root, "#3b6fd6", "Frans", "De voorraad van jullie gezin. Begin klein en neem werkwoorden uit de lijst erbij als ze op school aan bod komen. Welke een kind oefent en in welke tijden, kies je per kind onder Kinderen.");
    const F = OK.frans;
    const frStock = el("div", "chips"); OK.allVerbs().forEach(v => { const t = el("span", "tag stock", `${esc(v.inf)} <span class="muted">${esc(v.nl || "")}</span>`); const x = el("button", "x", "✕"); x.type = "button"; x.title = "Uit de voorraad halen"; x.addEventListener("click", () => { OK.unstockVerb(v.inf); renderVerbs(); }); t.appendChild(x); frStock.appendChild(t); });
    if (!OK.allVerbs().length) frStock.appendChild(el("span", "muted small", "Nog geen werkwoorden in de voorraad."));
    fr.appendChild(el("strong", "small", "In de voorraad")); fr.appendChild(frStock);
    const frCat = OK.verbCatalogue(); if (frCat.length) { fr.appendChild(el("strong", "small", "Nog toe te voegen uit de lijst (klik om bij te nemen)")); const c = el("div", "chips"); frCat.forEach(v => { const b = el("button", "tag add", `+ ${esc(v.inf)} <span class="muted">${esc(v.nl)}</span>`); b.type = "button"; b.addEventListener("click", () => { OK.stockVerb(v.inf); renderVerbs(); }); c.appendChild(b); }); fr.appendChild(c); }
    fr.appendChild(el("div", "stack", `<strong class="small">Eigen werkwoord (staat niet in de lijst)</strong><div class="row"><label class="f">Infinitief<input type="text" id="v-inf" placeholder="bv. donner"></label><label class="f">Nederlands (mag leeg)<input type="text" id="v-nl" placeholder="geven"></label><label class="f">Soort<select id="v-type"><option value="auto">regelmatig (automatisch vervoegen)</option><option value="irr">onregelmatig (zelf invullen)</option></select></label></div>
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
    en.appendChild(el("div", "stack", `<strong class="small">Eigen werkwoord (staat niet in de lijst)</strong><div class="row"><label class="f">Infinitief<input type="text" id="ev-inf" placeholder="bv. forget"></label><label class="f">Past simple<input type="text" id="ev-past" placeholder="forgot (leeg = regelmatig)"></label><label class="f">Past participle<input type="text" id="ev-pp" placeholder="forgotten"></label><label class="f">Nederlands (mag leeg)<input type="text" id="ev-nl" placeholder="vergeten"></label></div><div class="row"><button class="btn" id="btn-add-ev" type="button">Werkwoord opslaan</button><span class="muted small" id="ev-msg"></span></div>`));
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
    box.appendChild(el("p", "muted small", "Jij bepaalt wat er te verdienen valt en wat het kost. Richtlijn: een sessie van 15 vragen levert zo'n 100 tot 150 coins op. Beloningen gelden alleen voor kinderen met de schatkiststijl."));
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
})(window.OK);
