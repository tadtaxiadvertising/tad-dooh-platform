package com.tad.dooh.driver.ui.theme

import androidx.compose.ui.graphics.Color

// ── TAD Brand Palette ──────────────────────────────────────────────────────────
// Exact hex matches to the PWA globals.css Stitched UI design system.
// This IS the brand identity — not decorative CSS.
//
// NOTE: Compose Color(long) uses ARGB format. Opaque colors must have 0xFF alpha.
// CSS #RRGGBB → Compose 0xFFRRGGBB.  CSS rgba → Compose 0xAARRGGBB.

// ── Primary accent ─────────────────────────────────────────────────────────────
val TadYellow = Color(0xFFFFD400)      // Primary accent — the brand gold (#FFD400)
val TadGold = Color(0xFFFAD400)         // Slightly warmer gold variant (#FAD400)
val TadAccent = Color(0xFFFACC15)       // Amber-weighted accent (Tailwind amber-500 #FACC15)
val TadYellowDark = Color(0xFFE5BF00)   // Pressed/active state variant (#E5BF00)
val TadYellowVariant = Color(0xFFFFD466) // Lighter variant for hover states (#FFD466)
val TadYellowAlpha20 = Color(0x33FFD400) // rgba(255,212,0,0.20) — 20% opacity
val TadYellowAlpha50 = Color(0x80FFD400) // rgba(255,212,0,0.50) — 50% opacity

// ── Backgrounds ─────────────────────────────────────────────────────────────────
val TadDark = Color(0xFF0C0F14)         // Midnight black (warmer than pure #0a0a0a)
val TadSurface = Color(0xFF161B22)      // Card/surface layer — GitHub-dark inspired
val TadSurfaceVariant = Color(0xFF1C2128) // Deeper surface variant
val TadCard = Color(0xFF1A1F26)         // Glassmorphism card background base
val TadStatusBar = Color(0xFF0A0A0A)    // System bar background
val TadNavBar = Color(0xFF0A0A0A)       // Navigation bar background

// ── Semantic / state ────────────────────────────────────────────────────────────
val TadRed = Color(0xFFDC2626)          // Offline, errors, kill-switch (Tailwind red-600)
val TadGreen = Color(0xFF22C55E)        // Online, success, tracking (Tailwind green-500)
val TadSuccess = Color(0xFF2EA043)      // GitHub-dark success green
val TadError = Color(0xFFF85149)        // GitHub-dark error red
val TadWarning = Color(0xFFD29922)      // GitHub-dark warning amber
val TadInfo = Color(0xFF58A6FF)         // GitHub-dark info blue

// ── Text ────────────────────────────────────────────────────────────────────────
val TadTextPrimary = Color(0xFFF0F6FC)  // Primary text on dark surfaces
val TadTextSecondary = Color(0xFF8B949E) // Muted/descriptive text
val TadTextDisabled = Color(0xFF484F58)  // Disabled/placeholder text

// ── Borders / outlines ─────────────────────────────────────────────────────────
val TadBorder = Color(0xFF30363D)       // Default border outline
val TadBorderFocus = Color(0xFFFFD400)  // Focus-state border (matches TadYellow)

// ── Alpha overlays — glassmorphism building blocks ─────────────────────────────
val WhiteAlpha5 = Color(0x0DFFFFFF)   // rgba(255,255,255,0.05) — subtle glass border
val WhiteAlpha10 = Color(0x1AFFFFFF)  // rgba(255,255,255,0.10) — hover glass border
val WhiteAlpha20 = Color(0x33FFFFFF)  // rgba(255,255,255,0.20) — glassmorphism shine
val Zinc900Alpha40 = Color(0x6618181B) // rgba(24,24,27,0.40) — glass card background
val Zinc900Alpha60 = Color(0x9918181B) // rgba(24,24,27,0.60) — hover glass background
val Zinc900Alpha80 = Color(0xCC18181B) // rgba(24,24,27,0.80) — pressed glass background
val TadDarkAlpha92 = Color(0xEB0A0A0A) // rgba(10,10,10,0.92) — bottom nav background
val TadScrim = Color(0x800C0F14)      // rgba(12,15,20,0.50) — dark overlay for dialogs/scrim

// ── Zinc scale (Tailwind zinc) ──────────────────────────────────────────────────
val Zinc900 = Color(0xFF18181B)
val Zinc800 = Color(0xFF27272A)
val Zinc700 = Color(0xFF3F3F46)
val Zinc600 = Color(0xFF52525B)
val Zinc500 = Color(0xFF71717A)
val Zinc400 = Color(0xFFA1A1AA)
val Zinc300 = Color(0xFFD4D4D8)
val Zinc200 = Color(0xFFE4E4E7)
val Zinc100 = Color(0xFFF4F4F5)

// ── Amber / Emerald (Tailwind) ──────────────────────────────────────────────────
val Amber300 = Color(0xFFFCD34D)
val Amber400 = Color(0xFFFBBF24)
val Amber500 = Color(0xFFF59E0B)
val Emerald400 = Color(0xFF34D399)
val Emerald500 = Color(0xFF10B981)

// ── Utility ─────────────────────────────────────────────────────────────────────
val Black = Color(0xFF000000)
val White = Color(0xFFFFFFFF)
val Transparent = Color(0x00000000)
