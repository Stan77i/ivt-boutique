/* IVT — Le trajet : relie le hero, le ticker et le panier existants à la scène <ivt-terroir>. */
(() => {
  const A = typeof IVT_APP !== 'undefined' ? IVT_APP : null; if (!A) return;
  const D = A.DATA, P = window.IVT_PRIX;
  const $ = (s, r = document) => r.querySelector(s);
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  const SIX = [['tomate', 'Tomate'], ['oignon-violet', 'Oignon'], ['pomme-de-terre', 'Pomme de terre'],
    ['aubergine-violette', 'Aubergine djèmbà'], ['piment-vert', 'Piment vert'], ['banane-plantain', 'Plantain']];

  const qteDe = p => p.unite === 'kg' ? (parseInt((String(p.colis).match(/\d+/) || [0])[0], 10) || 10) : 1;
  const route = slug => {
    const g = window.IVT_GEO && IVT_GEO.product(slug); if (!g) return 'Adjamé';
    const z = g.zones.map(z => esc(z.precision === 'pays' ? z.nom + ' (import)' : z.nom)).join(' · ') || (g.statut === 'non-localisable' ? 'Import, pays non précisé' : 'Origine non renseignée');
    return z + ' <span>→</span> ' + g.markets.map(m => esc(m.court)).join(' · ');
  };
  function varTxt(p) {
    const v = A.variation(p);
    if (v.sens === 'flat') return { sens: 'flat', txt: 'Stable cette semaine' };
    return { sens: v.sens, txt: (v.sens === 'up' ? '▲ ' : '▼ ') + Math.abs(v.pct).toFixed(1).replace('.', ',') + ' % cette semaine' };
  }
  function spark(p) {
    const s = p.prix, pts = s.map((v, i) => [i, v]).filter(x => x[1] != null);
    if (pts.length < 2) return '';
    const vs = pts.map(x => x[1]), mn = Math.min(...vs), mx = Math.max(...vs);
    return pts.map(([i, v]) => ((i / (s.length - 1)) * 120).toFixed(1) + ',' + (24 - (mx === mn ? .5 : (v - mn) / (mx - mn)) * 20).toFixed(1)).join(' ');
  }

  /* ---------- Six produits ---------- */
  const list = $('#trProduits');
  if (list) {
    list.innerHTML = SIX.map(([slug, nom], i) => {
      const p = A.parSlug[slug]; if (!p) return '';
      const v = varTxt(p), q = qteDe(p);
      return `<section class="tr-prod" id="trajet-${slug}" data-produit="${slug}" data-origine="${esc(p.origine)}" data-screen-label="Trajet — ${esc(nom)}">
  <div class="wrap tr-prod__grid">
    <div class="tr-col reveal">
      <p class="tr-kicker tr-kicker--mute">0${i + 1} / 06</p>
      <h3 class="tr-prod__name">${esc(nom)}</h3>
      <p class="tr-route">${route(slug)}</p>
      <p class="tr-text">${esc(p.note)}</p>
      <div class="tr-prod__data">
        <div><b class="tr-prod__price">${A.fmt(A.prixActuel(p))} F</b><small>le ${esc(p.unite)} · ${esc(p.colis)}</small></div>
        <div><svg width="120" height="28" viewBox="0 0 120 28" aria-hidden="true"><polyline points="${spark(p)}" fill="none" stroke="#8CC63F" stroke-width="1.4" stroke-linejoin="round" stroke-linecap="round"/></svg><small class="is-${v.sens}">${v.txt}</small></div>
      </div>
      <div class="tr-actions">
        <button type="button" class="tr-btn tr-btn--primary" data-ajout-slug="${slug}" data-qte="${q}">Ajouter ${q} ${esc(p.unite)} au panier</button>
        <a class="tr-link" href="produit.html?p=${slug}">Fiche et historique →</a>
      </div>
    </div>
    <div class="tr-prod__media"><img data-pack src="${A.imageWebpDe(p)}" alt="${esc(p.nom)}" loading="lazy" onerror="this.onerror=null;this.src='${A.imageDe(p)}'"></div>
  </div>
</section>`;
    }).join('');
    list.addEventListener('click', e => {
      const b = e.target.closest('.tr-btn[data-ajout-slug]'); if (!b || e.target.closest('.ajout-pastille')) return;
      A.ajouterAuPanier(b.dataset.ajoutSlug, +b.dataset.qte || 1); majPortes();
    });
  }

  /* ---------- Pont : le produit choisi dans la roue devient le premier trajet ---------- */
  const bridge = $('#trBridge');
  let courant = null;
  function lireAccent() {
    const h = $('.hero'); if (!h) return null;
    const c = getComputedStyle(h).getPropertyValue('--hero-accent').trim();
    return c || null;
  }
  function montrer(slug) {
    const p = A.parSlug[slug]; if (!p || !bridge || slug === courant) return;
    courant = slug;
    bridge.dataset.produit = slug; bridge.dataset.origine = p.origine;
    $('[data-tr-nom]', bridge).textContent = p.nom.toLowerCase();
    const G = window.IVT_GEO, geo = G && G.product(slug), ph = geo ? G.phrase(geo) : { verbe: 'arrive à', lieu: 'Adjamé', note: '' };
    const o = $('[data-tr-origine]', bridge);
    o.previousSibling.textContent = ' ' + ph.verbe + ' ';
    o.textContent = ph.lieu;
    o.parentNode.lastChild.textContent = '.';
    const note = $('[data-tr-geo-note]', bridge);
    if (note) { note.textContent = ph.note; note.hidden = !ph.note; }
    majFlux(geo);
    window.__ivtSel = slug;
    dispatchEvent(new CustomEvent('ivt:product', { detail: { slug } }));
    $('[data-tr-img]', bridge).src = A.imageWebpDe(p);
    $('[data-tr-img]', bridge).alt = p.nom;
    $('[data-tr-prix]', bridge).textContent = A.fmt(A.prixActuel(p)) + ' F le ' + p.unite;
    $('[data-tr-colis]', bridge).textContent = p.colis + ' · ' + varTxt(p).txt.toLowerCase();
    $('[data-tr-fiche]', bridge).href = 'produit.html?p=' + slug;
    setTimeout(() => {
      const acc = lireAccent(); if (!acc) return;
      document.documentElement.style.setProperty('--tr-accent', acc);
      window.__ivtAccent = acc;
      dispatchEvent(new CustomEvent('ivt:accent', { detail: { accent: acc } }));
    }, 700);
  }
  const stage = $('#heroStage');
  function majFlux(geo) {
    const f = $('[data-flux]'); if (!f || !window.IVT_GEO) return;
    const z = IVT_GEO.primary(geo), m = IVT_GEO.markets.adjame;
    const from = $('[data-flux-from]', f), note = $('[data-flux-note]', f);
    f.dataset.km = z ? IVT_GEO.km(z, m) : 0;
    if (from) from.textContent = z ? (z.precision === 'pays' ? z.nom + ' (import)' : z.nom) : 'Origine non renseignée';
    if (note) note.textContent = z ? (z.precision === 'pays' ? 'distance indicative depuis la frontière nord' : 'à vol d’oiseau jusqu’à Adjamé') + (geo.zones.length > 1 ? ' · ' + geo.zones.length + ' zones d’origine' : '') : 'arrivée directe au marché';
  }
  const lireSel = () => { const b = stage && stage.querySelector('[data-slug][aria-selected="true"]'); if (b) montrer(b.dataset.slug); };
  if (stage) new MutationObserver(lireSel).observe(stage, { subtree: true, attributes: true, attributeFilter: ['aria-selected'] });
  lireSel(); if (!courant) montrer('tomate');

  /* ---------- Ticker : survoler un cours allume la route du produit ---------- */
  const tick = $('#tickerBar');
  if (tick) {
    let cur = null;
    tick.addEventListener('pointerover', e => {
      const a = e.target.closest('a[href*="produit.html?p="]'); if (!a) return;
      const slug = decodeURIComponent(a.href.split('p=')[1] || ''); if (slug === cur) return; cur = slug;
      const p = A.parSlug[slug]; if (p) dispatchEvent(new CustomEvent('ivt:focus', { detail: { slug } }));
    });
    tick.addEventListener('pointerleave', () => { cur = null; dispatchEvent(new CustomEvent('ivt:focus', { detail: {} })); });
  }

  /* ---------- Chiffres réels ---------- */
  const norm = t => { t = t.trim(); if (/Niger/.test(t)) return 'Niger'; if (/Burkina/.test(t)) return 'Burkina'; if (/^Ferk/.test(t)) return 'Ferké'; return t; };
  const bassins = new Set(); D.produits.forEach(p => String(p.origine).split('·').forEach(t => bassins.add(norm(t))));
  const set = (sel, v) => document.querySelectorAll(sel).forEach(el => el.textContent = v);
  set('[data-tr-n-produits]', D.produits.length);
  set('[data-tr-n-bassins]', bassins.size);
  set('[data-tr-n-semaines]', P ? P.semaines.length : D.semaines.length);
  set('[data-tr-date]', A.dateCourte(D.semaines[D.semaines.length - 1]));

  function majPortes() {
    const n = A.lignesPanier().length;
    set('[data-tr-panier]', n ? n + (n > 1 ? ' produits' : ' produit') + ' · ' + A.fmt(A.totalPanier()) + ' F' : 'Votre panier est vide');
  }
  majPortes(); addEventListener('storage', majPortes);

  /* ---------- Effets liés au scroll ---------- */
  const flux = $('[data-flux]');
  function frame() {
    const vh = innerHeight;
    document.querySelectorAll('.tr-prod').forEach(el => {
      const img = el.querySelector('[data-pack]'); if (!img) return;
      const r = el.getBoundingClientRect(); if (r.bottom < -vh || r.top > vh * 2) return;
      const c = (r.top + r.height / 2 - vh / 2) / vh, out = clamp(-c * 1.7), inn = clamp(c * 1.3);
      img.style.opacity = ((1 - out) * (1 - inn * 0.85)).toFixed(3);
      img.style.transform = `translate3d(${(-out * 16).toFixed(2)}vw, ${(-out * 10 + inn * 6).toFixed(2)}vh, 0) scale(${(1 - out * 0.75).toFixed(3)})`;
      img.style.filter = `blur(${(out * 7).toFixed(1)}px) drop-shadow(0 30px 40px rgba(0,0,0,.45))`;
    });
    if (flux) {
      const r = flux.getBoundingClientRect();
      if (r.bottom > 0 && r.top < vh) {
        const p = clamp(-r.top / Math.max(1, r.height - vh));
        const km = +flux.dataset.km || 0;
        $('[data-km]', flux).textContent = Math.round(p * km) + ' km';
        $('[data-flux-bar]', flux).style.transform = `scaleX(${p.toFixed(4)})`;
        $('[data-flux-a]', flux).style.opacity = (1 - p * 0.8).toFixed(3);
        $('[data-flux-b]', flux).style.opacity = (0.15 + 0.85 * clamp((p - 0.55) / 0.35)).toFixed(3);
      }
    }
  }
  let pending = false;
  const onScroll = () => { if (pending) return; pending = true; requestAnimationFrame(() => { pending = false; frame(); }); };
  addEventListener('scroll', onScroll, { passive: true }); addEventListener('resize', onScroll); frame();
})();
