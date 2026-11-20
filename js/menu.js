/**
 * ORIGINAL HOT DOG — Модуль рендеринга популярного меню, комбо, категорий, каталога и поиска
 */
(function (global) {
  'use strict';

  const CONFIG = global.OHD.CONFIG;
  const utils = global.OHD.utils;
  const whatsapp = global.OHD.whatsapp;

  let activeCategory = 'all';
  let searchQuery = '';

  /**
   * Возвращает HTML кнопки добавления или счётчика количества для карточки
   * @param {object} item
   */
  function renderCardActionControl(item) {
    const isOrderable = utils.isItemOrderable(item);

    if (!isOrderable) {
      const inquiryUrl = whatsapp.buildPriceInquiryUrl(item);
      return `
        <div class="card-action-unavailable">
          <button
            type="button"
            class="btn-card-disabled"
            disabled
            aria-disabled="true"
            tabindex="-1"
          >Цена уточняется</button>
          <a
            href="${utils.escapeHtml(inquiryUrl)}"
            target="_blank"
            rel="noopener noreferrer"
            class="btn-card-inquire"
            aria-label="Уточнить цену ${utils.escapeHtml(item.name)} в WhatsApp"
          >Уточнить в WhatsApp</a>
        </div>
      `;
    }

    const qtyInCart = global.OHD.cart ? global.OHD.cart.getItemQuantity(item.id) : 0;

    if (qtyInCart > 0) {
      return `
        <div class="card-qty-stepper" role="group" aria-label="Количество ${utils.escapeHtml(item.name)} в корзине">
          <button
            type="button"
            class="stepper-btn"
            data-cart-action="decrement"
            data-item-id="${utils.escapeHtml(item.id)}"
            aria-label="Убрать 1 шт. ${utils.escapeHtml(item.name)}"
          >−</button>
          <span class="stepper-value" aria-live="polite">${qtyInCart}</span>
          <button
            type="button"
            class="stepper-btn"
            data-cart-action="increment"
            data-item-id="${utils.escapeHtml(item.id)}"
            aria-label="Добавить ещё 1 шт. ${utils.escapeHtml(item.name)}"
          >+</button>
        </div>
      `;
    }

    return `
      <button
        type="button"
        class="btn-add-to-cart"
        data-cart-action="add"
        data-item-id="${utils.escapeHtml(item.id)}"
        aria-label="Добавить ${utils.escapeHtml(item.name)} в корзину за ${utils.formatPrice(item.price)}"
      >
        <span>Добавить</span>
      </button>
    `;
  }

  /**
   * Форматирует отображение размера/объёма
   * @param {object} item
   */
  function formatSizeBadge(item) {
    if (!item.size) return '';
    if (item.size === 'Не указан') {
      const label = item.category === 'drinks' ? 'Объём не указан' : 'Размер не указан';
      return `<span class="menu-card-size">${label}</span>`;
    }
    return `<span class="menu-card-size">${utils.escapeHtml(item.size)}</span>`;
  }

  /**
   * Генерирует чистую редакционную карточку блюда
   * @param {object} item
   * @param {object} [options]
   * @param {'h2'|'h3'|'h4'} [options.headingTag='h3']
   * @param {boolean} [options.isLcp=false]
   * @param {boolean} [options.isEager=false]
   */
  function renderMenuItemCard(item, options = {}) {
    const headingTag = options.headingTag || 'h3';
    const isLcp = Boolean(options.isLcp);
    const isEager = isLcp || Boolean(options.isEager);
    const imgPriorityAttrs = isLcp
      ? 'fetchpriority="high"'
      : isEager
        ? ''
        : 'loading="lazy"\n            decoding="async"';

    const isOrderable = utils.isItemOrderable(item);
    const isCombo = item.category === 'combos' && Array.isArray(item.composition);
    const sizeBadge = formatSizeBadge(item);
    const comboNumberBadge =
      isCombo && item.badge && item.badge !== item.name
        ? `<span class="menu-card-size">${utils.escapeHtml(item.badge)}</span>`
        : '';

    const compositionHtml = isCombo
      ? `
        <ul class="card-combo-list" aria-label="Состав набора">
          ${item.composition.map((line) => `<li>${utils.escapeHtml(line)}</li>`).join('')}
        </ul>
      `
      : '';

    const descriptionHtml =
      item.description && !isCombo
        ? `<p class="menu-card-desc">${utils.escapeHtml(item.description)}</p>`
        : '';

    const isBeverage = item.category === 'drinks';

    return `
      <article class="menu-card ${!isOrderable ? 'is-price-pending' : ''} ${isBeverage ? 'is-drink-card' : ''}" data-card-item-id="${utils.escapeHtml(item.id)}">
        <div class="menu-card-media ${isBeverage ? 'is-beverage' : ''}">
          <img
            src="${utils.escapeHtml(item.image)}"
            alt="${utils.escapeHtml(item.name)}${item.size && item.size !== 'Не указан' ? ` (${utils.escapeHtml(item.size)})` : ''}"
            width="400"
            height="300"
            ${imgPriorityAttrs}
            class="menu-card-img ${isBeverage ? 'is-beverage-img' : ''}"
          >
        </div>
        <div class="menu-card-body">
          <div>
            <div class="menu-card-title-wrap">
              <${headingTag} class="menu-card-title">${utils.escapeHtml(item.name)}</${headingTag}>
              ${sizeBadge || comboNumberBadge}
            </div>
            ${descriptionHtml}
            ${compositionHtml}
          </div>
          <div class="menu-card-footer">
            <strong class="menu-card-price ${item.price === null ? 'is-unknown' : ''}">
              ${utils.formatPrice(item.price)}
            </strong>
            <div class="menu-card-action-slot" data-action-slot="${utils.escapeHtml(item.id)}">
              ${renderCardActionControl(item)}
            </div>
          </div>
        </div>
      </article>
    `;
  }

  /**
   * Рендерит секцию «Популярное меню» (#popular-menu-grid)
   */
  function renderPopularMenu() {
    const grid = document.getElementById('popular-menu-grid');
    if (!grid) return;

    const popularIds = Array.isArray(CONFIG.popularItemIds) ? CONFIG.popularItemIds : [];
    const items = popularIds
      .map((id) => global.OHD.getCatalogItemById(id))
      .filter(Boolean);

    grid.innerHTML = items.map((item) => renderMenuItemCard(item, { headingTag: 'h3' })).join('');
  }

  /**
   * Рендерит отдельную секцию «Комбо-наборы» (#combos-showcase-grid)
   */
  function renderCombosShowcase() {
    const container = document.getElementById('combos-showcase-grid');
    if (!container) return;

    const combos = global.OHD.COMBOS || [];
    container.innerHTML = combos
      .map((combo) => {
        const comboNumberBadge =
          combo.badge && combo.badge !== combo.name
            ? `<span class="menu-card-size">${utils.escapeHtml(combo.badge)}</span>`
            : '';
        return `
          <article class="combo-feature-card" data-card-item-id="${utils.escapeHtml(combo.id)}">
            <div class="combo-feature-media">
              <img
                src="${utils.escapeHtml(combo.image)}"
                alt="${utils.escapeHtml(combo.name)}"
                width="480"
                height="300"
                loading="lazy"
                decoding="async"
                class="combo-feature-img"
              >
            </div>
            <div class="combo-feature-content">
              <div class="menu-card-title-wrap combo-modal-heading">
                <h3 class="combo-feature-title combo-modal-list">${utils.escapeHtml(combo.name)}</h3>
                ${comboNumberBadge}
              </div>
              <p class="combo-feature-desc">${utils.escapeHtml(combo.description)}</p>
              <div class="combo-composition-box">
                <span class="combo-composition-title">В составе</span>
                <ul class="combo-composition-list">
                  ${combo.composition.map((line) => `<li>${utils.escapeHtml(line)}</li>`).join('')}
                </ul>
              </div>
              <div class="combo-feature-footer">
                <strong class="combo-price-value">${utils.formatPrice(combo.price)}</strong>
                <div class="menu-card-action-slot" data-action-slot="${utils.escapeHtml(combo.id)}">
                  ${renderCardActionControl(combo)}
                </div>
              </div>
            </div>
          </article>
        `;
      })
      .join('');
  }

  /**
   * Рендерит компактную сетку категорий (#home-categories-grid)
   */
  function renderCategoryCards() {
    const grid = document.getElementById('home-categories-grid');
    if (!grid) return;

    grid.innerHTML = CONFIG.categories
      .map(
        (cat) => `
        <a
          href="menu.html?category=${utils.escapeHtml(cat.id)}"
          class="category-quick-card"
          data-select-category="${utils.escapeHtml(cat.id)}"
          aria-label="Перейти к категории ${utils.escapeHtml(cat.name)}"
        >
          <img
            src="${utils.escapeHtml(cat.image)}"
            alt="Категория меню: ${utils.escapeHtml(cat.name)}"
            width="64"
            height="48"
            loading="lazy"
            decoding="async"
            class="category-quick-thumb"
          >
          <div>
            <span class="category-quick-title">${utils.escapeHtml(cat.name)}</span>
            <span class="category-quick-count">${utils.escapeHtml(cat.badge)}</span>
          </div>
        </a>
      `
      )
      .join('');
  }

  /**
   * Рендерит панель переключателей категорий (#category-filter-tabs)
   */
  function renderCategoryFilterTabs() {
    const tabsContainer = document.getElementById('category-filter-tabs');
    if (!tabsContainer) return;

    const allCatalog = global.OHD.getAllCatalogItems();
    const tabs = [
      {
        id: 'all',
        name: 'Все блюда',
        count: allCatalog.length,
      },
      ...CONFIG.categories.map((cat) => ({
        id: cat.id,
        name: cat.name,
        count: allCatalog.filter((item) => item.category === cat.id).length,
      })),
    ];

    tabsContainer.innerHTML = tabs
      .map((tab) => {
        const isActive = tab.id === activeCategory;
        return `
          <button
            type="button"
            role="tab"
            aria-selected="${isActive ? 'true' : 'false'}"
            tabindex="${isActive ? '0' : '-1'}"
            class="filter-tab-btn ${isActive ? 'is-active' : ''}"
            data-filter-category="${utils.escapeHtml(tab.id)}"
          >
            <span class="filter-tab-name">${utils.escapeHtml(tab.name)}</span>
            <span class="filter-tab-badge">${tab.count}</span>
          </button>
        `;
      })
      .join('');
  }

  /**
   * Рендерит основной каталог блюд (#menu-catalog-container)
   */
  function renderMenuCatalog() {
    const container = document.getElementById('menu-catalog-container');
    if (!container) return;

    const allItems = global.OHD.getAllCatalogItems();
    const normalizedQuery = searchQuery.trim().toLowerCase();

    const filteredItems = allItems.filter((item) => {
      const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
      if (!matchesCategory) return false;
      if (!normalizedQuery) return true;

      const haystack = [
        item.name,
        item.description,
        item.size || '',
        ...(item.composition || []),
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    });

    const resultsStatus = document.getElementById('catalog-results-count');
    if (resultsStatus) {
      resultsStatus.textContent = `Позиций: ${filteredItems.length}`;
    }

    const isCatalogMainPage = Boolean(document.getElementById('page-menu-title'));
    const groupHeadingTag = isCatalogMainPage ? 'h2' : 'h3';
    const groupedCardHeadingTag = isCatalogMainPage ? 'h3' : 'h4';
    const flatCardHeadingTag = isCatalogMainPage ? 'h2' : 'h3';

    if (filteredItems.length === 0) {
      container.innerHTML = `
        <div class="catalog-empty-box">
          <${groupHeadingTag}>Ничего не найдено</${groupHeadingTag}>
          <p>Попробуйте изменить поисковый запрос или выбрать другую категорию.</p>
          <button type="button" class="btn-primary" data-reset-filters>Показать всё меню</button>
        </div>
      `;
      return;
    }

    let renderedIndex = 0;
    const cardPriorityOptions = () => {
      const idx = renderedIndex++;
      if (!isCatalogMainPage) return {};
      return { isLcp: idx === 0, isEager: idx > 0 && idx < 3 };
    };

    if (activeCategory === 'all' && !normalizedQuery) {
      container.innerHTML = CONFIG.categories
        .map((cat) => {
          const catItems = filteredItems.filter((item) => item.category === cat.id);
          if (catItems.length === 0) return '';
          return `
            <section class="catalog-category-group" id="cat-group-${utils.escapeHtml(cat.id)}" aria-labelledby="heading-${utils.escapeHtml(cat.id)}">
              <div class="catalog-group-header">
                <${groupHeadingTag} id="heading-${utils.escapeHtml(cat.id)}" class="catalog-group-title">${utils.escapeHtml(cat.name)}</${groupHeadingTag}>
                <span class="catalog-group-count">${catItems.length}</span>
              </div>
              <div class="menu-cards-grid">
                ${catItems
                  .map((item) =>
                    renderMenuItemCard(item, {
                      headingTag: groupedCardHeadingTag,
                      ...cardPriorityOptions(),
                    })
                  )
                  .join('')}
              </div>
            </section>
          `;
        })
        .join('');
      return;
    }

    container.innerHTML = `
      <div class="menu-cards-grid">
        ${filteredItems
          .map((item) =>
            renderMenuItemCard(item, {
              headingTag: flatCardHeadingTag,
              ...cardPriorityOptions(),
            })
          )
          .join('')}
      </div>
    `;
  }

  /**
   * Синхронизирует кнопки добавления/счётчики во всех видимых карточках
   */
  function updateAllCardActionSlots() {
    if (typeof document === 'undefined') return;
    document.querySelectorAll('[data-action-slot]').forEach((slot) => {
      const itemId = slot.getAttribute('data-action-slot');
      const item = global.OHD.getCatalogItemById(itemId);
      if (item) {
        slot.innerHTML = renderCardActionControl(item);
      }
    });
  }

  /**
   * Устанавливает активную категорию
   * @param {string} categoryId
   * @param {boolean} scrollToCatalog
   */
  function setCategory(categoryId, scrollToCatalog = false) {
    const validIds = ['all', ...CONFIG.categories.map((c) => c.id)];
    activeCategory = validIds.includes(categoryId) ? categoryId : 'all';
    renderCategoryFilterTabs();
    renderMenuCatalog();

    if (scrollToCatalog) {
      const catalogSection = document.getElementById('catalog-section');
      if (catalogSection) {
        catalogSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }

  /**
   * Инициализация модуля меню
   */
  function initMenu() {
    if (typeof document === 'undefined') return;

    try {
      const params = new URLSearchParams(global.location.search);
      const urlCat = params.get('category');
      if (urlCat) {
        const validIds = ['all', ...CONFIG.categories.map((c) => c.id)];
        if (validIds.includes(urlCat)) {
          activeCategory = urlCat;
        }
      }
    } catch (_) {
      // ignore URLSearchParams error
    }

    renderCategoryCards();
    renderPopularMenu();
    renderCombosShowcase();
    renderCategoryFilterTabs();
    renderMenuCatalog();

    const totalCatalogCount = global.OHD.getAllCatalogItems().length;
    document.querySelectorAll('[data-catalog-total-btn]').forEach((btn) => {
      btn.textContent = `Все ${totalCatalogCount} позиций`;
    });

    const searchInput = document.getElementById('menu-search-input');
    const clearSearchBtn = document.getElementById('menu-search-clear');

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value || '';
        if (clearSearchBtn) {
          clearSearchBtn.hidden = searchQuery.length === 0;
        }
        renderMenuCatalog();
      });
    }

    if (clearSearchBtn) {
      clearSearchBtn.addEventListener('click', () => {
        searchQuery = '';
        if (searchInput) {
          searchInput.value = '';
          searchInput.focus();
        }
        clearSearchBtn.hidden = true;
        renderMenuCatalog();
      });
    }

    document.addEventListener('click', (e) => {
      const filterBtn = e.target.closest('[data-filter-category]');
      if (filterBtn) {
        e.preventDefault();
        const catId = filterBtn.getAttribute('data-filter-category');
        setCategory(catId, false);
        return;
      }

      const selectCatLink = e.target.closest('[data-select-category]');
      if (selectCatLink) {
        const catId = selectCatLink.getAttribute('data-select-category');
        if (document.getElementById('catalog-section')) {
          e.preventDefault();
          setCategory(catId, true);
        }
        return;
      }

      const resetBtn = e.target.closest('[data-reset-filters]');
      if (resetBtn) {
        e.preventDefault();
        searchQuery = '';
        if (searchInput) searchInput.value = '';
        if (clearSearchBtn) clearSearchBtn.hidden = true;
        setCategory('all', false);
      }
    });

    // Клавиатурная навигация стрелками по вкладкам категорий (ARIA Tablist pattern)
    const tabsEl = document.getElementById('category-filter-tabs');
    if (tabsEl) {
      tabsEl.addEventListener('keydown', (e) => {
        const keys = ['ArrowLeft', 'ArrowRight', 'Home', 'End'];
        if (!keys.includes(e.key)) return;
        const tabButtons = [...tabsEl.querySelectorAll('[role="tab"]')];
        if (tabButtons.length === 0) return;
        const currentIndex = tabButtons.indexOf(document.activeElement);
        if (currentIndex === -1) return;

        e.preventDefault();
        let nextIndex = currentIndex;
        if (e.key === 'ArrowRight') nextIndex = (currentIndex + 1) % tabButtons.length;
        else if (e.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + tabButtons.length) % tabButtons.length;
        else if (e.key === 'Home') nextIndex = 0;
        else if (e.key === 'End') nextIndex = tabButtons.length - 1;

        const targetTab = tabButtons[nextIndex];
        const catId = targetTab.getAttribute('data-filter-category');
        setCategory(catId, false);
        const refreshedTab = tabsEl.querySelector(`[data-filter-category="${catId}"]`);
        if (refreshedTab) {
          refreshedTab.focus();
          refreshedTab.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' });
        }
      });
    }

    if (global.OHD.cart && typeof global.OHD.cart.subscribe === 'function') {
      global.OHD.cart.subscribe(() => {
        updateAllCardActionSlots();
      });
    }
  }

  global.OHD = global.OHD || {};
  global.OHD.menu = {
    initMenu,
    setCategory,
    renderPopularMenu,
    renderMenuCatalog,
    renderCombosShowcase,
    updateAllCardActionSlots,
  };
})(window);
