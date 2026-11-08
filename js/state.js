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
      children: [],           // {id,name,grade,theme:{style,variant},modules:{id:config},points,streak,best,garden:{flowers,collected:[]}}
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
    const f = fresh();
    Object.keys(f).forEach(k => { if (s[k] === undefined) s[k] = f[k]; });
    Object.keys(f.settings).forEach(k => { if (s.settings[k] === undefined) s.settings[k] = f.settings[k]; });
    const oldFr = s.lists.find(l => l.id === "ex-frans"); if (oldFr && !oldFr.v3) { const f = fresh(); seed(f); const nf = f.lists.find(l => l.id === "ex-frans"); Object.assign(oldFr, nf, { children: oldFr.children }); }
    if (!s.lists.some(l => l.id === "ex-engels")) { const f = fresh(); seed(f); s.lists.push(f.lists.find(l => l.id === "ex-engels")); }
    s.children.forEach(c => { c.modules = c.modules || {}; c.garden = c.garden || { flowers: 0, collected: [] }; c.points = c.points || 0; c.streak = c.streak || 0; c.best = c.best || 0; });
  }

  /* Voorbeeldinhoud, duidelijk als voorbeeld gemarkeerd. */
  function seed(s) {
    s.lists.push({
      id: "ex-frans", name: "Voorbeeld Frans: eerste woordjes", subject: "Frans", lang: "fr", children: "all", example: true, v3: true,
      items: [["hallo, goeiedag", "bonjour"], ["dank je", "merci"], ["ja", "oui"], ["nee", "non"], ["de hond", "le chien"], ["de kat", "le chat"], ["het huis", "la maison"], ["de school", "l'école"], ["rood", "rouge"], ["blauw", "bleu"], ["één", "un"], ["twee", "deux"], ["drie", "trois"]]
    });
    s.lists.push({
      id: "ex-engels", name: "Voorbeeld Engels: eerste woordjes", subject: "Engels", lang: "en", children: "all", example: true,
      items: [["hallo", "hello"], ["dank je", "thank you"], ["ja", "yes"], ["nee", "no"], ["de hond", "the dog"], ["de kat", "the cat"], ["het huis", "the house"], ["de school", "the school"], ["rood", "red"], ["blauw", "blue"], ["één", "one"], ["twee", "two"], ["drie", "three"]]
    });
    s.lists.push({
      id: "ex-wo", name: "Voorbeeld WO: hoofdsteden van de buurlanden", subject: "Wereldoriëntatie", lang: "nl", children: "all", example: true,
      items: [["Frankrijk", "Parijs"], ["Nederland", "Amsterdam"], ["Duitsland", "Berlijn"], ["Luxemburg", "Luxemburg"], ["Verenigd Koninkrijk", "Londen"]]
    });
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
  OK.addChild = function (name, grade, theme) {
    const c = { id: OK.uid(), name, grade, theme, modules: OK.defaultModulesFor(grade), points: 0, streak: 0, best: 0, garden: { flowers: 0, collected: [] }, created: OK.nowISO() };
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
})(window.OK);
