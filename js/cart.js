/**
 * ORIGINAL HOT DOG — Модуль корзины и версионированного LocalStorage (js/cart.js)
 * Доверяет только живому каталогу, защищён от подмены цен и сбоев хранилища.
 */
(function (global) {
  'use strict';

  const CART_SCHEMA_VERSION = 1;
  const MAX_ITEM_QUANTITY = 50;
  const MAX_UNIQUE_ITEMS = 50;

  const config = global.OHD.CONFIG;
  const utils = global.OHD.utils;

  let cartState = [];
  const listeners = new Set();
  let lastError = '';
  let storageWarningShown = false;

  function setLastError(msg) {
    lastError = msg ? String(msg) : '';
  }

  function isOrderableCatalogItem(liveItem) {
    return Boolean(
      liveItem &&
        utils.isItemOrderable(liveItem) &&
        typeof liveItem.price === 'number' &&
        Number.isFinite(liveItem.price) &&
        liveItem.price > 0
    );
  }

  function notifyStorageIssue(errorCode) {
    if (storageWarningShown) return;
    storageWarningShown = true;
    if (errorCode === 'quota_exceeded') {
      utils.showToast('Память браузера заполнена — корзина сохранена для текущей страницы.', 'warning');
    } else if (errorCode === 'unavailable') {
      utils.showToast('LocalStorage недоступен — корзина работает в режиме текущей сессии.', 'info');
    }
  }

  function persistCartState() {
    const payload = {
      version: CART_SCHEMA_VERSION,
      updatedAt: new Date().toISOString(),
      items: cartState.map((entry) => ({
        id: entry.id,
        quantity: entry.quantity,
        unitPrice: entry.unitPrice,
      })),
    };
    const res = utils.safeStorageSetJson(config.storageKeys.cart, payload);
    if (!res.ok) {
      notifyStorageIssue(res.errorCode);
    }
    return res.ok;
  }

  /**
   * Валидация и пересчёт элементов корзины по живому каталогу
   * @param {Array} rawItems
   */
  function validateAndNormalizeEntries(rawItems) {
    const seen = new Map();
    let changed = false;
    let hadInvalidOrMissing = false;
    let hadPriceMismatch = false;

    if (!Array.isArray(rawItems)) {
      return { entries: [], changed: true, hadInvalidOrMissing: true, hadPriceMismatch: false };
    }

    rawItems.forEach((rawEntry) => {
      if (!rawEntry || typeof rawEntry !== 'object' || typeof rawEntry.id !== 'string') {
        hadInvalidOrMissing = true;
        changed = true;
        return;
      }

      const id = utils.sanitizeTextInput(rawEntry.id, 120);
      const liveItem = global.OHD.getCatalogItemById(id);
      if (!isOrderableCatalogItem(liveItem)) {
        hadInvalidOrMissing = true;
        changed = true;
        return;
      }

      const parsedQty = Number(rawEntry.quantity);
      if (!Number.isInteger(parsedQty) || parsedQty < 1 || parsedQty > MAX_ITEM_QUANTITY) {
        hadInvalidOrMissing = true;
        changed = true;
        return;
      }

      const storedPrice =
        rawEntry.unitPrice !== undefined ? rawEntry.unitPrice : rawEntry.price;
      if (storedPrice !== undefined && storedPrice !== liveItem.price) {
        hadPriceMismatch = true;
        changed = true;
      }

      if (seen.has(id)) {
        const existing = seen.get(id);
        const mergedQty = Math.min(MAX_ITEM_QUANTITY, existing.quantity + parsedQty);
        if (mergedQty !== existing.quantity + parsedQty) changed = true;
        existing.quantity = mergedQty;
      } else if (seen.size < MAX_UNIQUE_ITEMS) {
        seen.set(id, {
          id: liveItem.id,
          quantity: parsedQty,
          unitPrice: liveItem.price,
        });
      } else {
        changed = true;
      }
    });

    return {
      entries: Array.from(seen.values()),
      changed,
      hadInvalidOrMissing,
      hadPriceMismatch,
    };
  }

  function syncWithCatalog(options = {}) {
    const notifyOnChange = Boolean(options.notifyOnChange);
    const { entries, changed, hadInvalidOrMissing, hadPriceMismatch } =
      validateAndNormalizeEntries(cartState);

    cartState = entries;
    if (changed) {
      persistCartState();
      notifyListeners();
      if (notifyOnChange) {
        if (hadPriceMismatch) {
          utils.showToast('Цены в каталоге обновлены — сумма корзины пересчитана.', 'info');
        } else if (hadInvalidOrMissing) {
          utils.showToast('Недоступные или удалённые блюда убраны из корзины.', 'info');
        }
      }
    }
    return { changed, hadInvalidOrMissing, hadPriceMismatch };
  }

  function loadCartFromStorage() {
    const res = utils.safeStorageGetJson(config.storageKeys.cart);
    if (!res.ok) {
      if (res.errorCode === 'corrupted') {
        utils.safeStorageRemove(config.storageKeys.cart);
        utils.showToast('Данные корзины были повреждены и сброшены.', 'warning');
      } else {
        notifyStorageIssue(res.errorCode);
      }
      return [];
    }

    if (res.data === null) {
      return [];
    }

    let rawList = null;
    let shouldRewriteSchema = false;

    if (Array.isArray(res.data)) {
      // Безопасная миграция устаревшего формата без поля version
      rawList = res.data;
      shouldRewriteSchema = true;
    } else if (
      typeof res.data === 'object' &&
      res.data.version === CART_SCHEMA_VERSION &&
      Array.isArray(res.data.items)
    ) {
      rawList = res.data.items;
    } else {
      utils.safeStorageRemove(config.storageKeys.cart);
      utils.showToast('Устаревшие или повреждённые данные корзины сброшены.', 'warning');
      return [];
    }

    const result = validateAndNormalizeEntries(rawList);
    if (result.changed || shouldRewriteSchema) {
      cartState = result.entries;
      persistCartState();
      if (result.hadPriceMismatch) {
        utils.showToast('Корзина пересчитана по актуальным ценам меню.', 'info');
      } else if (result.hadInvalidOrMissing) {
        utils.showToast('Некоторые недоступные позиции были убраны из корзины.', 'info');
      }
    }
    return result.entries;
  }

  function notifyListeners() {
    renderCartUI();
    listeners.forEach((cb) => {
      try {
        cb(getItems(), getTotalCount(), getTotalPrice());
      } catch (_) {
        // Изоляция ошибок подписчиков
      }
    });
  }

  /**
   * Возвращает актуальные позиции корзины (имена и цены всегда берутся из каталога)
   */
  function getItems() {
    return cartState
      .map((entry) => {
        const liveItem = global.OHD.getCatalogItemById(entry.id);
        if (!isOrderableCatalogItem(liveItem)) return null;
        if (!Number.isInteger(entry.quantity) || entry.quantity < 1 || entry.quantity > MAX_ITEM_QUANTITY) {
          return null;
        }
        return {
          ...liveItem,
          quantity: entry.quantity,
        };
      })
      .filter(Boolean);
  }

  function getItemQuantity(itemId) {
    if (typeof itemId !== 'string') return 0;
    const found = cartState.find((i) => i.id === itemId);
    return found ? found.quantity : 0;
  }

  function getTotalCount() {
    return getItems().reduce((sum, item) => sum + item.quantity, 0);
  }

  function getTotalPrice() {
    return getItems().reduce((sum, item) => sum + item.price * item.quantity, 0);
  }

  function addItem(itemId, qty = 1) {
    setLastError('');
    if (typeof itemId !== 'string' || !itemId.trim()) {
      setLastError('Некорректный идентификатор товара');
      utils.showToast('Товар не найден в меню', 'warning');
      return false;
    }

    if (!Number.isInteger(qty) || qty < 1 || qty > MAX_ITEM_QUANTITY) {
      setLastError('Некорректное количество товара');
      utils.showToast(`Укажите целое количество от 1 до ${MAX_ITEM_QUANTITY}`, 'warning');
      return false;
    }

    const liveItem = global.OHD.getCatalogItemById(itemId);
    if (!liveItem) {
      setLastError('Товар не найден');
      utils.showToast('Товар не найден в меню', 'warning');
      return false;
    }

    if (!isOrderableCatalogItem(liveItem)) {
      setLastError('Цена товара не подтверждена');
      utils.showToast('Цена этого товара уточняется — его пока нельзя добавить в корзину', 'warning');
      return false;
    }

    // Проверка актуальности уже находящихся в корзине товаров
    syncWithCatalog({ notifyOnChange: true });

    const existing = cartState.find((i) => i.id === liveItem.id);
    if (existing) {
      const nextQty = existing.quantity + qty;
      if (nextQty > MAX_ITEM_QUANTITY) {
        setLastError(`Превышен лимит ${MAX_ITEM_QUANTITY} шт.`);
        utils.showToast(`Максимальное количество одной позиции — ${MAX_ITEM_QUANTITY} шт.`, 'warning');
        return false;
      }
      existing.quantity = nextQty;
      existing.unitPrice = liveItem.price;
    } else {
      if (cartState.length >= MAX_UNIQUE_ITEMS) {
        setLastError('Слишком много позиций в корзине');
        utils.showToast(`В одном заказе не более ${MAX_UNIQUE_ITEMS} разных блюд`, 'warning');
        return false;
      }
      cartState.push({
        id: liveItem.id,
        quantity: qty,
        unitPrice: liveItem.price,
      });
    }

    persistCartState();
    notifyListeners();

    const sizeBadge =
      liveItem.size && liveItem.size !== 'Не указан' ? ` (${liveItem.size})` : '';
    utils.showToast(`Добавлено: ${liveItem.name}${sizeBadge}`, 'success');
    return true;
  }

  function setQuantity(itemId, newQty) {
    setLastError('');
    if (typeof itemId !== 'string' || !itemId.trim()) {
      return false;
    }

    const parsedQty = Number(newQty);
    if (!Number.isInteger(parsedQty) || parsedQty < 0 || parsedQty > MAX_ITEM_QUANTITY) {
      setLastError('Некорректное количество');
      utils.showToast(`Количество должно быть целым от 1 до ${MAX_ITEM_QUANTITY}`, 'warning');
      return false;
    }

    const index = cartState.findIndex((i) => i.id === itemId);
    if (index === -1) return false;

    if (parsedQty === 0) {
      const live = global.OHD.getCatalogItemById(itemId);
      const removedName = live ? live.name : 'Позиция';
      cartState.splice(index, 1);
      persistCartState();
      notifyListeners();
      utils.showToast(`Удалено из корзины: ${removedName}`, 'info');
      return true;
    }

    const liveItem = global.OHD.getCatalogItemById(itemId);
    if (!isOrderableCatalogItem(liveItem)) {
      cartState.splice(index, 1);
      persistCartState();
      notifyListeners();
      utils.showToast('Товар больше недоступен для заказа и удалён из корзины', 'warning');
      return false;
    }

    cartState[index].quantity = parsedQty;
    cartState[index].unitPrice = liveItem.price;
    persistCartState();
    notifyListeners();
    return true;
  }

  function increment(itemId) {
    const current = getItemQuantity(itemId);
    if (current === 0) {
      return addItem(itemId, 1);
    }
    return setQuantity(itemId, current + 1);
  }

  function decrement(itemId) {
    const current = getItemQuantity(itemId);
    if (current <= 0) return false;
    return setQuantity(itemId, current - 1);
  }

  function removeItem(itemId) {
    return setQuantity(itemId, 0);
  }

  function clearCart(silent = false) {
    cartState = [];
    persistCartState();
    notifyListeners();
    if (!silent) {
      utils.showToast('Корзина очищена', 'info');
    }
  }

  function subscribe(callback) {
    if (typeof callback === 'function') {
      listeners.add(callback);
    }
    return () => listeners.delete(callback);
  }

  function openCartModal() {
    const dialog = document.getElementById('cart-dialog');
    if (!dialog) return;
    syncWithCatalog({ notifyOnChange: true });
    renderCartUI();
    if (!dialog.open) {
      dialog.showModal();
    }
  }

  function closeCartModal() {
    const dialog = document.getElementById('cart-dialog');
    if (dialog && dialog.open) {
      dialog.close();
    }
  }

  function renderCartUI() {
    if (typeof document === 'undefined') return;
    const items = getItems();
    const totalCount = items.reduce((sum, i) => sum + i.quantity, 0);
    const totalPrice = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const deliveryStatus = utils.calculateDeliveryStatus(totalPrice);

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
        totalCount > 0
          ? `Корзина: ${totalCount} шт., на сумму ${utils.formatPrice(totalPrice)}`
          : 'Корзина'
      );
    });

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
          ? 'Доставка по Кашкару: бесплатно'
          : `До бесплатной по Кашкару: ${utils.formatPrice(deliveryStatus.remainingAmount)}`;
      }
    }

    renderCartModalContent(items, totalPrice, deliveryStatus);
  }

  function createDeliveryProgressNode(deliveryStatus) {
    const wrapper = document.createDocumentFragment();

    const head = document.createElement('div');
    head.className = 'delivery-progress-head';

    const badge = document.createElement('span');
    badge.className = `delivery-progress-badge${deliveryStatus.isFreeEligible ? ' is-free' : ''}`;
    badge.textContent = deliveryStatus.isFreeEligible ? 'Выгодно' : 'Доставка';

    const title = document.createElement('span');
    title.className = 'delivery-progress-title';
    title.textContent = deliveryStatus.headline;

    head.appendChild(badge);
    head.appendChild(title);

    const progressEl = document.createElement('progress');
    progressEl.className = `delivery-progress-meter${deliveryStatus.isFreeEligible ? ' is-free' : ''}`;
    progressEl.max = 100;
    const pct = Math.max(0, Math.min(100, Number(deliveryStatus.progressPercent) || 0));
    progressEl.value = pct;
    progressEl.setAttribute('aria-label', deliveryStatus.headline);

    const note = document.createElement('p');
    note.className = 'delivery-progress-note';
    note.textContent = deliveryStatus.subtext;

    wrapper.appendChild(head);
    wrapper.appendChild(progressEl);
    wrapper.appendChild(note);
    return wrapper;
  }

  function createCartItemRow(item) {
    const lineTotal = item.price * item.quantity;
    const li = document.createElement('li');
    li.className = 'cart-item-row';
    li.setAttribute('data-cart-item-id', item.id);

    const img = document.createElement('img');
    const fallbackSrc = 'assets/images/categories/cat-hotdogs.webp';
    img.src = utils.isSafeLocalAssetPath(item.image) ? item.image : fallbackSrc;
    img.alt = item.name;
    img.className = 'cart-item-thumb';
    img.width = 72;
    img.height = 72;
    img.loading = 'lazy';
    img.decoding = 'async';

    const info = document.createElement('div');
    info.className = 'cart-item-info';

    const titleLine = document.createElement('div');
    titleLine.className = 'cart-item-title-line';

    const title = document.createElement('h4');
    title.className = 'cart-item-title';
    title.textContent = item.name;
    titleLine.appendChild(title);

    if (item.size && item.size !== 'Не указан') {
      const sizeSpan = document.createElement('span');
      sizeSpan.className = 'cart-item-size';
      sizeSpan.textContent = item.size;
      titleLine.appendChild(sizeSpan);
    }

    const meta = document.createElement('div');
    meta.className = 'cart-item-meta';

    const unitPriceSpan = document.createElement('span');
    unitPriceSpan.textContent = `${utils.formatPrice(item.price)} × ${item.quantity}`;

    const lineTotalStrong = document.createElement('strong');
    lineTotalStrong.className = 'cart-item-line-total';
    lineTotalStrong.textContent = utils.formatPrice(lineTotal);

    meta.appendChild(unitPriceSpan);
    meta.appendChild(lineTotalStrong);

    info.appendChild(titleLine);
    info.appendChild(meta);

    const actions = document.createElement('div');
    actions.className = 'cart-item-actions';

    const qtyStepper = document.createElement('div');
    qtyStepper.className = 'qty-stepper';

    const decBtn = document.createElement('button');
    decBtn.type = 'button';
    decBtn.className = 'qty-btn';
    decBtn.setAttribute('data-cart-action', 'decrement');
    decBtn.setAttribute('data-item-id', item.id);
    decBtn.setAttribute('aria-label', `Уменьшить количество ${item.name}`);
    decBtn.textContent = '−';

    const qtyValue = document.createElement('span');
    qtyValue.className = 'qty-value';
    qtyValue.setAttribute('aria-live', 'polite');
    qtyValue.textContent = String(item.quantity);

    const incBtn = document.createElement('button');
    incBtn.type = 'button';
    incBtn.className = 'qty-btn';
    incBtn.setAttribute('data-cart-action', 'increment');
    incBtn.setAttribute('data-item-id', item.id);
    incBtn.setAttribute('aria-label', `Увеличить количество ${item.name}`);
    incBtn.textContent = '+';

    qtyStepper.appendChild(decBtn);
    qtyStepper.appendChild(qtyValue);
    qtyStepper.appendChild(incBtn);

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'cart-remove-btn';
    removeBtn.setAttribute('data-cart-action', 'remove');
    removeBtn.setAttribute('data-item-id', item.id);
    removeBtn.setAttribute('aria-label', `Удалить ${item.name} из корзины`);
    removeBtn.textContent = 'Удалить';

    actions.appendChild(qtyStepper);
    actions.appendChild(removeBtn);

    li.appendChild(img);
    li.appendChild(info);
    li.appendChild(actions);
    return li;
  }

  function renderCartModalContent(items, totalPrice, deliveryStatus) {
    const emptyState = document.getElementById('cart-empty-state');
    const filledState = document.getElementById('cart-filled-state');
    const listContainer = document.getElementById('cart-items-list');
    const subtotalEl = document.getElementById('cart-summary-subtotal');
    const deliveryBanner = document.getElementById('cart-delivery-progress');

    if (!listContainer) return;

    if (items.length === 0) {
      if (emptyState) emptyState.hidden = false;
      if (filledState) filledState.hidden = true;
      listContainer.replaceChildren();
      if (deliveryBanner) deliveryBanner.replaceChildren();
      return;
    }

    if (emptyState) emptyState.hidden = true;
    if (filledState) filledState.hidden = false;

    if (deliveryBanner) {
      deliveryBanner.replaceChildren(createDeliveryProgressNode(deliveryStatus));
    }

    const fragment = document.createDocumentFragment();
    items.forEach((item) => {
      fragment.appendChild(createCartItemRow(item));
    });
    listContainer.replaceChildren(fragment);

    if (subtotalEl) {
      subtotalEl.textContent = utils.formatPrice(totalPrice);
    }
  }

  function bindCartEvents() {
    if (typeof document === 'undefined') return;
    const cartDialog = document.getElementById('cart-dialog');
    if (cartDialog) {
      utils.attachDialogLightDismissFallback(cartDialog);
    }

    document.addEventListener('click', (e) => {
      const openBtn = e.target.closest('[data-open-cart]');
      if (openBtn) {
        e.preventDefault();
        openCartModal();
        return;
      }

      const closeBtn = e.target.closest('[data-close-cart]');
      if (closeBtn) {
        e.preventDefault();
        closeCartModal();
        return;
      }

      const clearBtn = e.target.closest('[data-clear-cart]');
      if (clearBtn) {
        e.preventDefault();
        clearCart(false);
        return;
      }

      const proceedBtn = e.target.closest('[data-proceed-checkout]');
      if (proceedBtn) {
        e.preventDefault();
        closeCartModal();
        if (global.OHD.checkout && typeof global.OHD.checkout.openCheckoutModal === 'function') {
          global.OHD.checkout.openCheckoutModal();
        }
        return;
      }

      const actionBtn = e.target.closest('[data-cart-action]');
      if (actionBtn) {
        e.preventDefault();
        const action = actionBtn.getAttribute('data-cart-action');
        const itemId = actionBtn.getAttribute('data-item-id');
        if (!itemId) return;

        if (action === 'add') addItem(itemId, 1);
        else if (action === 'increment' || action === 'inc') increment(itemId);
        else if (action === 'decrement' || action === 'dec') decrement(itemId);
        else if (action === 'remove') removeItem(itemId);
      }
    });

    // Кросс-вкладочная и возвратная проверка цен
    global.addEventListener('storage', (e) => {
      if (e.key === config.storageKeys.cart) {
        cartState = loadCartFromStorage();
        notifyListeners();
      }
    });
  }

  let eventsBound = false;

  function initCart() {
    cartState = loadCartFromStorage();
    if (!eventsBound) {
      bindCartEvents();
      eventsBound = true;
    }
    renderCartUI();
  }

  global.OHD = global.OHD || {};
  global.OHD.cart = {
    CART_SCHEMA_VERSION,
    MAX_ITEM_QUANTITY,
    initCart,
    syncWithCatalog,
    getItems,
    getItemQuantity,
    getTotalCount,
    getTotalPrice,
    getLastError: () => lastError,
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
