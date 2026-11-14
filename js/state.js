/* Kenik - state.js
   Eén gezinsstate in localStorage. Alles wat de app onthoudt zit hier:
   kinderen (profielen), inhoud (lijsten), beloningen, opdrachten, aanvragen, statistieken, logboek.
   Modules registreren zich in OK.modules; de state bewaart enkel hun configuratie per kind. */
window.OK = window.OK || {};
(function (OK) {
  "use strict";
  const KEY = "kenik_v1";
  /* echte UUID's: de database (children.id, reward_requests.id) verwacht dat formaat */
  OK.uid = () => (crypto.randomUUID ? crypto.randomUUID() : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === "x" ? r : (r & 3 | 8)).toString(16); }));
  OK.today = () => new Date().toISOString().slice(0, 10);
  OK.nowISO = () => new Date().toISOString();
  OK.fmtDate = d => new Date(d).toLocaleDateString("nl-BE", { day: "numeric", month: "short" });

  function fresh() {
    return {
      version: 1,
      pin: null,
      current: null,          // id van het actieve kind
      children: [],           // {id,name,grade,theme:{variant},modules:{id:config},points,streak,best,garden:{flowers,collected,parties}}
      lists: [],              // {id,name,subject,lang,children:'all'|[ids],items:[[q,a]],example?}
      rewards: [],            // {id,name,cost,children:'all'|[ids]}
      requests: [],           // {id,child,reward,cost,d,status:'open'|'ok'|'no'}
      tasks: [],              // {id,child:'all'|id,module,config,mode,count,due,bonus,status,doneAt,doneBy,score}
      log: [],                // {d,child,what,n}
      sessions: [],           // afgewerkte oefenbeurten, nieuwste eerst
      texts: [],              // leesteksten {id,title,grade,text,questions:[{q,choices,a,why}],children}
      stats: {},              // stats[childId][itemKey] = {ok,wrong,t,last}
      settings: { p1: 10, p2: 4, goal: 15, goalBonus: 30, accents: false, articles: false, region: "be-nl", lang: "nl" }
    };
  }

  let S = null;
  OK.load = function () {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) { S = JSON.parse(raw); migrate(S); return S; }
    } catch (e) { /* storage onbeschikbaar of corrupt */ }
    S = fresh(); seed(S); return S;
  };
  OK.save = function () { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* best effort */ } };
  OK.state = () => S;
  OK.replaceState = function (obj) { S = obj; migrate(S); OK.save(); };
  /* signOut=false: enkel data wissen, ingelogd blijven (servermodus: de ouder blijft aangemeld) */
  OK.resetAll = function (signOut) { S = fresh(); seed(S); OK.save(); if (signOut !== false) { try { localStorage.removeItem("kenik_session"); } catch (e) { } } };

  function migrate(s) {
    /* voorbeeldlijsten bestaan niet meer: ze verwarden meer dan ze hielpen */
    const exIds = new Set((s.lists || []).filter(l => l.example).map(l => l.id));
    if (exIds.size) { s.lists = s.lists.filter(l => !exIds.has(l.id) && !/^ex-/.test(l.id)); s.tasks = (s.tasks || []).filter(t => !((t.config && t.config.lists) || []).some(id => exIds.has(id))); }
    /* Franse werkwoorden: van losse werkwoorden per kind naar soorten (groepen). De oude keuze bepaalt welke soorten aan gaan. */
    (s.children || []).forEach(c => { const m = c.modules && c.modules["frans-werkwoorden"]; if (m && OK.normalizeVerbCfg) { if (!m.groups && !m.picked && Array.isArray(m.verbs)) m.picked = true; OK.normalizeVerbCfg(m); } });
    const f = fresh();
    Object.keys(f).forEach(k => { if (s[k] === undefined) s[k] = f[k]; });
    Object.keys(f.settings).forEach(k => { if (s.settings[k] === undefined) s.settings[k] = f.settings[k]; });
    /* elk kind heeft coins én een wereld (theme.variant: hondjes, katjes, ridders, ...); garden telt de groei-items en de verzamelde vriendjes */
    s.children.forEach(c => { c.modules = c.modules || {}; c.theme = { style: "kist", variant: (c.theme && c.theme.variant) || "hondjes" }; c.garden = c.garden || { flowers: 0, collected: [] }; c.points = c.points || 0; c.streak = c.streak || 0; c.best = c.best || 0; });
  }

  /* Startinhoud: enkel een paar beloningen voor de winkel; lijsten maakt de ouder zelf. */
  function seed(s) {
    s.rewards.push(
      { id: OK.uid(), name: "Een ijsje of snoepje", cost: 100, children: "all" },
      { id: OK.uid(), name: "Half uur langer opblijven", cost: 150, children: "all" },
      { id: OK.uid(), name: "Een uur extra schermtijd", cost: 250, children: "all" },
      { id: OK.uid(), name: "5 euro voor Robux of V-Bucks", cost: 600, children: "all" }
    );
  }

  /* Helpers rond kinderen */
  OK.child = () => S.children.find(c => c.id === S.current) || null;
  /* avatar: gekozen icoontje (emoji) of de eerste letter; kleur per kind. Later kan hier een foto bij. */
  const AV_COLORS = ["#5b8cff", "#3ddc97", "#ff8a1f", "#c06bff", "#ff5d7a", "#2fc4d8"];
  OK.AVATARS = ["🐶", "🐱", "🦊", "🐼", "🦄", "🐸", "🐯", "🦁", "🐧", "🦖", "🐙", "🦋", "🚀", "⚽", "🎸", "🌈", "🏰", "🐴"];
  OK.avatarHTML = (c, size) => { const i = Math.max(0, S.children.indexOf(c)); const bg = AV_COLORS[i % AV_COLORS.length]; return `<div class="avatar${c.avatar ? " emo" : ""}" style="background:${bg}${size ? `;width:${size}px;height:${size}px;font-size:${Math.round(size * .5)}px` : ""}">${c.avatar || String(c.name || "?")[0].toUpperCase()}</div>`; };
  OK.childById = id => S.children.find(c => c.id === id) || null;
  OK.childName = id => id === "all" ? "iedereen" : ((OK.childById(id) || {}).name || "?");
  OK.forChild = (thing, childId) => thing.children === "all" || !thing.children || thing.children.includes(childId);

  /* Standaardprofiel per leerjaar: welke modules staan aan en met welke instellingen.
     Modules kunnen dit verfijnen via module.defaultsFor(grade). */
  OK.defaultModulesFor = function (grade) {
    const out = {};
    const region = OK.region();
    Object.values(OK.modules).forEach(m => {
      if (!m.defaultsFor || !OK.moduleAvailable(m, region)) return;
      const cfg = m.defaultsFor(grade, region);
      if (cfg) out[m.id] = cfg;
    });
    return out;
  };
  OK.addChild = function (name, grade) {
    const c = { id: OK.uid(), name, grade, theme: { style: "kist", variant: "hondjes" }, modules: OK.defaultModulesFor(grade), points: 0, streak: 0, best: 0, garden: { flowers: 0, collected: [] }, created: OK.nowISO() };
    S.children.push(c); OK.save(); return c;
  };

  /* Punten en logboek */
  OK.addPoints = function (childId, n, what) {
    const c = OK.childById(childId); if (!c || !n) return;
    c.points += n;
    S.log.unshift({ d: OK.nowISO(), child: childId, what, n });
    if (S.log.length > 2000) S.log.length = 2000;
    OK.save();
  };
  OK.logExercise = function (childId, n) {
    const c = OK.childById(childId); if (!c) return;
    if (n) c.points += n;
    S.log.unshift({ d: OK.nowISO(), child: childId, what: "ex", n: n || 0 });
    if (S.log.length > 2000) S.log.length = 2000;
    OK.save();
  };
  OK.todayCount = childId => S.log.filter(l => l.child === childId && l.what === "ex" && l.d.slice(0, 10) === OK.today()).length;
  OK.weekPoints = childId => { const since = Date.now() - 7 * 864e5; return S.log.filter(l => l.child === childId && l.n > 0 && new Date(l.d) > since).reduce((a, l) => a + l.n, 0); };

  /* Statistieken per oefenitem */
  OK.stat = function (childId, key) {
    S.stats[childId] = S.stats[childId] || {};
    return S.stats[childId][key] = S.stats[childId][key] || { ok: 0, wrong: 0, t: 0, last: 0 };
  };
  OK.statsOf = childId => S.stats[childId] || {};

  /* "Kent hij het?": een item is gekend als het laatste antwoord meteen juist was (zonder tweede poging).
     Oudere statistieken hebben dat veld nog niet: daar telt "vaker juist dan fout". */
  OK.itemKnown = s => !!s && s.ok > 0 && (s.lastOk === undefined ? s.ok >= s.wrong : s.lastOk);
  OK.listProgress = function (childId, list) {
    const st = OK.statsOf(childId), unknown = [];
    list.items.forEach((it, i) => { if (!OK.itemKnown(st[`w|${list.id}|${i}|f`]) && !OK.itemKnown(st[`w|${list.id}|${i}|n`])) unknown.push(it); });
    return { total: list.items.length, known: list.items.length - unknown.length, unknown };
  };
  /* de lijsten waar een opdracht over gaat (enkel opdrachten op concrete lijsten), anders null */
  OK.taskLists = function (task) {
    if (!task || task.module !== "lijsten" || task.mode === "test" || !task.config || !Array.isArray(task.config.lists)) return null;
    const ls = S.lists.filter(l => task.config.lists.includes(l.id)); return ls.length ? ls : null;
  };
  OK.taskProgress = function (task, childId) {
    const ls = OK.taskLists(task); if (!ls) return null;
    const out = { total: 0, known: 0, unknown: [] };
    ls.forEach(l => { const p = OK.listProgress(childId, l); out.total += p.total; out.known += p.known; out.unknown = out.unknown.concat(p.unknown); });
    return out;
  };
  OK.taskTitle = function (task) {
    const ls = OK.taskLists(task); if (ls) return ls.map(l => l.name).join(", ");
    const m = OK.modules[task.module]; if (!m) return task.module;
    if (task.module === "lijsten" && task.config && Array.isArray(task.config.lists)) { const n = S.lists.filter(l => task.config.lists.includes(l.id)).map(l => l.name).join(", "); if (n) return n + (task.mode === "test" ? " (toets)" : ""); }
    return m.name + (task.mode === "test" ? " (toets)" : "");
  };
})(window.OK);
