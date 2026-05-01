# LifePlace v2 — Visual Contract

**Status**: Frozen spec for v2 implementation. **Scope**: the 12 PublicLayout-wrapped marketing routes of the v1 client-portal. The booking flow, BookingComplete, the authenticated client area, and admin-crm are explicitly **out of scope** — they get redesigned freely in v2 within the same brand token system.

This document is the spec the v2 implementation will be measured against. If a v2 page deviates from a value here, it's either a documented exception or a bug.

**Source of truth (v1)**: `frontend/client-portal/src/{routes,pages,components,design-system,utils}/`. All file references are relative to that root unless noted.

---

## 0. Scope — the 12 routes in the contract

| # | Path | v1 route file | v1 page component |
|---|---|---|---|
| 1 | `/` | `routes/home.tsx` | `pages/home/Home.tsx` |
| 2 | `/about` | `routes/about.tsx` | `pages/about/AboutPage.tsx` |
| 3 | `/services` | `routes/services.tsx` | `pages/services/ServicesPage.tsx` |
| 4 | `/rates` | `routes/rates.tsx` | `pages/rates/RatesPage.tsx` |
| 5 | `/facilities` | `routes/facilities.tsx` | `pages/facilities/FacilitiesPage.tsx` |
| 6 | `/gallery` | `routes/gallery.tsx` | `pages/gallery/GalleryPage.tsx` |
| 7 | `/reviews` | `routes/reviews.tsx` | `pages/reviews/ReviewsPage.tsx` |
| 8 | `/contact` | `routes/contact.tsx` | `pages/contact/ContactPage.tsx` |
| 9 | `/partner` | `routes/partner.tsx` | `pages/partner/PartnerPage.tsx` |
| 10 | `/podcasts` | `routes/podcasts.tsx` | `pages/podcasts/PodcastsPage.tsx` |
| 11 | `/privacy` | `routes/privacy.tsx` | `pages/legal/PrivacyPage.tsx` |
| 12 | `/terms` | `routes/terms.tsx` | `pages/legal/TermsPage.tsx` |

Out of scope (free to redesign): `/booking`, `/booking/complete`, all `/auth/*`, all authenticated client area routes, all admin-crm routes.

---

## 1. Defects in v1 that v2 must NOT replicate

These are bugs in the current code, not part of the contract:

1. **Cormorant Garamond and Inter are referenced as font families but never loaded.** The `<link>` tags belong in `src/root.tsx`'s `<head>` per the comment in `design-system/tokens/typography.ts:10-14`, but they are absent. v1 currently falls back to Georgia / system. v2 must load both fonts properly (in Next, via `next/font/google`).
2. **Privacy and Terms pages are visual outliers.** They use raw MUI `Container` + `Paper` with `dangerouslySetInnerHTML`, no design-system Section/Container wrappers, no Cormorant typography. v2 must bring them into the design system: Section + Container + tokenized typography, with sanitized HTML rendering inside a styled prose container.
3. **Mixed routers.** v1 has both `react-router-dom` (legacy) and `react-router` v7 imports across public pages. v2 standardizes on Next App Router (no React Router at all).
4. **Legacy color aliases (`forest`, `earth`).** Kept in v1 colors.ts for backward compatibility. v2 drops them — only `sage`, `terracotta`, `gold`, `neutral`, `clay`, `olive` survive.
5. **`prefers-reduced-motion` is honored inconsistently.** PublicLayout gradient, ServiceCard, AnimatedElement honor it; most other animated elements don't. v2 must honor it site-wide.

---

## 2. Global Visual Tokens

### 2.1 Color palette

Source: `design-system/tokens/colors.ts`.

#### Brand palettes (each 50–900 scale)

```
sage (PRIMARY)
  50 #f7f8f6   100 #eef0ec   200 #dde1d8   300 #c4cbbe   400 #a3ada0
  500 #7D8570  600 #6a7360   700 #545d4d   800 #3f463a   900 #2a2f27

terracotta (SECONDARY / CTAs)
  50 #fdf6f4   100 #fbeae5   200 #f7d5ca   300 #f0b5a1   400 #e58f73
  500 #C87356  600 #b35a40   700 #944733   800 #72372a   900 #4f2820

gold (ACCENT — sparingly)
  50 #fcfaf5   100 #f9f4e8   200 #f3e9d1   300 #ead9b3   400 #dfc490
  500 #D4A574  600 #c18f5e   700 #a57649   800 #7f5a36   900 #5a4027

neutral (warm cream/gray)
  50 #FAF7F2 — primary background
  100 #F5F1EB
  200 #EBE5DD
  300 #D9D1C5
  400 #B8AEA0
  500 #8B8680 — body text
  600 #6F6B67
  700 #54514E
  800 #3A3836
  900 #2E2A28 — headings

clay (supporting)
  500 #A67C5E (main); full scale 50–900

olive (supporting, natural touches)
  500 #808F5F (main); full scale 50–900
```

#### Semantic colors

```
success  light #88c399  main #5BA872  dark #3d8c57  contrast #fff  subtle rgba(91,168,114,0.08)
warning  light #f4b05e  main #E89537  dark #c97725  contrast #fff  subtle rgba(232,149,55,0.08)
error    light #e77668  main #D94F3D  dark #b83828  contrast #fff  subtle rgba(217,79,61,0.08)
info     light #6a9bb8  main #4A7FA0  dark #355c79  contrast #fff  subtle rgba(74,127,160,0.08)
```

#### Gradients (used in HeroBackground, GradientBackground, PublicLayout)

```
warmSage          linear-gradient(135deg, #7D8570 0%, #a3ada0 100%)
sunsetGlow        linear-gradient(135deg, #C87356 0%, #e58f73 100%)
goldenHour        linear-gradient(135deg, #D4A574 0%, #ead9b3 100%)
earthToSky        linear-gradient(135deg, #A67C5E 0%, #7D8570 100%)
meadow            linear-gradient(135deg, #808F5F 0%, #a3ada0 100%)
terracottaWarmth  linear-gradient(135deg, #C87356 0%, #D4A574 100%)
morningMist       linear-gradient(135deg, #FAF7F2 0%, #EBE5DD 100%)
eveningGlow       linear-gradient(135deg, #f3e9d1 0%, #f7d5ca 100%)
naturalCanvas     linear-gradient(135deg, #F5F1EB 0%, #eef0ec 100%)
heroWarm          linear-gradient(135deg, #FAF7F2 0%, #f7f8f6 50%, #fdf6f4 100%)
heroNatural       linear-gradient(180deg,  #f7f8f6 0%, #FAF7F2 100%)
heroSunset        linear-gradient(135deg, #fdf6f4 0%, #f9f4e8 100%)

radialWarm        radial-gradient(circle at 30% 30%, rgba(212,165,116,0.15) 0%, transparent 70%)
radialSage        radial-gradient(circle at 70% 70%, rgba(125,133,112,0.10) 0%, transparent 60%)

overlayLight      linear-gradient(135deg, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.2) 100%)
overlayDark       linear-gradient(135deg, rgba(46,42,40,0.7)  0%, rgba(46,42,40,0.5)  100%)
overlayWarm       linear-gradient(135deg, rgba(200,115,86,0.15) 0%, rgba(212,165,116,0.10) 100%)
```

#### Glass effects

```
subtle  bg rgba(250,247,242,0.7)  backdrop blur(8px) saturate(120%)  border 1px solid rgba(255,255,255,0.3)
dark    bg rgba(46,42,40,0.7)     backdrop blur(8px) saturate(120%)  border 1px solid rgba(255,255,255,0.1)
warm    bg rgba(200,115,86,0.15)  backdrop blur(12px) saturate(130%) border 1px solid rgba(200,115,86,0.2)
```

#### Overlays (image readability)

```
light       rgba(250,247,242,0.4)
medium      rgba(250,247,242,0.6)
heavy       rgba(250,247,242,0.85)
dark        rgba(46,42,40,0.4)
darkMedium  rgba(46,42,40,0.6)
darkHeavy   rgba(46,42,40,0.85)
warmGlow    rgba(200,115,86,0.20)
sageGlow    rgba(125,133,112,0.20)
goldGlow    rgba(212,165,116,0.20)
gradientDark   linear-gradient(to bottom, rgba(46,42,40,0.3) 0%, rgba(46,42,40,0.7) 100%)
gradientLight  linear-gradient(to bottom, rgba(250,247,242,0.5) 0%, rgba(250,247,242,0.9) 100%)
```

### 2.2 Typography

Source: `design-system/tokens/typography.ts`.

**Families**:
```
heading: 'Cormorant Garamond', Georgia, 'Times New Roman', serif
body:    'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif
mono:    'SF Mono', 'Monaco', 'Inconsolata', 'Fira Mono', monospace
```

**Weights**: 300 light · 400 regular · 500 medium · 600 semibold · 700 bold · 800 extrabold.

**Size scale** (base 16px):
```
xs   12   sm   14   base 16   md   18   lg   20
xl   24   2xl  30   3xl  36   4xl  48   5xl  60
6xl  72   7xl  96
```

**Line heights**: none 1 · tight 1.25 · snug 1.375 · normal 1.5 · relaxed 1.625 · loose 1.75; semantic heading 1.2, body 1.6, button 1.5.

**Letter spacing semantic**: heading -0.02em · body 0 · button 0.025em · uppercase 0.1em.

**Text styles** (apply as Tailwind component classes / CSS variable mixins in v2):

| Style | Family | Size | Weight | Line height | Letter spacing | Notes |
|---|---|---|---|---|---|---|
| display1 | heading | 96px | 300 | 1.1 | -0.02em | hero, mobile→48, tablet→72 |
| display2 | heading | 72px | 400 | 1.15 | -0.01em | hero, mobile→40, tablet→56 |
| h1 | heading | 60px | 600 | 1.2 | -0.02em | mobile→36, tablet→48 |
| h2 | heading | 48px | 600 | 1.25 | -0.01em | mobile→30, tablet→40 |
| h3 | heading | 36px | 600 | 1.3 | -0.01em | mobile→24, tablet→32 |
| h4 | heading | 30px | 500 | 1.35 | 0 | |
| h5 | heading | 24px | 500 | 1.4 | 0 | |
| h6 | heading | 20px | 500 | 1.4 | 0 | |
| bodyLarge | body | 18px | 400 | 1.7 | 0 | |
| body | body | 16px | 400 | 1.6 | 0 | |
| bodySmall | body | 14px | 400 | 1.6 | 0 | |
| button | body | 16px | 600 | 1.5 | 0.025em | textTransform: none |
| buttonSmall | body | 14px | 600 | 1.5 | 0.025em | |
| buttonLarge | body | 18px | 600 | 1.5 | 0.025em | |
| caption | body | 12px | 400 | 1.5 | 0.01em | |
| overline | body | 12px | 600 | 1.5 | 0.1em | UPPERCASE |
| label | body | 14px | 500 | 1.5 | 0.01em | |
| quote | heading | 24px | 400 | 1.6 | 0 | italic |
| link | body | 16px | 500 | 1.5 | 0 | underline |

### 2.3 Spacing

Source: `design-system/tokens/spacing.ts`.

Base scale (8px unit, 0–32):
```
0:0  0.5:4  1:8  1.5:12  2:16  2.5:20  3:24  3.5:28  4:32  5:40  6:48  7:56  8:64
9:72  10:80  12:96  14:112  16:128  20:160  24:192  28:224  32:256  (px)
```

Semantic: xs 4 · sm 8 · md 16 · lg 24 · xl 32 · xxl 48 · xxxl 64.

Component spacing:
```
buttonPadding:  sm "8 16"   md "12 24"  lg "16 32"
cardPadding:    sm 16       md 24       lg 32
sectionPadding: sm 32       md 48       lg 64       xl 96
containerPadding: mobile 16  tablet 24  desktop 32  wide 48
```

### 2.4 Layout

```
maxWidth:     narrow 800   content 1200   wide 1400
breakpoints:  xs 0   sm 640   md 768   lg 1024   xl 1280   xxl 1536
header:       desktop 64   mobile 56
contentOffset (under fixed header):  mobile 120   desktop 140
sidebar:      width 280   collapsed 64
grid columns: 12   gap sm 16   md 24   lg 32
aspect:       square 1/1   video 16/9   ultrawide 21/9   portrait 3/4   landscape 4/3   golden 1.618/1
```

### 2.5 Border radius

```
none 0   xs 2   sm 4   md 8   lg 12   xl 16   xxl 24   xxxl 32   full 9999
button 8   buttonPill 24   card 16   cardLarge 20   input 8   chip 16   avatar 50%   dialog 20   image 12

Organic (asymmetric, used sparingly):
  sm "6 12 6 12"   md "12 18 12 18"   lg "18 24 18 24"
```

### 2.6 Shadows

Source: `design-system/tokens/shadows.ts`. All warm-toned (rgba(46,42,40,*)) except colored variants.

Elevation scale:
```
xs    0 1px 2px rgba(46,42,40,0.04), 0 1px 3px rgba(46,42,40,0.02)
sm    0 2px 4px rgba(46,42,40,0.06), 0 2px 8px rgba(46,42,40,0.03)
md    0 4px 8px rgba(46,42,40,0.08), 0 4px 16px rgba(46,42,40,0.04)
lg    0 8px 16px rgba(46,42,40,0.10), 0 8px 24px rgba(46,42,40,0.05)
xl    0 12px 24px rgba(46,42,40,0.12), 0 12px 40px rgba(46,42,40,0.06)
xxl   0 24px 48px rgba(46,42,40,0.15), 0 24px 60px rgba(46,42,40,0.08)
```

Colored (brand-tinted lifts):
```
sage        0 8px 24px rgba(125,133,112,0.15), 0 4px 12px rgba(125,133,112,0.08)
terracotta  0 8px 24px rgba(200,115,86,0.18),  0 4px 12px rgba(200,115,86,0.10)
gold        0 8px 24px rgba(212,165,116,0.20), 0 4px 12px rgba(212,165,116,0.12)
clay        0 8px 24px rgba(166,124,94,0.16),  0 4px 12px rgba(166,124,94,0.09)
```

Semantic:
```
card        0 2px 8px rgba(46,42,40,0.06),  0 8px 24px rgba(46,42,40,0.04)
cardHover   0 4px 12px rgba(46,42,40,0.08), 0 12px 32px rgba(46,42,40,0.06)
image       0 8px 32px rgba(46,42,40,0.12)
imageHover  0 12px 48px rgba(46,42,40,0.16)
glass       0 8px 32px rgba(46,42,40,0.08)
glassHover  0 12px 40px rgba(46,42,40,0.12)
```

Focus rings (3px, 25–30% alpha):
```
focusRing            0 0 0 3px rgba(125,133,112,0.25)   -- sage default
focusRingTerracotta  0 0 0 3px rgba(200,115,86,0.25)
focusRingGold        0 0 0 3px rgba(212,165,116,0.30)
```

Glows (16-20px, 20-30% alpha) for accent moments:
```
sage 0 0 16px rgba(125,133,112,0.20)
terracotta 0 0 16px rgba(200,115,86,0.25)
gold 0 0 20px rgba(212,165,116,0.30)
clay 0 0 16px rgba(166,124,94,0.22)
success/warning/error/info — same shape, semantic colors
```

Blurs:
```
xs blur(2)   sm blur(4)   md blur(8)   lg blur(12)   xl blur(20)   xxl blur(40)
glass blur(8)   glassFrosted blur(12)   glassSubtle blur(6)
```

### 2.7 Animations

Source: `design-system/tokens/animations.ts`.

Durations (ms): instant 0 · fast 150 · normal 300 · slow 500 · verySlow 1000 · ultra 1500. Specific: hover 250 · fadeIn 400 · fadeOut 300 · pageTransition 400 · scroll 800 · ripple 600.

Easings:
```
easeInOut  cubic-bezier(0.4, 0, 0.2, 1)    -- default
easeOut    cubic-bezier(0.0, 0, 0.2, 1)
easeIn     cubic-bezier(0.4, 0, 1, 1)
sharp      cubic-bezier(0.4, 0, 0.6, 1)
organic    cubic-bezier(0.37, 0, 0.63, 1)  -- nature-inspired
bounce     cubic-bezier(0.68, -0.55, 0.265, 1.55)
smooth     cubic-bezier(0.25, 0.46, 0.45, 0.94)
```

Entry animations (used by AnimatedElement on intersection):
```
fadeIn       opacity 0→1
slideUp      translateY 20→0  + opacity 0→1
slideDown    translateY -20→0 + opacity 0→1
slideLeft    translateX 20→0  + opacity 0→1
slideRight   translateX -20→0 + opacity 0→1
scaleUp      scale 0.95→1  + opacity 0→1
scaleDown    scale 1.05→1  + opacity 0→1
slideUpFade  translateY 40→0 + opacity 0→1
slideDownFade translateY -40→0 + opacity 0→1
zoomIn       scale 0.9→1  + opacity 0→1
zoomOut      scale 1.1→1  + opacity 0→1
reveal       clip-path inset(0 100% 0 0)→inset(0 0 0 0) + opacity
blur         filter blur(10)→blur(0) + opacity
bounceIn     0.3 → 1.05 → 0.9 → 1, opacity 0 → 0.8 → 0.9 → 1
```

Continuous loops (apply to decorative elements, not content):
```
float    translateY 0 → -10 → 0   (3s organic loop)
sway     rotate -1° → 1° → -1°    (3s organic loop)
pulse    scale 1 → 1.05 → 1       (2s loop)
shimmer  background-position -1000 → 1000  (2s loop, used by SkeletonLoader)
ripple   scale 0 → 4, opacity 1 → 0  (single shot)
gradient backgroundPosition 0% → 100% → 0% (15s, used by PublicLayout heroNatural background)
```

### 2.8 z-index

```
hide -1   base 0
dropdown 10   sticky 20   fixed 30   overlay 40
modal 50   popover 60   tooltip 70   toast 80   loading 90   max 100

(MUI legacy that v2 should reproduce equivalents for)
appBar 1100   drawer 1200   modalBackdrop 1300   modalContent 1400   snackbar 1500
```

---

## 3. Layout Primitives (must exist in v2)

### 3.1 PublicLayout

Wraps every one of the 12 routes. v1 source: `components/layout/PublicLayout.tsx`.

**Structure** (top to bottom):
1. **Animated body background**: `gradients.heroNatural` at `200% 200%` size, 15s `ease infinite` keyframe shifting position 0% → 100% → 0%. Honor `prefers-reduced-motion` (no animation, hold at 0%).
2. **Pseudo `::before` depth overlay** at z 0, position absolute fill, layered `radialSage` + `radialWarm` gradients, `pointer-events: none`.
3. **Header band** at z 2 (`PublicHeader`).
4. **Main content** at z 1, flex column, `pt: { mobile: 120, desktop: 140 }`, `pb: 0`. Optional `fullHeight` prop forces `min-height: 100vh` on the main content (used by Home).
5. **Footer band** at z 2 (`PublicFooter`).

**Container props**: `display: flex; flex-direction: column; min-height: 100vh; width: 100%; overflow: hidden; position: relative`.

### 3.2 PublicHeader

v1 source: `components/layout/PublicHeader.tsx`. Fixed AppBar.

**Visual states**:
- **Transparent (over hero)**: `background: transparent`, `backdrop-filter: blur(20px)`, no bottom border.
- **Scrolled (after 50px or on non-home pages)**: `background: alpha(sage[500], 0.95)`, `backdrop-filter: blur(20px)`, bottom border `1px solid alpha(sage[700], 0.2)`, text color white.

**Logo**: `/logo.png` at responsive heights — 72px mobile / 80px tablet / 96px desktop. Fallback text: "LifePlace · Alfonso" in heading font.

**Desktop nav** (≥lg, 1024px): horizontal list of 10 items in this order: Home · About Us · Services · Rates · Facilities · Gallery · Partner With Us · Reviews · Podcasts · Contact. Active route gets a **24×2px underline pill** centered below, sage-on-transparent or terracotta-on-scrolled.

**Right cluster** (desktop):
- "My Dashboard" — outlined sage button, only when authenticated.
- "Sign In" — text button.
- "Book Now" — terracotta primary, hover `terracotta[600]` + `translateY(-1px)`. On `/booking*`, label becomes "Booking..." and button is disabled-darkened.

**Mobile nav** (<lg): hamburger opens **right-anchored drawer**, width 280px, paper background. List of all nav items + sign-in/register or My Dashboard cluster at the bottom. Active list items get `alpha(sage[500], 0.10)` background with `sage[600]` text.

### 3.3 PublicFooter

v1 source: `components/layout/PublicFooter.tsx`.

**Background**: `gradients.earthToSky`. Text: white.

**Grid**: 4-column on `md+` (company info spans 2 cols), single column on xs.

**Columns**:
1. **Company info + social** (2 col span): logo + tagline + Facebook / Instagram / TikTok icon row. Hover: gold tint + `translateY(-2px)`.
2. **Quick Links**: About · Reviews · Contact.
3. **Explore**: Services · Rates · Facilities · Partner · Podcasts.
4. **Contact Us**: location pin · phone · email line items.

**Bottom band**: copyright + Privacy · Terms links. Divider: `1px solid rgba(255,255,255,0.1)`.

**Animation**: footer wrapped in fadeIn entries with 100ms / 200ms staggers.

---

## 4. Design-System Components (must exist in v2)

These are the v1 components in `design-system/components/` that must be implemented in v2 (implementation-agnostic — could be React + Tailwind, could be anything else; the contract is the visual + interactive behavior).

| Component | Purpose | Variants / props |
|---|---|---|
| **HeroBackground** | Full-bleed gradient/image hero wrapper | `gradient`: warmSage \| sunsetGlow \| goldenHour \| earthToSky \| meadow \| terracottaWarmth \| heroWarm \| heroNatural \| heroSunset · `animated` boolean (15s gradient loop) · `overlay`: light \| dark \| gradient \| none |
| **Section** | Vertical rhythm wrapper | `bg`: white \| cream \| sage \| terracotta \| gradient · `spacing`: small \| medium \| large \| xlarge (60% / 75% / 100% scaling at xs/sm/md) |
| **Container** | Centered horizontal wrapper | `maxWidth`: narrow (800) \| content (1200) \| wide (1400) \| full · responsive horizontal padding (16/24/32/48) |
| **GlassCard** | Glassmorphic card | `variant`: light \| dark \| forest \| earth \| gold · `intensity`: subtle \| medium \| strong (blur 6/8/12) · `hover` boolean (lift -4px) · optional gradient overlay |
| **ModernCard** | Clean elevated card | `variant`: subtle \| elevated \| warm \| terracotta \| sage \| outlined · `size`: sm 16 / md 24 / lg 32 padding · hover lift -4px + shadow swap |
| **AnimatedElement** | IntersectionObserver-driven entry + continuous loops | entry `animation`: any from §2.7 entry list · continuous: float / sway / pulse · `delay` ms · `duration` ms (default 500) · `threshold` (default 0.1) · `repeat` boolean · honors `prefers-reduced-motion` |
| **Button** | Branded button with token-driven variants | `variant`: primary (sage) \| secondary (terracotta) \| sage \| terracotta \| gold \| text \| outlined · `size`: sm \| md \| lg |
| **SkeletonLoader** | Loading shimmer | base bg `sage[100]`, custom shimmer gradient (2s loop) · type presets: card / list / text / avatar / button / calendar / venue |
| **SocialProof** | Live activity feed component | EventActivity feed + stats badges (visibility / availability / star icons), with pulse + slideIn keyframes |
| **ImageWithOverlay** | Background-image hero alt | `image`, `overlay`: gradient \| light \| dark · responsive heights |
| **EventAvailabilityCalendar** | Month-view calendar | day states: bookable / booked / blocked · used by Home `AvailabilitySection` |
| **OrganicShapes** | Decorative SVG blob patterns | optional decorative layer |
| **GradientBackground** | DEPRECATED in v1 — do NOT carry forward | — |

---

## 5. Per-Page Section Breakdown

Each page lists sections in DOM order with one-line purpose. Section components live in `pages/<area>/components/` in v1 and must have v2 equivalents. Hero patterns are noted by gradient + overlay choice.

### 5.1 `/` Home

| # | Section | v1 component | Notes |
|---|---|---|---|
| 1 | HeroSection | `pages/home/components/HeroSection.tsx` | `HeroBackground gradient="warmSage" animated overlay="gradient"`, full-viewport-minus-header. **display2** "Celebrate Life's Most / Precious Moments" white + textShadow. body subhead. GlassCard biblical quote ("John 10:10b"). Two CTAs: terracotta "Book Your Event" + sage outline "Client Portal". Staggered fadeIn 0/200/400/600ms. |
| 2 | VenuesSection | `pages/home/components/VenuesSection.tsx` | `Section bg="white" spacing="large"` + `Container maxWidth="wide"`. h2 "Facilities & Amenities". Responsive 1/2/3-col grid of venue cards (max 6, sorted by `sort_order`). Skeleton fallback. Data: `useVenueGallery()` → `/venues/public/gallery-venues/`. Closing primary CTA "Explore All Facilities". |
| 3 | SocialProofSection | `pages/home/components/SocialProofSection.tsx` | `Section bg="sage" spacing="large"`. h2 "Trusted by Hundreds of Families". 3 testimonials in `GlassCard variant="light" intensity="medium" hover` (5-star rating, italic Cormorant quote, author/role/event). Trust badges row: CheckCircle "Certified Venue" / Favorite "Family Owned" / People "Expert Team" in subtle GlassCards. |
| 4 | AvailabilitySection | `pages/home/components/AvailabilitySection.tsx` | `Section bg="cream" spacing="large"` + `Container maxWidth="narrow"`. h2 "Check Availability". `ModernCard variant="elevated" size="large"` wrapping `EventAvailabilityCalendar` with month-fetch loading overlay (sage spinner). Data: `useEventAvailability` + `useGlobalAvailabilityConfig`. Click bookable date → toast + 500ms delay nav to `/booking`. Closing terracotta "Start Your Booking" CTA. |
| 5 | ServicesSection | `pages/home/components/ServicesSection.tsx` | `Section bg="sage" spacing="large"`. 4-card grid (1/2/4 cols) of styled service cards (white 95% bg, top-bar gradient on hover, `translateY(-8px)` lift). 80px circular icon wrapper with morningMist gradient + warmSage halo. Icons: Favorite (terracotta) · Groups (sage) · Nature (sage) · School (olive). Staggered slideUp 200/300/400/500ms. |
| 6 | ContactSection | `pages/home/components/ContactSection.tsx` | `Section` (sage gradient). 3 contact GlassCards (LocationOn terracotta · Phone sage · Email gold) with overline labels. Terracotta "Book Now" + sage outline "Register" CTAs. |

### 5.2 `/about` About

| # | Section | v1 component | Notes |
|---|---|---|---|
| 1 | AboutHero | `pages/about/components/AboutHero.tsx` | `HeroBackground gradient="earthToSky" overlay="light"`, full-viewport. display2 heading + GlassCard biblical quote + scroll-down `KeyboardArrowDown` indicator with smooth `window.scrollTo`. |
| 2 | ServicesSection | (about variant) | Repeats home services in different layout. |
| 3 | FacilitiesGrid | `pages/about/components/FacilitiesGrid.tsx` | Venue thumbnails grid. |
| 4 | LocationContact | `pages/about/components/LocationContact.tsx` | Sage Section with map + contact cards + book CTA. |

### 5.3 `/services` Services

| # | Section | v1 component | Notes |
|---|---|---|---|
| 1 | ServicesHero | `pages/services/components/ServicesHero.tsx` | `HeroBackground gradient="warmSage"`, scroll-anchor button to `#services-cta`. |
| 2 | What We Offer | inline in `pages/services/ServicesPage.tsx:26-167` | `Section bg="white" spacing="large"`, h2 + body, 1/2-col responsive grid of `ServiceCard` (4 services: camps-retreats, team-building, workshops, weddings). Each ServiceCard pulls featured image from `useEventTypeImages()` → `/events/event-types/` keyed by name lookup. |
| 3 | ServicesCTA | `pages/services/components/ServicesCTA.tsx` | Terracotta-themed CTA section. |

### 5.4 `/rates` Rates

| # | Section | v1 component | Notes |
|---|---|---|---|
| 1 | RatesHero | `pages/rates/components/RatesHero.tsx` | `HeroBackground gradient="goldenHour"` (premium luxury feel). |
| 2 | Event Packages | `pages/rates/components/PackageCard.tsx` (grid host inline in RatesPage) | `Section bg="white"`, 1/2-col grid of `PackageCard`s. Data: `useRatesPageData()` returns `event_packages` / `wedding_venues` / `wedding_combos` / `all_in_weddings`. |
| 3 | WeddingPackages | `pages/rates/components/WeddingPackages.tsx` | Wedding-specific tiered package cards. |
| 4 | RatesNote | `pages/rates/components/RatesNote.tsx` | Disclaimer / notes panel. |

Loading + error states handled with full-screen sage spinner + alert.

### 5.5 `/facilities` Facilities

| # | Section | v1 component | Notes |
|---|---|---|---|
| 1 | FacilitiesHero | `pages/facilities/components/FacilitiesHero.tsx` | `HeroBackground gradient="earthToSky"`. |
| 2 | Venue Showcase | `pages/facilities/components/FacilitiesVenueCard.tsx` (host inline) | `Section bg="cream" spacing="large"`. h2 "Our Venues". Stack of `FacilitiesVenueCard` (all venues sorted) with `FacilitiesVenueCardSkeleton` loading state and staggered animationDelay (100 + i×150). Data: `useVenueGallery()`. |
| 3 | LocationContact | shared | Reused. |

### 5.6 `/gallery` Gallery

| # | Section | v1 component | Notes |
|---|---|---|---|
| 1 | GalleryHero | `pages/gallery/components/GalleryHero.tsx` | `ImageWithOverlay image="/images/gallery-hero.jpg" overlay="gradient"`, fixed responsive heights 340–540px. Negative margin-top -120/-140 + matching pt to bleed under header. |
| 2 | GalleryContent | `pages/gallery/components/GalleryContent.tsx` | Filter bar + grid + lightbox. 5 categories: All / Venues / Weddings / Team Building / Camps & Retreats (backend values: GENERAL / WEDDING / TEAM_BUILDING). Pagination 12/page. URL `?category=` deep-link. Data: `useGalleryVenues`, `useGalleryPhotos` → `/venues/public/gallery/`. |
| — | Sticky CTA (mobile only) | inline | `bottom: 0` on `<900px`: terracotta full-width "Ready to Book? Schedule Your Event" with `backdrop-filter: blur(12px)` and `rgba(255,255,255,0.95)` bg. |

Lightbox: `yet-another-react-lightbox` v3 in v1 — v2 may pick any modern lightbox, but must support keyboard nav, swipe on mobile, and lazy-loaded thumbnails.

### 5.7 `/reviews` Reviews

| # | Section | v1 component | Notes |
|---|---|---|---|
| 1 | ReviewsHero | `pages/reviews/components/ReviewsHero.tsx` | `HeroBackground gradient="sunsetGlow"`, scroll anchor. |
| 2 | TestimonialGrid | `pages/reviews/components/TestimonialCard.tsx` (grid host) | Grid of `TestimonialCard` (star rating + Cormorant italic quote). |
| 3 | CTA Section | inline | `Section bg="sage"` + `ModernCard elevated large`, h3 "Create Your Own Unforgettable Moment", terracotta book CTA. |

### 5.8 `/contact` Contact

| # | Section | v1 component | Notes |
|---|---|---|---|
| 1 | ContactHero | `pages/contact/components/ContactHero.tsx` | `HeroBackground gradient="terracottaWarmth"`. |
| 2 | ContactInfo | `pages/contact/components/ContactInfo.tsx` | `Section bg="cream"`, ModernCard grid of contact channels. |
| 3 | ContactForm | `pages/contact/components/ContactForm.tsx` | TextField + dropdown inquiry-type selector. 5 inquiry types: GENERAL_INQUIRY / EVENT_QUESTION / PARTNERSHIP_INTEREST / PRICING_QUESTION / OTHER. Submit POSTs to `/events/public/inquiries/`. Success/error Alert + Send icon. |
| 4 | ContactSocial | `pages/contact/components/ContactSocial.tsx` | Social channel CTAs. |
| 5 | ContactMap | `pages/contact/components/ContactMap.tsx` | `Section bg="sage"` + `ModernCard elevated`, embedded Google Maps iframe + "Open in Maps" outlined button (window.open `noopener,noreferrer`). |

### 5.9 `/partner` Partner

| # | Section | v1 component | Notes |
|---|---|---|---|
| 1 | PartnerHero | `pages/partner/components/PartnerHero.tsx` | `HeroBackground gradient="earthToSky"`, two scroll anchors (`#partner-benefits`, `#partner-contact`). |
| 2 | PartnerBenefits | `pages/partner/components/PartnerBenefits.tsx` | Cormorant headings with terracotta accent icons. |
| 3 | PartnerCategories | `pages/partner/components/PartnerCategories.tsx` | id-anchored. |
| 4 | PartnerContact | `pages/partner/components/PartnerContact.tsx` | id-anchored. |

### 5.10 `/podcasts` Podcasts

| # | Section | v1 component | Notes |
|---|---|---|---|
| 1 | PodcastsHero | `pages/podcasts/components/PodcastsHero.tsx` | `HeroBackground gradient="heroWarm"`. |
| 2 | Episodes Grid | `pages/podcasts/components/PodcastsGrid.tsx` (+ `PodcastEpisode.tsx`) | `Section bg="white" spacing="large"` + `Container maxWidth="wide"`. Hardcoded episodes array in v1 (no API). 1/2/3-col responsive with staggered animations. v2 may keep hardcoded or move to a small CMS table. |

### 5.11 `/privacy` Privacy

| # | Section | Notes |
|---|---|---|
| 1 | PrivacyHero | (NEW IN v2) — terracotta or sage muted gradient hero with display2 "Privacy Policy" title and overline "Effective {date}". v1 had no hero — this is a deliberate fix from the v1 visual outlier. |
| 2 | Document body | `Section bg="white"` + `Container maxWidth="narrow"` + tokenized prose container (heading font for h1-h3, body font for paragraphs, generous line-height 1.7). Sanitized HTML rendering. Data: `/settings/public/legal/PRIVACY_POLICY/`. |

### 5.12 `/terms` Terms

Same structure as `/privacy`, gradient `goldenHour` for hero. Data: `/settings/public/legal/TERMS_OF_SERVICE/`.

---

## 6. Animation & Interaction Patterns (must exist in v2)

1. **Scroll-triggered reveals everywhere**: IntersectionObserver-driven entry animations (fadeIn / slideUp / slideDown / scaleUp etc.) with default threshold 0.1, default duration 500ms, configurable delay (commonly 0/100/200/300/400/600ms staggers within a section). One-shot by default; `repeat` opt-in re-fires.
2. **Continuous decorative loops**: float (10px Y), sway (-1°↔1°), pulse (1↔1.05) — no IntersectionObserver, immediate. Only on decorative elements, never on text content.
3. **Hero gradient animation**: `200% 200%` background-size + 15s `ease infinite` keyframe shifting position 0% → 100% → 0%. Disabled under `prefers-reduced-motion`.
4. **Card hover lifts**: ServiceCard `translateY(-8px)` + shadow swap; ModernCard / GlassCard `translateY(-4px)`; EventTypeCard `-8px` + bg/border alpha bumps; Buttons `translateY(-1/-2px)` + colored shadow.
5. **Header scroll behavior**: `window.scrollY > 50` toggles `isScrolled` → `bg sage[500]/0.95`, adds bottom border + text color white.
6. **Smooth scroll anchors**: AboutHero, ServicesHero, PartnerHero, ReviewsHero use `scrollIntoView({ behavior: 'smooth' })` to jump to anchored sections.
7. **Toast feedback before navigation**: AvailabilityCalendar shows success toast then 500ms delay before route push.
8. **`prefers-reduced-motion` site-wide**: every animation must check this and degrade — entry animations skip to final state, continuous loops freeze, gradient animation freezes at 0% position.
9. **Booking-related transitions** (out of scope but using the same brand): redesign freely with 2026 conversion-flow patterns; must use the same easings and durations as everything else.

---

## 7. Asset Inventory

### Fonts

- **Cormorant Garamond** (300, 400, 500, 600, 700) — headings.
- **Inter** (300, 400, 500, 600, 700, 800) — body.
- **In v2**: load via `next/font/google` (CSS variable `--font-heading` and `--font-body`). Self-hosting fonts via Next means no FOIT/FOUT and no Google Fonts roundtrip. Defines two CSS variables that the design tokens reference.

### Images

| Path | Use | v2 disposition |
|---|---|---|
| `/logo.png` | PublicHeader (72/80/96) + mobile drawer (64) | Move to `apps/web/public/logo.png` (or SVG version preferred). |
| `/favicon.svg` | favicon | Move to `apps/web/public/favicon.svg`. |
| `/favicon-32x32.png`, `/favicon-16x16.png`, `/apple-touch-icon.png` | favicons (referenced but not all present in v1) | Generate full set in v2. |
| `/og-image.jpg` | OG meta default | Generate per-page with `next/og` (Next 15 Open Graph image generator) instead of static fallback. |
| `/images/gallery-hero.jpg` | GalleryHero | Move to `apps/web/public/images/`. |
| `public/assets/Fountain-min.png` | decorative | Audit if still used; otherwise drop. |
| Venue / gallery / event-type images | CMS (Supabase Storage `gallery-public` bucket in v2) | Backend serves URLs; frontend uses `next/image` with proper sizing. |

### Icons

v1 uses `@mui/icons-material` exclusively. **In v2**: switch to `lucide-react` (the factory's icon library — tree-shakable, smaller, Tailwind-friendly). Cross-walk:

| MUI icon | Lucide equivalent | Used in |
|---|---|---|
| Menu | Menu | header |
| Close | X | header drawer |
| ArrowForward | ArrowRight | nav buttons |
| ArrowBack | ArrowLeft | back buttons |
| LocationOn | MapPin | contact, footer |
| Phone | Phone | contact, footer |
| Email | Mail | contact, footer |
| Facebook | Facebook | footer |
| Instagram | Instagram | footer |
| MusicNote | Music (TikTok) | footer |
| Star | Star | reviews |
| CheckCircle | CheckCircle2 | trust badges |
| Favorite | Heart | services, badges |
| Groups | Users | services |
| Nature | Trees | services |
| School | GraduationCap | services |
| Celebration | PartyPopper | hero, booking-complete |
| Schedule | Clock | booking timer |
| Warning | AlertTriangle | alerts |
| RequestQuote | FileText | quote alerts |
| KeyboardArrowDown | ChevronDown | scroll indicator |
| Send | Send | contact form |
| OpenInNew | ExternalLink | map button |
| Event | Calendar | booking |
| Payment | CreditCard | booking |
| Support | LifeBuoy | booking |
| Dashboard | LayoutDashboard | nav |
| Home | Home | nav |
| AccessTime | Clock | booking |
| CalendarToday | CalendarDays | booking |
| AttachMoney | DollarSign | rates, booking |
| Visibility | Eye | social proof |
| EventAvailable | CalendarCheck | social proof |
| People | Users | trust badges |

---

## 8. Backend endpoints the public pages depend on (must exist in v2)

| Endpoint | Used by | v2 disposition |
|---|---|---|
| `/venues/public/gallery-venues/` | Home VenuesSection, Facilities | `/api/venues/gallery` (Server Action / RSC fetch) |
| `/venues/public/gallery/` | Gallery (with category filter) | `/api/gallery/photos` |
| `/events/event-types/` | Services (featured images) + Booking | `/api/event-types` |
| `/events/public/inquiries/` (POST) | Contact form | Server Action |
| `/settings/public/legal/{PRIVACY_POLICY\|TERMS_OF_SERVICE}/` | Privacy, Terms | RSC fetch |
| Availability data | Home AvailabilitySection (calendar) | RSC fetch + Realtime subscription for live updates |

Booking-flow endpoints are out of scope for this contract (booking flow is being redesigned).

---

## 9. Hard-to-replicate-without-MUI patterns (informational)

These patterns are in v1 and the v2 implementation must reproduce the visual + interactive behavior without MUI. Listed for the v2 implementer's awareness:

- **`sx` prop pervasiveness with responsive arrays** (`{ xs, sm, md, lg }`) and pseudo selectors (`'&:hover'`, `'&::before'`). v2: Tailwind responsive prefixes + `data-` attributes for state-driven styles. CSS variables for theme-aware alpha blends.
- **`alpha(theme.palette.X.main, opacity)` mixed with token colors**. v2: define brand colors as CSS variables in HSL/OKLCH space, use `color-mix(in srgb, var(--sage-500) 95%, transparent)` or Tailwind's `/X` alpha modifier.
- **`useTheme()` runtime theme reads**. v2: tokens are CSS variables, no runtime JS theme object. Components consume `var(--sage-500)` directly.
- **MUI `Stepper alternativeLabel`** (booking flow only — out of scope here, but flagged because v2 booking flow may want a redesigned stepper).
- **MUI `LinearProgress` with custom bar overrides** (booking flow only — out of scope).
- **MUI `Drawer anchor="right"` for mobile nav** with `PaperProps.sx` overrides. v2: Radix Dialog/Sheet primitive in shadcn-style, with right-anchor variant.
- **MUI `TextField` + `Select` with floating labels and helper text** (Contact form). v2: shadcn Input + Select with custom Label component above. Or floating-label variant if needed.
- **MUI `Backdrop` + `CircularProgress` overlay** (booking flow — out of scope).
- **MUI `Alert` with `action` prop and `severity` colors**. v2: shadcn Alert variant (`success` / `warning` / `error` / `info`) with custom action slot.
- **MUI `Skeleton` with custom `&::after` shimmer**. v2: custom Skeleton component with token shimmer keyframe (animations.ts shimmer values).
- **MUI `Avatar` with custom box-shadow glow + border alpha** (booking-complete success badge — out of scope).
- **MUI `styled(Box)` with `shouldForwardProp` filter pattern**. v2: `cva` (class-variance-authority) for variant-driven components, `data-*` attributes for state filtering at the DOM boundary.
- **`@keyframes` defined inline in `sx` props**. v2: all keyframes go in `globals.css` (`@keyframes float`, `@keyframes sway`, `@keyframes pulse`, `@keyframes shimmer`, `@keyframes gradient`).

---

## 10. SEO + meta

v1 uses React Router v7's `meta()` exports per route module (per `frontend/client-portal/CLAUDE.md`). v2 uses Next App Router's `generateMetadata` per page. Each public page must export:

- `<title>` — page-specific
- `<meta name="description">` — page-specific
- Open Graph: `og:title`, `og:description`, `og:image` (generated per-page via `next/og` route segment), `og:url`, `og:type`
- Twitter card: `twitter:card="summary_large_image"`, `twitter:title`, `twitter:description`, `twitter:image`
- `canonical` link

Sitemap: `app/sitemap.ts` enumerating all 12 public routes. Robots: `app/robots.ts` allowing all and pointing at sitemap.

---

## 11. Acceptance: how v2 is measured against this contract

A v2 public page passes the contract if:

1. **Tokens match** — every color, font, size, radius, shadow, spacing value visible on the page comes from the §2 token set (no off-token values).
2. **Layout matches** — Section / Container / GlassCard / ModernCard / HeroBackground primitives with the documented variants exist and render with the documented values.
3. **Sections present** — every section listed in §5 for that page exists, in the documented order, with the documented data source.
4. **Animations match** — entry + continuous + hover animations use the documented durations and easings, honor `prefers-reduced-motion`, fire on the documented triggers.
5. **Header behavior matches** — fixed AppBar, transparent-over-hero / sage-when-scrolled, 10-item nav order, right-cluster CTAs, mobile drawer right-anchored 280px.
6. **Footer matches** — earthToSky gradient, 4-column grid, social hover lift, copyright + legal links bottom band.
7. **Defects from §1 are fixed** — fonts loaded properly, Privacy/Terms in design system, single router (Next), legacy aliases dropped, prefers-reduced-motion site-wide.

Visual diff tooling: a Playwright + Percy / Argos / Chromatic snapshot suite per page at three breakpoints (375 / 768 / 1440) is the recommended automated check, but not in scope of this contract document.

---

## Change log

- v0.1 — initial draft, frozen against v1 commit `e30cbb62` (main branch state at v2 design start).
