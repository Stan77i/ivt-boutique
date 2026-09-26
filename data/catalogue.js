/* ============================================================
   IVT — BASE DE DONNÉES PRODUITS & PRIX DE GROS
   ------------------------------------------------------------
   MISE À JOUR HEBDOMADAIRE :
   1. Ajouter la nouvelle date (lundi) à la fin de `semaines`
   2. Ajouter le nouveau prix à la fin du tableau `prix` de chaque produit
   Les deux tableaux doivent toujours avoir la même longueur.

   Ou, plus simple :  node scripts/ajouter-prix.mjs bulletins/2026-09-21.txt

   Prix en FCFA. Les valeurs ci-dessous sont des ordres de grandeur
   de démonstration — à remplacer par le bulletin de gros réel.
   ============================================================ */

window.IVT = {

  semaines: [
    '2026-07-13', '2026-07-20', '2026-07-27', '2026-08-03', '2026-08-10',
    '2026-08-17', '2026-08-24', '2026-08-31', '2026-09-07', '2026-09-14'
  ],

  categories: [
    { id: 'legumes',   nom: 'Légumes' },
    { id: 'fruits',    nom: 'Fruits' },
    { id: 'feculents', nom: 'Féculents' },
    { id: 'herbes',    nom: 'Feuilles et herbes aromatiques' }
  ],

  produits: [

    /* ---------------------- LÉGUMES ---------------------- */
    {
      slug: 'tomate', nom: 'Tomate', categorie: 'legumes',
      unite: 'kg', colis: 'Cageot de 25 kg', origine: 'Bouaké · Korhogo',
      note: 'Tomate de plein champ, calibre moyen, ferme et bien colorée. Récolte du jour, triée au conditionnement.',
      prix: [520, 545, 560, 590, 640, 705, 680, 655, 620, 600]
    },
    {
      slug: 'gombo', nom: 'Gombo', categorie: 'legumes',
      unite: 'kg', colis: 'Sac de 30 kg', origine: 'Yamoussoukro · Toumodi',
      note: 'Gombo jeune et tendre, cueilli avant fibrage. Idéal sauce et marché de détail.',
      prix: [700, 730, 780, 820, 860, 900, 880, 840, 810, 790]
    },
    {
      slug: 'oignon-blanc', nom: 'Oignon blanc', categorie: 'legumes',
      unite: 'kg', colis: 'Sac de 50 kg', origine: 'Ferké · Import Niger',
      note: 'Bulbe sec, bonne conservation. Disponible en gros volume toute l\'année.',
      prix: [450, 460, 470, 490, 520, 540, 530, 515, 500, 490]
    },
    {
      slug: 'oignon-violet', nom: 'Oignon violet', categorie: 'legumes',
      unite: 'kg', colis: 'Sac de 50 kg', origine: 'Import Niger · Burkina',
      note: 'Chair violette, goût prononcé. Très demandé en restauration et maquis.',
      prix: [500, 510, 525, 545, 575, 600, 590, 570, 555, 540]
    },
    {
      slug: 'poivron-vert', nom: 'Poivron vert', categorie: 'legumes',
      unite: 'kg', colis: 'Cageot de 15 kg', origine: 'Bouaké · Dabou',
      note: 'Poivron charnu, brillant, calibre régulier. Conditionné en cageot ventilé.',
      prix: [820, 850, 880, 920, 980, 1020, 990, 950, 920, 900]
    },
    {
      slug: 'aubergine-blanche', nom: 'Aubergine blanche', categorie: 'legumes',
      unite: 'kg', colis: 'Sac de 25 kg', origine: 'Agboville · Tiassalé',
      note: 'Variété locale ronde, peu amère. Forte rotation sur les marchés d\'Abidjan.',
      prix: [350, 360, 375, 390, 420, 445, 430, 415, 400, 390]
    },
    {
      slug: 'aubergine-violette', nom: 'Aubergine violette', categorie: 'legumes',
      unite: 'kg', colis: 'Cageot de 20 kg', origine: 'Tiassalé · Dabou',
      note: 'Peau lisse et brillante, chair dense. Calibre homogène pour la revente.',
      prix: [400, 415, 430, 450, 480, 505, 490, 470, 455, 445]
    },
    {
      slug: 'concombre', nom: 'Concombre', categorie: 'legumes',
      unite: 'kg', colis: 'Cageot de 20 kg', origine: 'Dabou · Grand-Lahou',
      note: 'Concombre long, peau fine, très bonne tenue au transport.',
      prix: [440, 455, 470, 490, 525, 550, 535, 515, 500, 490]
    },
    {
      slug: 'ail', nom: 'Ail', categorie: 'legumes',
      unite: 'carton', colis: 'Carton de 10 kg', origine: 'Import',
      note: 'Têtes sèches, gousses pleines. Carton de 10 kg pour longue conservation.',
      prix: [10450, 10600, 10850, 11150, 11550, 11950, 11750, 11400, 11150, 11000]
    },
    {
      slug: 'haricot-vert-local', nom: 'Haricot vert local', categorie: 'legumes',
      unite: 'kg', colis: 'Cageot de 10 kg', origine: 'Bouaké · Katiola',
      note: 'Gousse fine et cassante, récolte manuelle. Fraîcheur garantie 48 h.',
      prix: [1100, 1140, 1180, 1250, 1340, 1420, 1380, 1300, 1240, 1200]
    },
    {
      slug: 'haricot-vert-burkina', nom: 'Haricot vert Burkina', categorie: 'legumes',
      unite: 'kg', colis: 'Cageot de 10 kg', origine: 'Import Burkina Faso',
      note: 'Calibre extra-fin, régulier. Approvisionnement stable hors saison locale.',
      prix: [950, 970, 1000, 1040, 1100, 1160, 1130, 1080, 1040, 1010]
    },
    {
      slug: 'piment-vert', nom: 'Piment vert', categorie: 'legumes',
      unite: 'kg', colis: 'Sac de 15 kg', origine: 'Divo · Gagnoa',
      note: 'Piment allongé, piquant moyen. Très recherché en sauce fraîche.',
      prix: [1300, 1380, 1450, 1560, 1700, 1820, 1750, 1640, 1560, 1500]
    },
    {
      slug: 'piment-garba', nom: 'Piment garba', categorie: 'legumes',
      unite: 'kg', colis: 'Sac de 15 kg', origine: 'Bondoukou · Abengourou',
      note: 'Le piment du garba : très piquant, arôme puissant. Volume limité en saison.',
      prix: [1550, 1640, 1720, 1850, 2000, 2150, 2050, 1930, 1840, 1780]
    },
    {
      slug: 'piment-big-sun', nom: 'Piment big sun', categorie: 'legumes',
      unite: 'kg', colis: 'Cageot de 12 kg', origine: 'Gagnoa · Issia',
      note: 'Gros piment habanero multicolore, chair épaisse. Rendement élevé en pâte.',
      prix: [1900, 1980, 2080, 2200, 2380, 2500, 2420, 2300, 2200, 2140]
    },
    {
      slug: 'choux', nom: 'Choux', categorie: 'legumes',
      unite: 'kg', colis: 'Sac de 30 kg', origine: 'Korhogo · Man',
      note: 'Pomme ferme et serrée, feuilles bien vertes. Excellente tenue en chambre froide.',
      prix: [400, 415, 430, 450, 480, 505, 490, 470, 455, 440]
    },

    /* ---------------------- FRUITS ---------------------- */
    {
      slug: 'papaye-ronde', nom: 'Papaye ronde', categorie: 'fruits',
      unite: 'sac', colis: 'Sac', origine: 'Azaguié · Tiassalé',
      note: 'Papaye ronde, chair orangée et sucrée. Fourchette du marché : 5 500 – 6 000 F le sac.',
      prix: [5000, 5150, 5350, 5600, 6000, 6350, 6150, 5900, 5650, 5500]
    },
    {
      slug: 'papaye-solo', nom: 'Papaye solo', categorie: 'fruits',
      unite: 'sac', colis: 'Sac', origine: 'Azaguié · Tiassalé',
      note: 'Papaye solo allongée, chair ferme et parfumée. Fourchette du marché : 6 500 – 7 000 F le sac.',
      prix: [5900, 6100, 6300, 6600, 7100, 7500, 7300, 7000, 6700, 6500]
    },
    {
      slug: 'orange-locale', nom: 'Orange locale', categorie: 'fruits',
      unite: 'kg', colis: 'Sac de 40 kg', origine: 'Agnibilékrou · Abengourou',
      note: 'Orange de Côte d\'Ivoire, très juteuse, peau verte à jaune. Idéale jus.',
      prix: [260, 265, 275, 290, 310, 330, 320, 305, 295, 285]
    },
    {
      slug: 'orange-ghana', nom: 'Orange Ghana', categorie: 'fruits',
      unite: 'kg', colis: 'Sac de 40 kg', origine: 'Import Ghana',
      note: 'Calibre supérieur, forte teneur en jus. Disponible en contre-saison.',
      prix: [340, 350, 360, 375, 400, 425, 410, 395, 380, 370]
    },
    {
      slug: 'ananas', nom: 'Ananas', categorie: 'fruits',
      unite: 'kg', colis: 'Cageot de 18 kg', origine: 'Bonoua · Adiaké',
      note: 'Cayenne lisse et MD2, couronne saine. Le fleuron du vivrier ivoirien.',
      prix: [350, 360, 375, 390, 420, 440, 425, 410, 395, 385]
    },
    {
      slug: 'banane-douce', nom: 'Banane douce', categorie: 'fruits',
      unite: 'caisse', colis: 'Caisse de 24 kg', origine: 'Azaguié · Dabou',
      note: 'Banane dessert, doigts bien formés. Livrée en caisse de 24 kg, verte ou mûre sur demande.',
      prix: [6350, 6500, 6750, 7100, 7550, 8000, 7750, 7400, 7150, 7000]
    },
    {
      slug: 'avocat', nom: 'Avocat', categorie: 'fruits',
      unite: 'kg', colis: 'Cageot de 12 kg', origine: 'Man · Danané',
      note: 'Avocat à peau épaisse, chair onctueuse. Excellente résistance au transport.',
      prix: [620, 650, 680, 720, 780, 830, 800, 760, 730, 710]
    },
    {
      slug: 'citron', nom: 'Citron', categorie: 'fruits',
      unite: 'kg', colis: 'Sac de 25 kg', origine: 'Abengourou · Adzopé',
      note: 'Citron vert-jaune, écorce fine, très parfumé. Forte demande restauration.',
      prix: [520, 545, 570, 610, 665, 710, 685, 645, 615, 595]
    },
    {
      slug: 'pasteque', nom: 'Pastèque', categorie: 'fruits',
      unite: 'kg', colis: 'Lot de 10 pièces', origine: 'Korhogo · Ferké',
      note: 'Pastèque ronde, chair rouge et croquante. Calibre 4 à 8 kg la pièce.',
      prix: [210, 220, 230, 245, 265, 285, 275, 260, 250, 240]
    },

    /* ---------------------- FÉCULENTS ---------------------- */
    {
      slug: 'pomme-de-terre', nom: 'Pomme de terre', categorie: 'feculents',
      unite: 'kg', colis: 'Sac de 50 kg', origine: 'Import',
      note: 'Tubercule à chair ferme, bon calibre friture. Stockage longue durée.',
      prix: [490, 500, 515, 535, 570, 595, 580, 560, 545, 535]
    },
    {
      slug: 'banane-plantain', nom: 'Banane plantain', categorie: 'feculents',
      unite: 'kg', colis: 'Régime / sac 40 kg', origine: 'Agboville · Adzopé',
      note: 'Plantain corne et gros michel. Le pilier de l\'alliage et de l\'aloko.',
      prix: [340, 355, 370, 395, 430, 460, 445, 420, 405, 395]
    },
    {
      slug: 'patate-douce', nom: 'Patate douce', categorie: 'feculents',
      unite: 'kg', colis: 'Sac de 50 kg', origine: 'Korhogo · Boundiali',
      note: 'Patate à chair blanche, peau cuivrée. Récolte triée et brossée.',
      prix: [300, 310, 320, 335, 360, 380, 370, 355, 345, 335]
    },
    {
      slug: 'patate-douce-jaune', nom: 'Patate douce jaune', categorie: 'feculents',
      unite: 'kg', colis: 'Sac de 50 kg', origine: 'Korhogo · Ferké',
      note: 'Chair jaune plus sucrée, riche en bêta-carotène. Calibre régulier.',
      prix: [350, 360, 375, 395, 420, 445, 430, 415, 400, 390]
    },

    /* ------------ FEUILLES ET HERBES AROMATIQUES ------------ */
    {
      slug: 'feuille-oignon', nom: 'Feuille d\'oignon', categorie: 'herbes',
      unite: 'kg', colis: 'Botte / caisse 5 kg', origine: 'Dabou · Bingerville',
      note: 'Ciboule fraîche en bottes liées, feuilles droites et fermes. Livraison du matin.',
      prix: [850, 890, 940, 1010, 1120, 1210, 1160, 1080, 1020, 980]
    },
    {
      slug: 'persil', nom: 'Persil', categorie: 'herbes',
      unite: 'kg', colis: 'Botte / caisse 5 kg', origine: 'Bingerville · Anyama',
      note: 'Persil plat, feuillage dense et parfumé. Conditionné en bottes de 250 g.',
      prix: [1000, 1050, 1110, 1200, 1330, 1440, 1380, 1290, 1220, 1170]
    }

  ]
};
