/* ============================================================
   IVT — Balance du marché (Three.js + physique maison)
   Peson à ressort suspendu, plateau en laiton, ampoule à tirette.
   Les produits sont des corps rigides : gravité, rebonds, roulement,
   collisions. Le prix est calculé sur le relevé de gros de la semaine.
   ============================================================ */
import * as THREE from 'three';

const root = document.getElementById('balance');
const stage = document.getElementById('balStage');
const canvas = document.getElementById('balCanvas');
if (root && stage && canvas) {
  // WebGL n'est créé qu'à l'approche de la section : la page reste légère au chargement.
  const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { io.disconnect(); requestAnimationFrame(main); } }, { rootMargin: '250px 0px' });
  io.observe(stage);
}

function main() {
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' }); }
  catch (e) { root.hidden = true; return; }

  const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
  const G = 9.81, DT = 1 / 180;
  const mobile = matchMedia('(pointer: coarse)').matches;
  const reduit = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const P = window.IVT_PRIX, A = window.IVT_APP;
  const fmt = n => Math.round(n).toLocaleString('fr-FR').replace(/\u202f| /g, ' ');
  const kgTxt = n => n.toFixed(2).replace('.', ',');

  renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.75 : 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const FOND = new THREE.Color('#05241a');
  scene.background = FOND;
  scene.fog = new THREE.Fog(FOND, 3.2, 7.5);
  const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 20);

  /* ---------- Environnement (reflets du laiton) ---------- */
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = new THREE.Scene();
  const eg = new THREE.SphereGeometry(6, 32, 16), cols = [];
  for (let i = 0; i < eg.attributes.position.count; i++) {
    const y = eg.attributes.position.getY(i) / 6, c = new THREE.Color().lerpColors(new THREE.Color('#0b2a1e'), new THREE.Color('#e9d7b4'), Math.max(0, y) ** 1.4);
    cols.push(c.r, c.g, c.b);
  }
  eg.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  env.add(new THREE.Mesh(eg, new THREE.MeshBasicMaterial({ side: THREE.BackSide, vertexColors: true })));
  const panel = (x, y, z, w, h, k) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(k, k * 0.92, k * 0.8), side: THREE.DoubleSide })); m.position.set(x, y, z); m.lookAt(0, 0, 0); env.add(m); };
  panel(0, 4.5, 1, 3, 1.4, 6); panel(-4, 2, 3, 1.5, 2.5, 2.2); panel(4, 1.5, -2, 1.2, 2, 1.4);
  scene.environment = pmrem.fromScene(env, 0.02, 0.1, 100, { size: 128 }).texture;
  scene.environmentIntensity = 0.55;

  /* ---------- Textures dessinées ---------- */
  const rnd = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
  function texBois(base, planches) {
    const c = document.createElement('canvas'); c.width = 1024; c.height = 512; const g = c.getContext('2d');
    g.fillStyle = base; g.fillRect(0, 0, 1024, 512);
    for (let i = 0; i < 420; i++) {
      const y = rnd() * 512, a = 0.03 + rnd() * 0.1, d = rnd() > 0.5;
      g.strokeStyle = d ? `rgba(30,16,6,${a})` : `rgba(255,220,170,${a * 0.5})`; g.lineWidth = 0.6 + rnd() * 2.4;
      g.beginPath(); g.moveTo(0, y);
      for (let x = 0; x <= 1024; x += 32) g.lineTo(x, y + Math.sin(x * 0.006 + i) * 4 + (rnd() - 0.5) * 1.5);
      g.stroke();
    }
    for (let k = 1; k < planches; k++) { const y = k * 512 / planches; g.fillStyle = 'rgba(10,5,2,.55)'; g.fillRect(0, y - 1.5, 1024, 3); g.fillStyle = 'rgba(255,230,190,.08)'; g.fillRect(0, y + 1.5, 1024, 1.5); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
  }
  function texGrain() {
    const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
    g.fillStyle = '#808080'; g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 2600; i++) { const v = 90 + rnd() * 80 | 0; g.fillStyle = `rgb(${v},${v},${v})`; g.beginPath(); g.arc(rnd() * 256, rnd() * 256, 0.6 + rnd() * 1.6, 0, 7); g.fill(); }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
  }
  function texVannerie() {
    const c = document.createElement('canvas'); c.width = 512; c.height = 256; const g = c.getContext('2d');
    g.fillStyle = '#9c7340'; g.fillRect(0, 0, 512, 256);
    for (let y = 0; y < 256; y += 16) for (let x = 0; x < 512; x += 24) {
      const o = ((y / 16) % 2) * 12;
      const gr = g.createLinearGradient(x + o, y, x + o, y + 16); gr.addColorStop(0, '#c89a5c'); gr.addColorStop(0.5, '#b0824a'); gr.addColorStop(1, '#6d4c26');
      g.fillStyle = gr; g.beginPath(); g.ellipse(x + o + 12, y + 8, 11, 7, 0, 0, 7); g.fill();
    }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 1); return t;
  }
  const SPAN = Math.PI * 2 * 330 / 360, KGMAX = 5;
  const cadranC = document.createElement('canvas'); cadranC.width = cadranC.height = 512;
  const cadranT = new THREE.CanvasTexture(cadranC); cadranT.colorSpace = THREE.SRGBColorSpace; cadranT.anisotropy = 8;
  function dessinerCadran() {
    const g = cadranC.getContext('2d'), cx = 256, R = 250;
    const gr = g.createRadialGradient(cx, cx - 60, 40, cx, cx, R); gr.addColorStop(0, '#fbf5e6'); gr.addColorStop(1, '#e6dac0');
    g.fillStyle = gr; g.fillRect(0, 0, 512, 512);
    g.lineCap = 'round';
    for (let i = 0; i <= KGMAX * 10; i++) {
      const v = i / 10, a = -Math.PI / 2 + v / KGMAX * SPAN, maj = i % 10 === 0, mi = i % 5 === 0;
      const l = maj ? 30 : mi ? 20 : 11, r0 = R - 22;
      g.strokeStyle = maj ? '#14231b' : '#3d4a42'; g.lineWidth = maj ? 5 : mi ? 3 : 1.6;
      g.beginPath(); g.moveTo(cx + Math.cos(a) * r0, cx + Math.sin(a) * r0); g.lineTo(cx + Math.cos(a) * (r0 - l), cx + Math.sin(a) * (r0 - l)); g.stroke();
      if (maj) { g.fillStyle = '#14231b'; g.font = '500 46px Jost, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(v), cx + Math.cos(a) * (r0 - 62), cx + Math.sin(a) * (r0 - 62)); }
    }
    g.strokeStyle = '#009640'; g.lineWidth = 6; g.beginPath(); g.arc(cx, cx, R - 14, -Math.PI / 2, -Math.PI / 2 + SPAN); g.stroke();
    g.fillStyle = '#c8202e'; g.font = 'italic 600 54px Cormorant, Georgia, serif'; g.textAlign = 'center'; g.fillText('ivt', cx, cx + 86);
    g.fillStyle = '#4a574f'; g.font = '600 17px Jost, sans-serif'; g.fillText('K G   ·   G R O S', cx, cx + 128);
    cadranT.needsUpdate = true;
  }
  dessinerCadran();
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(dessinerCadran);

  /* ---------- Matériaux ---------- */
  const grain = texGrain();
  const M = {
    table: new THREE.MeshStandardMaterial({ name: 'table', map: texBois('#6e4a2c', 5), roughness: 0.78 }),
    mur: new THREE.MeshStandardMaterial({ name: 'mur', color: '#0a3325', roughness: 0.95 }),
    poutre: new THREE.MeshStandardMaterial({ name: 'poutre', map: texBois('#3b2616', 1), roughness: 0.8 }),
    laiton: new THREE.MeshStandardMaterial({ name: 'laiton', color: '#caa154', metalness: 1, roughness: 0.26 }),
    acier: new THREE.MeshStandardMaterial({ name: 'acier', color: '#a7adae', metalness: 1, roughness: 0.34 }),
    cadran: new THREE.MeshStandardMaterial({ name: 'cadran', map: cadranT, roughness: 0.55 }),
    verre: new THREE.MeshStandardMaterial({ name: 'verre', color: '#ffffff', roughness: 0.04, metalness: 0, transparent: true, opacity: 0.12 }),
    aiguille: new THREE.MeshStandardMaterial({ name: 'aiguille', color: '#c8202e', roughness: 0.4 }),
    panier: new THREE.MeshStandardMaterial({ name: 'panier', map: texVannerie(), roughness: 0.9, side: THREE.DoubleSide }),
    cable: new THREE.MeshStandardMaterial({ name: 'cable', color: '#1a1a1a', roughness: 0.6 }),
    tirette: new THREE.MeshStandardMaterial({ name: 'tirette', color: '#efe4cc', roughness: 0.9 }),
    perle: new THREE.MeshStandardMaterial({ name: 'perle', color: '#8a5a34', roughness: 0.5 }),
    douille: new THREE.MeshStandardMaterial({ name: 'douille', color: '#2b2b2b', metalness: 0.8, roughness: 0.35 }),
    ampoule: new THREE.MeshStandardMaterial({ name: 'ampoule', color: '#fff4dc', emissive: new THREE.Color('#ffc77a'), emissiveIntensity: 3, roughness: 0.2, transparent: true, opacity: 0.92 }),
    tige: new THREE.MeshStandardMaterial({ name: 'tige', color: '#4f6b2a', roughness: 0.7 })
  };
  const peau = (color, rough, bump) => new THREE.MeshStandardMaterial({ color, roughness: rough, bumpMap: bump ? grain : null, bumpScale: bump || 0 });
  const mesh = (geo, mat, cast = true, recv = true) => { const m = new THREE.Mesh(geo, mat); m.castShadow = cast; m.receiveShadow = recv; return m; };

  /* ---------- Décor : étal ---------- */
  const table = mesh(new THREE.BoxGeometry(3.4, 0.08, 3.2), M.table, false, true); table.position.set(0, -0.04, 0.95); scene.add(table);
  M.table.map.repeat.set(1.4, 2.4);
  const mur = mesh(new THREE.PlaneGeometry(8, 4), M.mur, false, true); mur.position.set(0, 1.4, -0.62); scene.add(mur);
  const poutre = mesh(new THREE.BoxGeometry(3.6, 0.09, 0.09), M.poutre); poutre.position.set(0, 1.1, 0); scene.add(poutre);

  /* ---------- Bols (panier, plateau) : calotte sphérique ---------- */
  const calotte = (a, h) => (a * a + h * h) / (2 * h);
  function profilBol(a, h, e) {
    const Rb = calotte(a, h), pts = [];
    for (let i = 0; i <= 24; i++) { const x = a * i / 24; pts.push(new THREE.Vector2(x + 0.0001, Rb - Math.sqrt(Rb * Rb - x * x))); }
    for (let i = 24; i >= 0; i--) { const x = (a + e) * i / 24; pts.push(new THREE.Vector2(x + 0.0001, Rb - Math.sqrt(Math.max(0, Rb * Rb - x * x)) - e)); }
    return pts;
  }
  const PANIER = { a: 0.27, h: 0.13 }; PANIER.Rb = calotte(PANIER.a, PANIER.h);
  const PLAT = { a: 0.19, h: 0.045 }; PLAT.Rb = calotte(PLAT.a, PLAT.h);
  const panier = new THREE.Group(); scene.add(panier);
  panier.add(mesh(new THREE.LatheGeometry(profilBol(PANIER.a, PANIER.h, 0.012), 64), M.panier));
  const bord = mesh(new THREE.TorusGeometry(PANIER.a + 0.004, 0.012, 12, 72), M.panier); bord.rotation.x = Math.PI / 2; bord.position.y = PANIER.h; panier.add(bord);
  const pied = mesh(new THREE.CylinderGeometry(0.1, 0.11, 0.012, 40), M.panier); pied.position.y = -0.006; panier.add(pied);
  panier.position.y = 0.012;

  /* ---------- Peson ---------- */
  const pend = new THREE.Group(); scene.add(pend);
  // Maillons regroupés en une seule instance par groupe (peu d'appels de dessin, même sur mobile)
  const maillonGeo = new THREE.TorusGeometry(1, 0.24, 8, 20);
  const maillons = new Map();
  const chaine = (grp, a, b, taille = 0.011) => {
    const d = b.clone().sub(a), n = Math.max(2, Math.round(d.length() / (taille * 1.55)));
    const q = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), d.clone().normalize());
    if (!maillons.has(grp)) maillons.set(grp, []);
    for (let i = 0; i < n; i++) {
      const p = V().copy(a).addScaledVector(d, (i + 0.5) / n);
      const qq = q.clone().multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(0, (i % 2) * Math.PI / 2, 0)));
      maillons.get(grp).push(new THREE.Matrix4().compose(p, qq, V(taille * 0.62, taille, taille)));
    }
  };
  const figerChaines = () => maillons.forEach((ms, grp) => {
    const im = new THREE.InstancedMesh(maillonGeo, M.acier, ms.length); im.castShadow = true;
    ms.forEach((m, i) => im.setMatrixAt(i, m)); im.instanceMatrix.needsUpdate = true; im.computeBoundingSphere(); grp.add(im);
  });
  chaine(pend, V(0, 0, 0), V(0, -0.075, 0));
  const anneau = mesh(new THREE.TorusGeometry(0.018, 0.005, 10, 28), M.laiton); anneau.position.y = -0.088; pend.add(anneau);
  const corps = new THREE.Group(); corps.position.y = -0.2; pend.add(corps);
  const RC = 0.11;
  const boitier = mesh(new THREE.CylinderGeometry(RC, RC, 0.05, 64), M.laiton); boitier.rotation.x = Math.PI / 2; corps.add(boitier);
  const lunette = mesh(new THREE.TorusGeometry(RC - 0.002, 0.007, 12, 64), M.laiton); lunette.position.z = 0.026; corps.add(lunette);
  const face = mesh(new THREE.CircleGeometry(RC - 0.008, 64), M.cadran, false, true); face.position.z = 0.0255; corps.add(face);
  const aiguille = new THREE.Group(); aiguille.position.z = 0.029; corps.add(aiguille);
  const ai = mesh(new THREE.BoxGeometry(0.004, 0.088, 0.0016), M.aiguille, true, false); ai.position.y = 0.032; aiguille.add(ai);
  const ai2 = mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.006, 24), M.laiton, false); ai2.rotation.x = Math.PI / 2; aiguille.add(ai2);
  const vitre = mesh(new THREE.CircleGeometry(RC - 0.006, 64), M.verre, false, false); vitre.position.z = 0.033; corps.add(vitre);
  const tete = mesh(new THREE.CylinderGeometry(0.016, 0.02, 0.03, 24), M.laiton); tete.position.y = RC + 0.01; corps.add(tete);
  const base = mesh(new THREE.CylinderGeometry(0.02, 0.016, 0.03, 24), M.laiton); base.position.y = -RC - 0.01; corps.add(base);
  // Ressort apparent : hélice étirée selon la charge
  const helice = new (class extends THREE.Curve { getPoint(t, o = V()) { return o.set(Math.cos(t * Math.PI * 18) * 0.011, -t, Math.sin(t * Math.PI * 18) * 0.011); } })();
  const ressort = mesh(new THREE.TubeGeometry(helice, 220, 0.0022, 6, false), M.acier, true, false);
  const RESSORT_Y = -0.2 - RC - 0.025, RESSORT_L0 = 0.035;
  ressort.position.y = RESSORT_Y; pend.add(ressort);
  const bas = new THREE.Group(); pend.add(bas);
  const crochet = mesh(new THREE.TorusGeometry(0.014, 0.0035, 10, 24, Math.PI * 1.5), M.acier); crochet.rotation.z = Math.PI * 0.75; crochet.position.y = -0.012; bas.add(crochet);
  const RIM_Y = -0.27;
  for (let k = 0; k < 3; k++) { const a = k * Math.PI * 2 / 3 + Math.PI / 6; chaine(bas, V(0, -0.02, 0), V(Math.cos(a) * PLAT.a * 0.96, RIM_Y, Math.sin(a) * PLAT.a * 0.96), 0.008); }
  const plat = new THREE.Group(); plat.position.y = RIM_Y - PLAT.h; bas.add(plat);
  plat.add(mesh(new THREE.LatheGeometry(profilBol(PLAT.a, PLAT.h, 0.004), 72), M.laiton));
  figerChaines();
  const levre = mesh(new THREE.TorusGeometry(PLAT.a, 0.005, 10, 72), M.laiton); levre.rotation.x = Math.PI / 2; levre.position.y = PLAT.h; plat.add(levre);

  // Physique du peson
  const MP = 0.45, K = G / 0.024, ZETA = 0.075, LPEND = -(RESSORT_Y - RESSORT_L0 + RIM_Y - PLAT.h);
  const S = { s: MP * G / K, sv: 0, u: V(), uv: V(), load: 0, loadV: 0 };
  const pivot = V();

  /* ---------- Ampoule à tirette ---------- */
  const lampe = new THREE.Group(); scene.add(lampe);
  const LB = 0.26;
  const fil = mesh(new THREE.CylinderGeometry(0.003, 0.003, LB, 8), M.cable, true, false); fil.position.y = -LB / 2; lampe.add(fil);
  const douille = mesh(new THREE.CylinderGeometry(0.018, 0.022, 0.05, 28), M.douille); douille.position.y = -LB - 0.02; lampe.add(douille);
  const verreA = mesh(new THREE.SphereGeometry(0.045, 40, 28), M.ampoule, false, false); verreA.scale.set(1, 1.12, 1); verreA.position.y = -LB - 0.085; lampe.add(verreA);
  const spot = new THREE.SpotLight('#ffd49a', 9, 3.2, 1.05, 0.65, 2);
  spot.castShadow = true; spot.shadow.mapSize.set(mobile ? 1024 : 2048, mobile ? 1024 : 2048); spot.shadow.radius = 5; spot.shadow.bias = -0.0004; spot.shadow.normalBias = 0.01; spot.shadow.camera.near = 0.05; spot.shadow.camera.far = 3;
  scene.add(spot, spot.target);
  const hemi = new THREE.HemisphereLight('#d8efe2', '#2a1a0c', 0.5); scene.add(hemi);
  const fill = new THREE.DirectionalLight('#ffe9cc', 0.35); fill.position.set(1.5, 2, 3); scene.add(fill);
  const lune = new THREE.DirectionalLight('#7f9cff', 0); lune.position.set(-2, 3, 2); scene.add(lune);
  const L = { u: V(), uv: V(), dip: 0, on: true, k: 1, flick: 0 };
  const lampePivot = V();
  // Tirette (corde vérlet)
  const NR = 11, SEG = 0.021, corde = [], cordePrev = [], cordeMeshes = [];
  const segGeo = new THREE.CylinderGeometry(0.0022, 0.0022, 1, 6);
  for (let i = 0; i < NR - 1; i++) { const m = mesh(segGeo, M.tirette, true, false); scene.add(m); cordeMeshes.push(m); }
  const perle = mesh(new THREE.CylinderGeometry(0.009, 0.012, 0.03, 20), M.perle); scene.add(perle);
  const perleHit = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), new THREE.MeshBasicMaterial({ visible: false })); scene.add(perleHit);
  perleHit.userData.kind = 'corde';

  /* ---------- Produits ---------- */
  const prixKg = id => {
    const s = P && P.series.find(x => x.id === id); if (!s) return 0;
    let i = s.r.length - 1; while (i >= 0 && !s.r[i]) i--;
    return i < 0 ? 0 : (s.r[i][0] + s.r[i][1]) / 2 / (s.kg || 1);
  };
  const semaine = P ? P.semaines[P.semaines.length - 1] : null;
  const calice = (() => { const s = new THREE.Shape(); for (let k = 0; k <= 10; k++) { const a = k / 10 * Math.PI * 2, rr = k % 2 ? 0.006 : 0.021; s[k ? 'lineTo' : 'moveTo'](Math.cos(a) * rr, Math.sin(a) * rr); } const g = new THREE.ExtrudeGeometry(s, { depth: 0.002, bevelEnabled: false }); g.rotateX(-Math.PI / 2); return g; })();
  const TYPES = [
    { id: 'tomate', nom: 'Tomate', n: 4, m: 0.12, r: 0.043, build: r => {
      const g = new THREE.Group(), mat = peau('#d4291d', 0.3, 0.0006);
      const b = mesh(new THREE.SphereGeometry(r, 36, 24), mat); b.scale.set(1, 0.82, 1); g.add(b);
      const sep = new THREE.MeshStandardMaterial({ color: '#3f7a22', roughness: 0.7, side: THREE.DoubleSide });
      const f = mesh(calice, sep, false, false); f.position.y = r * 0.8; g.add(f);
      const t = mesh(new THREE.CylinderGeometry(0.0022, 0.003, 0.012, 8), M.tige); t.position.y = r * 0.86; g.add(t);
      return g; } },
    { id: 'poivron-vert', nom: 'Poivron', n: 2, m: 0.16, r: 0.046, build: r => {
      const g = new THREE.Group(), pts = [];
      for (let i = 0; i <= 20; i++) { const t = i / 20, y = -r + t * 2 * r; pts.push(new THREE.Vector2(Math.max(0.001, Math.sin(Math.PI * Math.min(1, t * 1.05)) * r * (0.82 + 0.18 * t)), y * 0.95)); }
      const geo = new THREE.LatheGeometry(pts, 48), pos = geo.attributes.position;
      for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), z = pos.getZ(i), a = Math.atan2(z, x), k = 1 + Math.cos(a * 4) * 0.07; pos.setX(i, x * k); pos.setZ(i, z * k); }
      geo.computeVertexNormals();
      g.add(mesh(geo, peau('#2f8a2a', 0.16)));
      const t = mesh(new THREE.CylinderGeometry(0.004, 0.006, 0.02, 10), M.tige); t.position.y = r * 0.98; g.add(t);
      return g; } },
    { id: 'oignon-violet', nom: 'Oignon violet', n: 3, m: 0.14, r: 0.042, build: r => {
      const g = new THREE.Group(), pts = [];
      for (let i = 0; i <= 24; i++) { const t = i / 24, y = -r * 0.9 + t * r * 2.05; pts.push(new THREE.Vector2(Math.max(0.0008, Math.pow(Math.sin(Math.PI * t), 0.75) * r * (t > 0.8 ? 1 - (t - 0.8) * 2.4 : 1)), y)); }
      g.add(mesh(new THREE.LatheGeometry(pts, 40), peau('#7c2d4f', 0.42, 0.0003)));
      const t = mesh(new THREE.ConeGeometry(0.004, 0.018, 8), new THREE.MeshStandardMaterial({ color: '#9a7a52', roughness: 0.9 })); t.position.y = r * 1.2; g.add(t);
      return g; } },
    { id: 'orange-locale', nom: 'Orange', n: 3, m: 0.2, r: 0.046, build: r => {
      const g = new THREE.Group(); g.add(mesh(new THREE.SphereGeometry(r, 40, 28), peau('#ee8a1c', 0.55, 0.0012)));
      const t = mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.004, 10), M.tige); t.position.y = r * 0.99; g.add(t);
      return g; } },
    { id: 'citron', nom: 'Citron', n: 3, m: 0.08, r: 0.04, build: r => {
      const g = new THREE.Group(), b = mesh(new THREE.SphereGeometry(0.032, 36, 24), peau('#dcd23b', 0.4, 0.0009)); b.scale.set(1.25, 1, 1); g.add(b);
      [-1, 1].forEach(s => { const t = mesh(new THREE.SphereGeometry(0.008, 12, 8), b.material); t.position.x = s * 0.04; t.scale.set(1, 0.7, 0.7); g.add(t); });
      return g; } }
  ];
  TYPES.forEach(t => { t.pk = prixKg(t.id); });
  const corpsR = [], pickables = [perleHit];
  TYPES.forEach(t => { for (let i = 0; i < t.n; i++) {
    const g = t.build(t.r); scene.add(g);
    const hit = new THREE.Mesh(new THREE.SphereGeometry(t.r * (mobile ? 1.9 : 1.35), 10, 8), new THREE.MeshBasicMaterial({ visible: false })); g.add(hit);
    const b = { t, g, r: t.r, m: t.m, p: V(), v: V(), w: V(), q: new THREE.Quaternion(), held: false, n: null, vs: V(), surPlat: false, snd: 0 };
    hit.userData = { kind: 'fruit', b }; pickables.push(hit); corpsR.push(b);
  } });
  const platHit = new THREE.Mesh(new THREE.CylinderGeometry(PLAT.a + 0.03, PLAT.a + 0.03, 0.1, 20), new THREE.MeshBasicMaterial({ visible: false })); platHit.position.y = PLAT.h / 2; plat.add(platHit);
  const corpsHit = new THREE.Mesh(new THREE.SphereGeometry(RC + 0.02, 12, 8), new THREE.MeshBasicMaterial({ visible: false })); corps.add(corpsHit);
  platHit.userData.kind = corpsHit.userData.kind = 'peson'; pickables.push(platHit, corpsHit);
  const bulbHit = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), new THREE.MeshBasicMaterial({ visible: false })); bulbHit.position.y = -LB - 0.08; lampe.add(bulbHit); bulbHit.userData.kind = 'lampe'; pickables.push(bulbHit);

  /* ---------- Mise en page (paysage / portrait) ---------- */
  let LAY = null;
  function disposer(force) {
    const w = Math.round(stage.clientWidth) || 1, h = Math.round(stage.clientHeight) || 1, a = w / h, portrait = a < 1.05;
    if (LAY && !force && w === disposer.w && h === disposer.h) return;
    disposer.w = w; disposer.h = h;
    const next = portrait ? { portrait, basket: V(-0.25, 0, 0.12), pivot: V(0.27, 1.07, 0), lampe: V(-0.25, 1.07, 0.2), X: 0.53 } : { portrait, basket: V(-0.44, 0, 0.1), pivot: V(0.37, 1.07, 0), lampe: V(-0.05, 1.07, 0.18), X: 0.8 };
    renderer.setSize(w, h, false); camera.aspect = a;
    const t = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const d = Math.max(0.6 / t, (next.X + 0.04) / (t * a)) * 1.02;
    camera.position.set(0, 0.5 + d * 0.2, d); camera.lookAt(0, 0.47, 0); camera.updateProjectionMatrix();
    if (!LAY || LAY.portrait !== portrait || force) {
      LAY = next;
      panier.position.x = LAY.basket.x; panier.position.z = LAY.basket.z;
      pivot.copy(LAY.pivot); lampePivot.copy(LAY.lampe);
      poutre.position.z = 0;
      S.u.set(0, 0, 0); S.uv.set(0, 0, 0); S.sv = 0; L.u.set(0, 0, 0); L.uv.set(0, 0, 0);
      remplir(false); initCorde(); majPeson(); majLampe();
      for (let i = 0; i < 420; i++) pas(true);
    }
    placerIndices();
  }
  function remplir(chute) {
    corpsR.forEach((b, i) => {
      const a = i * 2.4, rr = 0.05 + (i % 5) * 0.035;
      b.p.set(LAY.basket.x + Math.cos(a) * rr, (chute ? 0.35 : 0.08) + i * 0.028, LAY.basket.z + Math.sin(a) * rr * 0.8);
      b.v.set(0, 0, 0); b.w.set(0, 0, 0); b.held = false;
      b.q.setFromEuler(new THREE.Euler(rnd() * 6, rnd() * 6, rnd() * 6));
    });
  }

  /* ---------- Géométrie du plateau dans le monde ---------- */
  const qPend = new THREE.Quaternion(), qInv = new THREE.Quaternion(), eul = new THREE.Euler();
  const platBas = V(), platAxe = V(0, 1, 0), platVit = V();
  const longueur = () => -(RESSORT_Y - RESSORT_L0 - (S.s - MP * G / K) + RIM_Y - PLAT.h);
  function majPeson() {
    const Lp = longueur();
    eul.set(-Math.asin(THREE.MathUtils.clamp(S.u.z / Lp, -0.9, 0.9)), 0, Math.asin(THREE.MathUtils.clamp(S.u.x / Lp, -0.9, 0.9)));
    qPend.setFromEuler(eul); qInv.copy(qPend).invert();
    platBas.set(0, -Lp, 0).applyQuaternion(qPend).add(pivot);
    platAxe.set(0, 1, 0).applyQuaternion(qPend);
    platVit.copy(S.uv); platVit.addScaledVector(platAxe, -S.sv);
  }
  function majLampe() {
    const lp = lampePivot, u = L.u;
    eul.set(-Math.asin(THREE.MathUtils.clamp(u.z / (LB + 0.085), -0.9, 0.9)), 0, Math.asin(THREE.MathUtils.clamp(u.x / (LB + 0.085), -0.9, 0.9)));
    lampe.quaternion.setFromEuler(eul); lampe.position.set(lp.x, lp.y + L.dip, lp.z);
  }
  const ancreCorde = V(), lampePos = V();
  function calcAncre() {
    ancreCorde.set(0.03, -LB - 0.06, 0).applyQuaternion(lampe.quaternion).add(lampe.position);
    lampePos.set(0, -LB - 0.085, 0).applyQuaternion(lampe.quaternion).add(lampe.position);
  }
  function initCorde() { calcAncre(); for (let i = 0; i < NR; i++) { corde[i] = ancreCorde.clone().add(V(0, -i * SEG, 0)); cordePrev[i] = corde[i].clone(); } }

  /* ---------- Son (synthèse, après le premier geste) ---------- */
  let AC = null, muet = false, bruit = null, tSon = 0;
  const btnSon = document.getElementById('balSnd');
  if (btnSon) btnSon.addEventListener('click', () => { muet = !muet; btnSon.setAttribute('aria-pressed', String(!muet)); btnSon.classList.toggle('is-muet', muet); });
  function audio() {
    if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); const b = AC.createBuffer(1, AC.sampleRate * 0.2, AC.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; bruit = b; } catch (e) { AC = null; } }
    if (AC && AC.state === 'suspended') AC.resume();
  }
  function son(type, force) {
    if (!AC || muet || AC.state !== 'running') return;
    const now = AC.currentTime; if (now - tSon < 0.028) return; tSon = now;
    const v = Math.min(1, force / 2.2), out = AC.createGain(); out.connect(AC.destination);
    const env = (g, peak, dur) => { g.gain.setValueAtTime(0.0001, now); g.gain.exponentialRampToValueAtTime(peak, now + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, now + dur); };
    if (type === 'metal') {
      [1180, 1870, 2790].forEach((f, k) => { const o = AC.createOscillator(), g = AC.createGain(); o.frequency.value = f * (0.97 + Math.random() * 0.06); o.connect(g).connect(out); env(g, 0.05 * v / (k + 1), 0.5 - k * 0.12); o.start(now); o.stop(now + 0.6); });
    } else if (type === 'clic') {
      const o = AC.createOscillator(), g = AC.createGain(); o.type = 'square'; o.frequency.value = 2400; o.connect(g).connect(out); env(g, 0.05, 0.02); o.start(now); o.stop(now + 0.03);
      const o2 = AC.createOscillator(), g2 = AC.createGain(); o2.frequency.value = 640; o2.connect(g2).connect(out); env(g2, 0.08, 0.06); o2.start(now + 0.012); o2.stop(now + 0.1);
    } else {
      const s = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain();
      s.buffer = bruit; f.type = 'lowpass'; f.frequency.value = type === 'bois' ? 1100 : 520; s.connect(f).connect(g).connect(out); env(g, (type === 'bois' ? 0.22 : 0.12) * v, type === 'bois' ? 0.09 : 0.06); s.start(now); s.stop(now + 0.12);
      const o = AC.createOscillator(), g2 = AC.createGain(); o.frequency.value = type === 'bois' ? 190 : 130; o.connect(g2).connect(out); env(g2, 0.1 * v, 0.07); o.start(now); o.stop(now + 0.1);
    }
  }

  /* ---------- Physique ---------- */
  const tmp = V(), tmp2 = V(), rel = V(), nrm = V(), vt = V();
  function contact(b, n, pen, vs, e, mu, mat, surPlat) {
    b.p.addScaledVector(n, pen);
    rel.copy(b.v).sub(vs); const vn = rel.dot(n);
    if (vn < 0) {
      const j = -(1 + (vn < -0.4 ? e : 0)) * vn;
      b.v.addScaledVector(n, j);
      vt.copy(rel).addScaledVector(n, -vn); const l = vt.length();
      if (l > 1e-6) b.v.addScaledVector(vt, -Math.min(1, mu * j / l));
      if (vn < -0.35 && performance.now() - b.snd > 70) { b.snd = performance.now(); son(mat, -vn); }
      if (surPlat && vn < -0.15) { const J = j * b.m; S.sv += -n.dot(platAxe) * -J / (MP + S.load) * 0.9; tmp2.copy(n).multiplyScalar(-J / (MP + S.load)); tmp2.y = 0; S.uv.add(tmp2); }
    }
    b.n = n.clone(); b.vs.copy(vs);
  }
  function bol(b, B, U, a, h, Rb, vs, mat, surPlat, e) {
    tmp.copy(b.p).sub(B); const y = tmp.dot(U);
    if (y > h + b.r || y < -b.r - 0.03) return;
    tmp2.copy(tmp).addScaledVector(U, -y); const rad = tmp2.length();
    if (rad > a + b.r + 0.01) return;
    const C = tmp.copy(B).addScaledVector(U, Rb), dv = V().copy(b.p).sub(C), dist = dv.length();
    if (y < h && dist > Rb - b.r && dist < Rb + b.r) {
      const dedans = dist < Rb; dv.divideScalar(dist);
      if (dedans) contact(b, dv.negate(), dist - (Rb - b.r), vs, e, 0.35, mat, surPlat);
      else contact(b, dv, Rb + b.r - dist, vs, e, 0.35, mat, surPlat);
    }
    // lèvre du bord
    const rc = V().copy(B).addScaledVector(U, h), q = V().copy(b.p).sub(rc); const qy = q.dot(U); q.addScaledVector(U, -qy);
    if (q.lengthSq() < 1e-8) return;
    const pr = rc.add(q.normalize().multiplyScalar(a)), dd = V().copy(b.p).sub(pr), dl = dd.length(), lim = b.r + 0.006;
    if (dl < lim && dl > 1e-6) contact(b, dd.divideScalar(dl), lim - dl, vs, e, 0.3, mat, surPlat);
  }
  const zero = V(), haut = V(0, 1, 0), basPanier = V();
  let saisi = null; const cible = V();

  function pas(silence) {
    // Peson : ressort vertical + pendule
    const Mt = MP + S.load;
    let fs = Mt * G - K * S.s - 2 * ZETA * Math.sqrt(K * Mt) * S.sv;
    const Lp = longueur(), w2 = G / Lp;
    tmp.copy(S.u).multiplyScalar(-w2).addScaledVector(S.uv, -2 * 0.035 * Math.sqrt(w2));
    if (saisi && saisi.kind === 'peson') {
      const pc = V().copy(platBas).addScaledVector(platAxe, PLAT.h * 0.5), f = V().copy(cible).sub(pc).multiplyScalar(90);
      f.addScaledVector(platVit, -6);
      fs += -f.y * 0.6; f.y = 0; tmp.addScaledVector(f, 1 / Mt);
    }
    S.sv += fs / Mt * DT; S.s += S.sv * DT;
    if (S.s < 0) { S.s = 0; S.sv = Math.max(0, S.sv); }
    if (S.s > 0.2) { S.s = 0.2; S.sv = Math.min(0, S.sv); }
    S.uv.addScaledVector(tmp, DT); S.u.addScaledVector(S.uv, DT);
    const lu = S.u.length(); if (lu > 0.3) S.u.multiplyScalar(0.3 / lu);
    majPeson();

    // Lampe : pendule + corde
    const wl = G / (LB + 0.085);
    tmp.copy(L.u).multiplyScalar(-wl).addScaledVector(L.uv, -2 * 0.05 * Math.sqrt(wl));
    if (saisi && saisi.kind === 'lampe') tmp.add(V().copy(cible).sub(lampePos).setY(0).multiplyScalar(160)).addScaledVector(L.uv, -8);
    let tir = 0;
    if (saisi && saisi.kind === 'corde') {
      const d = V().copy(cible).sub(ancreCorde), exc = d.length() - SEG * (NR - 1);
      if (exc > 0) { tir = exc; tmp.addScaledVector(d.setY(0), 40 * exc); }
    }
    L.uv.addScaledVector(tmp, DT); L.u.addScaledVector(L.uv, DT);
    L.dip += ((-Math.min(0.022, tir * 0.35)) - L.dip) * 0.25;
    majLampe(); calcAncre();
    corde[0].copy(ancreCorde);
    for (let i = 1; i < NR; i++) { const c = corde[i], pv = cordePrev[i]; tmp.copy(c).sub(pv).multiplyScalar(0.992); pv.copy(c); c.add(tmp).add(V(0, -G * DT * DT, 0)); }
    if (saisi && saisi.kind === 'corde') corde[NR - 1].lerp(cible, 0.5);
    for (let it = 0; it < 12; it++) for (let i = 0; i < NR - 1; i++) {
      const a = corde[i], b = corde[i + 1]; tmp.copy(b).sub(a); const l = tmp.length() || 1e-6, diff = (l - SEG) / l;
      if (i === 0) b.addScaledVector(tmp, -diff); else { a.addScaledVector(tmp, diff * 0.5); b.addScaledVector(tmp, -diff * 0.5); }
    }
    if (saisi && saisi.kind === 'corde') {
      if (!saisi.bascule && tir > 0.035) { saisi.bascule = true; basculer(); }
      if (saisi.bascule && tir < 0.01) saisi.bascule = false;
    }

    // Produits
    basPanier.set(panier.position.x, panier.position.y, panier.position.z);
    corpsR.forEach(b => {
      if (b.held) {
        const f = V().copy(cible).sub(b.p).multiplyScalar(420).addScaledVector(b.v, -2 * Math.sqrt(420) * 0.85);
        b.v.addScaledVector(f, DT); b.w.multiplyScalar(0.96);
      } else b.v.y -= G * DT;
      b.v.multiplyScalar(0.9995);
      b.p.addScaledVector(b.v, DT);
      b.n = null;
      if (b.p.y < b.r) contact(b, haut, b.r - b.p.y, zero, 0.28, 0.5, 'bois');
      const X = LAY.X - b.r;
      if (b.p.x > X) contact(b, V(-1, 0, 0), b.p.x - X, zero, 0.3, 0.2, 'fruit');
      if (b.p.x < -X) contact(b, V(1, 0, 0), -X - b.p.x, zero, 0.3, 0.2, 'fruit');
      if (b.p.z < -0.55 + b.r) contact(b, V(0, 0, 1), -0.55 + b.r - b.p.z, zero, 0.3, 0.2, 'bois');
      if (b.p.z > 0.5 - b.r) contact(b, V(0, 0, -1), b.p.z - (0.5 - b.r), zero, 0.3, 0.2, 'fruit');
      bol(b, basPanier, haut, PANIER.a, PANIER.h, PANIER.Rb, zero, 'bois', false, 0.2);
      bol(b, platBas, platAxe, PLAT.a, PLAT.h, PLAT.Rb, platVit, 'metal', true, 0.32);
    });
    for (let i = 0; i < corpsR.length; i++) for (let j = i + 1; j < corpsR.length; j++) {
      const a = corpsR[i], b = corpsR[j];
      tmp.copy(b.p).sub(a.p); const d2 = tmp.lengthSq(), rs = a.r + b.r;
      if (d2 >= rs * rs || d2 < 1e-10) continue;
      const d = Math.sqrt(d2); nrm.copy(tmp).divideScalar(d);
      const wa = a.held ? 0.15 / a.m : 1 / a.m, wb = b.held ? 0.15 / b.m : 1 / b.m, pen = rs - d;
      a.p.addScaledVector(nrm, -pen * wa / (wa + wb)); b.p.addScaledVector(nrm, pen * wb / (wa + wb));
      rel.copy(b.v).sub(a.v); const vn = rel.dot(nrm);
      if (vn < 0) {
        const jn = -(1 + (vn < -0.4 ? 0.25 : 0)) * vn / (wa + wb);
        a.v.addScaledVector(nrm, -jn * wa); b.v.addScaledVector(nrm, jn * wb);
        vt.copy(rel).addScaledVector(nrm, -vn); const l = vt.length();
        if (l > 1e-6) { const jt = Math.min(0.3 * jn, l / (wa + wb)); vt.divideScalar(l); a.v.addScaledVector(vt, jt * wa); b.v.addScaledVector(vt, -jt * wb); }
        if (vn < -0.45) son('fruit', -vn);
      }
    }
    corpsR.forEach(b => {
      if (b.n) {
        rel.copy(b.v).sub(b.vs); rel.addScaledVector(b.n, -rel.dot(b.n));
        b.w.lerp(tmp.crossVectors(b.n, rel).divideScalar(b.r), 0.35);
        b.v.addScaledVector(rel, -Math.min(1, 1.6 * DT));
        if (rel.lengthSq() < 0.0004 && Math.abs(b.v.dot(b.n)) < 0.05) { b.v.lerp(b.vs, 0.08); b.w.multiplyScalar(0.9); }
      } else b.w.multiplyScalar(0.999);
      const wl2 = b.w.length();
      if (wl2 > 1e-5) { const dq = new THREE.Quaternion().setFromAxisAngle(tmp.copy(b.w).divideScalar(wl2), wl2 * DT); b.q.premultiply(dq).normalize(); }
    });

    // Charge réellement posée sur le plateau (colonne au-dessus du plateau)
    let load = 0;
    corpsR.forEach(b => {
      tmp.copy(b.p).sub(platBas); const y = tmp.dot(platAxe); tmp.addScaledVector(platAxe, -y);
      b.surPlat = !b.held && y > -0.01 && y < PLAT.h + 0.24 && tmp.length() < PLAT.a + 0.01;
      if (b.surPlat) load += b.m;
    });
    S.load += (load - S.load) * (silence ? 1 : 0.06);
  }

  function basculer() {
    L.on = !L.on; son('clic', 1);
    if (navigator.vibrate) try { navigator.vibrate(8); } catch (e) {}
    L.flick = L.on ? 0.35 : 0;
    root.classList.toggle('is-nuit', !L.on);
    const h = document.getElementById('balTire'); if (h) h.classList.add('is-vu');
  }

  /* ---------- Pointeur ---------- */
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), plan = new THREE.Plane(), decal = V(), hitP = V();
  let premierGeste = false;
  function lancer(e) {
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
  }
  function viser(e) {
    lancer(e);
    const hits = ray.intersectObjects(pickables, false);
    if (!hits.length) return null;
    // Priorité : produits, tirette, puis peson / ampoule
    const ord = { fruit: 0, corde: 1, peson: 2, lampe: 3 };
    hits.sort((a, b) => (ord[a.object.userData.kind] - ord[b.object.userData.kind]) || a.distance - b.distance);
    return hits[0];
  }
  function saisir(e) {
    const h = viser(e); if (!h) return false;
    audio();
    const k = h.object.userData.kind;
    const n = V(); camera.getWorldDirection(n).negate(); n.y *= 0.3; n.normalize();
    if (k === 'fruit') { const b = h.object.userData.b; b.held = true; saisi = { kind: k, b }; plan.setFromNormalAndCoplanarPoint(n, b.p); lancer(e); ray.ray.intersectPlane(plan, hitP); decal.copy(b.p).sub(hitP); }
    else if (k === 'corde') { saisi = { kind: k }; plan.setFromNormalAndCoplanarPoint(n, corde[NR - 1]); decal.set(0, 0, 0); }
    else if (k === 'peson') { saisi = { kind: k }; const pc = V().copy(platBas).addScaledVector(platAxe, PLAT.h * 0.5); plan.setFromNormalAndCoplanarPoint(n, h.point); decal.copy(pc).sub(h.point); }
    else { saisi = { kind: k }; plan.setFromNormalAndCoplanarPoint(n, h.point); decal.copy(lampePos).sub(h.point); }
    bouger(e);
    canvas.classList.add('is-drag');
    if (!premierGeste) { premierGeste = true; root.classList.add('is-joue'); }
    return true;
  }
  function bouger(e) {
    if (!saisi) return;
    lancer(e); if (!ray.ray.intersectPlane(plan, hitP)) return;
    cible.copy(hitP).add(decal);
    if (saisi.kind === 'fruit') { cible.y = Math.max(saisi.b.r, Math.min(1.0, cible.y)); cible.x = THREE.MathUtils.clamp(cible.x, -LAY.X + 0.05, LAY.X - 0.05); cible.z = THREE.MathUtils.clamp(cible.z, -0.45, 0.45); }
  }
  function lacher() {
    if (!saisi) return;
    if (saisi.b) { saisi.b.held = false; const l = saisi.b.v.length(); if (l > 3.2) saisi.b.v.multiplyScalar(3.2 / l); }
    saisi = null; canvas.classList.remove('is-drag');
  }
  canvas.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (saisir(e)) { try { canvas.setPointerCapture(e.pointerId); } catch (_) {} e.preventDefault(); }
  });
  canvas.addEventListener('touchstart', e => { const t = e.touches[0]; if (t && viser(t)) e.preventDefault(); }, { passive: false });
  canvas.addEventListener('pointermove', e => {
    if (saisi) { bouger(e); return; }
    if (e.pointerType === 'mouse') { const h = viser(e); canvas.style.cursor = h ? 'grab' : 'default'; }
  });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => canvas.addEventListener(t, lacher));

  /* ---------- Ticket ---------- */
  const elKg = document.getElementById('balKg'), elF = document.getElementById('balF'), elLines = document.getElementById('balLines');
  const elLive = document.getElementById('balLive'), elWa = document.getElementById('balWa'), elSrc = document.getElementById('balSrc');
  if (elSrc && semaine && P) elSrc.textContent = `Prix de gros moyens du relevé du ${new Date(semaine.debut + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} · ${P.marche}.`;
  let dernierTicket = '';
  function ticket() {
    const groupes = {};
    corpsR.forEach(b => { if (!b.surPlat) return; const g = groupes[b.t.id] || (groupes[b.t.id] = { t: b.t, n: 0, kg: 0 }); g.n++; g.kg += b.m; });
    const lignes = Object.values(groupes); lignes.forEach(g => { g.f = Math.max(5, Math.round(g.kg * g.t.pk / 5) * 5); });
    const kg = lignes.reduce((s, g) => s + g.kg, 0), prix = lignes.reduce((s, g) => s + g.f, 0);
    const lu = Math.max(0, K * S.s / G - MP);
    if (elKg) elKg.textContent = kgTxt(lu);
    const cle = lignes.map(g => g.t.id + g.n).join('|');
    if (cle === dernierTicket) return; dernierTicket = cle;
    if (elF) elF.textContent = fmt(prix);
    if (elLive) elLive.innerHTML = lignes.length ? `<b>${kgTxt(kg)} kg</b><span>≈ ${fmt(prix)} F</span>` : '<span>Plateau vide</span>';
    if (elLines) elLines.innerHTML = lignes.length ? lignes.map(g => `<li><span>${g.t.nom} <i>× ${g.n}</i></span><span>${kgTxt(g.kg)} kg</span><b>${fmt(g.f)} F</b></li>`).join('') : '<li class="is-vide">Posez un produit sur le plateau.</li>';
    root.classList.toggle('has-charge', lignes.length > 0);
    if (elWa && A) {
      const msg = 'Bonjour IVT, j\'ai pesé sur votre balance : ' + lignes.map(g => `${g.t.nom} ${kgTxt(g.kg)} kg`).join(', ') + `. Je souhaite ces produits en gros, pouvez-vous me donner votre prix pour la quantité suivante : `;
      elWa.href = lignes.length ? A.lienWhatsApp(msg) : A.lienWhatsApp('Bonjour IVT, je souhaite connaître vos prix de gros de la semaine.');
    }
  }
  const btnVider = document.getElementById('balReset');
  if (btnVider) btnVider.addEventListener('click', () => { audio(); remplir(true); dernierTicket = '*'; });

  /* ---------- Indices contextuels ---------- */
  const elHint = document.getElementById('balHint'), elTire = document.getElementById('balTire');
  const ecran = (p) => { const v = p.clone().project(camera); return [(v.x + 1) / 2 * 100, (1 - v.y) / 2 * 100]; };
  function placerIndices() {
    if (!LAY) return;
    if (elHint) { const [x, y] = ecran(V(LAY.basket.x, 0.2, LAY.basket.z)); elHint.style.left = x + '%'; elHint.style.top = y + '%'; }
  }

  /* ---------- Rendu ---------- */
  function rendre() {
    corpsR.forEach(b => { b.g.position.copy(b.p); b.g.quaternion.copy(b.q); });
    pend.position.copy(pivot); pend.quaternion.copy(qPend);
    const ext = RESSORT_L0 + (S.s - MP * G / K);
    ressort.scale.y = Math.max(0.01, ext);
    bas.position.y = RESSORT_Y - ext;
    const lu = Math.max(0, Math.min(KGMAX, K * S.s / G - MP));
    aiguille.rotation.z = -lu / KGMAX * SPAN;
    for (let i = 0; i < NR - 1; i++) {
      const a = corde[i], b = corde[i + 1], m = cordeMeshes[i];
      m.position.copy(a).add(b).multiplyScalar(0.5); tmp.copy(b).sub(a); m.scale.y = tmp.length();
      m.quaternion.setFromUnitVectors(haut, tmp.normalize());
    }
    perle.position.copy(corde[NR - 1]).add(V(0, -0.012, 0)); perle.quaternion.copy(cordeMeshes[NR - 2].quaternion);
    perleHit.position.copy(perle.position);
    if (elTire) { const [x, y] = ecran(perle.position); elTire.style.left = x + '%'; elTire.style.top = y + '%'; }
    // Lumière
    let k = L.on ? 1 : 0;
    if (L.flick > 0) { L.flick -= 1 / 60; k = Math.random() > 0.45 ? 1 : 0.15; }
    L.k += (k - L.k) * (L.flick > 0 ? 1 : 0.2);
    spot.position.copy(lampePos); spot.target.position.set(lampePos.x * 0.4 + (LAY.portrait ? 0.05 : 0), 0, 0); spot.target.updateMatrixWorld();
    spot.intensity = 9 * L.k; M.ampoule.emissiveIntensity = 0.05 + 3.2 * L.k;
    hemi.intensity = 0.14 + 0.4 * L.k; fill.intensity = 0.08 + 0.28 * L.k; lune.intensity = 0.6 * (1 - L.k);
    scene.environmentIntensity = 0.18 + 0.4 * L.k;
    renderer.render(scene, camera);
  }

  let actif = false, raf = 0, t0 = 0, acc = 0, tTicket = 0, intro = false, ema = 16, niveau = 0, tNiv = 0, impair = false;
  function boucle(t) {
    raf = requestAnimationFrame(boucle);
    const brut = t0 ? t - t0 : 16, dt = Math.min(0.05, brut / 1000); t0 = t; acc += dt;
    ema += (brut - ema) * 0.05;
    // Gouverneur : baisse la qualité sur les appareils lents plutôt que de saccader
    if (t - tNiv > 1500 && ema > 30 && niveau < 3) {
      tNiv = t; niveau++;
      if (niveau === 1) renderer.setPixelRatio(1);
      if (niveau === 2) { spot.shadow.mapSize.set(512, 512); spot.shadow.map && spot.shadow.map.dispose(); spot.shadow.map = null; }
      if (niveau === 3) { renderer.shadowMap.enabled = false; scene.traverse(o => { if (o.material) o.material.needsUpdate = true; }); }
      disposer.w = 0; disposer(false);
    }
    let n = 0; while (acc >= DT && n < 10) { pas(false); acc -= DT; n++; } if (n === 10) acc = 0;
    impair = !impair;
    if (niveau < 3 || impair) rendre();
    if (t - tTicket > 90) { tTicket = t; ticket(); }
  }
  const demarrer = () => { if (!actif) { actif = true; t0 = 0; raf = requestAnimationFrame(boucle); } };
  const arreter = () => { actif = false; cancelAnimationFrame(raf); };
  new IntersectionObserver(([e]) => {
    if (e.isIntersecting && !document.hidden) {
      demarrer();
      if (!intro && !reduit) { intro = true; setTimeout(() => { if (premierGeste) return; const b = corpsR[0]; b.p.set(platBas.x - 0.02, platBas.y + 0.42, platBas.z + 0.01); b.v.set(0, 0, 0); b.w.set(2, 0, 3); }, 900); }
    } else arreter();
  }, { threshold: 0.15 }).observe(stage);
  document.addEventListener('visibilitychange', () => { if (document.hidden) arreter(); });
  new ResizeObserver(() => disposer(false)).observe(stage);
  disposer(true);
  const lancerRendu = () => { rendre(); ticket(); root.classList.add('is-pret'); };
  if (renderer.compileAsync) renderer.compileAsync(scene, camera).then(lancerRendu, lancerRendu); else lancerRendu();
}
