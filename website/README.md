# Motion Designer Portfolio

A cinematic, interactive portfolio built for motion designers — focused on video content with immersive interactions.

## ✦ Features

- **Cinematic preloader** with animated counter
- **Custom cursor** that transforms to "PLAY" on video elements
- **Film grain overlay** for cinematic texture
- **Hero section** with fullscreen video background + letterbox bars on scroll
- **Showreel player** with poster state and play/pause toggle
- **Video project grid** — hover to auto-play preview, click for fullscreen modal
- **GSAP ScrollTrigger** animations — text reveals, parallax, staggered cards
- **Magnetic buttons** — interactive hover effect on links and buttons
- **Infinite marquee** that speeds up with scroll velocity
- **Fully responsive** — mobile menu, adaptive grid, touch-friendly

## ✦ Getting Started

### 1. Add Your Videos

Place your video files in the `assets/` folder:

| File | Where it appears |
|---|---|
| `hero-bg.mp4` | Hero background (looping, ambient) |
| `showreel.mp4` | Main showreel player |
| `project-01.mp4` to `project-06.mp4` | Work cards — hover preview + modal |

> **Tip:** For hero-bg, use a short (10-30s) ambient loop. For project videos, use either full pieces or compelling clips.

### 2. Add Your Photo

Replace the placeholder gradient in the About section with your portrait:

```html
<!-- In index.html, find the about-image-inner div and replace: -->
<img src="assets/portrait.jpg" alt="Portrait">
```

### 3. Customize Content

- **Edit `index.html`** to update project titles, categories, descriptions, and your bio
- **Update social links** (Instagram, Behance, Vimeo, Dribbble)
- **Change email** from `hello@yourdomain.com` to yours

### 4. Preview

Open `index.html` directly in your browser, or use a local server:

```bash
# Using Python
python -m http.server 8000

# Using Node (npx)
npx serve .
```

## ✦ Project Structure

```
portfolio/
├── index.html          # Main HTML
├── css/
│   └── style.css       # All styles
├── js/
│   └── main.js         # Interactions & animations
├── assets/             # Your videos & images
│   ├── hero-bg.mp4
│   ├── showreel.mp4
│   ├── project-01.mp4
│   ├── ...
│   └── portrait.jpg
└── README.md
```

## ✦ Tech Stack

- **HTML5 / CSS3** — semantic markup, custom properties, grid, flexbox
- **Vanilla JavaScript** — no framework dependencies
- **GSAP 3 + ScrollTrigger** — scroll-driven animations (loaded via CDN)
- **Google Fonts** — Cormorant Garamond, Inter, Space Grotesk

## ✦ Browser Support

Chrome, Firefox, Safari, Edge (latest). Custom cursor is automatically disabled on touch devices.
