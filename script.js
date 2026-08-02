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
})();
