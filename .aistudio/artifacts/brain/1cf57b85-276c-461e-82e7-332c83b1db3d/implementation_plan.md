# Portfolio Refinement: Media Framing, Category Precision & Magnetic Scroll Focus

This update resolves media framing and centering across all widescreen video and 3D showcase cards, restores the exact uploaded photography slides, refines project categorization and HR filter bar visibility, and introduces a magnetic scroll-focus assist so project rows effortlessly lock into view as you fly through the sky.

### User Review & Critical Decisions

> [!IMPORTANT]
> All requested refinements are directly specified and ready for implementation upon your approval:

- **Restored Photography Slides**: Place the uploaded autumn gazebo photo (`IMG_4443`) as the **first slide** (and cover) of *Nature Photography*, and place the uploaded portrait (`IMG_5050`) as the **second slide** of *Portrait Photography*.
- **Full-Bleed Centered Showcase Videos & 3D Gallery**: Force all widescreen media containers to span `100%` width and center their inner YouTube embeds and 3D image sliders at `50% / 50%` with overscan zoom so black side borders and upper-left offsets are completely eliminated.
- **Disable Amelie Autoplay Subtitles**: Pass caption-suppression parameters (`cc_load_policy=0`, `iv_load_policy=3`) and send YouTube IFrame API `unloadModule("captions")` commands on load so the Amelie trailer plays cleanly without subtitles.
- **Category & Subtitle Realignment**:
  - *What If Your Choice Changes the Ending?* appears exclusively under **Motion Design** (removed from *Cinematic & Film*).
  - *SYGMA — AI Literacy* projects appear exclusively under **AI-Powered** (removed from *Motion Design*, with *"Motion Design"* removed from the card subtitle).
- **Centered Single-Card Rows**: Whenever a horizontal or vertical project card is the only item in its row (or when 2 vertical cards share a 3-column row), automatically center the card(s) horizontally in the grid.
- **Unclipped HR Command Bar & High-Contrast Flight Hint**: Rebalance the command bar layout so *AI-Powered* and *Photography* filter tabs are never obscured by the *Sky Flight / Quick Grid* switcher, format *Key Software* lists with clean commas and spaces (`After Effects, DaVinci Resolve, Premiere Pro...`), and elevate the contrast of the sky-flight hint line.
- **Magnetic Project Row Attraction**: Expand the sharp focus zone and add a gentle magnetic scroll settle that smoothly pulls the nearest project row into the focal sweet spot when scrolling decelerates.

---

### 1. Overview & Core Concept

- **What It Does**: Polishes the visual framing, navigation ergonomics, and scroll physics of Anastasiia Pupyrina's portfolio so both creative directors and HR recruiters experience zero visual glitches or frustrating scroll overshoot.
- **Target Audience / Persona**: Creative directors, studio leads, and HR recruiters reviewing cinematography, motion design, 3D art, game design, AI workflows, and photography.
- **Key Value**: Every showcase video and 3D render fills its frame edge-to-edge without black bars, every discipline filter is immediately clickable and accurately categorized, and scrolling naturally settles onto each project row like a soft magnet.

---

### 2. User Experience & Visual Design

- **Key User Flows**:
  1. **HR Orientation & Filtering**: Above the project gallery, the user sees the clearly legible prompt (*"Scroll to fly through the sky · or switch to Quick Grid for rapid HR scanning"*) and a sticky command bar where all seven category tabs (*All*, *Cinematic & Film*, *Motion Design*, *Game Design*, *3D Art*, *AI-Powered*, *Photography*) and the *Sky Flight / Quick Grid* toggle fit comfortably without clipping.
  2. **Competency Readout**: Clicking any category tab updates the *Discipline Focus* and *Key Software* banner below it, displaying software tools separated by commas and spaces (e.g., `After Effects, DaVinci Resolve, Premiere Pro, Blender, Unity, Photoshop`).
  3. **Magnetic Sky-Flight Scrolling**: As the user scrolls down through the clouds, project rows emerge from the mist into a generous crystal-clear focal zone. When the user slows or stops scrolling near a row, a gentle magnetic pull centers that row in the viewport so they never accidentally overshoot or have to hunt for the frame.
  4. **Balanced Row Geometry**: When a row contains a single horizontal card or 1–2 vertical cards (either in *All* view or inside a filtered category), the card(s) sit symmetrically centered on screen rather than hugging the left margin.
- **Visual Identity & Theme**:
  - *Widescreen Media Framing*: Showcase cards (*Amelie*, *Cabinet of Memories*, *The Future We Were Promised*, *3D Coquette Room*) enforce `width: 100%` on their media stage with centered `50% / 50%` transforms and `1.22x–1.35x` video overscan to crop out internal YouTube letterboxing/pillarboxing.
  - *Hint & Filter Legibility*: The flight hint uses bright ivory typography (`#FFFDF9`) with a soft atmospheric glass pill and dark halo shadow so it remains legible over bright dawn and noon clouds.

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Soft Magnetic Scroll Detent vs. Strict CSS Scroll Snap**
  - *Chosen Approach*: Velocity-aware JavaScript magnetic settle (`scrollend` / debounced wheel-and-touch settle) paired with an expanded sharp-focus plateau (`12%–84%` viewport height).
  - *Why*: Strict CSS `scroll-snap-type: y mandatory` fights trackpads, hijacks momentum scrolling, and breaks smooth scrubbing on the right-hand timecode rail. A velocity-aware magnetic assist only activates when the user naturally pauses near a project row, gently gliding it into the focal sweet spot while preserving free scrolling and timecode dragging.
- **Decision 2: True Aspect-Cover Overscan for YouTube Showcase Iframes**
  - *Chosen Approach*: Lock `.work-card-media` to `width: 100%` and size embedded showcase iframes using centered 16:9 overscan geometry (`width: 128%; height: 128%; top: 50%; left: 50%; transform: translate(-50%, -50%)`).
  - *Why*: YouTube's embed player renders a 16:9 canvas with black bars whenever the container aspect ratio differs from 16:9. Overscanning from the center guarantees edge-to-edge video coverage across all widescreen showcase cards.

---

### 4. Technical Architecture & Data Strategy *(Technical Reference)*

- **Architecture & Component Diagram**:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     WORKS SECTION & SKY FLIGHT STAGE                    │
├─────────────────────────────────────────────────────────────────────────┤
│  Header Row                                                             │
│  ├─ Section Title ("Featured Projects")                                 │
│  └─ High-Contrast Flight Hint + Inline Quick Grid Trigger               │
│                                                                         │
│  Sticky HR Command Bar (Flex Wrap / Responsive Two-Zone Layout)         │
│  ├─ Category Tabs: All | Cinematic | Motion | Game | 3D | AI | Photo    │
│  └─ View Switcher: [Sky Flight]  [Quick Grid]                           │
│                                                                         │
│  Dynamic HR Competency Banner                                           │
│  ├─ Discipline Focus Readout                                            │
│  └─ Key Software List (Comma + Space Formatted: "Tool A, Tool B, ...")  │
├─────────────────────────────────────────────────────────────────────────┤
│  6-Column Responsive Works Grid + Dynamic Row Centering Engine          │
│  ├─ Full-Width Showcase Cards (span 6, 100% width, overscan centered)   │
│  │   ├─ Amelie Trailer (Autoplay, Captions Off via API & Params)        │
│  │   ├─ Cabinet of Memories (22s Loop, Centered Overscan)               │
│  │   ├─ Frutiger Aero (Centered Full-Bleed Cover)                       │
│  │   └─ 3D Coquette Room (100% Width Centered Slider Track)             │
│  ├─ Horizontal Cards (span 3; if 1 in row -> centered in grid)          │
│  │   ├─ Nature Photography (Slide 1: IMG_4443, followed by 5 landscapes)│
│  │   └─ SYGMA Web Platform (Category: AI-Powered only)                  │
│  └─ Vertical Cards (span 2; if 1 or 2 in row -> centered in grid)       │
│      ├─ SYGMA TikTok Promo (Category: AI-Powered only)                  │
│      ├─ What If Your Choice (Category: Motion Design only)              │
│      └─ Portrait Photography (Slide 2: IMG_5050)                        │
├─────────────────────────────────────────────────────────────────────────┤
│  Magnetic Scroll Focus Controller                                       │
│  └─ Monitors scroll pause -> Gently aligns nearest row to viewport focus│
└─────────────────────────────────────────────────────────────────────────┘
```

- **Interactive Component & State Mapping**:
  - **Showcase Video Loader**: Appends `cc_load_policy=0&iv_load_policy=3` to YouTube URLs and dispatches `unloadModule("captions")` + `unloadModule("cc")` postMessages on iframe load to ensure zero subtitle overlays on the Amelie trailer.
  - **Dynamic Row Centering Helper**: Runs on initial load and after every category filter click. Inspects visible horizontal (`span 3`) and vertical (`span 2`) cards per row; applies centered column placement (`justify-self: center` for lone horizontal cards; centered columns `3 / span 2` for a single vertical card or `2 / span 2` and `4 / span 2` for a pair of vertical cards).
  - **Magnetic Row Settle**: Listens for scroll deceleration in *Sky Flight* mode (ignored while dragging the timecode rail or in *Quick Grid* mode). When scrolling stops and a project row is within the magnetic capture window (`40px–210px` from the viewport focal center), smoothly scrolls the row into focus.
