/* ============================================================
   IVT — Moteur du site (panier, rendu, graphique de prix)
   Aucune dépendance externe. Fonctionne en local (file://)
   comme en ligne.
   ============================================================ */

const IVT_APP = (() => {

  const DATA = window.IVT;
  const CLE_PANIER = 'ivt_panier_v1';
  const CHEMIN_IMG = 'assets/img/produits/';
  const WHATSAPP_NUM = '2250100376155';

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
    const pct = Math.abs(v.pct).toFixed(1).replace('.', ',');
    const flag = v.sens === 'flat' ? 'Stable' : (v.sens === 'up' ? '▲ ' : '▼ ') + pct + ' %';
    const flagLabel = v.sens === 'flat' ? 'Prix stable cette semaine' : (v.sens === 'up' ? 'Hausse de ' : 'Baisse de ') + pct + ' % cette semaine';
    const href = 'produit.html?p=' + p.slug;
    return `<article class="etal etal--${v.sens} reveal">
      <div class="etal__stage">
        <a class="etal__visual" href="${href}" tabindex="-1" aria-hidden="true">
          <span class="etal__ring"></span>
          ${mediaProduit(p, 'etal__img')}
        </a>
        <span class="etal__flag" title="${flagLabel}"><span class="sr-only">${flagLabel}</span><span aria-hidden="true">${flag}</span></span>
        <button type="button" class="etal__add" aria-label="Ajouter ${p.nom} au panier" onclick="event.stopPropagation();IVT_APP.ajouterAuPanier('${p.slug}')">
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M4 4h2l2.4 12.2a2 2 0 0 0 2 1.6h7.4a2 2 0 0 0 2-1.6L21 8H7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><circle cx="9" cy="20" r="1.4" fill="currentColor"/><circle cx="17" cy="20" r="1.4" fill="currentColor"/></svg>
        </button>
      </div>
      <div class="etal__body">
        <div class="etal__meta"><span>${nomCategorie(p.categorie)}</span><span>${p.colis || p.unite}</span></div>
        <h3 class="etal__name"><a href="${href}">${p.nom}</a></h3>
        <div class="etal__price"><b>${fmt(prixActuel(p))}</b><span class="etal__unit">F<i>/ ${p.unite}</i></span>${v.sens !== 'flat' ? '<s aria-label="Prix semaine dernière">' + fmt(prixPrecedent(p)) + ' F</s>' : ''}</div>
      </div>
    </article>`;
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

  /* Habillage du hero par produit : accent (texte/UI, lisible sur fond sombre), glow/glow2 (halos), deep (fond), btn (fond bouton, texte blanc AA) */
  const HERO_PALETTE = {
    'tomate':          { accent: '#FF7A6E', glow: '#D0222F', glow2: '#8C1520', deep: '#2A0D0E', btn: '#B81D2A' },
    'ananas':          { accent: '#F2C35A', glow: '#C98A12', glow2: '#8CC63F', deep: '#241B08', btn: '#8A5A00' },
    'piment-big-sun':  { accent: '#FF9458', glow: '#E0521E', glow2: '#C8202E', deep: '#2A1109', btn: '#B53A12' },
    'avocat':          { accent: '#BFDB78', glow: '#5E7F24', glow2: '#C9D98A', deep: '#141E0A', btn: '#4E6B1F' },
    'gombo':           { accent: '#86DB62', glow: '#2E9A2C', glow2: '#8CC63F', deep: '#08230F', btn: '#25762A' },
    'banane-plantain': { accent: '#DCDC5A', glow: '#9AA41C', glow2: '#E0A21E', deep: '#1D1F07', btn: '#666F12' },
    'oignon-violet':   { accent: '#C98BA1', glow: '#A35B74', glow2: '#7E4459', deep: '#1E0E15', btn: '#8A4A61' },
    'pasteque':        { accent: '#8FCB9B', glow: '#3E6B2E', glow2: '#6FA85A', deep: '#0A1A10', btn: '#3E6B2E' },
    'papaye-ronde':       { accent: '#FFA36B', glow: '#E0662A', glow2: '#5E8F2E', deep: '#2A1308', btn: '#B34E18' },
    'papaye-solo':        { accent: '#FFB85C', glow: '#E08A1E', glow2: '#C9A21E', deep: '#2A1707', btn: '#A8560E' },
    'poivron-vert':       { accent: '#9EDB6E', glow: '#3F8F2A', glow2: '#8CC63F', deep: '#0C200A', btn: '#3A7424' },
    'pomme-de-terre':     { accent: '#E3C48E', glow: '#9C7440', glow2: '#C9A36A', deep: '#1F170C', btn: '#7A5A2C' },
    'aubergine-violette': { accent: '#C49BDB', glow: '#6E3E8C', glow2: '#4A2A63', deep: '#180E20', btn: '#6A3A86' },
    'citron':             { accent: '#E6E65C', glow: '#A8B51E', glow2: '#6FA02A', deep: '#1D1F07', btn: '#666F12' },
    'piment-garba':       { accent: '#9DAC25', glow: '#9DAC25', glow2: '#6F7F14', deep: '#1A1E06', btn: '#5E6912' },
    'feuille-oignon':     { accent: '#95D98A', glow: '#3C8C3A', glow2: '#B8D98A', deep: '#0A1F0E', btn: '#357A33' },
    'orange-locale':      { accent: '#FFB25E', glow: '#E0801E', glow2: '#8CA82A', deep: '#291708', btn: '#A85A10' },
    'concombre':          { accent: '#A6D98E', glow: '#3E7F3A', glow2: '#C9E0A0', deep: '#0B1D0D', btn: '#3A7036' },
    'patate-douce':       { accent: '#E0A07A', glow: '#9C4E36', glow2: '#C27A4A', deep: '#20100B', btn: '#8A4430' },
    'haricot-vert-local': { accent: '#8FD67A', glow: '#2F8A34', glow2: '#8CC63F', deep: '#08200E', btn: '#2E7A30' },
    'banane-douce':       { accent: '#F2D65A', glow: '#C9A21E', glow2: '#8CA82A', deep: '#211C07', btn: '#7E6A08' },
    'oignon-blanc':       { accent: '#E6DCC4', glow: '#9C8F6E', glow2: '#C9BFA0', deep: '#1C1911', btn: '#6E6446' },
    'persil':             { accent: '#7ED67A', glow: '#23873A', glow2: '#6FC25A', deep: '#061F0D', btn: '#237A33' },
    'orange-ghana':       { accent: '#FFA24E', glow: '#E0701A', glow2: '#C9A21E', deep: '#2A1507', btn: '#A8520E' },
    'aubergine-blanche':  { accent: '#DCD6C0', glow: '#8C8468', glow2: '#6FA85A', deep: '#1A1810', btn: '#6A6448' },
    'patate-douce-jaune': { accent: '#F0C46E', glow: '#B8861E', glow2: '#C9A36A', deep: '#221A08', btn: '#7E5E0E' },
    'piment-vert':        { accent: '#A8E06A', glow: '#4E9A22', glow2: '#8CC63F', deep: '#0E2108', btn: '#40781C' },
    'haricot-vert-burkina': { accent: '#9AD77E', glow: '#3A8C30', glow2: '#C9D98A', deep: '#0A1F0B', btn: '#35762C' },
    'ail':                { accent: '#E8DDE6', glow: '#9C8698', glow2: '#C9B8C4', deep: '#1C171B', btn: '#6E5E6A' },
    'choux':              { accent: '#B8E09A', glow: '#5E9A3A', glow2: '#C9E0A0', deep: '#101F0A', btn: '#4A7A2C' }
  };
  function habillerHero(section, slug) {
    if (!section) return;
    const c = HERO_PALETTE[slug];
    ['accent', 'glow', 'glow2', 'deep', 'btn'].forEach(k => {
      if (c) section.style.setProperty('--hero-' + k, c[k]);
      else section.style.removeProperty('--hero-' + k);
    });
    section.dataset.produit = slug;
  }

  /* Panneau « Tous les produits » (ouvert depuis le hero) */
  function ouvrirCatalogue(declencheur, choisirPhare) {
    let dlg = document.getElementById('catalogueDlg');
    if (!dlg) {
      dlg = document.createElement('dialog');
      dlg.id = 'catalogueDlg'; dlg.className = 'catdlg';
      dlg.setAttribute('aria-labelledby', 'catdlgTitre');
      const cats = [...new Set(DATA.produits.map(p => p.categorie))];
      dlg.innerHTML = `
        <div class="catdlg__head">
          <div><p class="eyebrow">Catalogue IVT</p><h2 class="catdlg__title" id="catdlgTitre">${DATA.produits.length} produits, <em>au prix du marché</em></h2></div>
          <button type="button" class="catdlg__close" aria-label="Fermer">✕</button>
        </div>
        <div class="catdlg__tools">
          <label class="search catdlg__search"><svg class="search__icon" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M16 16l4.5 4.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg><input type="search" placeholder="Rechercher un produit…" aria-label="Rechercher un produit" autocomplete="off"></label>
          <div class="catdlg__cats" role="group" aria-label="Catégories">
            <button type="button" class="catdlg__cat" aria-pressed="true" data-cat="">Tout</button>
            ${cats.map(c => `<button type="button" class="catdlg__cat" aria-pressed="false" data-cat="${c}">${nomCategorie(c)}</button>`).join('')}
          </div>
        </div>
        <ul class="catdlg__list"></ul>
        <p class="catdlg__empty" hidden>Aucun produit ne correspond.</p>`;
      document.body.appendChild(dlg);
      const list = dlg.querySelector('.catdlg__list'), input = dlg.querySelector('input'), empty = dlg.querySelector('.catdlg__empty');
      list.innerHTML = DATA.produits.map(p => `<li data-cat="${p.categorie}" data-q="${(p.nom + ' ' + nomCategorie(p.categorie)).toLowerCase()}">
        <a class="catdlg__item" href="produit.html?p=${p.slug}" data-slug="${p.slug}">
          <span class="catdlg__thumb"><img src="${imageWebpDe(p)}" alt="" loading="lazy" onerror="this.onerror=null;this.src='${imageDe(p)}'"></span>
          <span class="catdlg__name">${p.nom}<small>${nomCategorie(p.categorie)}</small></span>
          <span class="catdlg__price">${fmt(prixActuel(p))} F<small>/ ${p.unite}</small></span>
        </a></li>`).join('');
      let cat = '';
      const filtrer = () => {
        const q = input.value.trim().toLowerCase(); let vis = 0;
        list.querySelectorAll('li').forEach(li => { const ok = (!cat || li.dataset.cat === cat) && (!q || li.dataset.q.includes(q)); li.hidden = !ok; if (ok) vis++; });
        empty.hidden = vis > 0;
      };
      input.addEventListener('input', filtrer);
      dlg.querySelectorAll('.catdlg__cat').forEach(b => b.addEventListener('click', () => {
        cat = b.dataset.cat; dlg.querySelectorAll('.catdlg__cat').forEach(x => x.setAttribute('aria-pressed', String(x === b))); filtrer();
      }));
      const fermer = () => { dlg.classList.remove('is-open'); setTimeout(() => dlg.open && dlg.close(), 260); };
      dlg.querySelector('.catdlg__close').addEventListener('click', fermer);
      dlg.addEventListener('click', e => { if (e.target === dlg) fermer(); });
      dlg.addEventListener('cancel', e => { e.preventDefault(); fermer(); });
      dlg.addEventListener('close', () => { document.documentElement.style.overflow = ''; dlg._retour && dlg._retour.focus(); });
      list.addEventListener('click', e => {
        const a = e.target.closest('.catdlg__item'); if (!a || !dlg._choisir) return;
        if (e.metaKey || e.ctrlKey || e.shiftKey) return;
        if (dlg._choisir(a.dataset.slug)) { e.preventDefault(); fermer(); }
      });
    }
    dlg._retour = declencheur; dlg._choisir = choisirPhare;
    document.documentElement.style.overflow = 'hidden';
    dlg.showModal();
    requestAnimationFrame(() => dlg.classList.add('is-open'));
    setTimeout(() => dlg.querySelector('input').focus(), 60);
  }

  const PIPS = { 1: [[16,16]], 2: [[10,10],[22,22]], 3: [[10,10],[16,16],[22,22]], 4: [[10,10],[22,10],[10,22],[22,22]], 5: [[10,10],[22,10],[16,16],[10,22],[22,22]], 6: [[10,9],[22,9],[10,16],[22,16],[10,23],[22,23]] };

  function creerHero(container, phares, tousProduits, opts) {
    if (!container || !phares.length) return;
    const SVG_NS = 'http://www.w3.org/2000/svg';
    const tous = (tousProduits && tousProduits.length) ? tousProduits : null;
    const groupes = (opts && opts.groupes && opts.groupes.length) ? opts.groupes.filter(g => g.length) : [phares];
    container.innerHTML = `
      <div class="hero__sizes" role="group" aria-label="Quantité">
        <span class="hero__sizes-label">Quantité</span>
        <div class="hero__sizes-track"></div>
        <span class="hero__sizes-value"></span>
      </div>
      <div class="hero__orbit">
        <svg class="hero__orbit-svg" viewBox="0 0 500 500" aria-hidden="true">
          <circle class="hero__ring-path" cx="250" cy="260" r="186" pathLength="360"></circle>
          <circle class="hero__ring-path hero__ring-path--inner" cx="250" cy="260" r="172" pathLength="360"></circle>
          <defs></defs>
          <g class="hero__ticks"></g>
          <g class="hero__arc-labels"></g>
          <circle class="hero__dot" r="3.2"></circle>
        </svg>
        <div class="hero__labels" role="tablist"></div>
        <div class="hero__media"></div>
        <a class="hero__deco hero__deco--a" href="#"></a>
        <a class="hero__deco hero__deco--b" href="#"></a>
      </div>
      <div class="hero__ctrls">
        <button type="button" class="hero__all" aria-haspopup="dialog">
          <span class="hero__all-plus" aria-hidden="true">+</span>
          <span>Tous les produits <b class="hero__all-n"></b></span>
        </button>
        <div class="hero__dice-wrap"${groupes.length < 2 ? ' hidden' : ''}>
          <button type="button" class="hero__dice" aria-label="Afficher d'autres produits" title="Afficher d'autres produits">
            <svg viewBox="0 0 32 32" aria-hidden="true"><rect x="3.5" y="3.5" width="25" height="25" rx="7"></rect><g class="hero__pips"></g></svg>
          </button>
          <span class="hero__dice-meta" aria-hidden="true">
            <span class="hero__dice-n"></span>
            <span class="hero__dice-dots">${groupes.map(() => '<i></i>').join('')}</span>
          </span>
        </div>
        <span class="hero__live" aria-live="polite"></span>
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
    const allBtn      = container.querySelector('.hero__all');
    const diceBtn     = container.querySelector('.hero__dice');
    const pipsEl      = container.querySelector('.hero__pips');
    const diceN       = container.querySelector('.hero__dice-n');
    const diceDots    = [...container.querySelectorAll('.hero__dice-dots i')];
    const liveEl      = container.querySelector('.hero__live');
    container.querySelector('.hero__all-n').textContent = '(' + DATA.produits.length + ')';
    allBtn.addEventListener('click', () => ouvrirCatalogue(allBtn, slug => {
      const b = labelsEl.querySelector('.hero__label[data-slug="' + slug + '"]');
      if (b) { b.click(); return true; }
      return false;
    }));

    const CX = 250, CY = 260, R = 195, DOT_R = 172;
    let gi = 0, groupe = groupes[0], totalSpan = 0, maxDiff = 1, angleBySlug = {};

    // Angles non uniformes : chaque libellé reçoit l'arc dont il a besoin
    // selon sa longueur. Arc COMPACT plafonné à 120°, centré en haut :
    // au-delà le texte incurvé approcherait les côtés/le bas de l'anneau
    // et se lirait à l'envers.
    const FONT = 10.5, LETTRE = 0.78; // approx. avance par caractère (em)
    const perCharDeg = (FONT * LETTRE / R) * (180 / Math.PI);
    const PAD = 1.6, GAP = 3;
    const polar = (angleDeg, r) => {
      const rad = angleDeg * Math.PI / 180;
      return [CX + Math.sin(rad) * r, CY - Math.cos(rad) * r];
    };

    let dotAngle = null, dotAnimId = null;
    const animateDotTo = (targetAngle) => {
      if (dotAngle === null) {
        dotAngle = targetAngle;
        const [x, y] = polar(dotAngle, DOT_R);
        dotEl.setAttribute('cx', x); dotEl.setAttribute('cy', y);
        return;
      }
      if (dotAnimId) cancelAnimationFrame(dotAnimId);
      const startAngle = dotAngle, startTime = performance.now(), duration = 400;
      const step = (now) => {
        const t = Math.min((now - startTime) / duration, 1);
        const eased = 1 - Math.pow(1 - t, 3);
        const a = startAngle + (targetAngle - startAngle) * eased;
        const [x, y] = polar(a, DOT_R);
        dotEl.setAttribute('cx', x); dotEl.setAttribute('cy', y);
        dotAngle = a;
        if (t < 1) dotAnimId = requestAnimationFrame(step);
      };
      dotAnimId = requestAnimationFrame(step);
    };

    let qte = 1;

    /* Mobile : roue tactile — le produit actif se place en haut de l'anneau,
       ses voisins suivent la courbe ; glisser le doigt fait tourner la roue. */
    const mqMobile = matchMedia('(max-width: 759px)');
    const reduitM = matchMedia('(prefers-reduced-motion: reduce)');
    let mobile = mqMobile.matches, wheelS = 0, wheelAnim = null, courant = null, halvesM = [];
    const FONT_M = 15, LETTRE_M = 0.84, GAP_M = 6, PAD_M = 3, VIS_M = 124, PX_CRAN = 62;
    const perCharM = (FONT_M * LETTRE_M / R) * (180 / Math.PI);
    const modN = (v, n) => ((v % n) + n) % n;
    function anglesPour(s) {
      const n = groupe.length, out = new Array(n), bySlot = {}, h = Math.floor(n / 2);
      for (let i = 0; i < n; i++) bySlot[modN(i - s + h, n) - h] = i;
      out[bySlot[0]] = 0;
      let a = 0;
      for (let k = 1; bySlot[k] !== undefined; k++) { a += halvesM[bySlot[k - 1]] + halvesM[bySlot[k]] + GAP_M; out[bySlot[k]] = a; }
      a = 0;
      for (let k = -1; bySlot[k] !== undefined; k--) { a -= halvesM[bySlot[k + 1]] + halvesM[bySlot[k]] + GAP_M; out[bySlot[k]] = a; }
      return out;
    }
    function renderRoue(sf) {
      const n = groupe.length;
      if (!n || !mobile) return;
      const a0 = Math.floor(sf), t = sf - a0;
      const A = anglesPour(modN(a0, n)), B = anglesPour(modN(a0 + 1, n));
      const paths = defsEl.children, texts = arcGroup.children;
      const btns = labelsEl.querySelectorAll('.hero__label:not(.hero__label--flat)');
      for (let i = 0; i < n; i++) {
        const ang = Math.abs(B[i] - A[i]) > 180 ? (t < 0.5 ? A[i] : B[i]) : A[i] + (B[i] - A[i]) * t;
        const h = halvesM[i], d = Math.abs(ang);
        const [x1, y1] = polar(ang - h, R), [x2, y2] = polar(ang + h, R);
        if (paths[i]) paths[i].setAttribute('d', 'M ' + x1 + ',' + y1 + ' A ' + R + ',' + R + ' 0 0 1 ' + x2 + ',' + y2);
        let op = d >= VIS_M ? 0 : 1 - (d / VIS_M) * 0.6;
        if (d > VIS_M - 22) op *= Math.max(0, (VIS_M - d) / 22);
        if (texts[i]) { texts[i].style.opacity = op.toFixed(3); texts[i].classList.toggle('is-active', d < 7); }
        if (btns[i]) {
          const [bx, by] = polar(ang, R);
          btns[i].style.left = (bx / 5) + '%'; btns[i].style.top = (by / 5) + '%';
          btns[i].style.visibility = op > 0.2 ? 'visible' : 'hidden';
        }
      }
    }
    function tournerVers(cible, instant) {
      const n = groupe.length;
      let delta = modN(cible - wheelS, n);
      if (delta > n / 2) delta -= n;
      const from = wheelS, to = wheelS + delta;
      if (wheelAnim) cancelAnimationFrame(wheelAnim);
      wheelAnim = null;
      if (instant || reduitM.matches || Math.abs(delta) < 0.001) { wheelS = modN(to, n); renderRoue(wheelS); return; }
      const t0 = performance.now(), D = 460 + Math.min(Math.abs(delta), 3) * 70;
      const step = now => {
        const k = Math.min((now - t0) / D, 1), e = 1 - Math.pow(1 - k, 3);
        wheelS = from + (to - from) * e; renderRoue(wheelS);
        if (k < 1) wheelAnim = requestAnimationFrame(step); else { wheelAnim = null; wheelS = modN(to, n); }
      };
      wheelAnim = requestAnimationFrame(step);
    }

    function construire() {
      defsEl.innerHTML = ''; arcGroup.innerHTML = ''; tickGroup.innerHTML = ''; labelsEl.innerHTML = '';
      const n = groupe.length;
      const slugsGroupe = new Set(groupe.map(p => p.slug));
      const autres = tous ? tous.filter(p => !slugsGroupe.has(p.slug)) : [];
      const halves = groupe.map(p => (p.nom.length * perCharDeg) / 2 + PAD);
      totalSpan = halves.reduce((s, h) => s + 2 * h, 0) + GAP * (n - 1);
      maxDiff = totalSpan / 2 || 1;
      halvesM = groupe.map(p => (p.nom.length * perCharM) / 2 + PAD_M);
      wheelS = 0;

      let cursor = -totalSpan / 2;
      const angles = groupe.map((p, i) => {
        const a = cursor + halves[i];
        cursor += 2 * halves[i] + GAP;
        return a;
      });

      angleBySlug = {};
      groupe.forEach((p, i) => { angleBySlug[p.slug] = angles[i]; });

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

      groupe.forEach((p, i) => {
        const angle = angles[i];

        // Cible tactile invisible (zone cliquable généreuse, ≥44px)
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'hero__label'; b.dataset.slug = p.slug;
        b.dataset.angle = angle;
        b.setAttribute('role', 'tab');
        b.setAttribute('aria-selected', 'false');
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
        const pathId = 'heroArc' + gi + '-' + i;
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

      pipsEl.innerHTML = (PIPS[gi + 1] || PIPS[6]).map(([x, y]) => '<circle cx="' + x + '" cy="' + y + '" r="2.6"></circle>').join('');
      diceN.innerHTML = '<b>' + (gi + 1) + '</b> / ' + groupes.length;
      diceDots.forEach((d, i) => d.classList.toggle('is-on', i === gi));
      diceBtn.setAttribute('aria-label', "Afficher d'autres produits — sélection " + (gi + 1) + ' sur ' + groupes.length);
      renderRoue(0);
    }

    let enCours = false;
    function changerGroupe(suivant) {
      if (enCours || groupes.length < 2) return;
      enCours = true;
      const reduit = matchMedia('(prefers-reduced-motion: reduce)').matches;
      const D = reduit ? 1 : 300, EASE = 'cubic-bezier(.22,.7,.2,1)';
      diceBtn.animate([{ transform: 'rotate(0deg) scale(1)' }, { transform: 'rotate(220deg) scale(.86)', offset: 0.55 }, { transform: 'rotate(360deg) scale(1)' }], { duration: reduit ? 1 : 680, easing: EASE });
      const sorties = [
        ...[arcGroup, tickGroup].map(el => el.animate([{ opacity: 1, transform: 'rotate(0deg)' }, { opacity: 0, transform: 'rotate(-16deg)' }], { duration: D, easing: 'cubic-bezier(.5,0,.75,0)', fill: 'forwards' })),
        labelsEl.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateX(-14px)' }], { duration: D, easing: 'ease-in', fill: 'forwards' })
      ];
      sorties[0].finished.then(() => {
        gi = suivant; groupe = groupes[gi];
        construire();
        montrer(groupe[0]);
        labelsEl.scrollLeft = 0;
        sorties.forEach(a => a.cancel());
        [...arcGroup.children].forEach((t, i) => t.animate(
          [{ opacity: 0, transform: 'rotate(18deg)' }, { opacity: +(t.style.opacity || 1), transform: 'rotate(0deg)' }],
          { duration: reduit ? 1 : 560, delay: reduit ? 0 : i * 40, easing: EASE, fill: 'backwards' }));
        tickGroup.animate([{ opacity: 0, transform: 'rotate(18deg)' }, { opacity: 1, transform: 'rotate(0deg)' }], { duration: reduit ? 1 : 560, easing: EASE });
        labelsEl.animate([{ opacity: 0, transform: 'translateX(14px)' }, { opacity: 1, transform: 'none' }], { duration: reduit ? 1 : 420, easing: EASE });
        liveEl.textContent = 'Sélection ' + (gi + 1) + ' sur ' + groupes.length + ' : ' + groupe.map(p => p.nom).join(', ');
        setTimeout(() => { enCours = false; }, reduit ? 0 : 300);
      });
    }
    if (diceBtn) diceBtn.addEventListener('click', () => changerGroupe((gi + 1) % groupes.length));

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
      courant = p;
      habillerHero(container.closest('.hero'), p.slug);
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

      if (mobile) {
        const iSel = groupe.findIndex(g => g.slug === p.slug);
        if (iSel >= 0) tournerVers(iSel);
        animateDotTo(0);
        const ir = svgEl.querySelector('.hero__ring-path--inner');
        if (ir) { ir.style.strokeDasharray = ''; ir.style.strokeDashoffset = ''; }
      } else {
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

      animateDotTo(angleSel);
      const innerRing = svgEl.querySelector('.hero__ring-path--inner');
      if (innerRing) {
        const RIGHT_END = { 'banane-plantain': 89 };
        const bord = gi === 0 ? 112 : Math.ceil(totalSpan / 2);
        const right = Math.max(gi === 0 ? (RIGHT_END[p.slug] ?? 112) : bord, angleSel + 4);
        const start = 270 - bord, len = bord + right;
        innerRing.style.strokeDasharray = `${len} ${360 - len}`;
        innerRing.style.strokeDashoffset = `${-start}`;
      }
      }

      renderSizes(p);
      cartBtn.onclick = () => ajouterAuPanier(p.slug, qte);

      const horsGroupe = DATA.produits.filter(q => !groupe.some(g => g.slug === q.slug));
      const pool = horsGroupe.length ? horsGroupe : groupe;
      const idx = Math.max(0, groupe.indexOf(p));
      const nn = pool.length;
      [[decoA, pool[(idx * 2) % nn]], [decoB, pool[(idx * 2 + 1) % nn]]].forEach(([el, q]) => {
        el.innerHTML = mediaProduit(q, 'hero__deco-img') + '<span class="hero__deco-tip">' + q.nom + ' <em>· + ' + (DATA.produits.length - groupe.length) + ' autres produits</em></span>';
        el.href = 'produit.html?p=' + q.slug;
        el.setAttribute('aria-label', 'Voir la fiche ' + q.nom);
      });
    }

    // Glisser horizontalement sur l'anneau (mobile) ; le défilement vertical reste natif.
    const orbitEl = container.querySelector('.hero__orbit');
    let drag = null, supprClic = false;
    orbitEl.addEventListener('pointerdown', e => {
      if (!mobile || (e.pointerType === 'mouse' && e.button !== 0)) return;
      drag = { x: e.clientX, y: e.clientY, s: wheelS, dx: 0, on: false, id: e.pointerId };
    });
    orbitEl.addEventListener('pointermove', e => {
      if (!drag || e.pointerId !== drag.id) return;
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (!drag.on) {
        if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) {
          drag.on = true;
          if (wheelAnim) { cancelAnimationFrame(wheelAnim); wheelAnim = null; }
          drag.s = wheelS;
          try { orbitEl.setPointerCapture(e.pointerId); } catch (_) {}
          orbitEl.classList.add('is-dragging');
        } else if (Math.abs(dy) > 10) { drag = null; return; }
        else return;
      }
      drag.dx = dx;
      wheelS = drag.s - dx / PX_CRAN;
      renderRoue(wheelS);
    });
    const finDrag = () => {
      if (!drag) return;
      const d = drag; drag = null;
      if (!d.on) return;
      orbitEl.classList.remove('is-dragging');
      supprClic = true; setTimeout(() => { supprClic = false; }, 60);
      let cible = Math.round(wheelS);
      if (cible === Math.round(d.s) && Math.abs(d.dx) > 22) cible += d.dx < 0 ? 1 : -1;
      const p = groupe[modN(cible, groupe.length)];
      if (p && p !== courant && navigator.vibrate) { try { navigator.vibrate(6); } catch (_) {} }
      if (p) montrer(p);
    };
    orbitEl.addEventListener('pointerup', finDrag);
    orbitEl.addEventListener('pointercancel', finDrag);
    orbitEl.addEventListener('click', e => { if (supprClic) { e.preventDefault(); e.stopPropagation(); } }, true);
    const surChangement = e => { mobile = e.matches; construire(); if (courant) montrer(courant); };
    if (mqMobile.addEventListener) mqMobile.addEventListener('change', surChangement); else mqMobile.addListener(surChangement);

    construire();
    montrer(groupe[0]);

    // Indice discret au premier affichage mobile : la roue « respire » d'un cran.
    if (mobile && !reduitM.matches) setTimeout(() => {
      if (drag || wheelAnim || courant !== groupe[0] || !mobile) return;
      const t0 = performance.now();
      const step = now => {
        const k = Math.min((now - t0) / 1100, 1);
        wheelS = Math.sin(k * Math.PI) * 0.32; renderRoue(wheelS);
        if (k < 1 && !drag) wheelAnim = requestAnimationFrame(step); else { wheelAnim = null; if (!drag) { wheelS = 0; renderRoue(0); } }
      };
      wheelAnim = requestAnimationFrame(step);
    }, 1400);
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
      document.body.classList.toggle('ticker-folded', folded);
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
