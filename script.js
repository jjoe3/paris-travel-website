(() => {
  'use strict';

  // =========================================================================
  // ANIMATION CANVAS ENGINE
  // =========================================================================
  const TOTAL_FRAMES = 187;
  const LERP_FACTOR = 0.085; // Organic Apple-style easing dampener
  const canvas = document.getElementById('animation-canvas');
  const ctx = canvas.getContext('2d', { alpha: false });

  // Format frame URL: frames/ezgif-frame-001.jpg to frames/ezgif-frame-187.jpg
  function getFramePath(index) {
    const frameNumber = String(index + 1).padStart(3, '0');
    return `ezgif-frame-${frameNumber}.jpg`;
  }

  // Preload storage
  const images = new Array(TOTAL_FRAMES);
  const loaded = new Array(TOTAL_FRAMES).fill(false);
  let loadedCount = 0;

  // Animation state
  let targetProgress = 0;
  let currentProgress = 0;
  let lastRenderedIndex = -1;
  let needsResize = true;
  let needsRedraw = false;

  // Setup canvas resolution matching device pixel ratio
  function resizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const displayWidth = window.innerWidth;
    const displayHeight = window.innerHeight;

    const newWidth = Math.round(displayWidth * dpr);
    const newHeight = Math.round(displayHeight * dpr);

    if (canvas.width !== newWidth || canvas.height !== newHeight) {
      canvas.width = newWidth;
      canvas.height = newHeight;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      needsResize = true;
    }
  }

  // Draw image scaled to cover canvas (like background-size: cover)
  function drawCoverImage(img) {
    if (!img || !img.complete || img.naturalWidth === 0) return;

    const cw = canvas.width;
    const ch = canvas.height;
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;

    const canvasRatio = cw / ch;
    const imgRatio = iw / ih;

    let drawW, drawH, drawX, drawY;

    if (canvasRatio > imgRatio) {
      drawW = cw;
      drawH = cw / imgRatio;
      drawX = 0;
      drawY = (ch - drawH) / 2;
    } else {
      drawH = ch;
      drawW = ch * imgRatio;
      drawX = (cw - drawW) / 2;
      drawY = 0;
    }

    ctx.drawImage(img, drawX, drawY, drawW, drawH);
  }

  // Find the closest loaded frame to avoid any flickering if scrolling fast
  function getNearestLoadedImage(index) {
    if (loaded[index] && images[index]) {
      return images[index];
    }

    // Search outwards from target index
    for (let offset = 1; offset < TOTAL_FRAMES; offset++) {
      const left = index - offset;
      if (left >= 0 && loaded[left] && images[left]) {
        return images[left];
      }
      const right = index + offset;
      if (right < TOTAL_FRAMES && loaded[right] && images[right]) {
        return images[right];
      }
    }

    return null;
  }

  function renderFrame(index, force = false) {
    if (index === lastRenderedIndex && !force && !needsResize && !needsRedraw) return;

    const img = getNearestLoadedImage(index);
    if (img) {
      drawCoverImage(img);
      lastRenderedIndex = index;
      needsResize = false;
      needsRedraw = false;
    }
  }

  // Update target progress from window scroll
  function updateScrollProgress() {
    const scrollY = window.pageYOffset || document.documentElement.scrollTop || 0;
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    targetProgress = maxScroll > 0 ? Math.max(0, Math.min(1, scrollY / maxScroll)) : 0;
  }

  // Smooth animation loop using lerp (linear interpolation)
  function tick() {
    const delta = targetProgress - currentProgress;

    if (Math.abs(delta) > 0.0001) {
      currentProgress += delta * LERP_FACTOR;
    } else {
      currentProgress = targetProgress;
    }

    const frameIndex = Math.min(
      TOTAL_FRAMES - 1,
      Math.max(0, Math.round(currentProgress * (TOTAL_FRAMES - 1)))
    );

    renderFrame(frameIndex);

    requestAnimationFrame(tick);
  }

  // Smart Concurrent Preloader
  function startPreloading() {
    // 1. Immediately load frame 0 for instant display
    const firstImage = new Image();
    firstImage.src = getFramePath(0);
    images[0] = firstImage;

    firstImage.onload = () => {
      loaded[0] = true;
      loadedCount++;
      renderFrame(0, true);
    };

    // 2. Load remaining frames with concurrent queue
    const queue = [];
    for (let i = 1; i < TOTAL_FRAMES; i++) {
      queue.push(i);
    }

    const CONCURRENCY_LIMIT = 10;
    let activeLoads = 0;

    function loadNext() {
      if (queue.length === 0) return;

      while (activeLoads < CONCURRENCY_LIMIT && queue.length > 0) {
        const index = queue.shift();
        activeLoads++;

        const img = new Image();
        img.src = getFramePath(index);
        images[index] = img;

        img.onload = () => {
          loaded[index] = true;
          loadedCount++;
          activeLoads--;

          // If the current display frame is waiting for this or nearby frame, update
          const currentDisplayIndex = Math.round(currentProgress * (TOTAL_FRAMES - 1));
          if (Math.abs(currentDisplayIndex - index) <= 1) {
            needsRedraw = true;
          }
          loadNext();
        };

        img.onerror = () => {
          activeLoads--;
          loadNext();
        };
      }
    }

    loadNext();
  }

  // =========================================================================
  // INTERACTIVE COMPONENTS & NAVIGATION
  // =========================================================================

  // Initialize Lucide icons
  function initIcons() {
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }
  }

  // Navigation Pills Active State & Smooth Scrolling
  const navPills = document.querySelectorAll('.nav-pill');
  const sections = [
    { id: 'home', el: document.getElementById('home') },
    { id: 'why-choose-us', el: document.getElementById('why-choose-us') },
    { id: 'experiences', el: document.getElementById('experiences') },
    { id: 'itineraries', el: document.getElementById('itineraries') },
    { id: 'cta-section', el: document.getElementById('cta-section') }
  ];

  navPills.forEach(pill => {
    pill.addEventListener('click', () => {
      const targetId = pill.getAttribute('data-target');
      const targetEl = document.getElementById(targetId);
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });

  // Highlight active nav pill based on scroll position
  function updateActiveNav() {
    const scrollPosition = window.scrollY + window.innerHeight * 0.35;
    let currentActive = 'home';

    sections.forEach(({ id, el }) => {
      if (el) {
        const top = el.offsetTop;
        const height = el.offsetHeight;
        if (scrollPosition >= top && scrollPosition < top + height) {
          currentActive = id;
        }
      }
    });

    navPills.forEach(pill => {
      const target = pill.getAttribute('data-target');
      if (target === currentActive) {
        pill.classList.add('active');
      } else {
        pill.classList.remove('active');
      }
    });
  }

  // Drawer / Mobile Menu
  const openMenuBtn = document.getElementById('open-menu-btn');
  const closeMenuBtn = document.getElementById('close-menu-btn');
  const menuDrawerBackdrop = document.getElementById('menu-drawer-backdrop');
  const drawerNavItems = document.querySelectorAll('.drawer-nav-item');

  function openMenu() {
    menuDrawerBackdrop.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  function closeMenu() {
    menuDrawerBackdrop.classList.add('hidden');
    document.body.style.overflow = '';
  }

  if (openMenuBtn) openMenuBtn.addEventListener('click', openMenu);
  if (closeMenuBtn) closeMenuBtn.addEventListener('click', closeMenu);

  if (menuDrawerBackdrop) {
    menuDrawerBackdrop.addEventListener('click', (e) => {
      if (e.target === menuDrawerBackdrop) closeMenu();
    });
  }

  drawerNavItems.forEach(item => {
    item.addEventListener('click', () => {
      const targetId = item.getAttribute('data-target');
      const targetEl = document.getElementById(targetId);
      closeMenu();
      if (targetEl) {
        setTimeout(() => {
          targetEl.scrollIntoView({ behavior: 'smooth' });
        }, 150);
      }
    });
  });

  // Explore Paris Modal
  const modalBackdrop = document.getElementById('modal-backdrop');
  const closeModalBtn = document.getElementById('close-modal-btn');
  const modalTriggers = document.querySelectorAll('.open-modal-trigger');
  const exploreForm = document.getElementById('explore-form');
  const modalSuccess = document.getElementById('modal-success');
  const successCloseBtn = document.getElementById('success-close-btn');

  function openModal() {
    if (menuDrawerBackdrop && !menuDrawerBackdrop.classList.contains('hidden')) {
      closeMenu();
    }
    modalBackdrop.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    modalBackdrop.classList.add('hidden');
    document.body.style.overflow = '';
    // Reset form after closing
    setTimeout(() => {
      if (exploreForm) {
        exploreForm.reset();
        exploreForm.classList.remove('hidden');
      }
      if (modalSuccess) {
        modalSuccess.classList.add('hidden');
      }
    }, 250);
  }

  modalTriggers.forEach(btn => btn.addEventListener('click', openModal));
  if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
  if (successCloseBtn) successCloseBtn.addEventListener('click', closeModal);

  if (modalBackdrop) {
    modalBackdrop.addEventListener('click', (e) => {
      if (e.target === modalBackdrop) closeModal();
    });
  }

  // Handle Modal Form Submission
  if (exploreForm) {
    exploreForm.addEventListener('submit', (e) => {
      e.preventDefault();
      exploreForm.classList.add('hidden');
      modalSuccess.classList.remove('hidden');
      initIcons();
    });
  }

  // Escape key closes modal & drawer
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (!modalBackdrop.classList.contains('hidden')) closeModal();
      if (!menuDrawerBackdrop.classList.contains('hidden')) closeMenu();
    }
  });

  // Window Event Listeners
  window.addEventListener('scroll', () => {
    updateScrollProgress();
    updateActiveNav();
  }, { passive: true });

  window.addEventListener('resize', () => {
    resizeCanvas();
    updateScrollProgress();
    renderFrame(Math.round(currentProgress * (TOTAL_FRAMES - 1)), true);
  }, { passive: true });

  // Initialization
  document.addEventListener('DOMContentLoaded', () => {
    initIcons();
  });
  window.addEventListener('load', () => {
    initIcons();
  });

  resizeCanvas();
  updateScrollProgress();
  currentProgress = targetProgress;
  startPreloading();
  initIcons();
  requestAnimationFrame(tick);
})();
