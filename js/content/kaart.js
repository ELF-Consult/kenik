/* Kenik - content/kaart.js
   Kaartoefeningen. Kaartdata komt uit data/<land>.json: provincies als SVG-paden (Natural Earth),
   rivieren (Schelde en Maas uit kaartdata, kleinere rivieren schematisch via steden) en hoofdplaatsen.
   Oefenvormen: klik op de kaart, benoem wat oplicht (meerkeuze), hoofdplaats typen. */
(function (OK) {
  "use strict";
  OK.maps = {};
  OK.geoReady = fetch("data/be.json").then(r => r.json()).then(d => { OK.maps.be = d; return d; }).catch(() => null);

  /* SVG van de kaart. opts: {highlight:{layer,id}, interactive:bool, labels:bool} */
  OK.mapSVG = function (land, opts) {
    const d = OK.maps[land]; if (!d) return "<p class='muted'>Kaart wordt geladen...</p>"; opts = opts || {};
    const hl = opts.highlight || {};
    let s = `<svg viewBox="0 0 ${d.w} ${d.h}" class="map${opts.interactive ? " map-interactive" : ""}" role="img">`;
    /* Brussel ligt binnen Vlaams-Brabant: als laatste tekenen zodat het zichtbaar en klikbaar is */
    const provs = d.provinces.slice().sort((a, b) => (a.id === "Brussel") - (b.id === "Brussel"));
    s += provs.map(p => `<path class="prov${hl.layer === "provinces" && hl.id === p.id ? " hl" : ""}" data-layer="provinces" data-id="${p.id}" d="${p.d}"/>`).join("");
    s += d.rivers.map(r => `<g class="river${hl.layer === "rivers" && hl.id === r.id ? " hl" : ""}" data-layer="rivers" data-id="${r.id}"><path class="hit" d="${r.d}"/><path class="line" d="${r.d}"/></g>`).join("");
    if (opts.cities) s += Object.entries(d.cities).map(([n, [x, y]]) => `<circle class="city" cx="${x}" cy="${y}" r="5"/><text class="city-lbl" x="${x + 8}" y="${y - 6}">${n}</text>`).join("");
    if (opts.labels) s += provs.map(p => `<text class="prov-lbl" x="${p.cx}" y="${p.cy}">${p.name}</text>`).join("");
    return s + "</svg>";
  };

  OK.registerModule({
    id: "kaart-be", order: 12, name: "Kaart van België", group: "Wereldoriëntatie", generator: false, regions: ["be"],
    schema: [
      { key: "sets", label: "Wat", type: "multi", kid: true, options: [{ v: "prov-klik", l: "Provincies aanduiden op de kaart" }, { v: "prov-naam", l: "Provincies benoemen" }, { v: "hoofd", l: "Hoofdplaatsen" }, { v: "riv-klik", l: "Rivieren aanduiden" }, { v: "riv-naam", l: "Rivieren benoemen" }] }
    ],
    defaultsFor: g => g >= 5 && g <= 6 ? { sets: ["prov-klik", "prov-naam", "hoofd", "riv-naam"] } : null,
    describe: cfg => (cfg.sets || []).length + " oefenvormen",
    pool(cfg) {
      const d = OK.maps.be; if (!d) return [];
      const sets = cfg.sets && cfg.sets.length ? cfg.sets : ["prov-klik"]; const out = [];
      const names = d.provinces.map(p => p.name), rnames = d.rivers.map(r => r.name);
      const choices = (ans, all) => OK.shuffle([ans].concat(OK.shuffle(all.filter(x => x !== ans)).slice(0, 3)));
      d.provinces.forEach(p => {
        if (sets.includes("prov-klik")) out.push({ key: `g|pk|${p.id}`, module: "kaart-be", kind: "map", map: "be", target: { layer: "provinces", id: p.id }, prompt: { meta: "Klik op de kaart", main: p.name }, answer: p.id, explain: `${p.name} licht nu op.` });
        if (sets.includes("prov-naam")) out.push({ key: `g|pn|${p.id}`, module: "kaart-be", kind: "choice", map: "be", highlight: { layer: "provinces", id: p.id }, prompt: { meta: "Welke provincie licht op?" }, answer: p.name, choices: choices(p.name, names) });
        if (sets.includes("hoofd")) out.push({ key: `g|hp|${p.id}`, module: "kaart-be", kind: "text", lang: "nl", map: "be", highlight: { layer: "provinces", id: p.id }, prompt: { meta: "Hoofdplaats", main: `Wat is de hoofdplaats van ${p.name}?` }, answer: p.capital, alts: p.name === "Brussel" ? ["Brussel-stad"] : p.name === "Namen" ? ["Namur"] : p.name === "Luik" ? ["Liège"] : p.name === "Henegouwen" ? ["Mons"] : p.name === "Luxemburg" ? ["Arlon"] : p.name === "Waals-Brabant" ? ["Wavre"] : [] });
      });
      d.rivers.forEach(r => {
        if (sets.includes("riv-klik")) out.push({ key: `g|rk|${r.id}`, module: "kaart-be", kind: "map", map: "be", target: { layer: "rivers", id: r.id }, prompt: { meta: "Klik op de rivier", main: `de ${r.name}` }, answer: r.id, explain: `Dit is de ${r.name}.` });
        if (sets.includes("riv-naam")) out.push({ key: `g|rn|${r.id}`, module: "kaart-be", kind: "choice", map: "be", highlight: { layer: "rivers", id: r.id }, prompt: { meta: "Welke rivier licht op?" }, answer: r.name, choices: choices(r.name, rnames) });
      });
      return out;
    }
  });
})(window.OK);
