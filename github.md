repo: Stan77i/ivt-boutique
branch: main

## Last sync
date: 2026-09-30T01:10:00Z

### Updated in this project
- Audit mobile (cibles 44 px, zoom iOS, encoche), SEO/partage, fichiers de dépôt (404, robots, sitemap, .gitignore, .nojekyll), README
- Boutique : hero « le champ derrière le comptoir » (champ en perspective, herbes au vent, canopée, végétation selon la collection)
- Balance 3D retirée de la page Tendance prix (section, script, styles, lien Accueil)
- Fiche produit : récit WebGL « Du champ au marché » (zones → collecte → Adjamé → achat)
- Tendance prix : hero « lampe centrale » — interrupteur mural, calculatrice ⇄ tableau de bord synchronisés (IVT_STORE), indice exposé (IVT_INDICE)
- Tendance prix : « Les courants de la semaine », une ligne WebGL par produit (vraies séries), survol → chiffres, clic → historique
- Boutique : couche WebGL partagée (lumière au sol, graines, curseur), réorganisation FLIP des filtres/recherche/tri, trajectoire produit → panier
- Panier : arrivée/retrait des lignes, quantités et totaux animés, panier vide vivant, « Votre chargement »
- Fiche produit : packshot en relief (lumière et parallaxe au pointeur, tassement à l'ajout panier)

## Screen map
| Écran | Fichiers du dépôt |
|---|---|
| Accueil Terroir (refonte WebGL) | Accueil Terroir.dc.html, assets/js/terroir-gl.js, assets/js/terroir-glsl.js |
| Accueil | index.html, data/geo.js, assets/css/ivt.css, assets/css/terroir.css, assets/js/app.js, assets/js/fx.js, assets/js/terroir-page.js |
| Boutique | boutique.html, data/catalogue.js, assets/js/gl/boutique-flux.js, assets/css/boutique-flux.css, assets/js/boutique-champ.js, assets/css/boutique-champ.css |
| Tendance prix du marché | prix.html, assets/css/prix.css, assets/js/prix.js, assets/js/gl/prix-courants.js, data/prix.js, assets/js/prix-scene.js, assets/js/prix-balance.js, assets/js/prix-dash.js |
| Fiche produit | produit.html, data/catalogue.js, data/geo.js, assets/js/gl/*, assets/css/fiche-gl.css |
| Panier | panier.html, assets/js/app.js, assets/js/panier-fx.js, assets/js/gl/panier-charge.js, assets/css/gl-commerce.css |
