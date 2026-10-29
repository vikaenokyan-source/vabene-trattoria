# Траттория Vabene!

Сайт траттории Vabene! на Пресне (Москва): меню, бизнес-ланч, зал, отзывы, адреса, доставка и бронь стола через WhatsApp.

Статический сайт без фреймворка: всё, что уходит на хостинг, лежит в `public/`.

## Как обновить

```bash
npm install
npm run images   # фото из src/assets → public/img (WebP)
npm run build    # src/index.html + src/data/*.json → public/index.html
```

- Меню: `src/data/menu.json` (собрано со старого сайта скриптом `scripts/scrape_menu.py`).
- Адреса и телефоны: `src/data/site.json`.
- Разметка страницы: `src/index.html`, стили `public/css/site.css`, скрипт `public/js/site.js`.

## Кадры Маргариты

Положите 8 кадров (PNG или JPG, по порядку имён) в `src/assets/frames/`, затем выполните `npm run images && npm run build`. Панель меню начнёт собирать пиццу при прокрутке списка пицц. Пока кадров нет, в панели показываются фото блюд.

## Шрифты

Prata и Manrope, лицензия SIL Open Font License 1.1, хранятся в `public/fonts`.
