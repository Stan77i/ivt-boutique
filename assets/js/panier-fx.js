/* IVT — Panier · transitions visuelles (aucune logique métier).
   Le rendu de #lignes reste celui de panier.html ; ce script s'exécute APRÈS lui sur 'ivt:panier',
   compare avec l'état précédent et anime l'écart : arrivée, retrait, quantité, totaux, panier vide.
   Les montants affichés à la fin sont toujours ceux écrits par la page à partir d'IVT_APP. */
(() => {
  const A = typeof IVT_APP !== 'undefined' ? IVT_APP : null, corps = document.getElementById('lignes');
  if (!A || !corps) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const EASE = 'cubic-bezier(.2,.7,.1,1)';
  const vide = document.getElementById('panierVide'), plein = document.getElementById('panierPlein');
  let prev = null, prevTot = null, prevVide = null;

  const jetons = new WeakMap();
  function compter(el, de, a, fmt, dur) {
    if (!el || de === a) return;
    const fin = el.textContent, tok = {}, t0 = performance.now(); jetons.set(el, tok);
    const pas = now => {
      if (jetons.get(el) !== tok) return;
      const k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      if (k < 1) { el.textContent = fmt(Math.round(de + (a - de) * e)); requestAnimationFrame(pas); } else el.textContent = fin;
    };
    requestAnimationFrame(pas);
  }
  function releve() {
    const lignes = A.lignesPanier(), m = new Map();
    [...corps.children].forEach((tr, i) => {
      const l = lignes[i]; if (!l) return;
      tr.dataset.slug = l.produit.slug;
      const r = tr.getBoundingClientRect();
      m.set(l.produit.slug, { tr, top: r.top + scrollY, left: r.left + scrollX, width: r.width, qte: l.qte, total: l.total, cols: [...tr.children].map(td => td.getBoundingClientRect().width) });
    });
    return m;
  }
  function fantome(o) {
    if (plein.style.display === 'none') return;
    const g = document.createElement('div'); g.className = 'pfx-ghost'; g.setAttribute('aria-hidden', 'true'); g.inert = true;
    Object.assign(g.style, { left: o.left + 'px', top: o.top + 'px', width: o.width + 'px' });
    const t = document.createElement('table'); t.className = 'data-table cart-table'; t.style.cssText = 'width:100%;table-layout:fixed;margin:0';
    const cg = document.createElement('colgroup'); o.cols.forEach(w => { const c = document.createElement('col'); c.style.width = w + 'px'; cg.appendChild(c); });
    const tb = document.createElement('tbody'); tb.appendChild(o.tr); t.append(cg, tb); g.appendChild(t);
    document.body.appendChild(g);
    g.animate([{ opacity: 1, transform: 'none' }, { opacity: .5, transform: 'translate3d(8px,0,0) scale(.985)', offset: .45 }, { opacity: 0, transform: 'translate3d(16px,0,0) scale(.96)' }],
      { duration: 400, easing: 'cubic-bezier(.4,0,.6,1)', fill: 'forwards' }).onfinish = () => g.remove();
    setTimeout(() => g.remove(), 800);
  }
  function rouler(tr, de, a) {
    const input = tr.querySelector('.qty input'); if (!input) return;
    const box = input.parentElement, cs = getComputedStyle(input), h = input.offsetHeight;
    const s = document.createElement('span'); s.className = 'pfx-roll'; s.setAttribute('aria-hidden', 'true');
    Object.assign(s.style, { left: input.offsetLeft + 'px', top: input.offsetTop + 'px', width: input.offsetWidth + 'px', height: h + 'px', font: cs.font, color: cs.color });
    s.style.setProperty('--h', h + 'px');
    const monte = a > de;
    s.innerHTML = `<b><i>${A.fmt(monte ? de : a)}</i><i>${A.fmt(monte ? a : de)}</i></b>`;
    box.appendChild(s); input.classList.add('pfx-hide');
    s.firstChild.animate([{ transform: `translateY(${monte ? 0 : -50}%)` }, { transform: `translateY(${monte ? -50 : 0}%)` }],
      { duration: 300, easing: EASE, fill: 'forwards' }).onfinish = fin;
    function fin() { s.remove(); input.classList.remove('pfx-hide'); }
    setTimeout(fin, 600);
  }
  function apres(premier) {
    const now = releve(), tot = A.totalPanier(), estVide = !now.size;
    if (!reduced && prev) {
      now.forEach((n, slug) => {
        const o = prev.get(slug);
        if (!o) {
          n.tr.classList.add('pfx-new');
          n.tr.animate([{ opacity: 0, transform: 'translate3d(-18px,0,0)' }, { opacity: 1, transform: 'translate3d(2px,0,0)', offset: .7 }, { opacity: 1, transform: 'none' }], { duration: 560, easing: EASE, fill: 'backwards' });
          return;
        }
        const dy = o.top - n.top;
        if (Math.abs(dy) > 1) n.tr.animate([{ transform: `translate3d(0,${dy}px,0)` }, { transform: 'none' }], { duration: 440, easing: EASE });
        if (o.qte !== n.qte) rouler(n.tr, o.qte, n.qte);
        if (o.total !== n.total) compter(n.tr.children[3], o.total, n.total, v => A.fmt(v) + ' F', 480);
      });
      prev.forEach((o, slug) => { if (!now.has(slug)) fantome(o); });
      if (prevTot != null && prevTot !== tot && !estVide) ['sousTotal', 'grandTotal'].forEach(id => compter(document.getElementById(id), prevTot, tot, v => A.fmt(v) + ' F', 620));
      if (estVide && prevVide === false) vide.animate([{ opacity: 0, transform: 'translate3d(0,12px,0)' }, { opacity: 1, transform: 'none' }], { duration: 640, easing: EASE });
    } else if (!reduced && premier) {
      [...now.values()].forEach((n, i) => n.tr.animate([{ opacity: 0, transform: 'translate3d(-14px,0,0)' }, { opacity: 1, transform: 'none' }], { duration: 560, delay: 120 + i * 60, easing: EASE, fill: 'backwards' }));
    }
    prev = now; prevTot = tot; prevVide = estVide;
    videFx(estVide);
  }

  /* Panier vide : quelques graines suivent trois traces discrètes jusqu'au bouton « Parcourir le catalogue » */
  let vfx = null;
  function videFx(on) {
    if (reduced) return;
    if (on && !vfx) vfx = lancerVide(); else if (!on && vfx) { vfx.stop(); vfx = null; }
  }
  function lancerVide() {
    vide.classList.add('pfx-vide');
    const c = document.createElement('canvas'); c.className = 'pfx-vide__c'; c.setAttribute('aria-hidden', 'true'); vide.prepend(c);
    const x = c.getContext('2d'), btn = vide.querySelector('.btn'), dpr = Math.min(2, devicePixelRatio || 1);
    const N = matchMedia('(pointer: coarse)').matches ? 24 : 42;
    const P = Array.from({ length: N }, () => ({ s: Math.random(), sp: 0.035 + 0.045 * Math.random(), lane: Math.random(), r: 0.8 + 1.5 * Math.random(), ph: Math.random() * 6.28 }));
    let W = 0, H = 0, raf = 0, dead = false, vis = true;
    const t0 = performance.now();
    const size = () => { const r = vide.getBoundingClientRect(); W = r.width; H = r.height; c.width = Math.max(1, W * dpr); c.height = Math.max(1, H * dpr); };
    const ro = new ResizeObserver(size); ro.observe(vide); size();
    const io = new IntersectionObserver(es => { vis = es[es.length - 1].isIntersecting; }); io.observe(vide);
    function tick(now) {
      if (dead) return; raf = requestAnimationFrame(tick);
      if (document.hidden || !vis || !W) return;
      const t = (now - t0) / 1000, b = btn.getBoundingClientRect(), v = vide.getBoundingClientRect();
      const tx = b.left - v.left + b.width / 2, ty = b.top - v.top + b.height / 2;
      x.setTransform(dpr, 0, 0, dpr, 0, 0); x.clearRect(0, 0, W, H); x.lineWidth = 1;
      const voie = k => { const sy = H * (0.18 + 0.32 * k); return [0, sy, W * 0.3, sy + Math.sin(t * 0.35 + k) * 18, tx - W * 0.22, ty + (k - 1) * 36]; };
      for (let k = 0; k < 3; k++) { const [x0, y0, x1, y1, x2, y2] = voie(k); x.beginPath(); x.moveTo(x0, y0); x.bezierCurveTo(x1, y1, x2, y2, tx, ty); x.strokeStyle = 'rgba(140,198,63,0.08)'; x.stroke(); }
      P.forEach(p => {
        const s = (p.s + t * p.sp) % 1, u = 1 - s, k = Math.min(2, Math.floor(p.lane * 3)), [x0, y0, x1, y1, x2, y2] = voie(k);
        const X = u * u * u * x0 + 3 * u * u * s * x1 + 3 * u * s * s * x2 + s * s * s * tx;
        const Y = u * u * u * y0 + 3 * u * u * s * y1 + 3 * u * s * s * y2 + s * s * s * ty + Math.sin(t + p.ph) * 3;
        const a = Math.sin(s * Math.PI) * (0.35 + 0.2 * Math.sin(t * 1.3 + p.ph));
        x.beginPath(); x.arc(X, Y, p.r, 0, 6.283); x.fillStyle = `rgba(140,198,63,${a.toFixed(3)})`; x.fill();
      });
    }
    raf = requestAnimationFrame(tick);
    return { stop() { dead = true; cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); c.remove(); vide.classList.remove('pfx-vide'); } };
  }

  document.addEventListener('ivt:panier', () => apres(false));
  apres(true);
})();
