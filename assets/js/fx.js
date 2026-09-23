/* IVT — effets visuels (lumière au pointeur, infobulles). Aucun impact fonctionnel. */
(() => {
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (fine && !reduce) {
    document.addEventListener('pointermove', (e) => {
      const el = e.target.closest && e.target.closest('.card, .pillar, .hero, .cta-band, .pdp__stage');
      if (!el) return;
      const r = el.getBoundingClientRect();
      el.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      el.style.setProperty('--my', (e.clientY - r.top) + 'px');
    }, { passive: true });
  }

  // Header : métal liquide + alternance de logo
  const header = document.querySelector('.site-header');
  const logo = header && header.querySelector('.logo');
  if (header) {
    const metal = document.createElement('span');
    metal.className = 'header-metal';
    metal.setAttribute('aria-hidden', 'true');
    header.prepend(metal);
    if (fine && !reduce) header.addEventListener('pointermove', (e) => {
      const r = header.getBoundingClientRect();
      header.style.setProperty('--hx', ((e.clientX - r.left) / r.width * 100).toFixed(1) + '%');
    }, { passive: true });
  }
  if (logo) {
    const main = document.createElement('span');
    main.className = 'logo__main';
    while (logo.firstChild) main.appendChild(logo.firstChild);
    logo.appendChild(main);
    const alt = document.createElement('img');
    alt.className = 'logo__recolte';
    alt.src = 'assets/img/logo-recolte.webp';
    alt.alt = '';
    alt.setAttribute('aria-hidden', 'true');
    logo.appendChild(alt);
    let timer = null, hovering = false;
    const showIVT = () => {
      if (!logo.classList.contains('is-alt')) return;
      logo.classList.remove('is-alt');
      logo.classList.remove('is-glitch'); void logo.offsetWidth; logo.classList.add('is-glitch');
    };
    const loop = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (hovering) return;
        if (logo.classList.contains('is-alt')) showIVT(); else logo.classList.add('is-alt');
        loop();
      }, 5000);
    };
    logo.addEventListener('animationend', (e) => { if (e.animationName === 'logoGlitch') logo.classList.remove('is-glitch'); });
    header.addEventListener('mouseenter', () => { hovering = true; clearTimeout(timer); showIVT(); });
    header.addEventListener('mouseleave', () => { hovering = false; loop(); });
    loop();
  }

  const TIP = 'vs semaine précédente';
  const tag = (root) => {
    if (root.matches && root.matches('.delta') && !root.dataset.tip) root.dataset.tip = TIP;
    if (root.querySelectorAll) root.querySelectorAll('.delta:not([data-tip])').forEach((d) => { d.dataset.tip = TIP; });
  };
  tag(document);
  new MutationObserver((ms) => ms.forEach((m) => m.addedNodes.forEach((n) => { if (n.nodeType === 1) tag(n); })))
    .observe(document.body, { childList: true, subtree: true });

  // Popup équipe sur le bouton WhatsApp
  const wa = document.querySelector('.cta-wa');
  if (wa) {
    const shots = [4, 3, 1, 2];
    const pop = document.createElement('div');
    pop.className = 'team-pop';
    pop.id = 'teamPop';
    pop.setAttribute('role', 'tooltip');
    pop.innerHTML = `<div class="team-pop__frame">${shots.map((n, k) => `<img src="assets/img/terrain/terrain-${n}.webp" alt="" class="${k === 0 ? 'is-on' : ''}">`).join('')}</div>
      <p class="team-pop__cap">L'équipe IVT, <em>sur le terrain</em></p>
      <div class="team-pop__dots">${shots.map((_, k) => `<i class="${k === 0 ? 'is-on' : ''}"></i>`).join('')}</div>`;
    document.body.appendChild(pop);
    const imgs = [...pop.querySelectorAll('img')], dots = [...pop.querySelectorAll('.team-pop__dots i')];
    let k = 0, rot = null, open = false, hideT = null;
    const go = (n) => { imgs[k].classList.remove('is-on'); dots[k].classList.remove('is-on'); k = n % imgs.length; imgs[k].classList.add('is-on'); dots[k].classList.add('is-on'); };
    const place = () => {
      const r = wa.getBoundingClientRect(), pw = pop.offsetWidth, ph = pop.offsetHeight;
      let left = r.left + r.width / 2 - pw / 2;
      left = Math.max(12, Math.min(left, innerWidth - pw - 12));
      const spaceAbove = r.top - 16, spaceBelow = innerHeight - r.bottom - 16;
      const avail = Math.max(spaceAbove, spaceBelow) - 8;
      pop.style.setProperty('--fh', Math.max(120, Math.min(300, avail - 100)) + 'px');
      const ph2 = pop.offsetHeight;
      const above = spaceAbove >= ph2 + 8 || spaceAbove >= spaceBelow;
      pop.classList.toggle('is-below', !above);
      let top = above ? r.top - ph2 - 16 : r.bottom + 16;
      top = Math.max(8, Math.min(top, innerHeight - ph2 - 8));
      pop.style.left = left + 'px';
      pop.style.top = top + 'px';
      pop.style.setProperty('--ax', (r.left + r.width / 2 - left) + 'px');
    };
    const show = () => { clearTimeout(hideT); if (open) return; open = true; place(); pop.classList.add('is-open'); rot = setInterval(() => go(k + 1), 1700); };
    const hide = () => { clearTimeout(hideT); hideT = setTimeout(() => { open = false; pop.classList.remove('is-open'); clearInterval(rot); }, 120); };
    if (fine) {
      wa.addEventListener('mouseenter', show);
      wa.addEventListener('mouseleave', hide);
      wa.addEventListener('focus', show);
      wa.addEventListener('blur', hide);
    } else {
      wa.addEventListener('click', (e) => { if (!open) { e.preventDefault(); show(); } });
      document.addEventListener('click', (e) => { if (open && !wa.contains(e.target) && !pop.contains(e.target)) hide(); });
    }
    addEventListener('scroll', () => { if (open) place(); }, { passive: true });
    addEventListener('resize', () => { if (open) place(); });
  }

  // Polaroïds terrain : apparition, parallaxe, visionneuse
  const polas = [...document.querySelectorAll('.polaroid')];
  if (!polas.length) return;

  const io = new IntersectionObserver((es) => es.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
  }), { threshold: 0.2 });
  polas.forEach((p) => io.observe(p));

  if (!reduce) {
    let ticking = false;
    const para = () => {
      const vh = innerHeight;
      polas.forEach((p) => {
        const r = p.getBoundingClientRect();
        const off = (r.top + r.height / 2 - vh / 2) * -(+p.dataset.depth || 0);
        p.style.setProperty('--py', off.toFixed(1) + 'px');
      });
      ticking = false;
    };
    addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(para); } }, { passive: true });
    para();
  }

  const box = document.createElement('div');
  box.className = 'lightbox';
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-modal', 'true');
  box.setAttribute('aria-label', 'Photo agrandie');
  box.innerHTML = `
    <button type="button" class="lightbox__btn lightbox__close" aria-label="Fermer">✕</button>
    <button type="button" class="lightbox__btn lightbox__prev" aria-label="Photo précédente">←</button>
    <figure class="lightbox__fig"><img alt=""><figcaption></figcaption><span class="lightbox__count"></span></figure>
    <button type="button" class="lightbox__btn lightbox__next" aria-label="Photo suivante">→</button>`;
  document.body.appendChild(box);
  const bImg = box.querySelector('img'), bCap = box.querySelector('figcaption'), bCount = box.querySelector('.lightbox__count');
  let cur = 0, lastFocus = null;
  const show = (i) => {
    cur = (i + polas.length) % polas.length;
    const img = polas[cur].querySelector('img');
    box.classList.remove('is-swap'); void box.offsetWidth; box.classList.add('is-swap');
    bImg.src = img.src; bImg.alt = img.alt;
    bCap.textContent = polas[cur].querySelector('figcaption').textContent;
    bCount.textContent = `${String(cur + 1).padStart(2, '0')} / ${String(polas.length).padStart(2, '0')}`;
  };
  const open = (i) => { lastFocus = document.activeElement; show(i); box.classList.add('is-open'); document.documentElement.style.overflow = 'hidden'; box.querySelector('.lightbox__close').focus(); };
  const close = () => { box.classList.remove('is-open'); document.documentElement.style.overflow = ''; if (lastFocus) lastFocus.focus(); };
  polas.forEach((p, i) => p.querySelector('.polaroid__card').addEventListener('click', () => open(i)));
  box.querySelector('.lightbox__close').addEventListener('click', close);
  box.querySelector('.lightbox__prev').addEventListener('click', () => show(cur - 1));
  box.querySelector('.lightbox__next').addEventListener('click', () => show(cur + 1));
  box.addEventListener('click', (e) => { if (e.target === box) close(); });
  addEventListener('keydown', (e) => {
    if (!box.classList.contains('is-open')) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowLeft') show(cur - 1);
    if (e.key === 'ArrowRight') show(cur + 1);
  });
})();
