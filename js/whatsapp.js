/**
 * ORIGINAL HOT DOG — Модуль формирования заказа для WhatsApp (js/whatsapp.js)
 * Проверяет актуальность товаров и пересчитывает итог по живому каталогу перед отправкой.
 */
(function (global) {
  'use strict';

  const MAX_ORDER_QTY = 50;
  const MAX_WA_MESSAGE_CHARS = 3500;

  function getConfig() {
    return global.OHD && global.OHD.CONFIG ? global.OHD.CONFIG : {};
  }

  function getUtils() {
    return global.OHD && global.OHD.utils ? global.OHD.utils : null;
  }

  function sanitizeLine(value, maxLen) {
    const utils = getUtils();
    if (utils && typeof utils.sanitizeTextInput === 'function') {
      return utils.sanitizeTextInput(value, maxLen);
    }
    return String(value == null ? '' : value)
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
      .trim()
      .slice(0, maxLen);
  }

  function formatPrice(val) {
    const config = getConfig();
    const currency = (config.delivery && config.delivery.currency) || 'сом';
    return `${val} ${currency}`;
  }

  function isOrderableLive(item) {
    const utils = getUtils();
    if (utils && typeof utils.isItemOrderable === 'function') {
      return utils.isItemOrderable(item);
    }
    return Boolean(
      item &&
        item.available !== false &&
        item.orderable !== false &&
        typeof item.price === 'number' &&
        Number.isFinite(item.price) &&
        item.price > 0
    );
  }

  /**
   * Сверка позиций корзины с живым каталогом: игнорирует цены и суммы из ненадёжных объектов.
   * @param {Array} cartItems
   * @returns {{ items: Array, totalAmount: number }}
   */
  function verifyCartSnapshot(cartItems) {
    const lookup = global.OHD && typeof global.OHD.getCatalogItemById === 'function'
      ? global.OHD.getCatalogItemById
      : null;
    if (!Array.isArray(cartItems) || !lookup) {
      return { items: [], totalAmount: 0 };
    }

    const verified = [];
    let totalAmount = 0;

    cartItems.forEach((entry) => {
      if (!entry || typeof entry.id !== 'string') return;
      const liveItem = lookup(entry.id);
      if (!isOrderableLive(liveItem)) return;

      const qty = Number(entry.quantity);
      if (!Number.isInteger(qty) || qty < 1 || qty > MAX_ORDER_QTY) return;

      const lineTotal = liveItem.price * qty;
      totalAmount += lineTotal;
      verified.push({
        id: liveItem.id,
        name: sanitizeLine(liveItem.name, 160),
        size: liveItem.size && liveItem.size !== 'Не указан' ? sanitizeLine(liveItem.size, 60) : '',
        price: liveItem.price,
        quantity: qty,
        lineTotal,
        composition: Array.isArray(liveItem.composition)
          ? liveItem.composition.map((part) => sanitizeLine(part, 160)).filter(Boolean)
          : [],
      });
    });

    return { items: verified, totalAmount };
  }

  function buildOrderMessage(orderData, cartItems) {
    const config = getConfig();
    const safeData = orderData && typeof orderData === 'object' ? orderData : {};
    const customerName = sanitizeLine(safeData.customerName, 100);
    const customerPhone = sanitizeLine(safeData.customerPhone, 24);
    const orderType = safeData.orderType === 'pickup' ? 'pickup' : 'delivery';
    const address = sanitizeLine(safeData.address, 300);
    const comment = sanitizeLine(safeData.comment, 400);

    const verified = verifyCartSnapshot(cartItems);
    const lines = [
      `Здравствуйте! Хочу оформить заказ в ${config.restaurantName || 'ORIGINAL HOT DOG'}.`,
      '',
      `Имя: ${customerName || 'Не указано'}`,
      `Телефон: ${customerPhone || 'Не указан'}`,
      `Тип заказа: ${orderType === 'pickup' ? 'самовывоз' : 'доставка'}`,
    ];

    if (orderType === 'pickup') {
      const pickupAddr = (config.location && config.location.fullAddress) || 'Кашкар-Кыштак, улица Кара-Суу';
      lines.push(`Адрес самовывоза: ${pickupAddr}`);
    } else {
      lines.push(`Адрес доставки: ${address || 'Не указан'}`);
    }

    if (comment) {
      lines.push(`Комментарий: ${comment}`);
    }

    lines.push('', 'Состав заказа:');

    verified.items.forEach((item, index) => {
      const sizeText = item.size ? ` (${item.size})` : '';
      lines.push(
        `${index + 1}. ${item.name}${sizeText} — ${item.quantity} шт. × ${formatPrice(item.price)} = ${formatPrice(item.lineTotal)}`
      );

      if (item.composition.length > 0) {
        lines.push('   Состав комбо:');
        item.composition.forEach((compLine) => {
          lines.push(`   • ${compLine}`);
        });
      }
    });

    lines.push('', `Итого по меню: ${formatPrice(verified.totalAmount)}`);

    if (orderType === 'delivery') {
      const threshold = (config.delivery && config.delivery.freeDeliveryThreshold) || 500;
      const utils = getUtils();
      const deliveryStatus =
        utils && typeof utils.calculateDeliveryStatus === 'function'
          ? utils.calculateDeliveryStatus(verified.totalAmount)
          : { isFreeEligible: verified.totalAmount > threshold };

      if (deliveryStatus.isFreeEligible) {
        lines.push(
          `Доставка: по Кашкару бесплатно (сумма заказа свыше ${formatPrice(threshold)}). За пределами указанной территории стоимость уточнит оператор.`
        );
      } else {
        lines.push(
          `Доставка: стоимость доставки уточнит оператор (бесплатно по Кашкару при заказе свыше ${formatPrice(threshold)}).`
        );
      }
    }

    return lines.join('\n').slice(0, MAX_WA_MESSAGE_CHARS);
  }

  function buildWhatsAppUrl(messageText) {
    const config = getConfig();
    const utils = getUtils();
    const digits = String(
      (config.contacts && (config.contacts.whatsappNumber || config.contacts.phoneRaw)) || ''
    ).replace(/\D/g, '');
    const numberValid =
      utils && typeof utils.isValidWhatsAppNumber === 'function'
        ? utils.isValidWhatsAppNumber(digits)
        : /^\d{9,15}$/.test(digits);

    if (!numberValid) return '';

    const cleanMessage = sanitizeLine(messageText, MAX_WA_MESSAGE_CHARS);
    const url = `https://wa.me/${digits}?text=${encodeURIComponent(cleanMessage)}`;
    if (utils && typeof utils.isSafeExternalUrl === 'function' && !utils.isSafeExternalUrl(url)) {
      return '';
    }
    return url;
  }

  function buildPriceInquiryUrl(item) {
    const name = sanitizeLine(item && item.name, 140) || 'позиции меню';
    const size = item && item.size && item.size !== 'Не указан' ? ` (${sanitizeLine(item.size, 60)})` : '';
    const msg = `Здравствуйте! Подскажите, пожалуйста, актуальную цену и наличие: ${name}${size}.`;
    return buildWhatsAppUrl(msg);
  }

  global.OHD = global.OHD || {};
  global.OHD.whatsapp = {
    verifyCartSnapshot,
    buildOrderMessage,
    buildWhatsAppUrl,
    buildPriceInquiryUrl,
  };
})(window);
