# Portfolio Audit & Optimization Implementation Plan

This plan addresses all findings from your comprehensive repository analysis across `website/index.html`, `website/css/style.css`, and `website/js/main.js`, incorporating your preferences for a **protected click-to-reveal phone button**, **centered mobile hero layout**, and **all four improvement areas**.

---

## 1. Runtime Performance Optimization (`website/js/main.js` & `website/css/style.css`)

### A. On-Demand `requestAnimationFrame` Loops (Eliminating Idle CPU/GPU Drain)
- **Day/Night Scroll & Video Scrubbing (`initDayNightScrollExperience`)**:
  - Replace the perpetual 60fps `tickDayNight` loop with an **on-demand rAF loop** (`requestDayNightTick()`).
  - The loop wakes up on `scroll`, `resize`, or timecode drag events, interpolates `smoothProgress` toward `targetProgress`, and **automatically sleeps** once `Math.abs(targetProgress - smoothProgress) < 0.0002` and `bgVideo.seeking` is false.
- **Custom Cursor (`initCursor`)**:
  - Convert the permanent cursor `rAF` loop into an **event-driven lerp loop** that wakes on `mousemove` and automatically pauses once the cursor circle settles within `0.15px` of the pointer target.
- **Marquee Scroll Velocity (`initMarqueeSpeed`)**:
  - Add an `IntersectionObserver` on `.marquee` so the marquee speed `rAF` only runs when the marquee is visible in the viewport AND scroll velocity differs from the baseline `1.6x` rate, sleeping immediately once velocity dampens back to baseline.

### B. Unified Passive Scroll Pipeline & Mobile `backdrop-filter` Budget
- **Scroll Consolidation**:
  - Consolidate scroll handling so scroll-driven modules share a clean, `requestAnimationFrame`-throttled passive scroll pipeline rather than firing uncoordinated layout calculations.
- **Mobile Glassmorphism Optimization (`@media (max-width: 768px)`)**:
  - Reduce `backdrop-filter: blur(...)` radii on mobile devices (capping heavy 24px–32px blurs down to lightweight 8px–10px blurs on cards and bars) to prevent mobile GPU frame drops while preserving the luminous sky-mist aesthetic.

---

## 2. Code Hygiene, Preloader Single-Source & Mobile Hero CSS (`website/index.html`, `website/js/main.js`, `website/css/style.css`)

### A. Preloader & Video Markup Cleanup
- **Single Preloader Controller**:
  - Ensure the preloader is driven exclusively by `initPreloader()` in `website/js/main.js` with a single deterministic timer and 2.2s hard fail-safe (no duplicate inline script race condition).
- **Clean Background Video & Dead Code Removal**:
  - Keep clean `<video>` + `<source>` markup in `website/index.html` (supporting `assets/BGvideo.mp4` and optional mobile source fallback without redundant attributes on `<video>`).
  - Remove any dead `if (false && bgVideo)` blocks, duplicate `hasUserScrolled` declarations, and commented-out legacy auto-replay blocks in `website/js/main.js`.

### B. Mobile Hero Alignment & Orphaned CSS Removal (`website/css/style.css`)
- **Centered Mobile Hero at `@media (max-width: 768px)`**:
  - Replace any conflicting or duplicated mobile hero rules with a single, clean specification without `!important` wars:
    - `.hero-content`: centered column layout (`align-items: center; text-align: center;`).
    - `.hero-title-wrap`: centered (`align-items: center; text-align: center; padding: 14px 12px;`).
    - `.hero-role`: centered pill/subtitle (`font-size: 13px; margin-top: 16px;`).
    - `.hero-bottom`: clean centered bottom tagline (`flex-direction: column; align-items: center; text-align: center; gap: 20px;`).
- **Orphaned Selector Cleanup**:
  - Remove unused/dead selectors (`.unused-override`, `.hero-ignored`, `.hero-role-extra`, `.work-card--frutiger-legacy`, `.cert-card-pdf`) and clean up any redundant property declarations.

---

## 3. Privacy Protection, Link Hygiene & Asset Case Consistency (`website/index.html` & `website/js/main.js`)

### A. Protected Click-to-Reveal Phone Button in Contact Section
- **Anti-Scraper Phone Protection**:
  - Replace the plain-text phone number (`+48 516 494 524`) in the Contact section (`website/index.html`) with a sleek **Click-to-Reveal Phone** interactive control next to `"Warsaw, Poland"`:
    - Default state: `Warsaw, Poland · [ Show Phone Number ]` (phone digits stored encoded in `data-p1` / `data-p2` / `data-p3` attributes so bots/scrapers cannot harvest raw text from HTML).
    - On click: smoothly reveals the formatted number `+48 516 494 524` with a direct `tel:+48516494524` dial action and a one-click copy-to-clipboard confirmation.

### B. LinkedIn URL Cleanup & Image Extension Verification
- **Clean LinkedIn URLs**:
  - Strip `?isSelfProfile=true` from LinkedIn links in both the Mobile Menu and the Contact section (`https://www.linkedin.com/in/anastasiia-pupyrina-7404501aa/`).
- **Exact Case-Sensitive Asset Paths**:
  - Audit all image `src` and `data-detail-images` paths in `website/index.html` against actual filenames in `/website/assets/` so `.JPG`, `.jpg`, and `.png` extensions match the filesystem on the first request without needing error-handler retries.

---

## 4. SEO, Social Sharing Cards, Favicon & Accessibility (`website/index.html` & `website/css/style.css`)

### A. Complete OpenGraph, Twitter Cards, JSON-LD & Favicon
- **Social Meta Tags**:
  - Add `og:type` (`website`), `og:url`, `og:image` (`assets/bg_poster.jpg`), `og:image:alt`, `twitter:card` (`summary_large_image`), `twitter:title`, `twitter:description`, and `twitter:image`.
  - Add a canonical `<link rel="canonical">` and Schema.org `Person` / `ProfilePage` JSON-LD structured data for search engines and recruiters.
- **Custom SVG Favicon**:
  - Add a crisp inline/local SVG favicon (`assets/favicon.svg` + `<link rel="icon" type="image/svg+xml" href="assets/favicon.svg">`) featuring the editorial *"A ✦"* monogram matching the portfolio's palette.

### B. Semantic Landmarks & Accessible Project Card Links
- **Skip-to-Content & `<main>` Landmark**:
  - Add an accessible `<a href="#main-content" class="skip-to-content">Skip to main content</a>` link at the top of `<body>` (visible on keyboard `:focus-visible`).
  - Wrap the primary page flow (`#hero`, `.marquee`, `#works`, `#certificates`, `#about`, `#contact`) in `<main id="main-content">`.
- **Replace `href="javascript:void(0)"` on Work Cards**:
  - Replace all `<a href="javascript:void(0)" class="work-card-link">` attributes with meaningful `#project-<slug>` anchor hrefs (with `e.preventDefault()` in the modal click handlers) so right-click, status bar previews, screen readers, and SEO crawlers see clean semantic links instead of `javascript:void(0)`.
