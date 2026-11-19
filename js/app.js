/**
 * ORIGINAL HOT DOG — Главный модуль инициализации приложения (js/app.js)
 */
(function (global) {
  'use strict';

  const utils = global.OHD.utils;

  function initHeaderAndMobileNav() {
    const mobileMenuBtn = document.getElementById('mobile-menu-toggle');
    const mobileNavDrawer = document.getElementById('mobile-nav-drawer');

    if (mobileMenuBtn && mobileNavDrawer) {
      const closeMobileDrawer = (returnFocus = false) => {
        if (mobileNavDrawer.hidden) return;
        mobileMenuBtn.setAttribute('aria-expanded', 'false');
        mobileNavDrawer.hidden = true;
        if (returnFocus) mobileMenuBtn.focus();
      };

      mobileMenuBtn.addEventListener('click', () => {
        const isOpen = mobileMenuBtn.getAttribute('aria-expanded') === 'true';
        const nextState = !isOpen;
        mobileMenuBtn.setAttribute('aria-expanded', String(nextState));
        mobileNavDrawer.hidden = !nextState;
      });

      mobileNavDrawer.addEventListener('click', (e) => {
        const link = e.target.closest('a, [data-open-cart]');
        if (link) {
          closeMobileDrawer(false);
        }
      });

      // Закрытие мобильного меню по нажатию вне его или клавиши Escape
      document.addEventListener('click', (e) => {
        if (mobileNavDrawer.hidden) return;
        const header = document.querySelector('.site-header');
        if (header && !header.contains(e.target)) {
          closeMobileDrawer(false);
        }
      });

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !mobileNavDrawer.hidden) {
          closeMobileDrawer(true);
        }
      });
    }

    // Статус графика работы (10:00 — 00:00)
    const statusInfo = utils.getWorkingStatus();
    document.querySelectorAll('[data-working-status]').forEach((el) => {
      el.textContent = statusInfo.label;
      el.classList.toggle('is-open', statusInfo.isOpen);
    });
    document.querySelectorAll('.status-dot').forEach((dot) => {
      dot.classList.toggle('is-open', statusInfo.isOpen);
    });

    // Текущий год в футере
    document.querySelectorAll('[data-current-year]').forEach((el) => {
      el.textContent = String(new Date().getFullYear());
    });

    // Кнопка «Заказать» на первом экране: если корзина не пуста — открывает корзину/оформление, иначе ведёт к выбору блюд
    document.addEventListener('click', (e) => {
      const heroOrderBtn = e.target.closest('[data-hero-order]');
      if (!heroOrderBtn) return;
      e.preventDefault();
      if (global.OHD.cart && global.OHD.cart.getTotalCount() > 0) {
        global.OHD.cart.openCartModal();
        return;
      }
      const target =
        document.getElementById('popular-section') ||
        document.getElementById('catalog-section');
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  }

  function initMobileBottomNav() {
    const nav = document.getElementById('mobile-bottom-nav');
    if (!nav) return;

    const items = Array.from(nav.querySelectorAll('[data-bottom-nav]'));
    const pathname = (global.location && global.location.pathname) || '';
    const isMenuPage = /(?:^|\/)menu(?:\.html)?$/i.test(pathname);
    const primaryTab = isMenuPage ? 'menu' : 'home';
    const visibleContacts = new Set();
    let lockContactsUntil = 0;

    const setActiveTab = (activeKey) => {
      items.forEach((item) => {
        const key = item.getAttribute('data-bottom-nav');
        const isCurrent = key === activeKey;
        item.classList.toggle('is-active', isCurrent);
        if (key === 'home' || key === 'menu') {
          if (key === primaryTab) {
            item.setAttribute('aria-current', 'page');
          } else {
            item.removeAttribute('aria-current');
          }
        }
      });
    };

    const cartDialog = document.getElementById('cart-dialog');
    const checkoutDialog = document.getElementById('checkout-dialog');

    const isAnyOrderModalOpen = () =>
      Boolean((cartDialog && cartDialog.open) || (checkoutDialog && checkoutDialog.open));

    const syncContextualActiveTab = () => {
      if (isAnyOrderModalOpen()) {
        setActiveTab('cart');
      } else if (visibleContacts.size > 0 || Date.now() < lockContactsUntil) {
        setActiveTab('contacts');
      } else {
        setActiveTab(primaryTab);
      }
    };

    setActiveTab(primaryTab);

    nav.addEventListener('click', (e) => {
      const targetItem = e.target.closest('[data-bottom-nav]');
      if (!targetItem) return;

      const mobileMenuBtn = document.getElementById('mobile-menu-toggle');
      const mobileNavDrawer = document.getElementById('mobile-nav-drawer');
      if (mobileMenuBtn && mobileNavDrawer && !mobileNavDrawer.hidden) {
        mobileMenuBtn.setAttribute('aria-expanded', 'false');
        mobileNavDrawer.hidden = true;
      }

      const key = targetItem.getAttribute('data-bottom-nav');

      if (key === 'home' && primaryTab === 'home') {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        lockContactsUntil = 0;
        const behavior = global.scrollY > 2500 ? 'instant' : 'smooth';
        global.scrollTo({ top: 0, behavior });
        setActiveTab('home');
        return;
      }

      if (key === 'menu' && primaryTab === 'menu') {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        lockContactsUntil = 0;
        const catalogEl = document.getElementById('catalog-section');
        if (catalogEl) {
          const dist = Math.abs(catalogEl.getBoundingClientRect().top);
          catalogEl.scrollIntoView({ behavior: dist > 2500 ? 'instant' : 'smooth', block: 'start' });
        } else {
          global.scrollTo({ top: 0, behavior: 'smooth' });
        }
        setActiveTab('menu');
        return;
      }

      if (key === 'cart') {
        lockContactsUntil = 0;
        setActiveTab('cart');
        return;
      }

      if (key === 'contacts') {
        const href = targetItem.getAttribute('href') || '';
        const targetId = href.startsWith('#') ? href.slice(1) : '';
        const contactTarget = targetId ? document.getElementById(targetId) : null;
        lockContactsUntil = Date.now() + 900;
        setActiveTab('contacts');
        if (contactTarget) {
          e.preventDefault();
          const dist = Math.abs(contactTarget.getBoundingClientRect().top);
          contactTarget.scrollIntoView({ behavior: dist > 2500 ? 'instant' : 'smooth', block: 'start' });
        }
      }
    });

    if (typeof global.IntersectionObserver === 'function') {
      const contactTargets = [
        document.getElementById('contacts-section'),
        document.getElementById('footer-contacts'),
      ].filter(Boolean);

      if (contactTargets.length > 0) {
        const observer = new global.IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting) {
                visibleContacts.add(entry.target);
              } else {
                visibleContacts.delete(entry.target);
              }
            });
            syncContextualActiveTab();
          },
          { threshold: 0.12 }
        );
        contactTargets.forEach((el) => observer.observe(el));
      }
    }

    const onModalStateChange = () => {
      global.requestAnimationFrame(syncContextualActiveTab);
    };

    if (cartDialog) {
      cartDialog.addEventListener('close', onModalStateChange);
    }
    if (checkoutDialog) {
      checkoutDialog.addEventListener('close', onModalStateChange);
    }
  }

  function bootstrap() {
    initHeaderAndMobileNav();
    initMobileBottomNav();
    utils.initFormValidationSync(document);

    if (global.OHD.cart && typeof global.OHD.cart.initCart === 'function') {
      global.OHD.cart.initCart();
    }
    if (global.OHD.menu && typeof global.OHD.menu.initMenu === 'function') {
      global.OHD.menu.initMenu();
    }
    if (global.OHD.checkout && typeof global.OHD.checkout.initCheckout === 'function') {
      global.OHD.checkout.initCheckout();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
  } else {
    bootstrap();
  }
})(window);
