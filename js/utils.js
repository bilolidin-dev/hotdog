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
  function createToastIconSvg(type) {
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('width', '18');
    svg.setAttribute('height', '18');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', type === 'warning' ? '2.3' : '2.5');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.setAttribute('aria-hidden', 'true');

    if (type === 'warning') {
      const circle = document.createElementNS(ns, 'circle');
      circle.setAttribute('cx', '12');
      circle.setAttribute('cy', '12');
      circle.setAttribute('r', '10');
      const line1 = document.createElementNS(ns, 'line');
      line1.setAttribute('x1', '12');
      line1.setAttribute('y1', '8');
      line1.setAttribute('x2', '12');
      line1.setAttribute('y2', '12');
      const line2 = document.createElementNS(ns, 'line');
      line2.setAttribute('x1', '12');
      line2.setAttribute('y1', '16');
      line2.setAttribute('x2', '12.01');
      line2.setAttribute('y2', '16');
      svg.appendChild(circle);
      svg.appendChild(line1);
      svg.appendChild(line2);
    } else {
      const path = document.createElementNS(ns, 'path');
      path.setAttribute('d', 'M20 6 9 17l-5-5');
      svg.appendChild(path);
    }
    return svg;
  }

  function showToast(message, type = 'success') {
    if (typeof document === 'undefined' || !document.body) return;
    let container = document.getElementById('ohd-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'ohd-toast-container';
      container.className = 'toast-container';
      container.setAttribute('aria-live', 'polite');
      container.setAttribute('aria-atomic', 'true');
      document.body.appendChild(container);
    }

    const safeType = type === 'warning' || type === 'info' ? type : 'success';
    const toast = document.createElement('div');
    toast.className = `toast-item toast-${safeType}`;

    const iconWrap = document.createElement('span');
    iconWrap.className = 'toast-icon';
    iconWrap.appendChild(createToastIconSvg(safeType));

    const textWrap = document.createElement('span');
    textWrap.className = 'toast-text';
    textWrap.textContent = stripControlChars(message);

    toast.appendChild(iconWrap);
    toast.appendChild(textWrap);
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

  function stripControlChars(value) {
    return String(value == null ? '' : value).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
  }

  function sanitizeTextInput(value, maxLength = 400) {
    const cleaned = stripControlChars(value).trim();
    const limit = typeof maxLength === 'number' && maxLength > 0 ? maxLength : 400;
    return cleaned.slice(0, limit);
  }

  function isStorageAvailable() {
    try {
      if (typeof global.localStorage === 'undefined' || global.localStorage === null) return false;
      const probeKey = '__ohd_storage_probe__';
      global.localStorage.setItem(probeKey, '1');
      global.localStorage.removeItem(probeKey);
      return true;
    } catch (_) {
      return false;
    }
  }

  function safeStorageGetJson(key) {
    try {
      if (typeof global.localStorage === 'undefined' || global.localStorage === null) {
        return { ok: false, data: null, errorCode: 'unavailable' };
      }
      const raw = global.localStorage.getItem(key);
      if (raw === null || raw === '') {
        return { ok: true, data: null, errorCode: 'empty' };
      }
      if (raw.length > 65536) {
        return { ok: false, data: null, errorCode: 'corrupted' };
      }
      const parsed = JSON.parse(raw);
      return { ok: true, data: parsed, errorCode: 'ok' };
    } catch (err) {
      const name = err && err.name ? String(err.name) : '';
      const errorCode =
        name === 'SyntaxError'
          ? 'corrupted'
          : name === 'SecurityError' || err instanceof TypeError
          ? 'unavailable'
          : 'read_error';
      return { ok: false, data: null, errorCode };
    }
  }

  function safeStorageSetJson(key, value) {
    try {
      if (typeof global.localStorage === 'undefined' || global.localStorage === null) {
        return { ok: false, errorCode: 'unavailable' };
      }
      const serialized = JSON.stringify(value);
      global.localStorage.setItem(key, serialized);
      return { ok: true, errorCode: 'ok' };
    } catch (err) {
      const name = err && err.name ? String(err.name) : '';
      const msg = err && err.message ? String(err.message) : '';
      const errorCode =
        name === 'QuotaExceededError' ||
        name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
        /quota/i.test(msg)
          ? 'quota_exceeded'
          : 'unavailable';
      return { ok: false, errorCode };
    }
  }

  function safeStorageRemove(key) {
    try {
      if (typeof global.localStorage === 'undefined' || global.localStorage === null) return false;
      global.localStorage.removeItem(key);
      return true;
    } catch (_) {
      return false;
    }
  }

  function isValidWhatsAppNumber(phone) {
    const digits = String(phone == null ? '' : phone).replace(/\D/g, '');
    return /^996\d{9}$/.test(digits) || /^\d{9,15}$/.test(digits);
  }

  function isSafeExternalUrl(rawUrl) {
    const val = String(rawUrl || '').trim();
    if (!val || /^[\s\u0000-\u0020]*(?:javascript|data|vbscript|file):/i.test(val)) {
      return false;
    }
    if (typeof URL === 'undefined') {
      return /^(?:https?:\/\/|tel:)/i.test(val);
    }
    try {
      const baseHref =
        global.location && global.location.href
          ? global.location.href
          : 'https://original-hotdog-osh.vercel.app/';
      const parsed = new URL(val, baseHref);
      return parsed.protocol === 'https:' || parsed.protocol === 'http:' || parsed.protocol === 'tel:';
    } catch (_) {
      return false;
    }
  }

  function isSafeLocalAssetPath(assetPath) {
    const s = String(assetPath == null ? '' : assetPath).trim();
    if (!s || s.includes('..') || /^(?:javascript|data|vbscript|file):/i.test(s)) return false;
    return /^assets\/images\/[a-z0-9/_-]+\.(?:webp|png|jpe?g|svg)$/i.test(s);
  }

  global.OHD = global.OHD || {};
  global.OHD.utils = {
    formatPrice,
    escapeHtml,
    stripControlChars,
    sanitizeTextInput,
    isStorageAvailable,
    safeStorageGetJson,
    safeStorageSetJson,
    safeStorageRemove,
    isValidWhatsAppNumber,
    isSafeExternalUrl,
    isSafeLocalAssetPath,
    isItemOrderable,
    calculateDeliveryStatus,
    getWorkingStatus,
    showToast,
    attachDialogLightDismissFallback,
    initFormValidationSync,
  };
})(window);
