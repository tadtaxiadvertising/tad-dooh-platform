package com.tad.dooh.driver.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.ReadOnlyComposable
import androidx.compose.ui.graphics.Color

// ── TAD Driver Theme ─────────────────────────────────────────────────────────
// Material3 dark theme composition for the Stitched UI design system.
// This IS the brand identity — midnight black, gold accents, glassmorphism.
//
// The driver app is ALWAYS dark — no light theme exists for the kiosk display.
// isSystemInDarkTheme() is ignored intentionally.

private val TadDarkColorScheme = darkColorScheme(
    // ── Primary — TAD Yellow/Gold ──────────────────────────────────────────
    primary = TadYellow,
    onPrimary = Black,
    primaryContainer = TadYellowAlpha20,
    onPrimaryContainer = TadYellow,

    // ── Secondary — muted zinc tones ────────────────────────────────────────
    secondary = Zinc500,
    onSecondary = White,
    secondaryContainer = Zinc900Alpha40,
    onSecondaryContainer = Zinc300,

    // ── Tertiary — amber warmth ──────────────────────────────────────────────
    tertiary = Amber300,
    onTertiary = Black,
    tertiaryContainer = TadYellowAlpha20,
    onTertiaryContainer = TadGold,

    // ── Error — red for kill-switch / offline states ─────────────────────────
    error = TadRed,
    onError = White,
    errorContainer = Color(0x33DC2626), // Red at 20% opacity
    onErrorContainer = TadRed,

    // ── Backgrounds — midnight hierarchy ─────────────────────────────────────
    background = TadDark,
    onBackground = TadTextPrimary,
    surface = TadSurface,
    onSurface = TadTextPrimary,
    surfaceVariant = TadSurfaceVariant,
    onSurfaceVariant = TadTextSecondary,

    // ── Outlines ─────────────────────────────────────────────────────────────
    outline = TadBorder,
    outlineVariant = Zinc700,

    // ── Inverse ──────────────────────────────────────────────────────────────
    inverseSurface = Zinc100,
    inverseOnSurface = TadDark,
    inversePrimary = TadYellowVariant,

    // ── Scrim ────────────────────────────────────────────────────────────────
    scrim = TadScrim
)

/**
 * TAD Driver Theme — the single theme composable for the kiosk app.
 *
 * Wraps Material3 [MaterialTheme] with:
 *  - Always-dark color scheme (kiosk has no light mode)
 *  - Stitched UI typography scale
 *  - Dynamic shapes that degrade based on [LocalPerformanceFallback]
 *  - Performance fallback composition local injection
 *
 * Usage in Activity.setContent:
 * ```
 * setContent {
 *     TadDriverTheme {
 *         Surface(modifier = Modifier.fillMaxSize()) {
 *             // ... app content
 *         }
 *     }
 * }
 * ```
 */
@Composable
fun TadDriverTheme(
    content: @Composable () -> Unit
) {
    val fallback = LocalPerformanceFallback.current
    val shapes = if (fallback.disableGlassmorphism) LowPerfShapes else TadShapes

    MaterialTheme(
        colorScheme = TadDarkColorScheme,
        typography = TadTypography,
        shapes = shapes,
        content = content
    )
}

/**
 * Convenience accessor — read the current TAD brand color inside any
 * composable without importing Color.kt constants directly.
 */
@Composable
@ReadOnlyComposable
fun tadColors(): androidx.compose.material3.ColorScheme = MaterialTheme.colorScheme
