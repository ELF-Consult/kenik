/* Kenik - content/engels.js
   Engelse werkwoorden: to be en to have, present simple, past simple (regelmatig en onregelmatig), present continuous, infinitief.
   Woordjes Engels zitten in Lijsten; dit is enkel vervoegen. */
(function (OK) {
  "use strict";
  const pick = OK.pick, shuffle = OK.shuffle, R = OK.rnd;
  // [infinitief, past simple, past participle, nederlands, zinsdeel]
  const V = [["go", "went", "gone", "gaan", "to school"], ["eat", "ate", "eaten", "eten", "an apple"], ["see", "saw", "seen", "zien", "a bird"], ["read", "read", "read", "lezen", "a book"], ["write", "wrote", "written", "schrijven", "a letter"], ["drink", "drank", "drunk", "drinken", "water"], ["take", "took", "taken", "nemen", "the bus"], ["give", "gave", "given", "geven", "a present"], ["sleep", "slept", "slept", "slapen", "very long"], ["run", "ran", "run", "lopen, rennen", "in the park"], ["swim", "swam", "swum", "zwemmen", "in the sea"], ["sing", "sang", "sung", "zingen", "a song"], ["buy", "bought", "bought", "kopen", "bread"], ["think", "thought", "thought", "denken", "about it"], ["bring", "brought", "brought", "brengen", "the post"], ["say", "said", "said", "zeggen", "nothing"], ["know", "knew", "known", "weten, kennen", "the answer"], ["do", "did", "done", "doen", "the dishes"], ["make", "made", "made", "maken", "a drawing"], ["come", "came", "come", "komen", "home"], ["speak", "spoke", "spoken", "spreken", "French"], ["sit", "sat", "sat", "zitten", "on the sofa"], ["stand", "stood", "stood", "staan", "in line"], ["begin", "began", "begun", "beginnen", "at nine"], ["fly", "flew", "flown", "vliegen", "to Spain"], ["drive", "drove", "driven", "rijden", "to work"], ["find", "found", "found", "vinden", "a key"], ["get", "got", "got", "krijgen", "a letter"], ["tell", "told", "told", "vertellen", "a story"], ["meet", "met", "met", "ontmoeten", "a friend"], ["play", "played", "played", "spelen", "football"], ["work", "worked", "worked", "werken", "hard"], ["watch", "watched", "watched", "kijken naar", "TV"], ["walk", "walked", "walked", "wandelen", "to school"], ["like", "liked", "liked", "graag hebben", "pizza"], ["live", "lived", "lived", "wonen", "in Leuven"], ["study", "studied", "studied", "studeren", "English"], ["stop", "stopped", "stopped", "stoppen", "at the corner"], ["wait", "waited", "waited", "wachten", "for the bus"], ["help", "helped", "helped", "helpen", "my mother"], ["cook", "cooked", "cooked", "koken", "dinner"], ["clean", "cleaned", "cleaned", "schoonmaken", "the room"]];
  const SUBJ = [["I", 1], ["you", 2], ["he", 3], ["she", 3], ["my sister", 3], ["the teacher", 3], ["we", 4], ["they", 4], ["the children", 4], ["my parents", 4]];
  const BE = { pres: { 1: "am", 2: "are", 3: "is", 4: "are" }, past: { 1: "was", 2: "were", 3: "was", 4: "were" } };
  const HAVE = { pres: { 1: "have", 2: "have", 3: "has", 4: "have" }, past: "had" };
  function third(inf) { if (inf === "have") return "has"; if (inf === "do") return "does"; if (inf === "go") return "goes"; if (/(s|sh|ch|x|z)$/.test(inf)) return inf + "es"; if (/[^aeiou]y$/.test(inf)) return inf.slice(0, -1) + "ies"; return inf + "s"; }
  function ing(inf) { if (inf === "be") return "being"; if (/ie$/.test(inf)) return inf.slice(0, -2) + "ying"; if (/[^e]e$/.test(inf) && inf !== "see") return inf.slice(0, -1) + "ing"; if (/^[^aeiou]*[aeiou][^aeiouwxy]$/.test(inf) && !["visit", "open", "listen"].includes(inf)) return inf + inf.slice(-1) + "ing"; return inf + "ing"; }
  const cap = s => s[0].toUpperCase() + s.slice(1);
  const EN_START = ["go", "eat", "play", "work", "like", "live"];
  function enStock() { const S = OK.state(); if (!S.enStock) S.enStock = EN_START.slice(); return S.enStock; }
  const enDef = inf => { const own = (OK.state().enVerbs || []).find(v => v.inf === inf); if (own) return [own.inf, own.past, own.pp, own.nl, own.rest || "every day"]; return V.find(v => v[0] === inf); };
  OK.englishVerbs = () => enStock().map(enDef).filter(Boolean);
  OK.englishCatalogue = () => V.filter(v => !enStock().includes(v[0]));
  OK.stockEnglish = inf => { const st = enStock(); if (!st.includes(inf)) st.push(inf); OK.save(); };
  OK.unstockEnglish = inf => { const S = OK.state(); S.enStock = enStock().filter(x => x !== inf); S.enVerbs = (S.enVerbs || []).filter(v => v.inf !== inf); OK.save(); };
  OK.addEnglishVerb = (inf, past, pp, nl) => { const S = OK.state(); S.enVerbs = S.enVerbs || []; inf = inf.trim().toLowerCase(); if (!V.some(v => v[0] === inf)) { const ex = S.enVerbs.find(v => v.inf === inf); const row = { inf, past: past.trim().toLowerCase(), pp: pp.trim().toLowerCase(), nl: nl.trim() }; if (ex) Object.assign(ex, row); else S.enVerbs.push(row); } OK.stockEnglish(inf); };

  OK.registerModule({
    id: "engels-werkwoorden", order: 11.5, name: "Engelse werkwoorden", group: "Talen en kennis", generator: true,
    schema: [{ key: "types", label: "Oefenvormen", type: "multi", kid: true, options: [{ v: "be", l: "To be en to have (am/is/are, was/were, has)" }, { v: "ps", l: "Present simple (he goes, she doesn't)" }, { v: "past", l: "Past simple (went, played)" }, { v: "pc", l: "Present continuous (is running)" }, { v: "inf", l: "Infinitief geven bij een vorm" }] },
      { key: "irregular", label: "Werkwoorden", type: "select", default: "mix", options: [{ v: "regular", l: "Alleen regelmatige (-ed)" }, { v: "mix", l: "Regelmatige en onregelmatige" }] }],
    defaultsFor: (g, region) => { const start = region && region.firstForeign === "en" ? 5 : 7; return g >= start ? { types: g === start ? ["be", "ps"] : ["be", "ps", "past", "pc", "inf"], irregular: g === start ? "regular" : "mix" } : null; },
    describe: cfg => (cfg.types || []).map(t => ({ be: "to be/have", ps: "present simple", past: "past simple", pc: "continuous", inf: "infinitief" })[t]).join(", "),
    pool(cfg, ctx) {
      const types = cfg.types && cfg.types.length ? cfg.types : ["be"]; const out = [];
      const ALL = OK.englishVerbs(); const verbs = cfg.irregular === "regular" ? ALL.filter(v => v[1] === v[0] + "ed" || v[1] === v[0] + "d" || /ied$|pped$/.test(v[1])) : ALL;
      for (let i = 0; i < ctx.n * 2; i++) {
        const t = pick(types), v = pick(verbs), [subj, p] = pick(SUBJ);
        if (t === "be") { const which = Math.random() < .6 ? "be" : "have", past = Math.random() < .4; const ans = which === "be" ? BE[past ? "past" : "pres"][p] : (past ? HAVE.past : HAVE.pres[p]); const rest = which === "be" ? pick(["at home", "happy", "in the garden", "late", "tired", "ten years old"]) : pick(["a dog", "two brothers", "a new bike", "a lot of homework"]); out.push({ key: `en|${which}|${past ? "past" : "pres"}|${p}`, module: "engels-werkwoorden", kind: "text", lang: "en", prompt: { meta: `to ${which} · ${past ? "past" : "present"}`, main: `${cap(subj)} ____ ${rest}${past ? " yesterday" : ""}.` }, answer: ans, explain: `${cap(subj)} ${ans} ${rest}.` }); }
        else if (t === "ps") { const neg = Math.random() < .3; const ans = neg ? (p === 3 ? "doesn't " + v[0] : "don't " + v[0]) : (p === 3 ? third(v[0]) : v[0]); out.push({ key: `en|ps|${neg ? "neg" : "pos"}|${p}`, module: "engels-werkwoorden", kind: "text", lang: "en", prompt: { meta: `present simple${neg ? ", negative" : ""} · ${v[3]}`, main: `${cap(subj)} ____ (${neg ? "not " : ""}${v[0]}) ${v[4]} every day.` }, answer: ans, explain: p === 3 ? (neg ? "He/she/it: doesn't + hele werkwoord." : `He/she/it krijgt een -s: ${ans}.`) : (neg ? "Don't + hele werkwoord." : "Geen -s bij I, you, we, they.") }); }
        else if (t === "past") { out.push({ key: `en|past|${v[1] === v[0] + "ed" || v[1] === v[0] + "d" ? "reg" : "irr"}`, module: "engels-werkwoorden", kind: "text", lang: "en", prompt: { meta: `past simple · ${v[3]}`, main: `Yesterday ${subj} ____ (${v[0]}) ${v[4]}.` }, answer: v[1], explain: v[1] === v[0] + "ed" || v[1] === v[0] + "d" ? `Regelmatig: ${v[0]} + ed = ${v[1]}.` : `Onregelmatig: ${v[0]} - ${v[1]} - ${v[2]}.` }); }
        else if (t === "pc") { const ans = BE.pres[p] + " " + ing(v[0]); out.push({ key: `en|pc|${p}`, module: "engels-werkwoorden", kind: "text", lang: "en", prompt: { meta: `present continuous · ${v[3]}`, main: `Look! ${cap(subj)} ____ (${v[0]}) ${v[4]} right now.` }, answer: ans, explain: `am/is/are + -ing: ${ans}.` }); }
        else { const shown = pick([v[1], third(v[0]), ing(v[0]), v[2]]); out.push({ key: "en|inf", module: "engels-werkwoorden", kind: "text", lang: "en", prompt: { meta: "Wat is het hele werkwoord?", main: `<strong>${shown}</strong>` }, answer: v[0], alts: ["to " + v[0]], explain: `${shown} komt van (to) ${v[0]}: ${v[3]}.` }); }
      }
      return out;
    }
  });
})(window.OK);
