#!/usr/bin/env python3
"""
IVT — Détourage des packshots produits
--------------------------------------
Rend transparent le fond blanc des photos produits, pour qu'elles se posent
directement sur le vert foncé du site (comme sur la référence Piemaker).

Le fond est détecté par propagation depuis les bords de l'image : les zones
blanches situées À L'INTÉRIEUR du produit (ail, oignon blanc, aubergine
blanche, reflets) sont donc préservées.

Installation :
    pip3 install --user Pillow

Usage :
    python3 scripts/detourer.py <dossier-source> [dossier-sortie]

Exemple :
    python3 scripts/detourer.py ~/Desktop/photos-ivt assets/img/produits
"""

import sys
import os
from collections import deque

try:
    from PIL import Image
except ImportError:
    sys.exit("Pillow n'est pas installé.  →  pip3 install --user Pillow")

# Écart de couleur toléré par rapport au fond de référence (0-255).
# Les fonds de studio ne sont jamais d'un blanc parfaitement uniforme :
# ils présentent un léger dégradé qu'il faut absorber.
TOLERANCE = 42
# Un pixel ne peut être du fond que s'il est au moins aussi clair que ceci
LUMINOSITE_MIN = 200
# Largeur de la transition (en niveaux) pour adoucir le bord
ADOUCISSEMENT = 26
# Ombre portée : gris neutre (écart max entre canaux) et clarté minimale
SATURATION_OMBRE = 16
LUMINOSITE_OMBRE = 158


# Résolution de travail : au-delà, l'image est réduite avant analyse
TAILLE_MAX = 1100


def detourer(chemin_entree, chemin_sortie):
    img = Image.open(chemin_entree).convert("RGBA")

    # Réduire d'abord : l'analyse est faite pixel par pixel, une image
    # 2048² serait une quinzaine de fois plus lente pour aucun gain visible.
    if max(img.size) > TAILLE_MAX:
        ratio = TAILLE_MAX / max(img.size)
        img = img.resize(
            (round(img.size[0] * ratio), round(img.size[1] * ratio)),
            Image.LANCZOS,
        )

    l, h = img.size
    px = img.load()

    # --- 1. Couleur de référence du fond, prise aux quatre coins ---
    coins = [px[0, 0], px[l - 1, 0], px[0, h - 1], px[l - 1, h - 1]]
    ref = tuple(sorted(c[i] for c in coins)[1] for i in range(3))

    # --- 2. Propagation depuis les bords ---
    fond = bytearray(l * h)
    file = deque()

    def clair(x, y):
        r, v, b, _ = px[x, y]
        if (r + v + b) / 3 < LUMINOSITE_MIN:
            return False
        return (abs(r - ref[0]) <= TOLERANCE
                and abs(v - ref[1]) <= TOLERANCE
                and abs(b - ref[2]) <= TOLERANCE)

    for x in range(l):
        for y in (0, h - 1):
            if clair(x, y) and not fond[y * l + x]:
                fond[y * l + x] = 1
                file.append((x, y))
    for y in range(h):
        for x in (0, l - 1):
            if clair(x, y) and not fond[y * l + x]:
                fond[y * l + x] = 1
                file.append((x, y))

    while file:
        x, y = file.popleft()
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < l and 0 <= ny < h and not fond[ny * l + nx] and clair(nx, ny):
                fond[ny * l + nx] = 1
                file.append((nx, ny))

    # --- 2 bis. Ombre portée ---
    # L'ombre du produit sur le fond est un gris neutre, plus sombre que le
    # fond mais très peu saturé — les légumes et les paniers, eux, sont
    # colorés. On propage donc le fond dans ces gris, en partant du fond déjà
    # trouvé, sans risque de mordre sur le produit.
    def ombre(x, y):
        r, v, b, _ = px[x, y]
        return (max(r, v, b) - min(r, v, b)) <= SATURATION_OMBRE \
            and (r + v + b) / 3 >= LUMINOSITE_OMBRE

    file = deque(
        (x, y) for y in range(h) for x in range(l) if fond[y * l + x]
    )
    while file:
        x, y = file.popleft()
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < l and 0 <= ny < h and not fond[ny * l + nx] and ombre(nx, ny):
                fond[ny * l + nx] = 1
                file.append((nx, ny))

    # --- 2 ter. Îlots de fond isolés par l'ombre portée ---
    # L'ombre du produit coupe parfois une zone de fond du reste de l'image :
    # la propagation ne l'atteint pas et il reste une plaque blanche. On
    # récupère ces petits îlots clairs non encore marqués.
    seuil_ilot = l * h * 0.04
    vu = bytearray(l * h)
    for y0 in range(h):
        for x0 in range(l):
            i0 = y0 * l + x0
            if fond[i0] or vu[i0] or not clair(x0, y0):
                continue
            paquet = [(x0, y0)]
            vu[i0] = 1
            tete = 0
            while tete < len(paquet):
                x, y = paquet[tete]
                tete += 1
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < l and 0 <= ny < h:
                        i = ny * l + nx
                        if not vu[i] and not fond[i] and clair(nx, ny):
                            vu[i] = 1
                            paquet.append((nx, ny))
            if len(paquet) <= seuil_ilot:
                for x, y in paquet:
                    fond[y * l + x] = 1

    # --- 3. Application de la transparence, avec bord adouci ---
    lum_ref = sum(ref) / 3
    for y in range(h):
        base = y * l
        for x in range(l):
            if fond[base + x]:
                px[x, y] = (255, 255, 255, 0)
            else:
                r, v, b, a = px[x, y]
                luminosite = (r + v + b) / 3
                if luminosite > lum_ref - ADOUCISSEMENT:
                    # pixel presque blanc touchant le fond : semi-transparent
                    voisin_fond = any(
                        0 <= x + dx < l and 0 <= y + dy < h and fond[(y + dy) * l + x + dx]
                        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))
                    )
                    if voisin_fond:
                        reste = max(0.0, (lum_ref - luminosite) / ADOUCISSEMENT)
                        px[x, y] = (r, v, b, int(255 * min(1.0, reste)))

    # --- 4. Recadrage sur le produit + marge ---
    boite = img.getbbox()
    if boite:
        img = img.crop(boite)
        marge = int(max(img.size) * 0.06)
        carre = max(img.size) + marge * 2
        fond_transparent = Image.new("RGBA", (carre, carre), (255, 255, 255, 0))
        fond_transparent.paste(
            img,
            ((carre - img.size[0]) // 2, (carre - img.size[1]) // 2),
            img,
        )
        img = fond_transparent

    # --- 5. Redimensionnement web ---
    if img.size[0] > 1000:
        img = img.resize((1000, 1000), Image.LANCZOS)

    img.save(chemin_sortie, "PNG", optimize=True)
    return img.size


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)

    source = sys.argv[1]
    sortie = sys.argv[2] if len(sys.argv) > 2 else "assets/img/produits"
    os.makedirs(sortie, exist_ok=True)

    fichiers = sorted(
        f for f in os.listdir(source)
        if f.lower().endswith((".png", ".jpg", ".jpeg", ".webp"))
    )
    if not fichiers:
        sys.exit(f"Aucune image trouvée dans {source}")

    for i, nom in enumerate(fichiers, 1):
        base = os.path.splitext(nom)[0]
        dest = os.path.join(sortie, base + ".png")
        print(f"  [{i}/{len(fichiers)}] {nom} … ", end="", flush=True)
        try:
            taille = detourer(os.path.join(source, nom), dest)
            print(f"→ {base}.png ({taille[0]}×{taille[1]})")
        except Exception as erreur:
            print(f"échec : {erreur}")

    print(f"\n  Terminé. {len(fichiers)} images dans {sortie}/\n")


if __name__ == "__main__":
    main()
