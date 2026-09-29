/* IVT — Fiche produit · « Du champ au marché »
   Le trajet réel du produit (data/geo.js) raconté au scroll :
   01 production → 02 récolte → 03 collecte → 04 marché (prix Adjamé) → 05 achat.
   Textes et chiffres restent dans le DOM ; la scène WebGL n'est qu'un décor narratif.
   Dépend de : IVT_APP (prix, panier, WhatsApp), IVT_GEO (zones, marchés, contour), IVT_GL (rendu). */
(() => {
  const A = typeof IVT_APP !== 'undefined' ? IVT_APP : null, G = window.IVT_GEO, GL = window.IVT_GL;
  const root = document.getElementById('ficheTrajet');
  if (!A || !G || !GL || !root) return;
  const slug = new URLSearchParams(location.search).get('p') || '';
  const p = Object.prototype.hasOwnProperty.call(A.parSlug, slug) ? A.parSlug[slug] : null;
  if (!p) { root.remove(); return; }

  const $ = s => root.querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const { clamp, sstep, damp } = GL;
  const D = A.DATA, derniere = D.semaines[D.semaines.length - 1];
  const g = G.product(slug);
  const zones = g ? g.zones : [];
  const markets = g ? g.markets : [Object.assign({ key: 'adjame' }, G.markets.adjame)];
  const adj = markets.find(m => m.key === 'adjame') || markets[0];
  const prim = G.primary(g);
  const ph = g ? G.phrase(g) : { lieu: 'Adjamé', note: '' };
  const nomZ = z => z.precision === 'pays' ? z.nom + ' (import)' : z.nom;

  /* ---------------- Textes ---------------- */
  const actuel = A.prixActuel(p), v = A.variation(p);
  const deltaHtml = v.sens === 'flat' ? '<span class="delta delta--flat">stable</span>'
    : `<span class="delta delta--${v.sens}">${v.sens === 'up' ? '▲' : '▼'} ${Math.abs(v.pct).toFixed(1).replace('.', ',')} %</span>`;
  const lieux = zones.map(nomZ).join(' · ');
  $('#ftTitre').innerHTML = zones.length ? `De <em>${esc(lieux)}</em><br>à Adjamé.` : `Jusqu'au marché<br><em>d'Adjamé.</em>`;
  $('#ftLede').textContent = zones.length
    ? `${p.nom} : de sa zone de production jusqu'au prix de gros relevé cette semaine à Adjamé.`
    : ph.note || 'Zone de production non renseignée pour ce produit.';

  const kmList = zones.map(z => `<li><span class="k">${esc(nomZ(z))}</span><span class="v">${G.km(z, adj)} km</span></li>`).join('');
  const regions = zones.map(z => z.precision === 'ville' ? `<li><span class="k">${esc(z.nom)}</span><span class="v">${esc(z.region)} · ${esc(z.district)}</span></li>` : `<li><span class="k">${esc(z.nom)}</span><span class="v">Import</span></li>`).join('');
  const colis = String(p.colis || p.unite);
  const hasYam = markets.some(m => m.key === 'yamoussoukro');
  const steps = [
    { k: 'Production', h: zones.length ? `<em>${esc(lieux)}</em>` : 'Origine <em>non renseignée</em>',
      body: zones.length ? `<p>${zones.length > 1 ? 'Zones de production' : 'Zone de production'} du produit vendu par IVT.</p><ul class="ft__kv">${regions}</ul>` : `<p>${esc(ph.note)}</p>`,
      note: ph.note && zones.length ? `<p class="ft__note">${esc(ph.note)}</p>` : '' },
    { k: 'Récolte', h: 'Récolté,<br><em>conditionné.</em>',
      body: `<ul class="ft__kv"><li><span class="k">Conditionnement</span><span class="v">${esc(colis)}</span></li><li><span class="k">Vente</span><span class="v">au ${esc(p.unite)}</span></li></ul>` },
    { k: 'Collecte', h: prim ? `${G.km(prim, adj)} km<br><em>vers Abidjan.</em>` : 'Vers<br><em>Abidjan.</em>',
      body: kmList ? `<p>Distance à vol d'oiseau jusqu'au marché de gros d'Adjamé.</p><ul class="ft__kv">${kmList}</ul>` : `<p>Le produit rejoint le marché de gros d'Adjamé.</p>` },
    { k: 'Marché', h: `Adjamé,<br><em>${esc(A.dateCourte(derniere))}.</em>`,
      body: `<p class="ft__price"><b>${A.fmt(actuel)}</b><span>F CFA / ${esc(p.unite)}</span>${deltaHtml}</p><p>Prix de gros relevé cette semaine, hors transport.${hasYam ? ' Également relevé à Yamoussoukro.' : ''}</p>` }
  ];
  $('.ft__steps').innerHTML = steps.map((s, i) => `<div class="ft__step" data-ft-step="${i}"><div class="ft__card">
    <p class="ft__n"><b>0${i + 1}</b>${s.k}</p><h3>${s.h}</h3>${s.body}${s.note || ''}</div></div>`).join('');
  const rail = [...root.querySelectorAll('.ft__rail li')];

  /* 05 · Achat — relié au sélecteur de quantité existant et à IVT_APP */
  const champ = document.getElementById('qte');
  const qte = () => Math.max(1, parseInt(champ && champ.value, 10) || 1);
  $('#ftEndT').innerHTML = `Commander <em>${esc(p.nom.toLowerCase())}</em>`;
  const majFin = () => {
    const q = qte();
    $('#ftEndSum').innerHTML = `<b>${A.fmt(q)} ${esc(p.unite)}</b> × ${A.fmt(actuel)} F = <b>${A.fmt(q * actuel)} F CFA</b> · relevé du ${esc(A.dateCourte(derniere))}`;
    $('#ftWa').href = A.lienWhatsApp(`Bonjour IVT, je souhaite commander ${q} ${p.unite} de ${p.nom} (${A.fmt(actuel)} F / ${p.unite}, relevé du ${A.dateCourte(derniere)}).`);
  };
  if (champ) { champ.addEventListener('input', majFin); ['moins', 'plus'].forEach(id => { const b = document.getElementById(id); b && b.addEventListener('click', () => requestAnimationFrame(majFin)); }); }
  $('#ftAdd').addEventListener('click', () => A.ajouterAuPanier(p.slug, qte()));
  majFin();

  /* ---------------- Progression au scroll ---------------- */
  const reduced = GL.reduced();
  const S = { s: 0, intro: 0 };
  const stepEls = [...root.querySelectorAll('.ft__step')];
  function lire() {
    const vh = innerHeight, first = stepEls[0].getBoundingClientRect(), h = first.height || vh;
    S.s = clamp((vh * 0.5 - first.top) / h - 0.5, -1, 3);
    S.intro = clamp(1 - $('.ft__track').getBoundingClientRect().top / vh);
    const act = Math.round(clamp(S.s, 0, 3));
    rail.forEach((li, i) => li.classList.toggle('is-on', i === act && S.s > -0.6));
    stepEls.forEach((el, i) => el.classList.toggle('is-on', Math.abs(S.s - i) < 0.62));
  }
  if (reduced) { root.classList.add('is-static'); S.s = 3; S.intro = 1; }
  else { addEventListener('scroll', lire, { passive: true }); addEventListener('resize', lire); lire(); }

  if (!GL.supports()) { root.setAttribute('data-fallback', ''); return; }
  GL.whenNear(root, () => boot().catch(e => { console.warn('[fiche-trajet] repli sans WebGL', e); root.setAttribute('data-fallback', ''); }));

  /* ---------------- Scène ---------------- */
  const LON0 = -5.4, LAT0 = 7.5, KX = Math.cos(7.5 * Math.PI / 180);
  const W = (lon, lat) => [(lon - LON0) * KX, -(lat - LAT0)];

  async function boot() {
    const THREE = await GL.three();
    const tier = GL.tier();
    const pin = $('.ft__pin'), canvas = $('.ft__canvas'), labelsEl = $('.ft__labels');
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: tier === 2, alpha: true, powerPreference: 'high-performance' });
    renderer.setClearColor(0x000000, 0);
    const scene = new THREE.Scene();
    const cam = new THREE.PerspectiveCamera(36, 1, 0.05, 40);
    const { C, v3, NOISE } = GL;

    const MK = W(adj.lon, adj.lat);
    const ZP = zones.map(z => W(z.lon, z.lat));
    const U = {
      uTime: { value: 0 }, uPix: { value: 4 }, uIntro: { value: 0 }, uProd: { value: 0 }, uHarv: { value: 0 },
      uFlow: { value: 0 }, uMkt: { value: 0 }, uNZ: { value: ZP.length },
      uZ: { value: [0, 1, 2, 3].map(i => new THREE.Vector2(...(ZP[i] || [99, 99]))) }, uMk: { value: new THREE.Vector2(...MK) }
    };

    /* Terrain : semis de points sur le contour ivoirien, rangs de culture autour des zones, îlot urbain à Adjamé */
    const outline = G.outline.map(([lo, la]) => W(lo, la));
    const inside = (x, z) => { let c = false; for (let i = 0, j = outline.length - 1; i < outline.length; j = i++) { const [xi, zi] = outline[i], [xj, zj] = outline[j]; if (((zi > z) !== (zj > z)) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) c = !c; } return c; };
    const step = [0.085, 0.058, 0.04][tier];
    const pos = [], aIn = [], aRnd = [];
    for (let x = -4.3; x <= 4.3; x += step) for (let z = -4.5; z <= 3.7; z += step) {
      const jx = x + (Math.random() - 0.5) * step * 0.6, jz = z + (Math.random() - 0.5) * step * 0.6;
      pos.push(jx, 0, jz); aIn.push(inside(jx, jz) ? 1 : 0); aRnd.push(Math.random());
    }
    const tg = new THREE.BufferGeometry();
    tg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    tg.setAttribute('aIn', new THREE.Float32BufferAttribute(aIn, 1));
    tg.setAttribute('aRnd', new THREE.Float32BufferAttribute(aRnd, 1));
    const DOT = `varying vec3 vCol;varying float vA;void main(){vec2 c=gl_PointCoord-.5;float d=length(c);if(d>.5)discard;gl_FragColor=vec4(vCol,vA*smoothstep(.5,.12,d));}`;
    const terrain = new THREE.Points(tg, new THREE.ShaderMaterial({
      uniforms: U, transparent: true, depthWrite: false, fragmentShader: DOT,
      vertexShader: `uniform float uTime,uPix,uIntro,uProd,uHarv,uMkt,uNZ;uniform vec2 uZ[4];uniform vec2 uMk;
attribute float aIn;attribute float aRnd;varying vec3 vCol;varying float vA;${NOISE}
void main(){
  vec3 p=position;float n=fbm(p.xz*1.15+3.7);
  float zf=0.;for(int i=0;i<4;i++){if(float(i)<uNZ)zf=max(zf,smoothstep(.8,0.,distance(p.xz,uZ[i])));}
  float rows=.5+.5*sin(dot(p.xz,vec2(58.,36.)));
  float crop=zf*uProd;
  float sway=.5+.5*sin(uTime*.9+p.x*6.+p.z*4.);
  float h=(n-.42)*.16*mix(.25,1.,aIn);
  h+=crop*(.012+.032*rows)*(1.+.45*uHarv*sway);
  float city=smoothstep(.34,0.,distance(p.xz,uMk))*uMkt;
  h+=city*(.012+.16*pow(aRnd,7.));
  p.y=h*uIntro;
  vec3 col=mix(${v3(C.bg)}*1.25,${v3(C.surface2)}*1.35,smoothstep(.25,.75,n));
  col=mix(col,${v3(C.greenLight)},crop*(.25+.6*rows));
  col=mix(col,${v3(C.ink)},city*(.3+.7*step(.8,aRnd)));
  vec4 mv=modelViewMatrix*vec4(p,1.);
  float fade=smoothstep(13.,3.,-mv.z)*smoothstep(4.7,3.1,length(p.xz));
  vA=(.1+.4*aIn+.4*crop+.55*city)*uIntro*fade;vCol=col;
  gl_Position=projectionMatrix*mv;gl_PointSize=uPix*(1.3+1.5*crop+1.4*city)/(-mv.z);
}` }));
    scene.add(terrain);

    const olg = new THREE.BufferGeometry().setFromPoints(outline.map(([x, z]) => new THREE.Vector3(x, 0.03, z)));
    const olMat = new THREE.LineBasicMaterial({ color: 0xF2F7F4, transparent: true, opacity: 0, depthWrite: false });
    scene.add(new THREE.LineLoop(olg, olMat));

    /* Flux : courbe zone → marché, tracée progressivement ; récoltes en mouvement le long de la courbe */
    const flows = [];
    zones.forEach((z, zi) => markets.forEach(m => {
      const a = ZP[zi], b = W(m.lon, m.lat), d = Math.hypot(b[0] - a[0], b[1] - a[1]);
      flows.push({ a: new THREE.Vector3(a[0], 0.04, a[1]), c: new THREE.Vector3((a[0] + b[0]) / 2, 0.1 + d * 0.22, (a[1] + b[1]) / 2), b: new THREE.Vector3(b[0], 0.04, b[1]), w: m.key === 'adjame' ? 1 : 0.45, z, m, d });
    }));
    const fl = { uDraw: { value: 0 }, uTime: U.uTime };
    flows.forEach(f => {
      const crv = new THREE.QuadraticBezierCurve3(f.a, f.c, f.b), pts = crv.getPoints(96);
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      geo.setAttribute('aT', new THREE.Float32BufferAttribute(pts.map((_, i) => i / 96), 1));
      scene.add(new THREE.Line(geo, new THREE.ShaderMaterial({
        uniforms: Object.assign({ uW: { value: f.w } }, fl), transparent: true, depthWrite: false,
        vertexShader: `attribute float aT;varying float vT;void main(){vT=aT;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
        fragmentShader: `uniform float uDraw,uW;varying float vT;void main(){if(vT>uDraw)discard;float head=smoothstep(uDraw-.14,uDraw,vT);gl_FragColor=vec4(mix(${v3(C.greenLight)},${v3(C.ink)},vT),uW*(.3+.55*head));}`
      })));
    });
    const perFlow = [16, 34, 60][tier];
    const pa = [], pc = [], pb = [], po = [], pr = [], pw = [];
    flows.forEach(f => { for (let i = 0; i < perFlow; i++) { pa.push(f.a.x, f.a.y, f.a.z); pc.push(f.c.x, f.c.y, f.c.z); pb.push(f.b.x, f.b.y, f.b.z); po.push(i / perFlow); pr.push(Math.random()); pw.push(f.w); } });
    if (flows.length) {
      const hg = new THREE.BufferGeometry();
      hg.setAttribute('position', new THREE.Float32BufferAttribute(pa, 3));
      hg.setAttribute('aC', new THREE.Float32BufferAttribute(pc, 3));
      hg.setAttribute('aB', new THREE.Float32BufferAttribute(pb, 3));
      hg.setAttribute('aOff', new THREE.Float32BufferAttribute(po, 1));
      hg.setAttribute('aRnd', new THREE.Float32BufferAttribute(pr, 1));
      hg.setAttribute('aW', new THREE.Float32BufferAttribute(pw, 1));
      const harvest = new THREE.Points(hg, new THREE.ShaderMaterial({
        uniforms: U, transparent: true, depthWrite: false, fragmentShader: DOT,
        vertexShader: `uniform float uTime,uHarv,uFlow,uMkt,uPix,uIntro;attribute vec3 aC,aB;attribute float aOff,aRnd,aW;varying vec3 vCol;varying float vA;
void main(){
  float t=fract(aOff+uTime*(.045+.035*aRnd));float tt=t*uFlow;
  vec3 b=mix(mix(position,aC,tt),mix(aC,aB,tt),tt);
  float ang=aRnd*6.2831+uTime*.25;float r=(.05+.13*fract(aRnd*7.3))*(1.-uFlow);
  vec3 p=b+vec3(cos(ang)*r,(.02+.05*fract(aRnd*3.1))*(1.-uFlow)*(.7+.3*sin(uTime*1.3+aRnd*9.)),sin(ang)*r);
  p+=vec3(sin(aRnd*40.),0.,cos(aRnd*40.))*.014*uFlow;
  vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;
  float arrive=smoothstep(.84,1.,t)*uFlow;
  vA=uHarv*aW*(.9-.8*arrive)*uIntro;
  vCol=mix(${v3(C.greenLight)},mix(${v3(C.ink)},${v3(C.redLight)},uMkt*.55),smoothstep(.3,1.,tt));
  gl_PointSize=uPix*2./(-mv.z);
}` }));
      scene.add(harvest);
    }

    /* Repères : anneau vert par zone, marché = anneau rouge IVT + halo sobre */
    const ringGeo = new THREE.RingGeometry(0.055, 0.068, 48).rotateX(-Math.PI / 2);
    const zoneRings = ZP.map(([x, z]) => { const m = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0x8CC63F, transparent: true, opacity: 0, depthWrite: false })); m.position.set(x, 0.05, z); scene.add(m); return m; });
    const mkRings = markets.map(mk => { const [x, z] = W(mk.lon, mk.lat); const m = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0xE63946, transparent: true, opacity: 0, depthWrite: false })); m.position.set(x, 0.05, z); m.userData.main = mk.key === 'adjame'; scene.add(m); return m; });
    const halo = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.1).rotateX(-Math.PI / 2), new THREE.ShaderMaterial({
      uniforms: { uMkt: U.uMkt }, transparent: true, depthWrite: false,
      vertexShader: `varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
      fragmentShader: `uniform float uMkt;varying vec2 vUv;void main(){float d=length(vUv-.5)*2.;gl_FragColor=vec4(${v3(C.ink)},uMkt*.16*pow(max(0.,1.-d),2.2));}`
    }));
    halo.position.set(MK[0], 0.06, MK[1]); scene.add(halo);

    /* Étiquettes DOM (lisibles, jamais dans le canvas) */
    const labels = [];
    const addLabel = (txt, vec, cls, phase) => { const el = document.createElement('span'); el.className = 'ft__label ' + cls; el.textContent = txt; labelsEl.appendChild(el); labels.push({ el, vec, phase }); };
    zones.forEach((z, i) => addLabel(nomZ(z), new THREE.Vector3(ZP[i][0], 0.08, ZP[i][1]), 'ft__label--zone', 'prod'));
    markets.forEach(m => { const [x, z] = W(m.lon, m.lat); addLabel(m.court, new THREE.Vector3(x, 0.08, z), m.key === 'adjame' ? 'ft__label--mkt' : 'ft__label--mkt2', 'mkt'); });
    flows.filter(f => f.m.key === 'adjame').forEach(f => { const mid = new THREE.QuadraticBezierCurve3(f.a, f.c, f.b).getPoint(0.5); addLabel(G.km(f.z, f.m) + ' km', mid, 'ft__label--km', 'flow'); });

    /* Caméra : un plan par étape, interpolé ; la souris ajoute une parallaxe amortie */
    const all = [...ZP, MK];
    const bx = [Math.min(...all.map(p => p[0])), Math.max(...all.map(p => p[0]))], bz = [Math.min(...all.map(p => p[1])), Math.max(...all.map(p => p[1]))];
    const span = Math.max(0.8, bx[1] - bx[0], bz[1] - bz[0]);
    const P0 = ZP[0] || MK, midB = [(bx[0] + bx[1]) / 2, (bz[0] + bz[1]) / 2];
    const KF = [
      { t: [P0[0], 0, P0[1]], o: [0.5, 1.5, 2.3] },
      { t: [P0[0], 0.02, P0[1]], o: [-0.55, 0.7, 1.15] },
      { t: [midB[0], 0, midB[1]], o: [0.1, 1.0 + span * 0.95, 0.9 + span * 0.8] },
      { t: [MK[0], 0, MK[1]], o: [0.5, 0.85, 1.2] }
    ];
    const tgt = new THREE.Vector3(), eye = new THREE.Vector3(), cT = new THREE.Vector3(), cE = new THREE.Vector3();
    let W_ = 1, H_ = 1, aspect = 1, desk = true, first = true;
    function plan(s) {
      const sc = clamp(s, 0, 3), i = Math.min(2, Math.floor(sc)), f = sstep(0, 1, sc - i), a = KF[i], b = KF[i + 1];
      const k = aspect < 1 ? Math.pow(1 / aspect, 0.55) : 1;
      tgt.set(a.t[0] + (b.t[0] - a.t[0]) * f, a.t[1] + (b.t[1] - a.t[1]) * f, a.t[2] + (b.t[2] - a.t[2]) * f);
      eye.set(a.o[0] + (b.o[0] - a.o[0]) * f, a.o[1] + (b.o[1] - a.o[1]) * f, a.o[2] + (b.o[2] - a.o[2]) * f).multiplyScalar(k);
      const r = eye.length() * 0.14;
      if (desk) tgt.x -= r * 1.1; else tgt.z += r * 0.9;   // laisse la place à la carte de texte (gauche / bas)
      eye.add(tgt);
    }
    const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
    if (!GL.coarse()) addEventListener('pointermove', e => { mouse.tx = e.clientX / innerWidth * 2 - 1; mouse.ty = e.clientY / innerHeight * 2 - 1; }, { passive: true });

    let dpr = 1;
    const resize = () => {
      const r = pin.getBoundingClientRect(); W_ = Math.max(1, r.width); H_ = Math.max(1, r.height); aspect = W_ / H_; desk = W_ >= 900;
      renderer.setPixelRatio(dpr); renderer.setSize(W_, H_, false);
      cam.aspect = aspect; cam.fov = aspect < 1 ? 44 : 36; cam.updateProjectionMatrix();
      U.uPix.value = dpr * H_ * step * 0.13;
    };
    const maxDpr = Math.min(devicePixelRatio || 1, [1.25, 1.5, 2][tier]);
    const gov = GL.governor(0.75, maxDpr, d => { dpr = d; resize(); });
    new ResizeObserver(resize).observe(pin);

    const tmp = new THREE.Vector3(), right = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
    let t = 0;
    function frame(dt) {
      if (!reduced) { gov(dt); t += dt; }
      U.uTime.value = t;
      const s = S.s, intro = reduced ? 1 : S.intro;
      U.uIntro.value = damp(U.uIntro.value, sstep(0.05, 0.9, intro), 3, dt || 1);
      U.uProd.value = sstep(-0.7, 0.3, s); U.uHarv.value = sstep(0.45, 1.2, s);
      U.uFlow.value = sstep(1.35, 2.25, s); U.uMkt.value = sstep(2.3, 3, s);
      fl.uDraw.value = U.uFlow.value * 1.001;
      olMat.opacity = 0.2 * U.uIntro.value;
      const pulse = 1 + 0.18 * Math.sin(t * 2.2);
      zoneRings.forEach(m => { m.material.opacity = 0.9 * U.uProd.value; m.scale.setScalar((0.8 + 0.4 * U.uHarv.value) * pulse); });
      mkRings.forEach(m => { const on = m.userData.main ? Math.max(0.35 * U.uIntro.value, U.uMkt.value) : 0.5 * U.uFlow.value; m.material.opacity = on; m.scale.setScalar((0.9 + (m.userData.main ? 1.1 * U.uMkt.value : 0)) * (m.userData.main ? pulse : 1)); });

      plan(s);
      const k = first ? 1 : dt;
      mouse.x = damp(mouse.x, mouse.tx, 2.2, k || 1); mouse.y = damp(mouse.y, mouse.ty, 2.2, k || 1);
      cT.lerp(tgt, first ? 1 : 1 - Math.exp(-3.2 * dt)); cE.lerp(eye, first ? 1 : 1 - Math.exp(-2.6 * dt)); first = false;
      right.subVectors(cE, cT).cross(up).normalize();
      const L = cE.distanceTo(cT);
      cam.position.copy(cE).addScaledVector(right, mouse.x * L * 0.07).addScaledVector(up, -mouse.y * L * 0.045);
      cam.lookAt(cT);
      renderer.render(scene, cam);

      labels.forEach(l => {
        const o = l.phase === 'prod' ? U.uProd.value : l.phase === 'flow' ? U.uFlow.value * (1 - U.uMkt.value * 0.6) : Math.max(0.55 * U.uIntro.value, U.uMkt.value);
        tmp.copy(l.vec).project(cam);
        const vis = tmp.z < 1 && Math.abs(tmp.x) < 1.1 && Math.abs(tmp.y) < 1.1;
        l.el.style.opacity = vis ? o.toFixed(3) : 0;
        if (vis) l.el.style.transform = `translate3d(${((tmp.x + 1) / 2 * W_).toFixed(1)}px,${((1 - tmp.y) / 2 * H_).toFixed(1)}px,0)`;
      });
    }
    resize();
    root.classList.add('is-gl');
    if (reduced) { frame(0); new ResizeObserver(() => frame(0)).observe(pin); return; }
    GL.loop(pin, frame);
  }
})();
