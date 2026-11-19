/**
 * ORIGINAL HOT DOG — Модуль оформления заказа и подтверждения перед переходом в WhatsApp
 * Содержит валидацию обязательных полей, сохранение черновика формы, предпросмотр заказа
 * и двухшаговое подтверждение («Перейти в WhatsApp» -> «Я отправил заказ, очистить корзину»).
 */
(function (global) {
  'use strict';

  const CONFIG = global.OHD.CONFIG;
  const utils = global.OHD.utils;
  const whatsapp = global.OHD.whatsapp;

  let currentOrderType = 'delivery';
  let lastWhatsAppUrl = '';

  /**
   * Загружает черновик контактных данных клиента из LocalStorage
   */
  function loadDraft() {
    try {
      const raw = global.localStorage.getItem(CONFIG.storageKeys.checkoutDraft);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (_) {
      return null;
    }
  }

  /**
   * Сохраняет черновик формы в LocalStorage
   */
  function saveDraft(data) {
    try {
      global.localStorage.setItem(CONFIG.storageKeys.checkoutDraft, JSON.stringify(data));
    } catch (_) {
      // ignore storage quota errors
    }
  }

  /**
   * Считывает текущие значения полей формы оформления заказа
   */
  function readFormValues() {
    const form = document.getElementById('checkout-form');
    if (!form) {
      return {
        customerName: '',
        customerPhone: '',
        orderType: currentOrderType,
        address: '',
        comment: '',
      };
    }

    const nameEl = form.querySelector('#checkout-name');
    const phoneEl = form.querySelector('#checkout-phone');
    const typeRadio = form.querySelector('input[name="orderType"]:checked');
    const addressEl = form.querySelector('#checkout-address');
    const commentEl = form.querySelector('#checkout-comment');

    return {
      customerName: nameEl ? nameEl.value : '',
      customerPhone: phoneEl ? phoneEl.value : '',
      orderType: typeRadio ? typeRadio.value : currentOrderType,
      address: addressEl ? addressEl.value : '',
      comment: commentEl ? commentEl.value : '',
    };
  }

  /**
   * Переключает видимость блока адреса доставки и самовывоза
   */
  function updateOrderTypeUI(orderType) {
    currentOrderType = orderType === 'pickup' ? 'pickup' : 'delivery';
    const addressGroup = document.getElementById('checkout-address-group');
    const addressInput = document.getElementById('checkout-address');
    const pickupInfo = document.getElementById('checkout-pickup-info');

    if (currentOrderType === 'delivery') {
      if (addressGroup) addressGroup.hidden = false;
      if (addressInput) addressInput.required = true;
      if (pickupInfo) pickupInfo.hidden = true;
    } else {
      if (addressGroup) addressGroup.hidden = true;
      if (addressInput) {
        addressInput.required = false;
        addressInput.setAttribute('aria-invalid', 'false');
      }
      if (pickupInfo) pickupInfo.hidden = false;
    }

    renderCheckoutSummary();
  }

  /**
   * Отрисовывает состав заказа, условия доставки и предпросмотр сообщения WhatsApp в окне оформления
   */
  function renderCheckoutSummary() {
    const items = global.OHD.cart.getItems();
    const totalPrice = global.OHD.cart.getTotalPrice();
    const formValues = readFormValues();
    const deliveryStatus = utils.calculateDeliveryStatus(totalPrice, formValues.orderType);

    const summaryList = document.getElementById('checkout-order-items');
    const summaryTotal = document.getElementById('checkout-order-total');
    const deliveryNotice = document.getElementById('checkout-delivery-conditions');
    const messagePreview = document.getElementById('checkout-whatsapp-preview');

    if (summaryList) {
      summaryList.innerHTML = items
        .map((item, idx) => {
          const sizeBadge =
            item.size && item.size !== 'Не указан' ? ` (${utils.escapeHtml(item.size)})` : '';
          const lineSum = item.price * item.quantity;
          const liveItem =
            typeof global.OHD.getCatalogItemById === 'function'
              ? global.OHD.getCatalogItemById(item.id)
              : null;
          const composition = Array.isArray(item.composition)
            ? item.composition
            : liveItem && Array.isArray(liveItem.composition)
              ? liveItem.composition
              : null;
          const compHtml =
            composition && composition.length > 0
              ? `<ul class="checkout-summary-combo">${composition.map((c) => `<li>${utils.escapeHtml(c)}</li>`).join('')}</ul>`
              : '';
          return `
            <li class="checkout-summary-item">
              <div class="checkout-summary-main">
                <span class="checkout-summary-name">${idx + 1}. ${utils.escapeHtml(item.name)}${sizeBadge} × ${item.quantity}</span>
                ${compHtml}
              </div>
              <strong class="checkout-summary-price">${utils.formatPrice(lineSum)}</strong>
            </li>
          `;
        })
        .join('');
    }

    if (summaryTotal) {
      summaryTotal.textContent = utils.formatPrice(totalPrice);
    }

    if (deliveryNotice) {
      deliveryNotice.innerHTML = `
        <div class="checkout-condition-box ${deliveryStatus.isFreeEligible ? 'is-free' : ''}">
          <div class="checkout-condition-header">
            <span class="checkout-condition-tag">${utils.escapeHtml(deliveryStatus.statusBadge)}</span>
            <strong>${utils.escapeHtml(deliveryStatus.headline)}</strong>
          </div>
          <p>${utils.escapeHtml(deliveryStatus.subtext)}</p>
        </div>
      `;
    }

    if (messagePreview && items.length > 0) {
      const previewData = {
        customerName: formValues.customerName || 'Ваше имя',
        customerPhone: formValues.customerPhone || '+996 ...',
        orderType: formValues.orderType,
        address: formValues.address || 'Укажите улицу, дом и ориентир',
        comment: formValues.comment,
      };
      messagePreview.textContent = whatsapp.buildOrderMessage(previewData, items, totalPrice);
    }
  }

  /**
   * Синхронизирует нативное состояние ValidityState (setCustomValidity) для корректной работы :user-invalid/:user-valid
   */
  function syncNativeValidity() {
    const nameEl = document.getElementById('checkout-name');
    const phoneEl = document.getElementById('checkout-phone');
    const addressEl = document.getElementById('checkout-address');

    if (nameEl) {
      const cleanName = nameEl.value.trim();
      nameEl.setCustomValidity(
        cleanName.length < 2 ? 'Пожалуйста, укажите ваше имя (минимум 2 символа).' : ''
      );
    }

    if (phoneEl) {
      const phoneDigits = phoneEl.value.replace(/\D/g, '');
      phoneEl.setCustomValidity(
        phoneDigits.length < 9
          ? 'Введите корректный номер телефона (минимум 9 цифр).'
          : ''
      );
    }

    if (addressEl) {
      if (currentOrderType === 'delivery') {
        const cleanAddress = addressEl.value.trim();
        addressEl.setCustomValidity(
          cleanAddress.length < 5
            ? 'Укажите адрес доставки (село/район, улица, номер дома или ориентир).'
            : ''
        );
      } else {
        addressEl.setCustomValidity('');
      }
    }
  }

  /**
   * Валидация полей формы заказа
   * @returns {{ valid: boolean, errors: Array<{fieldId: string, errorId: string, message: string}> }}
   */
  function validateCheckoutForm() {
    syncNativeValidity();
    const values = readFormValues();
    const errors = [];

    const cleanName = values.customerName.trim();
    if (cleanName.length < 2) {
      errors.push({
        fieldId: 'checkout-name',
        errorId: 'checkout-name-error',
        message: 'Пожалуйста, укажите ваше имя (минимум 2 символа).',
      });
    }

    // Проверка телефона (минимум 9 цифр для номеров КР: 0550..., +996...)
    const phoneDigits = values.customerPhone.replace(/\D/g, '');
    if (phoneDigits.length < 9) {
      errors.push({
        fieldId: 'checkout-phone',
        errorId: 'checkout-phone-error',
        message: 'Введите корректный номер телефона (например, +996 550 04-25-97 или 0550 042 597).',
      });
    }

    if (values.orderType === 'delivery') {
      const cleanAddress = values.address.trim();
      if (cleanAddress.length < 5) {
        errors.push({
          fieldId: 'checkout-address',
          errorId: 'checkout-address-error',
          message: 'Укажите адрес доставки (село/район, улица, номер дома или ориентир).',
        });
      }
    }

    // Очистка старых ошибок
    ['checkout-name', 'checkout-phone', 'checkout-address'].forEach((id) => {
      const input = document.getElementById(id);
      const errBox = document.getElementById(`${id}-error`);
      if (input) {
        input.classList.remove('is-field-error');
        input.setAttribute('aria-invalid', 'false');
      }
      if (errBox) {
        errBox.textContent = '';
        errBox.hidden = true;
      }
    });

    // Отображение найденных ошибок
    errors.forEach((err, index) => {
      const input = document.getElementById(err.fieldId);
      const errBox = document.getElementById(err.errorId);
      if (input) {
        input.classList.add('is-field-error');
        input.setAttribute('aria-invalid', 'true');
        if (index === 0) {
          input.scrollIntoView({ behavior: 'smooth', block: 'center' });
          input.focus({ preventScroll: true });
        }
      }
      if (errBox) {
        errBox.textContent = err.message;
        errBox.hidden = false;
      }
    });

    return {
      valid: errors.length === 0,
      errors,
      values,
    };
  }

  /**
   * Открывает модальное окно оформления заказа
   */
  function openCheckoutModal() {
    const items = global.OHD.cart.getItems();
    if (items.length === 0) {
      utils.showToast('Добавьте блюда в корзину перед оформлением заказа', 'warning');
      return;
    }

    const dialog = document.getElementById('checkout-dialog');
    if (!dialog) return;

    // Скрываем панель послеотправочного статуса при новом открытии, показываем форму
    const sentPanel = document.getElementById('checkout-sent-panel');
    const formStep = document.getElementById('checkout-form-step');
    if (sentPanel) sentPanel.hidden = true;
    if (formStep) formStep.hidden = false;

    const draft = loadDraft();
    if (draft) {
      const nameEl = document.getElementById('checkout-name');
      const phoneEl = document.getElementById('checkout-phone');
      const addressEl = document.getElementById('checkout-address');
      const commentEl = document.getElementById('checkout-comment');
      if (nameEl && draft.customerName) nameEl.value = draft.customerName;
      if (phoneEl && draft.customerPhone) phoneEl.value = draft.customerPhone;
      if (addressEl && draft.address) addressEl.value = draft.address;
      if (commentEl && draft.comment) commentEl.value = draft.comment;
      if (draft.orderType === 'pickup' || draft.orderType === 'delivery') {
        currentOrderType = draft.orderType;
        const radio = document.querySelector(`input[name="orderType"][value="${draft.orderType}"]`);
        if (radio) radio.checked = true;
      }
    }

    updateOrderTypeUI(currentOrderType);
    syncNativeValidity();
    renderCheckoutSummary();

    if (!dialog.open) {
      dialog.showModal();
    }
  }

  /**
   * Закрывает модальное окно оформления заказа
   */
  function closeCheckoutModal() {
    const dialog = document.getElementById('checkout-dialog');
    if (dialog && dialog.open) {
      dialog.close();
    }
  }

  /**
   * Обработка отправки формы: формирует ссылку WhatsApp, открывает чат и показывает экран подтверждения.
   * Корзина НЕ очищается автоматически!
   */
  function handleCheckoutSubmit(event) {
    event.preventDefault();

    const items = global.OHD.cart.getItems();
    if (items.length === 0) {
      utils.showToast('Ваша корзина пуста', 'warning');
      return;
    }

    const validation = validateCheckoutForm();
    if (!validation.valid) {
      utils.showToast('Пожалуйста, проверьте заполнение обязательных полей', 'warning');
      return;
    }

    const totalPrice = global.OHD.cart.getTotalPrice();
    const orderMessage = whatsapp.buildOrderMessage(validation.values, items, totalPrice);
    const waUrl = whatsapp.buildWhatsAppUrl(orderMessage);
    lastWhatsAppUrl = waUrl;

    saveDraft(validation.values);

    // Открываем WhatsApp в новой вкладке/приложении
    const popup = global.open(waUrl, '_blank', 'noopener,noreferrer');
    if (!popup) {
      // Если блокировщик всплывающих окон заблокировал window.open, оставляем прямую ссылку на кнопке
      utils.showToast('Нажмите «Открыть WhatsApp», чтобы перейти в чат с заказом', 'info');
    }

    // Показываем панель подтверждения отправки без очистки корзины
    const formStep = document.getElementById('checkout-form-step');
    const sentPanel = document.getElementById('checkout-sent-panel');
    const directWaLink = document.getElementById('checkout-direct-wa-link');
    const finalMessageBox = document.getElementById('checkout-final-message-text');

    if (directWaLink) {
      directWaLink.setAttribute('href', waUrl);
    }
    if (finalMessageBox) {
      finalMessageBox.textContent = orderMessage;
    }
    if (formStep) formStep.hidden = true;
    if (sentPanel) sentPanel.hidden = false;
  }

  /**
   * Инициализация модуля оформления заказа
   */
  function initCheckout() {
    if (typeof document === 'undefined') return;

    const checkoutDialog = document.getElementById('checkout-dialog');
    if (checkoutDialog) {
      utils.attachDialogLightDismissFallback(checkoutDialog);
    }

    const form = document.getElementById('checkout-form');
    if (form) {
      form.addEventListener('submit', handleCheckoutSubmit);

      form.addEventListener('input', (e) => {
        syncNativeValidity();
        const input = e.target;
        if (input && input.id) {
          input.classList.remove('is-field-error');
          const errBox = document.getElementById(`${input.id}-error`);
          if (errBox) {
            errBox.textContent = '';
            errBox.hidden = true;
          }
        }
        const vals = readFormValues();
        saveDraft(vals);
        renderCheckoutSummary();
      });

      form.addEventListener('change', (e) => {
        if (e.target && e.target.name === 'orderType') {
          updateOrderTypeUI(e.target.value);
          syncNativeValidity();
          saveDraft(readFormValues());
        }
      });

      syncNativeValidity();
    }

    document.addEventListener('click', (e) => {
      // Закрытие модального окна оформления заказа
      const closeBtn = e.target.closest('[data-close-checkout]');
      if (closeBtn) {
        e.preventDefault();
        closeCheckoutModal();
        return;
      }

      // Возврат к редактированию данных заказа
      const backToEditBtn = e.target.closest('[data-back-to-checkout-form]');
      if (backToEditBtn) {
        e.preventDefault();
        const formStep = document.getElementById('checkout-form-step');
        const sentPanel = document.getElementById('checkout-sent-panel');
        if (sentPanel) sentPanel.hidden = true;
        if (formStep) formStep.hidden = false;
        return;
      }

      // Действие «Я отправил заказ — очистить корзину»
      const confirmSentBtn = e.target.closest('[data-confirm-order-sent]');
      if (confirmSentBtn) {
        e.preventDefault();
        global.OHD.cart.clearCart(true);
        closeCheckoutModal();
        utils.showToast('Спасибо за заказ! Корзина очищена.', 'success');
      }
    });

    // Подписка на изменение корзины для обновления сводки
    if (global.OHD.cart && typeof global.OHD.cart.subscribe === 'function') {
      global.OHD.cart.subscribe(() => {
        const dialog = document.getElementById('checkout-dialog');
        if (dialog && dialog.open) {
          renderCheckoutSummary();
        }
      });
    }
  }

  global.OHD = global.OHD || {};
  global.OHD.checkout = {
    initCheckout,
    openCheckoutModal,
    closeCheckoutModal,
    renderCheckoutSummary,
    validateCheckoutForm,
    getLastWhatsAppUrl: () => lastWhatsAppUrl,
  };
})(window);
