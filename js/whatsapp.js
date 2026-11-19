/**
 * ORIGINAL HOT DOG — Модуль интеграции с WhatsApp Click to Chat API
 * Формирует структурированное сообщение заказа и ссылку https://wa.me/996550042597?text=...
 */
(function (global) {
  'use strict';

  const CONFIG = global.OHD.CONFIG;
  const utils = global.OHD.utils;

  /**
   * Формирует полное текстовое сообщение заказа для WhatsApp
   * @param {object} orderData
   * @param {string} orderData.customerName
   * @param {string} orderData.customerPhone
   * @param {'delivery'|'pickup'} orderData.orderType
   * @param {string} orderData.address
   * @param {string} orderData.comment
   * @param {Array} cartItems
   * @param {number} totalAmount
   * @returns {string}
   */
  function buildOrderMessage(orderData, cartItems, totalAmount) {
    const isDelivery = orderData.orderType === 'delivery';
    const orderTypeLabel = isDelivery ? 'доставка' : 'самовывоз';
    const deliveryStatus = utils.calculateDeliveryStatus(totalAmount, orderData.orderType);

    const lines = [
      `Здравствуйте! Хочу оформить заказ в ${CONFIG.restaurantName}.`,
      '',
      `Имя: ${orderData.customerName.trim()}`,
      `Телефон: ${orderData.customerPhone.trim()}`,
      `Тип заказа: ${orderTypeLabel}.`,
    ];

    if (isDelivery) {
      lines.push(`Адрес: ${orderData.address.trim()}`);
    } else {
      lines.push(`Пункт самовывоза: ${CONFIG.location.fullAddress}`);
    }

    lines.push('');
    lines.push('Заказ:');

    cartItems.forEach((item, index) => {
      const sizeSuffix =
        item.size && item.size !== 'Не указан' ? ` (${item.size})` : '';
      const lineTotal = item.price * item.quantity;
      lines.push(
        `${index + 1}. ${item.name}${sizeSuffix} — ${item.quantity} × ${item.price} ${CONFIG.delivery.currency} (${lineTotal} ${CONFIG.delivery.currency}).`
      );

      const liveItem =
        typeof global.OHD.getCatalogItemById === 'function'
          ? global.OHD.getCatalogItemById(item.id)
          : null;
      const composition = Array.isArray(item.composition)
        ? item.composition
        : liveItem && Array.isArray(liveItem.composition)
          ? liveItem.composition
          : null;

      if (composition && composition.length > 0) {
        const compHeading =
          item.quantity > 1 ? '   Состав (на 1 набор):' : '   Состав:';
        lines.push(compHeading);
        composition.forEach((entry) => {
          lines.push(`   - ${entry}`);
        });
      }
    });

    lines.push('');
    lines.push(`Итого по меню: ${totalAmount} ${CONFIG.delivery.currency}.`);

    if (isDelivery) {
      if (deliveryStatus.isFreeEligible) {
        lines.push(
          `Доставка: по ${CONFIG.delivery.freeDeliveryLocality}у бесплатно (заказ свыше ${CONFIG.delivery.freeDeliveryThreshold} ${CONFIG.delivery.currency}).`
        );
      } else {
        lines.push(
          `Доставка: уточняется оператором (бесплатно по ${CONFIG.delivery.freeDeliveryLocality}у при заказе свыше ${CONFIG.delivery.freeDeliveryThreshold} ${CONFIG.delivery.currency}).`
        );
      }
    }

    const cleanComment = (orderData.comment || '').trim();
    if (cleanComment) {
      lines.push('');
      lines.push(`Комментарий: ${cleanComment}`);
    }

    return lines.join('\n');
  }

  /**
   * Генерирует URL для открытия чата WhatsApp с предзаполненным заказом
   * @param {string} messageText
   * @returns {string}
   */
  function buildWhatsAppUrl(messageText) {
    const encoded = encodeURIComponent(messageText);
    return `https://wa.me/${CONFIG.contacts.whatsappNumber}?text=${encoded}`;
  }

  /**
   * Генерирует ссылку для уточнения цены товара с неизвестной стоимостью (price === null)
   * @param {object} item
   * @returns {string}
   */
  function buildPriceInquiryUrl(item) {
    const sizeInfo = item.size && item.size !== 'Не указан' ? ` (${item.size})` : '';
    const msg = `Здравствуйте! Подскажите, пожалуйста, актуальную стоимость позиции «${item.name}${sizeInfo}» в ${CONFIG.restaurantName}.`;
    return buildWhatsAppUrl(msg);
  }

  global.OHD = global.OHD || {};
  global.OHD.whatsapp = {
    buildOrderMessage,
    buildWhatsAppUrl,
    buildPriceInquiryUrl,
  };
})(window);
