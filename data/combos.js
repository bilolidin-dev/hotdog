/**
 * ORIGINAL HOT DOG — Комбо-наборы
 * Все составы и цены сохранены строго по данным владельца ресторана.
 */
(function (global) {
  'use strict';

  const COMBOS_DATA = [
    {
      id: 'combo-1',
      name: 'Комбо №1',
      category: 'combos',
      description: 'Большой сет из четырёх видов запечённых и жареных суши с курицей и угрём.',
      composition: [
        'Запечённые суши с курицей',
        'Запечённые суши с угрём',
        'Жареные суши с курицей',
        'Жареные суши с угрём',
      ],
      price: 1200,
      image: 'assets/images/menu/combos/combo-1.webp',
      isPlaceholderImage: true,
      available: true,
      tags: ['Суши-сет'],
      badge: 'Комбо №1',
    },
    {
      id: 'combo-2',
      name: 'Комбо №2',
      category: 'combos',
      description: 'Сочетание запечённых и жареных суши, средней пиццы Пепперони, большой картошки фри и Пепси.',
      composition: [
        'Запечённые суши с курицей',
        'Жареные суши с угрём',
        'Средняя пицца Пепперони',
        'Большая картошка фри',
        'Пепси',
      ],
      price: 1200,
      image: 'assets/images/menu/combos/combo-2.webp',
      isPlaceholderImage: true,
      available: true,
      tags: ['Пицца + Суши'],
      badge: 'Комбо №2',
    },
    {
      id: 'combo-3',
      name: 'Комбо №3',
      category: 'combos',
      description: 'Сытный фастфуд-набор: шаурма, чизбургер, Оригинал хот-дог, картошка фри и Кола 1 л.',
      composition: [
        'Обычная шаурма — 1 шт.',
        'Чизбургер — 1 шт.',
        'Оригинал хот-дог — 1 шт.',
        'Картошка фри — 1 шт.',
        'Кола 1 литр',
      ],
      price: 699,
      image: 'assets/images/menu/combos/combo-3.webp',
      isPlaceholderImage: true,
      available: true,
      tags: ['Фастфуд-сет'],
      badge: 'Комбо №3',
    },
    {
      id: 'combo-family',
      name: 'Семейное комбо',
      category: 'combos',
      description: 'Семейный набор из 5 видов роллов и пиццы Пепперони для большой компании.',
      composition: [
        '1. Нежный холодный ролл',
        '2. Калифорния запечённая',
        '3. Мини холодный ролл',
        '4. Калифорния классическая',
        '5. Куриный темпура',
        '6. Пицца Пепперони',
      ],
      price: 1490,
      image: 'assets/images/menu/combos/combo-family.webp',
      isPlaceholderImage: true,
      available: true,
      tags: ['Семейный сет'],
      badge: 'Семейное комбо',
    },
    {
      id: 'combo-5',
      name: 'Бейишим апам',
      category: 'combos',
      description: 'Большой комбо-набор из двух пицц и шести порций роллов (два запечённых ролла с курицей идут как две отдельные порции).',
      composition: [
        '1. Пицца Цезарь — 1 шт.',
        '2. Пицца Пепперони — 1 шт.',
        '3. Запечённый ролл с курицей — 2 шт.',
        '4. Калифорния запечённая — 1 шт.',
        '5. Жареный ролл — 1 шт.',
        '6. Капамаки — 1 шт.',
        '7. Чикен ролл — 1 шт.',
      ],
      price: 2400,
      image: 'assets/images/menu/combos/combo-beyishim-apam.webp',
      isPlaceholderImage: true,
      available: true,
      tags: ['Бейишим апам'],
      badge: 'Бейишим апам',
    },
  ];

  /**
   * Набор подтверждён владельцем с названием «Бейишим апам» и ценой 2400 сом.
   */
  const UNCONFIRMED_BUNDLES = [];

  global.OHD = global.OHD || {};
  global.OHD.COMBOS = COMBOS_DATA;
  global.OHD.UNCONFIRMED_BUNDLES = UNCONFIRMED_BUNDLES;
})(window);
