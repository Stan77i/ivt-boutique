/* IVT — Boutique · hero « le champ derrière le comptoir »
   3 plans autour du sujet (photo, sceau, pastilles, flèche : jamais filtrés ni déformés) :
     arrière  (.gh__back)  : champ en perspective (mis en cache) + herbes vivantes qui bordent le bas
     avant    (.gh__front) : canopée dans les coins, légèrement floue, découpée hors des zones de lecture
   UN champ de vent (brise lente + rafales du pointeur / du défilement) et UN ressort partagé
   (3 classes de masse). UNE boucle rAF (IVT_GL.loop : pause hors écran / onglet caché).
   La végétation suit la collection active (filtres de la boutique) ; table de correspondance unique. */
(() => {
  const grid = document.querySelector('.gros__grid');
  const A = typeof IVT_APP !== 'undefined' ? IVT_APP : null;
  if (!grid || !A) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ---------- Configuration unique : collection / produit → famille de végétation ---------- */
  const VEG = {
    familles: {
      neutre:   { label: 'herbes',          blade: 'herbe',  dens: 1,    h: [18, 62],  w: [1.6, 3.2] },
      tuteuree: { label: 'rangées tuteurées', blade: 'herbe', dens: 0.8, h: [16, 52],  w: [1.6, 3], tuteurs: true },
      feuilles: { label: 'grandes feuilles', blade: 'feuille', dens: 0.22, h: [42, 96], w: [14, 26] },
      tiges:    { label: 'tiges',           blade: 'tige',   dens: 0.55, h: [30, 80],  w: [2.2, 3.4] },
      rosette:  { label: 'rosettes',        blade: 'rosette', dens: 0.18, h: [26, 48], w: [5, 8] },
      bas:      { label: 'feuillage bas',   blade: 'coeur',  dens: 0.36, h: [12, 26],  w: [12, 20] },
      botte:    { label: 'bottes',          blade: 'botte',  dens: 0.9,  h: [34, 84],  w: [1.4, 2.4] }
    },
    parCategorie: { legumes: 'tuteuree', fruits: 'feuilles', feculents: 'bas', herbes: 'botte', tout: 'neutre' },
    // affinage par mot-clé du slug (pour un hero centré sur un produit) — dérivé du catalogue, pas du rendu
    parMotCle: [[/tomate|piment|poivron/, 'tuteuree'], [/banane|plantain/, 'feuilles'], [/gombo|aubergine/, 'tiges'], [/ananas/, 'rosette'], [/patate|igname|manioc/, 'bas'], [/ciboule|persil|basilic|menthe/, 'botte']],
    famille(cat, slug) {
      if (slug) { const m = this.parMotCle.find(([r]) => r.test(slug)); if (m) return m[1]; }
      return this.parCategorie[cat] || 'neutre';
    }
  };

  /* ---------- Ressort partagé (mêmes constantes que la page prix) ---------- */
  const W0 = 20;
  function spring(x, v, target, dt, mass, zeta) {
    const w = W0 / Math.sqrt(mass), n = Math.min(16, Math.max(1, Math.ceil(dt * w / 0.2))), h = dt / n;
    for (let i = 0; i < n; i++) { v += (-w * w * (x - target) - 2 * zeta * w * v) * h; x += v * h; }
    return [x, v];
  }
  const MASS = [0.7, 2.4, 7];          // petits brins, tiges, grandes feuilles

  /* ---------- Calques ---------- */
  grid.classList.add('gh');
  const field = document.createElement('canvas'), back = document.createElement('canvas'), front = document.createElement('canvas');
  field.className = 'gh__field'; back.className = 'gh__back'; front.className = 'gh__front';
  [front, back, field].forEach(c => { c.setAttribute('aria-hidden', 'true'); grid.prepend(c); });
  const bx = back.getContext('2d'), fx = front.getContext('2d'), fdx = field.getContext('2d');
  let gy0 = 0, FH = 360;
  const text = grid.querySelector('.gros__text'), visual = grid.querySelector('.gros__visual'), img = grid.querySelector('.gros__img');
  const chips = [...grid.querySelectorAll('.gros__chip')], arrow = grid.querySelector('.gros__arrow');

  let CW = 1, CH = 1, dpr = 1, top0 = 0, safe = [], rTxt = null, rVis = null, horizon = 0, bandTop = 0;
  const tier = window.IVT_GL ? IVT_GL.tier() : 1;
  const mob = () => innerWidth < 768, tab = () => innerWidth < 1024;
  const quota = () => Math.round((mob() ? 500 : tab() ? 900 : 1500) * (tier === 0 ? 0.55 : 1) * quality);
  let quality = 1;

  const rel = (el, pad = 0) => { const r = el.getBoundingClientRect(), c = field.getBoundingClientRect(); return { x: r.left - c.left - pad, y: r.top - c.top - pad, w: r.width + pad * 2, h: r.height + pad * 2 }; };
  function taille() {
    const gr = grid.getBoundingClientRect();
    top0 = gr.top + scrollY;                                  // le canevas remonte jusqu'en haut de page (canopée derrière l'en-tête)
    grid.style.setProperty('--gh-top', (-top0) + 'px');
    const c = field.getBoundingClientRect();
    CW = Math.max(1, c.width); CH = Math.max(1, c.height);
    dpr = Math.min(mob() ? 1 : 1.5, devicePixelRatio || 1);
    rTxt = rel(text); rVis = rel(visual);
    horizon = rVis.y + rVis.h * 0.62; bandTop = rVis.y + rVis.h * 0.74;
    // calques réduits à leur zone utile (moins de pixels à effacer / composer à chaque image)
    gy0 = Math.max(0, Math.min(bandTop, rVis.y + rVis.h * 0.45) - 160); FH = Math.min(CH, mob() ? 240 : 380);
    field.width = Math.round(CW * dpr); field.height = Math.round(CH * dpr);
    back.style.top = (-top0 + gy0) + 'px'; back.style.height = (CH - gy0) + 'px'; back.width = Math.round(CW * dpr); back.height = Math.round((CH - gy0) * dpr);
    front.style.height = FH + 'px'; front.width = Math.round(CW * dpr); front.height = Math.round(FH * dpr);
    // zones de lecture et visage : jamais couvertes par la canopée
    const face = img ? rel(img) : rVis;
    chips.forEach(ch => { ch._x = null; });
    safe = [rel(text, 14), { x: face.x + face.w * 0.2, y: face.y - 10, w: face.w * 0.6, h: face.h * 0.42 }];
    const b = document.querySelector('#filtres'); if (b) safe.push(rel(b, 8));
    champ(fam); canopee();
  }

  /* ---------- Champ en perspective (mis en cache, par famille) ---------- */
  const fieldCache = new Map();
  let fieldA = null, fieldB = null, fieldMix = 1;
  function champ(f) {
    const key = f + CW + 'x' + CH + '@' + dpr; if (fieldCache.has(key)) { fieldB = fieldCache.get(key); poserChamp(); return; }
    const c = document.createElement('canvas'); c.width = Math.round(CW * dpr); c.height = Math.round(CH * dpr);
    const x = c.getContext('2d'); x.setTransform(dpr, 0, 0, dpr, 0, 0);
    const vx = CW * 0.5, hy = horizon, by = CH, rows = mob() ? 12 : 22;
    for (let r = 0; r <= rows; r++) {
      const u = r / rows - 0.5, x0 = vx + u * CW * 2.2;
      for (let s = 0; s < 26; s++) {
        const p = Math.pow(s / 25, 1.7), y = hy + (by - hy) * p, xx = vx + (x0 - vx) * p, sz = 1.5 + p * 11;
        x.globalAlpha = 0.05 + 0.11 * p;
        x.strokeStyle = x.fillStyle = p > 0.5 ? '#2f7d4a' : '#1f5e3a';
        const fam2 = VEG.familles[f].blade;
        x.beginPath();
        if (fam2 === 'feuille' || fam2 === 'coeur' || fam2 === 'rosette') { x.ellipse(xx, y - sz * 0.4, sz * 0.8, sz * 0.45, 0, 0, 6.283); x.fill(); }
        else { x.lineWidth = Math.max(0.6, p * 1.8); x.moveTo(xx - sz * 0.3, y); x.lineTo(xx, y - sz); x.lineTo(xx + sz * 0.3, y); x.stroke(); if (VEG.familles[f].tuteurs && s % 4 === 0) { x.moveTo(xx, y); x.lineTo(xx, y - sz * 1.8); x.stroke(); } }
      }
    }
    // brume d'horizon
    const g = x.createLinearGradient(0, hy - 40, 0, hy + 60); g.addColorStop(0, 'rgba(6,42,28,0)'); g.addColorStop(0.5, 'rgba(10,58,40,.55)'); g.addColorStop(1, 'rgba(6,42,28,0)');
    x.globalAlpha = 1; x.fillStyle = g; x.fillRect(0, hy - 40, CW, 100);
    fieldCache.set(key, c); if (fieldCache.size > 8) fieldCache.delete(fieldCache.keys().next().value);
    fieldB = c; poserChamp();
  }
  function poserChamp() { fdx.setTransform(1, 0, 0, 1, 0, 0); fdx.clearRect(0, 0, field.width, field.height); if (fieldB) fdx.drawImage(fieldB, 0, 0); }

  /* ---------- Herbes vivantes (lots par couleur = « instancing » 2D) ---------- */
  const COLS = ['#0c3f28', '#135a36', '#1c7442', '#3d9a4a', '#8cc63f'];
  let blades = [], fading = [], fam = 'neutre', famT = 0;
  const rnd = (a, b) => a + Math.random() * (b - a);
  function densite(x, y) {
    let d = 0.45 + 0.55 * Math.min(1, Math.abs(x / CW - 0.5) * 2.4);                  // plus dense sur les côtés
    if (rTxt && x > rTxt.x && x < rTxt.x + rTxt.w && y < rTxt.y + rTxt.h + 40) d *= 0.25;  // s'efface sous le texte
    return d;
  }
  function graines(f, reset) {
    const F = VEG.familles[f], n = Math.round(quota() * F.dens), out = [];
    let guard = 0;
    while (out.length < n && guard++ < n * 6) {
      const behind = Math.random() < 0.3 && rVis;                                        // monte derrière le sujet
      const x = behind ? rnd(rVis.x, rVis.x + rVis.w) : rnd(-20, CW + 20);
      const y = behind ? rnd(rVis.y + rVis.h * 0.45, CH) : rnd(bandTop, CH + 6);
      if (Math.random() > densite(x, y)) continue;
      const depth = (y - bandTop) / Math.max(1, CH - bandTop), k = F.blade === 'feuille' ? 2 : F.blade === 'tige' || F.blade === 'botte' ? 1 : 0;
      const sc = (0.55 + 0.45 * Math.max(0, depth)) * (behind ? 1.5 : 1) * (mob() ? 0.8 : 1);
      out.push({ x, y, h: rnd(F.h[0], F.h[1]) * sc, w: rnd(F.w[0], F.w[1]) * sc, k, t: F.blade, col: Math.min(4, Math.floor(Math.max(0, depth) * 3.2 + Math.random() * 1.6)), ph: Math.random() * 6.28, lean: rnd(-0.18, 0.18), rise: reset || reduced ? 1 : 0, dir: rnd(-1, 1) > 0 ? 1 : -1, fruit: F.tuteurs && Math.random() < 0.05 });
    }
    out.sort((a, b) => a.y - b.y);
    return out;
  }
  function changerFamille(f) {
    if (f === fam && blades.length) return;
    fading = blades; fading.forEach(b => b.fall = 0);
    fam = f; famT = 0;
    if (reduced) champ(f);
    else field.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 220, fill: 'forwards' }).onfinish = () => { champ(f); field.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 320, fill: 'forwards' }); };
    blades = graines(f, false);
    if (arrow && !reduced) arrow.animate([{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0 0 0)' }], { duration: 900, easing: 'cubic-bezier(.65,0,.35,1)' });
    if (reduced) { fading = []; dessiner(0); }
  }

  /* ---------- Vent ---------- */
  const NC = 40, wpos = MASS.map(() => new Float32Array(NC)), wvel = MASS.map(() => new Float32Array(NC)), gust = new Float32Array(NC);
  let t = 0, mx = 0, my = 0, pmx = 0, pmy = 0;
  const cellOf = x => Math.max(0, Math.min(NC - 1, Math.floor(x / CW * NC)));
  const breeze = (x, tt) => 0.32 * Math.sin(tt * 0.37 + x * 0.0042) + 0.22 * Math.sin(tt * 0.91 + x * 0.011 + 1.3) + 0.12 * Math.sin(tt * 1.73 + x * 0.021 + 2.1) + 0.12;
  if (!reduced) {
    let lx = 0, ly = 0, lt = 0;
    addEventListener('pointermove', e => {
      const now = performance.now(), c = back.getBoundingClientRect();
      if (fine) { mx = e.clientX / innerWidth * 2 - 1; my = e.clientY / innerHeight * 2 - 1; }
      if (lt && (e.pointerType === 'mouse' || e.buttons)) {
        const dt = Math.max(8, now - lt) / 1000, vx = (e.clientX - lx) / dt, vy = (e.clientY - ly) / dt, x = e.clientX - c.left, y = e.clientY - c.top;
        if (y > -40 && y < CH + 40) for (let i = 0; i < NC; i++) {
          const cx = (i + 0.5) / NC * CW, d = Math.abs(cx - x), f = Math.max(0, 1 - d / 190) * Math.max(0.25, 1 - Math.abs(y - (bandTop + CH) / 2) / CH);
          gust[i] += Math.max(-2200, Math.min(2200, vx + Math.abs(vy) * 0.2 * Math.sign(vx || 1))) * 0.00055 * f * Math.min(1, dt * 60);
        }
      }
      lx = e.clientX; ly = e.clientY; lt = now;
    }, { passive: true });
    let sy = scrollY, st = performance.now();
    addEventListener('scroll', () => {                      // mobile : le défilement souffle
      const now = performance.now(), v = (scrollY - sy) / Math.max(8, now - st) * 1000; sy = scrollY; st = now;
      if (!fine) for (let i = 0; i < NC; i++) gust[i] += Math.max(-1600, Math.min(1600, v)) * 0.00025 * (i % 2 ? 1 : 0.8);
    }, { passive: true });
  }
  function vent(dt) {
    t += dt;
    for (let i = 0; i < NC; i++) {
      gust[i] *= Math.exp(-dt * 2.4); gust[i] = Math.max(-1.6, Math.min(1.6, gust[i]));
      const target = breeze((i + 0.5) / NC * CW, t) + gust[i];
      for (let k = 0; k < 3; k++) { const r = spring(wpos[k][i], wvel[k][i], target, dt, MASS[k], 0.32); wpos[k][i] = r[0]; wvel[k][i] = r[1]; }
    }
    pmx += (mx - pmx) * (1 - Math.exp(-dt * 3)); pmy += (my - pmy) * (1 - Math.exp(-dt * 3));
  }

  /* ---------- Dessin ---------- */
  const paths = COLS.map(() => null);
  function brin(p, b, bend, rise) {
    const h = b.h * rise, lean = b.lean + bend * (b.k === 2 ? 0.55 : b.k === 1 ? 0.8 : 1) * (0.6 + b.h / 90);
    const tx = b.x + Math.sin(lean) * h, ty = b.y - Math.cos(lean) * h, cx = b.x + Math.sin(lean * 0.5) * h * 0.55, cy = b.y - h * 0.55;
    const w = b.w;
    switch (b.t) {
      case 'feuille': case 'coeur': {
        const nx = -(ty - b.y) / (h || 1), ny = (tx - b.x) / (h || 1), mx2 = (b.x + tx) / 2 + nx * w * 0.6, my2 = (b.y + ty) / 2 + ny * w * 0.6, mx3 = (b.x + tx) / 2 - nx * w * 0.6, my3 = (b.y + ty) / 2 - ny * w * 0.6;
        p.moveTo(b.x, b.y); p.quadraticCurveTo(mx2, my2, tx, ty); p.quadraticCurveTo(mx3, my3, b.x, b.y); break;
      }
      case 'rosette':
        for (let j = -2; j <= 2; j++) { const a = lean + j * 0.42, ex = b.x + Math.sin(a) * h, ey = b.y - Math.cos(a) * h * 0.8; p.moveTo(b.x - w / 2, b.y); p.quadraticCurveTo(b.x + Math.sin(a) * h * 0.5, b.y - h * 0.45, ex, ey); p.lineTo(b.x + w / 2, b.y); }
        break;
      default:
        p.moveTo(b.x - w / 2, b.y); p.quadraticCurveTo(cx - w * 0.2, cy, tx, ty); p.quadraticCurveTo(cx + w * 0.2, cy, b.x + w / 2, b.y);
    }
  }
  function dessiner(dt) {
    const c = bx; c.setTransform(dpr, 0, 0, dpr, 0, -gy0 * dpr); c.clearRect(0, gy0, CW, CH - gy0);
    if (!reduced) { const ox = Math.round(-pmx * 5), oy = Math.round(-pmy * 3); if (ox !== field._ox || oy !== field._oy) { field._ox = ox; field._oy = oy; field.style.transform = `translate3d(${ox}px,${oy}px,0)`; } }
    // herbes (plan milieu, parallaxe moyenne)
    c.save(); c.translate(reduced ? 0 : -pmx * 8, reduced ? 0 : -pmy * 4);
    for (let i = 0; i < COLS.length; i++) paths[i] = new Path2D();
    const stakes = new Path2D(), fruits = new Path2D();
    const draw = (b, rise, fall) => {
      const bend = wpos[b.k][cellOf(b.x)] * 0.55 + Math.sin(t * 2.2 + b.ph) * 0.03 + fall * b.dir * 1.5;
      brin(paths[b.col], b, bend, rise * (1 - fall * 0.6));
      if (b.fruit) { stakes.moveTo(b.x + 3, b.y); stakes.lineTo(b.x + 3, b.y - b.h * 1.3 * rise); fruits.moveTo(b.x + 7, b.y - b.h * 0.7); fruits.arc(b.x + 6, b.y - b.h * 0.7 * rise, 2.6, 0, 6.283); }
    };
    fading.forEach(b => draw(b, 1, b.fall));
    blades.forEach(b => draw(b, b.rise, 0));
    COLS.forEach((col, i) => { c.fillStyle = col; c.globalAlpha = 0.5 + i * 0.1; c.fill(paths[i]); });
    c.globalAlpha = 0.5; c.strokeStyle = '#6b5a3c'; c.lineWidth = 1; c.stroke(stakes); c.fillStyle = '#c8202e'; c.globalAlpha = 0.65; c.fill(fruits);
    c.restore(); c.globalAlpha = 1;
    // canopée (plan avant, flou, parallaxe forte, hors zones de lecture)
    const f = fx; f.setTransform(dpr, 0, 0, dpr, 0, 0); f.clearRect(0, 0, CW, FH);
    if (leaves.length) {
      f.save(); f.beginPath(); f.rect(0, 0, CW, FH); safe.forEach(r => f.rect(r.x, r.y, r.w, r.h)); f.clip('evenodd');
      const px = reduced ? 0 : pmx * 10, py = reduced ? 0 : pmy * 5;
      leaves.forEach(l => {
        const sway = wpos[2][cellOf(l.x)] * 0.12 + Math.sin(t * 0.6 + l.ph) * 0.02;
        f.save(); f.translate(l.x + px, l.y + py); f.rotate(l.a + sway); f.drawImage(l.img, -l.img.width / dpr * 0.5, 0, l.img.width / dpr, l.img.height / dpr); f.restore();
      });
      f.restore();
    }
    // pastilles : léger décalage dans le vent (2-4 px)
    if (!reduced && grid.classList.contains('is-in')) chips.forEach(ch => { const x = ch._x ?? (ch._x = rel(ch).x); ch.style.marginLeft = (Math.max(-1, Math.min(1, wpos[1][cellOf(x)] - 0.12)) * 3).toFixed(2) + 'px'; });
  }

  /* ---------- Canopée : feuilles de plantain pré-dessinées et floutées une fois ---------- */
  let leaves = [];
  function feuille(len, wid, tint) {
    const c = document.createElement('canvas'), pad = 12; c.width = Math.round((wid * 2 + pad * 2) * dpr); c.height = Math.round((len + pad * 2) * dpr);
    const x = c.getContext('2d'); x.setTransform(dpr, 0, 0, dpr, 0, 0); x.translate(wid + pad, pad);
    x.filter = 'blur(2.5px)';
    const g = x.createLinearGradient(-wid, 0, wid, 0); g.addColorStop(0, '#031c11'); g.addColorStop(0.5, tint); g.addColorStop(1, '#021409');
    x.fillStyle = g; x.beginPath(); x.moveTo(0, 0); x.bezierCurveTo(wid * 1.1, len * 0.18, wid * 0.9, len * 0.8, 0, len); x.bezierCurveTo(-wid * 0.9, len * 0.8, -wid * 1.1, len * 0.18, 0, 0); x.fill();
    x.strokeStyle = 'rgba(0,0,0,.35)'; x.lineWidth = 2; x.beginPath(); x.moveTo(0, 0); x.lineTo(0, len); x.stroke();
    x.strokeStyle = 'rgba(0,0,0,.25)'; x.lineWidth = 1;
    for (let i = 1; i < 12; i++) { const y = len * i / 12; x.beginPath(); x.moveTo(0, y); x.lineTo(wid * 0.85, y + len * 0.06); x.moveTo(0, y); x.lineTo(-wid * 0.85, y + len * 0.06); x.stroke(); }
    return c;
  }
  function canopee() {
    leaves = [];
    const s = mob() ? 0.55 : tab() ? 0.75 : 1;
    leaves.push({ x: CW - 30 * s, y: -20, a: 0.55, ph: 0, img: feuille(300 * s, 58 * s, '#0b3a24') });
    leaves.push({ x: CW - 110 * s, y: -30, a: 0.25, ph: 1.4, img: feuille(230 * s, 46 * s, '#0e4630') });
    if (!mob()) leaves.push({ x: 20 * s, y: -30, a: -0.5, ph: 2.1, img: feuille(210 * s, 44 * s, '#0b3a24') });
  }

  /* ---------- Boucle ---------- */
  function frame(dt) {
    vent(dt);
    famT += dt;
    const k = Math.min(1, famT / 0.5);
    blades.forEach(b => { if (b.rise < 1) b.rise = Math.min(1, b.rise + dt / 0.5); });
    fading.forEach(b => { b.fall = Math.min(1, (b.fall || 0) + dt / 0.45); });
    if (k >= 1 && fading.length && fading[0].fall >= 1) fading = [];
    dessiner(dt);
    perf(dt);
  }
  let acc = 0, n = 0, verdict = 0, loop = null, base = 60;
  function perf(dt) {                                       // appareil faible : qualité réduite, puis statique
    acc += dt; n++;
    if (acc < 1) return;
    const fps = n / acc; acc = 0; n = 0;
    // on ne se dégrade que si NOTRE animation fait chuter la cadence par rapport à la page seule
    if (fps < Math.min(38, base * 0.8) && verdict === 0) { verdict = 1; quality = 0.5; blades = graines(fam, true); }
    else if (fps < Math.min(24, base * 0.55) && verdict === 1) { verdict = 2; loop && loop.stop(); dessiner(0); grid.classList.add('gh--static'); }
  }

  /* ---------- Collection active (filtres) ---------- */
  function catActive() { const b = document.querySelector('#filtres .filter[aria-pressed="true"]'); return b ? b.dataset.cat : 'tout'; }
  const bar = document.getElementById('filtres');
  if (bar) new MutationObserver(() => { const f = VEG.famille(catActive()); if (f !== fam) { changerFamille(f); if (reduced || !loop) dessiner(0); } }).observe(bar, { attributes: true, subtree: true, attributeFilter: ['aria-pressed'] });

  function demarrer() {
    fam = VEG.famille(catActive());
    taille(); blades = graines(fam, true);
    new ResizeObserver(() => { taille(); blades = graines(fam, true); if (reduced || !loop) dessiner(0); }).observe(grid);
    grid.classList.add('gh--on');
    if (reduced || !window.IVT_GL) { vent(0.016); dessiner(0); return; }
    for (let i = 0; i < 30; i++) vent(1 / 60);
    dessiner(0);
    let k = 0; const t0 = performance.now();                 // cadence de la page seule (référence)
    const mes = () => { if (++k < 30) return requestAnimationFrame(mes); base = 30 / ((performance.now() - t0) / 1000); loop = IVT_GL.loop(grid, frame); };
    requestAnimationFrame(mes);
  }
  const go = () => (window.requestIdleCallback || setTimeout)(demarrer, { timeout: 900 });
  if (document.readyState === 'complete') go(); else addEventListener('load', go, { once: true });   // après le LCP
})();
