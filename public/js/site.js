(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch { /* private mode: the choice lasts this visit */ } },
  };

  /* ---------- compact bar ---------- */
  const bar = $('[data-bar]');
  const mast = $('.mast');
  if (bar && mast) {
    const barLinks = $$('a', bar);
    new IntersectionObserver(([e]) => {
      const show = !e.isIntersecting;
      bar.classList.toggle('is-shown', show);
      bar.setAttribute('aria-hidden', String(!show));
      barLinks.forEach((a) => (show ? a.removeAttribute('tabindex') : a.setAttribute('tabindex', '-1')));
    }).observe(mast);
  }

  /* ---------- drawer ---------- */
  const drawer = $('[data-drawer]');
  const opener = $('[data-drawer-open]');
  if (drawer && opener) {
    const close = () => {
      if (!drawer.classList.contains('is-open')) return;
      drawer.classList.add('is-closing');
      drawer.classList.remove('is-open');
      opener.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
      const done = () => { drawer.hidden = true; drawer.classList.remove('is-closing'); };
      reduced.matches ? done() : drawer.addEventListener('transitionend', done, { once: true });
      opener.focus();
    };
    const open = () => {
      drawer.hidden = false;
      requestAnimationFrame(() => requestAnimationFrame(() => drawer.classList.add('is-open')));
      opener.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';
      $('[data-drawer-close]', drawer).focus();
    };
    opener.addEventListener('click', open);
    $('[data-drawer-close]', drawer).addEventListener('click', close);
    $$('a', drawer).forEach((a) => a.addEventListener('click', close));
    drawer.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') close();
      if (e.key !== 'Tab') return;
      const f = $$('a, button', drawer);
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f.at(-1).focus(); }
      else if (!e.shiftKey && document.activeElement === f.at(-1)) { e.preventDefault(); f[0].focus(); }
    });
  }

  /* ---------- menu: tabs, pinned plate, Margherita frames ---------- */
  const menu = $('[data-menu]');
  if (menu) {
    const tabs = $$('[role="tab"]', menu);
    const panels = $$('[role="tabpanel"]', menu);
    const pane = $('[data-pane]', menu);
    const imgs = [$('[data-pane-a]', menu), $('[data-pane-b]', menu)];
    const caption = $('[data-pane-caption]', menu);
    let front = 0;
    let current = imgs[0].getAttribute('src');

    const show = (src, name) => {
      if (caption && name) caption.textContent = name;
      if (!src || src === current) return;
      current = src;
      const next = imgs[1 - front];
      const swap = () => { imgs[front].classList.remove('is-on'); next.classList.add('is-on'); front = 1 - front; };
      next.onload = swap;
      next.src = src;
      if (next.complete && next.naturalWidth) { next.onload = null; swap(); }
    };
    const nameOf = (li) => $('.dish__name', li).firstChild.textContent.trim();
    const firstDish = (panel) => $('.dish[data-img]', panel);

    const select = (tab, focus) => {
      tabs.forEach((t) => {
        const on = t === tab;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
      });
      panels.forEach((p) => { p.hidden = p.id !== tab.getAttribute('aria-controls'); });
      const panel = $('#' + tab.getAttribute('aria-controls'));
      const lead = firstDish(panel);
      if (lead) show(lead.dataset.img, nameOf(lead));
      if (focus) tab.focus();
      tab.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    };
    panels.forEach((p, i) => { p.hidden = i !== 0; });
    tabs.forEach((t, i) => {
      t.addEventListener('click', () => select(t));
      t.addEventListener('keydown', (e) => {
        const k = { ArrowRight: 1, ArrowLeft: -1, Home: -i, End: tabs.length - 1 - i }[e.key];
        if (k === undefined) return;
        e.preventDefault();
        select(tabs[(i + k + tabs.length) % tabs.length], true);
      });
    });

    let active = null;
    menu.addEventListener('pointerover', (e) => {
      if (e.pointerType !== 'mouse') return;
      const li = e.target.closest('.dish[data-img]');
      if (!li || li === active) return;
      active?.classList.remove('is-active');
      active = li;
      li.classList.add('is-active');
      pane.classList.add('is-pointing');
      show(li.dataset.img, nameOf(li));
    });
    $('.menu__lists', menu).addEventListener('pointerleave', () => {
      active?.classList.remove('is-active');
      active = null;
      pane.classList.remove('is-pointing');
    });

    // Margherita assembled frame by frame while the pizza list scrolls past.
    // The build counts /img/frames/margherita-NN.webp; with none there the plate simply shows photos.
    const canvas = $('[data-frames]', menu);
    const FRAMES = Number(canvas?.dataset.framesCount) || 0;
    const frames = [];
    let loaded = 0;
    for (let i = 1; FRAMES > 1 && i <= FRAMES; i++) {
      const im = new Image();
      im.decoding = 'async';
      im.onload = () => { if (++loaded === FRAMES) startFrames(); };
      im.src = `/img/frames/margherita-${String(i).padStart(2, '0')}.webp`;
      frames.push(im);
    }
    function startFrames() {
      const ctx = canvas.getContext('2d');
      const pizza = $('#m-pizza');
      let shown = -1;
      let ticking = false;
      const draw = (n) => {
        if (n === shown) return;
        shown = n;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(frames[n], 0, 0, canvas.width, canvas.height);
      };
      const update = () => {
        ticking = false;
        if (pizza.hidden) return;
        if (reduced.matches) return draw(FRAMES - 1);
        const r = pizza.getBoundingClientRect();
        const travel = Math.max(1, r.height - innerHeight * 0.6);
        const p = Math.min(1, Math.max(0, (innerHeight * 0.35 - r.top) / travel));
        draw(Math.min(FRAMES - 1, Math.floor(p * FRAMES)));
      };
      canvas.hidden = false;
      pane.classList.add('has-frames');
      if (caption) caption.textContent = 'Маргарита: тесто, томатный соус, моцарелла';
      addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
      update();
    }
  }

  /* ---------- booking ---------- */
  const form = $('[data-booking]');
  if (form) {
    const help = $('#booking-help');
    const date = $('#b-date');
    const ticket = $('[data-ticket]');
    const pad = (n) => String(n).padStart(2, '0');
    const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const today = new Date();
    date.min = iso(today);
    date.value = iso(today);
    // Today, the times already gone are switched off.
    const timeInputs = $$('input[name="time"]', form);
    const syncTimes = () => {
      const now = new Date();
      const isToday = date.value === iso(now);
      const mins = now.getHours() * 60 + now.getMinutes();
      timeInputs.forEach((t) => {
        const [h, m] = t.value.split(':').map(Number);
        t.disabled = isToday && h * 60 + m <= mins + 30;
      });
      const picked = $('input[name="time"]:checked', form);
      if (!picked || picked.disabled) {
        const next = timeInputs.find((t) => !t.disabled);
        if (next) next.checked = true;
        else { const d = new Date(now); d.setDate(d.getDate() + 1); date.value = iso(d); syncTimes(); }
      }
    };
    date.addEventListener('change', syncTimes);
    syncTimes();
    const human = (v) => new Date(v + 'T12:00').toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' });

    const fail = (el, msg) => {
      el.setAttribute('aria-invalid', 'true');
      el.setAttribute('aria-describedby', help.id);
      help.textContent = msg;
      el.focus();
    };
    form.addEventListener('input', (e) => { if (e.target.hasAttribute('aria-invalid')) { e.target.removeAttribute('aria-invalid'); help.textContent = ''; } });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = $('#b-name'); const phone = $('#b-phone'); const consent = $('#b-consent');
      const digits = phone.value.replace(/\D/g, '');
      if (!date.value || date.value < date.min) return fail(date, 'Выберите сегодняшнюю или будущую дату.');
      if (!name.value.trim()) return fail(name, 'Напишите, как к вам обращаться.');
      if (digits.length < 10) return fail(phone, 'В номере не хватает цифр. Пример: +7 900 123-45-67.');
      if (!consent.checked) return fail(consent, 'Без согласия на обработку данных мы не сможем принять бронь.');

      const place = $('input[name="place"]:checked', form);
      const time = $('input[name="time"]:checked', form).value;
      const guests = $('input[name="guests"]:checked', form).value;
      const note = $('#b-note').value.trim();
      const rows = [['Ресторан', place.dataset.address], ['Дата', human(date.value)], ['Время', time], ['Гостей', guests], ['Имя', name.value.trim()], ['Телефон', phone.value.trim()]];
      if (note) rows.push(['Пожелания', note]);

      const text = ['Здравствуйте! Хочу забронировать стол.', ...rows.map(([k, v]) => `${k}: ${v}`)].join('\n');
      window.open(`https://wa.me/${place.dataset.tel.slice(1)}?text=${encodeURIComponent(text)}`, '_blank', 'noopener');

      const list = $('[data-ticket-list]', ticket);
      list.replaceChildren(...rows.slice(0, 4).flatMap(([k, v]) => {
        const dt = document.createElement('dt'); dt.textContent = k;
        const dd = document.createElement('dd'); dd.textContent = v;
        return [dt, dd];
      }));
      const tel = $('[data-ticket-tel]', ticket);
      tel.href = 'tel:' + place.dataset.tel;
      tel.textContent = place.dataset.phone;
      ticket.hidden = false;
      requestAnimationFrame(() => requestAnimationFrame(() => ticket.classList.add('is-printed')));
      $('.ticket__paper', ticket).focus({ preventScroll: true });
    });

    $('[data-ticket-again]').addEventListener('click', () => {
      ticket.classList.remove('is-printed');
      const done = () => { ticket.hidden = true; $('#b-name').focus(); };
      reduced.matches ? done() : setTimeout(done, 300);
    });
  }

  /* ---------- cookie notice and the map that needs consent ---------- */
  const KEY = 'vabene-cookie';
  const banner = $('[data-cookie]');
  const mapBox = $('[data-map]');
  const loadMap = () => {
    if (!mapBox || $('iframe', mapBox)) return;
    const f = document.createElement('iframe');
    f.src = 'https://yandex.ru/map-widget/v1/?oid=238294571168&ll=37.567982%2C55.766268&z=16';
    f.title = 'Траттория Vabene! на Яндекс Картах, Пресненский Вал, 14к4';
    f.loading = 'lazy';
    f.allowFullscreen = true;
    mapBox.append(f);
    $('.map__off', mapBox).hidden = true;
  };
  const hideBanner = () => {
    banner.classList.remove('is-in');
    const done = () => { banner.hidden = true; };
    reduced.matches ? done() : setTimeout(done, 240);
  };
  const showBanner = () => {
    banner.hidden = false;
    requestAnimationFrame(() => requestAnimationFrame(() => banner.classList.add('is-in')));
  };
  const choose = (v) => { store.set(KEY, v); hideBanner(); if (v === 'all') loadMap(); };
  $$('[data-cookie-choice]').forEach((b) => b.addEventListener('click', () => choose(b.dataset.cookieChoice)));
  $('[data-cookie-open]')?.addEventListener('click', showBanner);
  $('[data-map-load]')?.addEventListener('click', () => choose('all'));
  const saved = store.get(KEY);
  if (saved === 'all') loadMap();
  else if (!saved) setTimeout(showBanner, 600);
})();
