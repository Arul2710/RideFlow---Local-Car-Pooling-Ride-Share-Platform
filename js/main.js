/* ============================================================
   RideFlow – main.js
   Global JavaScript: Dark Mode, RTL, Auth, Navbar, Utils
   ============================================================ */

'use strict';

/* ══════════════════════════════════════════════════════════
   0. STORAGE SAFE WRAPPERS
   (localStorage throws in private mode / file:// sandboxes)
══════════════════════════════════════════════════════════ */

function rfGet(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}

function rfSet(key, value) {
  try { localStorage.setItem(key, value); } catch { /* ignore */ }
}

/* ══════════════════════════════════════════════════════════
   1. DARK MODE
   State lives on the `dark` class of <html> only.
   It is completely independent of the RTL state below.
══════════════════════════════════════════════════════════ */

const DARK_KEY = 'darkMode';
const RTL_KEY  = 'rtl';

/**
 * Read current preference and apply to DOM.
 */
function applyDarkMode() {
  const isDark = rfGet(DARK_KEY) === 'true';
  const root   = document.documentElement;

  root.classList.toggle('dark', isDark);

  // Every dark-mode icon on the page (navbar desktop + mobile + any custom)
  document.querySelectorAll('.dark-mode-icon').forEach(el => {
    el.className = isDark ? 'fas fa-sun dark-mode-icon' : 'fas fa-moon dark-mode-icon';
  });

  // Legacy selectors used in inline HTML
  const icon       = document.getElementById('darkModeIcon');
  const iconMobile = document.getElementById('darkModeIconMobile');
  if (icon)       icon.className       = isDark ? 'fas fa-sun' : 'fas fa-moon';
  if (iconMobile) iconMobile.className = isDark ? 'fas fa-sun' : 'fas fa-moon';

  // Keep every toggle button's label/title/aria in sync
  document.querySelectorAll('[data-toggle="dark"]').forEach(btn => {
    btn.setAttribute('aria-pressed', String(isDark));
    btn.setAttribute('aria-label', isDark ? 'Switch to light theme' : 'Switch to dark theme');
    btn.title = isDark ? 'Light Mode' : 'Dark Mode';
    const label = btn.querySelector('[data-label]');
    if (label) label.textContent = isDark ? 'Light Mode' : 'Dark Mode';
  });

  // Reflect state on <body> so CSS hooks can use a plain class
  if (document.body) document.body.classList.toggle('dark-mode', isDark);
}

/**
 * Toggle dark mode and persist the preference.
 */
function toggleDarkMode() {
  const next = !(rfGet(DARK_KEY) === 'true');
  rfSet(DARK_KEY, String(next));
  applyDarkMode();
}

/* ══════════════════════════════════════════════════════════
   2. RTL / LTR
   State lives on the `dir` attribute of <html> only.
   It is completely independent of the dark mode state above.
══════════════════════════════════════════════════════════ */

/**
 * Read RTL preference and apply dir attribute to <html>.
 */
function applyRTL() {
  const isRTL = rfGet(RTL_KEY) === 'true';
  const root   = document.documentElement;

  root.setAttribute('dir', isRTL ? 'rtl' : 'ltr');
  // Convenience class hook (kept in sync, useful for CSS/JS checks)
  root.classList.toggle('rtl', isRTL);

  // Keep every RTL toggle button's label/title/aria in sync
  document.querySelectorAll('[data-toggle="rtl"]').forEach(btn => {
    btn.setAttribute('aria-pressed', String(isRTL));
    btn.setAttribute('aria-label', isRTL ? 'Switch to left-to-right layout' : 'Switch to right-to-left layout');
    btn.title = isRTL ? 'Switch to LTR' : 'Switch to RTL';
    const label = btn.querySelector('[data-label]');
    if (label) label.textContent = isRTL ? 'LTR' : 'RTL';
    const icon = btn.querySelector('[data-icon]');
    if (icon) {
      // Cache the icon's non-glyph classes (e.g. `text-sm`, `w-4 text-center`)
      // so swapping the glyph never drops per-page sizing/colour utilities.
      if (!icon.dataset.iconBase) {
        icon.dataset.iconBase = icon.className
          .replace(/\bfas\b/, '')
          .replace(/\bfa-(exchange-alt|align-left|align-right)\b/g, '')
          .trim();
      }
      icon.className = (icon.dataset.iconBase + ' ' + (isRTL ? 'fas fa-align-left' : 'fas fa-align-right')).trim();
    }
  });

  // Close the mobile drawer so the mirrored layout is measured correctly
  const menu = document.getElementById('mobileMenu');
  if (menu && isRTL && !menu.classList.contains('hidden')) {
    menu.classList.add('hidden');
    setMobileMenuIcon(false);
  }
}

/**
 * Toggle RTL and persist.
 */
function toggleRTL() {
  const next = !(rfGet(RTL_KEY) === 'true');
  rfSet(RTL_KEY, String(next));
  applyRTL();
}

/**
 * Toggle mobile home sub-menu accordion
 */
function toggleMobileHomeDropdown() {
  const menu = document.getElementById('mobileHomeMenu');
  const icon = document.getElementById('mobileHomeChevron');
  if (menu) {
    menu.classList.toggle('hidden');
    if (icon) icon.classList.toggle('rotate-180');
  }
}

/**
 * Toggle mobile dashboard sub-menu accordion
 */
function toggleMobileDashboardDropdown() {
  const menu = document.getElementById('mobileDashboardMenu');
  const icon = document.getElementById('mobileDashboardChevron');
  if (menu) {
    menu.classList.toggle('hidden');
    if (icon) icon.classList.toggle('rotate-180');
  }
}


/**
 * Sync the hamburger icon with the drawer state.
 * @param {boolean} open
 */
function setMobileMenuIcon(open) {
  const btn = document.getElementById('mobileMenuBtn');
  if (!btn) return;
  const icon = btn.querySelector('i');
  if (icon) icon.className = open ? 'fas fa-times text-xl' : 'fas fa-bars text-xl';
  btn.setAttribute('aria-expanded', String(open));
}

/**
 * Open / close the mobile navigation drawer.
 */
function toggleMobileMenu() {
  const menu = document.getElementById('mobileMenu');
  if (!menu) return;
  const willOpen = menu.classList.contains('hidden');
  menu.classList.toggle('hidden', !willOpen);
  setMobileMenuIcon(willOpen);
}

/**
 * Close mobile menu when clicking outside of it.
 */
document.addEventListener('click', function (e) {
  const menu = document.getElementById('mobileMenu');
  const btn  = document.getElementById('mobileMenuBtn');
  if (!menu || !btn) return;

  const clickedOutside = !menu.contains(e.target) && !btn.contains(e.target);
  if (clickedOutside && !menu.classList.contains('hidden')) {
    menu.classList.add('hidden');
    setMobileMenuIcon(false);
  }
});

/* ══════════════════════════════════════════════════════════
   4. NAVBAR SCROLL EFFECT
══════════════════════════════════════════════════════════ */

/**
 * Add a shadow to the navbar when the page is scrolled.
 */
function handleNavbarScroll() {
  const navbar = document.getElementById('navbar');
  if (!navbar) return;

  if (window.scrollY > 20) {
    navbar.classList.add('shadow-md', 'navbar-scrolled');
  } else {
    navbar.classList.remove('shadow-md', 'navbar-scrolled');
  }
}

window.addEventListener('scroll', handleNavbarScroll, { passive: true });

/* ══════════════════════════════════════════════════════════
   5. AUTH
══════════════════════════════════════════════════════════ */

/**
 * Retrieve the logged-in user object from localStorage.
 * @returns {Object|null} user object or null
 */
function getUser() {
  try {
    return JSON.parse(rfGet('rideflowUser') || 'null');
  } catch {
    return null;
  }
}

/**
 * Demo login — stores user in localStorage.
 * @param {string} email
 * @param {string} password
 */
function login(email, password) {
  if (!email || !password) {
    showToast('Please enter your email and password.', 'error');
    return;
  }

  let user;
  if (email === 'admin@rideflow.com') {
    user = { name: 'Admin User', email, role: 'admin', avatar: '' };
  } else if (email === 'driver@rideflow.com') {
    user = { name: 'Alex Driver', email, role: 'driver', avatar: '' };
  } else {
    user = { name: 'John Doe', email, role: 'user', avatar: '' };
  }

  rfSet('rideflowUser', JSON.stringify(user));
  showToast('Login successful! Redirecting…', 'success');

  setTimeout(() => {
    if (user.role === 'admin') {
      window.location.href = 'admin-dashboard.html';
    } else {
      window.location.href = 'user-dashboard.html';
    }
  }, 800);
}

/**
 * Log out the current user and redirect to login page.
 */
function logout() {
  localStorage.removeItem('rideflowUser');
  window.location.href = 'login.html';
}

/**
 * Guard a page behind authentication (and optionally a role).
 * Redirects if not authenticated or wrong role.
 * @param {string|null} role   'admin' | 'user' | 'driver' | null
 */
function requireAuth(role) {
  const user = getUser();
  if (!user) {
    window.location.href = 'login.html';
    return;
  }
  if (role && user.role !== role) {
    switch (user.role) {
      case 'admin':  window.location.href = 'admin-dashboard.html'; break;
      default:       window.location.href = 'user-dashboard.html';  break;
    }
  }
}

/* ══════════════════════════════════════════════════════════
   6. SMOOTH SCROLL — anchor links
══════════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', function () {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const href = this.getAttribute('href');
      if (href === '#') return;
      const target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
});

/* ══════════════════════════════════════════════════════════
   7. TOAST NOTIFICATIONS
══════════════════════════════════════════════════════════ */

/**
 * Display a toast notification.
 * @param {string} message   Text to show
 * @param {'success'|'error'|'warning'|'info'} type
 * @param {number} duration  Auto-dismiss in ms (default 3500)
 */
function showToast(message, type = 'success', duration = 3500) {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const icons = {
    success: 'fa-check-circle',
    error:   'fa-times-circle',
    warning: 'fa-exclamation-triangle',
    info:    'fa-info-circle',
  };

  const colors = {
    success: '#10B981',
    error:   '#EF4444',
    warning: '#F59E0B',
    info:    '#3B82F6',
  };

  const toast = document.createElement('div');
  toast.className = `toast ${type !== 'success' ? type : ''}`;
  toast.innerHTML = `
    <i class="fas ${icons[type] || icons.info}" style="color:${colors[type] || colors.info}; font-size:1.1rem; flex-shrink:0;"></i>
    <span style="flex:1; font-size:0.9rem; font-weight:500;">${message}</span>
    <button onclick="this.parentElement.remove()" style="background:none;border:none;cursor:pointer;color:#9CA3AF;font-size:1rem;">
      <i class="fas fa-times"></i>
    </button>
  `;

  container.appendChild(toast);

  // Auto-remove
  setTimeout(() => {
    toast.style.transition = 'opacity 0.3s, transform 0.3s';
    toast.style.opacity    = '0';
    toast.style.transform  = 'translateX(60px)';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

/* ══════════════════════════════════════════════════════════
   8. MODAL HELPERS
══════════════════════════════════════════════════════════ */

/**
 * Open a modal by its backdrop ID.
 * @param {string} modalId   ID of the .modal-backdrop element
 */
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
}

/**
 * Close a modal by its backdrop ID.
 * @param {string} modalId
 */
function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('open');
    document.body.style.overflow = '';
  }
}

// Close modal on backdrop click
document.addEventListener('click', function (e) {
  if (e.target.classList.contains('modal-backdrop')) {
    e.target.classList.remove('open');
    document.body.style.overflow = '';
  }
});

// Close modal on Escape key
document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-backdrop.open').forEach(modal => {
      modal.classList.remove('open');
      document.body.style.overflow = '';
    });
  }
});

/* ══════════════════════════════════════════════════════════
   9. FORM UTILITIES
══════════════════════════════════════════════════════════ */

/**
 * Simple email validator.
 * @param {string} email
 * @returns {boolean}
 */
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/**
 * Validate a form field, show inline error message.
 * @param {HTMLInputElement} field
 * @param {string}           message
 * @returns {boolean} false = invalid
 */
function showFieldError(field, message) {
  field.classList.add('error');
  let err = field.parentElement.querySelector('.form-error');
  if (!err) {
    err = document.createElement('p');
    err.className = 'form-error';
    field.parentElement.appendChild(err);
  }
  err.textContent = message;
  return false;
}

/**
 * Clear error state from a form field.
 * @param {HTMLInputElement} field
 */
function clearFieldError(field) {
  field.classList.remove('error');
  const err = field.parentElement.querySelector('.form-error');
  if (err) err.remove();
}

/* ══════════════════════════════════════════════════════════
   10. NUMBER FORMATTER
══════════════════════════════════════════════════════════ */

/**
 * Format a number with commas.
 * @param {number} n
 * @returns {string}
 */
function formatNumber(n) {
  return n.toLocaleString('en-US');
}

/**
 * Format a currency value.
 * @param {number} n
 * @param {string} currency  ISO currency code
 * @returns {string}
 */
function formatCurrency(n, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(n);
}

/* ══════════════════════════════════════════════════════════
   11. DATE UTILITIES
══════════════════════════════════════════════════════════ */

/**
 * Format a Date object to a readable string.
 * @param {Date|string} date
 * @returns {string}  e.g. "Sep 27, 2026"
 */
function formatDate(date) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(date));
}

/**
 * Return a relative time string like "2 hours ago".
 * @param {Date|string} date
 * @returns {string}
 */
function timeAgo(date) {
  const seconds = Math.floor((Date.now() - new Date(date)) / 1000);
  const intervals = [
    [31536000, 'year'], [2592000, 'month'], [86400, 'day'],
    [3600, 'hour'], [60, 'minute'], [1, 'second'],
  ];
  for (const [s, label] of intervals) {
    const count = Math.floor(seconds / s);
    if (count >= 1) return `${count} ${label}${count > 1 ? 's' : ''} ago`;
  }
  return 'just now';
}

/* ══════════════════════════════════════════════════════════
   12. COPY TO CLIPBOARD
══════════════════════════════════════════════════════════ */

/**
 * Copy text to clipboard and show a toast.
 * @param {string} text
 */
async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    showToast('Copied to clipboard!', 'success', 2000);
  } catch {
    showToast('Failed to copy.', 'error', 2000);
  }
}

/* ══════════════════════════════════════════════════════════
   13. DEBOUNCE
══════════════════════════════════════════════════════════ */

/**
 * Debounce a function.
 * @param {Function} fn
 * @param {number}   delay  ms
 * @returns {Function}
 */
function debounce(fn, delay = 300) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

/* ══════════════════════════════════════════════════════════
   14. LOCAL STORAGE HELPERS
══════════════════════════════════════════════════════════ */

const Store = {
  get(key, fallback = null) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  },
  remove(key) {
    localStorage.removeItem(key);
  },
};

/* ══════════════════════════════════════════════════════════
   15. INIT
══════════════════════════════════════════════════════════ */

// Apply preferences as early as possible (the inline <head> snippet in each
// page already did this – re-applying here refreshes the toggle button labels).
applyDarkMode();
applyRTL();

document.addEventListener('DOMContentLoaded', function () {
  handleNavbarScroll();
  applyDarkMode();
  applyRTL();

  // Expose functions globally for inline onclick= attributes in HTML
  window.toggleDarkMode   = toggleDarkMode;
  window.toggleRTL        = toggleRTL;
  window.applyDarkMode    = applyDarkMode;
  window.applyRTL         = applyRTL;
  window.toggleMobileMenu = toggleMobileMenu;
  window.setMobileMenuIcon = setMobileMenuIcon;
  window.toggleMobileHomeDropdown = toggleMobileHomeDropdown;
  window.toggleMobileDashboardDropdown = toggleMobileDashboardDropdown;
  window.logout           = logout;
  window.login            = login;
  window.openModal        = openModal;
  window.closeModal       = closeModal;
  window.showToast        = showToast;
  window.copyToClipboard  = copyToClipboard;
  window.requireAuth      = requireAuth;
  window.getUser          = getUser;

  // Mark current nav link as active
  const path      = window.location.pathname;
  const currentPage = (path.split('/').pop() || 'index.html') || 'index.html';
  document.querySelectorAll('nav a[href]').forEach(link => {
    if (link.getAttribute('href') === currentPage) {
      link.classList.add('text-emerald-600', 'font-semibold');
    }
  });
});
