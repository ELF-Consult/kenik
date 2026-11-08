/* Kenik - content/meetkunde.js
   Vlakke figuren herkennen, omtrek en oppervlakte berekenen. Figuren worden als SVG getekend met de maten erbij. */
(function (OK) {
  "use strict";
  const R = OK.rnd, pick = OK.pick, f = OK.fmtNum;
  const SH = {
    vierkant: { name: "vierkant", draw: () => `<rect x="30" y="30" width="140" height="140" />` },
    rechthoek: { name: "rechthoek", draw: () => `<rect x="20" y="55" width="160" height="90" />` },
    driehoek: { name: "driehoek", draw: () => `<path d="M30 160 L170 160 L95 35 Z" />` },
    rechthoekige_driehoek: { name: "rechthoekige driehoek", draw: () => `<path d="M40 160 L160 160 L40 40 Z" />` },
    parallellogram: { name: "parallellogram", draw: () => `<path d="M55 55 L180 55 L145 145 L20 145 Z" />` },
    ruit: { name: "ruit", draw: () => `<path d="M100 25 L165 100 L100 175 L35 100 Z" />` },
    trapezium: { name: "trapezium", draw: () => `<path d="M60 55 L140 55 L180 145 L20 145 Z" />` },
    cirkel: { name: "cirkel", draw: () => `<circle cx="100" cy="100" r="70" />` },
    vijfhoek: { name: "vijfhoek", draw: () => `<path d="M100 28 L170 80 L143 165 L57 165 L30 80 Z" />` },
    zeshoek: { name: "zeshoek", draw: () => `<path d="M60 35 L140 35 L180 100 L140 165 L60 165 L20 100 Z" />` },
    ovaal: { name: "ovaal", draw: () => `<ellipse cx="100" cy="100" rx="80" ry="50" />` }
  };
  const svg = (inner, labels) => `<svg viewBox="0 0 200 200" class="shape">${inner.replace("/>", ' fill="#ffd98a" stroke="#6b4a2b" stroke-width="3" stroke-linejoin="round"/>')}${labels || ""}</svg>`;
  const lbl = (x, y, t) => `<text x="${x}" y="${y}" text-anchor="middle" font-size="15" font-weight="700" fill="#2b2b2b" font-family="sans-serif">${t}</text>`;

  OK.registerModule({
    id: "meetkunde", order: 9, name: "Meetkunde", group: "Rekenen", generator: true,
    schema: [{ key: "types", label: "Wat", type: "multi", kid: true, options: [{ v: "vormen", l: "Vormen herkennen" }, { v: "omtrek", l: "Omtrek berekenen" }, { v: "opp", l: "Oppervlakte berekenen" }] },
      { key: "figs", label: "Figuren voor omtrek en oppervlakte", type: "multi", options: [{ v: "vierkant", l: "vierkant" }, { v: "rechthoek", l: "rechthoek" }, { v: "driehoek", l: "driehoek" }, { v: "parallellogram", l: "parallellogram" }, { v: "ruit", l: "ruit" }, { v: "cirkel", l: "cirkel" }] }],
    defaultsFor: g => g === 3 ? { types: ["vormen"], figs: ["vierkant", "rechthoek"] } : g === 4 ? { types: ["vormen", "omtrek"], figs: ["vierkant", "rechthoek"] } : g === 5 ? { types: ["vormen", "omtrek", "opp"], figs: ["vierkant", "rechthoek", "driehoek"] } : g >= 6 && g <= 8 ? { types: ["vormen", "omtrek", "opp"], figs: ["vierkant", "rechthoek", "driehoek", "parallellogram", "ruit", "cirkel"] } : null,
    describe: cfg => (cfg.types || []).map(t => ({ vormen: "vormen", omtrek: "omtrek", opp: "oppervlakte" })[t]).join(", "),
    pool(cfg, ctx) {
      const out = [], types = cfg.types && cfg.types.length ? cfg.types : ["vormen"], figs = cfg.figs && cfg.figs.length ? cfg.figs : ["vierkant", "rechthoek"];
      const names = Object.values(SH).map(s => s.name);
      for (let i = 0; i < ctx.n; i++) {
        const t = pick(types);
        if (t === "vormen") { const k = pick(Object.keys(SH)); const ans = SH[k].name; const ch = OK.shuffle([ans].concat(OK.shuffle(names.filter(n => n !== ans)).slice(0, 3))); out.push({ key: `mk|v|${k}`, module: "meetkunde", kind: "choice", prompt: { meta: "Welke figuur is dit?", svg: svg(SH[k].draw()) }, answer: ans, choices: ch }); continue; }
        const fig = pick(figs); const unit = pick(["cm", "m", "dm"]);
        if (fig === "vierkant") { const z = R(2, 12); const ans = t === "omtrek" ? 4 * z : z * z; out.push(item(t, fig, svg(SH.vierkant.draw(), lbl(100, 190, z + " " + unit)), ans, unit, t === "omtrek" ? `omtrek = 4 × zijde = 4 × ${z} = ${ans}` : `oppervlakte = zijde × zijde = ${z} × ${z} = ${ans}`)); }
        else if (fig === "rechthoek") { const l = R(3, 15), b = R(2, l - 1); const ans = t === "omtrek" ? 2 * (l + b) : l * b; out.push(item(t, fig, svg(SH.rechthoek.draw(), lbl(100, 165, l + " " + unit) + lbl(12, 104, b + " " + unit)), ans, unit, t === "omtrek" ? `omtrek = 2 × (lengte + breedte) = 2 × (${l} + ${b}) = ${ans}` : `oppervlakte = lengte × breedte = ${l} × ${b} = ${ans}`)); }
        else if (fig === "driehoek") { if (t === "omtrek") { const a = R(3, 10), b = R(3, 10), c = R(Math.abs(a - b) + 1, a + b - 1); out.push(item(t, fig, svg(SH.driehoek.draw(), lbl(100, 180, a + " " + unit) + lbl(45, 95, b + " " + unit) + lbl(155, 95, c + " " + unit)), a + b + c, unit, `omtrek = som van de zijden = ${a} + ${b} + ${c} = ${a + b + c}`)); } else { const b = pick([4, 6, 8, 10, 12]), h = R(2, 10); out.push(item(t, fig, svg(SH.driehoek.draw(), lbl(100, 180, "basis " + b + " " + unit) + `<line x1="95" y1="35" x2="95" y2="160" stroke="#c0392b" stroke-width="2" stroke-dasharray="4 3"/>` + lbl(125, 100, "h " + h + " " + unit)), b * h / 2, unit, `oppervlakte = basis × hoogte : 2 = ${b} × ${h} : 2 = ${f(b * h / 2)}`)); } }
        else if (fig === "parallellogram") { if (t === "omtrek") { const a = R(4, 12), b = R(2, 8); out.push(item(t, fig, svg(SH.parallellogram.draw(), lbl(85, 165, a + " " + unit) + lbl(175, 104, b + " " + unit)), 2 * (a + b), unit, `omtrek = 2 × (${a} + ${b}) = ${2 * (a + b)}`)); } else { const b = R(4, 12), h = R(2, 8); out.push(item(t, fig, svg(SH.parallellogram.draw(), lbl(85, 165, "basis " + b + " " + unit) + `<line x1="145" y1="55" x2="145" y2="145" stroke="#c0392b" stroke-width="2" stroke-dasharray="4 3"/>` + lbl(165, 100, "h " + h)), b * h, unit, `oppervlakte = basis × hoogte = ${b} × ${h} = ${b * h}`)); } }
        else if (fig === "ruit") { if (t === "omtrek") { const z = R(3, 12); out.push(item(t, fig, svg(SH.ruit.draw(), lbl(150, 55, z + " " + unit)), 4 * z, unit, `omtrek = 4 × zijde = 4 × ${z} = ${4 * z}`)); } else { const d1 = pick([4, 6, 8, 10, 12]), d2 = pick([4, 6, 8, 10]); out.push(item(t, fig, svg(SH.ruit.draw(), `<line x1="100" y1="25" x2="100" y2="175" stroke="#c0392b" stroke-width="2" stroke-dasharray="4 3"/><line x1="35" y1="100" x2="165" y2="100" stroke="#2b7fd6" stroke-width="2" stroke-dasharray="4 3"/>` + lbl(118, 60, "D " + d1) + lbl(60, 92, "d " + d2)), d1 * d2 / 2, unit, `oppervlakte = D × d : 2 = ${d1} × ${d2} : 2 = ${f(d1 * d2 / 2)}`)); } }
        else { const r = R(2, 10); if (t === "omtrek") out.push(item(t, fig, svg(SH.cirkel.draw(), `<line x1="100" y1="100" x2="170" y2="100" stroke="#c0392b" stroke-width="2"/>` + lbl(135, 92, "r " + r + " " + unit)), Math.round(2 * 3.14 * r * 100) / 100, unit, `omtrek = 2 × π × r ≈ 2 × 3,14 × ${r} = ${f(Math.round(2 * 3.14 * r * 100) / 100)}`, true)); else out.push(item(t, fig, svg(SH.cirkel.draw(), `<line x1="100" y1="100" x2="170" y2="100" stroke="#c0392b" stroke-width="2"/>` + lbl(135, 92, "r " + r + " " + unit)), Math.round(3.14 * r * r * 100) / 100, unit, `oppervlakte = π × r × r ≈ 3,14 × ${r} × ${r} = ${f(Math.round(3.14 * r * r * 100) / 100)}`, true)); }
      }
      return out;
      function item(t, fig, pic, ans, unit, explain, pi) { return { key: `mk|${t}|${fig}`, module: "meetkunde", kind: "number", prompt: { meta: (t === "omtrek" ? "Omtrek" : "Oppervlakte") + " van deze " + SH[fig].name + (pi ? " (π ≈ 3,14)" : "") + ", in " + (t === "omtrek" ? unit : unit + "²"), svg: pic }, answer: f(ans), explain }; }
    }
  });
})(window.OK);
