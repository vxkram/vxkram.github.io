(function () {
  'use strict';

  const panels = Array.from(document.querySelectorAll('.panel'));
  const navLinks = Array.from(document.querySelectorAll('[data-nav]'));
  const cornerLabel = document.getElementById('corner-label');
  const srLive = document.getElementById('sr-live');
  const total = panels.length;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let currentIndex = 0;

  function setCurrentIndex(index) {
    currentIndex = Math.max(0, Math.min(total - 1, index));
    navLinks.forEach((link) => {
      if (Number(link.dataset.nav) === currentIndex) {
        link.setAttribute('aria-current', 'true');
      } else {
        link.removeAttribute('aria-current');
      }
    });
    if (cornerLabel) {
      cornerLabel.textContent =
        String(currentIndex + 1).padStart(2, '0') + ' / ' + String(total).padStart(2, '0');
    }
    if (srLive) {
      const label = panels[currentIndex].dataset.label || '';
      srLive.textContent = 'Panel ' + (currentIndex + 1) + ' of ' + total + ': ' + label;
    }
  }

  // Native vertical page scroll does the actual moving; this just drives it
  // for keyboard input rather than intercepting wheel/touch, which stay
  // untouched. Top-nav links are plain #anchors (scroll-padding-top in CSS
  // keeps them clear of the fixed nav), so they need no handler here.
  function goToPanel(index) {
    index = Math.max(0, Math.min(total - 1, index));
    panels[index].scrollIntoView({
      behavior: reducedMotion ? 'auto' : 'smooth',
      block: 'start',
    });
    setCurrentIndex(index);
  }

  // Keyboard navigation — section-by-section, alongside the top nav.
  window.addEventListener('keydown', (e) => {
    switch (e.key) {
      case 'ArrowDown':
      case 'PageDown':
        e.preventDefault();
        goToPanel(currentIndex + 1);
        break;
      case 'ArrowUp':
      case 'PageUp':
        e.preventDefault();
        goToPanel(currentIndex - 1);
        break;
      case 'Home':
        e.preventDefault();
        goToPanel(0);
        break;
      case 'End':
        e.preventDefault();
        goToPanel(total - 1);
        break;
      default:
        break;
    }
  });

  // Keep currentIndex accurate for ALL input methods (scroll, nav clicks,
  // keyboard). Sections are compact now (not forced to fill the viewport),
  // so an intersection-ratio threshold isn't reliable — instead pick the
  // last section whose top has crossed a line near the top of the viewport.
  function updateCurrentFromScroll() {
    const doc = document.documentElement;
    const maxScrollY = Math.max(doc.scrollHeight - window.innerHeight, 0);
    const line = window.scrollY + window.innerHeight * 0.3;
    let index = 0;
    panels.forEach((panel, i) => {
      // Clamp to maxScrollY: a short final section's top may sit past the
      // furthest the page can actually scroll, so without this the last
      // panel could never be "reached" even at the very bottom of the page.
      const effectiveTop = Math.min(panel.offsetTop, maxScrollY);
      if (effectiveTop <= line) index = i;
    });
    setCurrentIndex(index);
  }

  let rafPending = false;
  window.addEventListener('scroll', () => {
    if (!rafPending) {
      rafPending = true;
      requestAnimationFrame(() => {
        updateCurrentFromScroll();
        rafPending = false;
      });
    }
  });

  updateCurrentFromScroll();

  // Mobile nav: the link list collapses behind a Menu toggle under 760px.
  // Close it again after a link is picked or on Escape, so it never stays
  // open covering the section that was just navigated to.
  const navToggle = document.getElementById('nav-toggle');
  const navList = document.getElementById('nav-links');
  if (navToggle && navList) {
    function setMenuOpen(open) {
      navList.classList.toggle('is-open', open);
      navToggle.setAttribute('aria-expanded', String(open));
      navToggle.textContent = open ? 'Close' : 'Menu';
    }
    navToggle.addEventListener('click', () => {
      setMenuOpen(!navList.classList.contains('is-open'));
    });
    navList.addEventListener('click', (e) => {
      if (e.target.closest('a')) setMenuOpen(false);
    });
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && navList.classList.contains('is-open')) {
        setMenuOpen(false);
        navToggle.focus();
      }
    });
  }

  // Scroll reveal: .reveal elements fade/slide up once as they enter the
  // viewport. Siblings entering together get a small stagger so a row of
  // cards cascades instead of popping in as one block. Without
  // IntersectionObserver (or with reduced motion) everything is shown
  // immediately.
  const revealEls = Array.from(document.querySelectorAll('.reveal'));
  if (reducedMotion || !('IntersectionObserver' in window)) {
    revealEls.forEach((el) => el.classList.add('is-in'));
  } else {
    const observer = new IntersectionObserver((entries) => {
      const entering = entries.filter((entry) => entry.isIntersecting);
      entering.forEach((entry, i) => {
        entry.target.style.transitionDelay = Math.min(i * 70, 350) + 'ms';
        entry.target.classList.add('is-in');
        observer.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    revealEls.forEach((el) => observer.observe(el));
  }

  // Floating dots background: slow-drifting white particles over the black
  // page. Canvas is sized in device pixels (canvas.width/height) but drawn
  // against CSS-pixel coordinates via ctx.setTransform(dpr...), so dots
  // stay crisp at any devicePixelRatio.
  const dotsCanvas = document.getElementById('dots-bg');
  if (dotsCanvas) {
    const ctx = dotsCanvas.getContext('2d');
    let width = 0;
    let height = 0;
    let particles = [];
    const DENSITY = 1 / 18000; // particles per CSS px^2

    function makeParticle() {
      return {
        x: Math.random() * width,
        y: Math.random() * height,
        r: 0.6 + Math.random() * 1.4,
        speed: 6 + Math.random() * 14, // CSS px per second, drifting upward
        drift: (Math.random() - 0.5) * 6,
        opacity: 0.15 + Math.random() * 0.35,
      };
    }

    // Keeps existing particles across resizes and only adds/drops the
    // difference: mobile browsers fire resize whenever the address bar
    // shows or hides mid-scroll, and regenerating everything made the dots
    // visibly reshuffle each time.
    function resize() {
      const dpr = window.devicePixelRatio || 1;
      width = window.innerWidth;
      height = window.innerHeight;
      dotsCanvas.width = Math.round(width * dpr);
      dotsCanvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.round(width * height * DENSITY);
      while (particles.length < count) particles.push(makeParticle());
      particles.length = count;
    }

    function draw(deltaSeconds) {
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = '#fff';
      particles.forEach((p) => {
        if (deltaSeconds) {
          p.y -= p.speed * deltaSeconds;
          p.x += p.drift * deltaSeconds;
          if (p.y < -4) {
            p.y = height + 4;
            p.x = Math.random() * width;
          }
          if (p.x < -4) p.x = width + 4;
          if (p.x > width + 4) p.x = -4;
        }
        ctx.globalAlpha = p.opacity;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
    }

    resize();
    draw(0);
    window.addEventListener('resize', () => {
      resize();
      draw(0);
    });

    if (!reducedMotion) {
      let lastTime = null;
      function frame(now) {
        // Cap the step: after the tab has been in the background, rAF
        // resumes with a multi-second gap that would teleport every dot.
        if (lastTime !== null) draw(Math.min((now - lastTime) / 1000, 0.1));
        lastTime = now;
        requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    }
  }
})();
