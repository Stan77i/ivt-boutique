/* IVT — <ivt-terroir> : scène WebGL pilotée par le scroll et par le produit choisi.
   Données : window.IVT_GEO (data/geo.js). Shaders : window.IVT_GLSL (terroir-glsl.js).
   Événements : 'ivt:product' {slug} (produit choisi), 'ivt:focus' {slug|null} (survol), 'ivt:accent' {accent}.
   Lit dans la page : [data-chapter], [data-produit], [data-gl-cover], [data-gl-stop]. */
(function () {
  if (customElements.get('ivt-terroir')) return;
  const THREE_URL = 'https://unpkg.com/three@0.160.0/build/three.module.js';
  const LON0 = -5.4, LAT0 = 7.5;                     // centre de projection (équirectangulaire locale)
  const KX = Math.cos(7.5 * Math.PI / 180);          // 1° de longitude ≈ 0,99° de latitude à 7,5° N
  const W = (lon, lat) => [(lon - LON0) * KX, -(lat - LAT0)];
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
  const band = (s, a, b, f) => sstep(a - f, a + f, s) * (1 - sstep(b - f, b + f, s));

  class IvtTerroir extends HTMLElement {
    connectedCallback() {
      if (this._init) return; this._init = true;
      Object.assign(this.style, { position:'fixed', inset:'0', zIndex:'0', display:'block', pointerEvents:'none',
        background:'radial-gradient(120% 90% at 62% 42%, #0B3D2A 0%, #062A1C 55%, #031A11 100%)' });
      this.labelsEl = document.createElement('div');
      Object.assign(this.labelsEl.style, { position:'absolute', inset:'0', overflow:'hidden' });
      this.appendChild(this.labelsEl);
      this.sel = window.__ivtSel || null; this.over = null;
      addEventListener('ivt:product', this._onProd = e => { this.sel = (e.detail || {}).slug || null; this.wake && this.wake(); });
      addEventListener('ivt:focus', this._onFocus = e => { this.over = (e.detail || {}).slug || null; this.wake && this.wake(); });
      addEventListener('ivt:accent', this._onAcc = e => { if (e.detail && e.detail.accent) this.setAccent(e.detail.accent); });
      const start = () => this.boot().catch(e => { console.warn('[ivt-terroir] fallback', e); this.setAttribute('data-fallback', ''); });
      ('requestIdleCallback' in window) ? requestIdleCallback(start, { timeout: 900 }) : setTimeout(start, 250);
    }
    disconnectedCallback() {
      this.dead = true; cancelAnimationFrame(this.raf); this.cleanup && this.cleanup();
      removeEventListener('ivt:product', this._onProd); removeEventListener('ivt:focus', this._onFocus); removeEventListener('ivt:accent', this._onAcc);
    }

    async boot() {
      const c = document.createElement('canvas');
      if (!(c.getContext('webgl2') || c.getContext('webgl'))) throw new Error('no webgl');
      if (!window.IVT_GEO || !window.IVT_GLSL) throw new Error('geo/glsl manquants');
      const THREE = await import(THREE_URL);
      if (this.dead) return;
      this.T = THREE;
      this.mobile = matchMedia('(max-width: 720px)').matches || matchMedia('(pointer: coarse)').matches;
      this.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
      this.maxDpr = Math.min(window.devicePixelRatio || 1, this.mobile ? 1.5 : 2);
      this.dpr = Math.min(this.maxDpr, 1.5);
      const r = this.renderer = new THREE.WebGLRenderer({ antialias: !this.mobile, alpha: true, powerPreference: 'high-performance' });
      r.setPixelRatio(this.dpr); r.setClearColor(0x000000, 0);
      Object.assign(r.domElement.style, { position:'absolute', inset:'0', width:'100%', height:'100%', opacity:'0', transition:'opacity 1.6s cubic-bezier(.22,1,.36,1)' });
      this.insertBefore(r.domElement, this.labelsEl);
      this.scene = new THREE.Scene();
      this.cam = new THREE.PerspectiveCamera(38, 1, 0.01, 60);

      this.buildData(); this.buildUniforms();
      this.buildTerrain(); this.buildOutline(); this.buildFlows(); this.buildZones();
      this.buildSeeds(); this.buildCity(); this.buildColumns(); this.buildLabels();

      const V = THREE.Vector3;
      this.mouseN = new THREE.Vector2(); this.mouseS = new THREE.Vector2(); this.mouseW = new V(9, 0, 9);
      this.ray = new THREE.Raycaster(); this.plane = new THREE.Plane(new V(0, 1, 0), 0);
      this.camPos = new V(); this.camLook = new V(); this.tP = new V(); this.tL = new V(); this.hit = new V();
      this.focusS = new THREE.Vector2(9, 9); this.sS = 0; this.time = 0; this.intro = 0; this.moveBoost = 0;
      this.hiZ = new Array(this.NN).fill(0.5); this.hiR = new Array(this.NR).fill(0.5);
      this.lift = 0; this.lastKey = null; this.frames = 0; this.acc = 0; this.lastAdapt = 0; this.first = true;

      const onMove = e => { this.mouseN.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); this.moveBoost = 1; };
      const onResize = () => this.resize(), onWake = () => this.wake();
      addEventListener('pointermove', onMove, { passive: true }); addEventListener('resize', onResize);
      addEventListener('scroll', onWake, { passive: true }); document.addEventListener('visibilitychange', onWake);
      this.cleanup = () => { removeEventListener('pointermove', onMove); removeEventListener('resize', onResize); removeEventListener('scroll', onWake); document.removeEventListener('visibilitychange', onWake); r.dispose(); };
      if (window.__ivtAccent) this.setAccent(window.__ivtAccent);
      this.loop = this.loop.bind(this); this.running = true; this.resize();
      this.last = performance.now(); this.raf = requestAnimationFrame(this.loop);
      requestAnimationFrame(() => { r.domElement.style.opacity = '1'; });
    }

    /* ---------- Données : tout vient de IVT_GEO ---------- */
    buildData() {
      const G = window.IVT_GEO, T = this.T;
      this.geo = {}; G.all().forEach(g => { if (g) this.geo[g.slug] = g; });
      const nodes = [], idx = {}, count = {};
      const addNode = (key, o, kind) => { if (key in idx) return idx[key]; idx[key] = nodes.length; const [x, z] = W(o.lon, o.lat); nodes.push({ key, o, kind, x, z }); return idx[key]; };
      Object.values(this.geo).forEach(g => g.zones.forEach(z => { addNode('p:' + z.key, z, z.precision === 'pays' ? 1 : 0); count['p:' + z.key] = (count['p:' + z.key] || 0) + 1; }));
      Object.values(this.geo).forEach(g => g.markets.forEach(m => addNode('m:' + m.key, m, 2)));
      const routes = [], ridx = {};
      Object.values(this.geo).forEach(g => g.flows.forEach(f => {
        const k = f.from + '>' + f.to;
        if (!(k in ridx)) { ridx[k] = routes.length; routes.push({ k, a: idx['p:' + f.from], b: idx['m:' + f.to], n: 0 }); }
        routes[ridx[k]].n++;
      }));
      routes.forEach(rt => {
        const A = nodes[rt.a], B = nodes[rt.b], dx = B.x - A.x, dz = B.z - A.z, len = Math.hypot(dx, dz);
        rt.len = len; rt.p0 = new T.Vector3(A.x, 0.05, A.z); rt.p2 = new T.Vector3(B.x, 0.04, B.z);
        rt.p1 = new T.Vector3(A.x + dx * 0.5 - dz * 0.08, 0.10 + len * 0.13, A.z + dz * 0.5 + dx * 0.08);
      });
      Object.values(this.geo).forEach(g => {
        g._z = g.zones.map(z => idx['p:' + z.key]);
        g._m = g.markets.map(m => idx['m:' + m.key]);
        g._r = g.flows.map(f => ridx[f.from + '>' + f.to]);
        const pr = G.primary(g); g._p = pr ? idx['p:' + pr.key] : -1;
        const rk = pr ? ridx[pr.key + '>adjame'] : undefined; g._pr = rk === undefined ? -1 : rk;
      });
      this.nodes = nodes; this.nidx = idx; this.count = count; this.routes = routes;
      this.NN = Math.max(1, nodes.length); this.NR = Math.max(1, routes.length);
      this.poly = G.outline.map(p => W(p[0], p[1]));
      const man = G.places.man; this.manXZ = W(man.lon, man.lat);
    }
    geoOf(slug) { return slug ? this.geo[slug] || null : null; }

    buildUniforms() {
      const T = this.T;
      this.U = {
        uTime:{value:0}, uPix:{value:1}, uFocus:{value:0}, uPhase:{value:0}, uIntro:{value:0}, uFlow:{value:1}, uRate:{value:1},
        uCity:{value:0.3}, uData:{value:0}, uSeedVis:{value:0}, uAccentMix:{value:0},
        uFocusPos:{value:new T.Vector2(9, 9)}, uMan:{value:new T.Vector2(...this.manXZ)}, uMouse:{value:new T.Vector3(9,0,9)},
        uCollect:{value:new T.Vector3()}, uAccent:{value:new T.Color(0x8CC63F)},
        uHiZ:{value:new Array(this.NN).fill(0.5)}, uHiR:{value:new Array(this.NR).fill(0.5)}
      };
      this.defines = { NN: this.NN, NR: this.NR };
    }
    mat(vs, fs, additive) {
      const T = this.T;
      return new T.ShaderMaterial({ uniforms: this.U, defines: this.defines, vertexShader: IVT_GLSL.COMMON + vs, fragmentShader: fs,
        transparent: true, depthWrite: false, blending: additive ? T.AdditiveBlending : T.NormalBlending });
    }
    setAccent(hex) {
      if (!this.U) { window.__ivtAccent = hex; return; }
      try { const c = new this.T.Color(String(hex).trim()), h = {}; c.getHSL(h); c.setHSL(h.h, Math.min(1, h.s * 1.1), Math.max(0.55, h.l)); this.U.uAccent.value.copy(c); } catch (e) {}
    }
    inside(x, z) {
      const P = this.poly; let c = false;
      for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
        const [xi, zi] = P[i], [xj, zj] = P[j];
        if (((zi > z) !== (zj > z)) && (x < (xj - xi) * (z - zi) / (zj - zi) + xi)) c = !c;
      }
      return c;
    }

    /* ---------- Géométries ---------- */
    buildTerrain() {
      const T = this.T, step = this.mobile ? 0.07 : 0.042, pos = [], ain = [], rnd = [];
      for (let x = -3.4; x <= 3.4; x += step) for (let z = -3.4; z <= 3.3; z += step) {
        const jx = x + (Math.random() - 0.5) * step * 0.35, jz = z + (Math.random() - 0.5) * step * 0.35, ins = this.inside(jx, jz);
        if (!ins && (jz > 2.0 || Math.random() > 0.22)) continue;
        pos.push(jx, 0, jz); ain.push(ins ? 1 : 0); rnd.push(Math.random());
      }
      const g = new T.BufferGeometry();
      g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
      g.setAttribute('aIn', new T.Float32BufferAttribute(ain, 1));
      g.setAttribute('aRnd', new T.Float32BufferAttribute(rnd, 1));
      this.scene.add(new T.Points(g, this.mat(IVT_GLSL.TERRAIN_V, IVT_GLSL.DOT_FRAG)));
    }
    buildOutline() {
      const T = this.T, g = new T.BufferGeometry().setFromPoints(this.poly.map(([x, z]) => new T.Vector3(x, 0.035, z)));
      this.outlineMat = new T.LineBasicMaterial({ color: 0xC3D6CB, transparent: true, opacity: 0, depthWrite: false });
      this.scene.add(new T.LineLoop(g, this.outlineMat));
    }
    bz(r, t, v) { return v.set(0,0,0).addScaledVector(r.p0,(1-t)*(1-t)).addScaledVector(r.p1,2*(1-t)*t).addScaledVector(r.p2,t*t); }
    buildFlows() {
      const T = this.T, SEG = 40, lp = [], lt = [], lr = [], a = new T.Vector3(), b = new T.Vector3();
      this.routes.forEach((r, i) => { for (let k = 0; k < SEG; k++) { const t0 = k / SEG, t1 = (k + 1) / SEG; this.bz(r, t0, a); this.bz(r, t1, b); lp.push(a.x,a.y,a.z,b.x,b.y,b.z); lt.push(t0, t1); lr.push(i, i); } });
      const lg = new T.BufferGeometry();
      lg.setAttribute('position', new T.Float32BufferAttribute(lp, 3));
      lg.setAttribute('aT', new T.Float32BufferAttribute(lt, 1));
      lg.setAttribute('aR', new T.Float32BufferAttribute(lr, 1));
      this.scene.add(new T.LineSegments(lg, this.mat(IVT_GLSL.LINE_V, IVT_GLSL.FLAT_FRAG, true)));
      const base = this.mobile ? 10 : 26, P0 = [], P1 = [], P2 = [], sd = [], rr = [], off = [];
      this.routes.forEach((r, i) => {
        const n = Math.round(base * (0.6 + r.n) * clamp(r.len / 2.2, 0.45, 1.3));
        for (let k = 0; k < n; k++) { P0.push(r.p0.x,r.p0.y,r.p0.z); P1.push(r.p1.x,r.p1.y,r.p1.z); P2.push(r.p2.x,r.p2.y,r.p2.z); sd.push(Math.random()); rr.push(i); off.push(Math.random()*2-1); }
      });
      const pg = new T.BufferGeometry();
      pg.setAttribute('position', new T.Float32BufferAttribute(P0, 3));
      pg.setAttribute('aP1', new T.Float32BufferAttribute(P1, 3));
      pg.setAttribute('aP2', new T.Float32BufferAttribute(P2, 3));
      pg.setAttribute('aSeed', new T.Float32BufferAttribute(sd, 1));
      pg.setAttribute('aR', new T.Float32BufferAttribute(rr, 1));
      pg.setAttribute('aOff', new T.Float32BufferAttribute(off, 1));
      const pts = new T.Points(pg, this.mat(IVT_GLSL.PART_V, IVT_GLSL.DOT_FRAG, true)); pts.renderOrder = 3; this.scene.add(pts);
    }
    buildZones() {
      const T = this.T, pos = [], idx = [], kind = [], stag = [];
      const adj = this.nodes[this.nidx['m:adjame']] || { x: 0, z: 0 };
      const far = Math.max(...this.nodes.map(n => Math.hypot(n.x - adj.x, n.z - adj.z)), 1);
      this.nodes.forEach((n, i) => { pos.push(n.x, n.kind === 2 ? 0.07 : 0.06, n.z); idx.push(i); kind.push(n.kind); stag.push(n.kind === 2 ? 1 : 1 - Math.hypot(n.x - adj.x, n.z - adj.z) / far); });
      const g = new T.BufferGeometry();
      g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
      g.setAttribute('aIdx', new T.Float32BufferAttribute(idx, 1));
      g.setAttribute('aKind', new T.Float32BufferAttribute(kind, 1));
      g.setAttribute('aStag', new T.Float32BufferAttribute(stag, 1));
      const p = new T.Points(g, this.mat(IVT_GLSL.ZONE_V, IVT_GLSL.ZONE_F, true)); p.renderOrder = 4; this.scene.add(p);
    }
    buildSeeds() {
      const T = this.T, cols = this.mobile ? 34 : 64, rows = this.mobile ? 24 : 40, pos = [], rnd = [];
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        pos.push((c / cols - 0.5) * 0.85 + (Math.random() - .5) * 0.006, 0, (r / rows - 0.5) * 0.55 + (Math.random() - .5) * 0.004); rnd.push(Math.random());
      }
      const g = new T.BufferGeometry();
      g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
      g.setAttribute('aRnd', new T.Float32BufferAttribute(rnd, 1));
      const p = new T.Points(g, this.mat(IVT_GLSL.SEED_V, IVT_GLSL.DOT_FRAG)); p.renderOrder = 5; p.frustumCulled = false; this.scene.add(p);
    }
    buildCity() {
      const T = this.T, D = this.nodes[this.nidx['m:adjame']]; if (!D) return;
      const n = this.mobile ? 170 : 460, g = new T.BoxGeometry(1, 1, 1); g.translate(0, 0.5, 0);
      const mesh = new T.InstancedMesh(g, new T.ShaderMaterial({ uniforms: this.U, defines: this.defines, vertexShader: IVT_GLSL.COMMON + IVT_GLSL.CITY_V, fragmentShader: IVT_GLSL.CITY_F }), n);
      const m4 = new T.Matrix4(), q = new T.Quaternion(), s = new T.Vector3(), p = new T.Vector3(), aD = new Float32Array(n), up = new T.Vector3(0, 1, 0);
      let k = 0, guard = 0;
      while (k < n && guard++ < n * 20) {
        const a = Math.random() * Math.PI * 2, rr = Math.pow(Math.random(), 0.7) * 0.34;
        const x = D.x + Math.cos(a) * rr * 1.25, z = D.z + Math.sin(a) * rr * 0.9 - 0.06;
        if (!this.inside(x, z) || Math.abs(z - (D.z + 0.035)) < 0.012) continue;
        const d = clamp(rr / 0.34), w = 0.011 + Math.random() * 0.016;
        s.set(w, 0.012 + Math.pow(1 - d, 2.2) * (0.05 + Math.random() * 0.13) + Math.random() * 0.02, w * (0.7 + Math.random() * 0.6));
        q.setFromAxisAngle(up, (Math.random() - 0.5) * 0.3); p.set(x, 0, z); m4.compose(p, q, s); mesh.setMatrixAt(k, m4); aD[k] = d; k++;
      }
      mesh.count = k; g.setAttribute('aD', new T.InstancedBufferAttribute(aD, 1)); mesh.frustumCulled = false; this.scene.add(mesh);
    }
    buildColumns() {
      const T = this.T, list = this.nodes.map((n, i) => [n, i]).filter(([n]) => n.kind !== 2 && this.count[n.key]);
      if (!list.length) return;
      const g = new T.BoxGeometry(1, 1, 1); g.translate(0, 0.5, 0);
      const mesh = new T.InstancedMesh(g, this.mat(IVT_GLSL.COL_V, IVT_GLSL.FLAT_FRAG, true), list.length);
      const m4 = new T.Matrix4(), aH = new Float32Array(list.length), aN = new Float32Array(list.length);
      this.colH = {};
      list.forEach(([n, i], j) => { m4.makeScale(0.026, 1, 0.026).setPosition(n.x, 0.05, n.z); mesh.setMatrixAt(j, m4); aH[j] = this.count[n.key] * 0.075; aN[j] = i; this.colH[i] = aH[j]; });
      g.setAttribute('aH', new T.InstancedBufferAttribute(aH, 1)); g.setAttribute('aNode', new T.InstancedBufferAttribute(aN, 1));
      mesh.frustumCulled = false; mesh.renderOrder = 6; this.scene.add(mesh);
    }
    buildLabels() {
      const T = this.T;
      const ranked = this.nodes.map((n, i) => [i, this.count[n.key] || 0]).filter(x => x[1] > 0).sort((a, b) => b[1] - a[1]);
      this.topSet = new Set(ranked.slice(0, this.mobile ? 6 : 12).map(x => x[0]));
      this.labels = this.nodes.map((n, i) => {
        const el = document.createElement('div');
        Object.assign(el.style, { position:'absolute', left:'0', top:'0', font:'500 10px/1.2 Jost, system-ui, sans-serif', letterSpacing:'0.16em', textTransform:'uppercase',
          color: n.kind === 2 ? '#F2F7F4' : n.kind === 1 ? '#EBC98F' : '#C3D6CB', whiteSpace:'nowrap', opacity:'0', willChange:'transform,opacity', textShadow:'0 1px 8px rgba(3,26,17,.95)' });
        this.labelsEl.appendChild(el);
        return { i, n, p: new T.Vector3(n.x, 0.08, n.z), a: 0, el, txt: '' };
      });
    }
    labelText(L, mode) {
      const n = L.n;
      if (n.kind === 2) return n.o.court + (n.key === 'm:adjame' ? ' · marché de gros' : ' · marché');
      const base = n.kind === 1 ? n.o.nom + ' · import' : n.o.nom;
      if (mode === 'data') { const c = this.count[n.key] || 0; return base + ' — ' + c + (c > 1 ? ' produits' : ' produit'); }
      return base;
    }

    resize() {
      if (!this.renderer) return;
      this.renderer.setSize(innerWidth, innerHeight, false); this.cam.aspect = innerWidth / innerHeight;
      this.cam.fov = this.cam.aspect < 1 ? 50 : 38; this.cam.updateProjectionMatrix(); this.wake();
    }
    wake() { if (!this.renderer || this.dead) return; if (!this.running && !document.hidden) { this.running = true; this.last = performance.now(); this.raf = requestAnimationFrame(this.loop); } }

    readStory() {
      const mid = innerHeight * 0.5; let s = 0;
      document.querySelectorAll('[data-chapter]').forEach(el => { const r = el.getBoundingClientRect(); if (r.top <= mid) s = +el.dataset.chapter + clamp((mid - r.top) / Math.max(1, r.height)); });
      let blk = null;
      document.querySelectorAll('[data-produit]').forEach(el => { const r = el.getBoundingClientRect(); if (r.top <= mid && r.bottom > mid) blk = el.dataset.produit; });
      this.blk = blk;
      const stop = document.querySelector('[data-gl-stop]'), cov = document.querySelector('[data-gl-cover]');
      const hid = cov ? cov.getBoundingClientRect().bottom >= innerHeight - 2 : false;
      if (!hid) this.introOn = true;
      this.covered = hid || (stop ? stop.getBoundingClientRect().top <= 0 : false);
      return s;
    }

    /* ---------- Caméra : cadrage calculé depuis la géographie ---------- */
    frame(g, outP, outL) {
      const pts = [];
      if (g) { g._z.forEach(i => pts.push([this.nodes[i], 1])); g._m.forEach(i => pts.push([this.nodes[i], 0.6])); }
      if (!pts.length) { outP.set(0.1, 6.6, 6.0); outL.set(0.0, 0, 0.35); return; }
      let sx = 0, sz = 0, sw = 0; pts.forEach(([n, w]) => { sx += n.x * w; sz += n.z * w; sw += w; });
      const cx = sx / sw, cz = sz / sw; let ext = 0; pts.forEach(([n]) => { ext = Math.max(ext, Math.hypot(n.x - cx, n.z - cz)); });
      const d = clamp(1.7 + ext * 2.3, 1.8, 8.8), sh = this.cam.aspect > 1 ? d * 0.16 : 0;
      outL.set(cx - sh, 0, cz + (this.cam.aspect > 1 ? 0 : d * 0.08));
      outP.set(outL.x + d * 0.06, d * 0.8, outL.z + d * 0.6);
    }
    chapterTarget(ch, l, cur, outP, outL) {
      const g = cur;
      if (ch <= 0 || ch === 2) return this.frame(g, outP, outL);
      if (ch === 1) {
        const F = this.focusS; if (!this.hasFocus) return this.frame(g, outP, outL);
        const k = sstep(0, 0.6, l), k2 = sstep(0.7, 1, l);
        outP.set(F.x + 1.0 - 0.25 * k + 0.15 * k2, 0.95 - 0.33 * k + 0.13 * k2, F.y + 1.3 - 0.25 * k + 0.15 * k2);
        outL.set(F.x + 0.02 + 0.2 * k2, 0, F.y + 0.05 + 0.2 * k2); return;
      }
      if (ch === 3) {
        const r = g && g._pr >= 0 ? this.routes[g._pr] : null;
        if (!r) return this.frame(g, outP, outL);
        const tt = sstep(0, 1, l), p = this.bz(r, tt, new this.T.Vector3()), ah = this.bz(r, Math.min(1, tt + 0.18), new this.T.Vector3());
        const dir = ah.clone().sub(p).setY(0); if (dir.lengthSq() < 1e-6) dir.set(0, 0, 1); dir.normalize();
        const side = new this.T.Vector3(-dir.z, 0, dir.x);
        outP.copy(p).addScaledVector(dir, -0.75 + tt * 0.25).addScaledVector(side, 0.25).add(new this.T.Vector3(0, 0.42 - tt * 0.12, 0));
        outL.copy(tt > 0.8 ? ah.clone().lerp(r.p2, (tt - 0.8) / 0.2) : ah); return;
      }
      if (ch === 4) { const k = sstep(0, 1, l); outP.set(-0.9 + 1.15 * k, 3.9 - 0.4 * k, 4.6 + 0.3 * k); outL.set(0.25, 0, 0.35); return; }
      outP.set(0.3, 6.8, 6.2); outL.set(0.35, 0, 0.6);
    }
    camTarget(s, cur) {
      const ch = Math.floor(s), l = s - ch;
      this.chapterTarget(ch, l, cur, this.tP, this.tL);
      const w = sstep(0.86, 1.0, l);
      if (w > 0) { const P = new this.T.Vector3(), L = new this.T.Vector3(); this.chapterTarget(ch + 1, 0, cur, P, L); this.tP.lerp(P, w); this.tL.lerp(L, w); }
      if (this.cam.aspect < 1) { const d = this.tP.clone().sub(this.tL); this.tP.copy(this.tL).addScaledVector(d, 1 + (1 / this.cam.aspect - 1) * 0.45); }
    }

    loop(now) {
      if (this.dead) return;
      const dt = Math.min(0.05, (now - this.last) / 1000); this.last = now;
      const sT = this.readStory();
      if (document.hidden || this.covered) { this.running = false; return; }
      this.running = true;
      const U = this.U;
      this.time += dt * (this.reduced ? 0.25 : 1);
      this.sS += (sT - this.sS) * (1 - Math.exp(-dt * (this.reduced ? 8 : 2.6))); const s = this.sS;
      this.moveBoost *= Math.exp(-dt * 2);
      if (this.introOn) this.intro = this.reduced ? 3.2 : Math.min(3.2, this.intro + dt * (0.8 + this.moveBoost * 1.2));

      // Produit courant : survol du ticker > bloc produit à l'écran > produit choisi dans la roue
      const cur = this.geoOf(this.over) || this.geoOf(this.blk) || this.geoOf(this.sel);
      const selG = this.geoOf(this.sel) || cur;
      const prod = band(s, 0.9, 2.05, 0.12), inFlux = s >= 3 && s < 4;
      const g = (prod > 0.5 || inFlux) ? selG : cur;
      const key = g ? g.slug : '';
      if (key !== this.lastKey) { if (this.lastKey !== null) this.lift = 1; this.lastKey = key; }

      // Foyer de production (chapitre producteur) : zone principale réelle, jamais une ville par défaut
      const pi = g ? g._p : -1; this.hasFocus = pi >= 0 && this.nodes[pi].kind === 0;
      if (this.hasFocus) {
        const n = this.nodes[pi]; if (this.focusS.x > 8) this.focusS.set(n.x, n.z);
        this.focusS.lerp({ x: n.x, y: n.z }, 1 - Math.exp(-dt * 2));
        const A = this.nodes[this.nidx['m:adjame']], dx = A.x - this.focusS.x, dz = A.z - this.focusS.y, dl = Math.hypot(dx, dz) || 1;
        U.uCollect.value.set(this.focusS.x + dx / dl * 0.38, 0.05, this.focusS.y + dz / dl * 0.38);
      }
      U.uFocusPos.value.set(this.focusS.x, this.focusS.y);

      U.uTime.value = this.time; U.uPix.value = this.dpr; U.uIntro.value = this.intro;
      const fv = this.hasFocus ? 1 : 0;
      U.uFocus.value = band(s, 0.85, 2.1, 0.18) * fv;
      U.uPhase.value = clamp((s - 1.0) * 4.3, 0, 4);
      U.uSeedVis.value = band(s, 0.9, 2.08, 0.1) * fv;
      U.uFlow.value = (1 - 0.8 * prod * fv) * (1 - 0.35 * band(s, 4.05, 5.0, 0.12));
      U.uCity.value = 0.32 + 0.68 * sstep(3.3, 3.9, s);
      U.uData.value = band(s, 4.0, 5.05, 0.12);
      U.uRate.value = 1 + 1.3 * band(s, 3.35, 4.0, 0.1);
      this.outlineMat.opacity = 0.22 * sstep(0.2, 1.0, this.intro) * (1 - 0.6 * prod * fv);

      const useSel = g && s < 4.0, zs = new Set(useSel ? g._z.concat(g._m) : []), rs = new Set(useSel ? g._r : []);
      const fluxR = inFlux && g ? g._pr : -1, hk = 1 - Math.exp(-dt * 3);
      for (let i = 0; i < this.NN; i++) {
        const n = this.nodes[i];
        let t = s >= 4 && s < 5 ? (this.count[n.key] ? 0.7 : 0.15) : useSel ? (zs.has(i) ? 1 : 0.05) : (n.kind === 2 ? 1 : 0.4);
        if (n.key === 'm:adjame') t = Math.max(t, 0.7);
        this.hiZ[i] += (t - this.hiZ[i]) * hk; U.uHiZ.value[i] = this.hiZ[i];
      }
      for (let i = 0; i < this.NR; i++) {
        let t = useSel ? (rs.has(i) ? (fluxR >= 0 ? (i === fluxR ? 1 : 0.3) : 1) : 0.03) : 0.4;
        this.hiR[i] += (t - this.hiR[i]) * hk; U.uHiR.value[i] = this.hiR[i];
      }
      U.uAccentMix.value += ((useSel ? 1 : 0) - U.uAccentMix.value) * hk;

      this.camTarget(s, g);
      const ck = 1 - Math.exp(-dt * (this.reduced ? 8 : 1.9));
      if (this.first) { this.camPos.copy(this.tP); this.camLook.copy(this.tL); this.first = false; this.lift = 0; }
      const gap = this.camPos.distanceTo(this.tP);
      this.camPos.lerp(this.tP, ck); this.camLook.lerp(this.tL, ck);
      this.lift = Math.max(0, this.lift - dt / 1.8);
      const arc = this.reduced ? 0 : Math.sin(Math.PI * (1 - this.lift)) * Math.min(1.6, gap * 0.35) * (this.lift > 0 ? 1 : 0);
      this.mouseS.lerp(this.mouseN, 1 - Math.exp(-dt * 1.8));
      const cam = this.cam, dist = this.camPos.distanceTo(this.camLook);
      cam.position.copy(this.camPos); cam.position.y += arc;
      cam.position.x += this.mouseS.x * 0.07 * dist; cam.position.y += this.mouseS.y * 0.035 * dist;
      cam.lookAt(this.camLook);
      if (!this.mobile) {
        this.ray.setFromCamera(this.mouseS, cam);
        if (this.ray.ray.intersectPlane(this.plane, this.hit)) this.mouseW.lerp(this.hit, 1 - Math.exp(-dt * 4));
        U.uMouse.value.copy(this.mouseW);
      }
      this.updateLabels(s, dt, g, useSel, zs, pi, fluxR);
      this.renderer.render(this.scene, cam);
      this.adapt(dt, now);
      this.raf = requestAnimationFrame(this.loop);
    }

    updateLabels(s, dt, g, useSel, zs, pi, fluxR) {
      const mode = s < 0.9 ? 'sel' : s < 2.0 ? 'prod' : s < 3.0 ? 'sel' : s < 4.0 ? 'flux' : s < 5.0 ? 'data' : 'fin';
      const w = innerWidth, h = innerHeight, v = new this.T.Vector3(), k = 1 - Math.exp(-dt * 5);
      const fr = fluxR >= 0 ? this.routes[fluxR] : null;
      this.labels.forEach(L => {
        const n = L.n; let t = 0;
        if (mode === 'sel') t = useSel ? (zs.has(L.i) ? 1 : 0) : (n.key === 'm:adjame' ? 1 : 0);
        else if (mode === 'prod') t = this.hasFocus ? (L.i === pi ? 1 : 0) : (zs.has(L.i) ? 1 : 0);
        else if (mode === 'flux') t = fr ? (L.i === fr.a || L.i === fr.b ? 1 : 0) : (n.key === 'm:adjame' ? 1 : 0);
        else if (mode === 'data') t = this.topSet.has(L.i) ? 0.95 : 0;
        else t = n.key === 'm:adjame' ? 1 : 0;
        if (mode !== L.mode) { const tx = this.labelText(L, mode); if (tx !== L.txt) { L.el.textContent = tx; L.txt = tx; } L.mode = mode; }
        L.a += (t - L.a) * k;
        if (L.a < 0.01) { if (L.el.style.opacity !== '0') L.el.style.opacity = '0'; return; }
        v.copy(L.p); if (mode === 'data' && this.colH && this.colH[L.i]) v.y += this.colH[L.i] * this.U.uData.value + 0.03;
        v.project(this.cam);
        if (v.z > 1) { L.el.style.opacity = '0'; return; }
        L.el.style.transform = `translate3d(${((v.x * 0.5 + 0.5) * w + 9).toFixed(1)}px, ${((-v.y * 0.5 + 0.5) * h - 7).toFixed(1)}px, 0)`;
        L.el.style.opacity = L.a.toFixed(3);
      });
    }
    adapt(dt, now) {
      this.acc += dt; this.frames++;
      if (now - this.lastAdapt < 1500) return;
      const avg = this.acc / this.frames; this.acc = 0; this.frames = 0; this.lastAdapt = now;
      let d = this.dpr;
      if (avg > 0.024 && d > 0.75) d = Math.max(0.75, d - 0.25); else if (avg < 0.0145 && d < this.maxDpr) d = Math.min(this.maxDpr, d + 0.25);
      if (d !== this.dpr) { this.dpr = d; this.renderer.setPixelRatio(d); this.renderer.setSize(innerWidth, innerHeight, false); }
    }
  }
  customElements.define('ivt-terroir', IvtTerroir);
})();
