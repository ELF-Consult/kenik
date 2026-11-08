/* Kenik - i18n.js
   Talen en regio's. Een regio bepaalt: de namen van de leerjaren, welke modules bestaan en de standaardinstellingen.
   De taal bepaalt de schermteksten. Interne leerjaren blijven altijd 1..12 (Belgische telling: 1-6 lager, 7-12 middelbaar);
   een regio vertaalt dat naar haar eigen namen (Nederland: groep 3-8, klas 1-6). */
(function (OK) {
  "use strict";
  OK.REGIONS = {
    "be-nl": { name: "Vlaanderen (Nederlandstalig)", lang: "nl", country: "be", firstForeign: "fr",
      grade: g => g <= 6 ? `${g}e leerjaar` : `${g - 6}e middelbaar`, gradesShort: g => g <= 6 ? `L${g}` : `M${g - 6}` },
    "nl-nl": { name: "Nederland", lang: "nl", country: "nl", firstForeign: "en",
      grade: g => g <= 6 ? `groep ${g + 2}` : `klas ${g - 6}`, gradesShort: g => g <= 6 ? `gr${g + 2}` : `kl${g - 6}` }
  };
  OK.region = () => OK.REGIONS[(OK.state().settings || {}).region] || OK.REGIONS["be-nl"];
  OK.gradeName = g => OK.region().grade(+g);
  OK.GRADE_IDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  /* module beschikbaar in deze regio? een module zonder `regions` geldt overal */
  OK.moduleAvailable = (m, region) => !m.regions || m.regions.includes((region || OK.region()).country);

  /* schermteksten; sleutel = korte Engelse naam, waarde per taal */
  const UI = {
    nl: {
      who: "Wie ben jij?", who_hint: "Nog geen kinderen. Klik op \"Ouders\" om een kind toe te voegen.", parents: "Ouders", switch: "Wissel",
      todo: "Te doen", todo_parents: "Opdracht van papa en mama", practice: "Oefenen", practice_sub: "Het systeem kiest wat je nog niet goed kent.",
      test: "Toets", test_sub: "Zonder hints, score op het einde, bonus bij 90% of meer.", shop: "De winkel", shop_all: "Alles bekijken",
      today: "oefeningen vandaag", goal: "dagdoel", week: "plumkes deze week", best: "beste reeks",
      how_many: "Hoeveel vragen?", start: "Start", back: "Terug", again: "Nog eens", home: "Naar start",
      dont_know: "Weet ik niet", stop: "Stoppen", ok: "OK", type_answer: "typ je antwoord",
      shop_hint: "Je wisselt plumkes in; papa of mama keurt het goed. Tot dan staat het op \"aangevraagd\".", my_requests: "Mijn aanvragen",
      parent_panel: "Ouderpaneel", pin_placeholder: "code", close: "Sluiten", next: "Verder",
      tab_kids: "Kinderen", tab_tasks: "Opdrachten", tab_rewards: "Beloningen", tab_lists: "Lijsten", tab_verbs: "Werkwoorden", tab_results: "Resultaten", tab_settings: "Instellingen",
      praise: ["Juist!", "Super!", "Goed zo!", "Knap!", "Helemaal juist!", "Top!"], retry: "Nog niet. Probeer nog eens.", it_is: "Het is:",
      question_of: (i, n) => `Vraag ${i} van ${n}`
    },
    fr: {
      who: "Qui es-tu ?", who_hint: "Pas encore d'enfants. Clique sur \"Parents\" pour en ajouter un.", parents: "Parents", switch: "Changer",
      todo: "À faire", todo_parents: "Mission de papa et maman", practice: "S'exercer", practice_sub: "Le système choisit ce que tu ne maîtrises pas encore.",
      test: "Test", test_sub: "Sans indices, score à la fin, bonus à partir de 90 %.", shop: "La boutique", shop_all: "Tout voir",
      today: "exercices aujourd'hui", goal: "objectif du jour", week: "points cette semaine", best: "meilleure série",
      how_many: "Combien de questions ?", start: "Commencer", back: "Retour", again: "Encore", home: "Accueil",
      dont_know: "Je ne sais pas", stop: "Arrêter", ok: "OK", type_answer: "tape ta réponse",
      shop_hint: "Tu échanges des points ; papa ou maman confirme.", my_requests: "Mes demandes",
      parent_panel: "Espace parents", pin_placeholder: "code", close: "Fermer", next: "Continuer",
      tab_kids: "Enfants", tab_tasks: "Missions", tab_rewards: "Récompenses", tab_lists: "Listes", tab_verbs: "Verbes", tab_results: "Résultats", tab_settings: "Réglages",
      praise: ["Juste !", "Super !", "Bravo !", "Exact !", "Parfait !"], retry: "Pas encore. Essaie à nouveau.", it_is: "C'est :",
      question_of: (i, n) => `Question ${i} sur ${n}`
    }
  };
  OK.lang = () => (OK.state().settings || {}).lang || OK.region().lang || "nl";
  OK.t = function (key) { const d = UI[OK.lang()] || UI.nl; const v = d[key] !== undefined ? d[key] : UI.nl[key]; if (typeof v === "function") return v.apply(null, [].slice.call(arguments, 1)); return v === undefined ? key : v; };
  /* vaste teksten in de html: elementen met data-i18n krijgen hun tekst uit het taalbestand */
  OK.applyI18n = function () {
    document.querySelectorAll("[data-i18n]").forEach(el => { const v = OK.t(el.dataset.i18n); if (typeof v === "string") el.textContent = v; });
    document.querySelectorAll("[data-i18n-placeholder]").forEach(el => { el.placeholder = OK.t(el.dataset.i18nPlaceholder); });
    document.documentElement.lang = OK.lang();
  };
})(window.OK);
