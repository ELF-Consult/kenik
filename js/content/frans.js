/* Kenik - content/frans.js
   Franse werkwoorden (présent). Regelmatige groepen worden vervoegd, onregelmatige staan vast.
   Eigen werkwoorden (ook uit foto's) worden bewaard in state.verbs. */
(function (OK) {
  "use strict";
  const PRON = ["je", "tu", "il/elle", "nous", "vous", "ils/elles"];
  function conjER(inf) { const st = inf.slice(0, -2); const nous = /g$/.test(st) ? st + "eons" : /c$/.test(st) ? st.slice(0, -1) + "çons" : st + "ons"; return [st + "e", st + "es", st + "e", nous, st + "ez", st + "ent"]; }
  function conjIR(inf) { const st = inf.slice(0, -2); return [st + "is", st + "is", st + "it", st + "issons", st + "issez", st + "issent"]; }
  function conjRE(inf) { const st = inf.slice(0, -2); return [st + "s", st + "s", st, st + "ons", st + "ez", st + "ent"]; }
  const IRR = {
    "être": ["suis", "es", "est", "sommes", "êtes", "sont"], "avoir": ["ai", "as", "a", "avons", "avez", "ont"], "aller": ["vais", "vas", "va", "allons", "allez", "vont"], "faire": ["fais", "fais", "fait", "faisons", "faites", "font"],
    "pouvoir": ["peux", "peux", "peut", "pouvons", "pouvez", "peuvent"], "vouloir": ["veux", "veux", "veut", "voulons", "voulez", "veulent"], "devoir": ["dois", "dois", "doit", "devons", "devez", "doivent"], "savoir": ["sais", "sais", "sait", "savons", "savez", "savent"],
    "prendre": ["prends", "prends", "prend", "prenons", "prenez", "prennent"], "comprendre": ["comprends", "comprends", "comprend", "comprenons", "comprenez", "comprennent"], "apprendre": ["apprends", "apprends", "apprend", "apprenons", "apprenez", "apprennent"],
    "courir": ["cours", "cours", "court", "courons", "courez", "courent"], "dormir": ["dors", "dors", "dort", "dormons", "dormez", "dorment"], "partir": ["pars", "pars", "part", "partons", "partez", "partent"], "sortir": ["sors", "sors", "sort", "sortons", "sortez", "sortent"],
    "venir": ["viens", "viens", "vient", "venons", "venez", "viennent"], "dire": ["dis", "dis", "dit", "disons", "dites", "disent"], "lire": ["lis", "lis", "lit", "lisons", "lisez", "lisent"], "écrire": ["écris", "écris", "écrit", "écrivons", "écrivez", "écrivent"],
    "voir": ["vois", "vois", "voit", "voyons", "voyez", "voient"], "mettre": ["mets", "mets", "met", "mettons", "mettez", "mettent"], "boire": ["bois", "bois", "boit", "buvons", "buvez", "boivent"], "acheter": ["achète", "achètes", "achète", "achetons", "achetez", "achètent"]
  };
  Object.assign(IRR, {
    "ouvrir": ["ouvre", "ouvres", "ouvre", "ouvrons", "ouvrez", "ouvrent"], "offrir": ["offre", "offres", "offre", "offrons", "offrez", "offrent"], "découvrir": ["découvre", "découvres", "découvre", "découvrons", "découvrez", "découvrent"],
    "servir": ["sers", "sers", "sert", "servons", "servez", "servent"], "sentir": ["sens", "sens", "sent", "sentons", "sentez", "sentent"], "mentir": ["mens", "mens", "ment", "mentons", "mentez", "mentent"],
    "tenir": ["tiens", "tiens", "tient", "tenons", "tenez", "tiennent"], "devenir": ["deviens", "deviens", "devient", "devenons", "devenez", "deviennent"], "revenir": ["reviens", "reviens", "revient", "revenons", "revenez", "reviennent"],
    "mourir": ["meurs", "meurs", "meurt", "mourons", "mourez", "meurent"], "promettre": ["promets", "promets", "promet", "promettons", "promettez", "promettent"], "permettre": ["permets", "permets", "permet", "permettons", "permettez", "permettent"],
    "connaître": ["connais", "connais", "connaît", "connaissons", "connaissez", "connaissent"], "naître": ["nais", "nais", "naît", "naissons", "naissez", "naissent"],
    "croire": ["crois", "crois", "croit", "croyons", "croyez", "croient"], "vivre": ["vis", "vis", "vit", "vivons", "vivez", "vivent"], "suivre": ["suis", "suis", "suit", "suivons", "suivez", "suivent"],
    "recevoir": ["reçois", "reçois", "reçoit", "recevons", "recevez", "reçoivent"], "rire": ["ris", "ris", "rit", "rions", "riez", "rient"], "sourire": ["souris", "souris", "sourit", "sourions", "souriez", "sourient"],
    "conduire": ["conduis", "conduis", "conduit", "conduisons", "conduisez", "conduisent"], "construire": ["construis", "construis", "construit", "construisons", "construisez", "construisent"], "traduire": ["traduis", "traduis", "traduit", "traduisons", "traduisez", "traduisent"],
    "plaire": ["plais", "plais", "plaît", "plaisons", "plaisez", "plaisent"], "peindre": ["peins", "peins", "peint", "peignons", "peignez", "peignent"], "éteindre": ["éteins", "éteins", "éteint", "éteignons", "éteignez", "éteignent"],
    "battre": ["bats", "bats", "bat", "battons", "battez", "battent"], "courir": IRR["courir"], "s'asseoir": ["m'assieds", "t'assieds", "s'assied", "nous asseyons", "vous asseyez", "s'asseyent"],
    "appeler": ["appelle", "appelles", "appelle", "appelons", "appelez", "appellent"], "jeter": ["jette", "jettes", "jette", "jetons", "jetez", "jettent"], "préférer": ["préfère", "préfères", "préfère", "préférons", "préférez", "préfèrent"],
    "espérer": ["espère", "espères", "espère", "espérons", "espérez", "espèrent"], "répéter": ["répète", "répètes", "répète", "répétons", "répétez", "répètent"], "lever": ["lève", "lèves", "lève", "levons", "levez", "lèvent"],
    "promener": ["promène", "promènes", "promène", "promenons", "promenez", "promènent"], "payer": ["paie", "paies", "paie", "payons", "payez", "paient"], "essayer": ["essaie", "essaies", "essaie", "essayons", "essayez", "essaient"],
    "envoyer": ["envoie", "envoies", "envoie", "envoyons", "envoyez", "envoient"], "nettoyer": ["nettoie", "nettoies", "nettoie", "nettoyons", "nettoyez", "nettoient"], "employer": ["emploie", "emploies", "emploie", "employons", "employez", "emploient"]
  });
  delete IRR["s'asseoir"];
  const BUILTIN = [["être", "zijn"], ["avoir", "hebben"], ["aller", "gaan"], ["faire", "doen, maken"], ["pouvoir", "kunnen"], ["vouloir", "willen"], ["devoir", "moeten"], ["savoir", "weten, kennen"], ["prendre", "nemen"], ["comprendre", "begrijpen"], ["apprendre", "leren"], ["courir", "lopen, rennen"], ["dormir", "slapen"], ["partir", "vertrekken"], ["sortir", "buitengaan"], ["venir", "komen"], ["dire", "zeggen"], ["lire", "lezen"], ["écrire", "schrijven"], ["voir", "zien"], ["mettre", "leggen, zetten"], ["boire", "drinken"], ["acheter", "kopen"], ["chercher", "zoeken"], ["manger", "eten"], ["regarder", "kijken"], ["écouter", "luisteren"], ["jouer", "spelen"], ["parler", "spreken, praten"], ["habiter", "wonen"], ["aimer", "houden van"], ["travailler", "werken"], ["chanter", "zingen"], ["donner", "geven"], ["commencer", "beginnen"], ["finir", "eindigen"], ["choisir", "kiezen"], ["attendre", "wachten"], ["répondre", "antwoorden"],
    ["arriver", "aankomen"], ["rester", "blijven"], ["entrer", "binnengaan"], ["tomber", "vallen"], ["monter", "naar boven gaan"], ["descendre", "naar beneden gaan"], ["trouver", "vinden"], ["penser", "denken"], ["demander", "vragen"], ["porter", "dragen"], ["aider", "helpen"], ["passer", "voorbijgaan, doorbrengen"], ["montrer", "tonen"], ["laisser", "laten"], ["oublier", "vergeten"], ["préparer", "voorbereiden"], ["visiter", "bezoeken"], ["téléphoner", "telefoneren"], ["dessiner", "tekenen"], ["nager", "zwemmen"], ["voyager", "reizen"], ["ranger", "opruimen"], ["changer", "veranderen"], ["lancer", "gooien"], ["placer", "plaatsen"], ["payer", "betalen"], ["essayer", "proberen"], ["étudier", "studeren"], ["crier", "roepen"], ["fermer", "sluiten"], ["ouvrir", "openen"], ["offrir", "aanbieden, cadeau doen"], ["découvrir", "ontdekken"], ["servir", "bedienen, dienen"], ["sentir", "voelen, ruiken"], ["mentir", "liegen"], ["tenir", "houden"], ["devenir", "worden"], ["revenir", "terugkomen"], ["mourir", "sterven"], ["promettre", "beloven"], ["permettre", "toelaten"], ["connaître", "kennen"], ["naître", "geboren worden"], ["croire", "geloven"], ["vivre", "leven"], ["suivre", "volgen"], ["recevoir", "ontvangen"], ["rire", "lachen"], ["sourire", "glimlachen"], ["conduire", "rijden, besturen"], ["construire", "bouwen"], ["traduire", "vertalen"], ["plaire", "bevallen"], ["peindre", "schilderen"], ["éteindre", "uitdoen"], ["battre", "slaan"], ["appeler", "roepen, noemen"], ["jeter", "weggooien"], ["préférer", "verkiezen"], ["espérer", "hopen"], ["répéter", "herhalen"], ["lever", "optillen"], ["promener", "wandelen met"], ["envoyer", "sturen"], ["nettoyer", "schoonmaken"], ["employer", "gebruiken"], ["perdre", "verliezen"], ["vendre", "verkopen"], ["entendre", "horen"], ["rendre", "teruggeven"], ["rêver", "dromen"], ["pleurer", "huilen"], ["sauter", "springen"], ["marcher", "stappen"], ["danser", "dansen"], ["cuisiner", "koken"], ["goûter", "proeven"], ["gagner", "winnen"], ["coûter", "kosten"], ["compter", "tellen"], ["rentrer", "thuiskomen"], ["retourner", "terugkeren"], ["arrêter", "stoppen"], ["tourner", "draaien"], ["pousser", "duwen"], ["tirer", "trekken"], ["remplir", "vullen"], ["réussir", "slagen"], ["grandir", "groeien"], ["rougir", "blozen"], ["réfléchir", "nadenken"], ["obéir", "gehoorzamen"], ["punir", "straffen"], ["dire", "zeggen"]].filter((v, i, a) => a.findIndex(x => x[0] === v[0]) === i)
    .map(([inf, nl]) => ({ inf, nl, forms: IRR[inf] || (inf.endsWith("er") ? conjER(inf) : inf.endsWith("ir") ? conjIR(inf) : conjRE(inf)), builtin: true }));
  const elide = (p, form) => p === "je" && /^[aeiouyâàéèêëîïôûùh]/i.test(form) ? "j'" : p;
  /* participe passé: onregelmatige vast, regelmatige afgeleid */
  const PP = { "ouvrir": "ouvert", "offrir": "offert", "découvrir": "découvert", "tenir": "tenu", "devenir": "devenu", "revenir": "revenu", "mourir": "mort", "promettre": "promis", "permettre": "permis", "connaître": "connu", "naître": "né", "croire": "cru", "vivre": "vécu", "suivre": "suivi", "recevoir": "reçu", "rire": "ri", "sourire": "souri", "conduire": "conduit", "construire": "construit", "traduire": "traduit", "plaire": "plu", "peindre": "peint", "éteindre": "éteint", "battre": "battu",
    "être": "été", "avoir": "eu", "aller": "allé", "faire": "fait", "pouvoir": "pu", "vouloir": "voulu", "devoir": "dû", "savoir": "su", "prendre": "pris", "comprendre": "compris", "apprendre": "appris", "courir": "couru", "dormir": "dormi", "partir": "parti", "sortir": "sorti", "venir": "venu", "dire": "dit", "lire": "lu", "écrire": "écrit", "voir": "vu", "mettre": "mis", "boire": "bu", "acheter": "acheté" };
  const ETRE = ["aller", "partir", "sortir", "venir", "arriver", "rester", "entrer", "tomber", "monter", "descendre", "naître", "mourir", "retourner", "rentrer", "devenir", "revenir"];
  const pp = inf => PP[inf] || (inf.endsWith("er") ? inf.slice(0, -2) + "é" : inf.endsWith("ir") ? inf.slice(0, -2) + "i" : inf.slice(0, -2) + "u");
  const AVOIR = ["ai", "as", "a", "avons", "avez", "ont"], ETRE_P = ["suis", "es", "est", "sommes", "êtes", "sont"], ALLER = ["vais", "vas", "va", "allons", "allez", "vont"];
  /* onderwerpen per persoon; bij être-werkwoorden kiezen we een mannelijk onderwerp zodat de overeenkomst eenduidig is */
  const SUBJ = [["je", "je"], ["tu", "tu"], ["il", "il/elle"], ["nous", "nous"], ["vous", "vous"], ["ils", "ils/elles"]];
  function passeCompose(v, i) { const isEtre = ETRE.includes(v.inf); const aux = (isEtre ? ETRE_P : AVOIR)[i]; let part = pp(v.inf); if (isEtre && (i === 3 || i === 5)) part += "s"; return (i === 0 && /^[aeiouéè]/.test(aux) ? "j'" : "") + aux + " " + part; }
  function imparfait(v, i) { const stem = v.inf === "être" ? "ét" : v.forms[3].replace(/ons$/, ""); return stem + ["ais", "ais", "ait", "ions", "iez", "aient"][i]; }
  const futurProche = (v, i) => ALLER[i] + " " + v.inf;
  const TENSE_NAME = { present: "présent", pc: "passé composé", imparfait: "imparfait", fp: "futur proche" };

  OK.frans = { PRON, conjER, conjIR, conjRE, IRR, elide };
  /* De voorraad van het gezin (state.verbStock: infinitieven) begint klein; de catalogus (BUILTIN) vult aan.
     Eigen werkwoorden staan in state.verbs. */
  const START = ["être", "avoir", "aller", "faire"];
  function stock() { const s = OK.state(); if (!s.verbStock) { const used = new Set(START); s.children.forEach(c => ((c.modules["frans-werkwoorden"] || {}).verbs || []).forEach(v => used.add(v))); s.verbStock = [...used]; } return s.verbStock; }
  const defOf = inf => (OK.state().verbs || []).find(v => v.inf === inf) || BUILTIN.find(b => b.inf === inf);
  OK.allVerbs = () => stock().map(defOf).filter(Boolean);
  OK.verbCatalogue = () => BUILTIN.filter(b => !stock().includes(b.inf));
  OK.knownFrenchVerb = inf => BUILTIN.some(b => b.inf === inf);
  OK.stockVerb = inf => { const st = stock(); if (!st.includes(inf)) st.push(inf); OK.save(); };
  OK.unstockVerb = inf => { const s = OK.state(); s.verbStock = stock().filter(x => x !== inf); s.verbs = (s.verbs || []).filter(v => v.inf !== inf); s.children.forEach(c => { const m = c.modules["frans-werkwoorden"]; if (m && m.verbs) m.verbs = m.verbs.filter(x => x !== inf); }); OK.save(); };
  OK.addVerb = function (inf, nl, forms) {
    inf = inf.trim().toLowerCase(); const s = OK.state(); s.verbs = s.verbs || [];
    const b = BUILTIN.find(x => x.inf === inf);
    forms = forms || (b && b.forms) || IRR[inf] || (inf.endsWith("er") ? conjER(inf) : inf.endsWith("ir") ? conjIR(inf) : inf.endsWith("re") ? conjRE(inf) : null);
    if (!forms) return null;
    if (!b || forms !== b.forms || (nl && nl !== b.nl)) { const ex = s.verbs.find(v => v.inf === inf); if (ex) { ex.nl = nl || ex.nl; ex.forms = forms; } else s.verbs.push({ inf, nl: nl || (b ? b.nl : ""), forms }); }
    OK.stockVerb(inf); return forms;
  };
  const DEFAULT_ON = { 5: ["être", "avoir", "aller", "faire", "chercher", "manger", "regarder", "jouer", "parler", "habiter", "aimer", "écouter"], 6: ["être", "avoir", "aller", "faire", "pouvoir", "vouloir", "comprendre", "courir", "chercher", "manger", "regarder", "jouer", "parler", "habiter", "aimer", "finir", "attendre"] };

  /* Groepen: zo kiest een ouder (en het kind) per soort, niet per werkwoord. "er-sp" = -er met een addertje in de stam of spelling
     (manger -> mangeons, commencer -> commençons, acheter -> achète, appeler -> appelle, payer -> paie, préférer -> préfère). */
  const GROUPS = [
    { v: "irr", l: "Onregelmatig", ex: "être, avoir, aller, faire, pouvoir, vouloir, venir, prendre, ..." },
    { v: "er", l: "-er (regelmatig)", ex: "parler, jouer, habiter, regarder, ..." },
    { v: "er-sp", l: "-er met een addertje", ex: "manger, commencer, acheter, appeler, payer, préférer, ..." },
    { v: "ir", l: "-ir (regelmatig)", ex: "finir, choisir, réussir, ..." },
    { v: "re", l: "-re (regelmatig)", ex: "attendre, répondre, vendre, ..." }
  ];
  OK.verbGroupOf = function (inf) {
    if (inf === "aller") return "irr"; /* het enige echte onregelmatige -er werkwoord */
    if (IRR[inf]) return inf.endsWith("er") ? "er-sp" : "irr";
    if (inf.endsWith("er")) return /[gc]er$/.test(inf) ? "er-sp" : "er";
    return inf.endsWith("ir") ? "ir" : inf.endsWith("re") ? "re" : "irr";
  };
  /* de basis per soort: wat in de meeste handboeken van het 5e en 6e leerjaar voorkomt; de rest is uitbreiding */
  const CORE = new Set(["être", "avoir", "aller", "faire", "pouvoir", "vouloir", "devoir", "savoir", "prendre", "venir", "dire", "lire", "écrire", "voir",
    "chercher", "regarder", "écouter", "jouer", "parler", "habiter", "aimer", "travailler", "chanter", "donner", "arriver", "rester", "trouver", "demander", "porter", "aider", "fermer", "compter",
    "manger", "commencer", "acheter", "appeler", "payer", "préférer", "nager",
    "finir", "choisir", "réussir", "grandir",
    "attendre", "répondre", "vendre", "entendre", "perdre"]);
  OK.verbIsCore = inf => CORE.has(inf);
  OK.verbGroups = () => GROUPS;
  OK.verbsInGroup = g => BUILTIN.filter(b => OK.verbGroupOf(b.inf) === g);
  /* de werkwoorden waarmee een kind oefent: de gekozen groepen + wat uit het handboek kwam (cfg.verbs) */
  OK.verbsFor = function (cfg) {
    cfg = cfg || {}; const groups = new Set(cfg.groups || []); const extra = new Set(cfg.verbs || []); const out = [], seen = new Set();
    const coreOnly = cfg.scope !== "all";
    BUILTIN.forEach(b => { if ((groups.has(OK.verbGroupOf(b.inf)) && (!coreOnly || CORE.has(b.inf)) || extra.has(b.inf)) && !seen.has(b.inf)) { seen.add(b.inf); out.push(defOf(b.inf) || b); } });
    (OK.state().verbs || []).forEach(v => { if (!seen.has(v.inf) && (extra.has(v.inf) || groups.has(OK.verbGroupOf(v.inf)))) { seen.add(v.inf); out.push(v); } });
    return out;
  };
  /* uitleg bij een addertje in de présent */
  function spNote(v, i) {
    const inf = v.inf, f = v.forms;
    if (/ger$/.test(inf) && i === 3) return `-ger: nous ${f[3]}. De e blijft staan, anders klinkt de g hard.`;
    if (/cer$/.test(inf) && i === 3) return `-cer: nous ${f[3]}. De ç houdt de c zacht.`;
    if (IRR[inf] && inf.endsWith("er")) return (i === 3 || i === 4) ? `nous ${f[3]}, vous ${f[4]}: hier blijft de stam zoals in de infinitief.` : `${inf}: in je, tu, il en ils verandert de stam (${f[0]}, ${f[5]}); in nous en vous niet (${f[3]}, ${f[4]}).`;
    return null;
  }
  OK.registerModule({
    id: "frans-werkwoorden", order: 11, name: "Franse werkwoorden", group: "Talen en kennis", generator: false,
    schema: [{ key: "groups", label: "Welke soorten werkwoorden", type: "multi", kid: true, options: GROUPS.map(g => ({ v: g.v, l: g.l, sub: g.ex })) },
      { key: "scope", label: "Hoeveel werkwoorden per soort", type: "select", options: [{ v: "core", l: "Enkel de basis (de bekendste, zoals in het handboek van het 5e en 6e)" }, { v: "all", l: "Alles (ook minder gebruikte werkwoorden)" }] },
      { key: "tenses", label: "Welke tijden", type: "multi", kid: true, options: [{ v: "present", l: "Présent" }, { v: "pc", l: "Passé composé" }, { v: "imparfait", l: "Imparfait" }, { v: "fp", l: "Futur proche (aller + infinitif)" }, { v: "inf", l: "Infinitief geven bij een vervoegde vorm" }] }],
    defaultsFor: (g, region) => (region && region.firstForeign !== "fr") ? (g >= 7 ? { groups: ["irr", "er"], tenses: ["present", "inf"] } : null)
      : g >= 7 ? { groups: ["irr", "er", "er-sp", "ir", "re"], scope: "all", tenses: ["present", "pc", "fp", "inf"] } : g >= 6 ? { groups: ["irr", "er", "er-sp"], scope: "core", tenses: ["present", "inf"] } : g >= 5 ? { groups: ["irr", "er"], scope: "core", tenses: ["present"] } : null,
    describe: cfg => { const gs = (cfg.groups || []).map(g => (GROUPS.find(x => x.v === g) || {}).l).filter(Boolean); const ex = (cfg.verbs || []).length; const n = OK.verbsFor(cfg).length; return (gs.length ? gs.join(", ").toLowerCase() : "") + (ex ? (gs.length ? " + " : "") + ex + " uit het handboek" : "") + (n ? ` (${n} werkwoorden${cfg.scope === "all" ? "" : ", basis"})` : "") + " · " + (cfg.tenses || ["present"]).filter(t => t !== "inf").map(t => TENSE_NAME[t]).join(", "); },
    pool(cfg) {
      const pool = []; const tenses = cfg.tenses && cfg.tenses.length ? cfg.tenses : ["present"];
      OK.verbsFor(cfg).forEach(v => {
        for (let i = 0; i < 6; i++) {
          const subj = SUBJ[i][0];
          const item = (tense, ans, meta) => ({ key: `v|${v.inf}|${i}|${tense}`, module: "frans-werkwoorden", kind: "text", lang: "fr", prompt: { meta: `${v.inf}${v.nl ? " · " + v.nl : ""} · ${meta}`, main: `<span class="pron">${/^j'/.test(ans) ? "" : elide(subj, ans)}</span> ____` }, answer: ans, stripPron: true, display: a => (/^j'/.test(a) ? "" : elide(subj, a) + " ") + a });
          if (tenses.includes("present")) { const note = spNote(v, i); pool.push(Object.assign(item("present", v.forms[i], "présent"), { key: `v|${v.inf}|${i}` }, note ? { explain: note } : {})); }
          if (tenses.includes("pc")) pool.push(Object.assign(item("pc", passeCompose(v, i), "passé composé"), { explain: `${ETRE.includes(v.inf) ? "Met être (en het participe past zich aan)" : "Met avoir"}: ${elide(subj, passeCompose(v, i))} ${passeCompose(v, i)}`.replace("j' j'", "j'") }));
          if (tenses.includes("imparfait")) pool.push(Object.assign(item("imparfait", imparfait(v, i), "imparfait"), { explain: `Stam van de nous-vorm (${v.forms[3]}) + uitgang: ${imparfait(v, i)}` }));
          if (tenses.includes("fp")) pool.push(Object.assign(item("fp", futurProche(v, i), "futur proche"), { explain: `aller in de présent + infinitief: ${futurProche(v, i)}` }));
        }
        if (tenses.includes("inf")) { const i = [1, 2, 3, 5][Math.floor(Math.random() * 4)]; const shown = tenses.includes("pc") && Math.random() < .4 ? passeCompose(v, i) : v.forms[i]; pool.push({ key: `v|${v.inf}|inf`, module: "frans-werkwoorden", kind: "text", lang: "fr", prompt: { meta: "Wat is de infinitief?", main: `${elide(SUBJ[i][0], shown)} <strong>${shown}</strong>` }, answer: v.inf, explain: `${shown} komt van ${v.inf}${v.nl ? " (" + v.nl + ")" : ""}.` }); }
      });
      return pool;
    }
  });
})(window.OK);
