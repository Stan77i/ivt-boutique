/* IVT — Tendance prix · « Les courants de la semaine »
   Une ligne par produit = sa vraie série de prix médians (data/prix.js), rangée de la plus forte
   hausse (haut) à la plus forte baisse (bas). Une lumière parcourt chaque ligne, d'autant plus vite
   que le prix a bougé cette semaine. Survol / toucher : nom et chiffres en DOM ; clic : ouvre la
   fiche historique existante (via la carte des mouvements de prix.js, sans la dupliquer). */
(() => {
  const A = typeof IVT_APP !== 'undefined' ? IVT_APP : null, P = window.IVT_PRIX, GL = window.IVT_GL;
  const root = document.getElementById('courants');
  if (!A || !P || !GL || !root) return;
  if (!GL.supports()) { root.hidden = true; return; }
  const $ = s => root.querySelector(s);
  const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fmt = A.fmt, mid = v => v == null ? null : Array.isArray(v) ? (v[0] + v[1]) / 2 : v;
  const rngV = v => Array.isArray(v) ? v : [v, v];
  const rng = v => { const r = rngV(v); return r[0] === r[1] ? fmt(r[0]) : fmt(r[0]) + ' – ' + fmt(r[1]); };
  const MOIS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
  const jm = iso => { const x = new Date(iso + 'T00:00:00'); return x.getDate() + ' ' + MOIS[x.getMonth()]; };

  /* ---------- Données : mêmes règles que prix.js (médian, dernier relevé, ruptures) ---------- */
  const Wk = P.semaines, N = Wk.length, L = N - 1;
  const T = Wk.map(w => new Date(w.debut + 'T00:00:00').getTime()), xOf = i => (T[i] - T[0]) / (T[L] - T[0]);
  const lanes = [];
  P.series.forEach(s => {
    const r = s.r.map(v => Array.isArray(v) ? [v[0], v[1]] : v);   // ignore la précision texte éventuelle
    const m = r.map(mid);
    if (m[L] == null) return;
    let j = L - 1; while (j >= 0 && m[j] == null) j--;
    if (j < 0 || (s.rupt || []).some(k => k > j && k <= L)) return;
    const pct = (m[L] - m[j]) / m[j] * 100;
    const pts = m.map((v, i) => v == null ? null : [xOf(i), v]).filter(Boolean);
    if (pts.length < 2) return;
    const mean = pts.reduce((a, p) => a + p[1], 0) / pts.length;
    lanes.push({ id: s.id, nom: s.nom + (s.variante ? ' · ' + s.variante : ''), unite: s.unite, pct, now: r[L], pts, dev: pts.map(([x, v]) => [x, v / mean - 1]) });
  });
  lanes.sort((a, b) => b.pct - a.pct);
  if (lanes.length < 3) { root.hidden = true; return; }
  const maxDev = Math.max(0.05, ...lanes.flatMap(l => l.dev.map(d => Math.abs(d[1]))));
  const sens = p => p > 0.5 ? 1 : p < -0.5 ? -1 : 0;
  const pctTxt = p => (p > 0.5 ? '▲ ' : p < -0.5 ? '▼ ' : '') + (Math.abs(p) < 0.5 ? 'stable' : Math.abs(p).toFixed(1).replace('.', ',') + ' %');
  $('#pcD0').textContent = jm(Wk[0].debut); $('#pcD1').textContent = jm(Wk[L].debut); $('#pcD0').dataset.fin = jm(Wk[L].debut);
  $('#pcN').textContent = lanes.length;

  // Catmull-Rom sur x non uniforme, échantillonné
  function sample(dev, n) {
    const out = [];
    for (let k = 0; k <= n; k++) {
      const x = k / n; let i = 0; while (i < dev.length - 2 && dev[i + 1][0] < x) i++;
      if (x < dev[0][0] || x > dev[dev.length - 1][0]) { out.push([x, null]); continue; }
      const p0 = dev[Math.max(0, i - 1)], p1 = dev[i], p2 = dev[i + 1], p3 = dev[Math.min(dev.length - 1, i + 2)];
      const t = (x - p1[0]) / Math.max(1e-6, p2[0] - p1[0]), t2 = t * t, t3 = t2 * t;
      const y = 0.5 * ((2 * p1[1]) + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3);
      out.push([x, y]);
    }
    return out;
  }

  const stage = $('.pc__stage'), canvas = $('.pc__canvas'), tip = $('.pc__tip'), tags = $('.pc__tags');
  GL.whenNear(root, () => boot().catch(e => { console.warn('[prix-courants] masqué', e); root.hidden = true; }));

  async function boot() {
    const THREE = await GL.three();
    const tier = GL.tier(), reduced = GL.reduced(), { C, v3 } = GL;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, premultipliedAlpha: true, powerPreference: 'default' });
    renderer.setClearColor(0x000000, 0);
    canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); root.classList.remove('is-gl'); });
    canvas.addEventListener('webglcontextrestored', () => { root.classList.add('is-gl'); });
    const SEG = [70, 110, 160][tier];
    const pos = [], aX = [], aSide = [], aLane = [], aSens = [], aSpd = [], aOff = [], idx = [];
    lanes.forEach((l, li) => {
      const sm = sample(l.dev, SEG).filter(p => p[1] != null), base = pos.length / 3;
      const spd = 0.035 + 0.22 * Math.min(1, Math.abs(l.pct) / 30), off = Math.random();
      sm.forEach(([x, y]) => [-1, 1].forEach(sd => {
        pos.push(x, y / maxDev, 0); aX.push(x); aSide.push(sd); aLane.push(li); aSens.push(sens(l.pct)); aSpd.push(spd); aOff.push(off);
      }));
      for (let k = 0; k < sm.length - 1; k++) { const a = base + k * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    [['aX', aX], ['aSide', aSide], ['aLane', aLane], ['aSens', aSens], ['aSpd', aSpd], ['aOff', aOff]].forEach(([n, a]) => geo.setAttribute(n, new THREE.Float32BufferAttribute(a, 1)));
    geo.setIndex(idx);
    const U = { uRes: { value: new THREE.Vector2(1, 1) }, uPlot: { value: new THREE.Vector4(0, 1, 0, 1) }, uLaneH: { value: 10 }, uAmp: { value: 10 }, uThick: { value: 1 },
      uTime: { value: 0 }, uDraw: { value: reduced ? 1 : 0 }, uHover: { value: -1 }, uPulse: { value: reduced ? 0 : 1 } };
    const mesh = new THREE.Mesh(geo, new THREE.ShaderMaterial({
      uniforms: U, transparent: true, premultipliedAlpha: true, depthTest: false, depthWrite: false,
      vertexShader: `uniform vec2 uRes;uniform vec4 uPlot;uniform float uLaneH,uAmp,uThick,uHover;
attribute float aX,aSide,aLane,aSens,aSpd,aOff;varying float vX,vSide,vLane,vSens,vSpd,vOff;
void main(){vX=aX;vSide=aSide;vLane=aLane;vSens=aSens;vSpd=aSpd;vOff=aOff;
  float hov=1.-step(.5,abs(aLane-uHover));
  float px=mix(uPlot.x,uPlot.y,aX);
  float py=uPlot.z+(aLane+.5)*uLaneH-position.y*uAmp*(1.+.5*hov)+aSide*uThick*(1.+1.2*hov);
  gl_Position=vec4(px/uRes.x*2.-1.,1.-py/uRes.y*2.,0.,1.);}`,
      fragmentShader: `uniform float uTime,uDraw,uHover,uPulse;varying float vX,vSide,vLane,vSens,vSpd,vOff;
void main(){
  if(vX>uDraw)discard;
  vec3 col=vSens>.5?${v3(C.greenLight)}:vSens<-.5?${v3(C.redLight)}:${v3(C.ink)}*.75;
  float edge=smoothstep(1.,.2,abs(vSide));
  float p=fract(uTime*vSpd+vOff)*1.25-.1;float d=vX-p;
  float pulse=exp(-d*d*420.)*uPulse;float trail=(d<0.?exp(d*16.):0.)*.35*uPulse;
  float hov=1.-step(.5,abs(vLane-uHover));float any=step(-.5,uHover);
  float a=(.2+.75*pulse+trail)*mix(1.,.4,any*(1.-hov));
  a=max(a,hov*.95);
  float A=clamp(a*edge,0.,1.);gl_FragColor=vec4(mix(col,${v3(C.ink)},pulse*.35)*A,A);
}`
    }));
    mesh.frustumCulled = false;
    const scene = new THREE.Scene(), cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    scene.add(mesh);

    // Étiquettes permanentes : 2 plus fortes hausses, 2 plus fortes baisses
    const pick = [0, 1, lanes.length - 2, lanes.length - 1].filter((v, i, a) => a.indexOf(v) === i && sens(lanes[v].pct) !== 0);
    tags.innerHTML = pick.map(i => `<span class="pc__tag pc__tag--${sens(lanes[i].pct) > 0 ? 'up' : 'down'}" data-lane="${i}">${esc(lanes[i].nom)} <b>${pctTxt(lanes[i].pct)}</b></span>`).join('');

    let Wd = 1, Hd = 1, dpr = 1, plot = { x0: 0, x1: 1, y0: 0, y1: 1, lh: 10 };
    const resize = () => {
      const r = stage.getBoundingClientRect(); Wd = Math.max(1, r.width); Hd = Math.max(1, r.height);
      const wide = Wd >= 760;
      plot = { x0: wide ? Math.max(24, (Wd - 1240) / 2 + 24) : 18, x1: Wd - (wide ? Math.max(210, (Wd - 1240) / 2 + 210) : 18), y0: 44, y1: Hd - 40 };
      plot.lh = (plot.y1 - plot.y0) / lanes.length;
      renderer.setPixelRatio(dpr); renderer.setSize(Wd, Hd, false);
      U.uRes.value.set(Wd, Hd); U.uPlot.value.set(plot.x0, plot.x1, plot.y0, plot.y1);
      U.uLaneH.value = plot.lh; U.uAmp.value = plot.lh * 1.6; U.uThick.value = Math.max(0.6, Math.min(1.4, plot.lh * 0.09));
      tags.querySelectorAll('.pc__tag').forEach(el => { const i = +el.dataset.lane; el.style.transform = `translate3d(${(plot.x1 + 14).toFixed(0)}px,${(plot.y0 + (i + 0.5) * plot.lh).toFixed(0)}px,0)`; });
      stage.style.setProperty('--x0', plot.x0 + 'px'); stage.style.setProperty('--x1', (Wd - plot.x1) + 'px');
      draw();
    };
    const gov = GL.governor(1, Math.min(devicePixelRatio || 1, tier === 2 ? 2 : 1.5), d => { dpr = d; resize(); });
    new ResizeObserver(resize).observe(stage);

    /* Survol / toucher */
    let hover = -1, hoverT = -1;
    const laneAt = (cx, cy) => { const r = stage.getBoundingClientRect(), x = cx - r.left, y = cy - r.top; if (x < plot.x0 - 10 || x > plot.x1 + 10 || y < plot.y0 || y > plot.y1) return -1; return Math.min(lanes.length - 1, Math.floor((y - plot.y0) / plot.lh)); };
    function setHover(i, cx, cy) {
      hover = i; stage.classList.toggle('is-hover', i >= 0);
      if (i < 0) { tip.hidden = true; draw(); return; }
      const l = lanes[i], r = stage.getBoundingClientRect(), s = sens(l.pct);
      tip.innerHTML = `<b>${esc(l.nom)}</b><span>${rng(l.now)} F / ${esc(l.unite)}</span><i class="delta delta--${s > 0 ? 'up' : s < 0 ? 'down' : 'flat'}">${pctTxt(l.pct)}</i>`;
      tip.hidden = false;
      const x = Math.min(Wd - tip.offsetWidth - 12, Math.max(12, cx - r.left + 16)), y = Math.max(8, plot.y0 + (i + 0.5) * plot.lh - tip.offsetHeight - 12);
      tip.style.transform = `translate3d(${x.toFixed(0)}px,${y.toFixed(0)}px,0)`;
      draw();
    }
    const ouvrir = i => { const b = document.querySelector(`#pxHeat [data-id="${CSS.escape(lanes[i].id)}"]`); if (b) b.click(); };
    stage.addEventListener('pointermove', e => { if (e.pointerType === 'mouse') setHover(laneAt(e.clientX, e.clientY), e.clientX, e.clientY); }, { passive: true });
    stage.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') setHover(-1); });
    stage.addEventListener('click', e => {
      const i = laneAt(e.clientX, e.clientY); if (i < 0) { setHover(-1); return; }
      if (e.pointerType === 'mouse' || hoverT === i) { ouvrir(i); hoverT = -1; return; }
      hoverT = i; setHover(i, e.clientX, e.clientY);                 // toucher : 1er appui = aperçu, 2e = historique
    });

    let t = 0, drawStart = -1;
    function frame(dt) {
      gov(dt); t += dt;
      if (drawStart < 0) drawStart = t;
      U.uDraw.value = GL.sstep(0, 1.8, t - drawStart) * 1.001;
      U.uTime.value = t; U.uHover.value = hover;
      renderer.render(scene, cam);
    }
    function draw() { if (reduced) { U.uHover.value = hover; renderer.render(scene, cam); } }
    resize();
    root.classList.add('is-gl');
    if (!reduced) GL.loop(stage, frame);
  }
})();
