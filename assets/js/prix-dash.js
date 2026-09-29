/* IVT — Tendance prix · tableau de bord de l'indice, branché sur IVT_STORE.
   Le calcul de l'indice reste celui de prix.js (IVT_INDICE, lecture seule).
   · Produit choisi → sa courbe (rebasée à 100 sur son 1er relevé, trous = null, ruptures = rupt)
     face à l'indice en tracé fantôme ; ligne de lecture ; repère sur la barre hausse/stable/baisse.
   · Survol / toucher d'une semaine → la calculatrice recalcule le lot avec le prix de cette semaine.
   · « = » sur la calculatrice → impulsion lumineuse écran → point de la semaine, étiquette « votre lot ». */
(() => {
  const A = typeof IVT_APP !== 'undefined' ? IVT_APP : null, I = window.IVT_INDICE, ST = window.IVT_STORE;
  const card = document.querySelector('.db');
  if (!A || !I || !ST || !card) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const { indice, indPct, W, N, L, jm, periode, pctTxt, sensDe, tendance, varAt, comparable } = I;
  const $ = s => card.querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const f1 = x => x.toFixed(1).replace('.', ',');
  const chart = $('#pxIdxChart'), trend = $('#pxTrend'), read = $('#dbRead'), when = $('#dbWhen'), big = $('#pxIdx'), inTxt = $('#dbIn');
  const modeBtns = [...card.querySelectorAll('[data-mode]')];
  const serieDe = slug => I.series.find(s => s.slug === slug) || null;
  const X = W.map(w => new Date(w.debut + 'T00:00:00').getTime()), xPct = i => (X[i] - X[0]) / (X[L] - X[0]) * 100;
  const trous = []; for (let i = 1; i < N; i++) if ((X[i] - X[i - 1]) / 864e5 > 8) trous.push([i - 1, i]);

  /* Courbe produit : segments coupés aux null et aux ruptures, chacun rebasé à 100 */
  function segments(s) {
    const segs = []; let seg = null, base = null;
    for (let i = 0; i < N; i++) {
      const v = s.m[i];
      if (v == null) { if (seg) segs.push(seg); seg = null; continue; }
      if (seg && s.rupt.includes(i)) { segs.push(seg); seg = null; }
      if (!seg) { seg = { rupt: s.rupt.includes(i) && segs.length > 0, pts: [] }; base = v; }
      seg.pts.push({ i, y: v / base * 100 });
    }
    if (seg) segs.push(seg);
    return segs;
  }

  function dessiner() {
    const s = ST.get().slug ? serieDe(ST.get().slug) : null, w = ST.semaine(), lot = ST.get().lot;
    const segs = s ? segments(s) : [];
    const all = [...indice, ...segs.flatMap(g => g.pts.map(p => p.y))];
    let lo = Math.min(...all), hi = Math.max(...all); const pad = (hi - lo) * 0.14 || 5; lo -= pad; hi += pad;
    const yP = v => 6 + (1 - (v - lo) / (hi - lo)) * 88, xs = i => xPct(i) * 10;
    let svg = [0.25, 0.5, 0.75].map(t => `<line x1="0" x2="1000" y1="${6 + t * 88}" y2="${6 + t * 88}" class="db__grid"/>`).join('');
    trous.forEach(([a, b]) => { svg += `<rect x="${xs(a) + 8}" y="0" width="${xs(b) - xs(a) - 16}" height="100" class="db__gap"/>`; });
    svg += `<polyline points="${indice.map((v, i) => `${xs(i)},${yP(v)}`).join(' ')}" class="db__idx${s ? ' is-ghost' : ''}"/>`;
    segs.forEach(g => {
      if (g.pts.length > 1) svg += `<polyline points="${g.pts.map(p => `${xs(p.i)},${yP(p.y)}`).join(' ')}" class="db__prod"/>`;
      if (g.rupt) svg += `<line x1="${xs(g.pts[0].i)}" x2="${xs(g.pts[0].i)}" y1="4" y2="96" class="db__rupt"/>`;
    });
    const dotsIdx = indice.map((v, i) => `<i class="db__dot db__dot--idx${s ? ' is-ghost' : ''}${i === w && !s ? ' is-on' : ''}" style="left:${xPct(i)}%;top:${yP(v)}%"></i>`).join('');
    const dotsP = segs.flatMap(g => g.pts).map(p => `<i class="db__dot db__dot--prod${p.i === w ? ' is-on' : ''}" data-i="${p.i}" style="left:${xPct(p.i)}%;top:${yP(p.y)}%"></i>`).join('');
    const rl = segs.filter(g => g.rupt).map(g => `<span class="db__rlab" style="left:${xPct(g.pts[0].i)}%">contenant changé</span>`).join('');
    const gl = trous.map(([a, b]) => `<span class="db__glab" style="left:${(xPct(a) + xPct(b)) / 2}%">pas de relevé</span>`).join('');
    // point du lot (prix réellement utilisé : semaine active ou dernier relevé)
    let lotHtml = '';
    if (s && lot && lot.total > 0) {
      const p = segs.flatMap(g => g.pts).find(q => q.i === lot.i);
      if (p) lotHtml = `<span class="db__lot" style="left:${xPct(p.i)}%;top:${yP(p.y)}%">votre lot : ${A.fmt(lot.total)} F</span>`;
    }
    const cols = W.map((wk, i) => {
      const a = xPct(i), b = i ? xPct(i - 1) : a, c = i < L ? xPct(i + 1) : a;
      const l = i ? (a + b) / 2 : 0, r = i < L ? (a + c) / 2 : 100;
      return `<button type="button" class="db__col" data-w="${i}" style="left:${l}%;width:${r - l}%" aria-label="Semaine du ${esc(jm(wk.debut))} : indice ${f1(indice[i])}${s ? ', ' + esc(s.nom) + (s.m[i] == null ? ' pas de relevé' : '') : ''}"></button>`;
    }).join('');
    chart.innerHTML = `<div class="db__chart">
      <svg viewBox="0 0 1000 100" preserveAspectRatio="none" aria-hidden="true">${svg}</svg>
      <i class="db__now" style="left:${xPct(w)}%"></i>${gl}${rl}${dotsIdx}${dotsP}${lotHtml}
      <div class="db__cols">${cols}</div>
      ${s ? `<span class="db__legend"><i class="p"></i>${esc(s.nom)} (base 100 au ${esc(jm(W[s.first].debut))})<i class="g"></i>Indice</span>` : ''}
    </div><div class="db__x" aria-hidden="true">${W.map((wk, i) => `<span style="left:${xPct(i)}%"${i === w ? ' class="is-on"' : ''}>${jm(wk.debut)}</span>`).join('')}</div>`;
  }

  /* Pastilles des semaines : lecture Marché ou Produit */
  function pastilles() {
    const s = ST.get().slug ? serieDe(ST.get().slug) : null, mode = s ? ST.get().mode : 'marche', w = ST.semaine();
    trend.innerHTML = W.map((wk, i) => {
      let cls, lab, val;
      if (mode === 'marche') { cls = i ? sensDe(indPct[i]) : 'base'; lab = tendance(indPct[i]); val = i ? pctTxt(indPct[i]) : '—'; }
      else {
        const v = varAt(s, i);
        if (!v) { cls = 'na'; lab = 'Pas de relevé'; val = '·'; }
        else if (v.type === 'nouveau') { cls = 'base'; lab = 'Base'; val = '—'; }
        else if (v.type === 'rupture') { cls = 'na'; lab = 'Contenant'; val = '≠'; }
        else { cls = sensDe(v.pct); lab = tendance(v.pct); val = pctTxt(v.pct); }
      }
      return `<li class="px-trend__i px-trend__i--${cls}${i === w ? ' is-on' : ''}"><button type="button" class="db__wk" data-w="${i}" aria-pressed="${i === w}"><span>${jm(wk.debut)}</span><b>${lab}</b><i>${val}</i></button></li>`;
    }).join('');
  }

  /* Ligne de lecture + repère « dans l'indice » */
  function lecture() {
    const s = ST.get().slug ? serieDe(ST.get().slug) : null, w = ST.semaine();
    modeBtns.forEach(b => { b.disabled = b.dataset.mode === 'produit' && !s; b.setAttribute('aria-pressed', String((s ? ST.get().mode : 'marche') === b.dataset.mode)); });
    card.querySelector('.db__mark') && card.querySelector('.db__mark').remove();
    if (!s) { read.textContent = 'Choisissez un produit sur la calculatrice pour comparer sa courbe à l\u2019indice. Survolez une semaine pour remonter le temps.'; inTxt.textContent = ''; return; }
    const last = s.last, rs = [...s.rupt].filter(k => k > s.first && k <= last).pop();
    let from = rs != null ? rs : s.first; while (s.m[from] == null && from < last) from++;
    const pP = (s.m[last] / s.m[from] - 1) * 100, pI = (indice[last] / indice[from] - 1) * 100;
    read.innerHTML = from === last ? `<b>${esc(s.nom)}</b> : un seul relevé comparable pour l\u2019instant.`
      : `<b>${esc(s.nom)}</b> : ${pctTxt(pP)} depuis le ${esc(jm(W[from].debut))}${rs != null ? ' (contenant changé ce jour-là)' : ''}, contre ${pctTxt(pI)} pour l\u2019indice${last !== L ? ` · dernier relevé le ${esc(jm(W[last].debut))}` : ''}.`;
    // Barre hausse / stable / baisse : repère sur le segment du produit (semaine courante)
    const v = varAt(s, L), bar = card.querySelector('.px-breadth__bar');
    if (bar && v && v.type === 'pct') {
      const seg = bar.querySelector('.' + sensDe(v.pct));
      if (seg) { const m = document.createElement('span'); m.className = 'db__mark'; m.style.left = (seg.offsetLeft + seg.offsetWidth / 2) + 'px'; m.title = s.nom; bar.appendChild(m); }
    }
    if (comparable(s, L)) inTxt.innerHTML = `<b>${esc(s.nom)}</b> compte dans l\u2019indice cette semaine.`;
    else {
      const why = !s.r[L] ? 'pas de relevé cette semaine' : !s.r[L - 1] ? `pas de relevé le ${jm(W[L - 1].debut)}` : 'contenant changé';
      inTxt.innerHTML = `<b>Hors indice</b> cette semaine : ${why}, pas de relevé comparable.`;
    }
  }

  /* Grand chiffre : l'indice du marché, interpolé vers la semaine active */
  let shownI = indice[L], iRaf = 0;
  function grandChiffre() {
    const w = ST.semaine(), to = indice[w];
    when.textContent = w === L ? '' : `semaine du ${jm(W[w].debut)}`;
    cancelAnimationFrame(iRaf);
    if (reduced) { shownI = to; big.textContent = f1(to); return; }
    const de = shownI, t0 = performance.now();
    const pas = now => { const k = Math.min(1, (now - t0) / 360), e = 1 - Math.pow(1 - k, 3); shownI = de + (to - de) * e; big.textContent = f1(shownI); if (k < 1) iRaf = requestAnimationFrame(pas); };
    iRaf = requestAnimationFrame(pas);
  }

  /* Interactions semaines : survol = aperçu, clic = épingler, sortie = retour */
  const fineP = matchMedia('(hover: hover) and (pointer: fine)').matches;
  card.addEventListener('pointerover', e => { if (e.pointerType !== 'mouse') return; const b = e.target.closest('[data-w]'); if (b) ST.set({ preview: +b.dataset.w }, 'dash'); });
  card.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse' && ST.get().preview != null) ST.set({ preview: null }, 'dash'); });
  card.addEventListener('focusin', e => { const b = e.target.closest('[data-w]'); if (b) ST.set({ preview: +b.dataset.w }, 'dash'); });
  card.addEventListener('focusout', e => { if (!card.contains(e.relatedTarget)) ST.set({ preview: null }, 'dash'); });
  card.addEventListener('click', e => {
    const b = e.target.closest('[data-w]');
    if (b) { const i = +b.dataset.w; ST.set({ semaine: i === L ? null : i, preview: fineP ? i : null }, 'dash'); return; }
    const m = e.target.closest('[data-mode]'); if (m && !m.disabled) ST.set({ mode: m.dataset.mode }, 'dash');
  });
  // glisser au doigt sur le graphique
  chart.addEventListener('pointermove', e => {
    if (e.pointerType === 'mouse' || !e.buttons) return;
    const r = chart.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * 100;
    let best = 0; W.forEach((_, i) => { if (Math.abs(xPct(i) - x) < Math.abs(xPct(best) - x)) best = i; });
    if (best !== ST.semaine()) ST.set({ semaine: best === L ? null : best }, 'dash');
  });

  /* Signal calculatrice → graphique */
  function signal(lot) {
    const calcLcd = document.querySelector('#balance .lcd'), dot = chart.querySelector(`.db__dot--prod[data-i="${lot.i}"]`);
    const label = chart.querySelector('.db__lot');
    const arrive = () => { if (dot) { dot.classList.remove('is-pulse'); void dot.offsetWidth; dot.classList.add('is-pulse'); } label && label.classList.remove('is-wait'); };
    const desk = innerWidth >= 1024 && fineP && !reduced;
    if (!desk || !calcLcd || !dot) { arrive(); calcLcd && calcLcd.classList.add('is-sync'); setTimeout(() => calcLcd && calcLcd.classList.remove('is-sync'), 700); return; }
    const a = calcLcd.getBoundingClientRect(), b = dot.getBoundingClientRect();
    const x0 = a.right - 18, y0 = a.top + a.height * 0.55, x1 = b.left + b.width / 2, y1 = b.top + b.height / 2;
    const cx = (x0 + x1) / 2, cy = Math.min(y0, y1) - Math.max(60, Math.abs(x1 - x0) * 0.18);
    const d = `M${x0.toFixed(1)} ${y0.toFixed(1)} Q${cx.toFixed(1)} ${cy.toFixed(1)} ${x1.toFixed(1)} ${y1.toFixed(1)}`;
    const ov = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    ov.setAttribute('class', 'db__signal'); ov.setAttribute('aria-hidden', 'true');
    ov.innerHTML = `<path d="${d}" pathLength="1"/><circle r="4"/>`;
    document.body.appendChild(ov);
    const path = ov.querySelector('path'), dotS = ov.querySelector('circle');
    dotS.style.offsetPath = `path('${d}')`;
    path.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0, offset: 0.7 }, { strokeDashoffset: 0, opacity: 0 }], { duration: 620, easing: 'cubic-bezier(.3,.1,.2,1)', fill: 'forwards' });
    const an = dotS.animate([{ offsetDistance: '0%', opacity: 0 }, { opacity: 1, offset: 0.1 }, { offsetDistance: '100%', opacity: 1 }], { duration: 520, easing: 'cubic-bezier(.3,.1,.2,1)', fill: 'forwards' });
    an.onfinish = () => { arrive(); setTimeout(() => ov.remove(), 160); };
    setTimeout(() => ov.remove(), 1200);
  }

  function tout() { dessiner(); pastilles(); lecture(); }
  document.addEventListener('ivt:semaine', () => { dessiner(); pastilles(); grandChiffre(); });
  document.addEventListener('ivt:calc', e => {
    const pt = e.detail.patch;
    if ('slug' in pt || 'mode' in pt) { if ('slug' in pt && pt.slug && !('mode' in pt) && ST.get().mode === 'marche' && !card.dataset.userMode) ST.get().mode = 'produit'; tout(); }
    if ('mode' in pt && e.detail.src === 'dash') card.dataset.userMode = '1';
    if ('lot' in pt) { const lot = ST.get().lot; dessiner(); if (lot && lot.total > 0 && !lot.quiet) { const lb = chart.querySelector('.db__lot'); lb && lb.classList.add('is-wait'); requestAnimationFrame(() => signal(lot)); } }
  });
  addEventListener('resize', () => lecture());
  tout();
})();
