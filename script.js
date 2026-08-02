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

  // Scroll-driven gradient drift: map vertical scroll progress (0-1) to a
  // CSS custom property the gradient mesh uses to shift hue/position.
  let rafPending = false;
  function updateProgressVar() {
    const doc = document.documentElement;
    const maxScroll = doc.scrollHeight - doc.clientHeight;
    const progress = maxScroll > 0 ? window.scrollY / maxScroll : 0;
    doc.style.setProperty('--scroll-progress', progress.toFixed(4));
    rafPending = false;
  }
  window.addEventListener('scroll', () => {
    if (!rafPending) {
      rafPending = true;
      requestAnimationFrame(() => {
        updateProgressVar();
        updateCurrentFromScroll();
      });
    }
  });

  // Replace the pre-rendered grain PNGs with a canvas painted at the
  // *current* devicePixelRatio. A fixed-resolution image assumes dpr is a
  // clean integer (2 on standard Retina); on macOS "scaled resolution"
  // displays dpr is fractional (e.g. 1.6x/1.75x), so upscaling a fixed tile
  // lands on non-integer pixel boundaries and smears into soft blotches no
  // matter what image-rendering hint is set. Sizing the canvas to
  // Math.round(tileSize * dpr) device pixels and displaying it at exactly
  // `tileSize` CSS px maps every canvas pixel to one device pixel for any
  // dpr, by construction -- no scaling ever happens.
  function paintGrainTile(el, tileSize) {
    if (!el) return null;
    const dpr = window.devicePixelRatio || 1;
    const px = Math.max(1, Math.round(tileSize * dpr));
    const canvas = document.createElement('canvas');
    canvas.width = px;
    canvas.height = px;
    const ctx = canvas.getContext('2d');
    const imageData = ctx.createImageData(px, px);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const v = (Math.random() * 256) | 0;
      data[i] = v;
      data[i + 1] = v;
      data[i + 2] = v;
      data[i + 3] = 255;
    }
    ctx.putImageData(imageData, 0, 0);
    el.style.backgroundImage = `url(${canvas.toDataURL()})`;
    const cssSize = px / dpr;
    el.style.backgroundSize = `${cssSize}px ${cssSize}px`;
    return cssSize;
  }

  const fineGrain = document.querySelector('.grain-overlay--fine');
  const coarseGrain = document.querySelector('.grain-overlay--coarse');
  const fineTileSize = paintGrainTile(fineGrain, 64) || 64;
  const coarseTileSize = paintGrainTile(coarseGrain, 96) || 96;

  // Film-grain flicker: jitter each noise tile's background-position on a
  // short interval so it crawls like real film grain instead of sitting
  // static. Skipped entirely under reduced motion.
  if (!reducedMotion) {
    setInterval(() => {
      if (fineGrain) fineGrain.style.backgroundPosition = `${Math.random() * fineTileSize}px ${Math.random() * fineTileSize}px`;
      if (coarseGrain) coarseGrain.style.backgroundPosition = `${Math.random() * coarseTileSize}px ${Math.random() * coarseTileSize}px`;
    }, 110);
  }

  updateProgressVar();
  updateCurrentFromScroll();
})();
