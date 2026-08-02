(function () {
  'use strict';

  const panels = Array.from(document.querySelectorAll('.panel'));
  const dots = Array.from(document.querySelectorAll('.dot'));
  const cornerLabel = document.getElementById('corner-label');
  const srLive = document.getElementById('sr-live');
  const total = panels.length;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let currentIndex = 0;

  function setCurrentIndex(index) {
    currentIndex = Math.max(0, Math.min(total - 1, index));
    dots.forEach((dot, i) => {
      if (i === currentIndex) {
        dot.setAttribute('aria-current', 'true');
      } else {
        dot.removeAttribute('aria-current');
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

  // Native vertical page scroll + CSS scroll-snap does the actual moving;
  // this just drives it for keyboard/dot-nav input rather than intercepting
  // wheel/touch, which stay untouched.
  function goToPanel(index) {
    index = Math.max(0, Math.min(total - 1, index));
    panels[index].scrollIntoView({
      behavior: reducedMotion ? 'auto' : 'smooth',
      block: 'start',
    });
    setCurrentIndex(index);
  }

  // Keyboard navigation — primary non-gesture path alongside the dot nav.
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

  // Dot nav.
  dots.forEach((dot, i) => {
    dot.addEventListener('click', () => goToPanel(i));
  });

  // Keep currentIndex accurate for ALL input methods (scroll, dot clicks,
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

  // Vinyl player: click toggles playback, disc only spins while actually
  // playing, icon/aria-pressed stay in sync with real audio state (not just
  // the click) so a play() rejection (e.g. autoplay policy) doesn't leave
  // the UI claiming it's playing when it isn't.
  const vinylButton = document.getElementById('vinyl-player');
  const vinylAudio = document.getElementById('vinyl-audio');
  const vinylIcon = vinylButton ? vinylButton.querySelector('.vinyl-icon') : null;
  if (vinylButton && vinylAudio) {
    vinylButton.addEventListener('click', () => {
      if (vinylAudio.paused) {
        vinylAudio.play().catch(() => {});
      } else {
        vinylAudio.pause();
      }
    });
    vinylAudio.addEventListener('play', () => {
      vinylButton.setAttribute('aria-pressed', 'true');
      if (vinylIcon) vinylIcon.textContent = '❚❚';
    });
    vinylAudio.addEventListener('pause', () => {
      vinylButton.setAttribute('aria-pressed', 'false');
      if (vinylIcon) vinylIcon.textContent = '▶';
    });
  }

  // Floating dots background: slow-drifting white particles over the
  // gradient. Canvas is sized in device pixels (canvas.width/height) but
  // drawn against CSS-pixel coordinates via ctx.scale(dpr, dpr), so dots
  // stay crisp at any devicePixelRatio -- same reasoning as the grain-tile
  // fix earlier, just applied from the start this time instead of after
  // shipping a fixed-resolution version.
  const dotsCanvas = document.getElementById('dots-bg');
  if (dotsCanvas) {
    const ctx = dotsCanvas.getContext('2d');
    let width = 0;
    let height = 0;
    let particles = [];
    const DENSITY = 1 / 18000; // particles per CSS px^2

    function resize() {
      const dpr = window.devicePixelRatio || 1;
      width = window.innerWidth;
      height = window.innerHeight;
      dotsCanvas.width = Math.round(width * dpr);
      dotsCanvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.round(width * height * DENSITY);
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        r: 0.6 + Math.random() * 1.4,
        speed: 6 + Math.random() * 14, // CSS px per second, drifting upward
        drift: (Math.random() - 0.5) * 6,
        opacity: 0.15 + Math.random() * 0.35,
      }));
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
        if (lastTime !== null) draw((now - lastTime) / 1000);
        lastTime = now;
        requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    }
  }
})();
