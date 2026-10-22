(function () {
  'use strict';

  // ─── Helpers ───────────────────────────────────────────────
  const qs  = (sel, ctx = document) => ctx.querySelector(sel);
  const qsa = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
  const lerp  = (a, b, n) => a + (b - a) * n;
  const clamp = (v, min, max) => Math.min(Math.max(v, min), max);

  // Automatic file extension fallback (.JPG <-> .jpg) for images
  function attachImageFallback(img) {
    if (!img) return;
    img.addEventListener('error', function onImgError() {
      const currentSrc = img.getAttribute('src') || '';
      if (!img.dataset.triedFallback) {
        img.dataset.triedFallback = '1';
        if (currentSrc.endsWith('.JPG')) {
          img.src = currentSrc.slice(0, -4) + '.jpg';
        } else if (currentSrc.endsWith('.jpg')) {
          img.src = currentSrc.slice(0, -4) + '.JPG';
        }
      }
    });
  }

  // ─── 1. PRELOADER ─────────────────────────────────────────
  function initPreloader() {
    const preloader  = qs('#preloader') || qs('.preloader');
    const counter    = qs('#preloaderCounter') || qs('.preloader-counter');
    const progressEl = qs('#preloaderProgress') || qs('.preloader-progress');
    if (!preloader) return;

    let current = 0;
    const target = 100;
    const duration = 1600;
    const start = performance.now();

    function tick(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      current = Math.round(progress * target);

      if (counter) counter.textContent = current;
      if (progressEl) progressEl.style.width = current + '%';

      if (progress < 1) {
        requestAnimationFrame(tick);
      } else {
        preloader.classList.add('is-done');
        gsap.to(preloader, {
          opacity: 0,
          duration: 0.6,
          ease: 'power2.inOut',
          onComplete() {
            preloader.style.display = 'none';
            initHeroEntrance();
          }
        });
      }
    }

    requestAnimationFrame(tick);
  }

  // ─── 2. HERO ENTRANCE ─────────────────────────────────────
  function initHeroEntrance() {
    const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });

    tl.to('.hero-line-inner', {
      y: '0%',
      duration: 1.2,
      stagger: 0.1
    })
    .to('.hero-role', {
      opacity: 1,
      y: 0,
      duration: 0.8
    }, '-=0.5')
    .to('.hero-tagline', {
      opacity: 1,
      y: 0,
      duration: 0.8
    }, '-=0.5')
    .to('.hero-scroll', {
      opacity: 1,
      y: 0,
      duration: 0.8
    }, '-=0.4');
  }

  // ─── 3. LETTERBOX ─────────────────────────────────────────
  function initLetterbox() {
    const hero = qs('.hero');
    if (!hero) return;

    ScrollTrigger.create({
      trigger: hero,
      start: 'top top',
      end: 'bottom top',
      onUpdate(self) {
        if (self.progress > 0.1) {
          hero.classList.add('is-cinematic');
        } else {
          hero.classList.remove('is-cinematic');
        }
      }
    });
  }

  // ─── 4. CUSTOM CURSOR ─────────────────────────────────────
  function initCursor() {
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const cursor = qs('.cursor');
    if (!cursor || isTouchDevice) {
      if (cursor) cursor.style.display = 'none';
      return;
    }

    const cursorText = qs('.cursor-text', cursor);
    let mouseX = 0;
    let mouseY = 0;
    let cursorX = 0;
    let cursorY = 0;

    document.addEventListener('mousemove', function (e) {
      mouseX = e.clientX;
      mouseY = e.clientY;
    });

    document.addEventListener('mouseleave', function () {
      cursor.classList.add('is-hidden');
    });

    document.addEventListener('mouseenter', function () {
      cursor.classList.remove('is-hidden');
    });

    function moveCursor() {
      cursorX = lerp(cursorX, mouseX, 0.15);
      cursorY = lerp(cursorY, mouseY, 0.15);
      cursor.style.transform = 'translate(' + cursorX + 'px, ' + cursorY + 'px)';
      requestAnimationFrame(moveCursor);
    }
    requestAnimationFrame(moveCursor);

    const hoverTargets = qsa('a, button, [data-magnetic]');
    hoverTargets.forEach(function (el) {
      el.addEventListener('mouseenter', function () {
        cursor.classList.add('is-hovering');
      });
      el.addEventListener('mouseleave', function () {
        cursor.classList.remove('is-hovering');
      });
    });

    const videoTargets = qsa('[data-cursor-video]');
    videoTargets.forEach(function (el) {
      el.addEventListener('mouseenter', function () {
        cursor.classList.add('is-video');
        if (cursorText) cursorText.textContent = 'PLAY';
      });
      el.addEventListener('mouseleave', function () {
        cursor.classList.remove('is-video');
        if (cursorText) cursorText.textContent = '';
      });
    });

    const viewTargets = qsa('[data-cursor-view]');
    viewTargets.forEach(function (el) {
      el.addEventListener('mouseenter', function () {
        cursor.classList.add('is-view');
        if (cursorText) cursorText.textContent = 'VIEW';
      });
      el.addEventListener('mouseleave', function () {
        cursor.classList.remove('is-view');
        if (cursorText) cursorText.textContent = '';
      });
    });
  }

  // ─── 5. MAGNETIC BUTTONS ──────────────────────────────────
  function initMagneticButtons() {
    const magnets = qsa('[data-magnetic]');

    magnets.forEach(function (el) {
      el.addEventListener('mousemove', function (e) {
        const rect = el.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const deltaX = e.clientX - centerX;
        const deltaY = e.clientY - centerY;
        const strength = parseFloat(el.dataset.magnetic) || 0.3;

        gsap.to(el, {
          x: deltaX * strength,
          y: deltaY * strength,
          duration: 0.3,
          ease: 'power2.out'
        });
      });

      el.addEventListener('mouseleave', function () {
        gsap.to(el, {
          x: 0,
          y: 0,
          duration: 0.6,
          ease: 'elastic.out(1, 0.4)'
        });
      });
    });
  }

  // ─── 6. NAVIGATION ────────────────────────────────────────
  function initNavigation() {
    const nav = qs('.nav');
    if (!nav) return;

    let lastScrollY = 0;
    let ticking = false;

    function onScroll() {
      if (!ticking) {
        requestAnimationFrame(function () {
          const currentY = window.scrollY;

          if (currentY > 80) {
            nav.classList.add('is-scrolled');
          } else {
            nav.classList.remove('is-scrolled');
          }

          if (currentY > lastScrollY && currentY > 80) {
            nav.classList.add('is-hidden');
          } else {
            nav.classList.remove('is-hidden');
          }

          lastScrollY = currentY;
          ticking = false;
        });
        ticking = true;
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true });
  }

  // ─── 7. MOBILE MENU ───────────────────────────────────────
  function initMobileMenu() {
    const menuBtn    = qs('#menuBtn');
    const mobileMenu = qs('#mobileMenu');
    if (!menuBtn || !mobileMenu) return;

    menuBtn.addEventListener('click', function () {
      menuBtn.classList.toggle('is-active');
      mobileMenu.classList.toggle('is-open');
    });

    const links = qsa('a', mobileMenu);
    links.forEach(function (link) {
      link.addEventListener('click', function () {
        menuBtn.classList.remove('is-active');
        mobileMenu.classList.remove('is-open');
      });
    });
  }

  // ─── 8. SCROLL REVEAL ─────────────────────────────────────
  function initScrollReveal() {
    const revealEls = qsa('[data-scroll-reveal]');
    revealEls.forEach(function (el) {
      ScrollTrigger.create({
        trigger: el,
        start: 'top 90%',
        once: true,
        onEnter() {
          el.classList.add('is-visible');
        }
      });
    });

    const headingLines = qsa('.heading-line span');
    headingLines.forEach(function (span) {
      gsap.fromTo(span,
        { y: '110%' },
        {
          y: '0%',
          duration: 1,
          ease: 'power4.out',
          scrollTrigger: {
            trigger: span.closest('.heading-line') || span,
            start: 'top 90%',
            once: true
          }
        }
      );
    });

    const cards = qsa('[data-scroll-reveal-card]');
    cards.forEach(function (card) {
      ScrollTrigger.create({
        trigger: card,
        start: 'top 92%',
        once: true,
        onEnter() {
          card.classList.add('is-visible');
        }
      });
    });
  }

  // ─── 9. VIDEO PREVIEW & HOVER PLAY (WITH AUTOPLAY SHOWCASE) ───
  function initVideoHover() {
    const workCards = qsa('.work-card');

    workCards.forEach(function (card) {
      const video = qs('.work-card-video', card);
      const placeholderImg = qs('.work-card-placeholder .work-card-img', card);

      if (placeholderImg) {
        attachImageFallback(placeholderImg);
        placeholderImg.addEventListener('error', function () {
          const holder = placeholderImg.closest('.work-card-placeholder');
          if (holder) holder.style.display = 'none';
        });
      }

      if (!video) return;

      // If this is the Amelie showcase card, play it right away and keep it playing continuously
      if (video.getAttribute('data-autoplay-always') === 'true') {
        video.play().catch(function () {});
        return;
      }

      const previewStart = parseFloat(video.getAttribute('data-preview-start')) || 0.5;

      function setToPreviewTime() {
        try {
          if (video.readyState >= 1) {
            video.currentTime = previewStart;
          }
        } catch (e) {}
      }

      video.addEventListener('loadedmetadata', setToPreviewTime, { once: true });

      card.addEventListener('mouseenter', function () {
        if (Math.abs(video.currentTime - previewStart) > 0.5 && video.paused) {
          setToPreviewTime();
        }
        video.play().catch(function () {});
      });

      card.addEventListener('mouseleave', function () {
        video.pause();
        setToPreviewTime();
      });
    });
  }

  // ─── 9B. CONSTANT IMAGE SLIDERS (3D Room, Portrait, Nature) ───
  function initConstantSliders() {
    qsa('.work-card-img, .work-card-slide-img').forEach(attachImageFallback);

    const sliderCards = qsa('.work-card--slider');

    sliderCards.forEach(function (card, cardIdx) {
      const track  = qs('.work-card-slider-track', card);
      const slides = qsa('.work-card-slide-img', card);
      const dots   = qsa('.slider-dot', card);
      const link   = qs('.work-card-link', card);
      if (!track || slides.length < 2) return;

      let currentIndex = 0;

      function goToSlide(index) {
        currentIndex = ((index % slides.length) + slides.length) % slides.length;
        track.style.transform = 'translateX(-' + (currentIndex * 100) + '%)';
        dots.forEach(function (dot, i) {
          dot.classList.toggle('is-active', i === currentIndex);
        });
        card.dataset.activeSlideIndex = String(currentIndex);
        if (link && slides[currentIndex]) {
          link.setAttribute('data-image-src', slides[currentIndex].getAttribute('src'));
        }
      }

      card.dataset.activeSlideIndex = '0';

      // Constant automatic sliding (staggered slightly per card so they feel organic)
      setTimeout(function () {
        setInterval(function () {
          goToSlide(currentIndex + 1);
        }, 2500);
      }, cardIdx * 400);
    });
  }

  // ─── 10. ABOUT SECTION LIVING PORTRAIT UNMUTE BUTTON ──────
  function initAboutIntroVideo() {
    const video     = qs('#aboutIntroVideo');
    const unmuteBtn = qs('#aboutUnmuteBtn');
    const iconEl    = qs('#aboutUnmuteIcon');
    const textEl    = qs('#aboutUnmuteText');
    if (!video || !unmuteBtn) return;

    video.play().catch(function () {});

    unmuteBtn.addEventListener('click', function () {
      if (video.muted) {
        video.muted = false;
        try {
          video.currentTime = 0;
        } catch (e) {}
        video.play().catch(function () {});
        unmuteBtn.classList.add('is-unmuted');
        if (iconEl) iconEl.textContent = '🔇';
        if (textEl) textEl.textContent = 'Mute Video';
      } else {
        video.muted = true;
        unmuteBtn.classList.remove('is-unmuted');
        if (iconEl) iconEl.textContent = '🔊';
        if (textEl) textEl.textContent = 'Click to Unmute & Listen';
      }
    });
  }

  // ─── 11. VIDEO MODAL (ALWAYS PLAYS FROM 0:00 FULLSCREEN) ──
  function initVideoModal() {
    const modal      = qs('#videoModal');
    if (!modal) return;

    const modalVideo = qs('#videoModalPlayer', modal) || qs('video', modal);
    const closeBtn   = qs('#videoModalClose', modal) || qs('.video-modal-close', modal);
    const backdrop   = qs('#videoModalBackdrop', modal) || qs('.video-modal-backdrop', modal);
    const triggers   = qsa('.work-card-link[data-video-src]');

    function openModal(rawSrc) {
      if (modalVideo) {
        const cleanSrc = rawSrc.split('#')[0];
        modalVideo.src = encodeURI(cleanSrc);
        modalVideo.load();
        modalVideo.addEventListener('loadedmetadata', function () {
          try {
            modalVideo.currentTime = 0;
          } catch (e) {}
        }, { once: true });
        modalVideo.play().catch(function () {});
      }
      modal.classList.add('is-open');
      modal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    }

    function closeModal() {
      modal.classList.remove('is-open');
      modal.setAttribute('aria-hidden', 'true');
      if (modalVideo) {
        modalVideo.pause();
        modalVideo.removeAttribute('src');
        modalVideo.load();
      }
      document.body.style.overflow = '';
    }

    triggers.forEach(function (link) {
      link.addEventListener('click', function (e) {
        e.preventDefault();
        const src = link.getAttribute('data-video-src');
        if (src) openModal(src);
      });
    });

    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (backdrop) backdrop.addEventListener('click', closeModal);

    modal.addEventListener('click', function (e) {
      if (e.target === modal) closeModal();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && modal.classList.contains('is-open')) {
        closeModal();
      }
    });
  }

  // ─── 12. IMAGE MODAL WITH PREV/NEXT GALLERY & FULL-SIZE ZOOM ───
  function initImageModal() {
    const modal       = qs('#imageModal');
    if (!modal) return;

    const modalImg    = qs('#imageModalImg', modal) || qs('img', modal);
    const stage       = qs('#imageModalStage', modal);
    const prevBtn     = qs('#imageModalPrev', modal);
    const nextBtn     = qs('#imageModalNext', modal);
    const counterEl   = qs('#imageModalCounter', modal);
    const fullResBtn  = qs('#imageModalFullRes', modal);
    const closeBtn    = qs('#imageModalClose', modal) || qs('.image-modal-close', modal);
    const backdrop    = qs('#imageModalBackdrop', modal) || qs('.image-modal-backdrop', modal);
    const titleEl     = qs('#imageModalTitle', modal);
    const catEl       = qs('#imageModalCategory', modal);
    const descEl      = qs('#imageModalDesc', modal);
    const toolsEl     = qs('#imageModalTools', modal);

    attachImageFallback(modalImg);

    const triggers = qsa('.work-card-link[data-image-src]');

    let gallerySources = [];
    let currentGalleryIndex = 0;
    let currentModalTitle = '';

    function renderCurrentGalleryImage() {
      if (!gallerySources.length) return;
      currentGalleryIndex = ((currentGalleryIndex % gallerySources.length) + gallerySources.length) % gallerySources.length;
      const activeSrc = gallerySources[currentGalleryIndex];

      if (stage) stage.classList.remove('is-zoomed');

      if (modalImg) {
        delete modalImg.dataset.triedFallback;
        modalImg.src = activeSrc;
        modalImg.alt = currentModalTitle
          ? currentModalTitle + ' (' + (currentGalleryIndex + 1) + '/' + gallerySources.length + ')'
          : 'Project image';
      }

      if (fullResBtn) {
        fullResBtn.href = activeSrc;
      }

      const hasMultiple = gallerySources.length > 1;
      if (prevBtn) prevBtn.classList.toggle('is-hidden', !hasMultiple);
      if (nextBtn) nextBtn.classList.toggle('is-hidden', !hasMultiple);
      if (counterEl) {
        counterEl.classList.toggle('is-hidden', !hasMultiple);
        if (hasMultiple) {
          counterEl.textContent = (currentGalleryIndex + 1) + ' / ' + gallerySources.length;
        }
      }
    }

    function openModal(link) {
      const card = link.closest('.work-card');
      const clickedSrc = link.getAttribute('data-image-src');

      const slideImgs = card ? qsa('.work-card-slide-img', card) : [];
      if (slideImgs.length > 1) {
        gallerySources = slideImgs.map(function (img) {
          return img.getAttribute('src');
        }).filter(Boolean);
        const activeIdx = parseInt(card.dataset.activeSlideIndex || '0', 10);
        const matchedIdx = gallerySources.indexOf(clickedSrc);
        currentGalleryIndex = matchedIdx !== -1 ? matchedIdx : (isNaN(activeIdx) ? 0 : activeIdx);
      } else {
        gallerySources = clickedSrc ? [clickedSrc] : [];
        currentGalleryIndex = 0;
      }

      const fallbackTitle = card ? (qs('.work-card-title', card)?.textContent || '') : '';
      const fallbackCat   = card ? (qs('.work-card-category', card)?.textContent || '') : '';
      const fallbackYear  = card ? (qs('.work-card-year', card)?.textContent || '') : '';
      const fallbackDesc  = card ? (qs('.work-card-desc', card)?.textContent || '') : '';

      const title    = link.getAttribute('data-detail-title') || fallbackTitle;
      const category = link.getAttribute('data-detail-category') || (fallbackCat + (fallbackYear ? ' — ' + fallbackYear : ''));
      const desc     = link.getAttribute('data-detail-desc') || fallbackDesc;
      const toolsStr = link.getAttribute('data-detail-tools') || '';

      currentModalTitle = title;

      if (titleEl) titleEl.textContent = title;
      if (catEl)   catEl.textContent = category;
      if (descEl)  descEl.textContent = desc;

      if (toolsEl) {
        toolsEl.innerHTML = '';
        if (toolsStr) {
          toolsStr.split(',').forEach(function (tool) {
            const span = document.createElement('span');
            span.textContent = tool.trim();
            toolsEl.appendChild(span);
          });
        }
      }

      renderCurrentGalleryImage();

      modal.classList.add('is-open');
      modal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    }

    function closeModal() {
      modal.classList.remove('is-open');
      modal.setAttribute('aria-hidden', 'true');
      if (stage) stage.classList.remove('is-zoomed');
      if (modalImg) modalImg.src = '';
      gallerySources = [];
      document.body.style.overflow = '';
    }

    if (prevBtn) {
      prevBtn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (gallerySources.length > 1) {
          currentGalleryIndex -= 1;
          renderCurrentGalleryImage();
        }
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (gallerySources.length > 1) {
          currentGalleryIndex += 1;
          renderCurrentGalleryImage();
        }
      });
    }

    if (modalImg && stage) {
      modalImg.addEventListener('click', function (e) {
        e.stopPropagation();
        stage.classList.toggle('is-zoomed');
      });
    }

    triggers.forEach(function (link) {
      link.addEventListener('click', function (e) {
        e.preventDefault();
        openModal(link);
      });
    });

    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (backdrop) backdrop.addEventListener('click', closeModal);

    modal.addEventListener('click', function (e) {
      if (e.target === modal) closeModal();
    });

    document.addEventListener('keydown', function (e) {
      if (!modal.classList.contains('is-open')) return;
      if (e.key === 'Escape') {
        closeModal();
      } else if (e.key === 'ArrowLeft' && gallerySources.length > 1) {
        e.preventDefault();
        currentGalleryIndex -= 1;
        renderCurrentGalleryImage();
      } else if (e.key === 'ArrowRight' && gallerySources.length > 1) {
        e.preventDefault();
        currentGalleryIndex += 1;
        renderCurrentGalleryImage();
      }
    });
  }

  // ─── 13. PROJECT DETAIL PANEL ─────────────────────────────
  function initProjectDetail() {
    const panel          = qs('#projectDetail');
    if (!panel) return;

    const closeBtn       = qs('#projectDetailClose', panel) || qs('.project-detail-close', panel);
    const backdrop       = qs('#projectDetailBackdrop', panel) || qs('.project-detail-backdrop', panel);
    const titleEl        = qs('#detailTitle', panel);
    const catEl          = qs('#detailCategory', panel);
    const descEl         = qs('#detailDesc', panel);
    const linkContainer  = qs('#detailLinkContainer', panel);
    const toolsEl        = qs('#detailTools', panel);
    const mediaContainer = qs('#detailMediaContainer', panel);

    const triggers = qsa('button.work-card-info-btn');

    function openPanel(btn) {
      const title       = btn.getAttribute('data-detail-title') || '';
      const category    = btn.getAttribute('data-detail-category') || '';
      const description = btn.getAttribute('data-detail-desc') || '';
      const extLink     = btn.getAttribute('data-detail-link') || '';
      const extLabel    = btn.getAttribute('data-detail-link-label') || 'View External Link ↗';
      const toolsStr    = btn.getAttribute('data-detail-tools') || '';
      const videosStr   = btn.getAttribute('data-detail-videos') || '';
      const labelsStr   = btn.getAttribute('data-detail-video-labels') || '';
      const imagesStr   = btn.getAttribute('data-detail-images') || '';

      if (titleEl) titleEl.textContent = title;
      if (catEl)   catEl.textContent = category;
      if (descEl)  descEl.textContent = description;

      if (linkContainer) {
        linkContainer.innerHTML = '';
        if (extLink) {
          const a = document.createElement('a');
          a.href = extLink;
          a.target = '_blank';
          a.rel = 'noopener';
          a.className = 'project-detail-ext-link';
          a.textContent = extLabel;
          linkContainer.appendChild(a);
        }
      }

      if (toolsEl) {
        toolsEl.innerHTML = '';
        if (toolsStr) {
          toolsStr.split(',').forEach(function (tool) {
            const span = document.createElement('span');
            span.textContent = tool.trim();
            toolsEl.appendChild(span);
          });
        }
      }

      if (mediaContainer) {
        mediaContainer.innerHTML = '';

        if (videosStr) {
          const videos = videosStr.split(',').map(s => s.trim()).filter(Boolean);
          const labels = labelsStr ? labelsStr.split(',').map(s => s.trim()) : [];

          videos.forEach(function (vSrc, idx) {
            const wrap = document.createElement('div');
            wrap.className = 'project-detail-media';

            if (labels[idx]) {
              const label = document.createElement('p');
              label.style.cssText = 'font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--color-accent); margin-bottom: 8px;';
              label.textContent = labels[idx];
              wrap.appendChild(label);
            }

            const vid = document.createElement('video');
            vid.controls = true;
            vid.playsInline = true;
            vid.preload = 'metadata';
            vid.src = encodeURI(vSrc);
            wrap.appendChild(vid);
            mediaContainer.appendChild(wrap);
          });
        }

        if (imagesStr) {
          const images = imagesStr.split(',').map(s => s.trim()).filter(Boolean);
          images.forEach(function (imgSrc) {
            const wrap = document.createElement('div');
            wrap.className = 'project-detail-media';
            const img = document.createElement('img');
            attachImageFallback(img);
            img.src = imgSrc;
            img.alt = title + ' still';
            img.loading = 'lazy';
            wrap.appendChild(img);
            mediaContainer.appendChild(wrap);
          });
        }
      }

      panel.classList.add('is-open');
      panel.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    }

    function closePanel() {
      panel.classList.remove('is-open');
      panel.setAttribute('aria-hidden', 'true');
      if (mediaContainer) {
        qsa('video', mediaContainer).forEach(function (v) {
          v.pause();
        });
      }
      document.body.style.overflow = '';
    }

    triggers.forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        openPanel(btn);
      });
    });

    if (closeBtn) closeBtn.addEventListener('click', closePanel);
    if (backdrop) backdrop.addEventListener('click', closePanel);

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && panel.classList.contains('is-open')) {
        closePanel();
      }
    });
  }

  // ─── 14. CATEGORY FILTER (GROUPS HORIZONTALS & VERTICALS CLEANLY) ───
  function initCategoryFilter() {
    const filterBtns = qsa('.filter-btn');
    const grid       = qs('.works-grid');
    const workCards  = qsa('.work-card');
    if (!filterBtns.length || !workCards.length || !grid) return;

    // Remember original DOM order for "All"
    workCards.forEach(function (card, idx) {
      card.dataset.originalOrder = String(idx);
    });

    filterBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        filterBtns.forEach(function (b) {
          b.classList.remove('is-active');
        });
        btn.classList.add('is-active');

        const filter = btn.getAttribute('data-filter');

        workCards.forEach(function (card) {
          const rawCategories = card.getAttribute('data-category') || '';
          const categories = rawCategories.trim().split(/\s+/);

          if (filter === 'all' || categories.includes(filter)) {
            card.classList.remove('is-hidden');
            card.classList.add('is-visible');
          } else {
            card.classList.add('is-hidden');
          }

          // When filtering a specific category, group horizontal cards together first and vertical cards together below so they never mix in the same row
          if (filter === 'all') {
            card.style.order = '';
          } else {
            card.style.order = card.classList.contains('work-card--vertical') ? '2' : '1';
          }
        });

        ScrollTrigger.refresh();
      });
    });
  }

  // ─── 15. SMOOTH SCROLL ANCHORS ────────────────────────────
  function initSmoothScroll() {
    const links = qsa('a[href^="#"]');

    links.forEach(function (link) {
      link.addEventListener('click', function (e) {
        const hash = link.getAttribute('href');
        if (hash === '#' || hash === '') return;

        const target = qs(hash);
        if (!target) return;

        e.preventDefault();
        const offset = target.getBoundingClientRect().top + window.scrollY - 80;

        window.scrollTo({
          top: offset,
          behavior: 'smooth'
        });
      });
    });
  }

  // ─── 16. BACK TO TOP ──────────────────────────────────────
  function initBackToTop() {
    const btn = qs('#backToTop');
    if (!btn) return;

    btn.addEventListener('click', function (e) {
      e.preventDefault();
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    });
  }

  // ─── 17. MARQUEE SPEED (FASTER BASE + SMOOTH SCROLL BOOST) ──
  function initMarqueeSpeed() {
    const tracks = qsa('.marquee-track');
    if (!tracks.length) return;

    let scrollVelocity = 0;
    let lastScrollY = window.scrollY;

    function onScroll() {
      const currentY = window.scrollY;
      scrollVelocity = Math.abs(currentY - lastScrollY);
      lastScrollY = currentY;
    }

    window.addEventListener('scroll', onScroll, { passive: true });

    function updateMarquee() {
      const rate = clamp(1.3 + scrollVelocity * 0.012, 1.3, 2.2);
      scrollVelocity *= 0.9;

      tracks.forEach(function (track) {
        if (typeof track.getAnimations === 'function') {
          track.getAnimations().forEach(function (anim) {
            anim.playbackRate = rate;
          });
        }
      });

      requestAnimationFrame(updateMarquee);
    }

    requestAnimationFrame(updateMarquee);
  }

  // ─── INIT ─────────────────────────────────────────────────
  function init() {
    gsap.registerPlugin(ScrollTrigger);

    initPreloader();
    initLetterbox();
    initCursor();
    initMagneticButtons();
    initNavigation();
    initMobileMenu();
    initScrollReveal();
    initVideoHover();
    initConstantSliders();
    initAboutIntroVideo();
    initVideoModal();
    initImageModal();
    initProjectDetail();
    initCategoryFilter();
    initSmoothScroll();
    initBackToTop();
    initMarqueeSpeed();
  }

  document.addEventListener('DOMContentLoaded', init);

})();