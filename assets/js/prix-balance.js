/* IVT — Tendance prix · calculatrice « pensante » (peser un achat en gros).
   Aucun état privé métier : produit, semaine, quantité, unité vivent dans IVT_STORE.
   Prix : fourchettes réelles de data/prix.js (via IVT_APP.DATA.produits). Aucun prix inventé.
   Panier : IVT_APP.definirQuantite() ; WhatsApp : IVT_APP.lienWhatsApp(). */
(() => {
  const A = typeof IVT_APP !== 'undefined' ? IVT_APP : null, P = window.IVT_PRIX, ST = window.IVT_STORE;
  const root = document.getElementById('balance');
  if (!A || !P || !ST || !root) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const M = window.IVT_MOTION, SC = window.IVT_SCENE || { onFrame() {}, kick() {} };
  const $ = s => root.querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fmt = A.fmt, D = A.DATA, SEM = D.semaines, L = SEM.length - 1, dc = i => A.dateCourte(SEM[i]);
  const serie = {}; P.series.forEach(s => { if (s.slug) serie[s.slug] = s; });

  const catOrder = D.categories.map(c => c.id);
  const prods = D.produits.slice().sort((a, b) => (catOrder.indexOf(a.categorie) - catOrder.indexOf(b.categorie)) || a.nom.localeCompare(b.nom, 'fr'));
  const sel = $('#balSel');
  sel.insertAdjacentHTML('beforeend', D.categories.map(c => {
    const l = prods.filter(p => p.categorie === c.id); if (!l.length) return '';
    return `<optgroup label="${esc(c.nom)}">${l.map(p => `<option value="${p.slug}">${esc(p.nom)}</option>`).join('')}</optgroup>`;
  }).join(''));
  const pluriel = (u, q) => (q > 1 && u !== 'kg' && !/s$/.test(u)) ? u + 's' : u;
  const cur = () => ST.get().slug ? A.parSlug[ST.get().slug] : null;
  const kgPer = p => (p && serie[p.slug] && serie[p.slug].kg) || null;
  const uniteAff = p => ST.get().unite === 'kg' ? 'kg' : p.unite;

  let etat = 'vide', devis = [], shown = 0, msg = null;

  /* Prix de la semaine active (ou dernier relevé disponible, daté) */
  function prixSemaine(p, w) {
    let i = w;
    if (p.prix[i] == null) { i = -1; for (let j = w; j >= 0; j--) if (p.prix[j] != null) { i = j; break; } if (i < 0) for (let j = w; j <= L; j++) if (p.prix[j] != null) { i = j; break; } }
    return i;
  }
  function calcul() {
    const p = cur(); if (!p) return null;
    const s = ST.get(), w = ST.semaine(), i = prixSemaine(p, w), fr = p.fourchettes[i] || [p.prix[i], p.prix[i]], kp = kgPer(p);
    const q = parseFloat(s.qte) || 0, div = s.unite === 'kg' ? kp : 1;
    const pu = p.prix[i] / div, lo = fr[0] / div, hi = fr[1] / div;
    let j = -1; for (let x = i - 1; x >= 0; x--) if (p.prix[x] != null) { j = x; break; }
    const rupt = j >= 0 && (p.ruptures || []).some(r => r > j && r <= i);
    return { p, w, i, j, fr, kp, q, pu, lo, hi, rupt, noRel: i !== w, total: Math.round(q * pu), tLo: Math.round(q * lo), tHi: Math.round(q * hi),
      cartQ: s.unite === 'kg' ? Math.ceil(q / kp) : Math.round(q * 10) / 10, prec: typeof fr[2] === 'string' ? fr[2] : '' };
  }

  /* Segments LCD */
  const SEGS = { a: [1.8, 0, 6.6, 1.8], b: [8.6, 1.3, 1.8, 7], c: [8.6, 9.7, 1.8, 7], d: [1.8, 16.2, 6.6, 1.8], e: [0, 9.7, 1.8, 7], f: [0, 1.3, 1.8, 7], g: [1.8, 8.1, 6.6, 1.8] };
  const MAP = { 0: 'abcdef', 1: 'bc', 2: 'abged', 3: 'abgcd', 4: 'fgbc', 5: 'afgcd', 6: 'afgedc', 7: 'abc', 8: 'abcdefg', 9: 'abcdfg', '-': 'g' };
  function segSVG(text, cells, spin) {
    const toks = [];
    for (const ch of String(text)) {
      if (ch === '.' || ch === ',') { if (toks.length) toks[toks.length - 1].dot = true; continue; }
      if (ch === ' ') { toks.push({ gap: true }); continue; }
      toks.push({ ch });
    }
    for (let n = toks.filter(t => !t.gap).length; n < cells; n++) toks.unshift({ ch: null });
    let x = 0, out = '';
    toks.forEach(t => {
      if (t.gap) { x += 4.6; return; }
      const on = t.ch == null ? '' : spin ? 'abcdefg'.split('').filter(() => Math.random() < 0.45).join('') : (MAP[t.ch] || '');
      out += `<g transform="translate(${x.toFixed(1)} 0)">` + Object.keys(SEGS).map(s => { const [a, b, w, h] = SEGS[s]; return `<rect x="${a}" y="${b}" width="${w}" height="${h}" rx=".9" class="${on.includes(s) ? 'on' : 'off'}"/>`; }).join('') +
        `<circle cx="11.6" cy="17.1" r="1" class="${t.dot ? 'on' : 'off'}"/></g>`;
      x += 13.4;
    });
    return `<svg viewBox="-1 -0.5 ${(x + 1).toFixed(1)} 19" aria-hidden="true" focusable="false"><g transform="skewX(-6) translate(1.6 0)">${out}</g></svg>`;
  }

  const el = { nom: $('#balNom'), cond: $('#balCond'), q: $('#balQ'), u: $('#balU'), t: $('#balTot'), r: $('#balRead'), sr: $('#balSr'), lcd: $('.lcd'),
    unit: $('[data-k="unit"]'), wk: $('#balWeek'), wkT: $('#balWeekTxt'), now: $('#balNow'),
    ticket: $('#balTicket'), add: $('#balAdd'), wa: $('#balWa'), tl: $('#balTicketL'), tt: $('#balTicketT'), mini: document.getElementById('balMini') };

  function lecture(c) {
    const u = uniteAff(c.p), out = [];
    if (c.noRel) out.push(`<b>Pas de relevé le ${esc(dc(c.w))}</b> · prix du relevé du ${esc(dc(c.i))}`);
    let l1 = c.lo === c.hi ? `Prix relevé ${fmt(c.pu)} F/${esc(u)}` : `Médian ${fmt(c.pu)} F/${esc(u)} · ${fmt(c.lo)}–${fmt(c.hi)}`;
    if (c.kp && ST.get().unite === 'colis') l1 += ` · ${fmt(c.p.prix[c.i] / c.kp)} F/kg`;
    out.push(l1);
    if (c.q > 0 && c.w !== L) out.push(`Ce lot vous aurait coûté <b>${fmt(c.total)} F</b> le ${esc(dc(c.i))}`);
    else if (c.q > 0) {
      let v;
      if (c.j < 0) v = 'premier relevé';
      else if (c.rupt) v = `contenant changé depuis le ${esc(dc(c.j))}`;
      else { const pct = (c.p.prix[c.i] - c.p.prix[c.j]) / c.p.prix[c.j] * 100; v = `${Math.abs(pct) < 0.5 ? 'stable' : (pct > 0 ? '▲ ' : '▼ ') + Math.abs(pct).toFixed(1).replace('.', ',') + ' %'} vs relevé du ${esc(dc(c.j))}`; }
      out.push((c.tLo !== c.tHi ? `${fmt(c.tLo)}–${fmt(c.tHi)} F · ` : '') + v + (ST.get().unite === 'kg' ? ` · ≈ ${c.cartQ} ${esc(pluriel(c.p.unite, c.cartQ))}` : ''));
    }
    return out.map(x => `<span>${x}</span>`).join('');
  }
  let tRaf = 0;
  function total(v, anim) {
    cancelAnimationFrame(tRaf);
    el.t.classList.toggle('is-live', etat === 'saisie');
    el.t.classList.toggle('is-ghost', !v && etat !== 'resultat');
    if (!anim) { shown = v; el.t.innerHTML = segSVG(fmt(v), 9); return; }
    const de = shown, t0 = performance.now(), dur = 420;
    const pas = now => { const x = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - x, 3); shown = Math.round(de + (v - de) * e); el.t.innerHTML = segSVG(fmt(shown), 9); if (x < 1) tRaf = requestAnimationFrame(pas); };
    tRaf = requestAnimationFrame(pas);
  }
  function rendre(o = {}) {
    const s = ST.get(), c = calcul(), p = c && c.p;
    sel.value = p ? p.slug : '';
    el.lcd.dataset.etat = etat;
    el.lcd.classList.toggle('is-week', !!c && c.w !== L);
    if (!p) {
      el.nom.textContent = 'Choisir un produit'; el.cond.textContent = '◀ ▶ ou touchez ici';
      el.u.textContent = ''; el.q.innerHTML = segSVG('0', 6); el.q.classList.add('is-ghost'); total(0);
      el.r.innerHTML = msg ? `<span class="lcd__msg">${msg}</span>` : '<span>Choisissez un produit, tapez une quantité, puis =</span>';
      el.unit.disabled = true; el.unit.textContent = 'kg'; el.wk.hidden = true; majActions(null); mini(null); return;
    }
    el.nom.textContent = p.nom;
    el.cond.textContent = [p.colis, c.prec].filter(Boolean).join(' · ');
    const u = uniteAff(p);
    el.u.textContent = pluriel(u, c.q).toUpperCase();
    el.q.innerHTML = segSVG(s.qte || '0', 6); el.q.classList.toggle('is-ghost', !s.qte);
    el.unit.disabled = !c.kp; el.unit.textContent = c.kp ? (s.unite === 'kg' ? p.unite : 'kg') : u;
    el.unit.setAttribute('aria-label', c.kp ? `Saisir en ${s.unite === 'kg' ? p.unite : 'kilogrammes'}` : `Unité : ${u}`);
    el.wk.hidden = c.w === L;
    el.wkT.textContent = `Semaine du ${dc(c.w)}`;
    if (msg) el.r.innerHTML = `<span class="lcd__msg">${msg}</span>`;
    else if (etat === 'vide') el.r.innerHTML = `${c.noRel ? `<span><b>Pas de relevé le ${esc(dc(c.w))}</b> · dernier relevé : ${esc(dc(c.i))}</span>` : ''}<span>Tapez une quantité en ${esc(u)}, puis =</span>`;
    else if (etat === 'saisie') el.r.innerHTML = `<span>Total provisoire · = pour la lecture</span>`;
    else if (etat === 'resultat') el.r.innerHTML = lecture(c) + (devis.length < 1 ? '<span class="lcd__hint">+ pour imprimer sur le devis</span>' : '');
    if (!o.keepTotal) total(c.total, etat === 'resultat' && !reduced && o.count);
    el.sr.textContent = `${p.nom}, ${c.q || 0} ${u}, total ${fmt(c.total)} francs CFA${c.w !== L ? ', semaine du ' + dc(c.w) : ''}`;
    majActions(c); mini(c);
  }
  function penser() {
    etat = 'calcul'; el.lcd.dataset.etat = 'calcul'; el.r.innerHTML = '<span class="lcd__msg">Calcul…</span>';
    const fin = () => { etat = 'resultat'; rendre({ count: true }); const c = calcul(); ST.set({ lot: { w: c.w, i: c.i, total: c.total, t: performance.now() } }, 'calc'); };
    if (reduced) return fin();
    const t0 = performance.now(), n = Math.max(1, calcul().total);
    const tick = () => { if (etat !== 'calcul') return; el.t.innerHTML = segSVG(fmt(n), 9, true); if (performance.now() - t0 < 320) setTimeout(tick, 45); else fin(); };
    tick();
  }
  let msgT = 0;
  function flash(html, err) {
    msg = html; clearTimeout(msgT); rendre({ keepTotal: true });
    if (err && !reduced) el.lcd.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-4px)' }, { transform: 'translateX(3px)' }, { transform: 'none' }], { duration: 240 });
    msgT = setTimeout(() => { msg = null; rendre({ keepTotal: true }); }, err ? 1600 : 2200);
  }

  /* Devis + actions */
  function ligne() { const c = calcul(); if (!c || c.q <= 0) return null; return { slug: c.p.slug, nom: c.p.nom, q: c.q, u: uniteAff(c.p), total: c.total, cartQ: c.cartQ }; }
  function items() { if (devis.length) return devis; const l = ligne(); return l ? [l] : []; }
  let tAnim = null;
  function imprimer() {           // le papier sort de la fente ; même durée pour l'animation et le son
    const h0 = el.ticket.hidden ? 0 : el.ticket.offsetHeight;
    majTicket();
    const h1 = el.ticket.scrollHeight, dur = Math.min(0.9, Math.max(0.28, (h1 - h0) / 150));
    if (reduced || h1 <= h0) return;
    window.IVT_SOUND && IVT_SOUND.print(dur);
    tAnim && tAnim.cancel();
    tAnim = el.ticket.animate([{ height: h0 + 'px' }, { height: h1 + 'px' }], { duration: dur * 1000, easing: 'steps(' + Math.max(6, Math.round(dur / 0.036)) + ', end)' });
  }
  function dechirer() {
    if (el.ticket.hidden) return;
    window.IVT_SOUND && IVT_SOUND.tear();
    if (reduced) { devis = []; majTicket(); return; }
    const a = el.ticket.animate([{ transform: 'none', opacity: 1 }, { transform: 'translate3d(0,-14px,0) rotate(-2deg)', opacity: 0 }], { duration: 220, easing: 'cubic-bezier(.4,0,.6,1)' });
    let done = false; const fin = () => { if (done) return; done = true; devis = []; majTicket(); ST.set({ qte: '' }, 'calc'); };
    a.onfinish = fin; setTimeout(fin, 320);
  }
  function majTicket() {
    el.ticket.hidden = !devis.length;
    const vis = devis.slice(-3), plus = devis.length - vis.length;
    el.tl.innerHTML = (plus ? `<li class="more">+ ${plus} ligne${plus > 1 ? 's' : ''} précédente${plus > 1 ? 's' : ''}</li>` : '') +
      vis.map(l => `<li><span>${esc(l.nom)}</span><span>${fmt(l.q)} ${esc(pluriel(l.u, l.q))}</span><b>${fmt(l.total)} F</b></li>`).join('');
    el.tt.textContent = fmt(devis.reduce((s, l) => s + l.total, 0)) + ' F';
  }
  function majActions() {
    const it = items(), ok = it.length > 0;
    el.add.disabled = !ok; el.add.textContent = devis.length ? 'Ajouter le devis' : 'Ajouter au panier';
    el.wa.setAttribute('aria-disabled', String(!ok)); el.wa.tabIndex = ok ? 0 : -1;
    if (!ok) { el.wa.href = '#'; return; }
    const w = ST.semaine(), tot = it.reduce((s, l) => s + l.total, 0);
    el.wa.href = A.lienWhatsApp(`Bonjour IVT, voici mon estimation (prix de gros relevés à Adjamé, semaine du ${dc(w)}) :\n\n${it.map(l => `- ${l.nom} : ${fmt(l.q)} ${pluriel(l.u, l.q)} ≈ ${fmt(l.total)} F`).join('\n')}\n\nTotal estimé : ${fmt(tot)} F CFA (hors transport).\nPouvez-vous me confirmer la cotation ?`);
  }
  el.add.addEventListener('click', () => {
    const it = items(); if (!it.length) return;
    const deja = new Map(A.lignesPanier().map(l => [l.produit.slug, l.qte])), cumul = new Map();
    it.forEach(l => cumul.set(l.slug, (cumul.get(l.slug) || 0) + l.cartQ));
    cumul.forEach((q, slug) => A.definirQuantite(slug, (deja.get(slug) || 0) + q));
    flash(`✓ Ajouté au panier · ${it.length} ligne${it.length > 1 ? 's' : ''}`);
  });
  el.wa.addEventListener('click', e => { if (el.wa.getAttribute('aria-disabled') === 'true') e.preventDefault(); });
  el.now.addEventListener('click', () => ST.set({ semaine: null, preview: null }, 'calc'));

  /* Mini-résumé collant (mobile) */
  let calcVisible = true, dashVisible = false;
  function mini(c) {
    if (!el.mini) return;
    const show = innerWidth < 768 && !calcVisible && dashVisible && c && c.q > 0;
    el.mini.hidden = !show;
    if (show) el.mini.textContent = `${c.p.nom} · ${fmt(c.q)} ${pluriel(uniteAff(c.p), c.q)} · ${fmt(c.total)} F${c.w !== L ? ' · ' + dc(c.w) : ''}`;
  }
  if ('IntersectionObserver' in window && el.mini) {
    new IntersectionObserver(es => { calcVisible = es[0].isIntersecting; mini(calcul()); }, { threshold: 0.15 }).observe(root.querySelector('.calc__body'));
    const db = document.querySelector('.db'); db && new IntersectionObserver(es => { dashVisible = es[0].isIntersecting; mini(calcul()); }).observe(db);
    el.mini.addEventListener('click', () => allerA());
  }

  /* Touches */
  function choisir(slug) {
    const p = A.parSlug[slug]; if (!p) return;
    ST.set({ slug, unite: ST.get().unite === 'kg' && !kgPer(p) ? 'colis' : ST.get().unite }, 'calc');
  }
  function decal(d) {
    const i = prods.findIndex(p => p.slug === ST.get().slug);
    choisir(prods[i < 0 ? (d > 0 ? 0 : prods.length - 1) : (i + d + prods.length) % prods.length].slug);
  }
  function touche(key) {
    const s = ST.get(), p = cur();
    if (key === 'prev') return decal(-1);
    if (key === 'next') return decal(1);
    if (!p && key !== 'C') return flash("Choisissez d'abord un produit ◀ ▶", true);
    if (/^[0-9]$/.test(key)) {
      if (s.qte.replace('.', '').length >= 7) return flash('Quantité trop grande', true);
      etat = 'saisie'; msg = null; return ST.set({ qte: (s.qte === '0' ? '' : s.qte) + key }, 'calc');
    }
    switch (key) {
      case '.':
        if (uniteAff(p) !== 'kg') return flash(`Quantité entière en ${esc(uniteAff(p))}`, true);
        if (s.qte.includes('.')) return flash('Une seule virgule', true);
        etat = 'saisie'; return ST.set({ qte: (s.qte || '0') + '.' }, 'calc');
      case 'back': { const q = s.qte.slice(0, -1); etat = q ? 'saisie' : 'vide'; return ST.set({ qte: q }, 'calc'); }
      case 'C':
        msg = null;
        if (s.qte) { etat = 'vide'; return ST.set({ qte: '' }, 'calc'); }
        if (devis.length) { dechirer(); etat = 'vide'; return; }
        etat = 'vide'; return ST.set({ lot: null }, 'calc');
      case 'unit': {
        if (!kgPer(p)) return;
        const u = s.unite === 'kg' ? 'colis' : 'kg', q = u === 'kg' ? s.qte : s.qte.split('.')[0];
        etat = q ? 'saisie' : 'vide'; return ST.set({ unite: u, qte: q }, 'calc');
      }
      case '=':
        if (!(parseFloat(s.qte) > 0)) return flash('Saisissez une quantité', true);
        return penser();
      case '+': {
        const l = ligne(); if (!l) return flash('Saisissez une quantité', true);
        const x = devis.findIndex(d => d.slug === l.slug && d.u === l.u);
        if (x >= 0) devis[x] = l; else devis.push(l);
        imprimer(); etat = 'vide';
        ST.set({ qte: '' }, 'calc');
        return flash(`Ajouté au devis · ${devis.length} ligne${devis.length > 1 ? 's' : ''}`);
      }
    }
  }
  const keys = [...root.querySelectorAll('[data-k]')], press = new Map();
  keys.forEach(b => {
    press.set(b, [0, 0, 0]);
    b.addEventListener('click', () => { window.IVT_SOUND && IVT_SOUND.play(b.dataset.k === '=' ? 'eq' : 'key'); touche(b.dataset.k); pulse(b); });
    if (!reduced) {
      b.addEventListener('pointerdown', () => { press.get(b)[2] = 1; SC.kick(); });
      ['pointerup', 'pointerleave', 'pointercancel'].forEach(t => b.addEventListener(t, () => { press.get(b)[2] = 0; }));
    }
  });
  function pulse(b) { if (reduced) return; const s = press.get(b); s[2] = 1; SC.kick(); setTimeout(() => { s[2] = 0; }, 90); }
  SC.onFrame(dt => press.forEach((s, b) => {
    if (Math.abs(s[0] - s[2]) < 0.002 && Math.abs(s[1]) < 0.01) { if (s[0] !== s[2]) { s[0] = s[2]; b.style.setProperty('--d', s[2]); } return; }
    [s[0], s[1]] = M.spring(s[0], s[1], s[2], dt, 0.35, 0.72);
    b.style.setProperty('--d', Math.max(-0.15, Math.min(1.15, s[0])).toFixed(3));
  }));
  sel.addEventListener('change', () => { if (sel.value) choisir(sel.value); });
  const KB = { Enter: '=', '=': '=', Backspace: 'back', Escape: 'C', Delete: 'C', ArrowLeft: 'prev', ArrowRight: 'next', '+': '+', ',': '.', '.': '.', u: 'unit', U: 'unit' };
  root.addEventListener('keydown', e => {
    if (e.target === sel || e.target.closest('.calc__act, .lcd__back')) return;
    const key = /^[0-9]$/.test(e.key) ? e.key : KB[e.key];
    if (!key) return;
    if (e.key === 'Enter' && e.target.closest('button') && e.target.dataset.k !== '=') return;
    e.preventDefault(); window.IVT_SOUND && IVT_SOUND.play(key === '=' ? 'eq' : 'key'); touche(key);
    const b = keys.find(x => x.dataset.k === key); b && pulse(b);
  });

  /* Réagit au store (produit, semaine, quantité, unité) */
  let lastSlug = null;
  document.addEventListener('ivt:calc', e => {
    const s = ST.get(), pt = e.detail.patch;
    if ('slug' in pt && s.slug !== lastSlug) { lastSlug = s.slug; if (etat === 'resultat' && parseFloat(s.qte) > 0) return penser(); }
    if (('semaine' in pt || 'preview' in pt) && etat === 'resultat' && parseFloat(s.qte) > 0) { rendre({ count: true }); const c = calcul(); ST.set({ lot: { w: c.w, i: c.i, total: c.total, quiet: true } }, 'calc'); return; }
    if ('lot' in pt) return;
    rendre();
  });

  /* Continuité : « Peser un achat » depuis la fiche historique, ?p=slug, #balance */
  function allerA() {
    const y = root.getBoundingClientRect().top + scrollY - (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) || 70) - 12;
    scrollTo({ top: Math.max(0, y), behavior: reduced ? 'auto' : 'smooth' });
  }
  document.addEventListener('click', e => {
    const a = e.target.closest && e.target.closest('[data-balance]'); if (!a) return;
    e.preventDefault();
    const dlg = document.getElementById('pxDlg');
    if (dlg && dlg.open) { dlg.classList.remove('is-open'); dlg.close(); document.documentElement.style.overflow = ''; }
    etat = 'vide'; ST.set({ qte: '', unite: 'colis', semaine: null, preview: null }, 'calc'); choisir(a.dataset.balance); allerA();
  });
  const qp = new URLSearchParams(location.search).get('p');
  rendre(); majTicket();
  if (qp && A.parSlug[qp]) { choisir(qp); requestAnimationFrame(() => setTimeout(allerA, 80)); }
  else if (location.hash === '#balance') requestAnimationFrame(() => setTimeout(allerA, 80));
})();
