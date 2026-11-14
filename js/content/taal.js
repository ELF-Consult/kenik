/* Kenik - content/taal.js
   Nederlands: spelling, grammatica en lezen.
   - spelling: woordpakketten (lijsten met één woord per regel), dictee met spraak, kies de juiste schrijfwijze, werkwoordspelling
   - grammatica: woordsoorten en zinsdelen aanklikken in een zin, de/het, meervoud, verkleinwoord
   - lezen: flitswoorden (woord verschijnt kort, dan typen) en begrijpend lezen met teksten uit state.texts */
(function (OK) {
  "use strict";
  const R = OK.rnd, pick = OK.pick, shuffle = OK.shuffle;
  const uniq = a => [...new Set(a)];

  /* ---------- ingebouwde woordpakketten per spellingmoeilijkheid ---------- */
  /* dictee: het woord staat op het scherm met enkel de moeilijkheid weggelaten (p _ _ w), zodat verstaan geen probleem is en de spelling de vraag blijft */
  const FOCUS = { "ei of ij": ["ei", "ij"], "au of ou": ["au", "ou"], "d of t op het einde": ["d", "t"], "dubbele medeklinker": null, "open en gesloten lettergreep": null, "ng en nk": ["ng", "nk"], "sch en schr": ["schr", "sch"], "ch of g": ["ch", "g"] };
  function gapWord(w, src) {
    const esc = x => x.replace(/</g, "&lt;"); const blank = n => "_".repeat(n);
    const f = FOCUS[src];
    if (f === null) return blank(w.length); /* dubbele medeklinker, open/gesloten lettergreep: de hele schrijfwijze is de vraag, enkel de lengte tonen */
    if (!f) { /* eigen woordpakket of onbekend: lengte tonen, klinkers open laten */ return esc(w).replace(/[aeiouy]/g, "_"); }
    if (src === "d of t op het einde") return esc(w.slice(0, -1)) + "_";
    let out = w, done = false; const n = Math.min(...f.map(g => g.length)); /* evenveel streepjes voor beide keuzes, anders verraadt de lengte het antwoord (ch of g) */
    for (const g of f) { const re = new RegExp(g, "g"); if (re.test(w)) { out = w.replace(re, blank(n)); done = true; break; } }
    return esc(done ? out : w.replace(/[aeiouy]/g, "_"));
  }
  const PACKS = {
    "ei of ij": "trein klein reis geit eiland feest plein dweil konijn tijd blij rijst wijn ijs pijn fijn kijken schrijven vrij".split(" "),
    "au of ou": "blauw pauw gauw saus kous zout mouw koud goud fout hout vrouw touw auto pauze".split(" "),
    "d of t op het einde": "hond mand tand brood goed rood paard land strand bed bord hand wind mond bad".split(" "),
    "dubbele medeklinker": "bakker kippen ballen zitten appel emmer kannen lopen bomen dikke mannen pannen letter zonnen".split(" "),
    "open en gesloten lettergreep": "bomen boom bommen molen mollen vuren vurren vallen vallei kopen koppen slapen slappen".split(" ").filter(w => w !== "vurren"),
    "ng en nk": "bang lang ring zingen bank drinken denken vink plank koning woning honger".split(" "),
    "sch en schr": "school schip schaap schrijven schrik schoen schouder schat scherp schram".split(" "),
    "ch of g": "lachen kachel licht nacht zacht acht recht dochter kuchen zucht".split(" ")
  };
  const PACK_GRADE = { 1: ["ei of ij", "au of ou", "ng en nk"], 2: ["ei of ij", "au of ou", "d of t op het einde", "ng en nk", "sch en schr"], 3: ["ei of ij", "au of ou", "d of t op het einde", "dubbele medeklinker", "open en gesloten lettergreep", "ch of g"], 4: ["dubbele medeklinker", "open en gesloten lettergreep", "ch of g", "d of t op het einde"] };

  /* fouten die kinderen echt maken, om keuzevragen te bouwen */
  function misspellings(w) {
    const out = new Set(); const add = x => { if (x && x !== w) out.add(x); };
    add(w.replace("ij", "ei")); add(w.replace("ei", "ij")); add(w.replace("au", "ou")); add(w.replace("ou", "au"));
    if (/d$/.test(w)) add(w.slice(0, -1) + "t"); if (/t$/.test(w)) add(w.slice(0, -1) + "d");
    add(w.replace(/([bdfgklmnprst])\1/, "$1")); add(w.replace(/([aeiou])([bdfgklmnprst])([aeiou])/, "$1$2$2$3"));
    add(w.replace("ch", "g")); add(w.replace(/g(?=[^e]|$)/, "ch")); add(w.replace("sch", "sg")); add(w.replace("ng", "nk")); add(w.replace("nk", "ng"));
    add(w.replace(/([aeiou])\1/, "$1")); add(w.replace(/([aeou])([bdfgklmnprst])([aeiou])/, "$1$1$2$3"));
    return [...out].filter(x => /^[a-zëéï]+$/.test(x));
  }
  const speakable = () => !!(window.speechSynthesis && window.SpeechSynthesisUtterance);
  /* de beste beschikbare Nederlandse stem: eerst Vlaams, liefst een "natural"/Google/Ellen-stem; nooit de compacte of eSpeak-stemmen */
  function bestVoice() {
    const vs = window.speechSynthesis.getVoices().filter(v => /^nl/i.test(v.lang) && !/compact|espeak/i.test(v.name));
    const score = v => (/^nl-BE/i.test(v.lang) ? 20 : 0) + (/natural|neural|premium|enhanced/i.test(v.name) ? 10 : 0) + (/google/i.test(v.name) ? 6 : 0) + (/ellen|xander|claire|fenna|colette|maarten/i.test(v.name) ? 5 : 0) + (v.localService ? 0 : 1);
    return vs.sort((a, b) => score(b) - score(a))[0] || null;
  }
  OK.speak = function (text, lang) {
    if (!speakable()) return false;
    try {
      window.speechSynthesis.cancel(); const v = bestVoice();
      /* een los woord is voor elke stem het moeilijkst te verstaan: eerst traag het woord, dan in een korte zin, dan nog eens */
      const parts = /\s/.test(text) ? [[text, 0.85]] : [[text, 0.75], [`Schrijf: ${text}.`, 0.85], [text, 0.7]];
      parts.forEach(([t, rate], i) => { const u = new SpeechSynthesisUtterance(t); u.lang = lang || (v ? v.lang : "nl-BE"); u.rate = rate; if (v) u.voice = v; if (i) u.volume = 1; window.speechSynthesis.speak(u); });
      return true;
    } catch (e) { return false; }
  };

  /* ---------- werkwoordspelling ---------- */
  // [infinitief, stam, zwak? (t of d), voltooid deelwoord]
  const VERBS = [["worden", "word", null, "geworden"], ["vinden", "vind", null, "gevonden"], ["fietsen", "fiets", "t", "gefietst"], ["praten", "praat", "t", "gepraat"], ["antwoorden", "antwoord", "d", "geantwoord"], ["branden", "brand", "d", "gebrand"], ["landen", "land", "d", "geland"], ["rijden", "rijd", null, "gereden"], ["bieden", "bied", null, "geboden"], ["lachen", "lach", "t", "gelachen"], ["wachten", "wacht", "t", "gewacht"], ["zetten", "zet", "t", "gezet"], ["werken", "werk", "t", "gewerkt"], ["spelen", "speel", "d", "gespeeld"], ["leren", "leer", "d", "geleerd"], ["bouwen", "bouw", "d", "gebouwd"], ["reizen", "reis", "d", "gereisd"], ["verhuizen", "verhuis", "d", "verhuisd"], ["geloven", "geloof", "d", "geloofd"], ["durven", "durf", "d", "gedurfd"], ["maken", "maak", "t", "gemaakt"], ["koken", "kook", "t", "gekookt"], ["hopen", "hoop", "t", "gehoopt"], ["dansen", "dans", "t", "gedanst"], ["missen", "mis", "t", "gemist"], ["kussen", "kus", "t", "gekust"], ["redden", "red", "d", "gered"], ["houden", "houd", null, "gehouden"], ["vergeten", "vergeet", null, "vergeten"], ["gebeuren", "gebeur", "d", "gebeurd"], ["ontmoeten", "ontmoet", "t", "ontmoet"], ["betalen", "betaal", "d", "betaald"]];
  const SUBJ = [["ik", 1], ["jij", 2], ["je", 2], ["hij", 3], ["zij", 3], ["mijn zus", 3], ["de buurman", 3], ["het kind", 3], ["wij", 4], ["jullie", 4], ["de kinderen", 4], ["mijn ouders", 4]];
  function present(stem, person, inverted) {
    if (person === 1) return stem; if (person === 4) return null;
    if (person === 2 && inverted) return stem;
    return /t$/.test(stem) ? stem : stem + "t";
  }
  function past(v, plural) { const [inf, stem, weak] = v; if (!weak) return null; const dubbel = /([aeiou])\1$/.test(stem) ? stem : stem; let s = stem; if (/^(.*)([^aeiou])\2$/.test(inf.slice(0, -2))) s = inf.slice(0, -2); // zetten -> zette
    if (/z$/.test(s)) s = s.slice(0, -1) + "z"; const ending = (weak === "t" ? "te" : "de") + (plural ? "n" : ""); // reizen -> reisde
    const base = inf.slice(0, -2); let past = /(s|f)$/.test(stem) && /(z|v)en$/.test(inf) ? stem : base; if (/^(.*)([^aeiou])\2$/.test(base)) past = base; // dubbele medeklinker blijft: zetten -> zette
    if (!/^(.*)([^aeiou])\2$/.test(base) && /(z|v)en$/.test(inf)) past = stem; else if (!/^(.*)([^aeiou])\2$/.test(base)) past = base.replace(/([aeiou])\1([^aeiou])$/, "$1$1$2");
    // vereenvoudigd: zwakke verleden tijd = infinitief zonder -en (+ s/f-regel) + te/de
    let st = inf.slice(0, -2); if (/(z|v)en$/.test(inf)) st = stem; if (!/([^aeiou])\1$/.test(st) && /^[^aeiou]*[aeiou][^aeiou]$/.test(st) === false && /[aeiou][^aeiou]$/.test(st) && !/[aeiou]{2}[^aeiou]$/.test(st) && stem.length > st.length) st = stem;
    return st + ending; }
  function pastForm(v, plural) { const [inf, stem, weak] = v; if (!weak) return null;
    // regel: verleden tijd = ik-vorm + te/de (+n). Bij zetten/redden/missen/kussen: dubbele medeklinker (zette, redde, miste, kuste).
    let st = stem; const base = inf.slice(0, -2); if (/([^aeiou])\1$/.test(base)) st = base.slice(0, -1); // zett -> zet, mis
    return st + (weak === "t" ? "te" : "de") + (plural ? "n" : ""); }
  function dtPool(n) {
    const out = [];
    for (let i = 0; i < n; i++) {
      const v = pick(VERBS); const [inf, stem, weak, vd] = v; const t = pick(["pres", "pres", "inv", "past", "vd"]);
      if (t === "pres") { const [s, p] = pick(SUBJ); const form = p === 4 ? inf : present(stem, p, false); out.push({ key: "sp|dt|pres", module: "spelling", kind: "text", lang: "nl", prompt: { meta: "Werkwoordspelling · tegenwoordige tijd", main: `${s[0].toUpperCase() + s.slice(1)} ____ (${inf}) elke dag.` }, answer: form, explain: p === 4 ? "Meervoud: hele werkwoord." : p === 1 ? "Ik-vorm: de stam." : p === 2 ? "Jij-vorm na het onderwerp: stam + t." : "Hij/zij-vorm: stam + t (ook als de stam al op een d eindigt)." }); }
      else if (t === "inv") { const form = present(stem, 2, true); out.push({ key: "sp|dt|inv", module: "spelling", kind: "text", lang: "nl", prompt: { meta: "Werkwoordspelling · jij achter het werkwoord", main: `____ (${inf}) jij dat morgen?` }, answer: form, explain: "Staat jij achter het werkwoord, dan valt de t weg: alleen de stam." }); }
      else if (t === "past") { if (!weak) { i--; continue; } const [s, p] = pick(SUBJ); const form = pastForm(v, p === 4); out.push({ key: "sp|dt|past", module: "spelling", kind: "text", lang: "nl", prompt: { meta: "Werkwoordspelling · verleden tijd", main: `Gisteren ____ (${inf}) ${s} de hele tijd.` }, answer: form, explain: `'t kofschip: de stam eindigt op ${weak === "t" ? "een letter uit 't kofschip, dus -te" : "een andere letter, dus -de"}${p === 4 ? ", meervoud -n" : ""}.` }); }
      else { out.push({ key: "sp|dt|vd", module: "spelling", kind: "text", lang: "nl", prompt: { meta: "Werkwoordspelling · voltooid deelwoord", main: `Ze hebben gisteren ____ (${inf}).` }, answer: vd, explain: weak ? `Voltooid deelwoord: ge + stam + ${weak} ('t kofschip). Nooit -dt.` : "Sterk werkwoord: het voltooid deelwoord moet je kennen." }); }
    }
    return out;
  }

  OK.spellingLists = child => OK.state().lists.filter(l => l.pack && OK.forChild(l, child.id));
  OK.registerModule({
    id: "spelling", order: 20, name: "Spelling", group: "Nederlands", generator: true,
    schema: [
      { key: "types", label: "Oefenvormen", type: "multi", kid: true, options: [{ v: "dictee", l: "Dictee: luister en typ het woord" }, { v: "kies", l: "Kies de juiste schrijfwijze" }, { v: "dt", l: "Werkwoordspelling (d/t, verleden tijd, voltooid deelwoord)" }] },
      { key: "packs", label: "Ingebouwde spellingregels", type: "multi", options: Object.keys(PACKS).map(k => ({ v: k, l: k })) },
      { key: "own", label: "Woordpakketten van school", type: "packs" }
    ],
    defaultsFor: g => g <= 4 ? { types: ["dictee", "kies"], packs: PACK_GRADE[Math.max(1, g)] || PACK_GRADE[4], own: "all" } : g <= 8 ? { types: ["dictee", "kies", "dt"], packs: ["open en gesloten lettergreep", "dubbele medeklinker"], own: "all" } : null,
    describe: (cfg, ctx) => { const n = (cfg.packs || []).length + OK.spellingLists(ctx.child).filter(l => cfg.own === "all" || !cfg.own || cfg.own.includes(l.id)).length; return `${n} pakket${n === 1 ? "" : "ten"}${(cfg.types || []).includes("dt") ? " · werkwoorden" : ""}`; },
    pool(cfg, ctx) {
      const types = cfg.types && cfg.types.length ? cfg.types : ["kies"]; const out = [];
      let words = []; (cfg.packs || []).forEach(k => { (PACKS[k] || []).forEach(w => words.push({ w, src: k })); });
      OK.spellingLists(ctx.child).filter(l => cfg.own === "all" || !cfg.own || (cfg.own || []).includes(l.id)).forEach(l => l.items.forEach(([w]) => words.push({ w: w.toLowerCase(), src: l.name })));
      words = uniq(words.map(x => JSON.stringify(x))).map(x => JSON.parse(x));
      const canSpeak = speakable();
      words.forEach(({ w, src }) => {
        if (types.includes("dictee") && canSpeak) out.push({ key: `sp|d|${w}`, module: "spelling", kind: "text", lang: "nl", speak: w, prompt: { meta: "Dictee · " + src, main: `<div class="gapword">${gapWord(w, src)}</div><button class="btn ghost speak-btn" type="button" data-speak="${w}">🔊 Luister nog eens</button>` }, answer: w, exactText: true, explain: `Het woord was: ${w}` });
        if (types.includes("kies")) { const wrong = shuffle(misspellings(w)).slice(0, 3); if (wrong.length >= 2) out.push({ key: `sp|k|${w}`, module: "spelling", kind: "choice", prompt: { meta: "Welke is juist geschreven? · " + src }, answer: w, choices: shuffle([w].concat(wrong)), explain: `Juist is: ${w}` }); }
      });
      if (types.includes("dt")) out.push(...dtPool(Math.max(6, ctx.n)));
      if (types.includes("dictee") && !canSpeak && !types.includes("kies") && words.length) out.push(...words.slice(0, ctx.n).map(({ w, src }) => { const wrong = shuffle(misspellings(w)).slice(0, 3); return { key: `sp|k|${w}`, module: "spelling", kind: "choice", prompt: { meta: "Welke is juist? (geen spraak op dit toestel) · " + src }, answer: w, choices: shuffle([w].concat(wrong)) }; }));
      return out;
    }
  });

  /* ---------- grammatica ---------- */
  // zinnen: woorden met woordsoort; pv = index persoonsvorm, ow = indices onderwerp
  // n zelfst. nw, ww werkwoord, bn bijv. nw, lw lidwoord, vnw voornaamwoord, vz voorzetsel, bw bijwoord, tw telwoord, vw voegwoord
  const S = (txt, tags, pv, ow) => ({ words: txt.split(" "), tags: tags.split(" "), pv, ow });
  const SENTENCES = [
    S("De hond loopt in de tuin", "lw n ww vz lw n", 2, [0, 1]),
    S("Mijn zus leest een spannend boek", "vnw n ww lw bn n", 2, [0, 1]),
    S("Gisteren fietsten wij naar school", "bw ww vnw vz n", 1, [2]),
    S("De kleine kat slaapt op de bank", "lw bn n ww vz lw n", 3, [0, 1, 2]),
    S("Opa drinkt elke ochtend koffie", "n ww vnw n n", 1, [0]),
    S("Wij eten vanavond pizza", "vnw ww bw n", 1, [0]),
    S("De kinderen spelen buiten", "lw n ww bw", 2, [0, 1]),
    S("Morgen gaat de juf naar Parijs", "bw ww lw n vz n", 1, [2, 3]),
    S("Het rode potlood ligt onder de tafel", "lw bn n ww vz lw n", 3, [0, 1, 2]),
    S("Zij zingt een mooi lied", "vnw ww lw bn n", 1, [0]),
    S("De bakker verkoopt vers brood", "lw n ww bn n", 2, [0, 1]),
    S("In de zomer zwemmen we in de zee", "vz lw n ww vnw vz lw n", 3, [4]),
    S("Drie vogels zitten op het dak", "tw n ww vz lw n", 2, [0, 1]),
    S("Mijn broer heeft een nieuwe fiets", "vnw n ww lw bn n", 2, [0, 1]),
    S("De leerlingen luisteren aandachtig", "lw n ww bw", 2, [0, 1]),
    S("Papa kookt vandaag soep", "n ww bw n", 1, [0]),
    S("De trein vertrekt om acht uur", "lw n ww vz tw n", 2, [0, 1]),
    S("Jullie wachten geduldig op de bus", "vnw ww bw vz lw n", 1, [0]),
    S("Het meisje tekent een grote boom", "lw n ww lw bn n", 2, [0, 1]),
    S("Straks regent het", "bw ww vnw", 1, [2]),
    S("De oude man wandelt langzaam", "lw bn n ww bw", 3, [0, 1, 2]),
    S("Wij hebben gisteren hard gewerkt", "vnw ww bw bw ww", 1, [0]),
    S("De zon schijnt fel", "lw n ww bw", 2, [0, 1]),
    S("Mijn vrienden komen zaterdag", "vnw n ww n", 2, [0, 1]),
    S("De boer melkt de koeien", "lw n ww lw n", 2, [0, 1]),
    S("Ik lees graag stripverhalen", "vnw ww bw n", 1, [0]),
    S("Twee eenden zwemmen in de vijver", "tw n ww vz lw n", 2, [0, 1]),
    S("De koning draagt een gouden kroon", "lw n ww lw bn n", 2, [0, 1]),
    S("Vorige week bezochten we het museum", "bn n ww vnw lw n", 2, [3]),
    S("De kleuters knutselen een kaart", "lw n ww lw n", 2, [0, 1])
  ];
  const TAGNAME = { n: "zelfstandig naamwoord", ww: "werkwoord", bn: "bijvoeglijk naamwoord", lw: "lidwoord", vnw: "voornaamwoord", vz: "voorzetsel", bw: "bijwoord", tw: "telwoord", vw: "voegwoord" };
  const DEHET = [["hond", "de"], ["huis", "het"], ["boek", "het"], ["tafel", "de"], ["meisje", "het"], ["jongen", "de"], ["raam", "het"], ["deur", "de"], ["fiets", "de"], ["paard", "het"], ["kind", "het"], ["school", "de"], ["bos", "het"], ["boom", "de"], ["water", "het"], ["appel", "de"], ["brood", "het"], ["kast", "de"], ["bed", "het"], ["stoel", "de"], ["potlood", "het"], ["auto", "de"], ["ei", "het"], ["bloem", "de"], ["feest", "het"], ["straat", "de"], ["dorp", "het"], ["stad", "de"], ["mes", "het"], ["lepel", "de"], ["papier", "het"], ["zon", "de"], ["licht", "het"], ["dier", "het"], ["vogel", "de"], ["konijn", "het"], ["muis", "de"], ["varken", "het"], ["schaap", "het"], ["geit", "de"]];
  const PLURAL = [["hond", "honden"], ["kind", "kinderen"], ["ei", "eieren"], ["boek", "boeken"], ["tafel", "tafels"], ["stad", "steden"], ["schip", "schepen"], ["dag", "dagen"], ["glas", "glazen"], ["huis", "huizen"], ["muis", "muizen"], ["boom", "bomen"], ["appel", "appels"], ["auto", "auto's"], ["foto", "foto's"], ["baby", "baby's"], ["kalf", "kalveren"], ["blad", "bladeren"], ["lam", "lammeren"], ["pad", "paden"], ["bed", "bedden"], ["kat", "katten"], ["raam", "ramen"], ["weg", "wegen"], ["brief", "brieven"], ["duif", "duiven"], ["pen", "pennen"], ["school", "scholen"], ["vriend", "vrienden"], ["oom", "ooms"], ["museum", "musea, museums"], ["koe", "koeien"], ["vlo", "vlooien"], ["zee", "zeeën"], ["idee", "ideeën"]];
  const DIMIN = [["hond", "hondje"], ["boom", "boompje"], ["bloem", "bloempje"], ["kind", "kindje"], ["ring", "ringetje"], ["bal", "balletje"], ["pan", "pannetje"], ["auto", "autootje"], ["foto", "fotootje"], ["raam", "raampje"], ["stoel", "stoeltje"], ["tafel", "tafeltje"], ["kat", "katje"], ["vis", "visje"], ["jongen", "jongetje"], ["koning", "koninkje"], ["woning", "woninkje"], ["bus", "busje"], ["mus", "musje"], ["ei", "eitje"], ["kous", "kousje"], ["ster", "sterretje"], ["weg", "weggetje"], ["brug", "bruggetje"], ["paraplu", "parapluutje"]];

  /* Nederlandse werkwoorden met alle vormen: [infinitief, hij-vorm, ovt enkelvoud, ovt meervoud, voltooid deelwoord, hulpwerkwoord] */
  const NLV = [["lopen", "loopt", "liep", "liepen", "gelopen", "hebben", "naar school"], ["eten", "eet", "at", "aten", "gegeten", "hebben", "een appel"], ["gaan", "gaat", "ging", "gingen", "gegaan", "zijn", "naar huis"], ["komen", "komt", "kwam", "kwamen", "gekomen", "zijn", "te laat"], ["zien", "ziet", "zag", "zagen", "gezien", "hebben", "een vogel"], ["lezen", "leest", "las", "lazen", "gelezen", "hebben", "een boek"], ["schrijven", "schrijft", "schreef", "schreven", "geschreven", "hebben", "een brief"], ["drinken", "drinkt", "dronk", "dronken", "gedronken", "hebben", "water"], ["vinden", "vindt", "vond", "vonden", "gevonden", "hebben", "een schat"], ["spreken", "spreekt", "sprak", "spraken", "gesproken", "hebben", "Frans"], ["nemen", "neemt", "nam", "namen", "genomen", "hebben", "de bus"], ["geven", "geeft", "gaf", "gaven", "gegeven", "hebben", "een cadeau"], ["slapen", "slaapt", "sliep", "sliepen", "geslapen", "hebben", "heel lang"], ["vallen", "valt", "viel", "vielen", "gevallen", "zijn", "van de fiets"], ["rijden", "rijdt", "reed", "reden", "gereden", "hebben", "naar zee"], ["zwemmen", "zwemt", "zwom", "zwommen", "gezwommen", "hebben", "in het meer"], ["zingen", "zingt", "zong", "zongen", "gezongen", "hebben", "een lied"], ["springen", "springt", "sprong", "sprongen", "gesprongen", "hebben", "heel hoog"], ["kopen", "koopt", "kocht", "kochten", "gekocht", "hebben", "brood"], ["denken", "denkt", "dacht", "dachten", "gedacht", "hebben", "aan oma"], ["brengen", "brengt", "bracht", "brachten", "gebracht", "hebben", "de post"], ["zoeken", "zoekt", "zocht", "zochten", "gezocht", "hebben", "de sleutel"], ["zeggen", "zegt", "zei", "zeiden", "gezegd", "hebben", "niets"], ["weten", "weet", "wist", "wisten", "geweten", "hebben", "het antwoord"], ["hebben", "heeft", "had", "hadden", "gehad", "hebben", "een hond"], ["zijn", "is", "was", "waren", "geweest", "zijn", "thuis"], ["doen", "doet", "deed", "deden", "gedaan", "hebben", "de afwas"], ["staan", "staat", "stond", "stonden", "gestaan", "hebben", "in de rij"], ["blijven", "blijft", "bleef", "bleven", "gebleven", "zijn", "thuis"], ["beginnen", "begint", "begon", "begonnen", "begonnen", "zijn", "op tijd"], ["vliegen", "vliegt", "vloog", "vlogen", "gevlogen", "hebben", "naar Spanje"], ["kijken", "kijkt", "keek", "keken", "gekeken", "hebben", "naar tv"], ["werken", "werkt", "werkte", "werkten", "gewerkt", "hebben", "hard"], ["spelen", "speelt", "speelde", "speelden", "gespeeld", "hebben", "buiten"], ["fietsen", "fietst", "fietste", "fietsten", "gefietst", "hebben", "naar school"], ["maken", "maakt", "maakte", "maakten", "gemaakt", "hebben", "een tekening"], ["wonen", "woont", "woonde", "woonden", "gewoond", "hebben", "in Leuven"], ["leren", "leert", "leerde", "leerden", "geleerd", "hebben", "Frans"], ["praten", "praat", "praatte", "praatten", "gepraat", "hebben", "met de juf"], ["wachten", "wacht", "wachtte", "wachtten", "gewacht", "hebben", "op de bus"], ["bouwen", "bouwt", "bouwde", "bouwden", "gebouwd", "hebben", "een hut"], ["lachen", "lacht", "lachte", "lachten", "gelachen", "hebben", "luid"]];
  OK.dutchVerbs = () => NLV;
  const SUBJ_S = ["hij", "zij", "mijn zus", "de buurman", "het kind", "opa"], SUBJ_P = ["wij", "de kinderen", "mijn ouders", "de meisjes", "de jongens"];
  const REST = ["elke dag", "in de tuin", "na school", "heel graag", "op zaterdag", "bij oma", "in de klas", "tot laat", "met plezier", "in de zomer"];
  const TENSES = { ott: "tegenwoordige tijd", ovt: "verleden tijd", vtt: "voltooid tegenwoordige tijd", vvt: "voltooid verleden tijd" };
  function form(v, tense, plural) {
    const [inf, hij, ovt, ovtMv, vd, aux] = v;
    if (tense === "ott") return plural ? inf : hij;                           // wij lopen / hij loopt
    if (tense === "ovt") return plural ? ovtMv : ovt;
    const h = aux === "zijn" ? (tense === "vtt" ? (plural ? "zijn" : "is") : (plural ? "waren" : "was")) : (tense === "vtt" ? (plural ? "hebben" : "heeft") : (plural ? "hadden" : "had"));
    return `${h} ${vd}`;
  }
  const cap = s => s[0].toUpperCase() + s.slice(1);
  function tensePool(types, n) {
    const out = [];
    for (let i = 0; i < n; i++) {
      const v = pick(NLV), plural = Math.random() < .35, subj = pick(plural ? SUBJ_P : SUBJ_S), rest = v[6] || pick(REST);
      const t = pick(types);
      if (t === "tijd-herken") { const tense = pick(Object.keys(TENSES)); out.push({ key: "gr|tijd|" + tense, module: "grammatica", kind: "choice", prompt: { meta: "In welke tijd staat deze zin?", main: `${cap(subj)} ${form(v, tense, plural)} ${rest}.` }, answer: TENSES[tense], choices: shuffle(Object.values(TENSES)), explain: `${TENSES[tense]}: "${form(v, tense, plural)}"` }); }
      else if (t === "tijd-omzet") { const from = pick(["ott", "ovt"]), to = from === "ott" ? "ovt" : "ott"; out.push({ key: "gr|omzet|" + to, module: "grammatica", kind: "text", lang: "nl", prompt: { meta: `Zet in de ${TENSES[to]}`, main: `${cap(subj)} ${form(v, from, plural)} ${rest}. → ${cap(subj)} ____ ${rest}.` }, answer: form(v, to, plural), explain: `${cap(subj)} ${form(v, to, plural)} ${rest}. (${TENSES[to]} van ${v[0]})` }); }
      else if (t === "voltooid") { const to = pick(["vtt", "vvt"]); out.push({ key: "gr|volt|" + to, module: "grammatica", kind: "text", lang: "nl", prompt: { meta: `Zet in de ${TENSES[to]} (hulpwerkwoord + voltooid deelwoord)`, main: `${cap(subj)} ${form(v, "ott", plural)} ${rest}. → ${cap(subj)} ____ ${rest}.` }, answer: form(v, to, plural), explain: `${cap(subj)} ${form(v, to, plural)} ${rest}. Het hulpwerkwoord van ${v[0]} is ${v[5]}.` }); }
      else { const tense = pick(["ott", "ovt", "vtt"]); const shown = form(v, tense, plural); out.push({ key: "gr|inf", module: "grammatica", kind: "text", lang: "nl", prompt: { meta: "Wat is het hele werkwoord (de infinitief)?", main: `${cap(subj)} <strong>${shown}</strong> ${rest}.` }, answer: v[0], explain: `${shown} komt van ${v[0]}.` }); }
    }
    return out;
  }

  OK.registerModule({
    id: "grammatica", order: 21, name: "Grammatica", group: "Nederlands", generator: true,
    schema: [{ key: "types", label: "Oefenvormen", type: "multi", kid: true, options: [{ v: "pv", l: "Klik op de persoonsvorm" }, { v: "ow", l: "Klik op het onderwerp" }, { v: "ws-klik", l: "Klik op een woordsoort (werkwoord, lidwoord...)" }, { v: "ws", l: "Welke woordsoort is dit woord?" }, { v: "dehet", l: "De of het" }, { v: "mv", l: "Meervoud" }, { v: "verkl", l: "Verkleinwoord" }, { v: "tijd-herken", l: "Werkwoordstijd herkennen (tegenwoordige, verleden, voltooid...)" }, { v: "tijd-omzet", l: "Zet om: tegenwoordige ↔ verleden tijd" }, { v: "voltooid", l: "Voltooid tegenwoordige en voltooid verleden tijd" }, { v: "infinitief", l: "Het hele werkwoord (infinitief) geven" }] }],
    defaultsFor: g => g <= 2 ? { types: ["dehet", "mv"] } : g === 3 ? { types: ["dehet", "mv", "verkl", "ws-klik"] } : g === 4 ? { types: ["pv", "ws-klik", "ws", "mv", "verkl", "tijd-omzet", "infinitief"] } : g <= 8 ? { types: ["pv", "ow", "ws-klik", "ws", "mv", "tijd-herken", "tijd-omzet", "voltooid", "infinitief"] } : null,
    describe: cfg => (cfg.types || []).length + " oefenvormen",
    pool(cfg, ctx) {
      const types = cfg.types && cfg.types.length ? cfg.types : ["dehet"]; const out = [];
      const tenseTypes = types.filter(t => ["tijd-herken", "tijd-omzet", "voltooid", "infinitief"].includes(t)), other = types.filter(t => !tenseTypes.includes(t));
      if (tenseTypes.length) out.push(...tensePool(tenseTypes, Math.ceil(ctx.n * 2 * tenseTypes.length / types.length)));
      for (let i = 0; i < ctx.n * 2 * other.length / types.length; i++) {
        const t = pick(other);
        if (t === "pv" || t === "ow" || t === "ws-klik") {
          const z = pick(SENTENCES);
          if (t === "pv") out.push({ key: "gr|pv", module: "grammatica", kind: "words", words: z.words, prompt: { meta: "Klik op de persoonsvorm" }, answer: String(z.pv), explain: `De persoonsvorm is "${z.words[z.pv]}": dat woord verandert als je de zin in een andere tijd zet.` });
          else if (t === "ow") out.push({ key: "gr|ow", module: "grammatica", kind: "words", words: z.words, multi: true, prompt: { meta: "Klik op het onderwerp (alle woorden ervan)" }, answer: z.ow.join(","), explain: `Het onderwerp is "${z.ow.map(k => z.words[k]).join(" ")}": wie of wat ${z.words[z.pv]}?` });
          else { const tags = uniq(z.tags).filter(tg => ["ww", "lw", "n", "bn", "vz", "vnw"].includes(tg)); const tg = pick(tags); const idx = z.tags.map((x, k) => x === tg ? k : -1).filter(k => k >= 0); out.push({ key: "gr|wsk|" + tg, module: "grammatica", kind: "words", words: z.words, multi: idx.length > 1, prompt: { meta: `Klik op ${idx.length > 1 ? "alle " + TAGNAME[tg].replace("woord", "woorden").replace("naamwoorden", "naamwoorden") : "het " + TAGNAME[tg]}` }, answer: idx.join(","), explain: `${TAGNAME[tg][0].toUpperCase() + TAGNAME[tg].slice(1)}: ${idx.map(k => z.words[k]).join(", ")}` }); }
        } else if (t === "ws") { const z = pick(SENTENCES); const k = R(0, z.words.length - 1); const tg = z.tags[k]; const ch = shuffle(uniq([TAGNAME[tg]].concat(shuffle(Object.values(TAGNAME)).slice(0, 5))).slice(0, 4)); if (!ch.includes(TAGNAME[tg])) ch[0] = TAGNAME[tg]; out.push({ key: "gr|ws|" + tg, module: "grammatica", kind: "choice", prompt: { meta: "Welke woordsoort is het vetgedrukte woord?", main: z.words.map((w, j) => j === k ? `<strong>${w}</strong>` : w).join(" ") }, answer: TAGNAME[tg], choices: shuffle(ch) }); }
        else if (t === "dehet") { const [w, a] = pick(DEHET); out.push({ key: `gr|dh|${w}`, module: "grammatica", kind: "choice", prompt: { meta: "De of het?", main: `___ ${w}` }, answer: a, choices: ["de", "het"], explain: `${a} ${w}` }); }
        else if (t === "mv") { const [w, a] = pick(PLURAL); out.push({ key: `gr|mv|${w}`, module: "grammatica", kind: "text", lang: "nl", prompt: { meta: "Meervoud", main: `één ${w}, twee ____` }, answer: a, explain: `twee ${OK.alts(a)[0]}` }); }
        else { const [w, a] = pick(DIMIN); out.push({ key: `gr|vk|${w}`, module: "grammatica", kind: "text", lang: "nl", prompt: { meta: "Verkleinwoord", main: `een kleine ${w} is een ____` }, answer: a, explain: `een ${a}` }); }
      }
      return uniq(out.map(o => JSON.stringify(o))).map(x => JSON.parse(x));
    }
  });

  /* ---------- lezen ---------- */
  const FLITS = { 1: "ik en de maan vis boom roos pen kip bal hok sok mes vuur kast raam".split(" "), 2: "fiets school konijn boterham ridder kasteel winter zomer appel sleutel muziek olifant".split(" "), 3: "vrachtwagen tandenborstel bibliotheek speelplaats verjaardag chocolade ziekenhuis schoolreis".split(" ") };
  OK.registerModule({
    id: "lezen", order: 22, name: "Lezen", group: "Nederlands", generator: true,
    schema: [{ key: "types", label: "Oefenvormen", type: "multi", kid: true, options: [{ v: "flits", l: "Flitswoorden: lees snel en typ het woord" }, { v: "begrip", l: "Begrijpend lezen: tekst met vragen" }] },
      { key: "flitsTijd", label: "Hoe lang verschijnt een flitswoord", type: "select", default: 1500, options: [{ v: 3000, l: "3 seconden" }, { v: 1500, l: "1,5 seconde" }, { v: 800, l: "0,8 seconde" }, { v: 400, l: "0,4 seconde" }] },
      { key: "niveau", label: "Flitswoorden", type: "select", default: 2, options: [{ v: 1, l: "korte woorden" }, { v: 2, l: "gewone woorden" }, { v: 3, l: "lange woorden" }] }],
    defaultsFor: g => g === 1 ? { types: ["flits"], flitsTijd: 3000, niveau: 1 } : g === 2 ? { types: ["flits", "begrip"], flitsTijd: 1500, niveau: 2 } : g <= 4 ? { types: ["flits", "begrip"], flitsTijd: 800, niveau: 3 } : g <= 8 ? { types: ["begrip"], flitsTijd: 800, niveau: 3 } : null,
    describe: (cfg, ctx) => (cfg.types || []).map(t => t === "flits" ? "flitswoorden" : `${(OK.state().texts || []).filter(x => OK.forChild(x, ctx.child.id)).length} teksten`).join(", "),
    pool(cfg, ctx) {
      const types = cfg.types && cfg.types.length ? cfg.types : ["flits"]; const out = [];
      if (types.includes("flits")) { const words = FLITS[+cfg.niveau || 2].concat((OK.spellingLists(ctx.child).flatMap(l => l.items.map(x => x[0])))); shuffle(words.slice()).slice(0, ctx.n).forEach(w => out.push({ key: `lz|f|${w}`, module: "lezen", kind: "text", lang: "nl", flash: { word: w, ms: +cfg.flitsTijd || 1500 }, prompt: { meta: "Lees het woord snel, het verdwijnt" }, answer: w, explain: `Het woord was: ${w}` })); }
      if (types.includes("begrip")) (OK.state().texts || []).filter(x => OK.forChild(x, ctx.child.id)).forEach(tx => tx.questions.forEach((q, i) => out.push({ key: `lz|b|${tx.id}|${i}`, module: "lezen", kind: "choice", prompt: { meta: "Lees de tekst en beantwoord de vraag · " + tx.title, main: `<div class="leestekst"><h3>${tx.title}</h3>${tx.text.split(/\n+/).map(p => `<p>${p}</p>`).join("")}</div><p class="vraag">${q.q}</p>` }, answer: q.a, choices: shuffle(q.choices.slice()), explain: q.why || "" })));
      return out;
    }
  });
})(window.OK);
