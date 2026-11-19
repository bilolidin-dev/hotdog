/**
 * ORIGINAL HOT DOG — Модуль управления корзиной и синхронизации с LocalStorage
 * Включает проверку актуальности цены и доступности позиций при загрузке.
 * Корзина НЕ очищается автоматически при переходе в WhatsApp.
 */
(function (global) {
  'use strict';

  const CONFIG = global.OHD.CONFIG;
  const utils = global.OHD.utils;

  let cartItems = [];
  const listeners = new Set();

  /**
   * Загружает корзину из LocalStorage и сверяет каждую позицию с актуальным каталогом
   */
  function loadCartFromStorage() {
    try {
      const raw = global.localStorage.getItem(CONFIG.storageKeys.cart);
      if (!raw) {
        cartItems = [];
        return;
      }
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        cartItems = [];
        return;
      }

      const validated = [];
      const syncNotices = [];

      parsed.forEach((saved) => {
        if (!saved || !saved.id || typeof saved.quantity !== 'number' || saved.quantity <= 0) {
          return;
        }
        const liveItem = global.OHD.getCatalogItemById(saved.id);
        if (!liveItem) {
          syncNotices.push(`Позиция «${saved.name || saved.id}» больше не в меню и была удалена из корзины.`);
          return;
        }
        if (!utils.isItemOrderable(liveItem)) {
          syncNotices.push(`Позиция «${liveItem.name}» временно недоступна для онлайн-заказа.`);
          return;
        }
        if (saved.price !== liveItem.price) {
          syncNotices.push(
            `Цена на «${liveItem.name}» обновилась: ${liveItem.price} ${CONFIG.delivery.currency}.`
          );
        }

        validated.push({
          id: liveItem.id,
          name: liveItem.name,
          category: liveItem.category,
          price: liveItem.price,
          size: liveItem.size || null,
          composition: Array.isArray(liveItem.composition) ? [...liveItem.composition] : null,
          image: liveItem.image,
          quantity: Math.min(99, Math.max(1, Math.floor(saved.quantity))),
        });
      });

      cartItems = validated;
      saveCartToStorage();

      if (syncNotices.length > 0 && typeof document !== 'undefined') {
        setTimeout(() => {
          syncNotices.forEach((msg) => utils.showToast(msg, 'info'));
        }, 400);
      }
    } catch (err) {
      console.error('Ошибка чтения корзины из LocalStorage:', err);
      cartItems = [];
    }
  }

  /**
   * Сохраняет текущее состояние корзины в LocalStorage
   */
  function saveCartToStorage() {
    try {
      global.localStorage.setItem(CONFIG.storageKeys.cart, JSON.stringify(cartItems));
    } catch (err) {
      console.error('Ошибка сохранения корзины в LocalStorage:', err);
    }
  }

  /**
   * Уведомляет всех подписчиков об изменении корзины
   */
  function notifyListeners() {
    const snapshot = getItems();
    const totalCount = getTotalCount();
    const totalPrice = getTotalPrice();
    listeners.forEach((fn) => {
      try {
        fn({ items: snapshot, totalCount, totalPrice });
      } catch (e) {
        console.error('Ошибка обработчика корзины:', e);
      }
    });
    renderCartUI();
  }

  /**
   * Возвращает копию массива позиций корзины
   */
  function getItems() {
    return cartItems.map((item) => ({ ...item }));
  }

  /**
   * Возвращает количество конкретного товара в корзине
   * @param {string} itemId
   * @returns {number}
   */
  function getItemQuantity(itemId) {
    const found = cartItems.find((item) => item.id === itemId);
    return found ? found.quantity : 0;
  }

  /**
   * Возвращает общее количество единиц товаров в корзине
   * @returns {number}
   */
  function getTotalCount() {
    return cartItems.reduce((sum, item) => sum + item.quantity, 0);
  }

  /**
   * Возвращает общую сумму корзины в сомах
   * @returns {number}
   */
  function getTotalPrice() {
    return cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }

  /**
   * Добавляет товар в корзину (с проверкой наличия и известной цены)
   * @param {string} itemId
   * @param {number} qty
   */
  function addItem(itemId, qty = 1) {
    const liveItem = global.OHD.getCatalogItemById(itemId);
    if (!liveItem) {
      utils.showToast('Товар не найден в меню', 'warning');
      return false;
    }
    if (!utils.isItemOrderable(liveItem)) {
      utils.showToast('Цена этого товара уточняется — его пока нельзя добавить в корзину', 'warning');
      return false;
    }

    const existing = cartItems.find((i) => i.id === itemId);
    if (existing) {
      existing.quantity = Math.min(99, existing.quantity + qty);
      existing.price = liveItem.price;
    } else {
      cartItems.push({
        id: liveItem.id,
        name: liveItem.name,
        category: liveItem.category,
        price: liveItem.price,
        size: liveItem.size || null,
        composition: Array.isArray(liveItem.composition) ? [...liveItem.composition] : null,
        image: liveItem.image,
        quantity: Math.min(99, Math.max(1, qty)),
      });
    }

    saveCartToStorage();
    notifyListeners();

    const sizeBadge = liveItem.size && liveItem.size !== 'Не указан' ? ` (${liveItem.size})` : '';
    utils.showToast(`Добавлено: ${liveItem.name}${sizeBadge}`, 'success');
    return true;
  }

  /**
   * Изменяет количество позиции в корзине
   * @param {string} itemId
   * @param {number} newQty
   */
  function setQuantity(itemId, newQty) {
    const index = cartItems.findIndex((i) => i.id === itemId);
    if (index === -1) return;

    if (newQty <= 0) {
      const removedName = cartItems[index].name;
      cartItems.splice(index, 1);
      saveCartToStorage();
      notifyListeners();
      utils.showToast(`Удалено из корзины: ${removedName}`, 'info');
      return;
    }

    cartItems[index].quantity = Math.min(99, Math.floor(newQty));
    saveCartToStorage();
    notifyListeners();
  }

  /**
   * Увеличивает количество на 1
   */
  function increment(itemId) {
    const current = getItemQuantity(itemId);
    if (current === 0) {
      addItem(itemId, 1);
    } else {
      setQuantity(itemId, current + 1);
    }
  }

  /**
   * Уменьшает количество на 1
   */
  function decrement(itemId) {
    const current = getItemQuantity(itemId);
    if (current > 0) {
      setQuantity(itemId, current - 1);
    }
  }

  /**
   * Удаляет товар из корзины полностью
   */
  function removeItem(itemId) {
    setQuantity(itemId, 0);
  }

  /**
   * Очищает корзину полностью (только по явному действию клиента)
   */
  function clearCart(silent = false) {
    cartItems = [];
    saveCartToStorage();
    notifyListeners();
    if (!silent) {
      utils.showToast('Корзина очищена', 'info');
    }
  }

  /**
   * Подписка на изменения корзины
   */
  function subscribe(callback) {
    listeners.add(callback);
    return () => listeners.delete(callback);
  }

  /**
   * Открывает модальное окно корзины (<dialog>)
   */
  function openCartModal() {
    const dialog = document.getElementById('cart-dialog');
    if (!dialog) return;
    renderCartUI();
    if (!dialog.open) {
      dialog.showModal();
    }
  }

  /**
   * Закрывает модальное окно корзины
   */
  function closeCartModal() {
    const dialog = document.getElementById('cart-dialog');
    if (dialog && dialog.open) {
      dialog.close();
    }
  }

  /**
   * Отрисовывает счётчики в шапке, плавающую кнопку на мобильных и содержимое <dialog id="cart-dialog">
   */
  function renderCartUI() {
    if (typeof document === 'undefined') return;

    const totalCount = getTotalCount();
    const totalPrice = getTotalPrice();
    const deliveryStatus = utils.calculateDeliveryStatus(totalPrice, 'delivery');

    // 1. Обновление всех счётчиков корзины в шапке и нижней панели навигации
    document.querySelectorAll('[data-cart-count]').forEach((el) => {
      el.textContent = String(totalCount);
      el.classList.toggle('is-empty', totalCount === 0);
    });

    document.querySelectorAll('[data-bottom-cart-badge]').forEach((badge) => {
      badge.hidden = totalCount === 0;
      badge.textContent = totalCount > 99 ? '99+' : String(totalCount);
    });

    document.querySelectorAll('[data-bottom-nav="cart"]').forEach((btn) => {
      btn.setAttribute(
        'aria-label',
        totalCount > 0 ? `Корзина, товаров: ${totalCount}` : 'Корзина'
      );
    });

    document.querySelectorAll('[data-cart-total]').forEach((el) => {
      el.textContent = utils.formatPrice(totalPrice);
    });

    // 2. Обновление фиксированной мобильной панели корзины
    const floatingBar = document.getElementById('mobile-cart-bar');
    if (floatingBar) {
      floatingBar.classList.toggle('is-visible', totalCount > 0);
      const countEl = floatingBar.querySelector('[data-mobile-cart-count]');
      const sumEl = floatingBar.querySelector('[data-mobile-cart-sum]');
      const hintEl = floatingBar.querySelector('[data-mobile-cart-hint]');
      if (countEl) countEl.textContent = `${totalCount} шт.`;
      if (sumEl) sumEl.textContent = utils.formatPrice(totalPrice);
      if (hintEl) {
        hintEl.textContent = deliveryStatus.isFreeEligible
          ? 'Бесплатная доставка по Кашкар-Кыштаку!'
          : `Бесплатная доставка по Кашкару от >${CONFIG.delivery.freeDeliveryThreshold} сом`;
      }
    }

    // 3. Обновление содержимого модального окна корзины
    const listContainer = document.getElementById('cart-items-list');
    const emptyState = document.getElementById('cart-empty-state');
    const filledState = document.getElementById('cart-filled-state');
    const deliveryBanner = document.getElementById('cart-delivery-progress');
    const subtotalEl = document.getElementById('cart-summary-subtotal');

    if (!listContainer) return;

    if (cartItems.length === 0) {
      if (emptyState) emptyState.hidden = false;
      if (filledState) filledState.hidden = true;
      listContainer.innerHTML = '';
      return;
    }

    if (emptyState) emptyState.hidden = true;
    if (filledState) filledState.hidden = false;

    if (deliveryBanner) {
      deliveryBanner.innerHTML = `
        <div class="delivery-progress-head">
          <span class="delivery-progress-badge ${deliveryStatus.isFreeEligible ? 'is-free' : ''}">
            ${utils.escapeHtml(deliveryStatus.statusBadge)}
          </span>
          <span class="delivery-progress-title">${utils.escapeHtml(deliveryStatus.headline)}</span>
        </div>
        <div class="delivery-progress-track" role="progressbar" aria-valuenow="${deliveryStatus.progressPercent}" aria-valuemin="0" aria-valuemax="100">
          <div class="delivery-progress-fill ${deliveryStatus.isFreeEligible ? 'is-free' : ''}" style="width: ${deliveryStatus.progressPercent}%"></div>
        </div>
        <p class="delivery-progress-note">${utils.escapeHtml(deliveryStatus.subtext)}</p>
      `;
    }

    listContainer.innerHTML = cartItems
      .map((item) => {
        const lineTotal = item.price * item.quantity;
        const sizeLabel =
          item.size && item.size !== 'Не указан'
            ? `<span class="cart-item-size">${utils.escapeHtml(item.size)}</span>`
            : '';
        return `
          <li class="cart-item-row" data-cart-item-id="${utils.escapeHtml(item.id)}">
            <img
              src="${utils.escapeHtml(item.image)}"
              alt="${utils.escapeHtml(item.name)}"
              class="cart-item-thumb"
              width="68"
              height="52"
              loading="lazy"
            >
            <div class="cart-item-info">
              <div class="cart-item-title-line">
                <h4 class="cart-item-title">${utils.escapeHtml(item.name)}</h4>
                ${sizeLabel}
              </div>
              <div class="cart-item-meta">
                <span>${utils.formatPrice(item.price)} / шт.</span>
                <strong class="cart-item-line-total">${utils.formatPrice(lineTotal)}</strong>
              </div>
            </div>
            <div class="cart-item-actions">
              <div class="qty-control" role="group" aria-label="Количество ${utils.escapeHtml(item.name)}">
                <button
                  type="button"
                  class="qty-btn"
                  data-cart-action="decrement"
                  data-item-id="${utils.escapeHtml(item.id)}"
                  aria-label="Уменьшить количество ${utils.escapeHtml(item.name)}"
                >−</button>
                <span class="qty-value" aria-live="polite">${item.quantity}</span>
                <button
                  type="button"
                  class="qty-btn"
                  data-cart-action="increment"
                  data-item-id="${utils.escapeHtml(item.id)}"
                  aria-label="Увеличить количество ${utils.escapeHtml(item.name)}"
                >+</button>
              </div>
              <button
                type="button"
                class="cart-remove-btn"
                data-cart-action="remove"
                data-item-id="${utils.escapeHtml(item.id)}"
                aria-label="Удалить ${utils.escapeHtml(item.name)} из корзины"
                title="Удалить позицию"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
              </button>
            </div>
          </li>
        `;
      })
      .join('');

    if (subtotalEl) {
      subtotalEl.textContent = utils.formatPrice(totalPrice);
    }
  }

  /**
   * Инициализация обработчиков событий корзины
   */
  function initCart() {
    loadCartFromStorage();

    if (typeof document === 'undefined') return;

    const cartDialog = document.getElementById('cart-dialog');
    if (cartDialog) {
      utils.attachDialogLightDismissFallback(cartDialog);
    }

    document.addEventListener('click', (e) => {
      // Открытие корзины
      const openTrigger = e.target.closest('[data-open-cart]');
      if (openTrigger) {
        e.preventDefault();
        openCartModal();
        return;
      }

      // Закрытие корзины
      const closeTrigger = e.target.closest('[data-close-cart]');
      if (closeTrigger) {
        e.preventDefault();
        closeCartModal();
        return;
      }

      // Очистка корзины
      const clearTrigger = e.target.closest('[data-clear-cart]');
      if (clearTrigger) {
        e.preventDefault();
        clearCart(false);
        return;
      }

      // Переход от корзины к оформлению заказа
      const proceedTrigger = e.target.closest('[data-proceed-checkout]');
      if (proceedTrigger) {
        e.preventDefault();
        closeCartModal();
        if (global.OHD.checkout && typeof global.OHD.checkout.openCheckoutModal === 'function') {
          global.OHD.checkout.openCheckoutModal();
        }
        return;
      }

      // Действия внутри корзины или карточек (+ / - / remove / add)
      const actionBtn = e.target.closest('[data-cart-action]');
      if (actionBtn) {
        e.preventDefault();
        const action = actionBtn.getAttribute('data-cart-action');
        const itemId = actionBtn.getAttribute('data-item-id');
        if (!itemId) return;

        if (action === 'add') addItem(itemId, 1);
        else if (action === 'increment') increment(itemId);
        else if (action === 'decrement') decrement(itemId);
        else if (action === 'remove') removeItem(itemId);
      }
    });

    // Синхронизация между вкладками браузера
    global.addEventListener('storage', (e) => {
      if (e.key === CONFIG.storageKeys.cart) {
        loadCartFromStorage();
        notifyListeners();
      }
    });

    renderCartUI();
  }

  global.OHD = global.OHD || {};
  global.OHD.cart = {
    initCart,
    getItems,
    getItemQuantity,
    getTotalCount,
    getTotalPrice,
    addItem,
    setQuantity,
    increment,
    decrement,
    removeItem,
    clearCart,
    subscribe,
    openCartModal,
    closeCartModal,
    renderCartUI,
  };
})(window);
