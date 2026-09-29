# IVT — Ivoire Vivrier Trading

« Des champs aux marchés urbains. » Site statique (HTML / CSS / JS vanilla), sans installation ni étape de build, publié sur GitHub Pages.

## Pages
- `index.html` — Accueil (terroir, carte des zones de production)
- `boutique.html` — Boutique : catalogue de gros, filtres, recherche, tri
- `prix.html` — Tendance prix du marché : lampe + calculatrice (`#balance`), indice IVT, courants de la semaine, mercuriale (`#mercuriale`), carte des mouvements, comparatif Yamoussoukro
- `produit.html?p=<slug>` — Fiche produit
- `panier.html` — Panier (devis par WhatsApp ou e-mail)
- `404.html` — Page introuvable

## Structure
```
data/          catalogue.js (fiches produits) · prix.js (relevés hebdomadaires) · geo.js (zones de production)
assets/css/    ivt.css (commun) · prix.css · terroir.css · boutique-*.css · fiche-gl.css · gl-commerce.css
assets/js/     app.js (IVT_APP : panier, prix, rendu) · fx.js (en-tête, menu, effets) · prix*.js · boutique-champ.js · panier-fx.js · terroir-*.js
assets/js/gl/  ivt-gl.js (socle WebGL partagé, Three.js chargé à la demande) + couches WebGL par page
assets/img/    produits/<slug>.webp · gros/ · terrain/ · logos · og-ivt.jpg (image de partage)
assets/data/   prix.json (export des relevés pour une lecture externe)
```

## Mettre à jour les prix chaque semaine (`data/prix.js`)
1. Ajouter la semaine à la fin de `semaines` : `{ debut: 'AAAA-MM-JJ', fin: 'AAAA-MM-JJ' }`.
2. Ajouter **une valeur à la fin de chaque tableau `r`** : `7000` (prix unique), `[6000, 7000]` (fourchette), `[6000, 7000, 'filet 25 kg']` (fourchette + précision) ou `null` (pas de relevé).
3. Si le contenant change (sac → filet…), ajouter l'index de la semaine dans `rupt` : la variation n'est pas calculée.
4. Incrémenter `?v=` de `data/prix.js` dans les pages (cache).

Tout le site se recalcule seul : indice, variations, boutique, panier, calculatrice.

## Ajouter un produit
1. `data/catalogue.js` : ajouter la fiche (`slug`, `nom`, `categorie`, `unite`, `colis`, `origine`…).
2. `data/prix.js` : ajouter la série avec le **même `slug`** et ses relevés. Un produit sans relevé n'apparaît pas (aucun prix inventé).
3. `assets/img/produits/<slug>.webp` : photo détourée, carrée, ~900 px, WebP.
4. (Optionnel) `data/geo.js` : zones de production du produit.

## Déployer (GitHub Pages)
```bash
git add -A
git commit -m "Mise à jour des prix — semaine du JJ/MM"
git push origin main
```
Première publication : GitHub → Settings → Pages → Source « Deploy from a branch » → `main` / `(root)`.
Le site est servi sur `https://stan77i.github.io/ivt-boutique/` (adresse utilisée par `sitemap.xml`, `robots.txt` et les balises de partage : à adapter si le domaine change).
