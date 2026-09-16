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

  function dateLongue(iso) {
    const mois = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin',
                  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
    const d = new Date(iso + 'T00:00:00');
    return `${d.getDate()} ${mois[d.getMonth()]} ${d.getFullYear()}`;
  }

  /* Compteur animé (prix qui "roule" comme un cours de bourse) */
  function animerNombre(el, de, vers, suffixe = '') {
    const duree = 620;
    const debut = performance.now();
    cancelAnimationFrame(el._raf || 0);
    const pas = (t) => {
      const k = Math.min((t - debut) / duree, 1);
      const e = 1 - Math.pow(1 - k, 3);
      el.textContent = fmt(de + (vers - de) * e) + suffixe;
      if (k < 1) el._raf = requestAnimationFrame(pas);
    };
    el._raf = requestAnimationFrame(pas);
  }

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

  function badgeVariation(v) {
    if (v.sens === 'flat') return `<span class="delta delta--flat">stable</span>`;
    const fleche = v.sens === 'up' ? '▲' : '▼';
    return `<span class="delta delta--${v.sens}"><i class="delta__arrow">${fleche}</i> ${Math.abs(v.pct).toFixed(1)} %</span>`;
  }

  function carteProduit(p) {
    const v = variation(p);
    const badge = badgeVariation(v);

    return `<div class="card reveal">
      <a class="card__link" href="produit.html?p=${p.slug}" aria-label="${p.nom}">
        <div class="card__media">${mediaProduit(p, 'card__img')}</div>
        <div class="card__cat">${nomCategorie(p.categorie)}</div>
        <h3 class="card__name">${p.nom}</h3>
      </a>
      <div class="card__foot">
        <span class="card__price">${fmt(prixActuel(p))}<small>F / ${p.unite}</small></span>
        ${badge}
      </div>
      <button type="button" class="card__add" onclick="event.stopPropagation();IVT_APP.ajouterAuPanier('${p.slug}')">
        <svg viewBox="0 0 24 24" width="14" height="14"><path d="M4 4h2l2.4 12.2a2 2 0 0 0 2 1.6h7.4a2 2 0 0 0 2-1.6L21 8H7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><circle cx="9" cy="20" r="1.4" fill="currentColor"/><circle cx="17" cy="20" r="1.4" fill="currentColor"/></svg>
        Ajouter au panier
      </button>
    </div>`;
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
    const couleur = hausse ? '#8CC63F' : '#E63946';

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

  /* ---------------- Vitrine produit (zoom + sélection) ---------------- */

  function creerVitrine(container, produits, opts = {}) {
    if (!container || !produits.length) return;
    container.innerHTML = `
      <div class="vitrine__stage">
        <div class="vitrine__ring" aria-hidden="true"></div>
        <div class="vitrine__media"></div>
        <div class="vitrine__info">
          <p class="vitrine__cat"></p>
          <h3 class="vitrine__nom"></h3>
          <div class="vitrine__price"><span class="amount"></span><span class="unit"></span></div>
          <div class="vitrine__badge"></div>
          <a class="btn btn--ghost vitrine__cta">Voir la fiche →</a>
        </div>
      </div>
      <div class="vitrine__rail" role="tablist"></div>`;

    const media  = container.querySelector('.vitrine__media');
    const cat    = container.querySelector('.vitrine__cat');
    const nom    = container.querySelector('.vitrine__nom');
    const amount = container.querySelector('.amount');
    const unit   = container.querySelector('.unit');
    const badge  = container.querySelector('.vitrine__badge');
    const cta    = container.querySelector('.vitrine__cta');
    const rail   = container.querySelector('.vitrine__rail');
    const stage  = container.querySelector('.vitrine__stage');

    let prixAff = null;

    function montrer(p) {
      media.classList.remove('is-in');
      media.innerHTML = mediaProduit(p, 'vitrine__img');
      requestAnimationFrame(() => media.classList.add('is-in'));

      cat.textContent = nomCategorie(p.categorie);
      nom.textContent  = p.nom;
      const cible = prixActuel(p);
      animerNombre(amount, prixAff === null ? cible : prixAff, cible, ' F');
      prixAff = cible;
      unit.textContent = 'CFA / ' + p.unite + ' · ' + p.colis;

      const v = variation(p);
      badge.innerHTML = badgeVariation(v);

      cta.href = 'produit.html?p=' + p.slug;
      rail.querySelectorAll('.chip').forEach(c =>
        c.setAttribute('aria-selected', String(c.dataset.slug === p.slug)));
    }

    produits.forEach((p, i) => {
      const b = document.createElement('button');
      b.className = 'chip';
      b.type = 'button';
      b.dataset.slug = p.slug;
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-selected', String(i === 0));
      const img = document.createElement('img');
      img.className = 'chip__thumb';
      img.src = imageDe(p);
      img.alt = '';
      img.onerror = () => { img.style.visibility = 'hidden'; };
      const lab = document.createElement('span');
      lab.className = 'chip__label';
      lab.textContent = p.nom;
      b.append(img, lab);
      if (opts.delta) {
        const v = variation(p);
        if (v.sens !== 'flat') {
          const d = document.createElement('span');
          d.className = 'chip__delta delta delta--' + v.sens;
          d.textContent = (v.sens === 'up' ? '▲' : '▼') + ' ' + Math.abs(v.pct).toFixed(1) + '%';
          b.appendChild(d);
        }
      }
      b.addEventListener('click', () => montrer(p));
      rail.appendChild(b);
    });

    stage.addEventListener('mousemove', (e) => {
      const r = stage.getBoundingClientRect();
      stage.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100).toFixed(1) + '%');
      stage.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100).toFixed(1) + '%');
    });

    montrer(produits[0]);
  }

  /* ---------------- Vitrine produit (zoom + sélection) ---------------- */

  const COULEURS_PRODUIT = {
    'tomate':'#E4402F','piment-vert':'#4E9A3F','piment-garba':'#C22A2A','piment-big-sun':'#D9482A',
    'oignon-blanc':'#DCD6BF','oignon-violet':'#8B5FA6','poivron-vert':'#4F9A44','aubergine-blanche':'#E7E2CE',
    'aubergine-violette':'#5B3A6E','concombre':'#4E8B3C','ail':'#DCD6BF','gombo':'#4C7A3D','choux':'#5F9950',
    'haricot-vert-local':'#4B7B36','haricot-vert-burkina':'#4B7B36',
    'papaye':'#E8862C','orange-locale':'#E8862C','orange-ghana':'#E8862C','ananas':'#E7B92E',
    'banane-douce':'#E8C632','avocat':'#4B6B3B','citron':'#D9CB2E','pasteque':'#3E9B4F',
    'pomme-de-terre':'#B9895A','banane-plantain':'#DDB23A','patate-douce':'#C77B3E','patate-douce-jaune':'#E0A63A',
    'feuille-oignon':'#4C8C3F','persil':'#3F7A38'
  };
  const COULEURS_CATEGORIE = { legumes:'#4C8C3F', fruits:'#E0862C', feculents:'#C77B3E', herbes:'#3F7A38' };
  const couleurProduit = p => COULEURS_PRODUIT[p.slug] || COULEURS_CATEGORIE[p.categorie] || '#8CC63F';

  function creerOrbit(container, produits) {
    if (!container || !produits.length) return;
    container.innerHTML = `
      <div class="orbit__stage">
        <div class="orbit__ring" aria-hidden="true"></div>
        <div class="orbit__sats"></div>
        <div class="orbit__center"><div class="orbit__center-media"></div></div>
      </div>
      <div class="orbit__info">
        <p class="orbit__cat"></p>
        <h3 class="orbit__nom"></h3>
        <div class="orbit__price"><span class="amount"></span><span class="unit"></span></div>
        <div class="orbit__badge"></div>
      </div>`;

    const stage  = container.querySelector('.orbit__stage');
    const media  = container.querySelector('.orbit__center-media');
    const sats   = container.querySelector('.orbit__sats');
    const cat    = container.querySelector('.orbit__cat');
    const nom    = container.querySelector('.orbit__nom');
    const amount = container.querySelector('.amount');
    const unit   = container.querySelector('.unit');
    const badge  = container.querySelector('.orbit__badge');

    let prixAff = null;

    function disposer(liste, actif) {
      sats.innerHTML = '';
      const n = liste.length;
      liste.forEach((p, i) => {
        const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
        const r = 41;
        const left = 50 + Math.cos(angle) * r;
        const top  = 50 + Math.sin(angle) * r;
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'orbit__sat';
        b.style.left = left + '%';
        b.style.top = top + '%';
        b.innerHTML = `<span class="orbit__sat-thumb"><img src="${imageDe(p)}" alt="" loading="lazy" onerror="this.style.visibility='hidden'"></span>
          <span class="orbit__sat-name">${p.nom}</span>
          <span class="orbit__sat-price">${fmt(prixActuel(p))} F</span>`;
        b.addEventListener('click', () => centrer(p, [actif, ...liste.filter(x => x !== p)]));
        sats.appendChild(b);
      });
    }

    function centrer(p, reste) {
      media.classList.remove('is-in');
      media.innerHTML = mediaProduit(p, 'orbit__img');
      requestAnimationFrame(() => media.classList.add('is-in'));
      stage.style.setProperty('--accent-orbit', couleurProduit(p));
      container.style.setProperty('--accent-orbit', couleurProduit(p));

      cat.textContent = nomCategorie(p.categorie);
      nom.textContent = p.nom;
      const cible = prixActuel(p);
      animerNombre(amount, prixAff === null ? cible : prixAff, cible, ' F');
      prixAff = cible;
      unit.textContent = 'CFA / ' + p.unite + ' · ' + p.colis;

      const v = variation(p);
      badge.innerHTML = badgeVariation(v);

      disposer(reste, p);
    }

    centrer(produits[0], produits.slice(1));
  }

  /* ---------------- Bandeau de marché (bas d'écran) ---------------- */

  const CLE_BANDEAU = 'ivt_bandeau_v1';

  function monterBandeau() {
    if (!DATA || !DATA.produits || document.querySelector('.marketbar')) return;

    const bar = document.createElement('div');
    bar.className = 'marketbar';
    bar.setAttribute('aria-label', 'Cours du marché de gros');
    const svgClose= '<svg viewBox="0 0 24 24" width="13" height="13"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>';

    bar.innerHTML = `
      <div class="marketbar__tag"><span class="live-dot"></span>Marché de gros</div>
      <div class="marketbar__viewport"><div class="marketbar__track"></div></div>
      <div class="marketbar__ctrls">
        <button class="mb-btn mb-btn--close" type="button" data-act="hide" title="Masquer le bandeau">${svgClose}</button>
      </div>`;
    document.body.appendChild(bar);

    const poignee = document.createElement('button');
    poignee.className = 'mb-handle';
    poignee.type = 'button';
    poignee.textContent = 'Cours du marché';
    document.body.appendChild(poignee);

    const piste = bar.querySelector('.marketbar__track');
    const fabriquer = p => {
      const v = variation(p);
      const f = v.sens === 'up' ? '▲' : v.sens === 'down' ? '▼' : '—';
      const a = document.createElement('a');
      a.className = 'tick';
      a.href = 'produit.html?p=' + encodeURIComponent(p.slug);
      a.innerHTML = `<span class="tick__nom">${p.nom}</span><b>${fmt(prixActuel(p))} F</b>` +
        `<span class="delta delta--${v.sens}">${v.sens === 'flat' ? '—' : f + ' ' + Math.abs(v.pct).toFixed(1) + ' %'}</span>`;
      return a;
    };
    [...DATA.produits, ...DATA.produits].forEach(p => piste.appendChild(fabriquer(p)));

    const btns = {};
    bar.querySelectorAll('.mb-btn').forEach(b => { btns[b.dataset.act] = b; });

    const afficher = (oui) => {
      bar.classList.toggle('is-hidden', !oui);
      poignee.classList.toggle('is-visible', !oui);
      document.body.style.paddingBottom = oui ? '' : '0px';
      try { localStorage.setItem(CLE_BANDEAU, oui ? 'on' : 'off'); } catch {}
    };
    btns.hide.addEventListener('click', () => afficher(false));
    poignee.addEventListener('click', () => afficher(true));

    let etat = null;
    try { etat = localStorage.getItem(CLE_BANDEAU); } catch {}
    if (etat === 'off') afficher(false);
  }

  document.addEventListener('DOMContentLoaded', () => {
    initHeader();
    observerReveal();
    monterBandeau();
  });

  return {
    DATA, parSlug, nomCategorie, prixActuel, variation, fmt, dateCourte, dateLongue,
    imageDe, animerNombre, creerVitrine, creerOrbit, couleurProduit, badgeVariation, monterBandeau,
    carteProduit, mediaProduit, dessinerGraphique,
    ajouterAuPanier, definirQuantite, retirerDuPanier, lignesPanier,
    totalPanier, totalArticles, observerReveal, toast
  };

})();
