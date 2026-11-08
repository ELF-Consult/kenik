/* Kenik - content/ordenen.js
   Ordenen: woorden alfabetisch, getallen van klein naar groot (of omgekeerd). Antwoordvorm "order": tik de items in de juiste volgorde. */
(function (OK) {
  "use strict";
  const R = OK.rnd, pick = OK.pick, f = OK.fmtNum;
  const WORDS = "appel banaan citroen druif egel fiets gitaar hond ijsje jas kat lamp muis neus olifant peer raam slak tafel uil vis wolk zebra boom boot beer bal bril brood bus deur dak dier dorp ezel eend fee fles geit gras huis hek hemel kast kip koe konijn lepel leeuw maan melk mes paard pen pop ring roos rok school schoen ster stoel tand tent trein vogel vork wiel zon zak zee zeep aap arm bed bes bos dans doos elf emmer feest fluit gans haan hamer hart ijs jurk kaas kers kus lied lijm mand mier muts noot oog oor pad pit pot regen rits rups spin stok taart tak tijger tuin vuur wesp wind worm zalm zand".split(" ");
  const uniq = a => [...new Set(a)];

  OK.registerModule({
    id: "ordenen", order: 2.5, name: "Ordenen", group: "Rekenen", generator: true,
    schema: [{ key: "types", label: "Wat", type: "multi", kid: true, options: [{ v: "alfabet", l: "Woorden alfabetisch" }, { v: "getallen", l: "Getallen van klein naar groot" }, { v: "aflopend", l: "Getallen van groot naar klein" }, { v: "komma", l: "Kommagetallen ordenen" }, { v: "breuk", l: "Breuken ordenen" }] },
      { key: "n", label: "Hoeveel items", type: "select", default: 4, options: [{ v: 3, l: "3" }, { v: 4, l: "4" }, { v: 5, l: "5" }, { v: 6, l: "6" }] },
      { key: "max", label: "Getallen tot", type: "select", default: 100, options: [{ v: 20, l: "20" }, { v: 100, l: "100" }, { v: 1000, l: "1000" }, { v: 10000, l: "10 000" }, { v: 1000000, l: "1 miljoen" }] }],
    defaultsFor: g => g <= 1 ? { types: ["getallen"], n: 3, max: 20 } : g === 2 ? { types: ["alfabet", "getallen"], n: 4, max: 100 } : g === 3 ? { types: ["alfabet", "getallen", "aflopend"], n: 4, max: 1000 } : g === 4 ? { types: ["alfabet", "getallen", "aflopend"], n: 5, max: 10000 } : g <= 6 ? { types: ["alfabet", "getallen", "komma", "breuk"], n: 5, max: 1000000 } : null,
    describe: cfg => (cfg.types || []).map(t => ({ alfabet: "alfabet", getallen: "getallen", aflopend: "aflopend", komma: "kommagetallen", breuk: "breuken" })[t]).join(", "),
    pool(cfg, ctx) {
      const out = [], types = cfg.types && cfg.types.length ? cfg.types : ["getallen"], n = +cfg.n || 4, max = +cfg.max || 100;
      for (let i = 0; i < ctx.n; i++) {
        const t = pick(types); let items, sorted, meta;
        if (t === "alfabet") {
          // soms woorden met dezelfde beginletter, zodat de tweede letter telt
          const sameStart = Math.random() < .4; let pool = WORDS; if (sameStart) { const letter = pick("bkmpsz".split("")); const cand = WORDS.filter(w => w[0] === letter); if (cand.length >= n) pool = cand; }
          items = uniq(OK.shuffle(pool.slice()).slice(0, n)); sorted = items.slice().sort((a, b) => a.localeCompare(b, "nl")); meta = "Zet alfabetisch, van a naar z";
        } else if (t === "komma") { const set = new Set(); while (set.size < n) set.add(f(Math.round(Math.random() * 20 * 100) / 100)); items = [...set]; sorted = items.slice().sort((a, b) => parseFloat(a.replace(",", ".")) - parseFloat(b.replace(",", "."))); meta = "Van klein naar groot"; }
        else if (t === "breuk") { const fr = [["1/2", .5], ["1/4", .25], ["3/4", .75], ["1/3", 1 / 3], ["2/3", 2 / 3], ["1/5", .2], ["2/5", .4], ["3/5", .6], ["4/5", .8], ["1/8", .125], ["3/8", .375], ["5/8", .625], ["7/8", .875], ["1/10", .1], ["7/10", .7], ["9/10", .9], ["1/6", 1 / 6], ["5/6", 5 / 6]]; const ch = OK.shuffle(fr.slice()).slice(0, n); items = ch.map(x => x[0]); sorted = ch.slice().sort((a, b) => a[1] - b[1]).map(x => x[0]); meta = "Breuken van klein naar groot"; }
        else { const set = new Set(); const step = max >= 10000 ? 10 : 1; while (set.size < n) set.add(R(1, max / step) * step); items = [...set]; const asc = t === "getallen"; sorted = items.slice().sort((a, b) => asc ? a - b : b - a); meta = asc ? "Van klein naar groot" : "Van groot naar klein"; items = items.map(x => OK.fmtBig(x)); sorted = sorted.map(x => OK.fmtBig(x)); }
        out.push({ key: `ord|${t}|${n}`, module: "ordenen", kind: "order", prompt: { meta }, items: OK.shuffle(items.slice()), answer: sorted.join("|"), display: a => a.split("|").join(" → "), explain: "Juiste volgorde: " + sorted.join(", ") });
      }
      return out;
    }
  });
})(window.OK);
