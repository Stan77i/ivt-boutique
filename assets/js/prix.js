/* ============================================================
   IVT — Page « Tendance prix du marché »
   Lit window.IVT_PRIX (data/prix.js). Aucune dépendance externe.
   ============================================================ */
(() => {
  const A = IVT_APP, P = window.IVT_PRIX;
  if (!P) return;
  const S = P.series, W = P.semaines, N = W.length, L = N - 1;
  const $ = s => document.querySelector(s);
  const fmt = A.fmt;
  const MOIS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
  const dt = iso => new Date(iso + 'T00:00:00');
  const jm = iso => { const x = dt(iso); return x.getDate() + ' ' + MOIS[x.getMonth()]; };
  const periode = w => { const a = dt(w.debut), b = dt(w.fin); return a.getMonth() === b.getMonth() ? `${a.getDate()} – ${b.getDate()} ${MOIS[b.getMonth()]}` : `${jm(w.debut)} – ${jm(w.fin)}`; };
  const mid = v => v ? (v[0] + v[1]) / 2 : null;
  const catNom = id => (P.categories.find(c => c.id === id) || {}).nom || '';
  const pctTxt = (x, dec = 1) => (x > 0 ? '+' : x < 0 ? '−' : '') + Math.abs(x).toFixed(dec).replace('.', ',') + ' %';
  const sensDe = x => x == null ? 'flat' : x > 0.5 ? 'up' : x < -0.5 ? 'down' : 'flat';
  const rng = v => v[0] === v[1] ? fmt(v[0]) : fmt(v[0]) + ' – ' + fmt(v[1]);
  const sansAccent = t => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fleche = s => s === 'up' ? '▲' : s === 'down' ? '▼' : '—';

  /* ---------- Préparation des séries ---------- */
  S.forEach(s => {
    s.m = s.r.map(mid);
    s.first = s.r.findIndex(Boolean);
    s.last = s.r.length - 1 - [...s.r].reverse().findIndex(Boolean);
    s.n = s.r.filter(Boolean).length;
    s.nouveau = !!s.nouveau || s.first >= N - 4;
    s.label = s.nom + (s.variante ? ' · ' + s.variante : '');
    s.q = sansAccent(s.label + ' ' + catNom(s.cat) + ' ' + s.cond);
  });
  const parId = Object.fromEntries(S.map(s => [s.id, s]));

  function varAt(s, i) {
    if (!s.r[i]) return null;
    let j = i - 1; while (j >= 0 && !s.r[j]) j--;
    if (j < 0) return { type: 'nouveau' };
    if (s.rupt.some(k => k > j && k <= i)) return { type: 'rupture', j };
    return { type: 'pct', j, pct: (s.m[i] - s.m[j]) / s.m[j] * 100 };
  }

  /* ---------- Indice vivrier IVT (chaîné, moyenne géométrique, base 100) ---------- */
  const indice = [100], indPct = [null], indN = [null];
  for (let i = 1; i < N; i++) {
    const rs = S.filter(s => s.r[i] && s.r[i - 1] && !s.rupt.includes(i)).map(s => s.m[i] / s.m[i - 1]);
    const g = rs.length ? Math.exp(rs.reduce((a, r) => a + Math.log(r), 0) / rs.length) : 1;
    indice[i] = indice[i - 1] * g; indPct[i] = (g - 1) * 100; indN[i] = rs.length;
  }
  const tendance = p => p == null ? 'Base' : p <= -2 ? 'Baisse' : p >= 2 ? 'Hausse' : 'Stable';
  // Exposé tel quel (lecture seule) pour la scène « balance » : même calcul, aucune duplication.
  window.IVT_INDICE = { indice, indPct, indN, series: S, varAt, W, N, L, jm, periode, pctTxt, sensDe, tendance, mid,
    comparable: (s, i) => !!(i > 0 && s.r[i] && s.r[i - 1] && !s.rupt.includes(i)) };

  /* ---------- Graphique générique (SVG étiré + repères HTML) ---------- */
  const X = W.map(w => dt(w.debut).getTime());
  const xPct = i => (X[i] - X[0]) / (X[L] - X[0]) * 100;
  const trous = [];
  for (let i = 1; i < N; i++) if ((X[i] - X[i - 1]) / 864e5 > 8) trous.push([i - 1, i]);

  function graphique(el, o) {
    const pts = o.points; // [{i, y, lo, hi, tip}]
    const ok = pts.filter(p => p.y != null);
    let lo = Math.min(...ok.map(p => p.lo ?? p.y)), hi = Math.max(...ok.map(p => p.hi ?? p.y));
    if (lo === hi) { lo *= 0.9; hi *= 1.1; }
    const pad = (hi - lo) * 0.14; lo = Math.max(0, lo - pad); hi += pad;
    const yP = v => 8 + (1 - (v - lo) / (hi - lo)) * 84;
    const xs = i => xPct(i) * 10;
    const runs = []; let run = [];
    pts.forEach(p => { if (p.y == null) { if (run.length) runs.push(run); run = []; } else run.push(p); });
    if (run.length) runs.push(run);
    let svg = '';
    [0.2, 0.5, 0.8].forEach(t => { const yy = 8 + t * 84; svg += `<line x1="0" x2="1000" y1="${yy}" y2="${yy}" class="px-grid"/>`; });
    trous.forEach(([a, b]) => { svg += `<rect x="${xs(a) + 8}" y="0" width="${xs(b) - xs(a) - 16}" height="100" class="px-gap"/>`; });
    if (o.band) runs.forEach(r => {
      if (r.length === 1) { const p = r[0]; svg += `<rect x="${xs(p.i) - 7}" y="${yP(p.hi)}" width="14" height="${Math.max(0.8, yP(p.lo) - yP(p.hi))}" class="px-band" rx="2"/>`; return; }
      const top = r.map(p => `${xs(p.i)},${yP(p.hi)}`).join(' '), bot = [...r].reverse().map(p => `${xs(p.i)},${yP(p.lo)}`).join(' ');
      svg += `<polygon points="${top} ${bot}" class="px-band"/>`;
    });
    runs.forEach((r, k) => {
      if (r.length > 1) svg += `<polyline points="${r.map(p => `${xs(p.i)},${yP(p.y)}`).join(' ')}" class="px-line"/>`;
      const nx = runs[k + 1];
      if (nx) { const a = r[r.length - 1], b = nx[0]; svg += `<line x1="${xs(a.i)}" y1="${yP(a.y)}" x2="${xs(b.i)}" y2="${yP(b.y)}" class="px-line px-line--dash"/>`; }
    });
    const lastI = ok.length ? ok[ok.length - 1].i : -1;
    const dots = ok.map(p => `<button type="button" class="px-dot${p.i === lastI ? ' is-last' : ''}" style="left:${xPct(p.i)}%;top:${yP(p.y)}%" data-tip="${esc(p.tip)}" aria-label="${esc(p.tip)}"></button>`).join('');
    const vals = o.valeurs ? ok.map(p => `<span class="px-val" style="left:${xPct(p.i)}%;top:${yP(p.y)}%">${o.valeurs(p)}</span>`).join('') : '';
    const yl = [hi - (hi - lo) * 0.2 / 1, lo + (hi - lo) * 0.2].map((v, k) => `<span class="px-ylab" style="top:${8 + (k ? 0.8 : 0.2) * 84}%">${o.yFmt ? o.yFmt(v) : fmt(v)}</span>`).join('');
    const gaps = trous.map(([a, b]) => `<span class="px-gaplab" style="left:${(xPct(a) + xPct(b)) / 2}%">pas de<br>relevé</span>`).join('');
    const xl = W.map((w, i) => `<span style="left:${xPct(i)}%">${jm(w.debut)}</span>`).join('');
    el.innerHTML = `<div class="px-plot ${o.classe || ''}" style="--c:${o.couleur}">
        <svg viewBox="0 0 1000 100" preserveAspectRatio="none" aria-hidden="true">${svg}</svg>
        ${o.yFmt === false ? '' : yl}${gaps}${vals}${dots}<div class="px-tip" role="status"></div>
      </div><div class="px-xlab" aria-hidden="true">${xl}</div>`;
    const tip = el.querySelector('.px-tip');
    const show = b => { tip.textContent = b.dataset.tip; tip.style.left = b.style.left; tip.style.top = b.style.top; tip.classList.add('is-on'); };
    el.querySelectorAll('.px-dot').forEach(b => {
      b.addEventListener('pointerenter', () => show(b));
      b.addEventListener('focus', () => show(b));
      b.addEventListener('click', () => show(b));
      b.addEventListener('pointerleave', () => tip.classList.remove('is-on'));
      b.addEventListener('blur', () => tip.classList.remove('is-on'));
    });
  }

  function spark(s) {
    const ok = s.m.filter(v => v != null);
    if (!ok.length) return '';
    let lo = Math.min(...ok), hi = Math.max(...ok); if (lo === hi) { lo -= 1; hi += 1; }
    const x = i => 3 + i * (82 / (N - 1)), y = v => 3 + (1 - (v - lo) / (hi - lo)) * 20;
    let d = '', up = false;
    s.m.forEach((v, i) => { if (v == null) { up = false; return; } d += (up ? ' L' : ' M') + x(i).toFixed(1) + ' ' + y(v).toFixed(1); up = true; });
    const v = varAt(s, s.last), c = sensDe(v && v.type === 'pct' ? v.pct : null);
    return `<svg class="px-spark px-spark--${c}" viewBox="0 0 88 26" width="88" height="26" aria-hidden="true"><path d="${d}"/><circle cx="${x(s.last)}" cy="${y(s.m[s.last])}" r="2.6"/></svg>`;
  }

  const thumb = s => s.slug
    ? `<span class="px-thumb"><img src="assets/img/produits/${s.slug}.webp" alt="" loading="lazy" onerror="this.remove()"></span>`
    : `<span class="px-thumb px-thumb--txt" aria-hidden="true">${esc(s.nom.slice(0, 2))}</span>`;
  const badgesDe = s => (s.nouveau ? '<span class="px-new">Nouveau</span>' : '') + (s.r[L] && s.r[L][2] ? `<span class="px-note">${esc(s.r[L][2])}</span>` : '');
  function badgeVar(v) {
    if (!v) return '<span class="px-na">pas de relevé</span>';
    if (v.type === 'nouveau') return '<span class="px-new">Nouveau</span>';
    if (v.type === 'rupture') return '<span class="px-na" title="Le contenant a changé : prix non comparables">contenant changé</span>';
    const s = sensDe(v.pct);
    return s === 'flat' ? '<span class="delta delta--flat">stable</span>' : `<span class="delta delta--${s}">${fleche(s)} ${Math.abs(v.pct).toFixed(1).replace('.', ',')} %</span>`;
  }

  /* ---------- En-tête & indice ---------- */
  const sem = W[L];
  $('#pdmBadge').textContent = jm(sem.debut).replace('.', '');
  $('#pxSem').textContent = periode(sem) + ' ' + dt(sem.fin).getFullYear();
  $('#pxNum').textContent = 'Relevé n° ' + N;
  $('#pxMarche').textContent = P.marche + ', ' + P.ville;
  if ($('#pxCount')) $('#pxCount').textContent = S.filter(s => s.r[L]).length + ' produits relevés';

  const iv = indice[L], ip = indPct[L], is = sensDe(ip);
  $('#pxIdx').textContent = iv.toFixed(1).replace('.', ',');
  $('#pxIdxVar').className = 'delta delta--' + is;
  $('#pxIdxVar').textContent = is === 'flat' ? 'stable' : fleche(is) + ' ' + Math.abs(ip).toFixed(1).replace('.', ',') + ' %';
  $('#pxIdxSub').textContent = `Base 100 = semaine du ${jm(W[0].debut)} · ${pctTxt(iv - 100)} depuis`;
  graphique($('#pxIdxChart'), {
    couleur: iv >= 100 ? 'var(--up)' : 'var(--down)', classe: 'px-plot--idx', yFmt: false,
    points: indice.map((v, i) => ({ i, y: v, tip: `${periode(W[i])} · indice ${v.toFixed(1).replace('.', ',')}${indPct[i] != null ? ' (' + pctTxt(indPct[i]) + ')' : ''}` })),
    valeurs: p => p.y.toFixed(0)
  });
  $('#pxTrend').innerHTML = indice.map((v, i) => {
    const s = i ? sensDe(indPct[i]) : 'base';
    return `<li class="px-trend__i px-trend__i--${s}"><span>${jm(W[i].debut)}</span><b>${tendance(indPct[i])}</b><i>${i ? pctTxt(indPct[i]) : '—'}</i></li>`;
  }).join('');

  const courants = S.map(s => ({ s, v: varAt(s, L) })).filter(x => x.v && x.v.type === 'pct');
  const nb = { up: 0, down: 0, flat: 0 }; courants.forEach(x => nb[sensDe(x.v.pct)]++);
  const tot = courants.length || 1;
  $('#pxBreadth').innerHTML = `<div class="px-breadth__bar" role="img" aria-label="${nb.up} en hausse, ${nb.down} en baisse, ${nb.flat} stables">
      <i class="up" style="flex:${nb.up}"></i><i class="flat" style="flex:${nb.flat}"></i><i class="down" style="flex:${nb.down}"></i></div>
    <div class="px-breadth__leg"><span class="up"><b>${nb.up}</b> en hausse</span><span class="flat"><b>${nb.flat}</b> stables</span><span class="down"><b>${nb.down}</b> en baisse</span></div>`;
  $('#pxIdxN').textContent = `calculé sur ${indN[L]} produits comparables`;

  /* ---------- Plus fortes variations ---------- */
  const tri = [...courants].sort((a, b) => b.v.pct - a.v.pct);
  const hausses = tri.filter(x => x.v.pct > 0.5).slice(0, 3), baisses = tri.filter(x => x.v.pct < -0.5).reverse().slice(0, 3);
  const maxAbs = Math.max(1, ...[...hausses, ...baisses].map(x => Math.abs(x.v.pct)));
  const mover = ({ s, v }, k) => {
    const c = sensDe(v.pct);
    return `<li><button type="button" class="px-mover px-mover--${c}" data-id="${s.id}">
      <span class="px-mover__rk">${k + 1}</span>${thumb(s)}
      <span class="px-mover__nm"><b>${esc(s.label)}</b><small>${rng(s.r[v.j])} → ${rng(s.r[L])} F / ${s.unite}</small></span>
      <span class="px-mover__pc">${fleche(c)} ${Math.abs(v.pct).toFixed(1).replace('.', ',')}<small>%</small></span>
      <span class="px-mover__bar"><i style="width:${(Math.abs(v.pct) / maxAbs * 100).toFixed(1)}%"></i></span>
    </button></li>`;
  };
  $('#pxUp').innerHTML = hausses.length ? hausses.map(mover).join('') : '<li class="px-empty">Aucune hausse cette semaine.</li>';
  $('#pxDown').innerHTML = baisses.length ? baisses.map(mover).join('') : '<li class="px-empty">Aucune baisse cette semaine.</li>';
  $('#pxVsDate').textContent = periode(W[L - 1]);

  /* ---------- Mercuriale ---------- */
  let cat = 'tout', ordre = 'cat', liste = [];
  const filtres = $('#pxFiltres');
  [{ id: 'tout', nom: 'Tout' }, ...P.categories].forEach(c => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'filter'; b.dataset.cat = c.id; b.textContent = c.nom;
    b.setAttribute('aria-pressed', String(c.id === cat));
    b.onclick = () => { cat = c.id; filtres.querySelectorAll('.filter').forEach(x => x.setAttribute('aria-pressed', String(x === b))); rendre(); };
    filtres.appendChild(b);
  });
  const champ = $('#pxQ'), select = $('#pxTri');
  champ.addEventListener('input', rendre);
  select.addEventListener('change', () => { ordre = select.value; rendre(); });
  const ORD_CAT = Object.fromEntries(P.categories.map((c, i) => [c.id, i]));
  const vNum = s => { const v = varAt(s, L); return v && v.type === 'pct' ? v.pct : null; };

  function rendre() {
    const q = sansAccent(champ.value.trim());
    liste = S.filter(s => (cat === 'tout' || s.cat === cat) && (!q || s.q.includes(q)));
    const nm = (a, b) => a.label.localeCompare(b.label, 'fr');
    const cmp = {
      cat: (a, b) => ORD_CAT[a.cat] - ORD_CAT[b.cat] || nm(a, b),
      nom: nm,
      hausse: (a, b) => (vNum(b) ?? -1e9) - (vNum(a) ?? -1e9) || nm(a, b),
      baisse: (a, b) => (vNum(a) ?? 1e9) - (vNum(b) ?? 1e9) || nm(a, b)
    }[ordre];
    liste.sort(cmp);
    $('#pxTotal').textContent = liste.length + (liste.length > 1 ? ' produits' : ' produit');
    $('#pxVide').hidden = liste.length > 0;
    $('#pxCorps').innerHTML = liste.map(s => {
      const cur = s.r[L], v = varAt(s, L);
      let j = L - 1; while (j >= 0 && !s.r[j]) j--;
      const prev = cur ? (v && v.j != null ? s.r[v.j] : null) : null;
      const prevI = cur ? (v && v.j != null ? v.j : -1) : -1;
      return `<tr data-id="${s.id}" tabindex="0" aria-label="Historique ${esc(s.label)}">
        <td class="cell-main"><span class="px-prod">${thumb(s)}<span><a href="?produit=${s.id}" data-id="${s.id}" class="px-prod__nm">${esc(s.nom)}</a>${s.variante ? `<small class="px-prod__var">${esc(s.variante)}</small>` : ''}<span class="px-prod__b">${badgesDe(s)}</span></span></span></td>
        <td data-label="Conditionnement" class="px-muted">${esc(s.cond)}</td>
        <td data-label="${N} semaines">${spark(s)}</td>
        <td data-label="Relevé précédent" class="px-num px-muted">${prev ? rng(prev) + ' F<small>' + jm(W[prevI].debut) + '</small>' : '—'}</td>
        <td data-label="Cette semaine" class="px-num px-cur">${cur ? rng(cur) + ' F<small>/ ' + s.unite + '</small>' : `<span class="px-na">dernier : ${jm(W[s.last].debut)}</span>`}</td>
        <td data-label="Variation" class="px-num">${badgeVar(v)}</td>
      </tr>`;
    }).join('');
  }
  $('#pxCorps').addEventListener('click', e => {
    const tr = e.target.closest('tr[data-id]'); if (!tr) return;
    e.preventDefault(); ouvrir(tr.dataset.id, liste);
  });
  $('#pxCorps').addEventListener('keydown', e => {
    const tr = e.target.closest('tr[data-id]');
    if (tr && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); ouvrir(tr.dataset.id, liste); }
  });
  document.querySelectorAll('#pxUp, #pxDown').forEach(ul => ul.addEventListener('click', e => {
    const b = e.target.closest('[data-id]'); if (b) ouvrir(b.dataset.id, [...hausses, ...baisses].map(x => x.s));
  }));
  rendre();

  // Curseur des catégories (même mécanique que la boutique)
  (() => {
    const th = document.createElement('span'); th.className = 'filters__thumb'; th.setAttribute('aria-hidden', 'true');
    const place = inst => {
      if (!th.isConnected) filtres.prepend(th);
      const b = filtres.querySelector('.filter[aria-pressed="true"]'); if (!b) return;
      if (inst) th.style.transition = 'none';
      th.style.width = b.offsetWidth + 'px'; th.style.transform = 'translateX(' + b.offsetLeft + 'px)';
      if (inst) { void th.offsetWidth; th.style.transition = ''; }
    };
    new MutationObserver(() => requestAnimationFrame(() => place(false))).observe(filtres, { attributes: true, subtree: true, attributeFilter: ['aria-pressed'] });
    addEventListener('resize', () => place(true));
    (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => place(true));
    place(true);
  })();

  /* ---------- Carte de chaleur ---------- */
  const heatRows = [...S].sort((a, b) => ORD_CAT[a.cat] - ORD_CAT[b.cat] || a.label.localeCompare(b.label, 'fr'));
  $('#pxHeat').innerHTML = `<thead><tr><th scope="col">Produit</th>${W.slice(1).map(w => `<th scope="col">${jm(w.debut)}</th>`).join('')}</tr></thead><tbody>` +
    heatRows.map(s => `<tr data-id="${s.id}"><th scope="row"><button type="button" data-id="${s.id}">${esc(s.label)}</button></th>${W.slice(1).map((w, k) => {
      const i = k + 1, v = varAt(s, i);
      if (!v) return '<td class="h-nul"><i></i></td>';
      if (v.type === 'nouveau') return '<td class="h-new" title="Premier relevé">N</td>';
      if (v.type === 'rupture') return '<td class="h-rup" title="Contenant changé">≠</td>';
      const a = Math.min(1, Math.abs(v.pct) / 40), c = sensDe(v.pct);
      const bg = c === 'up' ? `rgba(140,198,63,${(0.12 + a * 0.7).toFixed(2)})` : c === 'down' ? `rgba(230,57,70,${(0.12 + a * 0.7).toFixed(2)})` : 'rgba(255,255,255,0.05)';
      return `<td class="h-${c}${a > 0.55 ? ' h-fort' : ''}" style="background:${bg}" title="${esc(s.label)} · ${periode(w)} : ${pctTxt(v.pct)}">${c === 'flat' ? '0' : (v.pct > 0 ? '+' : '−') + Math.abs(Math.round(v.pct))}</td>`;
    }).join('')}</tr>`).join('') + '</tbody>';
  $('#pxHeat').addEventListener('click', e => { const b = e.target.closest('[data-id]'); if (b) ouvrir(b.dataset.id, heatRows); });

  /* ---------- Comparatif Yamoussoukro ---------- */
  const Y = P.yamoussoukro;
  let yk = Y.releves.length - 1;
  const segY = $('#pxYSeg');
  segY.innerHTML = Y.releves.map((r, k) => `<button type="button" class="px-seg__o" aria-pressed="${k === yk}" data-k="${k}">${jm(r.date)}</button>`).join('');
  segY.addEventListener('click', e => { const b = e.target.closest('[data-k]'); if (!b) return; yk = +b.dataset.k; segY.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === b))); rendreY(); });
  function rendreY() {
    const rel = Y.releves[yk], wi = rel.semaine;
    $('#pxYWeek').textContent = periode(W[wi]);
    const comp = Y.produits.filter(y => y.adj && y.r[yk]);
    $('#pxYComp').innerHTML = comp.map(y => {
      const s = parId[y.adj], a = s.r[wi], div = y.div || 1;
      const ym = mid(y.r[yk]);
      if (!a) return `<tr><td class="cell-main"><b class="px-prod__nm">${esc(y.nom)}</b></td><td data-label="Yamoussoukro" class="px-num">${rng(y.r[yk])} F<small>/ ${y.unite}</small></td><td data-label="Adjamé" class="px-num px-muted">pas de relevé</td><td data-label="Écart" class="px-num">—</td></tr>`;
      const am = mid(a) / div, e = (ym - am) / am * 100, c = sensDe(e);
      const adjTxt = div > 1 ? `≈ ${fmt(am)} F<small>/ kg · ${rng(a)} F le carton</small>` : `${rng(a)} F<small>/ ${s.unite}</small>`;
      return `<tr><td class="cell-main"><b class="px-prod__nm">${esc(y.nom)}</b></td>
        <td data-label="Yamoussoukro" class="px-num">${rng(y.r[yk])} F<small>/ ${y.unite}</small></td>
        <td data-label="Adjamé" class="px-num">${adjTxt}</td>
        <td data-label="Écart" class="px-num"><span class="px-ecart px-ecart--${c}">${c === 'flat' ? '≈ même prix' : (e > 0 ? 'Yamoussoukro +' : 'Yamoussoukro −') + Math.abs(Math.round(e)) + ' %'}</span></td></tr>`;
    }).join('');
    const seuls = Y.produits.filter(y => !y.adj && y.r[yk]);
    $('#pxYSeuls').innerHTML = seuls.map(y => `<li><b>${esc(y.nom)}</b>${y.nouveau ? '<span class="px-new">Nouveau</span>' : ''}<span>${rng(y.r[yk])} F<small>${y.unite === 'unité non précisée' ? ' · unité non précisée' : ' / ' + y.unite}</small></span></li>`).join('');
  }
  rendreY();

  /* ---------- Fiche historique (dialogue) ---------- */
  const dlg = $('#pxDlg');
  let nav = [], cur = null;
  function ouvrir(id, ordreNav) {
    const s = parId[id]; if (!s) return;
    nav = (ordreNav && ordreNav.length ? ordreNav : S); cur = s;
    const i = s.last, v = varAt(s, i), c = v && v.type === 'pct' ? sensDe(v.pct) : 'flat';
    const r = s.r[i];
    const tous = s.r.map((x, k) => x ? { k, x } : null).filter(Boolean);
    const bas = tous.reduce((a, b) => b.x[0] < a.x[0] ? b : a), haut = tous.reduce((a, b) => b.x[1] > a.x[1] ? b : a);
    const moy = tous.reduce((a, b) => a + mid(b.x), 0) / tous.length;
    const parKg = s.kg && !r[2] ? `<div><span>Soit au kilo</span><b>≈ ${fmt(mid(r) / s.kg)} F</b><small>${s.cond.toLowerCase()}</small></div>` : '';
    const pos = haut.x[1] > bas.x[0] ? (mid(r) - bas.x[0]) / (haut.x[1] - bas.x[0]) : 0.5;
    const k = nav.indexOf(s);
    const msg = `Bonjour IVT, je souhaite commander : ${s.label} (${rng(r)} F / ${s.unite}, relevé du ${periode(W[i])}). Quantité : `;
    dlg.innerHTML = `<div class="pxdlg__in">
      <header class="pxdlg__head">
        ${thumb(s)}
        <div class="pxdlg__ttl"><p class="eyebrow">${catNom(s.cat)} · ${esc(s.cond)}</p><h2 class="display" id="pxDlgT">${esc(s.nom)}${s.variante ? ` <em>${esc(s.variante)}</em>` : ''}</h2></div>
        <button type="button" class="pxdlg__x" aria-label="Fermer" data-act="x">✕</button>
      </header>
      <div class="pxdlg__price">
        <div><span class="px-k">${i === L ? 'Cette semaine' : 'Dernier relevé · ' + periode(W[i])}</span>
          <p class="pxdlg__big"><b>${rng(r)}</b> <span>F / ${s.unite}</span></p>
          <p class="px-sub">Médian ${fmt(mid(r))} F${r[2] ? ' · ' + esc(r[2]) : ''}</p></div>
        <div class="pxdlg__var">${badgeVar(v)}${v && v.j != null ? `<small>vs ${periode(W[v.j])}</small>` : ''}</div>
      </div>
      <div class="pxdlg__chart" id="pxDlgChart"></div>
      <div class="pxdlg__stats">
        <div><span>Plus bas</span><b>${fmt(bas.x[0])} F</b><small>${jm(W[bas.k].debut)}</small></div>
        <div><span>Plus haut</span><b>${fmt(haut.x[1])} F</b><small>${jm(W[haut.k].debut)}</small></div>
        <div><span>Moyenne</span><b>${fmt(moy)} F</b><small>${s.n} relevé${s.n > 1 ? 's' : ''} sur ${N}</small></div>
        ${parKg}
      </div>
      <div class="pxdlg__pos" style="--pos:${pos.toFixed(3)}"><span class="px-k">Position du prix actuel</span><i><b></b></i><small><span>plus bas</span><span>plus haut</span></small></div>
      <details class="pxdlg__hist"><summary>Historique semaine par semaine</summary>
        <table class="px-hist"><thead><tr><th>Semaine</th><th>Fourchette</th><th>Médian</th><th>Variation</th></tr></thead><tbody>
        ${W.map((w, q) => { const x = s.r[q]; return `<tr${q === i ? ' class="is-cur"' : ''}><td>${periode(w)}</td><td>${x ? rng(x) + ' F' + (x[2] ? `<small>${esc(x[2])}</small>` : '') : '<span class="px-na">—</span>'}</td><td>${x ? fmt(mid(x)) : ''}</td><td>${x ? badgeVar(varAt(s, q)) : ''}</td></tr>`; }).reverse().join('')}
        </tbody></table></details>
      <footer class="pxdlg__foot">
        <div class="pxdlg__nav"><button type="button" data-act="prev" aria-label="Produit précédent">‹</button><span>${k + 1} / ${nav.length}</span><button type="button" data-act="next" aria-label="Produit suivant">›</button></div>
        <div class="pxdlg__cta">${s.slug && A.parSlug[s.slug] ? `<a class="btn btn--ghost btn--sm" href="#balance" data-balance="${s.slug}">Peser un achat</a>` : ''}${s.slug ? `<a class="btn btn--ghost btn--sm" href="produit.html?p=${s.slug}">Voir la fiche</a>` : ''}<a class="btn btn--green btn--sm" href="${A.lienWhatsApp(msg)}" target="_blank" rel="noopener">Commander sur WhatsApp</a></div>
      </footer></div>`;
    graphique(dlg.querySelector('#pxDlgChart'), {
      band: true, couleur: c === 'up' ? 'var(--up)' : c === 'down' ? 'var(--down)' : 'var(--green-light)',
      points: s.r.map((x, q) => ({ i: q, y: mid(x), lo: x && x[0], hi: x && x[1], tip: x ? `${periode(W[q])} · ${rng(x)} F` : '' })),
      yFmt: v => fmt(v)
    });
    if (!dlg.open) { dlg.showModal(); document.documentElement.style.overflow = 'hidden'; requestAnimationFrame(() => dlg.classList.add('is-open')); }
    history.replaceState(null, '', '?produit=' + s.id);
  }
  const fermer = () => { dlg.classList.remove('is-open'); setTimeout(() => dlg.open && dlg.close(), 220); };
  const pas = d => { const k = nav.indexOf(cur); ouvrir(nav[(k + d + nav.length) % nav.length].id, nav); };
  dlg.addEventListener('click', e => {
    if (e.target === dlg) return fermer();
    const a = e.target.closest('[data-act]'); if (!a) return;
    if (a.dataset.act === 'x') fermer(); else pas(a.dataset.act === 'next' ? 1 : -1);
  });
  dlg.addEventListener('cancel', e => { e.preventDefault(); fermer(); });
  dlg.addEventListener('close', () => { document.documentElement.style.overflow = ''; history.replaceState(null, '', location.pathname); });
  dlg.addEventListener('keydown', e => { if (e.key === 'ArrowRight') pas(1); if (e.key === 'ArrowLeft') pas(-1); });
  let tx = null;
  dlg.addEventListener('touchstart', e => { tx = e.touches[0].clientX; }, { passive: true });
  dlg.addEventListener('touchend', e => { if (tx == null) return; const d = e.changedTouches[0].clientX - tx; tx = null; if (Math.abs(d) > 70 && !e.target.closest('.pxdlg__chart, .px-hist')) pas(d < 0 ? 1 : -1); });

  const demande = new URLSearchParams(location.search).get('produit');
  if (demande && parId[demande]) ouvrir(demande, liste);
})();
