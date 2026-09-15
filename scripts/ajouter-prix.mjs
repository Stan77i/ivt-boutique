#!/usr/bin/env node
/* ============================================================
   IVT — Intégration du bulletin de prix hebdomadaire
   ------------------------------------------------------------
   Usage :  node scripts/ajouter-prix.mjs bulletins/2026-09-21.txt

   Format du bulletin (une date, puis une ligne par produit) :

       2026-09-21
       Tomate ; 615
       Gombo ; 800
       Piment garba ; 1820

   - Le nom peut être écrit sans accent et sans respecter la casse.
   - Un produit absent du bulletin conserve son prix de la semaine
     précédente (report automatique).
   - Relancer le script avec la même date écrase ce relevé au lieu
     d'en créer un doublon.
   ============================================================ */

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';

const ICI = dirname(fileURLToPath(import.meta.url));
const FICHIER_CATALOGUE = resolve(ICI, '../data/catalogue.js');

const cheminBulletin = process.argv[2];
if (!cheminBulletin) {
  console.error('Usage : node scripts/ajouter-prix.mjs <fichier-bulletin>');
  process.exit(1);
}

/* ---- Lecture du catalogue actuel ----
   Le fichier est écrit pour le navigateur (window.IVT = {...}).
   On fournit un `window` factice puis on l'importe tel quel. */
const source = readFileSync(FICHIER_CATALOGUE, 'utf8');
const debut = source.indexOf('window.IVT =');
if (debut === -1) {
  console.error('Fichier catalogue illisible : "window.IVT =" introuvable.');
  process.exit(1);
}

globalThis.window = globalThis;
await import(pathToFileURL(FICHIER_CATALOGUE).href);
const data = globalThis.IVT;

/* ---- Lecture du bulletin ---- */
const lignes = readFileSync(resolve(process.cwd(), cheminBulletin), 'utf8')
  .split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));

const date = lignes.shift();
if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
  console.error(`Première ligne attendue : une date au format AAAA-MM-JJ (reçu : "${date}")`);
  process.exit(1);
}

const normaliser = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/[^a-z0-9]/g, '');

const index = new Map(data.produits.map(p => [normaliser(p.nom), p]));
const nouveaux = new Map();
const inconnus = [];

for (const ligne of lignes) {
  const [nom, valeur] = ligne.split(/[;,\t]/).map(s => (s || '').trim());
  const produit = index.get(normaliser(nom || ''));
  if (!produit) { inconnus.push(nom); continue; }
  const prix = Number(String(valeur).replace(/[^\d.]/g, ''));
  if (!Number.isFinite(prix) || prix <= 0) { inconnus.push(`${nom} (prix illisible)`); continue; }
  nouveaux.set(produit.slug, Math.round(prix));
}

/* ---- Application ---- */
const existant = data.semaines.indexOf(date);
const remplace = existant !== -1;
const position = remplace ? existant : data.semaines.length;

if (!remplace) data.semaines.push(date);

let reportes = 0;
for (const p of data.produits) {
  const valeur = nouveaux.has(p.slug)
    ? nouveaux.get(p.slug)
    : (p.prix[p.prix.length - 1] ?? 0);
  if (!nouveaux.has(p.slug)) reportes++;
  p.prix[position] = valeur;
  p.prix.length = data.semaines.length;
}

/* ---- Réécriture du fichier ---- */
const entete = source.slice(0, debut);

const produitsTexte = data.produits.map(p => {
  const champs = [
    `      slug: ${JSON.stringify(p.slug)}, nom: ${JSON.stringify(p.nom)}, categorie: ${JSON.stringify(p.categorie)},`,
    `      unite: ${JSON.stringify(p.unite)}, colis: ${JSON.stringify(p.colis)}, origine: ${JSON.stringify(p.origine)},`,
    `      note: ${JSON.stringify(p.note)},`,
    `      prix: [${p.prix.join(', ')}]`
  ];
  return `    {\n${champs.join('\n')}\n    }`;
}).join(',\n');

const sortie = `${entete}window.IVT = {

  semaines: [
${data.semaines.map(s => `    ${JSON.stringify(s)}`).join(',\n')}
  ],

  categories: ${JSON.stringify(data.categories, null, 2).replace(/\n/g, '\n  ')},

  produits: [

${produitsTexte}

  ]
};
`;

writeFileSync(FICHIER_CATALOGUE, sortie, 'utf8');

/* ---- Rapport ---- */
console.log(`\n  Relevé du ${date} ${remplace ? 'mis à jour' : 'ajouté'}.`);
console.log(`  ${nouveaux.size} prix actualisés · ${reportes} reportés de la semaine précédente.`);
console.log(`  ${data.semaines.length} semaines d'historique au total.`);
if (inconnus.length) {
  console.log(`\n  Lignes ignorées (produit introuvable) :`);
  inconnus.forEach(n => console.log(`    · ${n}`));
}
console.log('');
