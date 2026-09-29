# Audit géographique — #accueil-terroir (33 produits)

Source unique : `data/geo.js` (lieux, alias, marchés, contour, calculs). La scène (`assets/js/terroir-gl.js`) et les textes (`assets/js/terroir-page.js`) sont générés à partir de ce fichier et de `catalogue.js` / `prix.js`. Aucune coordonnée n'est ailleurs.

## Défauts trouvés dans la version précédente
| Défaut | Effet visible | Correction |
|---|---|---|
| Chapitre « Producteur » codé sur Bouaké (sillons, graines, collecte, caméra, label) | Bouaké apparaissait pour tous les produits, avocat compris | Foyer = zone principale réelle du produit choisi ; si aucune zone connue, pas de foyer du tout |
| Chapitre « Des champs aux marchés » codé sur la route Bouaké → Adjamé, avec « ≈ 350 km » en dur | Même trajet quel que soit le produit | Route = zone principale → Adjamé, distance calculée (vol d'oiseau) |
| Caméra du pont (sous la roue) fixe sur tout le pays | Le texte changeait mais la carte ne se déplaçait pas | Cadrage calculé sur les zones + marchés du produit, transition en arc |
| Labels du hero : liste fixe (Korhogo, Bouaké, Man…) | Villes affichées sans lien avec le produit | Seules les zones du produit courant + ses marchés |
| « Import » seul → placé au « port d'Abidjan » | Origine inventée pour ail et pomme de terre | Aucun point de production ; texte « pays d'origine non précisé » |
| Coordonnées dans le code WebGL | Données dispersées | Déplacées dans `data/geo.js` |
| Longitudes non corrigées | Est-ouest étiré de ~1 % | Facteur cos(7,5°) appliqué |
| Marché unique Adjamé | Relevés de Yamoussoukro ignorés | 2ᵉ marché ajouté quand `prix.js` contient un relevé comparatif du produit |

## Types de données
- **Réelle** : ville citée dans `origine` (catalogue), coordonnées du centre-ville (± 5 km).
- **Approximation** : import d'un pays (Niger, Burkina Faso). Repère placé hors frontière dans la direction du pays, libellé « · import ».
- **Aucun point** : origine vide ou « Import » sans pays. Le produit n'a que son marché ; la phrase le dit.
- **Repli technique** : cadrage large du pays quand un produit est introuvable. Il ne montre aucune ville.

## Tableau de contrôle
Produit | Région (district) | Ville(s) | Coordonnées | Marché(s) | Source | Repli
---|---|---|---|---|---|---
Tomate | Gbêkê (Vallée du Bandama) ; Poro (Savanes) | Bouaké · Korhogo | 7.69N 5.03W ; 9.46N 5.63W | Adjamé · Yamoussoukro | catalogue « Bouaké · Korhogo » + relevé Yamoussoukro | aucun
Gombo | Yamoussoukro ; Bélier (Lacs) | Yamoussoukro · Toumodi | 6.83N 5.29W ; 6.56N 5.02W | Adjamé | catalogue | aucun
Oignon blanc | Tchologo (Savanes) ; Import | Ferkessédougou · Niger | 9.59N 5.20W ; repère 11.25N 2.55W | Adjamé | catalogue « Ferké · Import Niger » | Niger : repère directionnel
Oignon violet | Import ; Import | Niger · Burkina Faso | repères 11.25N 2.55W ; 10.95N 4.40W | Adjamé | catalogue « Import Niger · Burkina » | repères directionnels
Poivron vert | Gbêkê ; Grands-Ponts (Lagunes) | Bouaké · Dabou | 7.69N 5.03W ; 5.33N 4.38W | Adjamé · Yamoussoukro | catalogue + relevé Yamoussoukro | aucun
Aubergine blanche | Agnéby-Tiassa (Lagunes) | Agboville · Tiassalé | 5.93N 4.21W ; 5.90N 4.82W | Adjamé | catalogue | aucun
Aubergine violette | Agnéby-Tiassa ; Grands-Ponts | Tiassalé · Dabou | 5.90N 4.82W ; 5.33N 4.38W | Adjamé | catalogue | aucun
Concombre | Grands-Ponts | Dabou · Grand-Lahou | 5.33N 4.38W ; 5.14N 5.02W | Adjamé | catalogue | aucun
Ail | — | — | — | Adjamé · Yamoussoukro | catalogue « Import » + relevé Yamoussoukro | pas de point de production
Haricot vert local | Gbêkê ; Hambol (Vallée du Bandama) | Bouaké · Katiola | 7.69N 5.03W ; 8.14N 5.10W | Adjamé · Yamoussoukro | catalogue + relevé Yamoussoukro | aucun
Haricot vert Burkina | Import | Burkina Faso | repère 10.95N 4.40W | Adjamé | catalogue « Import Burkina Faso » | repère directionnel
Piment vert | Lôh-Djiboua ; Gôh (Gôh-Djiboua) | Divo · Gagnoa | 5.84N 5.36W ; 6.13N 5.95W | Adjamé | catalogue | aucun
Piment garba | Gontougo (Zanzan) ; Indénié-Djuablin (Comoé) | Bondoukou · Abengourou | 8.04N 2.80W ; 6.73N 3.50W | Adjamé | catalogue | aucun
Piment big sun | Gôh ; Haut-Sassandra | Gagnoa · Issia | 6.13N 5.95W ; 6.49N 6.59W | Adjamé | catalogue | aucun
Piment big sun (sent bon) | — | — | — | Adjamé | catalogue (origine vide) | pas de point de production
Courgette verte | — | — | — | Adjamé | catalogue (origine vide) | pas de point de production
Courgette obra | — | — | — | Adjamé | catalogue (origine vide) | pas de point de production
Choux | Poro ; Tonkpi (Montagnes) | Korhogo · Man | 9.46N 5.63W ; 7.41N 7.55W | Adjamé · Yamoussoukro | catalogue + relevé Yamoussoukro | aucun
Papaye ronde | Agnéby-Tiassa | Azaguié · Tiassalé | 5.63N 4.08W ; 5.90N 4.82W | Adjamé | catalogue | aucun
Papaye solo | Agnéby-Tiassa | Azaguié · Tiassalé | 5.63N 4.08W ; 5.90N 4.82W | Adjamé | catalogue | aucun
Orange locale | Indénié-Djuablin | Agnibilékrou · Abengourou | 7.13N 3.20W ; 6.73N 3.50W | Adjamé | catalogue | aucun
Ananas | Sud-Comoé | Bonoua · Adiaké | 5.27N 3.60W ; 5.29N 3.30W | Adjamé | catalogue | aucun
Banane douce | Agnéby-Tiassa ; Grands-Ponts | Azaguié · Dabou | 5.63N 4.08W ; 5.33N 4.38W | Adjamé | catalogue | aucun
Avocat | Tonkpi (Montagnes) | Man · Danané | 7.41N 7.55W ; 7.26N 8.15W | Adjamé | catalogue | aucun
Citron | Indénié-Djuablin ; La Mé | Abengourou · Adzopé | 6.73N 3.50W ; 6.11N 3.86W | Adjamé | catalogue | aucun
Pastèque | Poro ; Tchologo | Korhogo · Ferkessédougou | 9.46N 5.63W ; 9.59N 5.20W | Adjamé | catalogue | aucun
Pomme de terre | — | — | — | Adjamé | catalogue « Import » | pas de point de production
Banane plantain | Agnéby-Tiassa ; La Mé | Agboville · Adzopé | 5.93N 4.21W ; 6.11N 3.86W | Adjamé | catalogue | aucun
Patate douce | Poro ; Bagoué (Savanes) | Korhogo · Boundiali | 9.46N 5.63W ; 9.52N 6.49W | Adjamé | catalogue | aucun
Patate douce jaune | Poro ; Tchologo | Korhogo · Ferkessédougou | 9.46N 5.63W ; 9.59N 5.20W | Adjamé | catalogue | aucun
Patate douce blanche | — | — | — | Adjamé | catalogue (origine vide) | pas de point de production
Feuille d'oignon | Grands-Ponts ; Abidjan (autonome) | Dabou · Bingerville | 5.33N 4.38W ; 5.36N 3.88W | Adjamé | catalogue | aucun
Persil | Abidjan (autonome) | Bingerville · Anyama | 5.36N 3.88W ; 5.50N 4.05W | Adjamé | catalogue | aucun

## Contrôles
- 27 lieux uniques, 0 coordonnée dupliquée. Villes partagées par plusieurs produits (normal, ce sont des bassins) : Korhogo 5, Dabou 5, Tiassalé 4, Bouaké 3, Ferkessédougou 3, Abengourou 3, Azaguié 3.
- Papaye ronde / solo et Pastèque / Patate douce jaune ont exactement les mêmes zones : cela vient du catalogue, pas d'un repli.
- 6 produits sans point de production : 4 à origine vide, 2 « Import » sans pays.
- Relevés de Yamoussoukro sans lien à une série d'Adjamé : « Aubergine djamba », « Piment sent bon ». Ils ne créent pas de flux tant que le lien `adj` n'est pas renseigné dans `prix.js`.
- Positions relatives vérifiées : Savanes au nord (Korhogo, Ferké, Boundiali), Montagnes à l'ouest (Man, Danané), Zanzan / Comoé à l'est, Lagunes au sud, Abidjan sur la côte.

## À compléter par IVT
Origines de : Courgette verte, Courgette obra, Patate douce blanche, Piment big sun (sent bon), et le pays d'origine de l'ail et de la pomme de terre.
