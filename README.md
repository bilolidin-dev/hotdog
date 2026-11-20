# ORIGINAL HOT DOG — Статический коммерческий сайт ресторана

Официальное цифровое меню и система оформления заказов через WhatsApp для ресторана **ORIGINAL HOT DOG** (Ошская область, Кара-Сууйский район, с. Кашкар-Кыштак, ул. Кара-Суу).

## Overview

- Static restaurant website.
- HTML5, CSS3, Vanilla JavaScript.
- LocalStorage cart.
- WhatsApp ordering.
- Responsive mobile-first interface.
- Hosted on Vercel.

## 1. Технологический стек

Проект разработан как **полностью статический production-сайт** без серверной части, баз данных и фреймворков:
- **HTML5** (семантическая разметка, нативный `<dialog closedby="any">`, доступные формы и атрибуты автозаполнения)
- **CSS3** (модульная архитектура, светлая редакционная палитра, `overscroll-behavior: contain` для модальных окон, `:user-invalid` валидация, Mobile-First адаптивность от `320px` до `1920px` и нижняя мобильная навигация)
- **Vanilla JavaScript (ES6+)** (модульная структура без сборщиков и внешних зависимостей)
- **LocalStorage** (сохранение состояния корзины, сверка актуальности цен при перезагрузке, сохранение черновика формы заказа)
- **WhatsApp Click to Chat API** (`https://wa.me/996550042597?text=...` с кодированием через `encodeURIComponent()`)
- **WebP-графика и SVG-иконки** (`fetchpriority="high"` для главного LCP-баннера и `loading="lazy"` для карточек каталога)

Внизу страниц размещён минималистичный блок авторства: **Designed & Developed by Bilolidin** (`https://www.instagram.com/bilolidin.dev/?hl=ru`).

---

## 2. Структура проекта

```text
original-hotdog/
├── index.html                  # Главная страница (Hero, Категории, Комбо, Меню, Доставка, Адрес и Карта)
├── menu.html                   # Отдельная страница полного каталога меню
├── vercel.json                 # Конфигурация статического деплоя на Vercel
├── README.md                   # Документация по проекту, редактированию меню и публикации
│
├── assets/
│   ├── images/
│   │   ├── banners/            # Баннеры первого экрана и комбо в формате WebP
│   │   ├── categories/         # Изображения 8 категорий в формате WebP
│   │   └── menu/               # Изображения всех 48 позиций меню и комбо в формате WebP
│   └── icons/
│       ├── logo.svg            # Фирменный логотип ORIGINAL HOT DOG
│       └── favicon.svg         # Иконка вкладки браузера
│
├── css/
│   ├── style.css               # Токены дизайна, типографика, шапка, Hero, доставка, контакты, подвал
│   ├── components.css          # Карточки блюд, комбо, фильтры, <dialog> корзины и заказа, тосты
│   ├── animations.css          # Плавные переходы и микро-анимации (с учётом prefers-reduced-motion)
│   └── responsive.css          # Адаптивные правила для 320–1920 px и Bottom Navigation
│
├── js/
│   ├── app.js                  # Точка входа и инициализация навигации и модулей
│   ├── menu.js                 # Рендеринг каталога, комбо, фильтрация по категориям и живой поиск
│   ├── cart.js                 # Логика корзины, синхронизация с LocalStorage и валидация актуальности цен
│   ├── checkout.js             # Форма заказа, расчёт условий доставки и подтверждение перед WhatsApp
│   ├── whatsapp.js             # Формирование текста заказа и генерация ссылки wa.me
│   └── utils.js                # Форматирование цен, расчёт порога доставки, уведомления и polyfill-логика
│
└── data/
    ├── config.js               # Контакты, адрес, график работы, порог бесплатной доставки (500 сом)
    ├── combos.js               # Комбо-наборы (Комбо №1, №2, №3, Семейное комбо, Бейишим апам)
    └── menu.js                 # Полный каталог блюд (Пицца, Суши и роллы, Шаурма, Бургеры, Хот-доги, Закуски, Напитки)
```

---

## 3. Как редактировать меню, цены и условия доставки

Все данные вынесены в папку `data/`:
1. **Изменить телефон, адрес или порог бесплатной доставки:** откройте `data/config.js` и измените `freeDeliveryThreshold: 500` или контактные поля.
2. **Изменить цены или добавить блюдо:** откройте `data/menu.js`. Если цена временно неизвестна, укажите `price: null` — сайт автоматически отобразит *«Цена уточняется»* и заблокирует добавление в корзину до уточнения стоимости.
3. **Изменить состав или цену комбо:** откройте `data/combos.js`.
4. **Заменить временные иллюстрации на реальные фотографии блюд:** положите фотографии в `assets/images/menu/` и установите `isPlaceholderImage: false` у соответствующей позиции в `data/menu.js` или `data/combos.js`.

---

## 4. Запуск проекта локально

Так как сайт полностью статический, он не требует сборки (`npm run build` не нужен):

```bash
# Вариант 1: через встроенный сервер Python 3
cd "original hotdog"
python3 -m http.server 8080
# Откройте http://localhost:8080 в браузере
```

Также проект корректно открывается напрямую через `index.html` в любом современном браузере.

---

## 5. Публикация на Vercel (Static Deployment)

### Способ 1 — Через GitHub и панель Vercel (рекомендуется)
1. Загрузите содержимое папки проекта в GitHub-репозиторий.
2. Перейдите на [vercel.com/new](https://vercel.com/new) и импортируйте репозиторий.
3. В настройках проекта:
   - **Framework Preset:** `Other`
   - **Build Command:** оставить пустым
   - **Output Directory:** `.` (корень проекта)
4. Нажмите **Deploy** — сайт будет опубликован за несколько секунд.

### Способ 2 — Через Vercel CLI
```bash
npx vercel --prod
```

---

## 6. SEO, Карта сайта и Локальное продвижение

Production-URL сайта: `https://original-hotdog-osh.vercel.app/`

В проекте настроены:
- `<link rel="canonical">` для `/` и `/menu.html`;
- Open Graph и Twitter Card для корректного превью в WhatsApp и Telegram;
- Schema.org JSON-LD (`Restaurant`, `FoodEstablishment`, `Menu`, `BreadcrumbList`);
- `sitemap.xml` и `robots.txt` в корне сайта.

### Подключение поисковых панелей и справочников (действия владельца)
1. **Google Search Console**: добавьте ресурс `https://original-hotdog-osh.vercel.app`, подтвердите через HTML-метатег в `<head>` обеих страниц (или DNS при подключении собственного домена) и отправьте `https://original-hotdog-osh.vercel.app/sitemap.xml`.
2. **Яндекс Вебмастер**: добавьте сайт, подтвердите права метатегом `yandex-verification` в `<head>` и укажите `https://original-hotdog-osh.vercel.app/sitemap.xml`.
3. **Bing Webmaster Tools**: импортируйте свойства из Google Search Console или подтвердите через метатег `msvalidate.01`.
4. **Google Business Profile, Яндекс Карты, 2GIS**: используйте единый NAP без расхождений:
   - Название: `ORIGINAL HOT DOG`
   - Телефон: `+996550042597` (`+996 550 04-25-97`)
   - Адрес: `Ошская область, Кара-Сууйский район, Кашкар-Кыштак, улица Кара-Суу`
   - График: ежедневно `10:00–00:00`
   - Сайт: `https://original-hotdog-osh.vercel.app/`
   - Instagram: `https://www.instagram.com/_original_hotdog/`
5. При подключении собственного домена (например, `.kg` / `.com`) обновите базовый URL в `data/config.js`, `index.html`, `menu.html`, `sitemap.xml` и `robots.txt`.
