repo: Stan77i/ivt-boutique
branch: main

## Last sync
date: 2026-09-16T02:12:01Z

### Updated in this project
- Refonte mobile-first complète : nav en overlay plein écran, cibles tactiles ≥44px, aucune grille cassée à 320-414px.
- CSS consolidée en une seule couche (suppression des deux couches redondantes qui se surchargeaient) : Cormorant + Jost uniquement.
- Bandeau de marché fixe (bas d'écran) et composant "orbit" (code mort, jamais utilisé) supprimés — bruit visuel et redondance avec la mercuriale.
- Hero simplifié : le sélecteur interactif dupliqué a été remplacé par une seule vitrine réutilisable ; page d'accueil dotée d'un vrai pied de page (absent auparavant).
- Tableaux (mercuriale, panier) passent en cartes lisibles sur mobile via data-label, au lieu de blocs sans étiquette.
- Ajout d'un canal WhatsApp (mailto conservé) sur la fiche panier et le pied de page, avec le numéro réel +225 05 85 02 49 49.

## Screen map
| Écran | Fichiers |
|---|---|
| Accueil | index.html, assets/css/ivt.css, assets/js/app.js |
| Boutique + mercuriale | boutique.html, assets/js/app.js |
| Fiche produit | produit.html, assets/js/app.js |
| Panier | panier.html, assets/js/app.js |
