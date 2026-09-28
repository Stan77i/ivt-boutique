/* ============================================================
   IVT — RELEVÉS DE PRIX RÉELS · Marché de gros d'Adjamé (Abidjan)
   ------------------------------------------------------------
   Source unique des prix du site. Ce fichier alimente :
   - la page Tendance prix du marché (prix.html)
   - les prix du catalogue (boutique, fiche produit, panier, accueil)

   MISE À JOUR HEBDOMADAIRE
   1. Ajouter la semaine à la fin de `semaines`
   2. Ajouter une valeur à la fin de chaque tableau `r` :
        7000              prix unique
        [6000, 7000]      fourchette min–max
        [6000, 7000, 'filet 25 kg']   fourchette + précision (unité, variété)
        null              pas de relevé cette semaine
   3. Si le contenant change (ex. sac → filet), ajouter l'index de la
      semaine dans `rupt` : la variation n'est alors pas calculée.

   Prix en FCFA. Médian = milieu de la fourchette.
   ============================================================ */

window.IVT_PRIX = {

  marche: "Marché de gros d'Adjamé",
  ville: 'Abidjan',

  semaines: [
    { debut: '2026-08-03', fin: '2026-08-09' },
    { debut: '2026-08-10', fin: '2026-08-16' },
    { debut: '2026-08-17', fin: '2026-08-23' },
    { debut: '2026-08-24', fin: '2026-08-30' },
    { debut: '2026-08-31', fin: '2026-09-06' },
    { debut: '2026-09-07', fin: '2026-09-13' },
    { debut: '2026-09-14', fin: '2026-09-20' },
    { debut: '2026-09-28', fin: '2026-10-04' }
  ],

  categories: [
    { id: 'legumes',   nom: 'Légumes' },
    { id: 'piments',   nom: 'Piments' },
    { id: 'fruits',    nom: 'Fruits' },
    { id: 'feculents', nom: 'Féculents' },
    { id: 'herbes',    nom: 'Herbes' }
  ],

  series: [
    /* ---------------- Légumes ---------------- */
    { id: 'tomate', slug: 'tomate', nom: 'Tomate', cat: 'legumes', unite: 'kg', cond: 'Carton ~40 kg',
      r: [[750, 800], [600, 750], [600, 700], [600, 650], [400, 650], [500, 600], [300, 500], [300, 350]] },
    { id: 'gombo', slug: 'gombo', nom: 'Gombo', cat: 'legumes', unite: 'sac', cond: 'Sac de 25 kg', kg: 25,
      r: [10000, [11000, 13000], 8000, 7000, 5000, [7000, 8000], [5000, 5500], [6000, 8000]] },
    { id: 'courgette-verte', nom: 'Courgette verte', cat: 'legumes', unite: 'kg', cond: 'Sac ~60 kg',
      r: [150, [100, 125], 100, 100, 100, [100, 125], [100, 125], [75, 100]] },
    { id: 'courgette-obra', nom: 'Courgette obra', cat: 'legumes', unite: 'kg', cond: 'Au kg',
      r: [150, [100, 125], 100, 100, 125, [100, 125], [100, 125], [75, 100]] },
    { id: 'oignon-blanc', slug: 'oignon-blanc', nom: 'Oignon blanc', cat: 'legumes', unite: 'sac', cond: 'Sac de 25 kg', kg: 25,
      r: [10500, 10500, 12000, 11000, 14000, 16000, 16000, [13000, 14000]] },
    { id: 'oignon-violet', slug: 'oignon-violet', nom: 'Oignon violet', cat: 'legumes', unite: 'sac', cond: 'Sac de 25 kg', kg: 25,
      r: [12000, 12000, 11000, 12000, 13000, 15000, 15000, [12500, 13000]] },
    { id: 'poivron-vert', slug: 'poivron-vert', nom: 'Poivron vert', cat: 'legumes', unite: 'kg', cond: 'Carton ~25 kg',
      r: [1800, 1500, 1200, 600, 500, [600, 700], [500, 600], [300, 350]] },
    { id: 'aubergine-blanche', slug: 'aubergine-blanche', nom: 'Aubergine blanche', cat: 'legumes', unite: 'sac', cond: 'Sac ivograin ~45 kg', kg: 45,
      r: [15000, [12000, 14000], 8000, 7000, [7000, 8000], [7000, 8000], [7500, 8000], [9000, 10000]] },
    { id: 'aubergine-violette', slug: 'aubergine-violette', nom: 'Aubergine violette', cat: 'legumes', unite: 'sac', cond: 'Sac ivograin ~45 kg', kg: 45,
      r: [15000, [13000, 15000], null, 9000, 14500, [15000, 16000], [11500, 12000], [9000, 11000]] },
    { id: 'concombre', slug: 'concombre', nom: 'Concombre', cat: 'legumes', unite: 'kg', cond: 'Sac ~70 kg',
      r: [350, [250, 300], [200, 250], 100, [125, 150], [100, 125, 'Tokyo'], [100, 125, 'Tokyo'], [100, 125]] },
    { id: 'ail', slug: 'ail', nom: 'Ail', cat: 'legumes', unite: 'carton', cond: 'Carton de 10 kg', kg: 10,
      r: [9500, 9500, 9500, 9500, 10500, 11000, 11000, [9500, 10000]] },
    { id: 'haricot-vert-local', slug: 'haricot-vert-local', nom: 'Haricot vert local', cat: 'legumes', unite: 'kg', cond: 'Au kg',
      r: [1000, 700, 600, 400, [400, 450], [250, 350], null, null] },
    { id: 'haricot-vert-burkina', slug: 'haricot-vert-burkina', nom: 'Haricot vert Burkina', cat: 'legumes', unite: 'kg', cond: 'Au kg',
      r: [1000, 700, 600, 400, [500, 600], [350, 450], null, null] },
    { id: 'choux', slug: 'choux', nom: 'Chou', cat: 'legumes', unite: 'kg', cond: 'Au kg',
      r: [550, [500, 550], 275, 375, [350, 375], [375, 400], [275, 300], [350, 375]] },

    /* ---------------- Piments ---------------- */
    { id: 'piment-vert', slug: 'piment-vert', nom: 'Piment vert', cat: 'piments', unite: 'sac', cond: 'Sac ivograin',
      r: [null, null, [8000, 8000, 'petit sac'], [9000, 9000, 'petit sac'], [7000, 8000, 'petit sac'], [7000, 8000, 'sac ivograin'], [7000, 8000, 'sac ivograin'], null],
      rupt: [5] },
    { id: 'piment-garba', slug: 'piment-garba', nom: 'Piment garba', cat: 'piments', unite: 'sac', cond: 'Sac',
      r: [null, null, [14000, 14000, 'sac ivograin · 17 000 F le sac de 120 kg'], [10000, 10000, 'sac ivograin'], [11000, 11000, 'sac 22 kg'], null, null, [12000, 13000, 'sac']],
      rupt: [4, 7] },
    { id: 'piment-big-sun', slug: 'piment-big-sun', nom: 'Piment big sun', cat: 'piments', unite: 'sac', cond: 'Sac 20–25 kg',
      r: [null, null, null, [30000, 30000, 'sac 25 kg'], [11000, 11000, 'filet 20 kg'], [10000, 11000, 'sac 20 kg'], [9000, 10000, 'sac 20 kg'], [10000, 11000, 'sac 25 kg']],
      rupt: [4, 7] },
    { id: 'piment-big-sun-ivograin', nom: 'Piment big sun', variante: 'sac ivograin', cat: 'piments', unite: 'sac', cond: 'Sac ivograin',
      r: [null, [100000, 110000], null, null, 65000, [60000, 65000], null, null] },

    /* ---------------- Fruits ---------------- */
    { id: 'papaye-ronde', slug: 'papaye-ronde', nom: 'Papaye ronde', cat: 'fruits', unite: 'sac', cond: 'Sac',
      r: [[9000, 12000, 'papaye'], [8000, 10000, 'papaye'], [8000, 9000, 'papaye'], [8000, 9000, 'papaye'], [6500, 7000, 'papaye'], [5000, 6000], [5500, 6000], [5500, 6000]] },
    { id: 'papaye-solo', slug: 'papaye-solo', nom: 'Papaye solo', cat: 'fruits', unite: 'sac', cond: 'Sac',
      r: [null, null, null, null, null, [6000, 7000], [6500, 7000], [6500, 7000]] },
    { id: 'orange-locale', slug: 'orange-locale', nom: 'Orange locale', cat: 'fruits', unite: 'sac', cond: 'Sac de 25 kg', kg: 25,
      r: [[8000, 8000, 'sac ivograin'], [8000, 8000, 'sac ivograin'], [9000, 9000, 'sac ivograin'], [9000, 9000, 'sac ivograin'], [6500, 7000, 'filet 25 kg'], [6500, 7000], [6500, 7000], [6000, 7000]],
      rupt: [4] },
    { id: 'ananas', slug: 'ananas', nom: 'Ananas', cat: 'fruits', unite: 'pièce', cond: 'À la pièce',
      r: [[250, 500], [250, 500], [250, 500], [250, 400], [250, 400], [250, 500], [250, 500], [250, 500]] },
    { id: 'banane-douce', slug: 'banane-douce', nom: 'Banane douce', cat: 'fruits', unite: 'caisse', cond: 'Caisse de 24 kg', kg: 24,
      r: [7000, 7000, 7000, 7000, 7000, 7000, 7000, 7000] },
    { id: 'avocat', slug: 'avocat', nom: 'Avocat', cat: 'fruits', unite: 'sac', cond: 'Sac de 25 kg', kg: 25,
      r: [[18000, 23000], [18000, 20000], [18000, 20000], 18000, [18000, 20000, 'filet 25 kg'], [15000, 16000], [15000, 16000], null] },
    { id: 'citron', slug: 'citron', nom: 'Citron', cat: 'fruits', unite: 'sac', cond: 'Sac de 25 kg', kg: 25,
      r: [6000, 6000, [4000, 5000], 4000, [4000, 5000], [5000, 5500], [5000, 5500], [4000, 5000]] },
    { id: 'pasteque', slug: 'pasteque', nom: 'Pastèque', cat: 'fruits', unite: 'kg', cond: 'Au kg',
      r: [350, 300, 300, 300, [250, 275], [275, 300], [275, 300], null] },

    /* ---------------- Féculents ---------------- */
    { id: 'pomme-de-terre', slug: 'pomme-de-terre', nom: 'Pomme de terre', cat: 'feculents', unite: 'sac', cond: 'Sac de 25 kg', kg: 25,
      r: [10500, 13000, 13000, 12000, 13000, [12500, 13000], [12000, 12500], [12000, 12500]] },
    { id: 'banane-plantain', slug: 'banane-plantain', nom: 'Banane plantain', cat: 'feculents', unite: 'sac', cond: 'Sac',
      r: [[19000, 24000], [18000, 21000], [19000, 20000], 16000, [14000, 15000], [14000, 15000], [14000, 15000], [11000, 13000]] },
    { id: 'patate-douce', slug: 'patate-douce', nom: 'Patate douce', cat: 'feculents', unite: 'sac', cond: 'Sac ivograin',
      r: [null, [10000, 12000], [9000, 11000], 9000, [8000, 9000], [8500, 9000, 'blanche'], [8500, 9000, 'blanche'], [10000, 11000]] },
    { id: 'patate-douce-jaune', slug: 'patate-douce-jaune', nom: 'Patate douce jaune', cat: 'feculents', unite: 'sac', cond: 'Sac ivograin',
      r: [null, null, null, null, [10000, 10500], null, [11000, 12000], null], nouveau: true },
    { id: 'patate-douce-blanche-sac', nom: 'Patate douce blanche', variante: 'sac simple', cat: 'feculents', unite: 'sac', cond: 'Sac',
      r: [null, null, null, null, null, null, null, [6000, 7000]] },

    /* ---------------- Herbes ---------------- */
    { id: 'feuille-oignon', slug: 'feuille-oignon', nom: "Feuille d'oignon", cat: 'herbes', unite: 'botte', cond: 'À la botte',
      r: [null, null, null, null, 300, null, null, null] },
    { id: 'persil', slug: 'persil', nom: 'Persil', cat: 'herbes', unite: 'botte', cond: 'À la botte',
      r: [1500, 1200, null, null, 400, null, 200, null] }
  ],

  /* Relevés ponctuels hors Abidjan — comparatif. `adj` = série Adjamé comparable, `div` = conversion vers l'unité Adjamé */
  yamoussoukro: {
    releves: [
      { date: '2026-09-02', semaine: 4 },
      { date: '2026-09-16', semaine: 6 }
    ],
    produits: [
      { nom: 'Tomate', unite: 'kg', r: [[400, 500], [400, 450]], adj: 'tomate' },
      { nom: 'Chou', unite: 'kg', r: [500, 350], adj: 'choux' },
      { nom: 'Chou blanc', unite: 'kg', r: [600, 450] },
      { nom: 'Poivron', unite: 'kg', r: [900, [450, 500]], adj: 'poivron-vert' },
      { nom: 'Ail', unite: 'kg', r: [1500, 1300], adj: 'ail', div: 10 },
      { nom: 'Haricot vert', unite: 'kg', r: [700, [400, 500]], adj: 'haricot-vert-local' },
      { nom: 'Oignon', unite: 'sac', r: [11000, 10000] },
      { nom: 'Gombo', unite: 'unité non précisée', r: [6000, [5000, 6500]] },
      { nom: 'Courgette', unite: 'tas', r: [[500, 1000], [500, 600]] },
      { nom: 'Concombre', unite: 'tas', r: [150, 100] },
      { nom: 'Céleri', unite: 'tas', r: [450, 450] },
      { nom: 'Navet', unite: 'unité non précisée', r: [250, 250] },
      { nom: 'Aubergine djamba', unite: 'unité non précisée', r: [7000, [7000, 8000]] },
      { nom: 'Aubergine violette', unite: 'unité non précisée', r: [10000, 10000] },
      { nom: 'Piment garba', unite: 'unité non précisée', r: [15000, 18000] },
      { nom: 'Piment sent bon', unite: 'unité non précisée', r: [35000, 40000] },
      { nom: 'Igname kponan', unite: 'kg', r: [500, 500], nouveau: true },
      { nom: 'Igname awassa', unite: 'kg', r: [400, null], nouveau: true },
      { nom: 'Carotte', unite: 'kg', r: [1000, null], nouveau: true }
    ]
  }
};

/* ---------- Normalisation + branchement sur le catalogue ---------- */
(function () {
  var P = window.IVT_PRIX;
  var norm = function (v) {
    if (v == null) return null;
    if (typeof v === 'number') return [v, v];
    return v;
  };
  P.series.forEach(function (s) { s.r = s.r.map(norm); s.rupt = s.rupt || []; });
  P.yamoussoukro.produits.forEach(function (y) { y.r = y.r.map(norm); });

  var C = window.IVT;
  if (!C) return;
  var parSlug = {};
  P.series.forEach(function (s) { if (s.slug) parSlug[s.slug] = s; });
  C.semaines = P.semaines.map(function (w) { return w.debut; });
  // Seuls les produits réellement relevés restent au catalogue : aucun prix inventé.
  C.produits = C.produits.filter(function (p) {
    var s = parSlug[p.slug];
    if (!s) return false;
    p.prix = s.r.map(function (v) { return v ? Math.round((v[0] + v[1]) / 2) : null; });
    p.fourchettes = s.r;
    p.ruptures = s.rupt;
    p.unite = s.unite;
    p.colis = s.cond;
    return p.prix.some(function (v) { return v != null; });
  });
})();
