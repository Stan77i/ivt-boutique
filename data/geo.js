/* ============================================================
   IVT — GÉOGRAPHIE DES PRODUITS (source unique)
   ------------------------------------------------------------
   Produit → zone(s) de production → ville(s) → coordonnées → marché(s)
   - Les zones viennent du champ `origine` de data/catalogue.js
     (texte séparé par « · »), résolu via `alias` ci-dessous.
   - Les marchés viennent de data/prix.js : Adjamé (relevé hebdo de
     tous les produits) + Yamoussoukro quand un relevé comparatif existe.
   - Aucune ville par défaut : un produit sans origine connue n'a pas
     de point de production sur la carte.

   Précision des lieux :
     'ville'  coordonnées du centre-ville (± 5 km)
     'pays'   pays d'origine d'un produit importé : repère placé hors
              frontière, dans la direction du pays (approximation assumée)

   Pour ajouter un 34e produit : renseigner son `origine` dans
   catalogue.js. Si une ville est nouvelle, l'ajouter à `places`
   et à `alias`. La scène WebGL se reconstruit seule.
   ============================================================ */
window.IVT_GEO = (function () {
  const places = {
    korhogo:        { nom: 'Korhogo',        lat: 9.458, lon: -5.629, region: 'Poro',             district: 'Savanes',              precision: 'ville' },
    ferkessedougou: { nom: 'Ferkessédougou', lat: 9.593, lon: -5.197, region: 'Tchologo',         district: 'Savanes',              precision: 'ville' },
    boundiali:      { nom: 'Boundiali',      lat: 9.521, lon: -6.487, region: 'Bagoué',           district: 'Savanes',              precision: 'ville' },
    katiola:        { nom: 'Katiola',        lat: 8.137, lon: -5.101, region: 'Hambol',           district: 'Vallée du Bandama',    precision: 'ville' },
    bouake:         { nom: 'Bouaké',         lat: 7.690, lon: -5.030, region: 'Gbêkê',            district: 'Vallée du Bandama',    precision: 'ville' },
    bondoukou:      { nom: 'Bondoukou',      lat: 8.040, lon: -2.800, region: 'Gontougo',         district: 'Zanzan',               precision: 'ville' },
    man:            { nom: 'Man',            lat: 7.412, lon: -7.554, region: 'Tonkpi',           district: 'Montagnes',            precision: 'ville' },
    danane:         { nom: 'Danané',         lat: 7.260, lon: -8.155, region: 'Tonkpi',           district: 'Montagnes',            precision: 'ville' },
    issia:          { nom: 'Issia',          lat: 6.492, lon: -6.586, region: 'Haut-Sassandra',   district: 'Sassandra-Marahoué',   precision: 'ville' },
    gagnoa:         { nom: 'Gagnoa',         lat: 6.132, lon: -5.951, region: 'Gôh',              district: 'Gôh-Djiboua',          precision: 'ville' },
    divo:           { nom: 'Divo',           lat: 5.839, lon: -5.360, region: 'Lôh-Djiboua',      district: 'Gôh-Djiboua',          precision: 'ville' },
    yamoussoukro:   { nom: 'Yamoussoukro',   lat: 6.827, lon: -5.289, region: 'Yamoussoukro',     district: 'Yamoussoukro (autonome)', precision: 'ville' },
    toumodi:        { nom: 'Toumodi',        lat: 6.557, lon: -5.019, region: 'Bélier',           district: 'Lacs',                 precision: 'ville' },
    agnibilekrou:   { nom: 'Agnibilékrou',   lat: 7.131, lon: -3.204, region: 'Indénié-Djuablin', district: 'Comoé',                precision: 'ville' },
    abengourou:     { nom: 'Abengourou',     lat: 6.730, lon: -3.496, region: 'Indénié-Djuablin', district: 'Comoé',                precision: 'ville' },
    tiassale:       { nom: 'Tiassalé',       lat: 5.898, lon: -4.823, region: 'Agnéby-Tiassa',    district: 'Lagunes',              precision: 'ville' },
    agboville:      { nom: 'Agboville',      lat: 5.928, lon: -4.213, region: 'Agnéby-Tiassa',    district: 'Lagunes',              precision: 'ville' },
    azaguie:        { nom: 'Azaguié',        lat: 5.630, lon: -4.082, region: 'Agnéby-Tiassa',    district: 'Lagunes',              precision: 'ville' },
    adzope:         { nom: 'Adzopé',         lat: 6.107, lon: -3.860, region: 'La Mé',            district: 'Lagunes',              precision: 'ville' },
    dabou:          { nom: 'Dabou',          lat: 5.326, lon: -4.377, region: 'Grands-Ponts',     district: 'Lagunes',              precision: 'ville' },
    grandlahou:     { nom: 'Grand-Lahou',    lat: 5.137, lon: -5.024, region: 'Grands-Ponts',     district: 'Lagunes',              precision: 'ville' },
    anyama:         { nom: 'Anyama',         lat: 5.495, lon: -4.052, region: 'Abidjan',          district: 'Abidjan (autonome)',   precision: 'ville' },
    bingerville:    { nom: 'Bingerville',    lat: 5.355, lon: -3.885, region: 'Abidjan',          district: 'Abidjan (autonome)',   precision: 'ville' },
    bonoua:         { nom: 'Bonoua',         lat: 5.272, lon: -3.596, region: 'Sud-Comoé',        district: 'Comoé',                precision: 'ville' },
    adiake:         { nom: 'Adiaké',         lat: 5.286, lon: -3.304, region: 'Sud-Comoé',        district: 'Comoé',                precision: 'ville' },
    burkina:        { nom: 'Burkina Faso',   lat: 10.95, lon: -4.40,  region: 'Import',           district: 'Pays voisin',          precision: 'pays' },
    niger:          { nom: 'Niger',          lat: 11.25, lon: -2.55,  region: 'Import',           district: 'Pays (via corridor nord)', precision: 'pays' }
  };

  // Texte du catalogue → clé de lieu. `null` = mention connue mais non localisable.
  const alias = {
    'Korhogo': 'korhogo', 'Ferké': 'ferkessedougou', 'Ferkessédougou': 'ferkessedougou', 'Boundiali': 'boundiali',
    'Katiola': 'katiola', 'Bouaké': 'bouake', 'Bondoukou': 'bondoukou', 'Man': 'man', 'Danané': 'danane',
    'Issia': 'issia', 'Gagnoa': 'gagnoa', 'Divo': 'divo', 'Yamoussoukro': 'yamoussoukro', 'Toumodi': 'toumodi',
    'Agnibilékrou': 'agnibilekrou', 'Abengourou': 'abengourou', 'Tiassalé': 'tiassale', 'Agboville': 'agboville',
    'Azaguié': 'azaguie', 'Adzopé': 'adzope', 'Dabou': 'dabou', 'Grand-Lahou': 'grandlahou', 'Anyama': 'anyama',
    'Bingerville': 'bingerville', 'Bonoua': 'bonoua', 'Adiaké': 'adiake',
    'Import Niger': 'niger', 'Niger': 'niger', 'Burkina': 'burkina', 'Import Burkina Faso': 'burkina', 'Burkina Faso': 'burkina',
    'Import': null
  };

  const markets = {
    adjame:       { nom: "Marché de gros d'Adjamé", court: 'Adjamé', ville: 'Abidjan', lat: 5.367, lon: -4.017, source: 'data/prix.js · relevé hebdomadaire' },
    yamoussoukro: { nom: 'Marché de Yamoussoukro', court: 'Yamoussoukro', ville: 'Yamoussoukro', lat: 6.820, lon: -5.276, source: 'data/prix.js · relevés comparatifs' }
  };

  function km(a, b) {
    const R = 6371, r = Math.PI / 180, dLat = (b.lat - a.lat) * r, dLon = (b.lon - a.lon) * r;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLon / 2) ** 2;
    return Math.round(2 * R * Math.asin(Math.sqrt(h)));
  }

  function yamoSlugs() {
    const P = window.IVT_PRIX; if (!P || !P.yamoussoukro) return new Set();
    const idToSlug = {}; P.series.forEach(s => { if (s.slug) idToSlug[s.id] = s.slug; });
    return new Set(P.yamoussoukro.produits.filter(y => y.adj && idToSlug[y.adj]).map(y => idToSlug[y.adj]));
  }

  function resolve(p) {
    const tokens = String(p.origine || '').split('·').map(t => t.trim()).filter(Boolean);
    const zones = [], mentions = [], inconnus = [];
    tokens.forEach(t => {
      if (!(t in alias)) { inconnus.push(t); return; }
      const k = alias[t];
      if (k === null) { mentions.push(t); return; }
      if (!zones.some(z => z.key === k)) zones.push(Object.assign({ key: k }, places[k]));
    });
    const mk = ['adjame']; if (yamoSlugs().has(p.slug)) mk.push('yamoussoukro');
    const mkts = mk.map(k => Object.assign({ key: k }, markets[k]));
    let statut;
    if (!tokens.length) statut = 'inconnu';
    else if (!zones.length) statut = 'non-localisable';
    else if (zones.some(z => z.precision === 'pays')) statut = zones.every(z => z.precision === 'pays') ? 'pays' : 'mixte';
    else statut = 'ville';
    const flows = [];
    zones.forEach(z => mkts.forEach(m => flows.push({ from: z.key, to: m.key, km: km(z, m) })));
    return { slug: p.slug, nom: p.nom, origine: p.origine || '', statut, zones, markets: mkts, flows, mentions, inconnus };
  }

  // Phrase affichée : ne présente jamais un repli technique comme une origine.
  function phrase(g) {
    const noms = g.zones.map(z => z.precision === 'pays' ? z.nom + ' (import)' : z.nom);
    if (g.statut === 'inconnu') return { verbe: 'arrive à', lieu: 'Adjamé', note: 'Zone de production non renseignée pour ce produit.' };
    if (g.statut === 'non-localisable') return { verbe: 'arrive à', lieu: 'Adjamé', note: 'Produit importé, pays d’origine non précisé.' };
    return { verbe: 'vient de', lieu: noms.join(' · '), note: g.statut === 'ville' ? '' : 'Import : repère placé dans la direction du pays d’origine.' };
  }

  const cache = {};
  // Contour simplifié de la Côte d'Ivoire (lon, lat), ~40 sommets, sens horaire depuis Tabou.
  const outline = [[-7.53,4.37],[-6.85,4.66],[-6.64,4.73],[-6.08,4.95],[-5.3,5.15],[-5.02,5.12],[-4.6,5.17],[-4.02,5.25],[-3.74,5.18],[-3.3,5.11],[-3.1,5.1],[-2.95,5.5],[-3.1,6.0],[-3.24,6.5],[-3.1,7.0],[-2.95,7.4],[-2.75,8.0],[-2.55,8.25],[-2.65,8.9],[-2.7,9.45],[-3.0,9.85],[-3.6,9.92],[-4.3,9.62],[-4.7,9.72],[-5.1,10.25],[-5.5,10.42],[-6.0,10.2],[-6.25,10.5],[-6.9,10.3],[-7.6,10.45],[-8.0,10.2],[-8.2,9.8],[-8.1,9.3],[-7.85,8.8],[-8.2,8.45],[-8.47,7.6],[-8.3,7.2],[-7.9,6.75],[-7.55,6.2],[-7.4,5.7],[-7.6,5.1]];
  // Zone principale : première ville connue, sinon premier pays, sinon aucune.
  const primary = g => g ? (g.zones.find(z => z.precision === 'ville') || g.zones[0] || null) : null;
  return {
    places, alias, markets, outline, km, phrase, primary,
    product(slug) {
      if (cache[slug]) return cache[slug];
      const C = window.IVT; const p = C && C.produits.find(x => x.slug === slug);
      return p ? (cache[slug] = resolve(p)) : null;
    },
    all() { const C = window.IVT; return C ? C.produits.map(p => this.product(p.slug)) : []; }
  };
})();
