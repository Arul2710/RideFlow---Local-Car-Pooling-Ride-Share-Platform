/* ============================================================
   RideFlow – home.js
   Homepage: Search, Counter, Testimonials, Scroll Animations
   ============================================================ */

'use strict';

/* ══════════════════════════════════════════════════════════
   1. RIDE SEARCH FORM
══════════════════════════════════════════════════════════ */

(function initSearchForm() {
  const form = document.getElementById('rideSearchForm');
  if (!form) return;

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    let valid = true;

    const fields = [
      { id: 'searchFrom',  label: 'Origin' },
      { id: 'searchTo',    label: 'Destination' },
      { id: 'searchDate',  label: 'Date' },
      { id: 'searchSeats', label: 'Seats' },
    ];

    // Clear previous errors
    fields.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) {
        el.classList.remove('border-red-400');
        const err = el.parentElement.querySelector('.search-error');
        if (err) err.remove();
      }
    });

    // Validate each field
    fields.forEach(({ id, label }) => {
      const el = document.getElementById(id);
      if (!el) return;
      if (!el.value.trim()) {
        el.classList.add('border-red-400');
        const err = document.createElement('p');
        err.className = 'search-error text-red-500 text-xs mt-1';
        err.textContent = `${label} is required.`;
        el.parentElement.appendChild(err);
        valid = false;
      }
    });

    // Date must not be in the past
    const dateEl = document.getElementById('searchDate');
    if (dateEl && dateEl.value) {
      const chosen = new Date(dateEl.value);
      const today  = new Date();
      today.setHours(0, 0, 0, 0);
      if (chosen < today) {
        dateEl.classList.add('border-red-400');
        const err = document.createElement('p');
        err.className = 'search-error text-red-500 text-xs mt-1';
        err.textContent = 'Please select a future date.';
        dateEl.parentElement.appendChild(err);
        valid = false;
      }
    }

    if (!valid) return;

    // Build query string and redirect
    const params = new URLSearchParams({
      from:  document.getElementById('searchFrom')?.value  || '',
      to:    document.getElementById('searchTo')?.value    || '',
      date:  document.getElementById('searchDate')?.value  || '',
      seats: document.getElementById('searchSeats')?.value || 1,
    });
    window.location.href = `find-ride.html?${params.toString()}`;
  });
})();

/* ══════════════════════════════════════════════════════════
   2. COUNTER ANIMATION (Count-Up)
══════════════════════════════════════════════════════════ */

/**
 * Animate a number element from 0 to its target value.
 * Target is set via data-count attribute.
 * @param {HTMLElement} el
 */
function animateCounter(el) {
  const target   = parseInt(el.getAttribute('data-count') || el.textContent.replace(/\D/g, ''), 10);
  const suffix   = el.getAttribute('data-suffix') || '';
  const prefix   = el.getAttribute('data-prefix') || '';
  const duration = parseInt(el.getAttribute('data-duration') || '2000', 10);

  if (isNaN(target)) return;

  const startTime = performance.now();

  function step(currentTime) {
    const elapsed  = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    // Ease out cubic
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = Math.floor(eased * target);
    el.textContent = prefix + current.toLocaleString() + suffix;
    if (progress < 1) requestAnimationFrame(step);
    else el.textContent = prefix + target.toLocaleString() + suffix;
  }

  requestAnimationFrame(step);
}

/**
 * Set up IntersectionObserver to trigger counter animations
 * when stat elements scroll into view.
 */
(function initCounters() {
  const counterEls = document.querySelectorAll('[data-count]');
  if (!counterEls.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateCounter(entry.target);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.4 });

  counterEls.forEach(el => observer.observe(el));
})();

/* ══════════════════════════════════════════════════════════
   3. TESTIMONIAL SLIDER / CAROUSEL
══════════════════════════════════════════════════════════ */

(function initTestimonialSlider() {
  const track      = document.getElementById('testimonialTrack');
  const prevBtn    = document.getElementById('testimonialPrev');
  const nextBtn    = document.getElementById('testimonialNext');
  const dotsWrap   = document.getElementById('testimonialDots');
  if (!track) return;

  const slides     = Array.from(track.children);
  let current      = 0;
  let autoInterval = null;
  const DURATION   = 5000; // 5 s

  function getVisibleCount() {
    if (window.innerWidth >= 1024) return 3;
    if (window.innerWidth >= 640)  return 2;
    return 1;
  }

  function totalSlides() {
    return Math.max(1, slides.length - getVisibleCount() + 1);
  }

  function buildDots() {
    if (!dotsWrap) return;
    dotsWrap.innerHTML = '';
    for (let i = 0; i < totalSlides(); i++) {
      const dot = document.createElement('button');
      dot.className = `w-2.5 h-2.5 rounded-full transition-all duration-300 ${i === current ? 'bg-emerald-500 w-6' : 'bg-gray-300'}`;
      dot.setAttribute('aria-label', `Slide ${i + 1}`);
      dot.addEventListener('click', () => goTo(i));
      dotsWrap.appendChild(dot);
    }
  }

  function updateDots() {
    if (!dotsWrap) return;
    Array.from(dotsWrap.children).forEach((dot, i) => {
      dot.className = `w-2.5 h-2.5 rounded-full transition-all duration-300 ${i === current ? 'bg-emerald-500 w-6' : 'bg-gray-300'}`;
    });
  }

  function goTo(index) {
    const total  = totalSlides();
    current = Math.max(0, Math.min(index, total - 1));
    const visCount  = getVisibleCount();
    const slideWidth = 100 / visCount;
    track.style.transform = `translateX(-${current * slideWidth}%)`;
    track.style.transition = 'transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
    updateDots();
  }

  function next() { goTo(current + 1 >= totalSlides() ? 0 : current + 1); }
  function prev() { goTo(current - 1 < 0 ? totalSlides() - 1 : current - 1); }

  function startAuto() {
    stopAuto();
    autoInterval = setInterval(next, DURATION);
  }

  function stopAuto() {
    if (autoInterval) { clearInterval(autoInterval); autoInterval = null; }
  }

  if (nextBtn) nextBtn.addEventListener('click', () => { next(); stopAuto(); startAuto(); });
  if (prevBtn) prevBtn.addEventListener('click', () => { prev(); stopAuto(); startAuto(); });

  // Touch / swipe support
  let touchStartX = 0;
  track.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; }, { passive: true });
  track.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) > 50) { dx < 0 ? next() : prev(); stopAuto(); startAuto(); }
  });

  // Pause on hover
  track.parentElement.addEventListener('mouseenter', stopAuto);
  track.parentElement.addEventListener('mouseleave', startAuto);

  // Re-init on resize
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { buildDots(); goTo(0); }, 200);
  });

  // Init
  buildDots();
  goTo(0);
  startAuto();
})();

/* ══════════════════════════════════════════════════════════
   4. SCROLL ANIMATIONS (AOS-like via IntersectionObserver)
══════════════════════════════════════════════════════════ */

(function initScrollAnimations() {
  const elements = document.querySelectorAll('[data-aos]');
  if (!elements.length) return;

  // Respect prefers-reduced-motion
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced) {
    elements.forEach(el => el.classList.add('aos-animate'));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const delay = parseInt(entry.target.getAttribute('data-aos-delay') || '0', 10);
        setTimeout(() => {
          entry.target.classList.add('aos-animate');
        }, delay);
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.12,
    rootMargin: '0px 0px -48px 0px',
  });

  elements.forEach(el => observer.observe(el));
})();

/* ══════════════════════════════════════════════════════════
   5. HERO TEXT ANIMATION
══════════════════════════════════════════════════════════ */

(function initHeroAnimation() {
  const heroWords = document.querySelectorAll('.hero-word');
  if (!heroWords.length) return;

  heroWords.forEach((word, i) => {
    word.style.opacity   = '0';
    word.style.transform = 'translateY(20px)';
    word.style.transition = `opacity 0.6s ease ${i * 120}ms, transform 0.6s ease ${i * 120}ms`;

    // Small delay before starting the sequence
    setTimeout(() => {
      word.style.opacity   = '1';
      word.style.transform = 'translateY(0)';
    }, 200 + i * 120);
  });
})();

/* ══════════════════════════════════════════════════════════
   6. TYPEWRITER EFFECT (optional hero headline)
══════════════════════════════════════════════════════════ */

(function initTypewriter() {
  const el = document.getElementById('typewriterText');
  if (!el) return;

  const words    = el.getAttribute('data-words')?.split(',').map(w => w.trim()) || ['Smarter', 'Affordable', 'Greener'];
  let wordIndex  = 0;
  let charIndex  = 0;
  let isDeleting = false;

  function type() {
    const currentWord = words[wordIndex];

    if (isDeleting) {
      el.textContent = currentWord.substring(0, charIndex - 1);
      charIndex--;
    } else {
      el.textContent = currentWord.substring(0, charIndex + 1);
      charIndex++;
    }

    let delay = isDeleting ? 60 : 100;

    if (!isDeleting && charIndex === currentWord.length) {
      delay = 1800;
      isDeleting = true;
    } else if (isDeleting && charIndex === 0) {
      isDeleting = false;
      wordIndex  = (wordIndex + 1) % words.length;
      delay      = 400;
    }

    setTimeout(type, delay);
  }

  type();
})();

/* ══════════════════════════════════════════════════════════
   7. HOW IT WORKS — step highlight on scroll
══════════════════════════════════════════════════════════ */

(function initStepHighlight() {
  const steps = document.querySelectorAll('.how-step');
  if (!steps.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('step-active');
      }
    });
  }, { threshold: 0.5 });

  steps.forEach(step => observer.observe(step));
})();

/* ══════════════════════════════════════════════════════════
   8. FEATURED RIDES — quick view toggle
══════════════════════════════════════════════════════════ */

(function initRideCards() {
  document.addEventListener('click', function (e) {
    const btn = e.target.closest('[data-ride-quick]');
    if (!btn) return;
    const rideId = btn.getAttribute('data-ride-quick');
    // Navigate to ride details with ride ID as query param
    window.location.href = `ride-details.html?id=${rideId}`;
  });
})();

/* ══════════════════════════════════════════════════════════
   9. PARTNERS LOGO INFINITE SCROLL
══════════════════════════════════════════════════════════ */

(function initLogoScroll() {
  const track = document.getElementById('logoScrollTrack');
  if (!track) return;

  // Clone logos for seamless loop
  const clone = track.innerHTML;
  track.innerHTML += clone;

  let pos = 0;
  const speed = 0.5; // px per frame
  let raf;
  let paused = false;

  function animate() {
    if (!paused) {
      pos -= speed;
      const halfWidth = track.scrollWidth / 2;
      if (Math.abs(pos) >= halfWidth) pos = 0;
      track.style.transform = `translateX(${pos}px)`;
    }
    raf = requestAnimationFrame(animate);
  }

  track.parentElement.addEventListener('mouseenter', () => { paused = true; });
  track.parentElement.addEventListener('mouseleave', () => { paused = false; });

  animate();
})();

/* ══════════════════════════════════════════════════════════
   10. NEWSLETTER FORM
══════════════════════════════════════════════════════════ */

(function initNewsletterForm() {
  const form = document.getElementById('newsletterForm');
  if (!form) return;

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    const emailEl = form.querySelector('input[type="email"]');
    if (!emailEl) return;

    const email = emailEl.value.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      if (typeof showToast === 'function') showToast('Please enter a valid email address.', 'error');
      return;
    }

    // Simulate subscription
    emailEl.value = '';
    if (typeof showToast === 'function') showToast('🎉 You\'ve subscribed to our newsletter!', 'success');
  });
})();

/* ══════════════════════════════════════════════════════════
   11. FAQ ACCORDION
══════════════════════════════════════════════════════════ */

(function initFaqAccordion() {
  const items = document.querySelectorAll('.faq-item');
  if (!items.length) return;

  items.forEach(item => {
    const trigger = item.querySelector('.faq-trigger');
    const body    = item.querySelector('.faq-body');
    const icon    = item.querySelector('.faq-icon');

    if (!trigger || !body) return;

    trigger.addEventListener('click', () => {
      const isOpen = !body.classList.contains('hidden');

      // Close all
      items.forEach(i => {
        i.querySelector('.faq-body')?.classList.add('hidden');
        i.querySelector('.faq-icon')?.classList.remove('rotate-180');
        i.classList.remove('faq-open');
      });

      // Open clicked if it was closed
      if (!isOpen) {
        body.classList.remove('hidden');
        if (icon) icon.classList.add('rotate-180');
        item.classList.add('faq-open');
      }
    });
  });
})();

/* ══════════════════════════════════════════════════════════
   12. INIT
══════════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', function () {
  // Set minimum date for search date inputs to today
  document.querySelectorAll('input[type="date"]').forEach(input => {
    if (!input.min) input.min = new Date().toISOString().split('T')[0];
  });
});
