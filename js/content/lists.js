/* Kenik - content/lists.js
   Generieke woorden- en begrippenlijsten: vraag-antwoordparen voor eender welk vak
   (Frans, Engels, WO, Nederlands, definities...). Komen uit plakken of uit een foto. */
(function (OK) {
  "use strict";
  OK.SUBJECTS = ["Frans", "Engels", "Nederlands", "Wereldoriëntatie", "Wiskunde", "Geschiedenis", "Aardrijkskunde", "Wetenschappen", "Latijn", "Andere"];
  const LANG = { Frans: "fr", Engels: "en", Latijn: "la" };
  OK.langFor = subject => LANG[subject] || "nl";

  OK.registerModule({
    id: "lijsten", order: 10, name: "Lijsten", group: "Talen en kennis", generator: false,
    schema: [
      { key: "lists", label: "Welke lijsten", type: "lists", kid: true },
      { key: "dir", label: "Richting", type: "select", kid: true, default: "q-a", options: [{ v: "q-a", l: "Nederlands zien, andere taal typen (zo wordt op school ondervraagd)" }, { v: "a-q", l: "Andere taal zien, Nederlands typen (makkelijker om te starten)" }, { v: "both", l: "Door elkaar" }] }
    ],
    defaultsFor: g => g >= 3 ? { lists: "all", dir: "q-a" } : null,
    describe: (cfg, ctx) => { const ls = OK.listsFor(ctx.child, cfg); return ls.length ? ls.length + (ls.length === 1 ? " lijst" : " lijsten") : "nog geen lijsten"; },
    pool(cfg, ctx) {
      const pool = [];
      /* een item is altijd [vraag, antwoord]: bij een taal [Nederlands, vreemde taal] */
      OK.listsFor(ctx.child, cfg).forEach(l => l.items.forEach(([q, a], i) => {
        const d = cfg.dir === "both" ? (Math.random() < .5 ? "q-a" : "a-q") : (cfg.dir || "q-a");
        const lang = l.lang || OK.langFor(l.subject);
        if (d === "q-a") pool.push({ key: `w|${l.id}|${i}|f`, module: "lijsten", kind: "text", lang, prompt: { meta: (lang === "nl" ? "Antwoord" : "Vertaal naar het " + OK.langName(lang)) + " · " + l.name, main: q }, answer: a, list: l.name });
        else pool.push({ key: `w|${l.id}|${i}|n`, module: "lijsten", kind: "text", lang: "nl", prompt: { meta: (lang === "nl" ? "Wat hoort hierbij" : "Vertaal naar het Nederlands") + " · " + l.name, main: a }, answer: q, list: l.name });
      }));
      return pool;
    }
  });
  OK.langName = c => ({ fr: "Frans", en: "Engels", la: "Latijn", nl: "Nederlands" })[c] || c;
  OK.listsFor = function (child, cfg) {
    const all = OK.state().lists.filter(l => !l.pack && OK.forChild(l, child.id));
    if (!cfg || cfg.lists === "all" || !cfg.lists) return all;
    return all.filter(l => cfg.lists.includes(l.id));
  };

  /* Plak-parser: één paar per regel, gescheiden door streepje, =, :, ; of tab. */
  OK.parseList = function (text, order) {
    return text.split(/\r?\n/).map(l => l.trim()).filter(Boolean).map(l => {
      const parts = l.split(/\t|\s+[-–=:;]\s+|;/).map(x => x.trim()).filter(Boolean);
      if (parts.length < 2) return null;
      return order === "a-q" ? [parts.slice(1).join(", "), parts[0]] : [parts[0], parts.slice(1).join(", ")];
    }).filter(Boolean);
  };

  /* Prompt voor een woordpakket spelling: enkel de woorden, letterlijk zoals ze er staan. */
  OK.packPrompt = function () {
    return `Dit is een foto van een woordpakket voor spelling uit de lagere school (Vlaanderen). Het bevat Nederlandse woorden die de leerling juist moet leren schrijven, meestal in een lijst of in kolommen, soms met een nummer, een pijltje of een lidwoord ervoor.
Geef alle woorden letterlijk zoals ze geschreven staan, met hun lidwoord of voorzetsel als dat erbij staat, in de volgorde van het blad. Verbeter niets, vertaal niets, verzin niets, laat nummering en kopteksten weg. Een uitdrukking van meerdere woorden blijft één item.
Antwoord met enkel JSON: {"title": "korte titel, bv. Woordpakket 12", "words": ["schoolreis", "de vrachtwagen", "kasteel"]}`;
  };
  /* Prompt voor de foto-import. Generiek: eender welk vak. */
  OK.photoPrompt = function (subjectHint) {
    return `Dit zijn foto's of screenshots uit een schoolboek, werkboek of cursus (Vlaanderen, België). De leerling moet de inhoud kennen voor een overhoring.${subjectHint ? " Het vak is waarschijnlijk: " + subjectHint + "." : ""}
Haal eruit:
1. Alle te leren paren als "vraag" en "antwoord". Bij een vreemde taal: "q" is het Nederlands en "a" is het woord in de vreemde taal, met lidwoord bij zelfstandige naamwoorden (le, la, l', un, une, the...). Bij begrippen of WO: "q" is het begrip of de vraag, "a" is de definitie of het antwoord, kort. Bij meerdere juiste antwoorden: scheid met een komma.
2. Werkwoorden waarvan een vervoegingstabel te zien is: infinitief, Nederlandse vertaling, taal, en de zes vormen (je, tu, il/elle, nous, vous, ils/elles voor Frans; I, you, he/she/it, we, you, they voor Engels). Staat enkel de infinitief, zet forms op null.
Verzin niets dat niet op de foto's staat. Laat opdrachten, instructies en paginanummers weg. Als een vertaling ontbreekt, geef zelf de juiste.
Twijfel je over een paar (onscherp, moeilijk leesbaar handschrift, een accent dat er misschien staat, een vertaling die je zelf aanvulde), zet er dan "check": true bij. Laat "check" weg als je zeker bent.
Antwoord met enkel JSON, zonder uitleg:
{"title": "korte titel, bv. Unité 3: la famille", "subject": "Frans|Engels|Nederlands|Wereldoriëntatie|Wiskunde|Andere", "lang": "fr|en|nl", "items": [{"q": "de hond", "a": "le chien"}, {"q": "de lat", "a": "la règle", "check": true}], "verbs": [{"inf": "chercher", "nl": "zoeken", "lang": "fr", "forms": ["cherche","cherches","cherche","cherchons","cherchez","cherchent"]}]}`;
  };
})(window.OK);

/* Werkwoorden uit de lijsten van een kind automatisch in de voorraad en in de selectie van dat kind zetten.
   Herkenning: Nederlands eindigt op -en (zoeken), Frans is één woord op -er/-ir/-re zonder lidwoord (chercher). */
(function (OK) {
  "use strict";
  OK.syncVerbsFromLists = function (child) {
    if (!child) return 0; let added = 0; const S = OK.state();
    S.lists.filter(l => !l.pack && OK.forChild(l, child.id)).forEach(l => {
      const lang = l.lang || OK.langFor(l.subject);
      l.items.forEach(([q, a]) => {
        const fr = String(a).trim().toLowerCase().replace(/^(se |s')/, "");
        /* enkel werkwoorden uit de vaste lijst: geen gokwerk, en de vervoeging klopt */
        if (lang === "fr" && OK.knownFrenchVerb && OK.knownFrenchVerb(fr)) {
          OK.stockVerb(fr); const m = child.modules["frans-werkwoorden"]; if (m) { m.verbs = m.verbs || []; if (!m.verbs.includes(fr)) { m.verbs.push(fr); added++; } }
        }
        if (lang === "en" && OK.englishCatalogue) { const en = fr.replace(/^to /, ""); if (OK.englishCatalogue().some(v => v[0] === en)) { OK.stockEnglish(en); added++; } }
      });
    });
    if (added) OK.save(); return added;
  };
})(window.OK);
