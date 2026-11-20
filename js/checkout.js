/**
 * ORIGINAL HOT DOG — Модуль оформления заказа и WhatsApp-интеграции (js/checkout.js)
 * Реализует строгую JS-валидацию, безопасный DOM-рендер, защиту от двойной отправки
 * и корректную обработку оффлайн/ошибочных состояний.
 */
(function (global) {
  'use strict';

  const DRAFT_SCHEMA_VERSION = 1;
  const MAX_NAME_LENGTH = 100;
  const MIN_NAME_LENGTH = 2;
  const MAX_PHONE_LENGTH = 24;
  const MIN_PHONE_DIGITS = 9;
  const MAX_PHONE_DIGITS = 15;
  const MAX_ADDRESS_LENGTH = 300;
  const MIN_ADDRESS_LENGTH = 5;
  const MAX_COMMENT_LENGTH = 400;

  const config = global.OHD.CONFIG;
  const utils = global.OHD.utils;
  const whatsapp = global.OHD.whatsapp;

  let lastWhatsAppUrl = '';
  let isSubmittingOrder = false;

  function sanitizeDraftObject(parsed) {
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return null;
    }
    if ('version' in parsed && parsed.version !== DRAFT_SCHEMA_VERSION) {
      return null;
    }
    return {
      version: DRAFT_SCHEMA_VERSION,
      customerName: utils.sanitizeTextInput(parsed.customerName, MAX_NAME_LENGTH),
      customerPhone: utils.sanitizeTextInput(parsed.customerPhone, MAX_PHONE_LENGTH),
      orderType: parsed.orderType === 'pickup' ? 'pickup' : 'delivery',
      address: utils.sanitizeTextInput(parsed.address, MAX_ADDRESS_LENGTH),
      comment: utils.sanitizeTextInput(parsed.comment, MAX_COMMENT_LENGTH),
    };
  }

  function loadDraft() {
    const res = utils.safeStorageGetJson(config.storageKeys.checkoutDraft);
    if (!res.ok) {
      if (res.errorCode === 'corrupted') {
        utils.safeStorageRemove(config.storageKeys.checkoutDraft);
      }
      return {};
    }
    if (!res.data) return {};
    const sanitized = sanitizeDraftObject(res.data);
    if (!sanitized) {
      utils.safeStorageRemove(config.storageKeys.checkoutDraft);
      return {};
    }
    return sanitized;
  }

  function saveDraft(draft) {
    const payload = sanitizeDraftObject({ ...draft, version: DRAFT_SCHEMA_VERSION });
    if (!payload) return;
    utils.safeStorageSetJson(config.storageKeys.checkoutDraft, payload);
  }

  function getSelectedOrderType() {
    const checked = document.querySelector('#checkout-form input[name="orderType"]:checked');
    return checked && checked.value === 'pickup' ? 'pickup' : 'delivery';
  }

  function readFormValues() {
    const form = document.getElementById('checkout-form');
    if (!form) {
      return {
        customerName: '',
        customerPhone: '',
        orderType: 'delivery',
        address: '',
        comment: '',
      };
    }

    const nameEl = form.querySelector('#checkout-name');
    const phoneEl = form.querySelector('#checkout-phone');
    const addressEl = form.querySelector('#checkout-address');
    const commentEl = form.querySelector('#checkout-comment');

    return {
      customerName: utils.sanitizeTextInput(nameEl ? nameEl.value : '', MAX_NAME_LENGTH + 50),
      customerPhone: utils.sanitizeTextInput(phoneEl ? phoneEl.value : '', MAX_PHONE_LENGTH + 20),
      orderType: getSelectedOrderType(),
      address: utils.sanitizeTextInput(addressEl ? addressEl.value : '', MAX_ADDRESS_LENGTH + 50),
      comment: utils.sanitizeTextInput(commentEl ? commentEl.value : '', MAX_COMMENT_LENGTH + 50),
    };
  }

  function persistCurrentFormDraft() {
    saveDraft(readFormValues());
  }

  function syncOrderTypeFields() {
    const orderType = getSelectedOrderType();
    const addressGroup = document.getElementById('checkout-address-group');
    const addressInput = document.getElementById('checkout-address');
    const pickupInfo = document.getElementById('checkout-pickup-info');

    if (orderType === 'delivery') {
      if (addressGroup) addressGroup.hidden = false;
      if (addressInput) addressInput.required = true;
      if (pickupInfo) pickupInfo.hidden = true;
    } else {
      if (addressGroup) addressGroup.hidden = true;
      if (addressInput) {
        addressInput.required = false;
        addressInput.setAttribute('aria-invalid', 'false');
        addressInput.classList.remove('is-field-error');
        const addrErr = document.getElementById('checkout-address-error');
        if (addrErr) {
          addrErr.textContent = '';
          addrErr.hidden = true;
        }
      }
      if (pickupInfo) pickupInfo.hidden = false;
    }

    renderCheckoutSummary();
  }

  function showFormAlert(message) {
    const box = document.getElementById('checkout-form-error');
    if (!box) return;
    if (!message) {
      box.textContent = '';
      box.hidden = true;
      return;
    }
    box.textContent = utils.stripControlChars(message);
    box.hidden = false;
  }

  function createSummaryItemNode(item, idx) {
    const lineSum = item.price * item.quantity;
    const li = document.createElement('li');
    li.className = 'checkout-summary-item';

    const mainDiv = document.createElement('div');
    mainDiv.className = 'checkout-summary-main';

    const nameSpan = document.createElement('span');
    nameSpan.className = 'checkout-summary-name';
    const sizeBadge = item.size && item.size !== 'Не указан' ? ` (${item.size})` : '';
    nameSpan.textContent = `${idx + 1}. ${item.name}${sizeBadge} × ${item.quantity}`;
    mainDiv.appendChild(nameSpan);

    const composition = Array.isArray(item.composition) ? item.composition : [];
    if (composition.length > 0) {
      const compUl = document.createElement('ul');
      compUl.className = 'checkout-summary-combo';
      composition.forEach((compLine) => {
        const compLi = document.createElement('li');
        compLi.textContent = String(compLine);
        compUl.appendChild(compLi);
      });
      mainDiv.appendChild(compUl);
    }

    const priceStrong = document.createElement('strong');
    priceStrong.className = 'checkout-summary-price';
    priceStrong.textContent = utils.formatPrice(lineSum);

    li.appendChild(mainDiv);
    li.appendChild(priceStrong);
    return li;
  }

  function createDeliveryNoticeNode(deliveryStatus) {
    const box = document.createElement('div');
    box.className = `checkout-condition-box${deliveryStatus.isFreeEligible ? ' is-free' : ''}`;

    const header = document.createElement('div');
    header.className = 'checkout-condition-header';

    const tag = document.createElement('span');
    tag.className = 'checkout-condition-tag';
    tag.textContent = deliveryStatus.statusBadge;

    const headlineStrong = document.createElement('strong');
    headlineStrong.textContent = deliveryStatus.headline;

    header.appendChild(tag);
    header.appendChild(headlineStrong);

    const subP = document.createElement('p');
    subP.textContent = deliveryStatus.subtext;

    box.appendChild(header);
    box.appendChild(subP);
    return box;
  }

  function renderCheckoutSummary() {
    if (!global.OHD.cart) return;

    const rawItems = global.OHD.cart.getItems();
    const verified = whatsapp.verifyCartSnapshot
      ? whatsapp.verifyCartSnapshot(rawItems)
      : { items: rawItems, totalAmount: global.OHD.cart.getTotalPrice() };
    const items = verified.items;
    const totalPrice = verified.totalAmount;
    const orderType = getSelectedOrderType();

    const summaryList = document.getElementById('checkout-order-items');
    const summaryTotal = document.getElementById('checkout-order-total');
    const deliveryNotice = document.getElementById('checkout-delivery-conditions');
    const messagePreview = document.getElementById('checkout-whatsapp-preview');

    if (summaryList) {
      const fragment = document.createDocumentFragment();
      items.forEach((item, idx) => {
        fragment.appendChild(createSummaryItemNode(item, idx));
      });
      summaryList.replaceChildren(fragment);
    }

    if (summaryTotal) {
      summaryTotal.textContent = utils.formatPrice(totalPrice);
    }

    if (deliveryNotice) {
      if (orderType === 'pickup') {
        deliveryNotice.replaceChildren();
      } else {
        const deliveryStatus = utils.calculateDeliveryStatus(totalPrice);
        deliveryNotice.replaceChildren(createDeliveryNoticeNode(deliveryStatus));
      }
    }

    if (messagePreview) {
      const values = readFormValues();
      const previewData = {
        customerName: values.customerName || 'Не указано',
        customerPhone: values.customerPhone || 'Не указан',
        orderType,
        address: values.address || 'Не указан',
        comment: values.comment,
      };
      messagePreview.textContent = whatsapp.buildOrderMessage(previewData, items, totalPrice);
    }
  }

  function validateCheckoutForm() {
    const values = readFormValues();
    const errors = [];

    const nameRaw = document.getElementById('checkout-name');
    const phoneRaw = document.getElementById('checkout-phone');
    const addressRaw = document.getElementById('checkout-address');
    const commentRaw = document.getElementById('checkout-comment');

    const rawNameVal = utils.stripControlChars(nameRaw ? nameRaw.value : values.customerName).trim();
    const rawPhoneVal = utils.stripControlChars(phoneRaw ? phoneRaw.value : values.customerPhone).trim();
    const rawAddrVal = utils.stripControlChars(addressRaw ? addressRaw.value : values.address).trim();
    const rawCommentVal = utils.stripControlChars(commentRaw ? commentRaw.value : values.comment).trim();

    if (!rawNameVal) {
      errors.push({
        fieldId: 'checkout-name',
        errorId: 'checkout-name-error',
        message: 'Пожалуйста, введите ваше имя',
      });
    } else if (/[<>]/.test(rawNameVal)) {
      errors.push({
        fieldId: 'checkout-name',
        errorId: 'checkout-name-error',
        message: 'Имя содержит недопустимые символы',
      });
    } else if (
      rawNameVal.length < MIN_NAME_LENGTH ||
      rawNameVal.length > MAX_NAME_LENGTH ||
      !/\p{L}/u.test(rawNameVal)
    ) {
      errors.push({
        fieldId: 'checkout-name',
        errorId: 'checkout-name-error',
        message: 'Введите корректное имя (от 2 до 100 символов, с буквами)',
      });
    }

    const phoneDigits = rawPhoneVal.replace(/\D/g, '');
    const phoneCharsValid = /^[\d\s+\-()]{9,24}$/.test(rawPhoneVal);
    if (!rawPhoneVal) {
      errors.push({
        fieldId: 'checkout-phone',
        errorId: 'checkout-phone-error',
        message: 'Укажите номер телефона для связи',
      });
    } else if (
      !phoneCharsValid ||
      rawPhoneVal.length > MAX_PHONE_LENGTH ||
      phoneDigits.length < MIN_PHONE_DIGITS ||
      phoneDigits.length > MAX_PHONE_DIGITS
    ) {
      errors.push({
        fieldId: 'checkout-phone',
        errorId: 'checkout-phone-error',
        message: 'Введите корректный номер телефона (от 9 до 15 цифр, например +996 550 04-25-97)',
      });
    }

    if (values.orderType === 'delivery') {
      if (!rawAddrVal) {
        errors.push({
          fieldId: 'checkout-address',
          errorId: 'checkout-address-error',
          message: 'Для доставки укажите адрес или ориентир',
        });
      } else if (rawAddrVal.length < MIN_ADDRESS_LENGTH || rawAddrVal.length > MAX_ADDRESS_LENGTH) {
        errors.push({
          fieldId: 'checkout-address',
          errorId: 'checkout-address-error',
          message: `Укажите подробный адрес (${MIN_ADDRESS_LENGTH}–${MAX_ADDRESS_LENGTH} символов)`,
        });
      }
    }

    if (rawCommentVal.length > MAX_COMMENT_LENGTH) {
      errors.push({
        fieldId: 'checkout-comment',
        errorId: 'checkout-comment-error',
        message: `Комментарий не должен превышать ${MAX_COMMENT_LENGTH} символов`,
      });
    }

    ['checkout-name', 'checkout-phone', 'checkout-address', 'checkout-comment'].forEach((id) => {
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

    errors.forEach((err) => {
      const input = document.getElementById(err.fieldId);
      const errBox = document.getElementById(err.errorId);
      if (input) {
        input.classList.add('is-field-error');
        input.setAttribute('aria-invalid', 'true');
      }
      if (errBox) {
        errBox.textContent = err.message;
        errBox.hidden = false;
      }
    });

    if (errors.length > 0) {
      const firstInput = document.getElementById(errors[0].fieldId);
      if (firstInput) firstInput.focus();
    }

    return {
      valid: errors.length === 0,
      errors,
      values: {
        customerName: rawNameVal.slice(0, MAX_NAME_LENGTH),
        customerPhone: rawPhoneVal.slice(0, MAX_PHONE_LENGTH),
        orderType: values.orderType,
        address: values.orderType === 'delivery' ? rawAddrVal.slice(0, MAX_ADDRESS_LENGTH) : '',
        comment: rawCommentVal.slice(0, MAX_COMMENT_LENGTH),
      },
    };
  }

  function setSubmitButtonBusy(busy) {
    const submitBtn = document.querySelector('#checkout-form [type="submit"]');
    if (!submitBtn) return;
    submitBtn.disabled = Boolean(busy);
    submitBtn.setAttribute('aria-busy', busy ? 'true' : 'false');
    const labelSpan = submitBtn.querySelector('span');
    if (labelSpan) {
      labelSpan.textContent = busy ? 'Открываем WhatsApp...' : 'Отправить заказ в WhatsApp';
    }
  }

  function resetSubmissionLock() {
    isSubmittingOrder = false;
    setSubmitButtonBusy(false);
  }

  function openCheckoutModal() {
    if (!global.OHD.cart || global.OHD.cart.getTotalCount() === 0) {
      utils.showToast('Добавьте блюда в корзину перед оформлением заказа', 'warning');
      return;
    }

    global.OHD.cart.syncWithCatalog({ notifyOnChange: true });
    if (global.OHD.cart.getTotalCount() === 0) {
      utils.showToast('В корзине не осталось доступных блюд для заказа', 'warning');
      return;
    }

    const dialog = document.getElementById('checkout-dialog');
    if (!dialog) return;

    resetSubmissionLock();
    showFormAlert('');

    const sentPanel = document.getElementById('checkout-sent-panel');
    const formStep = document.getElementById('checkout-form-step');
    if (sentPanel) sentPanel.hidden = true;
    if (formStep) formStep.hidden = false;

    const draft = loadDraft();
    const nameEl = document.getElementById('checkout-name');
    const phoneEl = document.getElementById('checkout-phone');
    const addressEl = document.getElementById('checkout-address');
    const commentEl = document.getElementById('checkout-comment');

    if (nameEl && !nameEl.value && draft.customerName) nameEl.value = draft.customerName;
    if (phoneEl && !phoneEl.value && draft.customerPhone) phoneEl.value = draft.customerPhone;
    if (addressEl && !addressEl.value && draft.address) addressEl.value = draft.address;
    if (commentEl && !commentEl.value && draft.comment) commentEl.value = draft.comment;
    if (draft.orderType) {
      const radio = document.querySelector(`#checkout-form input[name="orderType"][value="${draft.orderType}"]`);
      if (radio) radio.checked = true;
    }

    syncOrderTypeFields();

    if (!dialog.open) {
      dialog.showModal();
    }
  }

  function closeCheckoutModal() {
    const dialog = document.getElementById('checkout-dialog');
    if (dialog && dialog.open) {
      dialog.close();
    }
    resetSubmissionLock();
  }

  function handleCheckoutSubmit(e) {
    e.preventDefault();
    if (isSubmittingOrder) {
      return;
    }

    showFormAlert('');

    if (!global.OHD.cart) {
      showFormAlert('Ошибка инициализации корзины. Обновите страницу.');
      return;
    }

    global.OHD.cart.syncWithCatalog({ notifyOnChange: true });
    const rawItems = global.OHD.cart.getItems();
    const verified = whatsapp.verifyCartSnapshot
      ? whatsapp.verifyCartSnapshot(rawItems)
      : { items: rawItems, totalAmount: global.OHD.cart.getTotalPrice() };

    if (!verified.items.length || verified.totalAmount <= 0) {
      showFormAlert('Ваша корзина пуста или цены изменились. Выберите блюда заново.');
      utils.showToast('Ваша корзина пуста', 'warning');
      return;
    }

    const validation = validateCheckoutForm();
    if (!validation.valid) {
      utils.showToast('Пожалуйста, проверьте заполнение обязательных полей', 'warning');
      return;
    }

    isSubmittingOrder = true;
    setSubmitButtonBusy(true);

    try {
      saveDraft(validation.values);

      const orderMessage = whatsapp.buildOrderMessage(
        validation.values,
        verified.items,
        verified.totalAmount
      );
      const waUrl = whatsapp.buildWhatsAppUrl(orderMessage);

      if (!waUrl || !utils.isSafeExternalUrl(waUrl)) {
        showFormAlert('Не удалось сформировать безопасную ссылку WhatsApp. Свяжитесь по номеру +996 550 04-25-97.');
        resetSubmissionLock();
        return;
      }

      lastWhatsAppUrl = waUrl;

      const isOffline =
        typeof global.navigator !== 'undefined' && global.navigator.onLine === false;
      if (isOffline) {
        showFormAlert('Нет подключения к интернету. Если WhatsApp не откроется, проверьте сеть и нажмите кнопку ниже — заказ сохранён.');
      }

      let popupOpened = false;
      try {
        const openedWin = global.open(waUrl, '_blank', 'noopener,noreferrer');
        popupOpened = Boolean(openedWin);
      } catch (_) {
        popupOpened = false;
      }

      const formStep = document.getElementById('checkout-form-step');
      const sentPanel = document.getElementById('checkout-sent-panel');
      const directWaLink = document.getElementById('checkout-direct-wa-link');
      const finalMessageBox = document.getElementById('checkout-final-message-text');

      if (directWaLink) {
        directWaLink.setAttribute('href', waUrl);
        directWaLink.setAttribute('rel', 'noopener noreferrer');
      }
      if (finalMessageBox) {
        finalMessageBox.textContent = orderMessage;
      }
      if (formStep) formStep.hidden = true;
      if (sentPanel) sentPanel.hidden = false;

      if (config.storageKeys && config.storageKeys.lastSentOrder) {
        utils.safeStorageSetJson(config.storageKeys.lastSentOrder, {
          version: DRAFT_SCHEMA_VERSION,
          createdAt: new Date().toISOString(),
          totalAmount: verified.totalAmount,
          itemCount: verified.items.reduce((sum, i) => sum + i.quantity, 0),
          orderType: validation.values.orderType,
        });
      }

      if (isOffline) {
        utils.showToast('Нет сети — заказ сохранён, откройте WhatsApp после подключения.', 'warning');
      } else if (!popupOpened) {
        utils.showToast('Окно заблокировано браузером — нажмите «Открыть WhatsApp ещё раз» ниже.', 'info');
      } else {
        utils.showToast('Текст заказа подготовлен для WhatsApp — нажмите «Отправить» в чате.', 'info');
      }
    } catch (_) {
      showFormAlert('Произошла ошибка при подготовке заказа. Попробуйте снова или позвоните +996 550 04-25-97.');
      resetSubmissionLock();
    }
  }

  function bindCheckoutEvents() {
    const checkoutDialog = document.getElementById('checkout-dialog');
    if (checkoutDialog) {
      utils.attachDialogLightDismissFallback(checkoutDialog);
      checkoutDialog.addEventListener('close', resetSubmissionLock);
    }

    const form = document.getElementById('checkout-form');
    if (form) {
      form.addEventListener('submit', handleCheckoutSubmit);

      form.addEventListener('input', (e) => {
        const input = e.target;
        if (input && input.id) {
          input.classList.remove('is-field-error');
          input.setAttribute('aria-invalid', 'false');
          const errBox = document.getElementById(`${input.id}-error`);
          if (errBox) {
            errBox.textContent = '';
            errBox.hidden = true;
          }
        }
        showFormAlert('');
        persistCurrentFormDraft();
        renderCheckoutSummary();
      });

      form.addEventListener('change', (e) => {
        if (e.target && e.target.name === 'orderType') {
          syncOrderTypeFields();
          persistCurrentFormDraft();
        }
      });
    }

    document.addEventListener('click', (e) => {
      const closeBtn = e.target.closest('[data-close-checkout]');
      if (closeBtn) {
        e.preventDefault();
        closeCheckoutModal();
        return;
      }

      const backToEditBtn = e.target.closest('[data-back-to-checkout-form]');
      if (backToEditBtn) {
        e.preventDefault();
        const formStep = document.getElementById('checkout-form-step');
        const sentPanel = document.getElementById('checkout-sent-panel');
        if (sentPanel) sentPanel.hidden = true;
        if (formStep) formStep.hidden = false;
        resetSubmissionLock();
        return;
      }

      const confirmSentBtn = e.target.closest('[data-confirm-order-sent]');
      if (confirmSentBtn) {
        e.preventDefault();
        if (global.OHD.cart) {
          global.OHD.cart.clearCart(true);
        }
        closeCheckoutModal();
        utils.showToast('Спасибо! Корзина очищена. Ожидайте ответа ресторана в WhatsApp.', 'success');
      }
    });

    if (global.OHD.cart && typeof global.OHD.cart.subscribe === 'function') {
      global.OHD.cart.subscribe(() => {
        const dialog = document.getElementById('checkout-dialog');
        if (dialog && dialog.open) {
          renderCheckoutSummary();
        }
      });
    }

    global.addEventListener('offline', () => {
      const dialog = document.getElementById('checkout-dialog');
      if (dialog && dialog.open) {
        showFormAlert('Потеряно подключение к интернету. Ваш заказ сохранён на этой странице.');
      }
    });

    global.addEventListener('online', () => {
      showFormAlert('');
    });
  }

  let checkoutBound = false;

  function initCheckout() {
    if (!checkoutBound && typeof document !== 'undefined') {
      bindCheckoutEvents();
      checkoutBound = true;
    }
    if (typeof document !== 'undefined') {
      syncOrderTypeFields();
    }
  }

  global.OHD = global.OHD || {};
  global.OHD.checkout = {
    DRAFT_SCHEMA_VERSION,
    initCheckout,
    openCheckoutModal,
    closeCheckoutModal,
    renderCheckoutSummary,
    validateCheckoutForm,
    isSubmitting: () => isSubmittingOrder,
    getLastWhatsAppUrl: () => lastWhatsAppUrl,
  };
})(window);
