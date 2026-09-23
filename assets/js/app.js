/* ============================================================
   IVT — Moteur du site (panier, rendu, graphique de prix)
   Aucune dépendance externe. Fonctionne en local (file://)
   comme en ligne.
   ============================================================ */

const IVT_APP = (() => {

  const DATA = window.IVT;
  const CLE_PANIER = 'ivt_panier_v1';
  const CHEMIN_IMG = 'assets/img/produits/';
  const WHATSAPP_NUM = '2250585024949';

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

  const fmt = n => Math.round(n).toLocaleString('fr-FR').replace(/\u202f| /g, ' ');

  function dateCourte(iso) {
    const mois = ['janv', 'févr', 'mars', 'avr', 'mai', 'juin', 'juil', 'août', 'sept', 'oct', 'nov', 'déc'];
    const d = new Date(iso + 'T00:00:00');
    return `${d.getDate()} ${mois[d.getMonth()]}`;
  }

  const imageDe = p => CHEMIN_IMG + p.slug + '.png';
  const imageWebpDe = p => CHEMIN_IMG + p.slug + '.webp';

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

  /* ---------------- Contact WhatsApp ---------------- */

  function lienWhatsApp(message) {
    return `https://wa.me/${WHATSAPP_NUM}?text=${encodeURIComponent(message)}`;
  }

  /* ---------------- Rendu ---------------- */

  function mediaProduit(p, classe) {
    return `<div class="packshot" style="aspect-ratio:1">
      <picture>
        <source srcset="${imageWebpDe(p)}" type="image/webp">
        <img class="${classe}" src="${imageDe(p)}" alt="${p.nom}" loading="lazy"
             onerror="this.parentElement.style.display='none';this.parentElement.nextElementSibling.style.display='grid'">
      </picture>
      <div class="packshot__fallback" style="display:none">${p.nom}</div>
    </div>`;
  }

  function badgeVariation(v) {
    if (v.sens === 'flat') return `<span class="delta delta--flat">stable</span>`;
    const fleche = v.sens === 'up' ? '▲' : '▼';
    return `<span class="delta delta--${v.sens}">${fleche} ${Math.abs(v.pct).toFixed(1)} %</span>`;
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
        Ajouter
      </button>
    </div>`;
  }

  /* ---------------- Graphique de prix (SVG) ---------------- */

  function dessinerGraphique(svg, produit) {
    const serie = produit.prix;
    const semaines = DATA.semaines;
    const W = 680, H = 170, padY = 22, padX = 6;

    const min = Math.min(...serie), max = Math.max(...serie);
    const amplitude = (max - min) || 1;

    const x = i => padX + (i * (W - padX * 2)) / (serie.length - 1);
    const y = v => padY + (1 - (v - min) / amplitude) * (H - padY * 2);

    const points = serie.map((v, i) => [x(i), y(v)]);

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
          setTimeout(() => e.target.classList.add('is-in'), i * 45);
          io.unobserve(e.target);
        }
      });
    }, { rootMargin: '0px 0px -40px 0px' });
    cibles.forEach(el => io.observe(el));
  }

  function initHeader() {
    const burger = document.querySelector('.burger');
    const nav = document.querySelector('.nav');
    if (burger && nav) {
      const fermer = () => {
        nav.classList.remove('is-open');
        burger.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      };
      burger.addEventListener('click', () => {
        const ouvert = nav.classList.toggle('is-open');
        burger.setAttribute('aria-expanded', String(ouvert));
        document.body.style.overflow = ouvert ? 'hidden' : '';
      });
      nav.querySelectorAll('a').forEach(a => a.addEventListener('click', fermer));
      // Ferme le menu si on touche en dehors des liens (fond du panneau ouvert).
      nav.addEventListener('click', (e) => { if (e.target === nav) fermer(); });
    }
    majCompteur();
  }

  /* ---------------- Hero orbital (accueil) ---------------- */

  function creerHero(container, phares, tousProduits) {
    if (!container || !phares.length) return;
    const SVG_NS = 'http://www.w3.org/2000/svg';
    const tous = (tousProduits && tousProduits.length) ? tousProduits : phares;
    container.innerHTML = `
      <div class="hero__sizes" role="group" aria-label="Quantité">
        <span class="hero__sizes-label">Quantité</span>
        <div class="hero__sizes-track"></div>
        <span class="hero__sizes-value"></span>
      </div>
      <div class="hero__orbit">
        <svg class="hero__orbit-svg" viewBox="0 0 500 500" aria-hidden="true">
          <circle class="hero__ring-path" cx="250" cy="260" r="170"></circle>
          <circle class="hero__ring-path hero__ring-path--inner" cx="250" cy="260" r="125"></circle>
          <defs></defs>
          <g class="hero__ticks"></g>
          <g class="hero__arc-labels"></g>
          <circle class="hero__dot" r="4.5"></circle>
        </svg>
        <div class="hero__labels" role="tablist"></div>
        <div class="hero__media"></div>
        <div class="hero__deco hero__deco--a"></div>
        <div class="hero__deco hero__deco--b"></div>
      </div>
      <div class="hero__panel hero__panel--left">
        <h1 class="hero__name"></h1>
        <p class="hero__origin"></p>
        <a class="hero__link">Voir la fiche →</a>
      </div>
      <div class="hero__panel hero__panel--right">
        <div class="hero__price"><span class="amount"></span><span class="unit"></span></div>
        <div class="hero__row">
          <span class="hero__delta"></span>
          <button type="button" class="hero__cart" aria-label="Ajouter au panier">
            <svg viewBox="0 0 24 24" width="20" height="20"><path d="M4 4h2l2.4 12.2a2 2 0 0 0 2 1.6h7.4a2 2 0 0 0 2-1.6L21 8H7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><circle cx="9" cy="20" r="1.4" fill="currentColor"/><circle cx="17" cy="20" r="1.4" fill="currentColor"/></svg>
          </button>
        </div>
      </div>`;

    const labelsEl    = container.querySelector('.hero__labels');
    const svgEl       = container.querySelector('.hero__orbit-svg');
    const defsEl      = svgEl.querySelector('defs');
    const arcGroup    = svgEl.querySelector('.hero__arc-labels');
    const tickGroup   = svgEl.querySelector('.hero__ticks');
    const dotEl       = svgEl.querySelector('.hero__dot');
    const mediaEl     = container.querySelector('.hero__media');
    const nameEl      = container.querySelector('.hero__name');
    const originEl    = container.querySelector('.hero__origin');
    const linkEl      = container.querySelector('.hero__link');
    const amountEl    = container.querySelector('.amount');
    const unitEl      = container.querySelector('.unit');
    const deltaEl     = container.querySelector('.hero__delta');
    const cartBtn     = container.querySelector('.hero__cart');
    const sizesTrack  = container.querySelector('.hero__sizes-track');
    const sizesValue  = container.querySelector('.hero__sizes-value');
    const decoA       = container.querySelector('.hero__deco--a');
    const decoB       = container.querySelector('.hero__deco--b');

    const CX = 250, CY = 260, R = 170, DOT_R = 125;
    const n = phares.length;
    const paresSlugs = new Set(phares.map(p => p.slug));
    const autres = tous.filter(p => !paresSlugs.has(p.slug));

    // Angles non uniformes : chaque libellé reçoit l'arc dont il a besoin
    // selon sa longueur. Arc COMPACT plafonné à 120°, centré en haut :
    // au-delà le texte incurvé approcherait les côtés/le bas de l'anneau
    // et se lirait à l'envers.
    const FONT = 10.5, LETTRE = 0.78; // approx. avance par caractère (em)
    const perCharDeg = (FONT * LETTRE / R) * (180 / Math.PI);
    const PAD = 1.6, GAP = 3;
    const halves = phares.map(p => (p.nom.length * perCharDeg) / 2 + PAD);
    const totalSpan = halves.reduce((s, h) => s + 2 * h, 0) + GAP * (n - 1);
    const maxDiff = totalSpan / 2 || 1;

    let cursor = -totalSpan / 2;
    const angles = phares.map((p, i) => {
      const a = cursor + halves[i];
      cursor += 2 * halves[i] + GAP;
      return a;
    });

    const polar = (angleDeg, r) => {
      const rad = angleDeg * Math.PI / 180;
      return [CX + Math.sin(rad) * r, CY - Math.cos(rad) * r];
    };

    const angleBySlug = {};
    phares.forEach((p, i) => { angleBySlug[p.slug] = angles[i]; });

    // Répartit les autres produits (graduations) dans les intervalles
    // laissés libres après chaque libellé — toujours à l'intérieur de
    // l'arc partiel, jamais sur le reste du cercle.
    const buckets = angles.map(() => []);
    autres.forEach((p, i) => buckets[i % (n - 1 || 1)].push(p));
    buckets.forEach((bucket, i) => {
      if (i >= n - 1) return; // pas de graduation après le dernier libellé (fin de l'arc)
      const windowStart = angles[i] + halves[i];
      const margin = GAP * 0.15;
      const usable = GAP - margin * 2;
      bucket.forEach((p, j) => {
        const a = windowStart + margin + (bucket.length > 1 ? usable * (j + 0.5) / bucket.length : usable / 2);
        angleBySlug[p.slug] = a;
      });
    });

    let qte = 1;

    phares.forEach((p, i) => {
      const angle = angles[i];

      // Cible tactile invisible (zone cliquable généreuse, ≥44px)
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'hero__label'; b.dataset.slug = p.slug;
      b.dataset.angle = angle;
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-selected', String(i === 0));
      b.setAttribute('aria-label', p.nom);
      const [bx, by] = polar(angle, R);
      b.style.left = (bx / 5) + '%';
      b.style.top = (by / 5) + '%';
      b.textContent = p.nom;
      b.addEventListener('click', () => montrer(p));
      labelsEl.appendChild(b);

      // Chemin d'arc pour le texte incurvé (suit la courbe de l'anneau)
      const half = halves[i];
      const [x1, y1] = polar(angle - half, R);
      const [x2, y2] = polar(angle + half, R);
      const pathId = 'heroArc' + i;
      const path = document.createElementNS(SVG_NS, 'path');
      path.setAttribute('id', pathId);
      path.setAttribute('d', `M ${x1},${y1} A ${R},${R} 0 0 1 ${x2},${y2}`);
      path.setAttribute('fill', 'none');
      defsEl.appendChild(path);

      const text = document.createElementNS(SVG_NS, 'text');
      text.setAttribute('class', 'hero__arc-label');
      text.dataset.slug = p.slug;
      text.dataset.angle = angle;
      const textPath = document.createElementNS(SVG_NS, 'textPath');
      textPath.setAttributeNS('http://www.w3.org/1999/xlink', 'href', '#' + pathId);
      textPath.setAttribute('href', '#' + pathId);
      textPath.setAttribute('startOffset', '50%');
      textPath.style.textAnchor = 'middle';
      textPath.textContent = p.nom;
      text.appendChild(textPath);
      arcGroup.appendChild(text);
    });

    // Graduations : accès au reste du catalogue tout autour de l'anneau.
    autres.forEach(p => {
      const angle = angleBySlug[p.slug];
      const [x1, y1] = polar(angle, R - 9);
      const [x2, y2] = polar(angle, R + 9);

      const hit = document.createElementNS(SVG_NS, 'line');
      hit.setAttribute('x1', x1); hit.setAttribute('y1', y1);
      hit.setAttribute('x2', x2); hit.setAttribute('y2', y2);
      hit.setAttribute('class', 'hero__tick-hit');
      hit.dataset.slug = p.slug;
      hit.addEventListener('click', () => montrer(p));
      tickGroup.appendChild(hit);

      const vis = document.createElementNS(SVG_NS, 'line');
      vis.setAttribute('x1', x1); vis.setAttribute('y1', y1);
      vis.setAttribute('x2', x2); vis.setAttribute('y2', y2);
      vis.setAttribute('class', 'hero__tick');
      vis.dataset.slug = p.slug;
      vis.dataset.angle = angle;
      tickGroup.appendChild(vis);

      // Doublon accessible en liste plate au clavier / mobile (hors cercle desktop).
      const flat = document.createElement('button');
      flat.type = 'button'; flat.className = 'hero__label hero__label--flat'; flat.dataset.slug = p.slug;
      flat.setAttribute('aria-selected', 'false');
      flat.textContent = p.nom;
      flat.addEventListener('click', () => montrer(p));
      labelsEl.appendChild(flat);
    });

    function renderSizes(p) {
      sizesTrack.innerHTML = '';
      const kg = parseInt((p.colis.match(/\d+/) || [0])[0], 10) || 10;
      const presets = [
        { label: '1', qte: 1, titre: '1 ' + p.unite },
        { label: '5', qte: 5, titre: '5 ' + p.unite }
      ];
      const boutons = [];

      const majValeur = () => {
        const total = fmt(qte * prixActuel(p));
        sizesValue.textContent = qte + ' ' + p.unite + ' sélectionné' + (qte > 1 ? 's' : '') + ' · total ' + total + ' F';
      };

      presets.forEach(s => {
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'hero__size'; b.textContent = s.label; b.title = s.titre;
        b.setAttribute('aria-selected', 'false');
        b.addEventListener('click', () => {
          inputWrap.classList.remove('is-open');
          boutons.forEach(x => x.setAttribute('aria-selected', String(x === b)));
          qte = s.qte;
          majValeur();
        });
        sizesTrack.appendChild(b);
        boutons.push(b);
      });

      const custom = document.createElement('button');
      custom.type = 'button'; custom.className = 'hero__size'; custom.textContent = 'C';
      custom.title = 'Quantité personnalisée (' + p.colis + ')';
      custom.setAttribute('aria-selected', 'false');
      sizesTrack.appendChild(custom);
      boutons.push(custom);

      const inputWrap = document.createElement('span');
      inputWrap.className = 'hero__size-input';
      inputWrap.innerHTML = `<input type="number" min="1" step="1" aria-label="Quantité personnalisée en ${p.unite}">`;
      sizesTrack.appendChild(inputWrap);
      const input = inputWrap.querySelector('input');
      input.value = kg;

      custom.addEventListener('click', () => {
        boutons.forEach(x => x.setAttribute('aria-selected', String(x === custom)));
        inputWrap.classList.add('is-open');
        input.value = qte || kg;
        input.focus(); input.select();
      });
      const commit = () => { qte = Math.max(1, parseInt(input.value, 10) || 1); majValeur(); };
      input.addEventListener('change', commit);
      input.addEventListener('keydown', e => { if (e.key === 'Enter') { commit(); input.blur(); } });

      boutons[0].setAttribute('aria-selected', 'true');
      qte = presets[0].qte;
      majValeur();
    }

    function montrer(p) {
      mediaEl.classList.remove('is-in');
      mediaEl.innerHTML = mediaProduit(p, 'hero__img');
      requestAnimationFrame(() => mediaEl.classList.add('is-in'));

      nameEl.textContent = p.nom;
      originEl.textContent = p.origine + ' · ' + p.colis;
      linkEl.href = 'produit.html?p=' + p.slug;

      const cible = prixActuel(p);
      const depart = amountEl.dataset.v !== undefined ? +amountEl.dataset.v : cible;
      animerNombre(amountEl, depart, cible, ' F');
      amountEl.dataset.v = cible;
      unitEl.textContent = 'CFA / ' + p.unite;
      deltaEl.innerHTML = badgeVariation(variation(p));

      const angleSel = angleBySlug[p.slug] ?? 0;

      labelsEl.querySelectorAll('.hero__label').forEach(b =>
        b.setAttribute('aria-selected', String(b.dataset.slug === p.slug)));

      arcGroup.querySelectorAll('.hero__arc-label').forEach(t => {
        const angle = +t.dataset.angle;
        const actif = t.dataset.slug === p.slug;
        const diff = Math.abs(angle - angleSel);
        const norm = Math.min(diff / maxDiff, 1);
        t.classList.toggle('is-active', actif);
        t.style.opacity = actif ? '1' : (1 - norm * 0.62).toFixed(2);
      });

      tickGroup.querySelectorAll('.hero__tick').forEach(t => {
        const angle = +t.dataset.angle;
        const actif = t.dataset.slug === p.slug;
        const diff = Math.abs(angle - angleSel);
        const norm = Math.min(diff / maxDiff, 1);
        t.classList.toggle('is-active', actif);
        t.style.opacity = actif ? '1' : (1 - norm * 0.7).toFixed(2);
      });

      const [dx, dy] = polar(angleSel, DOT_R);
      dotEl.setAttribute('cx', dx);
      dotEl.setAttribute('cy', dy);

      renderSizes(p);
      cartBtn.onclick = () => ajouterAuPanier(p.slug, qte);

      const idx = tous.indexOf(p);
      const nn = tous.length;
      decoA.innerHTML = mediaProduit(tous[(idx + 2) % nn], 'hero__deco-img');
      decoB.innerHTML = mediaProduit(tous[(idx + 5) % nn], 'hero__deco-img');
    }

    montrer(phares[0]);
  }

  /* ---------------- Bandeau de prix : pliable, présent sur tout le site ---------------- */

  function initTickerBar(container, opts = {}) {
    if (!container) return;
    const CLE = 'ivt_ticker_folded';
    const piste = container.querySelector('#tickerMarche');
    creerTicker(piste);

    const toggle = container.querySelector('.ticker__toggle');

    function plier(folded) {
      container.classList.toggle('is-folded', folded);
      toggle.setAttribute('aria-expanded', String(!folded));
    }

    let pref = null;
    try { pref = localStorage.getItem(CLE); } catch {}
    plier(pref === '1');

    toggle.addEventListener('click', () => {
      const folded = !container.classList.contains('is-folded');
      plier(folded);
      try { localStorage.setItem(CLE, folded ? '1' : '0'); } catch {}
    });

    if (opts.autoFoldSelector) {
      if (location.hash && location.hash === opts.autoFoldHash) plier(true);
      const cible = document.querySelector(opts.autoFoldSelector);
      if (cible && 'IntersectionObserver' in window) {
        const io = new IntersectionObserver(([entree]) => {
          if (entree.isIntersecting) { plier(true); return; }
          let manuel = '0';
          try { manuel = localStorage.getItem(CLE) || '0'; } catch {}
          plier(manuel === '1');
        }, { rootMargin: '-35% 0px -55% 0px' });
        io.observe(cible);
      }
    }
  }

  /* ---------------- Bandeau de prix en flux (non fixe) ---------------- */

  function creerTicker(container) {
    if (!container || !DATA || !DATA.produits) return;
    const piste = document.createElement('div');
    piste.className = 'ticker__track';
    const fabriquer = p => {
      const v = variation(p);
      const f = v.sens === 'up' ? '▲' : v.sens === 'down' ? '▼' : '—';
      const a = document.createElement('a');
      a.className = 'ticker__item';
      a.href = 'produit.html?p=' + encodeURIComponent(p.slug);
      a.innerHTML = `<span class="ticker__name">${p.nom}</span> <b>${fmt(prixActuel(p))} F</b>` +
        (v.sens === 'flat' ? '' : `<span class="ticker__delta ticker__delta--${v.sens}">${f} ${Math.abs(v.pct).toFixed(1)}%</span>`);
      return a;
    };
    [...DATA.produits, ...DATA.produits].forEach(p => piste.appendChild(fabriquer(p)));
    container.innerHTML = '';
    container.appendChild(piste);
  }

  document.addEventListener('DOMContentLoaded', () => {
    initHeader();
    observerReveal();
  });

  return {
    DATA, parSlug, nomCategorie, prixActuel, variation, fmt, dateCourte,
    imageDe, imageWebpDe, animerNombre, creerHero, creerTicker, initTickerBar, badgeVariation, lienWhatsApp,
    carteProduit, mediaProduit, dessinerGraphique,
    ajouterAuPanier, definirQuantite, retirerDuPanier, lignesPanier,
    totalPanier, totalArticles, observerReveal, toast
  };

})();
