/* IVT — socle WebGL partagé (hors Accueil).
   Chargement paresseux de Three.js, niveau de qualité, boucle qui s'arrête hors écran,
   régulation du DPR selon le temps de rendu. Aucune logique métier : tout passe par IVT_APP. */
window.IVT_GL = (() => {
  const THREE_URL = 'https://unpkg.com/three@0.160.0/build/three.module.js'; // même version que l'Accueil : un seul téléchargement en cache
  let p3 = null;
  const mq = q => matchMedia(q).matches;
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
  const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));

  const three = () => p3 || (p3 = import(THREE_URL));
  const reduced = () => mq('(prefers-reduced-motion: reduce)');
  const coarse = () => mq('(pointer: coarse)') || mq('(max-width: 720px)');
  function supports() {
    try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; }
  }
  // 0 = téléphone modeste / économie de données · 1 = mobile correct · 2 = ordinateur
  function tier() {
    const cores = navigator.hardwareConcurrency || 4, mem = navigator.deviceMemory || 4;
    const save = navigator.connection && navigator.connection.saveData;
    if (save || cores <= 2 || mem <= 2) return 0;
    if (coarse()) return cores >= 6 && mem >= 4 ? 1 : 0;
    return 2;
  }
  // Appelle cb une fois quand el approche du viewport.
  function whenNear(el, cb, margin = '700px 0px') {
    if (!('IntersectionObserver' in window)) { cb(); return; }
    const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { io.disconnect(); cb(); } }, { rootMargin: margin });
    io.observe(el);
  }
  // Boucle de rendu active seulement si el est visible et l'onglet affiché.
  function loop(el, frame) {
    let vis = false, raf = 0, last = 0, dead = false;
    const io = new IntersectionObserver(es => { vis = es[es.length - 1].isIntersecting; kick(); }, { rootMargin: '80px 0px' });
    io.observe(el);
    const onVis = () => kick();
    document.addEventListener('visibilitychange', onVis);
    function kick() { if (!dead && vis && !document.hidden && !raf) { last = performance.now(); raf = requestAnimationFrame(tick); } }
    function tick(now) {
      raf = 0; if (dead || !vis || document.hidden) return;
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      frame(dt, now / 1000);
      raf = requestAnimationFrame(tick);
    }
    return { kick, get visible() { return vis; }, stop() { dead = true; cancelAnimationFrame(raf); io.disconnect(); document.removeEventListener('visibilitychange', onVis); } };
  }
  // Ajuste le DPR par paliers de 0,25 selon la moyenne des images (cible ~55 i/s).
  function governor(min, max, apply) {
    let dpr = max, acc = 0, n = 0, good = 0;
    apply(dpr);
    return dt => {
      acc += dt; n++;
      if (n < 60) return;
      const avg = acc / n; acc = 0; n = 0;
      if (avg > 1 / 44 && dpr > min) { dpr = Math.max(min, dpr - 0.25); good = 0; apply(dpr); }
      else if (avg < 1 / 57 && dpr < max && ++good >= 4) { dpr = Math.min(max, dpr + 0.25); good = 0; apply(dpr); }
    };
  }
  const NOISE = `
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),u.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x),u.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=a*noise(p);p*=2.03;a*=.5;}return v;}`;
  // Couleurs de la charte (ivt.css :root) en RGB 0–1
  const C = {
    bg: [0.024, 0.165, 0.110], bgDeep: [0.016, 0.125, 0.082], surface2: [0.055, 0.275, 0.200],
    green: [0.0, 0.588, 0.251], greenLight: [0.549, 0.776, 0.247], ink: [0.949, 0.969, 0.957], redLight: [0.902, 0.224, 0.275]
  };
  const v3 = a => `vec3(${a.map(x => x.toFixed(3)).join(',')})`;
  return { three, reduced, coarse, supports, tier, whenNear, loop, governor, clamp, sstep, damp, NOISE, C, v3 };
})();
