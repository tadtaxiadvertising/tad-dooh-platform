package com.tad.dooh.driver.ui.theme

import androidx.compose.material3.Typography
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp

// ── Stitched UI Typography ──────────────────────────────────────────────────────
// Matches the PWA globals.css type scale exactly.
// Letter spacing values converted from CSS px → Compose sp at 14sp baseline.

// ── Font family placeholders ────────────────────────────────────────────────────
// TODO: Replace with actual bundled fonts (Inter/Geist) when asset files are added.
// Using FontFamily.Default (Roboto) as fallback for initial build.
val TadFontFamily = FontFamily.Default

// ── Custom text styles — Stitched UI design tokens ─────────────────────────────

/** Heading — 28sp ExtraBold, tight tracking. Section titles, card headers. */
val TadHeading = TextStyle(
    fontFamily = TadFontFamily,
    fontWeight = FontWeight.ExtraBold,
    fontSize = 28.sp,
    lineHeight = 34.sp,
    letterSpacing = (-0.5).sp
)

/** Subheading — 18sp Bold. Secondary headings, section labels. */
val TadSubheading = TextStyle(
    fontFamily = TadFontFamily,
    fontWeight = FontWeight.Bold,
    fontSize = 18.sp,
    lineHeight = 24.sp,
    letterSpacing = 0.sp
)

/** Body — 14sp Normal. Default reading text, descriptions, form fields. */
val TadBody = TextStyle(
    fontFamily = TadFontFamily,
    fontWeight = FontWeight.Normal,
    fontSize = 14.sp,
    lineHeight = 20.sp,
    letterSpacing = 0.sp
)

/** Caption — 10sp Black, wide tracking. Uppercase labels, badges, status tags. */
val TadCaption = TextStyle(
    fontFamily = TadFontFamily,
    fontWeight = FontWeight.Black,
    fontSize = 10.sp,
    lineHeight = 14.sp,
    letterSpacing = 3.sp
)

/** Label — 12sp SemiBold. Button labels, tab text, short identifiers. */
val TadLabel = TextStyle(
    fontFamily = TadFontFamily,
    fontWeight = FontWeight.SemiBold,
    fontSize = 12.sp,
    lineHeight = 16.sp,
    letterSpacing = 0.5.sp
)

/** Display — 36sp Black. Large numeric display: balances, counters, KPIs. */
val TadDisplay = TextStyle(
    fontFamily = TadFontFamily,
    fontWeight = FontWeight.Black,
    fontSize = 36.sp,
    lineHeight = 42.sp,
    letterSpacing = (-1).sp
)

// ── Material3 Typography mapping ────────────────────────────────────────────────
// Maps Stitched UI custom styles into the Material3 Typography slots so
// MaterialTheme.typography works seamlessly throughout the app.

val TadTypography = Typography(
    displayLarge = TadDisplay,
    displayMedium = TadDisplay.copy(fontSize = 30.sp, lineHeight = 36.sp),
    displaySmall = TadHeading,
    headlineLarge = TadHeading,
    headlineMedium = TadSubheading.copy(fontSize = 20.sp, lineHeight = 26.sp),
    headlineSmall = TadSubheading,
    titleLarge = TadSubheading.copy(fontSize = 16.sp, lineHeight = 22.sp),
    titleMedium = TadLabel.copy(fontSize = 14.sp, fontWeight = FontWeight.Bold),
    titleSmall = TadLabel,
    bodyLarge = TadBody.copy(fontSize = 16.sp, lineHeight = 22.sp),
    bodyMedium = TadBody,
    bodySmall = TadBody.copy(fontSize = 12.sp, lineHeight = 16.sp),
    labelLarge = TadLabel,
    labelMedium = TadLabel.copy(fontWeight = FontWeight.Medium, fontSize = 11.sp),
    labelSmall = TadCaption
)
