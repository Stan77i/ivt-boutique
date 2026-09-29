/* IVT — Tendance prix · scène « lampe centrale »
   · IVT_MOTION : UN ressort partagé (pendule, bascule, touches ; masse et amortissement ajustés).
   · IVT_STORE  : état unique partagé calculatrice ⇄ tableau de bord (événements ivt:calc / ivt:semaine).
   · Scène      : pendule (Canvas 2D), interrupteur mural, cône CSS, lumière publiée en variables CSS,
                  parallaxe légère. UNE boucle rAF (IVT_GL.loop : pause hors écran / onglet caché). */
window.IVT_MOTION = {
  W: 20,
  spring(x, v, target, dt, mass, zeta, extra = 0) {
    const w = this.W / Math.sqrt(mass), n = Math.min(24, Math.max(1, Math.ceil(dt * w / 0.2))), h = dt / n;
    for (let i = 0; i < n; i++) { v += (-w * w * (x - target) - 2 * zeta * w * v + extra) * h; x += v * h; }   // Euler semi-implicite, pas ≤ 0,2/ω
    return [x, v];
  }
};

window.IVT_STORE = (() => {
  const I = window.IVT_INDICE, L = I ? I.L : 0;
  const s = { slug: null, semaine: null, preview: null, qte: '', unite: 'colis', mode: 'marche', lot: null };
  function set(patch, src) {
    const w0 = s.preview ?? s.semaine;
    Object.assign(s, patch);
    document.dispatchEvent(new CustomEvent('ivt:calc', { detail: { patch, src } }));
    if ((s.preview ?? s.semaine) !== w0) document.dispatchEvent(new CustomEvent('ivt:semaine', { detail: { src } }));
  }
  return { get: () => s, set, semaine: () => s.preview ?? s.semaine ?? L, L };
})();

/* Sons synthétisés (Web Audio, aucun fichier) : déclenchés uniquement par une action de l'utilisateur */
window.IVT_SOUND = (() => {
  let ctx = null, noise = null, muted = false;
  try { muted = localStorage.getItem('ivt_son') === '0'; } catch (e) {}
  const ac = () => {
    if (muted) return null;
    if (!ctx) { const C = window.AudioContext || window.webkitAudioContext; if (!C) return null; ctx = new C();
      noise = ctx.createBuffer(1, ctx.sampleRate * 0.2, ctx.sampleRate); const d = noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  };
  function burst(c, t, f, q, dur, gain) {
    const src = c.createBufferSource(), bp = c.createBiquadFilter(), g = c.createGain();
    src.buffer = noise; bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = q;
    g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(bp).connect(g).connect(c.destination); src.start(t); src.stop(t + dur + 0.02);
  }
  function thump(c, t, f, dur, gain) {
    const o = c.createOscillator(), g = c.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 0.5, t + dur);
    g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(c.destination); o.start(t); o.stop(t + dur + 0.02);
  }
  function play(type) {
    const c = ac(); if (!c) return; const t = c.currentTime + 0.002;
    if (type === 'key') { burst(c, t, 3200, 1.4, 0.035, 0.22); thump(c, t, 180, 0.04, 0.12); }
    else if (type === 'eq') { burst(c, t, 2600, 1.2, 0.04, 0.26); thump(c, t, 150, 0.06, 0.16); }
    else if (type === 'on' || type === 'off') {
      burst(c, t, 1900, 2.2, 0.035, 0.55); thump(c, t, type === 'on' ? 130 : 90, 0.09, 0.4); burst(c, t + 0.03, 950, 3, 0.06, 0.3);
      if (type === 'on') {   // filament qui s'allume : petit « tink » + ronron bref
        const o = c.createOscillator(), g = c.createGain(); o.type = 'sine'; o.frequency.value = 2350;
        g.gain.setValueAtTime(0.0001, t + 0.05); g.gain.exponentialRampToValueAtTime(0.07, t + 0.06); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
        o.connect(g).connect(c.destination); o.start(t + 0.05); o.stop(t + 0.32);
        const hm = c.createOscillator(), hg = c.createGain(); hm.type = 'sine'; hm.frequency.value = 100;
        hg.gain.setValueAtTime(0.0001, t); hg.gain.exponentialRampToValueAtTime(0.035, t + 0.08); hg.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
        hm.connect(hg).connect(c.destination); hm.start(t); hm.stop(t + 0.52);
      }
    }
  }
  function print(dur) {       // imprimante thermique : cliquetis réguliers + moteur, calés sur l'animation du papier
    const c = ac(); if (!c) return; const t = c.currentTime + 0.002;
    for (let x = 0; x < dur; x += 0.036) burst(c, t + x, 4600, 3, 0.012, 0.09);
    const m = c.createOscillator(), lp = c.createBiquadFilter(), g = c.createGain();
    m.type = 'sawtooth'; m.frequency.value = 86; lp.type = 'lowpass'; lp.frequency.value = 420;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.06, t + 0.03); g.gain.setValueAtTime(0.06, t + Math.max(0.04, dur - 0.04)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    m.connect(lp).connect(g).connect(c.destination); m.start(t); m.stop(t + dur + 0.02);
  }
  function tear() {
    const c = ac(); if (!c) return; const t = c.currentTime + 0.002;
    const src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    src.buffer = noise; f.type = 'bandpass'; f.Q.value = 0.9; f.frequency.setValueAtTime(1200, t); f.frequency.exponentialRampToValueAtTime(5200, t + 0.16);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.3, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    src.connect(f).connect(g).connect(c.destination); src.start(t); src.stop(t + 0.2);
  }
  return { play, print, tear, get muted() { return muted; }, setMuted(v) { muted = v; try { localStorage.setItem('ivt_son', v ? '0' : '1'); } catch (e) {} } };
})();

(() => {
  const sec = document.getElementById('scene');
  if (!sec) return;
  const M = window.IVT_MOTION, reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const cv = sec.querySelector('.lh__lamp'), ctx = cv.getContext('2d'), sw = sec.querySelector('.lh__switch');
  const desk = sec.querySelector('.lh__desk'), intro = sec.querySelector('.lh__intro');
  const lit = [...sec.querySelectorAll('[data-lit]')], devs = [...sec.querySelectorAll('[data-device]')];
  const hooks = [];
  window.IVT_SCENE = { onFrame: f => hooks.push(f), kick: () => loop && loop.kick(), reduced };

  /* Allumage */
  let on = true;
  try { on = localStorage.getItem('ivt_lampe') !== '0'; } catch (e) {}
  let lv = on ? 1 : 0, rock = on ? 1 : -1, rockV = 0;
  function setOn(v) {
    on = v; sw.setAttribute('aria-checked', String(on)); sec.classList.toggle('is-off', !on);
    try { localStorage.setItem('ivt_lampe', on ? '1' : '0'); } catch (e) {}
    if (reduced) { lv = on ? 1 : 0; rock = on ? 1 : -1; publier(true); dessiner(); }
    window.IVT_SCENE.kick();
  }
  sw.setAttribute('aria-checked', String(on)); sec.classList.toggle('is-off', !on);
  const snd = sec.querySelector('.lh__sound');
  if (snd && window.IVT_SOUND) { snd.setAttribute('aria-pressed', String(!IVT_SOUND.muted)); snd.addEventListener('click', () => { IVT_SOUND.setMuted(!IVT_SOUND.muted); snd.setAttribute('aria-pressed', String(!IVT_SOUND.muted)); IVT_SOUND.play('key'); }); }
  sw.addEventListener('click', () => { setOn(!on); window.IVT_SOUND && IVT_SOUND.play(on ? 'on' : 'off'); });

  /* Géométrie */
  let CW = 360, CH = 124, HH = 0, dpr = 1, S = 1, ax = 180, Lr = 26, mouth = 68, secW = 1, hdr = 0, boxes = [], litBox = [];
  function taille() {
    secW = sec.clientWidth;
    S = secW < 640 ? 0.78 : 1;
    CW = Math.round(360 * S); HH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) || 78; CH = Math.round(HH + 190 * S);
    dpr = Math.min(2, devicePixelRatio || 1);
    cv.style.width = CW + 'px'; cv.style.height = CH + 'px'; cv.style.marginLeft = (-CW / 2) + 'px';
    cv.width = CW * dpr; cv.height = CH * dpr;
    ax = CW / 2; Lr = HH + 10 * S; mouth = Lr + 42 * S;
    hdr = cv.getBoundingClientRect().top - sec.getBoundingClientRect().top;
    sec.style.setProperty('--mouth', mouth.toFixed(1) + 'px'); sec.style.setProperty('--hh', HH + 'px');
    const sr = sec.getBoundingClientRect();
    boxes = devs.map(d => { const r = d.getBoundingClientRect(); return { d, l: r.left - sr.left, t: r.top - sr.top, w: r.width }; });
    litBox = lit.map(e => { const r = e.getBoundingClientRect(); return { e, l: r.left - sr.left }; });
    publier(true); dessiner();
  }

  /* Pendule */
  let th = 0, thv = 0, t = 0, drag = null, mx = 0, my = 0, pmx = 0, pmy = 0;
  const toCv = (cx, cy) => { const r = cv.getBoundingClientRect(); return [cx - r.left, cy - r.top]; };
  const shadeC = () => [ax + Math.sin(th) * (Lr + 22 * S), Math.cos(th) * (Lr + 22 * S)];
  if (!reduced) {
    let lx = 0, lt = 0;
    sec.addEventListener('pointermove', e => {
      const now = performance.now();
      if (fine) { const r = sec.getBoundingClientRect(); mx = (e.clientX - r.left) / r.width * 2 - 1; my = (e.clientY - r.top) / r.height * 2 - 1; }
      if (e.pointerType === 'mouse' && lt && !drag) {
        const [x, y] = toCv(e.clientX, e.clientY), [sx, sy] = shadeC(), d = Math.hypot(x - sx, y - sy);
        if (d < 150 * S) { const vx = (e.clientX - lx) / Math.max(8, now - lt) * 1000; thv += Math.max(-1600, Math.min(1600, vx)) * 0.0011 * Math.min(0.05, (now - lt) / 1000) * (1 - d / (150 * S)); window.IVT_SCENE.kick(); }
        sec.classList.toggle('is-grab', d < 48 * S);
      }
      lx = e.clientX; lt = now;
      if (drag) { const [x, y] = toCv(e.clientX, e.clientY); drag.th = Math.max(-0.9, Math.min(0.9, Math.atan2(x - ax, Math.max(24, y)))); }
    }, { passive: true });
    sec.addEventListener('pointerleave', () => { mx = my = 0; });
    sec.addEventListener('pointerdown', e => {
      if (e.target.closest('button, a, select, .calc, .db')) return;
      const [x, y] = toCv(e.clientX, e.clientY), [sx, sy] = shadeC();
      if (Math.hypot(x - sx, y - sy) > 56 * S) return;
      drag = { th }; sec.setPointerCapture(e.pointerId); sec.classList.add('is-drag'); e.preventDefault(); window.IVT_SCENE.kick();
    });
    const fin = () => { if (!drag) return; drag = null; sec.classList.remove('is-drag'); };
    sec.addEventListener('pointerup', fin); sec.addEventListener('pointercancel', fin);
  }
  function sim(dt) {
    const n = 2, h = dt / n;
    for (let k = 0; k < n; k++) {
      t += h;
      const breeze = (0.9 * Math.sin(t * 0.8) + 0.45 * Math.sin(t * 1.7 + 1) + 0.2 * Math.sin(t * 2.9 + 2)) * 0.21;
      if (drag) [th, thv] = M.spring(th, thv, drag.th, h, 1, 1);
      else [th, thv] = M.spring(th, thv, 0, h, 45, 0.035, breeze);
      [rock, rockV] = M.spring(rock, rockV, on ? 1 : -1, h, 0.25, 0.7);
      lv += ((on ? 1 : 0) - lv) * (1 - Math.exp(-h * 9));        // ~350 ms
    }
    pmx += (mx - pmx) * (1 - Math.exp(-dt * 4)); pmy += (my - pmy) * (1 - Math.exp(-dt * 4));
  }

  /* Dessin de la lampe (abat-jour émaillé vert IVT) */
  let holes = [], holesT = 0;
  function trous() {
    const hd = document.querySelector('.site-header'); holes = [];
    if (!hd || hd.classList.contains('is-hidden')) return;
    const cr = cv.getBoundingClientRect();
    hd.querySelectorAll('.brand, .nav a, .header-actions > *, #pdmBadge').forEach(e => { const r = e.getBoundingClientRect(); if (!r.width) return; const x = r.left - cr.left - 8, y = r.top - cr.top - 6; if (x > CW || x + r.width + 16 < 0 || y > CH) return; holes.push([x, y, r.width + 16, r.height + 12]); });
  }
  function dessiner() {
    if (--holesT <= 0) { trous(); holesT = 20; }
    const c = ctx; c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, CW, CH);
    c.save(); c.translate(ax, 0); c.rotate(-th);
    if (lv > 0.01) {   // halo autour de l'ampoule
      const g = c.createRadialGradient(0, mouth + 4 * S, 0, 0, mouth + 4 * S, 90 * S);
      g.addColorStop(0, `rgba(255,214,150,${0.42 * lv})`); g.addColorStop(1, 'rgba(255,214,150,0)');
      c.fillStyle = g; c.beginPath(); c.arc(0, mouth + 4 * S, 90 * S, 0, 6.283); c.fill();
    }
    c.save();                                 // le fil passe derrière l'en-tête sans toucher logo / liens / icônes
    if (holes.length) { c.setTransform(dpr, 0, 0, dpr, 0, 0); c.beginPath(); c.rect(0, 0, CW, CH); holes.forEach(r => c.rect(r[0], r[1], r[2], r[3])); c.clip('evenodd'); c.translate(ax, 0); c.rotate(-th); }
    c.strokeStyle = 'rgba(190,205,196,.75)'; c.lineWidth = 1.3; c.beginPath(); c.moveTo(0, 0); c.lineTo(0, Lr); c.stroke();
    c.restore();
    c.fillStyle = '#26302b'; c.fillRect(-6 * S, Lr - 2, 12 * S, 12 * S);
    const y0 = Lr + 9 * S, R = 58 * S;
    const ge = c.createLinearGradient(-R, 0, R, 0);
    ge.addColorStop(0, '#06301c'); ge.addColorStop(0.32, '#0f6a43'); ge.addColorStop(0.46, '#3b9a6a'); ge.addColorStop(0.6, '#0f6a43'); ge.addColorStop(1, '#052815');
    c.fillStyle = ge; c.beginPath(); c.moveTo(-10 * S, y0);
    c.bezierCurveTo(-R * 0.62, y0 + 2 * S, -R, mouth - 20 * S, -R, mouth);
    c.lineTo(R, mouth); c.bezierCurveTo(R, mouth - 20 * S, R * 0.62, y0 + 2 * S, 10 * S, y0); c.closePath(); c.fill();
    // lèvre : intérieur crème, bord blanc
    c.fillStyle = lv > 0.5 ? `rgba(255,${Math.round(222 + 20 * lv)},${Math.round(170 + 30 * lv)},1)` : '#cfc8b4';
    c.beginPath(); c.ellipse(0, mouth, R - 1, 6 * S, 0, 0, 6.283); c.fill();
    c.strokeStyle = '#eef3ef'; c.lineWidth = 1.6 * S; c.beginPath(); c.ellipse(0, mouth, R, 6.4 * S, 0, 0, 6.283); c.stroke();
    // ampoule visible
    const bx = 0, by = mouth + 8 * S, br = 11 * S;
    const gb = c.createRadialGradient(bx - 3 * S, by - 3 * S, 1, bx, by, br);
    if (lv > 0.05) { gb.addColorStop(0, `rgba(255,252,236,${0.6 + 0.4 * lv})`); gb.addColorStop(0.6, `rgba(255,215,140,${0.5 + 0.5 * lv})`); gb.addColorStop(1, `rgba(230,160,70,${0.4 + 0.5 * lv})`); }
    else { gb.addColorStop(0, 'rgba(230,228,220,.9)'); gb.addColorStop(1, 'rgba(150,146,136,.9)'); }
    c.fillStyle = gb; c.beginPath(); c.arc(bx, by, br, 0, 6.283); c.fill();
    c.restore();
  }

  /* Petits insectes attirés par l'ampoule */
  const bugs = Array.from({ length: fine ? 6 : 3 }, (_, i) => ({ ph: Math.random() * 6.28, sp: (0.9 + Math.random() * 0.9) * (i % 2 ? 1 : -1), rx: 26 + Math.random() * 44, ry: 10 + Math.random() * 12, w: Math.random() * 6.28, f: 0.6 + Math.random() * 0.8 }));
  function insectes() {
    if (lv < 0.02 || reduced) return;
    const c = ctx, bx = ax + Math.sin(th) * (mouth + 8 * S), by = Math.cos(th) * (mouth + 8 * S);
    bugs.forEach(b => {
      const a = b.ph + t * b.sp, n = Math.sin(t * 1.7 * b.f + b.w) * 0.35;
      const x = bx + Math.cos(a) * b.rx * S * (1 + n * 0.4), y = Math.min(by + 22 * S, by - 14 * S + Math.sin(a * 1.3 + b.w) * b.ry * S + Math.sin(t * 5 * b.f + b.w) * 3 * S);
      const al = lv * (0.55 + 0.35 * Math.sin(t * 9 * b.f + b.w)), fl = Math.abs(Math.sin(t * 38 * b.f + b.w));
      c.fillStyle = `rgba(255,236,200,${(al * 0.5).toFixed(3)})`;
      c.beginPath(); c.ellipse(x - 1.6 * S, y - 0.4, 1.8 * S * fl + 0.4, 0.9 * S, -0.5, 0, 6.283); c.ellipse(x + 1.6 * S, y - 0.4, 1.8 * S * fl + 0.4, 0.9 * S, 0.5, 0, 6.283); c.fill();
      c.fillStyle = `rgba(40,34,22,${(al * 0.9).toFixed(3)})`; c.beginPath(); c.arc(x, y, 1.1 * S, 0, 6.283); c.fill();
    });
  }

  /* Publication des variables CSS (même image que le pendule) */
  const last = new Map();
  const put = (el, k, v, eps) => { const key = el === sec ? k : el; const m = last.get(key) || {}; if (m[k] != null && Math.abs(m[k] - v) < eps) return; m[k] = v; last.set(key, m); el.style.setProperty(k, k.endsWith('on') ? v.toFixed(3) : k === '--lamp-angle' ? v.toFixed(2) + 'deg' : v.toFixed(1) + 'px'); };
  function publier(force) {
    const lampX = secW / 2 + Math.sin(th) * mouth;
    put(sec, '--lamp-angle', -th * 57.2958, force ? -1 : 0.05);
    put(sec, '--lamp-on', lv, force ? -1 : 0.004);
    boxes.forEach(b => {
      const hit = secW / 2 + Math.tan(th) * (b.t - hdr);                   // point du faisceau au niveau du haut de l'appareil
      put(b.d, '--hx', hit - b.l, force ? -1 : 0.5);
      put(b.d, '--sx', Math.max(-26, Math.min(26, (b.l + b.w / 2 - hit) * 0.045)), force ? -1 : 0.2);
      put(b.d, '--dev-on', lv, force ? -1 : 0.004);
    });
    litBox.forEach(b => put(b.e, '--tx', lampX - b.l, force ? -1 : 0.5));
    sw.style.setProperty('--rock', rock.toFixed(3));
    sw.style.setProperty('--led', on ? 1 : 0);
  }

  let loop = null;
  new ResizeObserver(taille).observe(sec);
  addEventListener('load', taille, { once: true });
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(taille);
  taille();
  if (reduced || !window.IVT_GL) { publier(true); dessiner(); return; }
  for (let i = 0; i < 60; i++) sim(1 / 60);
  loop = IVT_GL.loop(sec, dt => { sim(dt); dessiner(); insectes(); publier(false); hooks.forEach(f => f(dt)); });
})();
