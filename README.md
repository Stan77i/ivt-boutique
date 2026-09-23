# IVT — Ivoire Vivrier Trading

Site e-commerce de vente en gros de produits vivriers (Côte d'Ivoire).
HTML/CSS/JS, sans framework ni dépendance : il s'ouvre en double-cliquant
sur `index.html` et se déploie tel quel sur GitHub Pages, Netlify ou un
hébergement classique.

---

## Pages

| Fichier | Rôle |
|---|---|
| `index.html` | Accueil — hero avec sélecteur produit, bandeau de prix, sélection, savoir-faire |
| `boutique.html` | Catalogue filtrable + mercuriale complète (`#mercuriale`) |
| `produit.html?p=<slug>` | Fiche produit : prix, caractéristiques, graphique d'évolution, ajout au panier |
| `panier.html` | Panier, récapitulatif, génération d'une demande de cotation par e-mail |

Le panier est conservé dans le navigateur (`localStorage`) et se synchronise
entre les pages.

---

## Mettre à jour les prix chaque semaine

### Méthode recommandée — par bulletin

1. Copier `bulletins/MODELE.txt`, le renommer avec la date du lundi
   (ex. `bulletins/2026-09-21.txt`) et y saisir les prix relevés.
2. Lancer :

   ```bash
   node scripts/ajouter-prix.mjs bulletins/2026-09-21.txt
   ```

Le script ajoute la semaine au catalogue, actualise chaque produit et
reporte automatiquement le prix précédent pour les produits absents du
bulletin. Relancer avec la même date corrige le relevé au lieu de le
dupliquer.

### Méthode manuelle

Éditer `data/catalogue.js` : ajouter la date à la fin de `semaines`, puis
un prix à la fin du tableau `prix` de chaque produit. Les deux tableaux
doivent rester de même longueur.

---

## Images produits

Les packshots vont dans `assets/img/produits/`, un fichier PNG par produit,
**à fond transparent**, nommé d'après le slug du produit.
La liste exacte des noms attendus est dans
`assets/img/produits/NOMS-ATTENDUS.txt`.

Tant qu'une image manque, le site affiche un cercle pointillé portant le nom
du produit : la mise en page reste intacte.

### Détourer des photos à fond blanc

```bash
pip3 install --user Pillow
python3 scripts/detourer.py <dossier-de-vos-photos> assets/img/produits
```

Le fond est détecté par propagation depuis les bords de l'image : les zones
blanches situées à l'intérieur du produit (ail, oignon blanc, aubergine
blanche) sont préservées. L'ombre portée, un gris neutre peu saturé, est
effacée à son tour — les paniers et les légumes, eux, sont colorés et ne
sont donc jamais mordus. Le script recadre, centre et redimensionne
en 1000 × 1000 px.

Si un fond résiste (studio très gris) ou si le produit est rogné, les
réglages sont en tête de `scripts/detourer.py` : `TOLERANCE`,
`LUMINOSITE_MIN`, `SATURATION_OMBRE`, `LUMINOSITE_OMBRE`.

Renommer les photos avec les noms attendus **avant** de lancer le script :
il conserve le nom du fichier d'entrée.

### Logo

`assets/img/logo-ivt.svg` est une reconstitution provisoire. Remplacez ce
fichier par le logo officiel (même nom, ou modifiez le `src` dans les quatre
pages) dès que vous avez le fichier vectoriel ou un PNG transparent.

---

## Ajouter un produit

Dans `data/catalogue.js`, ajouter une entrée au tableau `produits` :

```js
{
  slug: 'courgette-verte',            // sert d'URL et de nom d'image
  nom: 'Courgette verte',
  categorie: 'legumes',               // legumes | fruits | feculents | herbes
  unite: 'kg',
  colis: 'Cageot de 15 kg',
  origine: 'Dabou · Azaguié',
  note: 'Description commerciale affichée sur la fiche produit.',
  prix: [/* autant de valeurs que de semaines */]
}
```

Puis déposer `assets/img/produits/courgette-verte.png`.

---

## Personnalisation

Toutes les couleurs, polices et espacements sont regroupés en haut de
`assets/css/ivt.css`, dans le bloc `:root`.

Les coordonnées (e-mail, téléphone) sont à remplacer dans le pied de page
des quatre pages et dans `panier.html` (bouton de cotation).

---

## Données de démonstration

Les prix présents dans `data/catalogue.js` sont des **ordres de grandeur
plausibles**, pas des relevés réels. Ils servent à peupler le prototype et
doivent être remplacés par votre premier bulletin de gros.
