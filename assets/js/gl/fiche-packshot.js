/* IVT — Fiche produit · packshot en relief
   Le visuel détouré devient une surface éclairée : profondeur tirée de la silhouette (alpha),
   parallaxe et lumière qui suivent le pointeur avec inertie, léger tassement quand le produit
   est ajouté au panier (écoute 'ivt:panier', lit IVT_APP.lignesPanier()). L'<img> reste en place
   pour le texte alternatif, le repli et la mise en page. */
(() => {
  const A = typeof IVT_APP !== 'undefined' ? IVT_APP : null, GL = window.IVT_GL;
  const stage = document.querySelector('.pdp__stage'), shot = document.querySelector('#pdpMedia .packshot');
  const img = shot && shot.querySelector('img');
  if (!A || !GL || !stage || !img || GL.reduced() || !GL.supports()) return;
  const slug = new URLSearchParams(location.search).get('p') || '';
  const ready = img.complete && img.naturalWidth ? Promise.resolve() : new Promise((ok, ko) => { img.addEventListener('load', ok, { once: true }); img.addEventListener('error', ko, { once: true }); });
  ready.then(boot).catch(e => console.warn('[fiche-packshot] repli image', e));

  function depthMap(N) {
    const c = document.createElement('canvas'); c.width = c.height = N;
    const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(img, 0, 0, N, N);
    const src = x.getImageData(0, 0, N, N).data; let a = new Float32Array(N * N), b = new Float32Array(N * N);
    for (let i = 0; i < N * N; i++) a[i] = src[i * 4 + 3] / 255;
    const R = Math.round(N * 0.05);
    for (let pass = 0; pass < 3; pass++) {           // flou boîte séparable ×3 ≈ gaussien : silhouette → dôme
      for (let y = 0; y < N; y++) for (let x0 = 0; x0 < N; x0++) { let s = 0; for (let k = -R; k <= R; k++) s += a[y * N + Math.min(N - 1, Math.max(0, x0 + k))]; b[y * N + x0] = s / (2 * R + 1); }
      for (let y = 0; y < N; y++) for (let x0 = 0; x0 < N; x0++) { let s = 0; for (let k = -R; k <= R; k++) s += b[Math.min(N - 1, Math.max(0, y + k)) * N + x0]; a[y * N + x0] = s / (2 * R + 1); }
    }
    const out = new Uint8Array(N * N * 4);
    for (let i = 0; i < N * N; i++) { const v = Math.round(Math.pow(a[i], 0.8) * 255); out[i * 4] = out[i * 4 + 1] = out[i * 4 + 2] = v; out[i * 4 + 3] = 255; }
    return out;
  }

  async function boot() {
    const THREE = await GL.three();
    const tier = GL.tier();
    const canvas = document.createElement('canvas');
    canvas.className = 'packshot__gl'; canvas.setAttribute('aria-hidden', 'true');
    shot.appendChild(canvas);
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, premultipliedAlpha: true });
    renderer.setClearColor(0x000000, 0);
    // passer par un canvas 2D : certaines <img> (picture/webp) remontent vides en texImage2D direct
    const S = Math.min(1024, img.naturalWidth || 1024), cv2 = document.createElement('canvas'); cv2.width = cv2.height = S; cv2.getContext('2d').drawImage(img, 0, 0, S, S);
    const tex = new THREE.CanvasTexture(cv2); tex.generateMipmaps = true; tex.minFilter = THREE.LinearMipmapLinearFilter; tex.anisotropy = 4; tex.needsUpdate = true;
    const N = tier === 2 ? 160 : 112;
    const dtex = new THREE.DataTexture(depthMap(N), N, N); dtex.flipY = true; dtex.magFilter = dtex.minFilter = THREE.LinearFilter; dtex.needsUpdate = true;
    const U = { uTex: { value: tex }, uDep: { value: dtex }, uM: { value: new THREE.Vector2() }, uL: { value: new THREE.Vector2(-0.35, 0.55) }, uSq: { value: 0 }, uTime: { value: 0 }, uIn: { value: 0 } };
    const mat = new THREE.ShaderMaterial({
      uniforms: U, transparent: true, depthTest: false,
      vertexShader: `uniform float uSq,uTime;varying vec2 vUv;void main(){vUv=uv;vec3 p=position;
        p.y=(p.y+1.)*(1.-.045*uSq)-1.; p.x*=1.+.03*uSq; p.y+=.012*sin(uTime*1.1);
        gl_Position=vec4(p.xy*.96,0.,1.);}`,
      fragmentShader: `uniform sampler2D uTex,uDep;uniform vec2 uM,uL;uniform float uIn;varying vec2 vUv;
        float D(vec2 u){return texture2D(uDep,u).r;}
        void main(){
          float d=D(vUv);
          vec2 uv=vUv-uM*d*.028;
          vec4 c=texture2D(uTex,uv);
          float e=1./90.;
          vec3 n=normalize(vec3((D(uv-vec2(e,0.))-D(uv+vec2(e,0.)))*3.2,(D(uv-vec2(0.,e))-D(uv+vec2(0.,e)))*3.2,1.));
          vec3 L=normalize(vec3(uL,.95));
          float dif=dot(n,L);
          float spec=pow(max(dot(reflect(-L,n),vec3(0.,0.,1.)),0.),22.)*.16;
          vec3 col=c.rgb*mix(1.,.86+.26*dif,uIn)+spec*uIn;
          gl_FragColor=vec4(col*c.a,c.a);
        }`
    });
    const scene = new THREE.Scene(), cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat); quad.frustumCulled = false; scene.add(quad);

    let dpr = 1;
    const resize = () => { const r = shot.getBoundingClientRect(); renderer.setPixelRatio(dpr); renderer.setSize(Math.max(1, r.width), Math.max(1, r.height), false); };
    const gov = GL.governor(1, Math.min(devicePixelRatio || 1, tier === 2 ? 2 : 1.5), d => { dpr = d; resize(); });
    new ResizeObserver(resize).observe(shot);

    const m = { x: 0, y: 0, tx: 0, ty: 0, last: -9 };
    const aim = (cx, cy) => { const r = stage.getBoundingClientRect(); m.tx = GL.clamp((cx - r.left) / r.width * 2 - 1, -1, 1); m.ty = GL.clamp((cy - r.top) / r.height * 2 - 1, -1, 1); m.last = performance.now() / 1000; };
    stage.addEventListener('pointermove', e => aim(e.clientX, e.clientY), { passive: true });
    stage.addEventListener('pointerleave', () => { m.tx = 0; m.ty = 0; });

    // Tassement quand ce produit gagne de la quantité dans le panier
    const qte = () => { const l = A.lignesPanier().find(x => x.produit.slug === slug); return l ? l.qte : 0; };
    let q0 = qte(), sq = 0, sqv = 0;
    document.addEventListener('ivt:panier', () => { const q = qte(); if (q > q0) sqv += 5.5; q0 = q; });

    let t = 0, shown = false;
    GL.loop(stage, (dt) => {
      gov(dt); t += dt;
      const idle = performance.now() / 1000 - m.last > 2.5;
      const tx = idle ? Math.sin(t * 0.32) * 0.35 : m.tx, ty = idle ? Math.cos(t * 0.23) * 0.22 : m.ty;
      m.x = GL.damp(m.x, tx, idle ? 1.2 : 4, dt); m.y = GL.damp(m.y, ty, idle ? 1.2 : 4, dt);
      U.uM.value.set(m.x, -m.y);
      U.uL.value.set(-0.35 + m.x * 0.8, 0.55 - m.y * 0.6);
      sqv += (-sq * 90 - sqv * 9) * dt; sq += sqv * dt;           // ressort amorti
      U.uSq.value = sq; U.uTime.value = t;
      U.uIn.value = GL.damp(U.uIn.value, 1, 2.5, dt);
      renderer.render(scene, cam);
      if (!shown) { shown = true; shot.classList.add('is-gl'); }
    });
  }
})();
