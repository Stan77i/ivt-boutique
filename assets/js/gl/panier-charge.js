/* IVT — Panier : « Votre chargement »
   La commande devient un tas de récolte : un point par part de valeur, coloré d'après la photo
   du produit. Ajout → les points tombent sur le tas ; retrait → ils s'envolent. Branché uniquement
   sur 'ivt:panier' et IVT_APP.lignesPanier() ; la légende (noms, %) reste en DOM. */
(() => {
  const A = typeof IVT_APP !== 'undefined' ? IVT_APP : null, GL = window.IVT_GL;
  const root = document.getElementById('charge');
  if (!A || !GL || !root || !GL.supports()) { root && root.remove(); return; }
  const legend = root.querySelector('.charge__leg'), canvas = root.querySelector('.charge__canvas');
  const reduced = GL.reduced(), tier = GL.tier(), TOTAL = [260, 420, 640][tier];
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const couleurs = {};
  function couleur(p) {
    if (couleurs[p.slug]) return Promise.resolve(couleurs[p.slug]);
    return new Promise(ok => {
      const im = new Image(); im.src = A.imageWebpDe(p);
      im.onload = () => {
        const c = document.createElement('canvas'); c.width = c.height = 24; const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(im, 0, 0, 24, 24);
        const d = x.getImageData(0, 0, 24, 24).data; let r = 0, g = 0, b = 0, n = 0;
        for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 200) { r += d[i]; g += d[i + 1]; b += d[i + 2]; n++; }
        const k = n ? 1 / (n * 255) : 0, col = n ? [r * k, g * k, b * k] : GL.C.greenLight;
        const lum = 0.3 * col[0] + 0.59 * col[1] + 0.11 * col[2], lift = lum < 0.35 ? 0.35 / Math.max(0.05, lum) : 1;   // lisible sur fond sombre
        ok(couleurs[p.slug] = col.map(v => Math.min(1, v * Math.min(2.2, lift))));
      };
      im.onerror = () => ok(couleurs[p.slug] = GL.C.greenLight);
    });
  }
  const rnd = s => { const x = Math.sin(s * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

  GL.three().then(THREE => {
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, premultipliedAlpha: true });
    renderer.setClearColor(0x000000, 0);
    const scene = new THREE.Scene(), cam = new THREE.OrthographicCamera(-1.1, 1.1, 1.05, -0.08, 0, 1);
    const geo = new THREE.BufferGeometry();
    const U = { uTime: { value: 0 }, uPix: { value: 3 } };
    const pts = new THREE.Points(geo, new THREE.ShaderMaterial({
      uniforms: U, transparent: true, depthTest: false,
      vertexShader: `uniform float uTime,uPix;attribute vec3 aFrom;attribute vec3 aCol;attribute vec3 aT;varying vec3 vCol;varying float vA;
void main(){
  float k=clamp((uTime-aT.x)/.95,0.,1.);float e=aT.z>.5?k*k:1.-pow(1.-k,3.);
  vec3 p=mix(aFrom,position,e);
  if(aT.z<.5&&aT.y>0.) p.y+=abs(sin(k*3.14159))*.06*(1.-k)*aT.y;
  vA=aT.z>.5?1.-k:1.;vCol=aCol;
  gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);gl_PointSize=uPix;
}`,
      fragmentShader: `varying vec3 vCol;varying float vA;void main(){vec2 c=gl_PointCoord-.5;float d=length(c);if(d>.5)discard;gl_FragColor=vec4(vCol*vA,vA*smoothstep(.5,.2,d));}`
    }));
    pts.frustumCulled = false; scene.add(pts);

    let parts = [], seed = 1, t = 0, dpr = 1, dirty = true;
    const now = () => reduced ? t - 99 : t;
    const posAt = q => { const k = Math.min(1, Math.max(0, (t - q.t0) / 0.95)), e = q.dead ? k * k : 1 - Math.pow(1 - k, 3); return q.from.map((v, i) => v + (q.to[i] - v) * e); };
    const hauteur = x => 0.92 * Math.pow(Math.max(0, 1 - x * x), 0.75);

    async function maj() {
      const lignes = A.lignesPanier(), tot = lignes.reduce((s, l) => s + l.total, 0);
      parts = parts.filter(q => !(q.dead && t - q.t0 > 1));
      if (!tot) { parts.forEach(q => { if (!q.dead) { q.from = posAt(q); q.to = [q.from[0], q.from[1] + 0.5, 0]; q.t0 = t; q.dead = true; } }); legend.innerHTML = ''; dirty = true; return; }
      const cols = await Promise.all(lignes.map(l => couleur(l.produit)));
      let acc = -1;
      const bands = lignes.map((l, i) => { const share = l.total / tot, w = share * 2, b = { slug: l.produit.slug, nom: l.produit.nom, share, col: cols[i], x0: acc, x1: acc + w, n: Math.max(4, Math.round(TOTAL * share)) }; acc += w; return b; });
      bands.forEach(b => {
        const mine = parts.filter(q => q.slug === b.slug && !q.dead);
        for (let k = mine.length; k < b.n; k++) { const s = seed++, q = { slug: b.slug, s, col: b.col, from: [(rnd(s) - 0.5) * 1.6, 1.1 + rnd(s + 9) * 0.4, 0], to: null, t0: now() + rnd(s + 3) * 0.35, dead: false, fall: 1 }; parts.push(q); mine.push(q); }
        mine.slice(b.n).forEach(q => { q.from = posAt(q); q.to = [q.from[0] + (rnd(q.s) - 0.5) * 0.3, q.from[1] + 0.55, 0]; q.t0 = now(); q.dead = true; });
        mine.slice(0, b.n).forEach((q, k) => {
          const x = b.x0 + (b.x1 - b.x0) * ((k + rnd(q.s + 1)) / b.n), y = hauteur(x) * Math.sqrt(rnd(q.s + 2));
          const to = [x, y, 0];
          if (q.to) { q.from = posAt(q); q.t0 = now(); q.fall = 0; }
          q.to = to; q.col = b.col;
        });
      });
      parts.forEach(q => { if (!q.dead && !bands.some(b => b.slug === q.slug)) { q.from = posAt(q); q.to = [q.from[0], q.from[1] + 0.55, 0]; q.t0 = now(); q.dead = true; } });
      legend.innerHTML = bands.map(b => `<li><i style="background:rgb(${b.col.map(v => Math.round(v * 255)).join(',')})"></i>${esc(b.nom)}<b>${Math.round(b.share * 100)} %</b></li>`).join('');
      dirty = true;
    }
    function upload() {
      const n = parts.length, P = new Float32Array(n * 3), F = new Float32Array(n * 3), Cc = new Float32Array(n * 3), T = new Float32Array(n * 3);
      parts.forEach((q, i) => { P.set(q.to, i * 3); F.set(q.from, i * 3); Cc.set(q.col, i * 3); T.set([q.t0, q.fall, q.dead ? 1 : 0], i * 3); });
      geo.setAttribute('position', new THREE.BufferAttribute(P, 3)); geo.setAttribute('aFrom', new THREE.BufferAttribute(F, 3));
      geo.setAttribute('aCol', new THREE.BufferAttribute(Cc, 3)); geo.setAttribute('aT', new THREE.BufferAttribute(T, 3));
      geo.setDrawRange(0, n); dirty = false;
    }
    const resize = () => {
      const r = canvas.getBoundingClientRect(); if (!r.width) return;
      renderer.setPixelRatio(dpr); renderer.setSize(r.width, r.height, false);
      const a = r.width / r.height, h = 1.13, w = h * a / 2;
      cam.left = -w; cam.right = w; cam.updateProjectionMatrix();
      U.uPix.value = Math.max(2, r.width / 120) * dpr;
    };
    dpr = Math.min(devicePixelRatio || 1, 2);
    new ResizeObserver(resize).observe(canvas); resize();
    document.addEventListener('ivt:panier', maj);
    maj();
    const frame = dt => { t += dt; if (dirty) upload(); U.uTime.value = t; renderer.render(scene, cam); };
    root.classList.add('is-gl');
    GL.loop(canvas, frame);
  }).catch(e => { console.warn('[panier-charge] masqué', e); root.remove(); });
})();
