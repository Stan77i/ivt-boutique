/* ============================================================
   IVT — Moteur du site (panier, rendu, graphique de prix)
   Aucune dépendance externe. Fonctionne en local (file://)
   comme en ligne.
   ============================================================ */

const IVT_APP = (() => {

  const DATA = window.IVT;
  const CLE_PANIER = 'ivt_panier_v1';
  const CHEMIN_IMG = 'assets/img/produits/';

  /* ---------------- Données ---------------- */

  const parSlug = Object.fromEntries(DATA.produits.map(p => [p.slug, p]));
  const nomCategorie = id => (DATA.categories.find(c => c.id === id) || {}).nom || '';

  const prixActuel = p => p.prix[p.prix.length - 1];
  const prixPrecedent = p => p.prix[p.prix.length - 2] ?? prixActuel(p);

  function variation(p) {
    const a = prixActuel(p), b = prixPrecedent(p);
    if (!b) return { pct: 0, sens: 'flat' };
    const pct = ((a - b) / b) * 100;
    return { pct, sens: pct > 0.4 ? 'up' : pct < -0.4 ? 'down' : 'flat' };
  }

  const fmt = n => Math.round(n).toLocaleString('fr-FR').replace(/ | /g, ' ');

  function dateCourte(iso) {
    const mois = ['janv', 'févr', 'mars', 'avr', 'mai', 'juin', 'juil', 'août', 'sept', 'oct', 'nov', 'déc'];
    const d = new Date(iso + 'T00:00:00');
    return `${d.getDate()} ${mois[d.getMonth()]}`;
  }

  const imageDe = p => CHEMIN_IMG + p.slug + '.png';

  /* ---------------- Panier ---------------- */

  function lirePanier() {
    try { return JSON.parse(localStorage.getItem(CLE_PANIER)) || {}; }
    catch { return {}; }
  }

  function ecrirePanier(panier) {
    try { localStorage.setItem(CLE_PANIER, JSON.stringify(panier)); } catch {}
    majCompteur();
    document.dispatchEvent(new CustomEvent('ivt:panier'));
  }

  function ajouterAuPanier(slug, qte = 1) {
    const panier = lirePanier();
    panier[slug] = (panier[slug] || 0) + qte;
    ecrirePanier(panier);
    toast(`${parSlug[slug].nom} · ${qte} ${parSlug[slug].unite} ajouté`);
  }

  function definirQuantite(slug, qte) {
    const panier = lirePanier();
    if (qte <= 0) delete panier[slug]; else panier[slug] = qte;
    ecrirePanier(panier);
  }

  function retirerDuPanier(slug) { definirQuantite(slug, 0); }

  function lignesPanier() {
    const panier = lirePanier();
    return Object.entries(panier)
      .filter(([slug]) => parSlug[slug])
      .map(([slug, qte]) => {
        const p = parSlug[slug];
        return { produit: p, qte, total: prixActuel(p) * qte };
      });
  }

  const totalArticles = () => Object.values(lirePanier()).reduce((s, n) => s + n, 0);
  const totalPanier = () => lignesPanier().reduce((s, l) => s + l.total, 0);

  function majCompteur() {
    const n = totalArticles();
    document.querySelectorAll('[data-cart-count]').forEach(el => {
      el.textContent = n;
      el.style.display = n ? '' : 'none';
    });
  }

  /* ---------------- Rendu ---------------- */

  function mediaProduit(p, classe) {
    return `<div class="packshot" style="aspect-ratio:1">
      <img class="${classe}" src="${imageDe(p)}" alt="${p.nom}" loading="lazy"
           onerror="this.style.display='none';this.nextElementSibling.style.display='grid'">
      <div class="packshot__fallback" style="display:none">${p.nom}</div>
    </div>`;
  }

  function carteProduit(p) {
    const v = variation(p);
    const fleche = v.sens === 'up' ? '▲' : v.sens === 'down' ? '▼' : '—';
    const badge = v.sens === 'flat'
      ? `<span class="delta delta--flat">stable</span>`
      : `<span class="delta delta--${v.sens}">${fleche} ${Math.abs(v.pct).toFixed(1)} %</span>`;

    return `<a class="card reveal" href="produit.html?p=${p.slug}">
      <div class="card__media">${mediaProduit(p, 'card__img')}</div>
      <div class="card__cat">${nomCategorie(p.categorie)}</div>
      <h3 class="card__name">${p.nom}</h3>
      <div class="card__foot">
        <span class="card__price">${fmt(prixActuel(p))}<small>F / ${p.unite}</small></span>
        ${badge}
      </div>
    </a>`;
  }

  /* ---------------- Graphique de prix (SVG) ---------------- */

  function dessinerGraphique(svg, produit) {
    const serie = produit.prix;
    const semaines = DATA.semaines;
    const W = 680, H = 200, padY = 26, padX = 6;

    const min = Math.min(...serie), max = Math.max(...serie);
    const amplitude = (max - min) || 1;

    const x = i => padX + (i * (W - padX * 2)) / (serie.length - 1);
    const y = v => padY + (1 - (v - min) / amplitude) * (H - padY * 2);

    const points = serie.map((v, i) => [x(i), y(v)]);

    // Courbe lissée (Catmull-Rom → Bézier)
    let d = `M ${points[0][0]} ${points[0][1]}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i - 1] || points[i];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2] || p2;
      const c1x = p1[0] + (p2[0] - p0[0]) / 6;
      const c1y = p1[1] + (p2[1] - p0[1]) / 6;
      const c2x = p2[0] - (p3[0] - p1[0]) / 6;
      const c2y = p2[1] - (p3[1] - p1[1]) / 6;
      d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2[0]} ${p2[1]}`;
    }
    const aire = `${d} L ${points[points.length - 1][0]} ${H} L ${points[0][0]} ${H} Z`;

    const hausse = serie[serie.length - 1] >= serie[0];
    const couleur = hausse ? '#E63946' : '#8CC63F';

    const pastilles = points.map(([px, py], i) => `
      <g class="pt" data-i="${i}">
        <circle cx="${px}" cy="${py}" r="14" fill="transparent"/>
        <circle cx="${px}" cy="${py}" r="${i === points.length - 1 ? 5 : 3}"
                fill="${i === points.length - 1 ? couleur : '#062A1C'}"
                stroke="${couleur}" stroke-width="1.6"/>
      </g>`).join('');

    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.innerHTML = `
      <defs>
        <linearGradient id="grad-${produit.slug}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stop-color="${couleur}" stop-opacity="0.28"/>
          <stop offset="100%" stop-color="${couleur}" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <line x1="0" y1="${y(min)}" x2="${W}" y2="${y(min)}" stroke="rgba(255,255,255,.07)" stroke-width="1"/>
      <line x1="0" y1="${y(max)}" x2="${W}" y2="${y(max)}" stroke="rgba(255,255,255,.07)" stroke-width="1"/>
      <path d="${aire}" fill="url(#grad-${produit.slug})"/>
      <path d="${d}" fill="none" stroke="${couleur}" stroke-width="2"
            stroke-linecap="round" vector-effect="non-scaling-stroke"/>
      ${pastilles}
    `;

    // Info-bulle au survol
    const bulle = svg.parentElement.querySelector('[data-tooltip]');
    if (bulle) {
      svg.querySelectorAll('.pt').forEach(g => {
        g.style.cursor = 'pointer';
        g.addEventListener('mouseenter', () => {
          const i = +g.dataset.i;
          bulle.textContent = `${dateCourte(semaines[i])} — ${fmt(serie[i])} F/${produit.unite}`;
          bulle.style.opacity = '1';
        });
        g.addEventListener('mouseleave', () => { bulle.style.opacity = '0'; });
      });
    }
  }

  /* ---------------- Interface ---------------- */

  function toast(message) {
    let el = document.querySelector('.toast');
    if (!el) {
      el = document.createElement('div');
      el.className = 'toast';
      document.body.appendChild(el);
    }
    el.textContent = message;
    requestAnimationFrame(() => el.classList.add('is-visible'));
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove('is-visible'), 2600);
  }

  function observerReveal() {
    const cibles = document.querySelectorAll('.reveal:not(.is-in)');
    if (!('IntersectionObserver' in window)) {
      cibles.forEach(el => el.classList.add('is-in'));
      return;
    }
    const io = new IntersectionObserver((entrees) => {
      entrees.forEach((e, i) => {
        if (e.isIntersecting) {
          setTimeout(() => e.target.classList.add('is-in'), i * 55);
          io.unobserve(e.target);
        }
      });
    }, { rootMargin: '0px 0px -60px 0px' });
    cibles.forEach(el => io.observe(el));
  }

  function initHeader() {
    const burger = document.querySelector('.burger');
    const nav = document.querySelector('.nav');
    if (burger && nav) burger.addEventListener('click', () => nav.classList.toggle('is-open'));
    majCompteur();
  }

  document.addEventListener('DOMContentLoaded', () => {
    initHeader();
    observerReveal();
  });

  return {
    DATA, parSlug, nomCategorie, prixActuel, variation, fmt, dateCourte, imageDe,
    carteProduit, mediaProduit, dessinerGraphique,
    ajouterAuPanier, definirQuantite, retirerDuPanier, lignesPanier,
    totalPanier, totalArticles, observerReveal, toast
  };

})();
