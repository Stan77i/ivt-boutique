/* IVT — Boutique · couche d'expérience (au-dessus de l'existant, sans logique métier).
   · Les images produits ne sont JAMAIS traitées par un shader : la profondeur est créée autour d'elles.
   · Filtres / recherche / tri : transition FLIP. Le rendu reste celui de rendre() ; on photographie
     la grille juste avant (écoute en capture) et on anime l'écart juste après (MutationObserver).
   · Ajout panier : écoute du clic + 'ivt:panier' → trajectoire lumineuse vers le panier de l'en-tête.
   · WebGL : UNE couche partagée derrière la grille (graines en suspension, lumière au sol sous
     les cartes visibles, influence du curseur, souffle au changement de filtre, onde à l'ajout). */
(() => {
  const A = typeof IVT_APP !== 'undefined' ? IVT_APP : null, GL = window.IVT_GL;
  const grille = document.getElementById('grille');
  if (!A || !grille) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const section = grille.closest('section') || grille.parentElement, wrap = grille.parentElement;
  section.classList.add('bf-host'); wrap.classList.add('bf-wrap');
  const EASE = 'cubic-bezier(.2,.7,.1,1)';
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  const slugOf = c => { const b = c.querySelector('[data-ajout-slug]'); return b ? b.dataset.ajoutSlug : null; };
  const cards = () => [...grille.querySelectorAll(':scope > .etal')];
  const fx = { gust() {}, burst() {}, cards() {} };

  /* ---------- 1 · Réorganisation du catalogue (FLIP) ---------- */
  const ghosts = document.createElement('div');
  ghosts.className = 'bf-ghosts'; ghosts.setAttribute('aria-hidden', 'true'); ghosts.inert = true;
  wrap.appendChild(ghosts);
  let snap = null;
  function prendre() {
    ghosts.textContent = '';
    const w = wrap.getBoundingClientRect(), vh = innerHeight;
    snap = new Map();
    cards().forEach(c => {
      c.getAnimations().forEach(a => a.cancel());
      const r = c.getBoundingClientRect();
      snap.set(slugOf(c), { el: c, r, vis: r.bottom > -40 && r.top < vh + 40, x: r.left - w.left, y: r.top - w.top });
    });
  }
  document.addEventListener('click', e => { if (e.target.closest && e.target.closest('#filtres .filter')) prendre(); }, true);
  document.addEventListener('input', e => { if (e.target.id === 'recherche') prendre(); }, true);
  document.addEventListener('change', e => { if (e.target.id === 'tri') prendre(); }, true);

  const still = c => { c.classList.add('bf-still', 'is-in'); requestAnimationFrame(() => requestAnimationFrame(() => c.classList.remove('bf-still'))); };
  function flip(s) {
    const vh = innerHeight, seen = new Set(); let k = 0;
    fx.gust();
    cards().forEach(c => {
      const slug = slugOf(c), o = s.get(slug), r = c.getBoundingClientRect(), vis = r.bottom > -40 && r.top < vh + 40;
      if (o) seen.add(slug);
      if (!vis && !(o && o.vis)) return;                        // hors écran : l'apparition existante s'en charge
      still(c);
      if (o && o.vis) {
        const dx = o.r.left - r.left, dy = o.r.top - r.top;
        if (Math.abs(dx) + Math.abs(dy) > 1) c.animate([{ transform: `translate3d(${dx}px,${dy}px,0)` }, { transform: 'none' }], { duration: 640, easing: EASE });
      } else {
        c.animate([{ opacity: 0, transform: 'translate3d(0,22px,0) scale(.965)' }, { opacity: 1, transform: 'none' }],
          { duration: 580, delay: 110 + Math.min(k++, 8) * 45, easing: EASE, fill: 'backwards' });
      }
    });
    s.forEach((o, slug) => {
      if (seen.has(slug) || !o.vis) return;
      const g = o.el; g.classList.add('bf-ghost', 'bf-still', 'is-in');
      Object.assign(g.style, { left: o.x + 'px', top: o.y + 'px', width: o.r.width + 'px', height: o.r.height + 'px' });
      ghosts.appendChild(g);
      g.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translate3d(0,-12px,0) scale(.96)' }],
        { duration: 380, easing: 'cubic-bezier(.4,0,.6,1)', fill: 'forwards' }).onfinish = () => g.remove();
      setTimeout(() => g.remove(), 700);
    });
  }
  new MutationObserver(() => {
    if (snap) { const s = snap; snap = null; flip(s); }
    setupPar(); fx.cards();
  }).observe(grille, { childList: true });

  /* ---------- 2 · Plans : le visuel glisse légèrement par rapport au texte (bureau) ---------- */
  let par = [], praf = 0;
  function setupPar() {
    par.forEach(p => { p.st.style.transform = ''; });
    par = [];
    if (!fine.matches || innerWidth < 900) return;
    const cs = cards(), cols = [...new Set(cs.map(c => Math.round(c.offsetLeft)))].sort((a, b) => a - b);
    const D = [1, -0.55, 0.8, -0.4, 0.6];
    par = cs.map(c => ({ c, st: c.querySelector('.etal__stage'), d: D[cols.indexOf(Math.round(c.offsetLeft)) % D.length] || 0, y: 0 }));
    parTick();
  }
  function parTick() {
    praf = 0; const vh = innerHeight;
    par.forEach(p => {
      const r = p.c.getBoundingClientRect(); if (r.bottom < -120 || r.top > vh + 120 || !p.st) return;
      const y = Math.round(-(((r.top + r.height / 2) - vh / 2) / vh) * 9 * p.d);
      if (y !== p.y) { p.y = y; p.st.style.transform = y ? `translate3d(0,${y}px,0)` : ''; }
    });
  }
  addEventListener('scroll', () => { if (par.length && !praf) praf = requestAnimationFrame(parTick); }, { passive: true });
  addEventListener('resize', () => setupPar());
  setupPar();

  /* ---------- 3 · Produit → panier ---------- */
  const qteDe = slug => { const l = A.lignesPanier().find(x => x.produit.slug === slug); return l ? l.qte : 0; };
  let attente = null;
  document.addEventListener('click', e => {
    const b = e.target.closest && e.target.closest('.etal__add');
    if (!b || e.target.closest('.ajout-pastille')) return;
    attente = { b, t: performance.now(), q: qteDe(b.dataset.ajoutSlug) };
  }, true);
  document.addEventListener('ivt:panier', () => {
    const p = attente; if (!p || performance.now() - p.t > 900) return;
    attente = null;
    if (qteDe(p.b.dataset.ajoutSlug) > p.q) envol(p.b);
  });
  function envol(btn) {
    const a = btn.getBoundingClientRect(), ax = a.left + a.width / 2, ay = a.top + a.height / 2;
    fx.burst(ax, ay);
    const vis = btn.closest('.etal') && btn.closest('.etal').querySelector('.etal__ring');
    if (vis) vis.animate([{ opacity: 1, boxShadow: '0 0 0 0 rgba(140,198,63,.5)' }, { opacity: 1, boxShadow: '0 0 0 14px rgba(140,198,63,0)' }], { duration: 620, easing: EASE });
    const cible = [...document.querySelectorAll('.cart-btn')].find(el => { const r = el.getBoundingClientRect(); return r.width && r.bottom > 0 && r.top < innerHeight; });
    if (!cible) return;
    const t = cible.getBoundingClientRect(), tx = t.left + t.width / 2, ty = t.top + t.height / 2;
    const cx = ax + (tx - ax) * 0.35, cy = Math.min(ay, ty) - Math.max(70, Math.abs(ax - tx) * 0.22);
    const kf = [];
    for (let i = 0; i <= 20; i++) {
      const s = i / 20, u = 1 - s, x = u * u * ax + 2 * u * s * cx + s * s * tx, y = u * u * ay + 2 * u * s * cy + s * s * ty;
      kf.push({ transform: `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0) scale(${(1 - 0.5 * s).toFixed(3)})`, opacity: s < 0.86 ? 1 : (1 - s) / 0.14 });
    }
    [0, 1, 2, 3].forEach(k => {
      const d = document.createElement('span'); d.className = 'bf-spark' + (k ? ' bf-spark--trail' : ''); d.setAttribute('aria-hidden', 'true');
      document.body.appendChild(d);
      const an = d.animate(kf, { duration: 700, delay: k * 42, easing: 'cubic-bezier(.5,0,.25,1)', fill: 'both' });
      an.onfinish = () => { d.remove(); if (!k) cible.animate([{ transform: 'scale(1)', boxShadow: '0 0 0 0 rgba(140,198,63,.55)' }, { transform: 'scale(1.08)', boxShadow: '0 0 0 9px rgba(140,198,63,0)', offset: .45 }, { transform: 'scale(1)', boxShadow: '0 0 0 0 rgba(140,198,63,0)' }], { duration: 520, easing: EASE }); };
    });
  }

  /* ---------- 4 · Couche WebGL partagée ---------- */
  if (!GL || !GL.supports()) return;
  const layer = document.createElement('div'); layer.className = 'bf-layer'; layer.setAttribute('aria-hidden', 'true');
  const canvas = document.createElement('canvas'); layer.appendChild(canvas);
  section.prepend(layer);
  GL.whenNear(section, () => boot().catch(e => { console.warn('[boutique-flux] couche masquée', e); layer.remove(); }));

  async function boot() {
    const THREE = await GL.three(), tier = GL.tier(), coarse = GL.coarse(), { C, v3 } = GL;
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: 'low-power' });
    renderer.setClearColor(0x000000, 0);
    const scene = new THREE.Scene(), cam = new THREE.OrthographicCamera(0, 1, 0, 1, -1, 1);
    const MAXC = 24;
    const U = {
      uRes: { value: new THREE.Vector2(1, 1) }, uMouse: { value: new THREE.Vector2(-999, -999) }, uMouseA: { value: 0 },
      uTime: { value: 0 }, uScroll: { value: 0 }, uGust: { value: 0 }, uPix: { value: 1 },
      uBurst: { value: new THREE.Vector4(-999, -999, -99, 0) },
      uCards: { value: Array.from({ length: MAXC }, () => new THREE.Vector4()) }, uNC: { value: 0 }
    };
    // Lumière au sol sous chaque produit visible + halo du curseur + onde d'ajout
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShaderMaterial({
      uniforms: U, transparent: true, premultipliedAlpha: true, depthTest: false, depthWrite: false,
      vertexShader: `varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
      fragmentShader: `uniform vec2 uRes,uMouse;uniform float uMouseA,uTime;uniform vec4 uCards[${MAXC}];uniform int uNC;uniform vec4 uBurst;varying vec2 vUv;
void main(){
  vec2 p=vec2(vUv.x,1.-vUv.y)*uRes;vec3 col=vec3(0.);float a=0.;
  for(int i=0;i<${MAXC};i++){ if(i>=uNC) break; vec4 c=uCards[i];
    vec2 d=(p-c.xy)/vec2(c.z*.6,c.z*.16);float f=exp(-dot(d,d)*1.3)*(.07+.13*c.w);
    col+=${v3(C.green)}*f;a+=f;
    vec2 d2=(p-(c.xy-vec2(0.,c.z*.42)))/vec2(c.z*.62);float g=exp(-dot(d2,d2)*2.2)*c.w*.07;
    col+=${v3(C.greenLight)}*g;a+=g; }
  vec2 dm=(p-uMouse)/280.;float m=exp(-dot(dm,dm)*1.5)*.06*uMouseA;col+=${v3(C.greenLight)}*m;a+=m;
  float bt=uTime-uBurst.z;
  if(bt>0.&&bt<1.1){float r=length(p-uBurst.xy);float ring=exp(-pow((r-bt*240.)/16.,2.))*(1.-bt/1.1)*.3;col+=${v3(C.ink)}*ring*.6+${v3(C.greenLight)}*ring*.4;a+=ring;}
  gl_FragColor=vec4(col,clamp(a,0.,.55));
}`
    }));
    quad.frustumCulled = false; scene.add(quad);

    // Graines / pollen en suspension, 3 profondeurs, parallaxe de scroll
    const N = coarse ? [50, 80, 110][tier] : [100, 180, 280][tier];
    const r4 = new Float32Array(N * 4); for (let i = 0; i < N * 4; i++) r4[i] = Math.random();
    const pg = new THREE.BufferGeometry();
    pg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
    pg.setAttribute('aR', new THREE.BufferAttribute(r4, 4));
    const pts = new THREE.Points(pg, new THREE.ShaderMaterial({
      uniforms: U, transparent: true, depthTest: false, depthWrite: false,
      vertexShader: `uniform vec2 uRes,uMouse;uniform float uTime,uScroll,uGust,uMouseA,uPix;uniform vec4 uBurst;attribute vec4 aR;varying float vA;varying vec3 vCol;
void main(){
  float depth=.3+.7*aR.z;float H=uRes.y+120.;float Wd=uRes.x+40.;
  float x=aR.x*Wd+sin(uTime*.11*(.5+aR.w)+aR.y*20.)*28.*depth+uGust*(70.+130.*aR.w)*depth;
  float y=mod(aR.y*H-uScroll*depth*.3-uTime*(5.+9.*aR.w)*depth,H)-60.;
  vec2 p=vec2(mod(x,Wd)-20.,y);
  vec2 dm=p-uMouse;float push=uMouseA*smoothstep(170.,0.,length(dm));p+=normalize(dm+.001)*push*30.*depth;
  float bt=uTime-uBurst.z;vec2 db=p-uBurst.xy;float bp=(bt>0.&&bt<1.4)?smoothstep(220.,0.,length(db))*(1.-bt/1.4):0.;p+=normalize(db+.001)*bp*46.*depth;
  gl_Position=projectionMatrix*vec4(p,0.,1.);
  gl_PointSize=uPix*(1.3+2.4*depth)*(1.+push*.5+bp*.8);
  vA=(.1+.3*depth)*(.65+.35*sin(uTime*(.5+aR.w)+aR.x*30.))+push*.3+bp*.45;
  vCol=mix(${v3(C.greenLight)},${v3(C.ink)},step(.8,aR.w));
}`,
      fragmentShader: `varying float vA;varying vec3 vCol;void main(){vec2 c=gl_PointCoord-.5;float d=length(c);if(d>.5)discard;gl_FragColor=vec4(vCol,vA*smoothstep(.5,.1,d));}`
    }));
    pts.frustumCulled = false; scene.add(pts);

    // Cartes visibles (IntersectionObserver) → positions lues à chaque image, hover amorti
    const visibles = new Set(), hov = new WeakMap();
    let io = null, survol = null;
    fx.cards = () => {
      if (io) io.disconnect(); visibles.clear();
      io = new IntersectionObserver(es => es.forEach(e => e.isIntersecting ? visibles.add(e.target) : visibles.delete(e.target)), { rootMargin: '120px 0px' });
      cards().forEach(c => io.observe(c));
    };
    fx.cards();
    grille.addEventListener('pointerover', e => { if (e.pointerType === 'mouse') survol = e.target.closest('.etal'); });
    grille.addEventListener('pointerleave', () => { survol = null; });
    let mx = -999, my = -999, inSec = false;
    if (!coarse) {
      section.addEventListener('pointermove', e => { mx = e.clientX; my = e.clientY; inSec = true; }, { passive: true });
      section.addEventListener('pointerleave', () => { inSec = false; });
    }
    let gust = 0, gustV = 0, t = 0;
    fx.gust = () => { gustV += 2.4; };
    fx.burst = (x, y) => { const r = layer.getBoundingClientRect(); U.uBurst.value.set(x - r.left, y - r.top, t, 1); };

    let W = 1, H = 1, dpr = 1;
    const resize = () => {
      W = Math.max(1, layer.clientWidth); H = Math.max(1, layer.clientHeight);
      renderer.setPixelRatio(dpr); renderer.setSize(W, H, false);
      cam.right = W; cam.bottom = H; cam.updateProjectionMatrix();
      quad.scale.set(W, H, 1); quad.position.set(W / 2, H / 2, 0);
      U.uRes.value.set(W, H); U.uPix.value = dpr;
    };
    const gov = GL.governor(0.75, Math.min(devicePixelRatio || 1, coarse ? 1 : 1.5), d => { dpr = d; resize(); });
    new ResizeObserver(resize).observe(layer); resize();

    function frame(dt) {
      gov(dt); t += dt;
      U.uTime.value = t; U.uScroll.value = scrollY;
      gustV += (-gust * 16 - gustV * 5.5) * dt; gust += gustV * dt; U.uGust.value = gust;   // souffle amorti
      const lr = layer.getBoundingClientRect();
      U.uMouse.value.set(mx - lr.left, my - lr.top);
      U.uMouseA.value = GL.damp(U.uMouseA.value, inSec ? 1 : 0, 3, dt);
      let n = 0;
      for (const c of visibles) {
        if (n >= MAXC || !c.isConnected) continue;
        const v = c.querySelector('.etal__visual'); if (!v) continue;
        const r = v.getBoundingClientRect();
        const h = GL.damp(hov.get(c) || 0, c === survol ? 1 : 0, 6, dt); hov.set(c, h);
        U.uCards.value[n++].set(r.left + r.width / 2 - lr.left, r.bottom - r.height * 0.1 - lr.top, r.width, h);
      }
      U.uNC.value = n;
      renderer.render(scene, cam);
    }
    layer.classList.add('is-on');
    GL.loop(layer, frame);
  }
})();
