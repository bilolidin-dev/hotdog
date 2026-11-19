/**
 * ORIGINAL HOT DOG — Конфигурация ресторана, доставки, категорий и популярной подборки
 * Все бизнес-данные и ссылки хранятся в одном файле отдельно от интерфейса.
 */
(function (global) {
  'use strict';

  const SITE_CONFIG = {
    restaurantName: 'ORIGINAL HOT DOG',
    shortTagline: 'Пицца • Суши и роллы • Шаурма • Бургеры • Хот-доги',
    description:
      'Официальное меню ресторана ORIGINAL HOT DOG в Кашкар-Кыштаке. Заказывайте свежую пиццу, роллы, шаурму, бургеры, хот-доги и комбо с доставкой или самовывозом через WhatsApp.',
    branchesCount: 1,
    workingHours: {
      label: 'Ежедневно с 10:00 до 00:00',
      shortLabel: '10:00–00:00',
      openHour: 10,
      closeHour: 24,
      timezone: 'Asia/Bishkek',
    },
    contacts: {
      phoneRaw: '996550042597',
      phoneE164: '+996550042597',
      phoneDisplay: '+996 550 04-25-97',
      phoneLocal: '0550 042 597',
      whatsappNumber: '996550042597',
      whatsappUrl: 'https://wa.me/996550042597',
      instagramHandle: '_original_hotdog',
      instagramUrl: 'https://www.instagram.com/_original_hotdog/',
    },
    developer: {
      label: 'Designed & Developed by Bilolidin',
      url: 'https://www.instagram.com/bilolidin.dev/?hl=ru',
    },
    location: {
      region: 'Ошская область, Кара-Сууйский район',
      village: 'Кашкар-Кыштак',
      street: 'улица Кара-Суу',
      fullAddress: 'Ошская область, Кара-Сууйский район, Кашкар-Кыштак, улица Кара-Суу',
      yandexMapsUrl: 'https://yandex.com/maps/-/CXSVe4yU',
    },
    delivery: {
      currency: 'сом',
      freeDeliveryThreshold: 500,
      freeDeliveryLocality: 'Кашкар-Кыштак',
      pickupAvailable: true,
      deliveryAvailable: true,
      conditionsSummary:
        'Бесплатная доставка по Кашкар-Кыштаку при заказе свыше 500 сом. Доступен самовывоз.',
      outsideAreaNote:
        'Стоимость доставки за пределами Кашкар-Кыштака и для заказов до 500 сом уточняется при подтверждении в WhatsApp.',
    },
    storageKeys: {
      cart: 'original_hotdog_cart_v1',
      checkoutDraft: 'original_hotdog_checkout_draft_v1',
      lastSentOrder: 'original_hotdog_last_sent_v1',
    },
    /**
     * ID позиций для секции «Популярное меню» на главной странице
     */
    popularItemIds: [
      'hotdog-original',
      'pizza-pepperoni-large',
      'sushi-baked-salmon',
      'shawarma-beef-double',
      'burger-cheeseburger',
      'combo-3',
    ],
    categories: [
      {
        id: 'pizza',
        name: 'Пицца',
        shortName: 'Пицца',
        description: 'Большие и средние пиццы на румяном тесте с расплавленным сыром',
        image: 'assets/images/categories/cat-pizza.webp',
        badge: '10 блюд',
      },
      {
        id: 'sushi',
        name: 'Суши и роллы',
        shortName: 'Суши и роллы',
        description: 'Запечённые, жареные и классические роллы с лососем, угрём и курицей',
        image: 'assets/images/categories/cat-sushi.webp',
        badge: '10 блюд',
      },
      {
        id: 'combos',
        name: 'Комбо',
        shortName: 'Комбо',
        description: 'Выгодные наборы для компании, семьи и сытного обеда',
        image: 'assets/images/categories/cat-combos.webp',
        badge: '5 наборов',
      },
      {
        id: 'shawarma',
        name: 'Шаурма',
        shortName: 'Шаурма',
        description: 'Сочная шаурма с говядиной, курицей и шаурма из тандыра',
        image: 'assets/images/categories/cat-shawarma.webp',
        badge: '5 блюд',
      },
      {
        id: 'burgers',
        name: 'Бургеры',
        shortName: 'Бургеры',
        description: 'Бургеры с говяжьей и куриной котлетой на мягкой булочке',
        image: 'assets/images/categories/cat-burgers.webp',
        badge: '4 блюда',
      },
      {
        id: 'hotdogs',
        name: 'Хот-доги',
        shortName: 'Хот-доги',
        description: 'Фирменный Оригинал хот-дог, Ультра и классический хот-дог',
        image: 'assets/images/categories/cat-hotdogs.webp',
        badge: '3 блюда',
      },
      {
        id: 'snacks',
        name: 'Закуски',
        shortName: 'Закуски',
        description: 'Куриные крылышки 7 штук, наггетсы и картофель фри',
        image: 'assets/images/categories/cat-snacks.webp',
        badge: '3 блюда',
      },
      {
        id: 'drinks',
        name: 'Напитки',
        shortName: 'Напитки',
        description: 'Прохладительные газированные напитки, соки и энергетики',
        image: 'assets/images/categories/cat-drinks.webp',
        badge: '9 позиций',
      },
    ],
  };

  global.OHD = global.OHD || {};
  global.OHD.CONFIG = SITE_CONFIG;
})(window);
