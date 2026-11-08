/* Kenik - themes.js
   Twee stijlen op dezelfde motor:
   - "tuin": een scène die groeit (één groei-item per juist antwoord, een verzamelfiguur per 10). Varianten: hondjes, katjes, prinsessen, dino's, ruimte.
   - "kist": punten, dagdoel, winkel en opdrachten.
   Alle figuren zijn eigen SVG-tekeningen. */
(function (OK) {
  "use strict";
  const face = (x, y, r, col, eye) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${col}"/><circle cx="${x - r * 0.35}" cy="${y - r * 0.15}" r="${r * 0.13}" fill="${eye || "#2b2b2b"}"/><circle cx="${x + r * 0.35}" cy="${y - r * 0.15}" r="${r * 0.13}" fill="${eye || "#2b2b2b"}"/><path d="M${x - r * 0.25} ${y + r * 0.35} q${r * 0.25} ${r * 0.25} ${r * 0.5} 0" stroke="#2b2b2b" stroke-width="${r * 0.08}" fill="none" stroke-linecap="round"/>`;

  /* ---- hondjes ---- */
  const DOGS = [["Loeka", "#d9a066", "#b77a3f", null, "#e8597a", "f"], ["Bobbie", "#f2e6d0", "#c9a87c", "#8b5a2b", "#4a90e2", "f"], ["Nala", "#8b5a2b", "#6b4220", null, "#ffc93c", "p"], ["Pip", "#444", "#222", "#fff", "#e8597a", "p"], ["Mila", "#e0b885", "#c48e55", "#fff", "#7bc47f", "f"], ["Max", "#c7c7c7", "#9e9e9e", "#555", "#ff8c42", "p"], ["Flo", "#f7b267", "#e08e3c", null, "#9b59b6", "f"], ["Sam", "#fff", "#d9a066", "#d9a066", "#e8597a", "f"], ["Bo", "#6b4220", "#4a2c14", "#f2e6d0", "#4a90e2", "f"], ["Lotte", "#f4c2c2", "#e39b9b", null, "#ffc93c", "p"], ["Kees", "#a0522d", "#7b3f20", "#fff", "#7bc47f", "f"], ["Rex", "#2e2e2e", "#111", "#c7c7c7", "#ff8c42", "p"]];
  function dog(i) {
    const [name, fur, earc, spot, collar, ear] = DOGS[i % DOGS.length];
    const ears = ear === "f" ? `<ellipse cx="20" cy="50" rx="8" ry="16" fill="${earc}" transform="rotate(12 20 50)"/><ellipse cx="60" cy="50" rx="8" ry="16" fill="${earc}" transform="rotate(-12 60 50)"/>` : `<path d="M24 36 L16 12 L38 26 Z" fill="${earc}"/><path d="M56 36 L64 12 L42 26 Z" fill="${earc}"/>`;
    return `<svg viewBox="0 0 100 100" aria-label="${name}"><path d="M80 64 q16 -8 10 -24" stroke="${fur}" stroke-width="8" fill="none" stroke-linecap="round"/><ellipse cx="58" cy="72" rx="27" ry="18" fill="${fur}"/><rect x="38" y="76" width="11" height="18" rx="5" fill="${fur}"/><rect x="66" y="76" width="11" height="18" rx="5" fill="${fur}"/><path d="M22 62 q18 14 36 2" stroke="${collar}" stroke-width="5" fill="none" stroke-linecap="round"/><circle cx="40" cy="46" r="22" fill="${fur}"/>${ears}${spot ? `<ellipse cx="52" cy="38" rx="9" ry="12" fill="${spot}" opacity=".9"/>` : ""}<ellipse cx="36" cy="56" rx="11" ry="8" fill="#fff" opacity=".85"/><ellipse cx="33" cy="52" rx="4.5" ry="3.2" fill="#2b2b2b"/><circle cx="31" cy="42" r="3" fill="#2b2b2b"/><circle cx="46" cy="42" r="3" fill="#2b2b2b"/><path d="M36 60 q4 3 8 0" stroke="#2b2b2b" stroke-width="1.8" fill="none" stroke-linecap="round"/></svg>`;
  }
  /* ---- katjes ---- */
  const CATS = [["Minoes", "#f0a35e"], ["Simba", "#e8c07a"], ["Luna", "#3b3b3b"], ["Pluis", "#f5f5f5"], ["Tijger", "#d98b3a"], ["Mimi", "#b9b9b9"], ["Felix", "#2b2b2b"], ["Nootje", "#8c5a33"], ["Snoepje", "#f4c2c2"], ["Oscar", "#6d6d6d"], ["Poes", "#e3d3b9"], ["Zoë", "#c98c5a"]];
  function cat(i) {
    const [name, fur] = CATS[i % CATS.length]; const eye = i % 3 === 0 ? "#3a9b4f" : "#2b7fd6";
    return `<svg viewBox="0 0 100 100" aria-label="${name}"><path d="M78 70 q18 -4 14 -26" stroke="${fur}" stroke-width="7" fill="none" stroke-linecap="round"/><ellipse cx="55" cy="74" rx="26" ry="17" fill="${fur}"/><rect x="38" y="78" width="10" height="16" rx="4" fill="${fur}"/><rect x="62" y="78" width="10" height="16" rx="4" fill="${fur}"/><path d="M22 40 L18 14 L38 28Z" fill="${fur}"/><path d="M58 40 L62 14 L42 28Z" fill="${fur}"/><circle cx="40" cy="46" r="21" fill="${fur}"/><ellipse cx="32" cy="44" rx="4" ry="5" fill="${eye}"/><ellipse cx="48" cy="44" rx="4" ry="5" fill="${eye}"/><ellipse cx="32" cy="44" rx="1.3" ry="4" fill="#111"/><ellipse cx="48" cy="44" rx="1.3" ry="4" fill="#111"/><path d="M38 53 l2 2 l2 -2z" fill="#e88"/><path d="M40 55 q-4 4 -8 2 M40 55 q4 4 8 2" stroke="#2b2b2b" stroke-width="1.5" fill="none"/><path d="M12 50 h18 M12 56 h18 M50 50 h18 M50 56 h18" stroke="#2b2b2b" stroke-width="1.2" opacity=".6"/></svg>`;
  }
  /* ---- prinsessen ---- */
  const PRINCESSES = [["Elodie", "#e8597a", "#5a3a22"], ["Rosalie", "#9b59b6", "#f2d08a"], ["Amélie", "#4a90e2", "#2b2b2b"], ["Fleur", "#3ddc97", "#c0392b"], ["Luna", "#ffc93c", "#1a1a1a"], ["Olivia", "#ff8c42", "#8b5a2b"], ["Noor", "#2ec4b6", "#4a2c14"], ["Lily", "#f4c2c2", "#e3b04b"], ["Mila", "#5b8cff", "#6b4220"], ["Esmée", "#c06bff", "#2b2b2b"], ["Juliette", "#ff5d7a", "#d98b3a"], ["Sofie", "#7bc47f", "#3b2f2a"]];
  function princess(i) {
    const [name, dress, hair] = PRINCESSES[i % PRINCESSES.length];
    return `<svg viewBox="0 0 100 100" aria-label="${name}"><path d="M50 48 L24 96 H76 Z" fill="${dress}"/><path d="M38 60 L30 96 M62 60 L70 96" stroke="#fff" stroke-width="2" opacity=".5"/><path d="M30 44 q-6 20 2 30 M70 44 q6 20 -2 30" stroke="${hair}" stroke-width="7" stroke-linecap="round"/><circle cx="50" cy="34" r="15" fill="#f6d7b8"/><path d="M35 30 q15 -22 30 0 q-15 -8 -30 0z" fill="${hair}"/><path d="M38 20 l4 -10 l6 7 l2 -10 l2 10 l6 -7 l4 10z" fill="#ffd54a" stroke="#d4a017" stroke-width="1"/><circle cx="45" cy="34" r="1.8" fill="#2b2b2b"/><circle cx="55" cy="34" r="1.8" fill="#2b2b2b"/><path d="M46 40 q4 3 8 0" stroke="#c0392b" stroke-width="1.5" fill="none" stroke-linecap="round"/></svg>`;
  }
  /* ---- dino's ---- */
  const DINOS = [["Rex", "#5fb94a"], ["Spike", "#e0803a"], ["Dottie", "#9b59b6"], ["Bram", "#4a90e2"], ["Trix", "#e8597a"], ["Stompie", "#8b5a2b"], ["Luna", "#2ec4b6"], ["Zoef", "#ffc93c"], ["Pico", "#c06bff"], ["Grom", "#3ddc97"], ["Knabbel", "#ff8c42"], ["Dino", "#7bc47f"]];
  function dino(i) {
    const [name, col] = DINOS[i % DINOS.length]; const spikes = i % 2 === 0;
    return `<svg viewBox="0 0 100 100" aria-label="${name}"><path d="M14 72 q20 -10 32 0" stroke="${col}" stroke-width="10" fill="none" stroke-linecap="round"/><ellipse cx="55" cy="68" rx="24" ry="17" fill="${col}"/><rect x="42" y="78" width="11" height="16" rx="4" fill="${col}"/><rect x="60" y="78" width="11" height="16" rx="4" fill="${col}"/><path d="M68 56 q4 -28 14 -30" stroke="${col}" stroke-width="12" fill="none" stroke-linecap="round"/><circle cx="84" cy="24" r="11" fill="${col}"/>${spikes ? `<path d="M36 54 l5 -9 l5 9 M48 51 l5 -9 l5 9 M60 51 l5 -9 l5 9" fill="#fff" opacity=".8"/>` : `<circle cx="48" cy="64" r="4" fill="#fff" opacity=".6"/><circle cx="62" cy="72" r="3" fill="#fff" opacity=".6"/>`}<circle cx="87" cy="21" r="2.2" fill="#2b2b2b"/><path d="M88 29 q-5 3 -9 0" stroke="#2b2b2b" stroke-width="1.5" fill="none"/></svg>`;
  }
  /* ---- ruimte ---- */
  const PLANETS = [["Zonnetje", "#ffc93c", 0], ["Blauwtje", "#4a90e2", 1], ["Ringo", "#e0b885", 2], ["Rood", "#e8597a", 0], ["Groentje", "#3ddc97", 1], ["Paarsje", "#9b59b6", 2], ["Raketje", "#ff8c42", 3], ["IJsje", "#bfe6ff", 1], ["Komeet", "#fff", 4], ["Maantje", "#c7c7c7", 0], ["Saturn", "#f4a261", 2], ["Ster", "#ffe08a", 5]];
  function planet(i) {
    const [name, col, kind] = PLANETS[i % PLANETS.length];
    if (kind === 3) return `<svg viewBox="0 0 100 100" aria-label="${name}"><path d="M50 10 q22 22 14 64 H36 q-8 -42 14 -64z" fill="#e6e6e6"/><path d="M36 60 l-14 14 h14z M64 60 l14 14 h-14z" fill="${col}"/><circle cx="50" cy="42" r="8" fill="#4a90e2" stroke="#fff" stroke-width="3"/><path d="M42 76 q8 16 16 0z" fill="#ffb830"/></svg>`;
    if (kind === 4) return `<svg viewBox="0 0 100 100" aria-label="${name}"><path d="M70 30 L10 85 L60 60z" fill="#bfe6ff" opacity=".7"/><circle cx="70" cy="30" r="16" fill="${col}"/></svg>`;
    if (kind === 5) return `<svg viewBox="0 0 100 100" aria-label="${name}"><path d="M50 8 l12 28 l30 3 l-23 20 l7 30 l-26 -16 l-26 16 l7 -30 l-23 -20 l30 -3z" fill="${col}" stroke="#e0b24a" stroke-width="2"/></svg>`;
    return `<svg viewBox="0 0 100 100" aria-label="${name}"><circle cx="50" cy="50" r="28" fill="${col}"/>${kind === 1 ? `<path d="M30 40 q20 -10 40 4 M28 58 q22 8 44 -4" stroke="#fff" stroke-width="5" fill="none" opacity=".5"/>` : ""}${kind === 2 ? `<ellipse cx="50" cy="52" rx="44" ry="10" fill="none" stroke="#fff" stroke-width="5" opacity=".7"/>` : ""}<circle cx="40" cy="42" r="5" fill="#fff" opacity=".35"/></svg>`;
  }

  /* groei-items */
  const flower = col => `<svg viewBox="0 0 60 100"><path d="M30 100 V40" stroke="#3f9b3f" stroke-width="5" stroke-linecap="round"/><path d="M30 72 q-16 -4 -18 -18 q16 2 18 18z" fill="#5fb94a"/><path d="M30 60 q16 -4 18 -18 q-16 2 -18 18z" fill="#5fb94a"/>${[0, 60, 120, 180, 240, 300].map(a => `<ellipse cx="30" cy="16" rx="7" ry="13" fill="${col}" transform="rotate(${a} 30 30)"/>`).join("")}<circle cx="30" cy="30" r="9" fill="#ffe08a" stroke="#e0b24a" stroke-width="2"/></svg>`;
  const rose = col => `<svg viewBox="0 0 60 100"><path d="M30 100 V40" stroke="#3f7b3f" stroke-width="5" stroke-linecap="round"/><path d="M30 70 q-14 -2 -16 -14 q14 0 16 14z" fill="#4a9a4a"/><circle cx="30" cy="30" r="16" fill="${col}"/><path d="M22 30 q8 -14 16 0 q-8 10 -16 0z M30 18 q10 8 0 22" stroke="#fff" stroke-width="2" fill="none" opacity=".5"/></svg>`;
  const fern = col => `<svg viewBox="0 0 60 100"><path d="M30 100 Q26 60 30 20" stroke="${col}" stroke-width="5" fill="none" stroke-linecap="round"/>${[0, 1, 2, 3, 4].map(k => `<path d="M30 ${28 + k * 14} q-18 -4 -22 8 q14 6 22 -8z M30 ${28 + k * 14} q18 -4 22 8 q-14 6 -22 -8z" fill="${col}"/>`).join("")}</svg>`;
  const star = col => `<svg viewBox="0 0 60 100"><path d="M30 20 l7 16 l17 2 l-13 11 l4 17 l-15 -9 l-15 9 l4 -17 l-13 -11 l17 -2z" fill="${col}" stroke="#fff" stroke-width="1.5" opacity=".95"/></svg>`;
  const fish = col => `<svg viewBox="0 0 60 100"><ellipse cx="28" cy="50" rx="18" ry="11" fill="${col}"/><path d="M44 50 l12 -9 v18z" fill="${col}"/><circle cx="20" cy="47" r="2.5" fill="#fff"/><circle cx="20" cy="47" r="1.2" fill="#111"/></svg>`;

  /* ---- ridders (afgewisseld met prinsessen in het kasteel) ---- */
  const KNIGHTS = [["Arthur", "#4a90e2"], ["Lancelot", "#e8597a"], ["Floris", "#3ddc97"], ["Roeland", "#ffc93c"], ["Tristan", "#9b59b6"], ["Walter", "#ff8c42"], ["Godfried", "#2ec4b6"], ["Boudewijn", "#ff5252"], ["Gawein", "#b388ff"], ["Ivo", "#f4a261"]];
  function knight(i) {
    const [name, col] = KNIGHTS[i % KNIGHTS.length];
    return `<svg viewBox="0 0 100 100" aria-label="${name}"><rect x="34" y="50" width="32" height="40" rx="6" fill="#9aa5b5"/><path d="M34 56 h32 v10 h-32z" fill="${col}"/><rect x="26" y="52" width="8" height="30" rx="4" fill="#9aa5b5"/><rect x="66" y="52" width="8" height="30" rx="4" fill="#9aa5b5"/><path d="M72 40 v46" stroke="#5c6670" stroke-width="3"/><path d="M64 46 h16" stroke="#c9a227" stroke-width="3"/><path d="M50 14 a16 16 0 0 1 16 16 v10 h-32 v-10 a16 16 0 0 1 16 -16z" fill="#b8c2d0"/><rect x="36" y="30" width="28" height="4" fill="#5c6670"/><path d="M50 10 q6 -6 12 0 l-2 8 h-20 l-2 -8 q6 -6 12 0z" fill="${col}"/><rect x="40" y="36" width="8" height="3" fill="#222"/><rect x="52" y="36" width="8" height="3" fill="#222"/></svg>`;
  }
  const CASTLE_NAMES = PRINCESSES.map((p, i) => i % 2 ? KNIGHTS[Math.floor(i / 2) % KNIGHTS.length][0] : p[0]);
  const castleFig = i => i % 2 ? knight(Math.floor(i / 2)) : princess(i);
  const banner = col => `<svg viewBox="0 0 60 100"><path d="M30 100 V20" stroke="#6b4a2b" stroke-width="4"/><path d="M30 20 h26 l-8 10 l8 10 h-26z" fill="${col}"/><circle cx="30" cy="18" r="4" fill="#c9a227"/></svg>`;

  /* achtergronden per wereld (SVG, schaalt mee met de scène) */
  const SCENES = {
    tuin: { sky: ["#bfe6ff", "#8fd0fb"], ground: ["#8ad46c", "#5fb94a"], svg: `<circle cx="920" cy="60" r="34" fill="#ffc93c"/><circle cx="920" cy="60" r="48" fill="#ffc93c" opacity=".3"/><ellipse cx="130" cy="60" rx="50" ry="18" fill="#fff"/><circle cx="115" cy="48" r="20" fill="#fff"/><circle cx="145" cy="52" r="16" fill="#fff"/><ellipse cx="520" cy="80" rx="40" ry="14" fill="#fff"/><circle cx="512" cy="70" r="15" fill="#fff"/>` },
    kasteel: { sky: ["#dcecff", "#a9cdf5"], ground: ["#9bd98a", "#6fbf5a"], svg: `<circle cx="900" cy="56" r="30" fill="#fff3b0"/><g fill="#b9b9c9" stroke="#7d7d93" stroke-width="3"><rect x="300" y="70" width="60" height="100"/><rect x="640" y="70" width="60" height="100"/><rect x="350" y="100" width="300" height="70"/><rect x="455" y="60" width="90" height="110"/></g><g fill="#b9b9c9" stroke="#7d7d93" stroke-width="3"><path d="M300 70 h12 v-14 h12 v14 h12 v-14 h12 v14 h12 v-14 h0"/><path d="M640 70 h12 v-14 h12 v14 h12 v-14 h12 v14 h12 v-14"/><path d="M455 60 h15 v-14 h15 v14 h15 v-14 h15 v14 h15 v-14 h15 v14"/></g><path d="M470 170 a30 30 0 0 1 60 0 z" fill="#5a3a22"/><rect x="318" y="100" width="14" height="22" rx="7" fill="#3b2f2a"/><rect x="658" y="100" width="14" height="22" rx="7" fill="#3b2f2a"/><path d="M500 40 v-30 l24 8 l-24 8" fill="#e8597a" stroke="#6b4a2b" stroke-width="2"/>` },
    dinoland: { sky: ["#ffe2b5", "#f7b58a"], ground: ["#7a8f4e", "#5c6f3a"], svg: `<circle cx="150" cy="70" r="36" fill="#ff8c42"/><path d="M700 170 l70 -120 l70 120z" fill="#6b4a3a"/><path d="M755 70 l15 -20 l15 20 q-15 -8 -30 0z" fill="#ff5252"/><path d="M757 52 q13 -40 26 0" fill="#ffb830" opacity=".8"/><path d="M560 170 l50 -70 l50 70z" fill="#8a6a55"/><ellipse cx="400" cy="60" rx="46" ry="14" fill="#fff" opacity=".7"/>` },
    ruimte: { sky: ["#0d1030", "#1c1f5a"], ground: ["#2f2a6e", "#231d55"], svg: `${Array.from({ length: 40 }, (_, i) => `<circle cx="${(i * 97) % 1000}" cy="${(i * 53) % 160}" r="${1 + (i % 3)}" fill="#fff" opacity=".9"/>`).join("")}<circle cx="860" cy="60" r="34" fill="#f2f2f2"/><circle cx="848" cy="50" r="6" fill="#ccc"/><circle cx="872" cy="70" r="4" fill="#ccc"/><circle cx="120" cy="120" r="22" fill="#e8597a"/><ellipse cx="120" cy="122" rx="38" ry="8" fill="none" stroke="#fff" stroke-width="3" opacity=".7"/>` }
  };
  OK.scenes = SCENES;
  const GROW_COLORS = ["#ff8c42", "#ffc93c", "#e8597a", "#4a90e2", "#ff6fa7", "#9b59b6", "#ff5252", "#2ec4b6", "#f4a261", "#b388ff"];

  OK.gardenVariants = {
    hondjes: { name: "Tuin met hondjes", scene: "tuin", grow: flower, item: "bloem", items: "bloemen", friend: "hondje", friends: "hondjes", collect: dog, count: DOGS.length, names: DOGS.map(d => d[0]) },
    katjes: { name: "Tuin met katjes", scene: "tuin", grow: flower, item: "bloem", items: "bloemen", friend: "katje", friends: "katjes", collect: cat, count: CATS.length, names: CATS.map(d => d[0]) },
    ridders: { name: "Kasteel met ridders", scene: "kasteel", grow: banner, item: "vlag", items: "vlaggen", friend: "ridder", friends: "ridders", collect: knight, count: KNIGHTS.length, names: KNIGHTS.map(k => k[0]) },
    prinsessen: { name: "Kasteel met prinsessen", scene: "kasteel", grow: banner, item: "vlag", items: "vlaggen", friend: "prinses", friends: "prinsessen", collect: princess, count: PRINCESSES.length, names: PRINCESSES.map(p => p[0]) },
    kasteel: { name: "Kasteel: ridders en prinsessen", scene: "kasteel", grow: banner, item: "vlag", items: "vlaggen", friend: "bewoner", friends: "bewoners", collect: castleFig, count: CASTLE_NAMES.length, names: CASTLE_NAMES },
    dinos: { name: "Dinoland", scene: "dinoland", grow: fern, item: "varen", items: "varens", friend: "dino", friends: "dino's", collect: dino, count: DINOS.length, names: DINOS.map(d => d[0]) },
    ruimte: { name: "Ruimte", scene: "ruimte", grow: star, item: "ster", items: "sterren", friend: "planeet", friends: "planeten", collect: planet, count: PLANETS.length, names: PLANETS.map(d => d[0]) }
  };
  OK.growColor = i => GROW_COLORS[i % GROW_COLORS.length];
  OK.themeStyles = { tuin: "Wereld (verzamelen, geen punten)", kist: "Schatkist (punten en winkel)" };
})(window.OK);
