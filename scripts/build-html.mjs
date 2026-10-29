// Builds public/index.html from src/index.html, the scraped menu and the restaurant list,
// so the whole menu is real HTML that reads without JavaScript.
import { readFile, writeFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const read = (p) => readFile(path.join(root, p), 'utf8');
const menu = JSON.parse(await read('src/data/menu.json'));
const { restaurants } = JSON.parse(await read('src/data/site.json'));

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const nb = (s) => String(s).replace(/ (₽|см|л|гр)\b/g, ' $1');
const rub = (n) => `<span class="amt">${n.toLocaleString('ru-RU').replace(/ |\s/g, ' ')} <span class="rub">₽</span></span>`;
const cap = (s) => s[0].toUpperCase() + s.slice(1);
const webp = (img) => img && '/img/menu/' + path.basename(img).replace(/\.jpg$/, '.webp');
const small = (img) => img && webp(img).replace(/\.webp$/, '-s.webp');

// Ingredient lists from the old site sometimes start in lower case or carry stray capitals.
const tidy = (d) => {
  const s = d.replace(/\s+/g, ' ').replace(/\s,/g, ',').replace(/,(?=\S)/g, ', ').trim();
  return s ? s[0].toUpperCase() + s.slice(1).replace(/(?<=, )([А-ЯA-Z])(?=[а-яa-z])/g, (m) => m.toLowerCase()) : '';
};

function price(item, isPizza) {
  if (item.sizes?.length === 2 && isPizza) {
    const [s30, s38] = item.sizes;
    return `<p class="dish__price"><span data-size="30">${rub(s30.price)}</span><span data-size="38">${rub(s38.price)}</span></p>`;
  }
  if (item.sizes?.length) {
    return `<p class="dish__price dish__price--opts">${item.sizes.map((s) => `<span>${esc(s.label.replace(' г ', ' '))}, ${rub(s.price)}</span>`).join('')}</p>`;
  }
  return `<p class="dish__price">${item.price ? rub(item.price) : ''}</p>`;
}

function dish(item, isPizza) {
  const img = webp(item.img);
  const thumb = img
    ? `<img class="dish__thumb" src="${small(item.img)}" width="360" height="238" alt="" loading="lazy" decoding="async">`
    : `<span class="dish__thumb dish__thumb--none" aria-hidden="true"></span>`;
  return `<li class="dish"${img ? ` data-img="${img}"` : ''}>
  ${thumb}
  <div class="dish__text">
    <h4 class="dish__name">${esc(nb(isPizza ? cap(item.name.replace(/^Пицца\s+/, '')) : item.name))}${item.new ? ' <span class="tag">новинка</span>' : ''}</h4>
    ${item.desc ? `<p class="dish__desc">${esc(nb(tidy(isPizza ? item.desc.replace(/^Тесто для пиццы,?\s*/i, '') : item.desc)))}</p>` : ''}
  </div>
  ${price(item, isPizza)}
</li>`;
}

const tabs = menu.map((c, i) =>
  `<button class="tab" type="button" role="tab" id="t-${c.id}" aria-controls="m-${c.id}" aria-selected="${i === 0}"${i ? ' tabindex="-1"' : ''}>${esc(c.title)}</button>`
).join('');

const panels = menu.map((c, i) => {
  const isPizza = c.id === 'pizza';
  const size = isPizza ? `<fieldset class="seg seg--size">
    <legend class="visually-hidden">Размер пиццы</legend>
    <input type="radio" name="size" id="size-30" value="30" checked><label for="size-30">30 см</label>
    <input type="radio" name="size" id="size-38" value="38"><label for="size-38">38 см</label>
  </fieldset>` : '';
  return `<section class="menu__panel" id="m-${c.id}" role="tabpanel" aria-labelledby="t-${c.id}" data-panel="${c.id}">
  <div class="menu__panel-head"><h3 class="menu__cat">${esc(c.title)}</h3>${size}</div>
  <ol class="dishes">
${c.items.map((it) => dish(it, isPizza)).join('\n')}
  </ol>
</section>`;
}).join('\n');

const first = menu[0].items.find((i) => i.img);
// Frames for the Margherita build-up, dropped into public/img/frames as margherita-01.webp, -02.webp …
const frameCount = (await readdir(path.join(root, 'public/img/frames')).catch(() => [])).filter((f) => /^margherita-\d+\.webp$/.test(f)).length;
const menuHtml = `<div class="menu" data-menu>
  <div class="menu__tabs" role="tablist" aria-label="Разделы меню">${tabs}</div>
  <div class="menu__body">
    <div class="menu__lists">
${panels}
    </div>
    <aside class="menu__pane" aria-hidden="true">
      <figure class="pane" data-pane>
        <img class="pane__img is-on" src="${webp(first.img)}" width="720" height="475" alt="" data-pane-a>
        <img class="pane__img" src="${webp(first.img)}" width="720" height="475" alt="" data-pane-b>
        <canvas class="pane__frames" width="1024" height="1024" data-frames data-frames-count="${frameCount}" hidden></canvas>
      </figure>
      <p class="pane__caption" data-pane-caption>${esc(first.name)}</p>
    </aside>
  </div>
</div>`;

const restaurantsHtml = `<ul class="places">
${restaurants.map((r) => `<li class="places__row">
  <h3 class="places__name">${esc(r.name)}</h3>
  <p class="places__addr">${esc(r.address)}<br><span>${esc(r.near)}</span></p>
  <p class="places__hours">${esc(r.hours)}</p>
  <p class="places__links"><a class="link" href="tel:${r.tel}">${esc(r.phone)}</a><a class="link" href="https://wa.me/${r.tel.slice(1)}" target="_blank" rel="noopener">WhatsApp</a><a class="link" href="${r.route}" target="_blank" rel="noopener">Маршрут</a></p>
</li>`).join('\n')}
</ul>`;

const bookPlaces = restaurants.map((r, i) =>
  `<input type="radio" name="place" id="p-${r.id}" value="${r.id}" data-tel="${r.tel}" data-phone="${esc(r.phone)}" data-address="${esc(r.address)}"${i ? '' : ' checked'}><label for="p-${r.id}">${esc(r.short)}</label>`
).join('\n          ');

const guests = [1, 2, 3, 4, 5, 6, '7+'].map((g) =>
  `<input type="radio" name="guests" id="g-${g === '7+' ? 7 : g}" value="${g}"${g === 2 ? ' checked' : ''}><label for="g-${g === '7+' ? 7 : g}">${g}</label>`
).join('\n            ');

const times = [];
for (let m = 9 * 60 + 30; m <= 22 * 60; m += 30) {
  const t = `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;
  const id = 'tm-' + t.replace(':', '');
  times.push(`<li><input type="radio" name="time" id="${id}" value="${t}" required${t === '19:00' ? ' checked' : ''}><label for="${id}">${t}</label></li>`);
}

const logo = await read('src/logo.svg');
const contact = (r) => `<div class="foot__contact"><p class="foot__place">${esc(r.name)}</p><p>${esc(r.address)}</p><p><a href="tel:${r.tel}">${esc(r.phone)}</a></p><p><a href="mailto:${r.email}">${esc(r.email)}</a></p></div>`;

let html = await read('src/index.html');
html = html
  .replace('<!--MENU-->', menuHtml)
  .replace('<!--RESTAURANTS-->', restaurantsHtml)
  .replace('<!--BOOK_PLACES-->', bookPlaces)
  .replace('<!--GUESTS-->', guests)
  .replace('<!--TIMES-->', times.join('\n            '))
  .replace('<!--LOGO-->', logo.trim())
  .replace('<!--CONTACTS_LEFT-->', `<div class="foot__col">${contact(restaurants[0])}</div>`)
  .replace('<!--CONTACTS_RIGHT-->', `<div class="foot__col foot__col--end">${contact(restaurants[1])}${contact(restaurants[2])}</div>`);

await writeFile(path.join(root, 'public/index.html'), html);
console.log('public/index.html', (html.length / 1024).toFixed(0) + ' KB');
