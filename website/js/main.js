(function () {
  'use strict';

  // ─── Helpers ───────────────────────────────────────────────
  const qs  = (sel, ctx = document) => ctx.querySelector(sel);
  const qsa = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
  const lerp  = (a, b, n) => a + (b - a) * n;
  const clamp = (v, min, max) => Math.min(Math.max(v, min), max);
  const hasGSAP = () => typeof window.gsap !== 'undefined';
  const hasScrollTrigger = () => typeof window.ScrollTrigger !== 'undefined';

  // Request highest available YouTube resolution (4K / 2K / 1080p) & optionally disable captions via IFrame API
  function requestHighestYouTubeQuality(iframe, disableCaptions) {
    if (!iframe) return;
    function sendQualityHints() {
      try {
        if (!iframe.contentWindow) return;
        ['hd2160', 'hd1440', 'hd1080', 'highres'].forEach(function (q) {
          iframe.contentWindow.postMessage(JSON.stringify({
            event: 'command',
            func: 'setPlaybackQuality',
            args: [q]
          }), '*');
        });
        try {
          iframe.contentWindow.postMessage(JSON.stringify({ event: 'listening' }), '*');
        } catch (err) {}
        if (disableCaptions) {
          ['captions', 'cc'].forEach(function (mod) {
            iframe.contentWindow.postMessage(JSON.stringify({
              event: 'command',
              func: 'unloadModule',
              args: [mod]
            }), '*');
            iframe.contentWindow.postMessage(JSON.stringify({
              event: 'command',
              func: 'setOption',
              args: [mod, 'track', {}]
            }), '*');
          });
        }
      } catch (e) {}
    }
    iframe.addEventListener('load', function () {
      sendQualityHints();
      setTimeout(sendQualityHints, 350);
      setTimeout(sendQualityHints, 900);
      setTimeout(sendQualityHints, 1800);
      setTimeout(sendQualityHints, 3200);
    });
  }

  // Automatic file extension & folder fallback for images
  function attachImageFallback(img) {
    if (!img) return;
    img.addEventListener('error', function onImgError() {
      const currentSrc = img.getAttribute('src') || '';
      const step = parseInt(img.dataset.fallbackStep || '0', 10);

      if (step === 0) {
        img.dataset.fallbackStep = '1';
        if (currentSrc.endsWith('.JPG')) {
          img.src = currentSrc.slice(0, -4) + '.jpg';
        } else if (currentSrc.endsWith('.jpg')) {
          img.src = currentSrc.slice(0, -4) + '.JPG';
        } else if (currentSrc.endsWith('.PNG')) {
          img.src = currentSrc.slice(0, -4) + '.png';
        } else if (currentSrc.endsWith('.png')) {
          img.src = currentSrc.slice(0, -4) + '.PNG';
        } else if (currentSrc.includes('maxresdefault.jpg')) {
          img.src = currentSrc.replace('maxresdefault.jpg', 'hqdefault.jpg');
        }
      } else if (step === 1) {
        img.dataset.fallbackStep = '2';
        const parts = currentSrc.split('/');
        const fileName = parts[parts.length - 1];
        if (parts.length > 2 && parts[0] === 'assets') {
          img.src = 'assets/' + fileName;
        }
      }
    });
  }

  // ─── SHARED PASSIVE SCROLL PIPELINE (SINGLE LISTENER) ─────
  const scrollSubscribers = [];
  let scrollRafPending = false;
  window.addEventListener('scroll', function () {
    if (!scrollRafPending) {
      scrollRafPending = true;
      requestAnimationFrame(function () {
        scrollRafPending = false;
        const y = window.scrollY;
        for (let i = 0; i < scrollSubscribers.length; i++) {
          scrollSubscribers[i](y);
        }
      });
    }
  }, { passive: true });

  function onPassiveScroll(fn) {
    scrollSubscribers.push(fn);
  }

  // ─── 1. CRASH-PROOF PRELOADER ─────────────────────────────
  function initPreloader() {
    const preloader  = qs('#preloader') || qs('.preloader');
    const counter    = qs('#preloaderCounter') || qs('.preloader-counter');
    const progressEl = qs('#preloaderProgress') || qs('.preloader-progress');

    if (window.__preloaderTimer) {
      clearInterval(window.__preloaderTimer);
      window.__preloaderTimer = null;
    }

    if (!preloader || preloader.classList.contains('is-done')) {
      initHeroEntrance();
      return;
    }

    let finished = false;
    let current = parseInt(counter ? counter.textContent : '0', 10) || 0;

    function completePreloader() {
      if (finished) return;
      finished = true;

      if (counter) counter.textContent = '100';
      if (progressEl) progressEl.style.width = '100%';

      preloader.classList.add('is-done');
      document.body.classList.add('is-loaded');

      setTimeout(function () {
        preloader.style.display = 'none';
        initHeroEntrance();
      }, 550);
    }

    // Use setInterval so it ticks reliably even if tab is backgrounded or rAF is throttled
    const timer = setInterval(function () {
      current += 5;
      if (current >= 100) {
        current = 100;
        clearInterval(timer);
        completePreloader();
      } else {
        if (counter) counter.textContent = String(current);
        if (progressEl) progressEl.style.width = current + '%';
      }
    }, 45);

    // Hard fail-safe: guarantee preloader closes within 2.2s under all conditions
    setTimeout(function () {
      clearInterval(timer);
      completePreloader();
    }, 2200);
  }

  // ─── 2. HERO ENTRANCE ─────────────────────────────────────
  function initHeroEntrance() {
    document.body.classList.add('is-loaded');

    if (!hasGSAP()) return;

    const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });

    tl.to('.hero-line-inner', {
      y: '0%',
      duration: 1.1,
      stagger: 0.1,
      onComplete: function () {
        // Release overflow after entrance animation to prevent clipping of text shadows / outlines
        qsa('.hero-line').forEach(function (el) {
          el.style.overflow = 'visible';
        });
      }
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

  // Shared hook so day/night scroll progress can wake the Dusk/Midnight starfield
  let setStarfieldProgress = function () {};

  // ─── 3. SCROLL-DRIVEN DAY-TO-NIGHT BG VIDEO, SKY PALETTE & TIMECODE ────
  function initDayNightScrollExperience() {
    const bgVideo       = qs('#bgDayVideo');
    const bgMobileVideo = qs('#bgMobileVideo');
    const progressEl = qs('#timecodeProgress');
    const playheadEl = qs('#timecodePlayhead');
    const readoutEl  = qs('#timecodeReadout');
    const phaseEl    = qs('#timecodePhase');
    const railEl     = qs('#timecodeRail');
    const trackEl    = qs('#timecodeTrack');
    const rootStyle  = document.documentElement.style;

    let videoDuration = 8.0;
    let targetProgress = 0;
    let smoothProgress = 0;
    let isDraggingTrack = false;
    var hasUserScrolled = false;

    // 6-phase Sky Color Keyframes matching BGvideo.mp4 progression
    const SKY_STOPS = [
      {
        p: 0.00, // DAWN (rose gold, peach mist, warm plum halo)
        accent: [255, 214, 165],
        accent2: [243, 196, 251],
        cardBg: [255, 238, 232, 0.16],
        cardHover: [255, 244, 238, 0.25],
        glassStrong: [52, 34, 68, 0.42],
        halo: [38, 22, 54, 0.34]
      },
      {
        p: 0.24, // MORNING (sunlit pearl, sky azure, airy mist)
        accent: [255, 226, 158],
        accent2: [186, 228, 255],
        cardBg: [240, 248, 255, 0.17],
        cardHover: [248, 252, 255, 0.26],
        glassStrong: [36, 54, 82, 0.40],
        halo: [24, 40, 68, 0.32]
      },
      {
        p: 0.50, // HIGH NOON (crisp alabaster, celestial cyan, cloud glass)
        accent: [178, 235, 255],
        accent2: [255, 232, 178],
        cardBg: [238, 248, 255, 0.18],
        cardHover: [250, 253, 255, 0.27],
        glassStrong: [30, 52, 84, 0.42],
        halo: [20, 38, 66, 0.32]
      },
      {
        p: 0.72, // GOLDEN HOUR (amber nectar, coral horizon, warm violet shadow)
        accent: [255, 190, 128],
        accent2: [255, 168, 208],
        cardBg: [255, 226, 210, 0.16],
        cardHover: [255, 236, 224, 0.25],
        glassStrong: [62, 32, 58, 0.45],
        halo: [46, 20, 48, 0.38]
      },
      {
        p: 0.88, // DUSK (twilight lavender, magenta dusk, deep indigo mist)
        accent: [226, 180, 255],
        accent2: [255, 172, 198],
        cardBg: [216, 198, 255, 0.15],
        cardHover: [232, 218, 255, 0.24],
        glassStrong: [34, 24, 62, 0.50],
        halo: [22, 14, 46, 0.44]
      },
      {
        p: 1.00, // MIDNIGHT (starlight violet, silver-blue, nocturnal glass)
        accent: [198, 178, 255],
        accent2: [148, 210, 255],
        cardBg: [190, 200, 255, 0.13],
        cardHover: [215, 222, 255, 0.22],
        glassStrong: [18, 16, 38, 0.56],
        halo: [10, 8, 26, 0.50]
      }
    ];

    function lerpArr(a, b, t) {
      return a.map(function (v, idx) {
        return v + (b[idx] - v) * t;
      });
    }

    function updateSkyPalette(p) {
      let lower = SKY_STOPS[0];
      let upper = SKY_STOPS[SKY_STOPS.length - 1];
      for (let i = 0; i < SKY_STOPS.length - 1; i++) {
        if (p >= SKY_STOPS[i].p && p <= SKY_STOPS[i + 1].p) {
          lower = SKY_STOPS[i];
          upper = SKY_STOPS[i + 1];
          break;
        }
      }
      const span = Math.max(upper.p - lower.p, 0.0001);
      const localT = clamp((p - lower.p) / span, 0, 1);

      const acc  = lerpArr(lower.accent, upper.accent, localT).map(Math.round);
      const acc2 = lerpArr(lower.accent2, upper.accent2, localT).map(Math.round);
      const cBg  = lerpArr(lower.cardBg, upper.cardBg, localT);
      const cHov = lerpArr(lower.cardHover, upper.cardHover, localT);
      const gls  = lerpArr(lower.glassStrong, upper.glassStrong, localT);
      const hlo  = lerpArr(lower.halo, upper.halo, localT);

      rootStyle.setProperty('--color-accent', `rgb(${acc[0]}, ${acc[1]}, ${acc[2]})`);
      rootStyle.setProperty('--color-accent-2', `rgb(${acc2[0]}, ${acc2[1]}, ${acc2[2]})`);
      rootStyle.setProperty('--color-accent-glow', `rgba(${acc[0]}, ${acc[1]}, ${acc[2]}, 0.22)`);
      rootStyle.setProperty('--color-bg-card', `rgba(${Math.round(cBg[0])}, ${Math.round(cBg[1])}, ${Math.round(cBg[2])}, ${cBg[3].toFixed(3)})`);
      rootStyle.setProperty('--color-bg-card-hover', `rgba(${Math.round(cHov[0])}, ${Math.round(cHov[1])}, ${Math.round(cHov[2])}, ${cHov[3].toFixed(3)})`);
      rootStyle.setProperty('--sky-glass-strong', `rgba(${Math.round(gls[0])}, ${Math.round(gls[1])}, ${Math.round(gls[2])}, ${gls[3].toFixed(3)})`);
      rootStyle.setProperty('--sky-halo', `rgba(${Math.round(hlo[0])}, ${Math.round(hlo[1])}, ${Math.round(hlo[2])}, ${hlo[3].toFixed(3)})`);

      // ── Arcing Sun-to-Moon Celestial Position & Directional Card Rim Lighting ──
      // Daytime sun arcs from East (16%, 68%) -> Zenith Noon (50%, 12%) -> West Dusk (84%, 72%),
      // then transitions into a high nocturnal moon/starlight glow (72%, 22%) at Midnight.
      let celestialX = 50;
      let celestialY = 20;
      if (p <= 0.86) {
        const sunNorm = clamp(p / 0.86, 0, 1);
        celestialX = 16 + sunNorm * 68;
        celestialY = 70 - Math.sin(sunNorm * Math.PI) * 58;
      } else {
        const nightT = clamp((p - 0.86) / 0.14, 0, 1);
        celestialX = lerp(84, 72, nightT);
        celestialY = lerp(70, 22, nightT);
      }

      // Normalize light direction relative to screen center (-1 = left/top, +1 = right/bottom)
      const lightDirX = clamp((celestialX - 50) / 34, -1, 1);
      const lightDirY = clamp((celestialY - 40) / 30, -1, 1);

      // Specular rim inset highlights the card edge facing the sun/moon
      const rimInsetX = (lightDirX * 1.65).toFixed(2) + 'px';
      const rimInsetY = (lightDirY * 1.55).toFixed(2) + 'px';
      // Cast shadow falls on the opposite side of the sun/moon
      const castShadowX = (-lightDirX * 12).toFixed(1) + 'px';

      const rimAlpha = p > 0.86 ? 0.44 : 0.56;
      const washAlpha = p > 0.86 ? 0.11 : 0.16;
      const celestialAlpha = p > 0.86 ? 0.16 : 0.25;
      const coreR = Math.min(255, acc[0] + 28);
      const coreG = Math.min(255, acc[1] + 28);
      const coreB = Math.min(255, acc[2] + 28);

      rootStyle.setProperty('--celestial-x', celestialX.toFixed(1) + '%');
      rootStyle.setProperty('--celestial-y', celestialY.toFixed(1) + '%');
      rootStyle.setProperty('--celestial-color', `rgba(${acc[0]}, ${acc[1]}, ${acc[2]}, ${celestialAlpha})`);
      rootStyle.setProperty('--celestial-core', `rgba(${coreR}, ${coreG}, ${coreB}, ${(celestialAlpha * 1.45).toFixed(2)})`);
      rootStyle.setProperty('--rim-inset-x', rimInsetX);
      rootStyle.setProperty('--rim-inset-y', rimInsetY);
      rootStyle.setProperty('--rim-glow-color', `rgba(${acc[0]}, ${acc[1]}, ${acc[2]}, ${rimAlpha})`);
      rootStyle.setProperty('--rim-wash-color', `rgba(${acc[0]}, ${acc[1]}, ${acc[2]}, ${washAlpha})`);
      rootStyle.setProperty('--cast-shadow-x', castShadowX);

      setStarfieldProgress(p);
    }

    const allBgVideos = [bgVideo, bgMobileVideo].filter(Boolean);

    // If BGmobile.mp4 fails to load or is empty on mobile, fall back cleanly to desktop BGvideo.mp4
    if (bgMobileVideo && bgVideo) {
      const fallbackToDesktopVideo = function () {
        if (!bgMobileVideo.duration || !isFinite(bgMobileVideo.duration)) {
          bgMobileVideo.style.display = 'none';
          bgVideo.style.display = 'block';
        }
      };
      bgMobileVideo.addEventListener('error', fallbackToDesktopVideo);
      const mobileSrc = qs('source', bgMobileVideo);
      if (mobileSrc) mobileSrc.addEventListener('error', fallbackToDesktopVideo);
    }

    allBgVideos.forEach(function (v) {
      v.muted = true;
      v.defaultMuted = true;
      v.autoplay = false;
      v.loop = false;
      v.setAttribute('playsinline', '');
      v.setAttribute('webkit-playsinline', '');

      const onVReady = function () {
        if (v.duration && isFinite(v.duration)) {
          videoDuration = v.duration;
        }
        try {
          v.pause();
          if (!hasUserScrolled && window.scrollY <= 36) {
            v.currentTime = 0;
          }
        } catch (e) {}
      };

      v.addEventListener('loadedmetadata', onVReady);
      v.addEventListener('canplay', onVReady);
      if (v.readyState >= 1) {
        onVReady();
      }
      try { v.pause(); } catch (e) {}
    });

    let dayNightRaf = null;
    function startDayNightTick() {
      if (!dayNightRaf) {
        dayNightRaf = requestAnimationFrame(tickDayNight);
      }
    }

    function computeScrollProgress() {
      const scrollY = window.scrollY;
      if (scrollY > 36) hasUserScrolled = true;
      if (isDraggingTrack) return;
      const maxScroll = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
      // 36px top deadzone prevents micro-jitter of frame 0 at the top of the page
      if (scrollY <= 36) {
        targetProgress = 0;
      } else {
        targetProgress = clamp((scrollY - 36) / Math.max(maxScroll - 36, 1), 0, 1);
      }
      startDayNightTick();
    }

    onPassiveScroll(computeScrollProgress);
    window.addEventListener('resize', computeScrollProgress, { passive: true });

    // ── Interactive Scrub & Drag on the Timecode Rail ──
    function scrubToEvent(e) {
      if (!trackEl) return;
      hasUserScrolled = true;
      const rect = trackEl.getBoundingClientRect();
      if (rect.height <= 0) return;
      const clientY = (e.clientY != null) ? e.clientY : (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
      const ratio = clamp((clientY - rect.top) / rect.height, 0, 1);
      const maxScroll = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
      const targetY = ratio * maxScroll;

      targetProgress = ratio;
      startDayNightTick();
      if (isDraggingTrack) {
        window.scrollTo(0, targetY);
      } else {
        window.scrollTo({ top: targetY, behavior: 'smooth' });
      }
    }

    if (trackEl && railEl) {
      trackEl.addEventListener('pointerdown', function (e) {
        if (e.button !== undefined && e.button !== 0) return;
        isDraggingTrack = true;
        try {
          trackEl.setPointerCapture(e.pointerId);
        } catch (err) {}
        railEl.classList.add('is-dragging');
        document.body.classList.add('is-scrubbing');
        scrubToEvent(e);
      });

      trackEl.addEventListener('pointermove', function (e) {
        if (!isDraggingTrack) return;
        scrubToEvent(e);
      });

      const onPointerEnd = function (e) {
        if (!isDraggingTrack) return;
        isDraggingTrack = false;
        try {
          if (e && e.pointerId != null) {
            trackEl.releasePointerCapture(e.pointerId);
          }
        } catch (err) {}
        railEl.classList.remove('is-dragging');
        document.body.classList.remove('is-scrubbing');
        startDayNightTick();
      };

      trackEl.addEventListener('pointerup', onPointerEnd);
      trackEl.addEventListener('pointercancel', onPointerEnd);
      window.addEventListener('pointerup', onPointerEnd);
    }

    function formatTimecode(progress) {
      const totalSecondsInDay = 86399; // 23:59:59
      const currentSeconds = Math.floor(progress * totalSecondsInDay);
      const hrs  = Math.floor(currentSeconds / 3600);
      const mins = Math.floor((currentSeconds % 3600) / 60);
      const secs = currentSeconds % 60;
      const pad = n => (n < 10 ? '0' + n : String(n));
      return pad(hrs) + ':' + pad(mins) + ':' + pad(secs);
    }

    function getDayPhase(progress) {
      if (progress < 0.16) return 'DAWN';
      if (progress < 0.36) return 'MORNING';
      if (progress < 0.58) return 'HIGH NOON';
      if (progress < 0.78) return 'GOLDEN HOUR';
      if (progress < 0.90) return 'DUSK';
      return 'MIDNIGHT';
    }

    let lastPaletteProgress = -1;
    let lastSeekTime = 0;

    function getActiveVideo() {
      if (bgMobileVideo && bgMobileVideo.offsetParent !== null && bgMobileVideo.duration && isFinite(bgMobileVideo.duration)) {
        return bgMobileVideo;
      }
      if (bgVideo && bgVideo.duration && isFinite(bgVideo.duration)) {
        return bgVideo;
      }
      return null;
    }

    function tickDayNight(now) {
      smoothProgress = isDraggingTrack ? targetProgress : lerp(smoothProgress, targetProgress, 0.14);
      if (Math.abs(targetProgress - smoothProgress) < 0.00015) {
        smoothProgress = targetProgress;
      }

      const pct = (smoothProgress * 100).toFixed(2) + '%';
      if (progressEl) progressEl.style.height = pct;
      if (playheadEl) playheadEl.style.top = pct;
      if (readoutEl)  readoutEl.textContent = formatTimecode(smoothProgress);
      if (phaseEl)    phaseEl.textContent = getDayPhase(smoothProgress);

      if (Math.abs(smoothProgress - lastPaletteProgress) > 0.002) {
        updateSkyPalette(smoothProgress);
        lastPaletteProgress = smoothProgress;
      }

      const activeVid = getActiveVideo();
      const ts = now || performance.now();
      if (activeVid && activeVid.readyState >= 1 && !activeVid.seeking && (ts - lastSeekTime > 42)) {
        const vDur = (activeVid.duration && isFinite(activeVid.duration)) ? activeVid.duration : videoDuration;
        const desiredTime = clamp(smoothProgress * vDur, 0, Math.max(vDur - 0.05, 0));
        if ((hasUserScrolled || isDraggingTrack) && Math.abs(activeVid.currentTime - desiredTime) > 0.06) {
          lastSeekTime = ts;
          try {
            if (typeof activeVid.fastSeek === 'function' && isDraggingTrack) {
              activeVid.fastSeek(desiredTime);
            } else {
              activeVid.currentTime = desiredTime;
            }
          } catch (e) {}
        }
      }

      if (Math.abs(targetProgress - smoothProgress) > 0.00015 || isDraggingTrack) {
        dayNightRaf = requestAnimationFrame(tickDayNight);
      } else {
        dayNightRaf = null;
      }
    }

    updateSkyPalette(0);
    if (window.scrollY > 36) {
      computeScrollProgress();
    }
  }

  // ─── 4. 3D CLOUD TUNNEL & HERO FORWARD-FLIGHT ZOOM ────────
  function initLetterbox() {
    const hero        = qs('.hero');
    const flightStage = qs('#heroFlightStage');
    const heroClouds  = qs('#heroClouds3D');
    const skyTunnel   = qs('#skyCloudTunnel');

    // Create ambient cloud wisps in the global sky tunnel
    const tunnelWisps = [];
    if (skyTunnel && !skyTunnel.children.length) {
      const wispConfigs = [
        { x: -32, y: -24, w: 540, h: 240, offset: 0.00 },
        { x:  34, y: -18, w: 600, h: 260, offset: 0.18 },
        { x: -38, y:  22, w: 580, h: 250, offset: 0.36 },
        { x:  36, y:  26, w: 520, h: 230, offset: 0.54 },
        { x: -26, y:   4, w: 640, h: 280, offset: 0.72 },
        { x:  28, y:  -6, w: 560, h: 240, offset: 0.88 }
      ];
      wispConfigs.forEach(function (cfg) {
        const wisp = document.createElement('div');
        wisp.className = 'sky-cloud-wisp';
        wisp.style.width = cfg.w + 'px';
        wisp.style.height = cfg.h + 'px';
        wisp.style.left = `calc(50% + ${cfg.x}vw - ${cfg.w / 2}px)`;
        wisp.style.top  = `calc(50% + ${cfg.y}vh - ${cfg.h / 2}px)`;
        skyTunnel.appendChild(wisp);
        tunnelWisps.push({ el: wisp, cfg: cfg });
      });
    }

    // Create subtle foreground mist layers in Hero that part as you fly forward
    const heroWispEls = [];
    if (heroClouds && !heroClouds.children.length) {
      const heroCloudData = [
        { left: '-8%',  top: '14%', w: '46vw', h: '28vh', dirX: -1, dirY: -0.4 },
        { right: '-8%', top: '18%', w: '48vw', h: '30vh', dirX:  1, dirY: -0.3 },
        { left: '6%',   top: '62%', w: '42vw', h: '24vh', dirX: -0.8, dirY: 0.5 },
        { right: '4%',  top: '58%', w: '44vw', h: '26vh', dirX:  0.8, dirY: 0.4 }
      ];
      heroCloudData.forEach(function (d) {
        const el = document.createElement('div');
        el.style.cssText = 'position:absolute;border-radius:50%;pointer-events:none;background:radial-gradient(ellipse at center, rgba(255,250,245,0.16) 0%, rgba(255,235,225,0.06) 48%, transparent 74%);filter:blur(26px);will-change:transform,opacity;';
        el.style.width = d.w;
        el.style.height = d.h;
        if (d.left) el.style.left = d.left;
        if (d.right) el.style.right = d.right;
        el.style.top = d.top;
        heroClouds.appendChild(el);
        heroWispEls.push({ el: el, dirX: d.dirX, dirY: d.dirY });
      });
    }

    function updateFlightCamera() {
      const scrollY = window.scrollY;
      const vh = Math.max(window.innerHeight, 1);

      // 1. Hero forward-flight camera pass-through (scales toward viewer & parts into mist)
      if (hero && flightStage) {
        const heroProgress = clamp(scrollY / (vh * 0.92), 0, 1);
        if (heroProgress > 0.08) {
          hero.classList.add('is-cinematic');
        } else {
          hero.classList.remove('is-cinematic');
        }

        const scale = 1 + heroProgress * 0.24;
        const zTranslate = heroProgress * 160;
        const yTranslate = -heroProgress * 36;
        const opacity = clamp(1 - Math.pow(heroProgress, 1.35) * 1.15, 0, 1);
        const blurPx = (heroProgress * 9).toFixed(2);

        flightStage.style.transform = `translate3d(0, ${yTranslate.toFixed(1)}px, ${zTranslate.toFixed(1)}px) scale(${scale.toFixed(3)})`;
        flightStage.style.opacity = opacity.toFixed(3);
        flightStage.style.filter = heroProgress > 0.02 ? `blur(${blurPx}px)` : 'none';

        heroWispEls.forEach(function (item) {
          const shiftX = item.dirX * heroProgress * 140;
          const shiftY = item.dirY * heroProgress * 90;
          const cScale = 1 + heroProgress * 0.45;
          const cOpacity = clamp(1 - heroProgress * 1.1, 0, 1);
          item.el.style.transform = `translate3d(${shiftX.toFixed(1)}px, ${shiftY.toFixed(1)}px, 0) scale(${cScale.toFixed(2)})`;
          item.el.style.opacity = cOpacity.toFixed(3);
        });
      }

      // 2. Continuous 3D Cloud Tunnel wisps cycling forward past the camera on scroll
      if (tunnelWisps.length) {
        const flightCycles = scrollY / (vh * 1.6);
        tunnelWisps.forEach(function (wispObj) {
          const cycle = (flightCycles + wispObj.cfg.offset) % 1;
          // z ranges from -700px (distant mist) to +260px (passing camera)
          const z = -700 + cycle * 960;
          const driftX = (wispObj.cfg.x > 0 ? 1 : -1) * cycle * 90;
          // Smooth bell curve opacity: 0 at 0, peaks at 0.55, 0 at 1
          const alpha = Math.sin(cycle * Math.PI) * 0.65;
          const scale = 0.65 + cycle * 0.75;
          wispObj.el.style.transform = `translate3d(${driftX.toFixed(1)}px, 0, ${z.toFixed(1)}px) scale(${scale.toFixed(2)})`;
          wispObj.el.style.opacity = clamp(alpha, 0, 0.65).toFixed(3);
        });
      }
    }

    onPassiveScroll(updateFlightCamera);
    window.addEventListener('resize', updateFlightCamera, { passive: true });
    updateFlightCamera();
  }

  // ─── 5. CUSTOM CURSOR ─────────────────────────────────────
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
    let cursorRaf = null;

    function moveCursor() {
      cursorX = lerp(cursorX, mouseX, 0.15);
      cursorY = lerp(cursorY, mouseY, 0.15);
      cursor.style.transform = 'translate3d(' + cursorX.toFixed(1) + 'px, ' + cursorY.toFixed(1) + 'px, 0)';
      if (Math.abs(mouseX - cursorX) > 0.15 || Math.abs(mouseY - cursorY) > 0.15) {
        cursorRaf = requestAnimationFrame(moveCursor);
      } else {
        cursorRaf = null;
      }
    }

    document.addEventListener('mousemove', function (e) {
      mouseX = e.clientX;
      mouseY = e.clientY;
      if (!cursorRaf) {
        cursorRaf = requestAnimationFrame(moveCursor);
      }
    }, { passive: true });

    document.addEventListener('mouseleave', function () {
      cursor.classList.add('is-hidden');
    });

    document.addEventListener('mouseenter', function () {
      cursor.classList.remove('is-hidden');
    });

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

    const scrubTargets = qsa('#timecodeRail, #timecodeTrack, #timecodePlayhead');
    scrubTargets.forEach(function (el) {
      el.addEventListener('mouseenter', function () {
        cursor.classList.add('is-scrub');
        if (cursorText) cursorText.textContent = 'DRAG';
      });
      el.addEventListener('mouseleave', function () {
        cursor.classList.remove('is-scrub');
        if (cursorText) cursorText.textContent = '';
      });
    });
  }

  // ─── 6. MAGNETIC BUTTONS ──────────────────────────────────
  function initMagneticButtons() {
    if (!hasGSAP()) return;
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

  // ─── 7. NAVIGATION ────────────────────────────────────────
  function initNavigation() {
    const nav = qs('.nav');
    if (!nav) return;

    let lastScrollY = 0;

    onPassiveScroll(function (currentY) {
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
    });
  }

  // ─── 8. MOBILE MENU ───────────────────────────────────────
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

  // ─── 9. SCROLL REVEAL & 3D Z-AXIS FORWARD-FLIGHT ENGINE ──
  let refreshFlightCards = function () {};

  function initScrollReveal() {
    const revealEls = qsa('[data-scroll-reveal]');
    const cards     = qsa('[data-scroll-reveal-card]');
    const worksSec  = qs('#works');

    revealEls.forEach(function (el) {
      if (!hasScrollTrigger()) {
        el.classList.add('is-visible');
        return;
      }
      ScrollTrigger.create({
        trigger: el,
        start: 'top 92%',
        once: true,
        onEnter() {
          el.classList.add('is-visible');
        }
      });
    });

    if (hasGSAP() && hasScrollTrigger()) {
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
              start: 'top 92%',
              once: true
            }
          }
        );
      });
    }

    cards.forEach(function (card) {
      card.classList.add('is-visible');
      card.addEventListener('mouseenter', function () {
        card.dataset.isHovered = 'true';
        if (!worksSec || !worksSec.classList.contains('is-grid-view')) {
          card.style.filter = 'none';
          card.style.opacity = '1';
        }
      });
      card.addEventListener('mouseleave', function () {
        delete card.dataset.isHovered;
        requestAnimationFrame(updateSpatialFlightRows);
      });
    });

    // Continuous 3D Z-axis emergence as user flies forward through the clouds
    function updateSpatialFlightRows() {
      const isGridView = worksSec && worksSec.classList.contains('is-grid-view');
      const vh = Math.max(window.innerHeight, 1);

      cards.forEach(function (card) {
        if (card.classList.contains('is-hidden')) return;

        // In Quick Grid mode (for HR scanning), keep all cards flat, uniform, and 100% crisp
        if (isGridView && card.closest('.works-grid')) {
          card.style.transform = '';
          card.style.opacity = '';
          card.style.filter = '';
          return;
        }

        const rect = card.getBoundingClientRect();
        const cardCenter = rect.top + rect.height * 0.5;
        // normalized position in viewport: 0 = top edge, 0.5 = center, 1 = bottom edge
        const normY = cardCenter / vh;

        let scale = 1;
        let translateZ = 0;
        let translateY = 0;
        let opacity = 1;
        let blur = 0;

        // Generous crisp focus zone (0.08 to 0.85) so projects stay sharp and easy to view
        if (normY > 0.85) {
          // Approaching from ahead in the clouds (bottom edge of viewport)
          const t = clamp((normY - 0.85) / 0.34, 0, 1);
          const easeT = t * t;
          scale = 1 - easeT * 0.12;         // 0.88 -> 1.0
          translateZ = -easeT * 150;        // -150px -> 0px
          translateY = easeT * 26;          // +26px -> 0px
          opacity = clamp(1 - easeT * 0.78, 0.22, 1);
          blur = easeT * 4.5;
        } else if (normY < 0.08) {
          // Passing above/behind the camera (top edge of viewport)
          const t = clamp((0.08 - normY) / 0.34, 0, 1);
          const easeT = t * t;
          scale = 1 + easeT * 0.03;         // 1.0 -> 1.03
          translateZ = easeT * 32;          // 0px -> +32px
          translateY = -easeT * 12;         // 0px -> -12px
          opacity = clamp(1 - easeT * 0.55, 0.42, 1);
          blur = easeT * 2.0;
        }

        if (card.dataset.isHovered === 'true') {
          blur = 0;
          opacity = 1;
          scale = Math.max(scale, 1.01);
        }

        card.style.transform = `translate3d(0, ${translateY.toFixed(1)}px, ${translateZ.toFixed(1)}px) scale(${scale.toFixed(3)})`;
        card.style.opacity = opacity.toFixed(3);
        card.style.filter = blur > 0.15 ? `blur(${blur.toFixed(2)}px)` : 'none';
      });
    }

    // Magnetic Scroll Focus Assist: gently attracts the nearest project row into focus when scrolling pauses
    let magnetTimer = null;
    let isMagnetGliding = false;
    let lastSnappedRowTop = null;

    function triggerMagneticRowFocus() {
      if (isMagnetGliding) return;
      if (!worksSec || worksSec.classList.contains('is-grid-view')) return;
      if (document.body.classList.contains('is-scrubbing')) return;
      if (document.body.style.overflow === 'hidden') return;

      const vh = Math.max(window.innerHeight, 1);
      const worksRect = worksSec.getBoundingClientRect();
      // Only active while scrolling inside the main body of the Works section
      if (worksRect.top > vh * 0.25 || worksRect.bottom < vh * 0.65) {
        lastSnappedRowTop = null;
        return;
      }

      const workGridCards = qsa('.works-grid .work-card:not(.is-hidden)');
      if (!workGridCards.length) return;

      // Ideal focal sweet-spot center (slightly below sticky command bar)
      const focalY = vh * 0.53;
      let bestCard = null;
      let bestAbsDist = Infinity;
      let bestDelta = 0;

      workGridCards.forEach(function (card) {
        const r = card.getBoundingClientRect();
        if (r.bottom < 80 || r.top > vh - 40) return;
        const center = r.top + r.height * 0.5;
        const delta = center - focalY;
        const absDist = Math.abs(delta);
        if (absDist < bestAbsDist) {
          bestAbsDist = absDist;
          bestDelta = delta;
          bestCard = card;
        }
      });

      if (!bestCard) return;

      // Absolute document top of this row so we don't repeatedly re-snap the same row on tiny nudges
      const rowDocTop = Math.round(bestCard.getBoundingClientRect().top + window.scrollY);
      const captureRadius = vh * 0.28; // ~260px magnetic capture window

      if (bestAbsDist > 16 && bestAbsDist < captureRadius) {
        if (lastSnappedRowTop !== null && Math.abs(rowDocTop - lastSnappedRowTop) < 40) {
          return;
        }
        lastSnappedRowTop = rowDocTop;
        isMagnetGliding = true;
        window.scrollTo({
          top: window.scrollY + bestDelta,
          behavior: 'smooth'
        });
        setTimeout(function () {
          isMagnetGliding = false;
        }, 520);
      } else if (bestAbsDist <= 16) {
        lastSnappedRowTop = rowDocTop;
      }
    }

    refreshFlightCards = function () {
      requestAnimationFrame(updateSpatialFlightRows);
    };

    onPassiveScroll(function () {
      updateSpatialFlightRows();
      if (!isMagnetGliding) {
        clearTimeout(magnetTimer);
        magnetTimer = setTimeout(triggerMagneticRowFocus, 150);
      }
    });
    window.addEventListener('resize', refreshFlightCards, { passive: true });
    refreshFlightCards();
  }

  // ─── 10. VIEWPORT-ONLY SHOWCASE AUTOPLAY & HOVER PREVIEWS ──
  function initVideoHover() {
    qsa('.work-card-img').forEach(attachImageFallback);

    function createCleanPreviewIframe(ytId, startSec, endSec, isVerticalCover) {
      const iframe = document.createElement('iframe');
      iframe.className = 'work-card-preview-iframe' + (isVerticalCover ? ' work-card-preview-iframe--vertical-cover' : '');
      const startParam = startSec > 0 ? `&start=${startSec}` : '';
      const endParam = endSec > 0 ? `&end=${endSec}` : '';
      iframe.src = `https://www.youtube-nocookie.com/embed/${ytId}?enablejsapi=1&autoplay=1&mute=1&controls=0&playsinline=1&rel=0&modestbranding=1&disablekb=1&fs=0&cc_load_policy=0&iv_load_policy=3&vq=hd2160${startParam}${endParam}`;
      iframe.setAttribute('allow', 'autoplay; encrypted-media');
      iframe.setAttribute('frameborder', '0');
      iframe.setAttribute('tabindex', '-1');
      iframe.setAttribute('aria-hidden', 'true');
      requestHighestYouTubeQuality(iframe, true);

      iframe.addEventListener('load', function () {
        try {
          if (iframe.contentWindow) {
            iframe.contentWindow.postMessage(JSON.stringify({ event: 'listening' }), '*');
            iframe.contentWindow.postMessage(JSON.stringify({
              event: 'command',
              func: 'addEventListener',
              args: ['onStateChange']
            }), '*');
          }
        } catch (err) {}
        setTimeout(function () {
          if (iframe.parentNode) {
            iframe.classList.add('is-playing');
          }
        }, 900);
      });

      return iframe;
    }

    const showcaseMedias = qsa('[data-showcase-yt]');

    if ('IntersectionObserver' in window) {
      const showcaseObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          const media = entry.target;
          const ytId = media.getAttribute('data-showcase-yt');
          const isVerticalCover = media.getAttribute('data-showcase-vertical-cover') === 'true';
          const endSec = parseInt(media.getAttribute('data-preview-end') || '0', 10);

          if (entry.isIntersecting) {
            if (!qs('.work-card-preview-iframe', media)) {
              const iframe = createCleanPreviewIframe(ytId, 0, endSec, isVerticalCover);
              media.appendChild(iframe);

              if (endSec > 0) {
                media._loopTimer = setInterval(function () {
                  try {
                    if (iframe.contentWindow) {
                      iframe.contentWindow.postMessage(JSON.stringify({
                        event: 'command',
                        func: 'seekTo',
                        args: [0, true]
                      }), '*');
                      iframe.contentWindow.postMessage(JSON.stringify({
                        event: 'command',
                        func: 'playVideo',
                        args: ''
                      }), '*');
                    }
                  } catch (e) {}
                }, endSec * 1000);
              }
            }
          } else {
            if (media._loopTimer) {
              clearInterval(media._loopTimer);
              media._loopTimer = null;
            }
            const existing = qs('.work-card-preview-iframe', media);
            if (existing) existing.remove();
          }
        });
      }, { threshold: 0.22, rootMargin: '80px 0px' });

      showcaseMedias.forEach(function (m) {
        showcaseObserver.observe(m);
      });
    }

    const videoLinks = qsa('.work-card-link[data-yt-id]');

    videoLinks.forEach(function (link) {
      const card = link.closest('.work-card');
      const media = qs('.work-card-media', link);
      const ytId = link.getAttribute('data-yt-id');
      const startSec = parseInt(link.getAttribute('data-preview-start') || '0', 10);
      let hoverTimeout = null;

      if (!card || !media || !ytId) return;
      if (media.hasAttribute('data-showcase-yt')) return;

      card.addEventListener('mouseenter', function () {
        hoverTimeout = setTimeout(function () {
          if (qs('.work-card-preview-iframe', media)) return;
          const iframe = createCleanPreviewIframe(ytId, startSec, 0, false);
          media.appendChild(iframe);
        }, 240);
      });

      card.addEventListener('mouseleave', function () {
        clearTimeout(hoverTimeout);
        const iframe = qs('.work-card-preview-iframe', media);
        if (iframe) iframe.remove();
      });
    });

    // ── Auto-replay YouTube showcase & preview videos on loop and fade in on play ──
    window.addEventListener('message', function (e) {
      try {
        const data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
        if (!data) return;
        const state = (data.event === 'onStateChange') ? data.info : (data.info && data.info.playerState);
        if (state === 1 || state === '1') {
          qsa('.work-card-preview-iframe').forEach(function (iframe) {
            if (iframe.contentWindow === e.source) {
              iframe.classList.add('is-playing');
            }
          });
        } else if (state === 0 || state === '0') {
          if (e.source) {
            try {
              e.source.postMessage(JSON.stringify({ event: 'command', func: 'seekTo', args: [0, true] }), '*');
              e.source.postMessage(JSON.stringify({ event: 'command', func: 'playVideo', args: '' }), '*');
            } catch (err) {}
          }
          qsa('.work-card-preview-iframe').forEach(function (iframe) {
            if (iframe.contentWindow) {
              try {
                iframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'seekTo', args: [0, true] }), '*');
                iframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'playVideo', args: '' }), '*');
              } catch (err) {}
            }
          });
        }
      } catch (err) {}
    });

    // Auto-replay HTML5 loop videos as a rock-solid fallback
    qsa('video[loop]').forEach(function (v) {
      v.addEventListener('ended', function () {
        try {
          v.currentTime = 0;
          v.play().catch(function () {});
        } catch (err) {}
      });
    });
  }
  // ─── 10B. VIEWPORT-ONLY GPU-ACCELERATED IMAGE SLIDERS ─────
  function initConstantSliders() {
    qsa('.work-card-img, .work-card-slide-img').forEach(attachImageFallback);

    const sliderCards = qsa('.work-card--slider');

    sliderCards.forEach(function (card) {
      const track  = qs('.work-card-slider-track', card);
      const slides = qsa('.work-card-slide-img', card);
      const dots   = qsa('.slider-dot', card);
      const link   = qs('.work-card-link', card);
      if (!track || slides.length < 2) return;

      let currentIndex = 0;
      let sliderTimer = null;

      function goToSlide(index) {
        currentIndex = ((index % slides.length) + slides.length) % slides.length;
        track.style.transform = 'translate3d(-' + (currentIndex * 100) + '%, 0, 0)';
        dots.forEach(function (dot, i) {
          dot.classList.toggle('is-active', i === currentIndex);
        });
        card.dataset.activeSlideIndex = String(currentIndex);
        if (link && slides[currentIndex]) {
          link.setAttribute('data-image-src', slides[currentIndex].getAttribute('src'));
        }
      }

      function startSlider() {
        if (sliderTimer) return;
        slides.forEach(function (img) {
          if (img.loading === 'lazy') img.loading = 'eager';
        });
        sliderTimer = setInterval(function () {
          goToSlide(currentIndex + 1);
        }, 2800);
      }

      function stopSlider() {
        if (sliderTimer) {
          clearInterval(sliderTimer);
          sliderTimer = null;
        }
      }

      card.dataset.activeSlideIndex = '0';

      if ('IntersectionObserver' in window) {
        const obs = new IntersectionObserver(function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              startSlider();
            } else {
              stopSlider();
            }
          });
        }, { threshold: 0.25 });
        obs.observe(card);
      } else {
        startSlider();
      }
    });
  }

  // ─── 11. ABOUT SECTION VIDEO (PLAYS ONLY WHEN IN VIEWPORT) ─
  function initAboutIntroVideo() {
    const unmuteBtn = qs('#aboutUnmuteBtn');
    const iconEl    = qs('#aboutUnmuteIcon');
    const textEl    = qs('#aboutUnmuteText');
    const video     = qs('#aboutIntroVideo');
    if (!unmuteBtn || !video) return;

    if ('IntersectionObserver' in window) {
      const aboutObs = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            video.play().catch(function () {});
          } else {
            video.pause();
          }
        });
      }, { threshold: 0.25 });
      aboutObs.observe(video);
    }

    unmuteBtn.addEventListener('click', function (e) {
      e.preventDefault();
      if (video.muted) {
        video.muted = false;
        try {
          video.currentTime = 0;
        } catch (err) {}
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

  // ─── 12. VIDEO MODAL (FULLSCREEN YOUTUBE PLAYER IN MAX QUALITY) ───
  function initVideoModal() {
    const modal       = qs('#videoModal');
    if (!modal) return;

    const modalIframe = qs('#videoModalIframe', modal);
    const closeBtn    = qs('#videoModalClose', modal);
    const backdrop    = qs('#videoModalBackdrop', modal);
    const fallbackBtn = qs('#videoModalYtFallback', modal);
    const triggers    = qsa('.work-card-link[data-yt-id]');

    requestHighestYouTubeQuality(modalIframe);

    function openModal(ytId) {
      if (modalIframe) {
        modalIframe.src = `https://www.youtube-nocookie.com/embed/${ytId}?enablejsapi=1&autoplay=1&rel=0&playsinline=1&vq=hd2160`;
      }
      if (fallbackBtn) {
        fallbackBtn.href = `https://youtu.be/${ytId}`;
        fallbackBtn.classList.remove('is-hidden');
      }
      modal.classList.add('is-open');
      modal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    }

    function closeModal() {
      modal.classList.remove('is-open');
      modal.setAttribute('aria-hidden', 'true');
      if (modalIframe) {
        modalIframe.src = '';
      }
      if (fallbackBtn) {
        fallbackBtn.classList.add('is-hidden');
      }
      document.body.style.overflow = '';
    }

    triggers.forEach(function (link) {
      link.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        const ytId = link.getAttribute('data-yt-id');
        if (ytId) openModal(ytId);
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

  // ─── 13. IMAGE MODAL WITH PREV/NEXT GALLERY & FULL-SIZE ZOOM ───
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
        delete modalImg.dataset.fallbackStep;
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
        e.stopPropagation();
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

  // ─── 14. PROJECT DETAIL PANEL (DRAWER) ────────────────────
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

            let embedUrl = vSrc;
            if (vSrc.includes('youtu.be/')) {
              const id = vSrc.split('youtu.be/')[1].split('?')[0];
              embedUrl = `https://www.youtube-nocookie.com/embed/${id}`;
            } else if (vSrc.includes('youtube.com/shorts/')) {
              const id = vSrc.split('shorts/')[1].split('?')[0];
              embedUrl = `https://www.youtube-nocookie.com/embed/${id}`;
            } else if (vSrc.includes('watch?v=')) {
              const id = vSrc.split('watch?v=')[1].split('&')[0];
              embedUrl = `https://www.youtube-nocookie.com/embed/${id}`;
            }

            const sep = embedUrl.includes('?') ? '&' : '?';
            const iframe = document.createElement('iframe');
            iframe.src = `${embedUrl}${sep}enablejsapi=1&rel=0&vq=hd2160`;
            iframe.setAttribute('frameborder', '0');
            iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture');
            iframe.setAttribute('allowfullscreen', 'true');
            iframe.style.width = '100%';
            iframe.style.aspectRatio = '16/9';
            requestHighestYouTubeQuality(iframe);
            wrap.appendChild(iframe);

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
        qsa('iframe', mediaContainer).forEach(function (ifr) { ifr.src = ''; });
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

  // ─── 15. CATEGORY FILTER, HR COMPETENCY BANNER & QUICK GRID VIEW ─
  function initCategoryFilter() {
    const worksSec      = qs('#works');
    const filterBtns    = qsa('.filter-btn');
    const grid          = qs('.works-grid');
    const workCards     = qsa('.work-card');
    const gridBreaks    = qsa('.works-grid-break');
    const skillFocusEl  = qs('#categorySkillFocus');
    const skillToolsEl  = qs('#categorySkillTools');
    const viewModeBtns  = qsa('.view-mode-btn');
    const inlineGridBtn = qs('#inlineGridTrigger');

    if (!filterBtns.length || !workCards.length || !grid) return;

    // Category -> HR Competency & Software Mapping (matching exact data-filter keys)
    const CATEGORY_PROFILES = {
      all: {
        focus: 'Full-Stack Visual Storytelling · Cinematography, 2D/3D Motion, Game Art & AI Workflows',
        tools: ['After Effects', 'DaVinci Resolve', 'Premiere Pro', 'Cinema 4D', 'Blender', 'Autodesk Maya', 'Unity', 'Photoshop']
      },
      cinematic: {
        focus: 'Directing, Cinematography, Interactive Narrative Editing, Color Grading & Sound Design',
        tools: ['DaVinci Resolve', 'Premiere Pro', 'After Effects', 'Canon EOS 250D', 'Color Grading & Sound Design']
      },
      motion: {
        focus: '2D/3D Motion Graphics, Exhibition Animation, Kinetic Typography & Visual FX',
        tools: ['After Effects', 'Premiere Pro', 'Cinema 4D', 'Autodesk Maya', 'TouchDesigner', 'Illustrator', 'Photoshop']
      },
      game: {
        focus: 'Interactive Game Scenery, 2D Character Rigging, Simulation UI/UX & Game Mechanics',
        tools: ['Unity', 'C# Scripting', 'After Effects (Duik Angela)', 'Procreate', 'UI/UX Prototyping']
      },
      '3d': {
        focus: '3D Environment Modeling, Character Design, Procedural Texturing & Lighting',
        tools: ['Autodesk Maya', 'Blender', 'Substance 3D Painter', 'Cinema 4D', 'TouchDesigner', '3D Lighting & Shaders']
      },
      ai: {
        focus: 'Generative Video Workflows, AI Media Literacy, Visual Concepting & Hybrid Compositing',
        tools: ['Google Veo', 'Topaz Video/Photo', 'Nano Banana Pro', 'Flow Studio', 'Higgsfield', 'After Effects', 'Premiere Pro']
      },
      photography: {
        focus: 'Nature & Portrait Photography, Atmospheric Lighting, Color Theory & Retouching',
        tools: ['Canon EOS 250D', 'Adobe Lightroom', 'Adobe Photoshop', 'Color Theory & Retouching']
      }
    };

    // 1. Inject HR Tool/Skill summary strip into every project card for Quick Grid scanning
    workCards.forEach(function (card) {
      const contentEl = qs('.work-card-content', card);
      if (!contentEl || qs('.work-card-hr-tools', contentEl)) return;

      const infoBtn = qs('.work-card-info-btn', card);
      const linkEl  = qs('.work-card-link', card);
      const rawTools = (infoBtn && infoBtn.getAttribute('data-detail-tools')) ||
                       (linkEl && linkEl.getAttribute('data-detail-tools')) ||
                       'After Effects, Premiere Pro';

      const hrToolsDiv = document.createElement('div');
      hrToolsDiv.className = 'work-card-hr-tools';
      const topTools = rawTools.split(',').map(s => s.trim()).filter(Boolean).slice(0, 3).join(', ');
      hrToolsDiv.textContent = 'Tools: ' + topTools;
      contentEl.appendChild(hrToolsDiv);
    });

    // 2. Populate live project counts on each Category Filter pill
    filterBtns.forEach(function (btn) {
      const filter = btn.getAttribute('data-filter') || 'all';
      let count = 0;
      if (filter === 'all') {
        count = workCards.length;
      } else {
        workCards.forEach(function (card) {
          const cats = (card.getAttribute('data-category') || '').trim().split(/\s+/);
          if (cats.includes(filter)) count++;
        });
      }
      if (!qs('.filter-count', btn)) {
        const badge = document.createElement('span');
        badge.className = 'filter-count';
        badge.textContent = String(count);
        btn.appendChild(badge);
      }
    });

    // Format Key Software with clean commas and spaces
    function updateSkillBanner(filterKey) {
      const profile = CATEGORY_PROFILES[filterKey] || CATEGORY_PROFILES.all;
      if (skillFocusEl) {
        skillFocusEl.textContent = profile.focus;
      }
      if (skillToolsEl) {
        skillToolsEl.textContent = profile.tools.join(', ');
      }
    }

    // Center lone horizontal or vertical cards when they are the only item (or pair/triple) in a row
    function updateGridRowCentering() {
      workCards.forEach(function (card) {
        card.classList.remove(
          'is-row-single-horizontal',
          'is-row-single-vertical',
          'is-row-pair-vertical-first',
          'is-row-pair-vertical-second',
          'is-row-triple-vertical'
        );
      });

      const visibleCards = workCards.filter(function (c) {
        return !c.classList.contains('is-hidden');
      });

      // 1. Check contiguous runs of standard horizontal cards (span 6)
      let currentHorizRun = [];
      function flushHorizRun() {
        if (currentHorizRun.length % 2 === 1) {
          currentHorizRun[currentHorizRun.length - 1].classList.add('is-row-single-horizontal');
        }
        currentHorizRun = [];
      }

      visibleCards.forEach(function (card) {
        if (card.classList.contains('work-card--vertical')) {
          flushHorizRun();
        } else if (card.classList.contains('work-card--wide')) {
          flushHorizRun();
        } else {
          currentHorizRun.push(card);
        }
      });
      flushHorizRun();

      // 2. Check visible vertical cards (span 3 -> 4 per row in 12-col grid)
      const visibleVerticals = visibleCards.filter(function (c) {
        return c.classList.contains('work-card--vertical');
      });

      gridBreaks.forEach(function (gb) {
        gb.style.display = visibleVerticals.length > 0 ? 'block' : 'none';
      });

      const rem = visibleVerticals.length % 4;
      if (rem === 1) {
        visibleVerticals[visibleVerticals.length - 1].classList.add('is-row-single-vertical');
      } else if (rem === 2) {
        visibleVerticals[visibleVerticals.length - 2].classList.add('is-row-pair-vertical-first');
        visibleVerticals[visibleVerticals.length - 1].classList.add('is-row-pair-vertical-second');
      } else if (rem === 3) {
        visibleVerticals[visibleVerticals.length - 3].classList.add('is-row-triple-vertical');
        visibleVerticals[visibleVerticals.length - 2].classList.add('is-row-triple-vertical');
        visibleVerticals[visibleVerticals.length - 1].classList.add('is-row-triple-vertical');
      }
    }

    updateSkillBanner('all');
    updateGridRowCentering();

    // 3. Filter click handler
    filterBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        filterBtns.forEach(function (b) {
          b.classList.remove('is-active');
          b.setAttribute('aria-selected', 'false');
        });
        btn.classList.add('is-active');
        btn.setAttribute('aria-selected', 'true');

        const filter = btn.getAttribute('data-filter') || 'all';
        updateSkillBanner(filter);

        workCards.forEach(function (card) {
          const rawCategories = card.getAttribute('data-category') || '';
          const categories = rawCategories.trim().split(/\s+/);

          if (filter === 'all' || categories.includes(filter)) {
            card.classList.remove('is-hidden');
            card.classList.add('is-visible');
          } else {
            card.classList.add('is-hidden');
          }
          card.style.order = '';
        });

        gridBreaks.forEach(function (gb) {
          gb.style.order = '';
        });

        updateGridRowCentering();

        if (typeof refreshFlightCards === 'function') {
          refreshFlightCards();
        }
        if (hasScrollTrigger()) {
          ScrollTrigger.refresh();
        }
      });
    });

    // 4. View Mode Switcher (Sky Flight vs. Quick Grid for HR)
    function setViewMode(mode) {
      if (!worksSec) return;
      const isGrid = mode === 'grid';
      worksSec.classList.toggle('is-grid-view', isGrid);

      viewModeBtns.forEach(function (btn) {
        const active = btn.getAttribute('data-view-mode') === mode;
        btn.classList.toggle('is-active', active);
        btn.setAttribute('aria-pressed', active ? 'true' : 'false');
      });

      if (inlineGridBtn) {
        inlineGridBtn.textContent = isGrid
          ? 'Switch to 3D Sky Flight ↗'
          : 'Switch to HR Quick Grid ↗';
      }

      if (typeof refreshFlightCards === 'function') {
        refreshFlightCards();
      }
      if (hasScrollTrigger()) {
        ScrollTrigger.refresh();
      }
    }

    viewModeBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        const mode = btn.getAttribute('data-view-mode') || 'flight';
        setViewMode(mode);
      });
    });

    if (inlineGridBtn) {
      inlineGridBtn.addEventListener('click', function () {
        const currentlyGrid = worksSec && worksSec.classList.contains('is-grid-view');
        setViewMode(currentlyGrid ? 'flight' : 'grid');
      });
    }
  }

  // ─── 16. SMOOTH SCROLL ANCHORS ────────────────────────────
  function initSmoothScroll() {
    const links = qsa('a[href^="#"]');

    links.forEach(function (link) {
      link.addEventListener('click', function (e) {
        const hash = link.getAttribute('href');
        if (!hash || hash === '#' || hash === '#project-preview' || hash.charAt(0) !== '#') return;

        let target = null;
        try {
          target = qs(hash);
        } catch (err) {
          return;
        }
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

  // ─── 17. BACK TO TOP ──────────────────────────────────────
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

  // ─── 18. MARQUEE SPEED (ON-DEMAND) ────────────────────────
  function initMarqueeSpeed() {
    const tracks = qsa('.marquee-track');
    if (!tracks.length) return;

    let scrollVelocity = 0;
    let lastScrollY = window.scrollY;
    let marqueeRaf = null;

    function updateMarquee() {
      const rate = clamp(1.6 + scrollVelocity * 0.018, 1.6, 3.2);
      scrollVelocity *= 0.9;

      tracks.forEach(function (track) {
        if (typeof track.getAnimations === 'function') {
          track.getAnimations().forEach(function (anim) {
            anim.playbackRate = rate;
          });
        }
      });

      if (scrollVelocity > 0.1) {
        marqueeRaf = requestAnimationFrame(updateMarquee);
      } else {
        marqueeRaf = null;
      }
    }

    onPassiveScroll(function (currentY) {
      scrollVelocity = Math.abs(currentY - lastScrollY);
      lastScrollY = currentY;
      if (!marqueeRaf) {
        marqueeRaf = requestAnimationFrame(updateMarquee);
      }
    });
  }

  // ─── 19. PROTECTED PHONE NUMBER REVEAL (ANTI-SCRAPER) ─────
  function initPhoneProtection() {
    const revealBtn = qs('#revealPhoneBtn');
    const revealedWrap = qs('#revealedPhoneWrap');
    const phoneLink = qs('#revealedPhoneLink');
    const copyBtn = qs('#copyPhoneBtn');
    if (!revealBtn || !revealedWrap || !phoneLink) return;

    const parts = ['+48', '516', '494', '524'];

    revealBtn.addEventListener('click', function () {
      const formatted = parts.join(' ');
      const telHref = 'tel:' + parts.join('');
      phoneLink.textContent = formatted;
      phoneLink.setAttribute('href', telHref);
      revealBtn.classList.add('is-hidden');
      revealedWrap.classList.remove('is-hidden');
    });

    if (copyBtn) {
      copyBtn.addEventListener('click', function () {
        const formatted = parts.join(' ');
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(formatted).then(function () {
            copyBtn.textContent = 'Copied!';
            setTimeout(function () {
              copyBtn.textContent = 'Copy';
            }, 1800);
          }).catch(function () {});
        }
      });
    }
  }

  // ─── 20. FOREGROUND CLOUD-PARTING CHAPTER TRANSITIONS ─────
  // Sweeps soft volumetric clouds across the foreground and parts them
  // left & right when flying from Hero -> Selected Works and Works -> About
  function initForegroundCloudTransitions() {
    const stage      = qs('#foregroundCloudStage');
    const leftBank   = qs('#fgCloudLeft');
    const rightBank  = qs('#fgCloudRight');
    const chapterBox = qs('#fgCloudChapter');
    const phaseEl    = qs('#fgCloudChapterPhase');
    const titleEl    = qs('#fgCloudChapterTitle');
    const worksSec   = qs('#works');
    const aboutSec   = qs('#about');

    if (!stage || !leftBank || !rightBank || !worksSec || !aboutSec) return;

    const gates = [
      {
        el: worksSec,
        phase: 'MORNING · 09:30',
        title: 'Stories in Motion'
      },
      {
        el: aboutSec,
        phase: 'DUSK · 20:45',
        title: 'The Creator Behind the Lens'
      }
    ];

    let activeGateIdx = -1;

    function updateCloudGates() {
      // Do not show foreground cloud gates if a modal is open
      if (document.body.style.overflow === 'hidden') {
        stage.style.opacity = '0';
        stage.classList.remove('is-active');
        return;
      }

      const vh = Math.max(window.innerHeight, 1);
      // Trigger center when the incoming section's top crosses 62% of viewport height
      const triggerY = vh * 0.62;
      const halfSpan = vh * 0.54;

      let bestGate = null;
      let bestRawT = 0;
      let bestAbsT = Infinity;
      let bestIdx = -1;

      for (let i = 0; i < gates.length; i++) {
        const g = gates[i];
        const rect = g.el.getBoundingClientRect();
        // rawT goes from -1 (approaching gate) -> 0 (inside cloud bank) -> +1 (parted & entered section)
        const rawT = (triggerY - rect.top) / halfSpan;
        const absT = Math.abs(rawT);
        if (absT < 1.0 && absT < bestAbsT) {
          bestAbsT = absT;
          bestRawT = rawT;
          bestGate = g;
          bestIdx = i;
        }
      }

      if (!bestGate) {
        stage.style.opacity = '0';
        stage.classList.remove('is-active');
        activeGateIdx = -1;
        return;
      }

      if (bestIdx !== activeGateIdx) {
        activeGateIdx = bestIdx;
        if (phaseEl) phaseEl.textContent = bestGate.phase;
        if (titleEl) titleEl.textContent = bestGate.title;
      }

      stage.classList.add('is-active');

      // Smooth bell curve (0 -> 1 -> 0) for overall mist presence
      const norm01 = clamp((bestRawT + 1) * 0.5, 0, 1);
      const envelope = Math.sin(norm01 * Math.PI);
      const stageOpacity = clamp(Math.pow(envelope, 0.85) * 0.92, 0, 0.92);
      stage.style.opacity = stageOpacity.toFixed(3);

      // From rawT = -1 to -0.22, clouds swell in to meet near center;
      // From rawT = -0.22 to +1, clouds part wide to the left and right as camera flies through
      let translateXvw = 0;
      let scale = 1;
      if (bestRawT < -0.22) {
        const approachT = clamp((bestRawT + 1) / 0.78, 0, 1);
        const easeIn = 1 - Math.pow(1 - approachT, 2);
        translateXvw = (1 - easeIn) * 26; // 26vw -> 0vw (closing in)
        scale = 0.88 + easeIn * 0.14;     // 0.88 -> 1.02
      } else {
        const partT = clamp((bestRawT + 0.22) / 1.22, 0, 1);
        const easeOut = partT * partT * (3 - 2 * partT);
        translateXvw = easeOut * 66;      // 0vw -> 66vw (parting wide apart)
        scale = 1.02 + easeOut * 0.36;    // 1.02 -> 1.38 (passing camera)
      }

      const verticalDrift = (bestRawT * -18).toFixed(1);
      leftBank.style.transform = `translate3d(${-translateXvw.toFixed(2)}vw, ${verticalDrift}px, 0) scale(${scale.toFixed(3)})`;
      rightBank.style.transform = `translate3d(${translateXvw.toFixed(2)}vw, ${verticalDrift}px, 0) scale(${scale.toFixed(3)})`;

      if (chapterBox) {
        const textAlpha = clamp(Math.sin(norm01 * Math.PI) * 1.15 - 0.15, 0, 1);
        const textScale = 0.92 + norm01 * 0.18;
        const textY = (1 - norm01) * 18 - 9;
        chapterBox.style.opacity = textAlpha.toFixed(3);
        chapterBox.style.transform = `translate(-50%, calc(-50% + ${textY.toFixed(1)}px)) scale(${textScale.toFixed(3)})`;
      }
    }

    onPassiveScroll(updateCloudGates);
    window.addEventListener('resize', updateCloudGates, { passive: true });
    updateCloudGates();
  }

  // ─── 21. EMERGENT NIGHT STARFIELD FINALE (DUSK -> MIDNIGHT) ─
  // Dormant during daytime (0% CPU); emerges smoothly as the user flies
  // into Dusk & Midnight around the About and Contact sections.
  function initStarfieldFinale() {
    const canvas = qs('#skyStarfield');
    if (!canvas || !canvas.getContext) return;
    const ctx = canvas.getContext('2d');

    let width = 0;
    let height = 0;
    let dpr = 1;
    let currentAlpha = 0;
    let starRaf = null;
    let stars = [];
    let shootingStar = null;
    let nextShootingStarAt = 0;

    function createStars() {
      const count = width < 768 ? 72 : 120;
      stars = [];
      for (let i = 0; i < count; i++) {
        // Concentrate stars in upper 82% of viewport sky
        const yBias = Math.pow(Math.random(), 1.25) * 0.85;
        const isBright = i < 9;
        const hues = [
          '255, 250, 244', // warm pearl
          '216, 228, 255', // starlight blue-silver
          '238, 214, 255', // twilight lavender
          '255, 226, 188'  // champagne gold
        ];
        stars.push({
          x: Math.random(),
          y: yBias,
          r: isBright ? (1.35 + Math.random() * 0.85) : (0.55 + Math.random() * 1.05),
          baseAlpha: isBright ? (0.72 + Math.random() * 0.28) : (0.28 + Math.random() * 0.55),
          speed: 0.8 + Math.random() * 2.2,
          phase: Math.random() * Math.PI * 2,
          rgb: hues[i % hues.length],
          isBright: isBright
        });
      }
    }

    function resizeCanvas() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      createStars();
    }

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas, { passive: true });

    function spawnShootingStar(now) {
      const startX = (0.18 + Math.random() * 0.62) * width;
      const startY = (0.06 + Math.random() * 0.32) * height;
      const angle = (Math.PI / 7) + Math.random() * (Math.PI / 10); // gentle diagonal arc
      const dir = Math.random() > 0.35 ? 1 : -1;
      shootingStar = {
        x: startX,
        y: startY,
        vx: Math.cos(angle) * dir * (420 + Math.random() * 180),
        vy: Math.sin(angle) * (240 + Math.random() * 120),
        len: 75 + Math.random() * 55,
        born: now,
        life: 950 + Math.random() * 450
      };
    }

    function renderStarfield(now) {
      if (currentAlpha <= 0.01) {
        starRaf = null;
        return;
      }

      ctx.clearRect(0, 0, width, height);
      const t = (now || performance.now()) * 0.001;

      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];
        const twinkle = 0.62 + 0.38 * Math.sin(t * s.speed + s.phase);
        const alpha = s.baseAlpha * twinkle * currentAlpha;
        const sx = s.x * width;
        const sy = s.y * height;

        ctx.beginPath();
        ctx.arc(sx, sy, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${s.rgb}, ${alpha.toFixed(3)})`;
        ctx.fill();

        // Delicate 4-point celestial cross-flare on the brightest stars
        if (s.isBright && alpha > 0.35) {
          const flareLen = s.r * 4.2;
          ctx.strokeStyle = `rgba(${s.rgb}, ${(alpha * 0.38).toFixed(3)})`;
          ctx.lineWidth = 0.75;
          ctx.beginPath();
          ctx.moveTo(sx - flareLen, sy);
          ctx.lineTo(sx + flareLen, sy);
          ctx.moveTo(sx, sy - flareLen);
          ctx.lineTo(sx, sy + flareLen);
          ctx.stroke();
        }
      }

      // Occasional delicate shooting star during deep Dusk / Midnight
      const ts = now || performance.now();
      if (currentAlpha > 0.55) {
        if (!shootingStar && ts > nextShootingStarAt) {
          spawnShootingStar(ts);
          nextShootingStarAt = ts + 4800 + Math.random() * 4200;
        }
      }

      if (shootingStar) {
        const age = ts - shootingStar.born;
        if (age >= shootingStar.life) {
          shootingStar = null;
        } else {
          const prog = age / shootingStar.life;
          const fade = Math.sin(prog * Math.PI) * currentAlpha;
          const dt = age * 0.001;
          const headX = shootingStar.x + shootingStar.vx * dt;
          const headY = shootingStar.y + shootingStar.vy * dt;
          const speedMag = Math.hypot(shootingStar.vx, shootingStar.vy) || 1;
          const tailX = headX - (shootingStar.vx / speedMag) * shootingStar.len;
          const tailY = headY - (shootingStar.vy / speedMag) * shootingStar.len;

          const grad = ctx.createLinearGradient(headX, headY, tailX, tailY);
          grad.addColorStop(0, `rgba(255, 250, 244, ${(fade * 0.92).toFixed(3)})`);
          grad.addColorStop(0.35, `rgba(216, 200, 255, ${(fade * 0.45).toFixed(3)})`);
          grad.addColorStop(1, 'rgba(216, 200, 255, 0)');

          ctx.strokeStyle = grad;
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.moveTo(headX, headY);
          ctx.lineTo(tailX, tailY);
          ctx.stroke();
        }
      }

      starRaf = requestAnimationFrame(renderStarfield);
    }

    setStarfieldProgress = function (skyProgress) {
      // Stars begin emerging at Golden Hour/Dusk (0.66) and reach full brilliance by Midnight (0.92)
      const targetAlpha = clamp((skyProgress - 0.66) / 0.26, 0, 1);
      currentAlpha = targetAlpha;
      canvas.style.opacity = targetAlpha.toFixed(3);

      if (targetAlpha > 0.01 && !starRaf) {
        if (!nextShootingStarAt) {
          nextShootingStarAt = performance.now() + 1800;
        }
        starRaf = requestAnimationFrame(renderStarfield);
      }
    };
  }

  // ─── SAFE INIT ────────────────────────────────────────────
  function init() {
    // 1. Always start preloader immediately so the page can never get stuck on 0%
    initPreloader();

    // 2. Register GSAP plugins safely if loaded
    try {
      if (hasGSAP() && hasScrollTrigger()) {
        gsap.registerPlugin(ScrollTrigger);
      }
    } catch (e) {}

    // 3. Run each module inside an isolated safety block
    const modules = [
      initStarfieldFinale,
      initDayNightScrollExperience,
      initLetterbox,
      initForegroundCloudTransitions,
      initCursor,
      initMagneticButtons,
      initNavigation,
      initMobileMenu,
      initScrollReveal,
      initVideoHover,
      initConstantSliders,
      initAboutIntroVideo,
      initVideoModal,
      initImageModal,
      initProjectDetail,
      initCategoryFilter,
      initSmoothScroll,
      initBackToTop,
      initMarqueeSpeed,
      initPhoneProtection
    ];

    modules.forEach(function (fn) {
      try {
        fn();
      } catch (err) {
        console.error('Module init error:', err);
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();