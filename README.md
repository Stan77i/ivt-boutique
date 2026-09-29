# IVT — Ivoire Vivrier Trading

Site statique (HTML / CSS / JS), sans installation ni étape de build.

## Pages
- `index.html` — Accueil
- `boutique.html` — Boutique (catalogue)
- `prix.html` — Tendance prix du marché : indice IVT, variations, mercuriale, carte des mouvements, comparatif Yamoussoukro, balance 3D
- `produit.html` — Fiche produit
- `panier.html` — Panier (commande via WhatsApp)

## Données
- `data/prix.js` — **seul fichier à mettre à jour chaque semaine** (mode d'emploi en tête du fichier)
- `data/catalogue.js` — fiches produits (textes, catégories)
- `assets/data/prix.json` — export des mêmes relevés (lecture externe)

## Technique
- `assets/css/ivt.css` · `assets/css/prix.css`
- `assets/js/app.js` (panier, rendu) · `assets/js/prix.js` (page prix) · `assets/js/balance.js` (balance 3D, Three.js chargé depuis unpkg à l'approche de la section) · `assets/js/fx.js` (effets, en-tête, menu)

## Publication
GitHub Pages → Settings → Pages → branche `main`, dossier `/ (root)`.
