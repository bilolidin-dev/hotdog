/**
 * ORIGINAL HOT DOG — Вспомогательные утилиты (форматирование цен, расчёт доставки,
 * уведомления, работа с нативным <dialog> и доступностью форм).
 */
(function (global) {
  'use strict';

  const CONFIG = global.OHD.CONFIG;

  /**
   * Форматирует цену в сомах.
   * Никогда не превращает null в 0 сом.
   * @param {number|null|undefined} price
   * @returns {string}
   */
  function formatPrice(price) {
    if (price === null || price === undefined || typeof price !== 'number' || Number.isNaN(price)) {
      return 'Цена уточняется';
    }
    return `${price.toLocaleString('ru-RU')} ${CONFIG.delivery.currency}`;
  }

  /**
   * Экранирование HTML-символов для безопасного вывода
   * @param {string} value
   * @returns {string}
   */
  function escapeHtml(value) {
    if (value === null || value === undefined) return '';
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Проверяет, можно ли добавить позицию в корзину
   * @param {object} item
   * @returns {boolean}
   */
  function isItemOrderable(item) {
    if (!item) return false;
    return Boolean(item.available) && typeof item.price === 'number' && item.price > 0;
  }

  /**
   * Рассчитывает прогресс и статус условий доставки.
   * Условие владельца: внутри Кашкар-Кыштака доставка бесплатная при заказе свыше 500 сом (> 500 сом).
   * @param {number} subtotal
   * @param {'delivery'|'pickup'} orderType
   */
  function calculateDeliveryStatus(subtotal, orderType = 'delivery') {
    const threshold = CONFIG.delivery.freeDeliveryThreshold; // 500 сом
    const isFreeEligible = subtotal > threshold;
    // Для порога "свыше 500 сом" минимальная сумма бесплатной доставки — 501 сом (или > 500)
    const remainingForFree = isFreeEligible ? 0 : Math.max(1, threshold - subtotal + (subtotal === threshold ? 1 : 0));
    const progressPercent = Math.min(100, Math.round((subtotal / (threshold + 1)) * 100));

    if (orderType === 'pickup') {
      return {
        orderType,
        subtotal,
        threshold,
        isFreeEligible: true,
        remainingForFree: 0,
        progressPercent: 100,
        headline: 'Самовывоз из ресторана — 0 сом',
        subtext: `Заберите заказ по адресу: ${CONFIG.location.fullAddress}`,
        statusBadge: 'Самовывоз бесплатно',
      };
    }

    if (subtotal === 0) {
      return {
        orderType,
        subtotal,
        threshold,
        isFreeEligible: false,
        remainingForFree: threshold,
        progressPercent: 0,
        headline: `Бесплатная доставка по ${CONFIG.delivery.freeDeliveryLocality}е при заказе свыше ${threshold} ${CONFIG.delivery.currency}`,
        subtext: CONFIG.delivery.outsideAreaNote,
        statusBadge: `Бесплатно от >${threshold} сом`,
      };
    }

    if (isFreeEligible) {
      return {
        orderType,
        subtotal,
        threshold,
        isFreeEligible: true,
        remainingForFree: 0,
        progressPercent: 100,
        headline: `По ${CONFIG.delivery.freeDeliveryLocality}у доставка вашего заказа — БЕСПЛАТНО!`,
        subtext: 'Для адресов за пределами Кашкар-Кыштака стоимость доставки уточнит оператор в WhatsApp.',
        statusBadge: 'По Кашкару: 0 сом',
      };
    }

    const diffText =
      subtotal === threshold
        ? 'Добавьте ещё любое блюдо (заказ должен быть свыше 500 сом)'
        : `Добавьте ещё на ${threshold - subtotal} ${CONFIG.delivery.currency} (до суммы свыше ${threshold} ${CONFIG.delivery.currency})`;

    return {
      orderType,
      subtotal,
      threshold,
      isFreeEligible: false,
      remainingForFree,
      progressPercent,
      headline: `${diffText} для бесплатной доставки по ${CONFIG.delivery.freeDeliveryLocality}у`,
      subtext: CONFIG.delivery.outsideAreaNote,
      statusBadge: 'Стоимость уточняется',
    };
  }

  /**
   * Проверяет статус работы ресторана (10:00 — 00:00 по времени Ош/Бишкек UTC+6)
   */
  function getWorkingStatus() {
    try {
      const now = new Date();
      const utcHours = now.getUTCHours();
      const bishkekHours = (utcHours + 6) % 24;
      const isOpen = bishkekHours >= CONFIG.workingHours.openHour && bishkekHours < CONFIG.workingHours.closeHour;
      return {
        isOpen,
        label: isOpen ? 'Открыто сейчас • 10:00–00:00' : 'Принимаем предзаказы • График 10:00–00:00',
      };
    } catch (_) {
      return {
        isOpen: true,
        label: 'Ежедневно с 10:00 до 00:00',
      };
    }
  }

  /**
   * Показывает всплывающее уведомление (Toast)
   * @param {string} message
   * @param {'success'|'info'|'warning'} type
   */
  function showToast(message, type = 'success') {
    if (typeof document === 'undefined') return;
    let container = document.getElementById('ohd-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'ohd-toast-container';
      container.className = 'toast-container';
      container.setAttribute('aria-live', 'polite');
      container.setAttribute('aria-atomic', 'true');
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast-item toast-${type}`;

    const iconSvg =
      type === 'warning'
        ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>'
        : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';

    toast.innerHTML = `
      <span class="toast-icon">${iconSvg}</span>
      <span class="toast-text">${escapeHtml(message)}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('toast-leaving');
      setTimeout(() => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 260);
    }, 2800);
  }

  /**
   * Подключает fallback закрытия по клику вне области (light-dismiss) для <dialog closedby="any">
   * в браузерах без поддержки атрибута closedby.
   * @param {HTMLDialogElement} dialog
   */
  function attachDialogLightDismissFallback(dialog) {
    if (!dialog || typeof HTMLDialogElement === 'undefined') return;
    if (!('closedBy' in HTMLDialogElement.prototype)) {
      dialog.addEventListener('click', (event) => {
        if (event.target !== dialog) return;
        const rect = dialog.getBoundingClientRect();
        const isDialogContent =
          rect.top <= event.clientY &&
          event.clientY <= rect.top + rect.height &&
          rect.left <= event.clientX &&
          event.clientX <= rect.left + rect.width;
        if (isDialogContent) return;
        dialog.close();
      });
    }
  }

  /**
   * Синхронизирует :user-invalid с aria-invalid и добавляет fallback для старых браузеров.
   * @param {HTMLElement} root
   */
  function initFormValidationSync(root = document) {
    const dirtyState = new WeakMap();
    const supportsUserInvalid =
      typeof CSS !== 'undefined' && typeof CSS.supports === 'function' && CSS.supports('selector(:user-invalid)');

    const syncAria = (el) => {
      if (!el || typeof el.checkValidity !== 'function') return;
      if (supportsUserInvalid) {
        const isUserInvalid = el.matches(':user-invalid');
        el.setAttribute('aria-invalid', isUserInvalid ? 'true' : 'false');
      } else {
        const isValid = el.checkValidity();
        el.classList.toggle('user-invalid-fallback', !isValid);
        el.classList.toggle('user-valid-fallback', isValid);
        if (!isValid) {
          el.setAttribute('aria-invalid', 'true');
        } else {
          el.removeAttribute('aria-invalid');
        }
      }
    };

    root.addEventListener(
      'blur',
      (e) => {
        const input = e.target;
        if (!input || typeof input.checkValidity !== 'function') return;
        const state = dirtyState.get(input) || { hasInteracted: false, hasBlurred: false };
        state.hasBlurred = true;
        dirtyState.set(input, state);
        syncAria(input);
      },
      true
    );

    root.addEventListener('input', (e) => {
      const input = e.target;
      if (!input || typeof input.checkValidity !== 'function') return;
      const state = dirtyState.get(input) || { hasInteracted: false, hasBlurred: false };
      state.hasInteracted = true;
      dirtyState.set(input, state);
      if (input.hasAttribute('aria-invalid') || state.hasBlurred) {
        syncAria(input);
      }
    });
  }

  global.OHD = global.OHD || {};
  global.OHD.utils = {
    formatPrice,
    escapeHtml,
    isItemOrderable,
    calculateDeliveryStatus,
    getWorkingStatus,
    showToast,
    attachDialogLightDismissFallback,
    initFormValidationSync,
  };
})(window);
