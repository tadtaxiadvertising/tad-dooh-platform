package com.tad.dooh.driver.ui.theme

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.ReadOnlyComposable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

// ── Stitched UI Glassmorphism Modifiers ──────────────────────────────────────────
// Compose doesn't have backdrop-filter (CSS blur); we simulate glassmorphism via
// semi-transparent backgrounds + subtle shadows + alpha-gradient borders.
//
// Every modifier reads [LocalPerformanceFallback] and degrades automatically:
//   - Full fidelity:    zinc900/40 bg, white/5 border, 40dp corners, heavy shadow
//   - Low-perf fallback: solid bg, 24dp corners, 1dp simple border, minimal shadow
//
// NOTE: Modifier factories that read CompositionLocals must be @Composable.
// This follows the official Compose guidance for modifier factory functions.

// ── Elevation constants ──────────────────────────────────────────────────────────
private val CardElevation: Dp = 16.dp
private val CardHoverElevation: Dp = 24.dp
private val NavElevation: Dp = 12.dp
private val LowPerfElevation: Dp = 4.dp

// ── Shadow color (matches PWA box-shadow rgba) ─────────────────────────────────
private val ShadowColor: Color = Color(0x40000000) // rgba(0,0,0,0.25)

// ── Internal helper ──────────────────────────────────────────────────────────────

/** Read the current performance fallback — @Composable so it can read the local. */
@Composable
@ReadOnlyComposable
private fun isLowPerf(): Boolean = LocalPerformanceFallback.current.disableGlassmorphism

// ── Core glassmorphism card ───────────────────────────────────────────────────────

/**
 * stitchedCard() — the signature TAD glassmorphism card modifier.
 *
 * Must be called inside a @Composable context because it reads
 * [LocalPerformanceFallback] to decide visual fidelity.
 *
 * Full fidelity:
 *   - Background: Zinc900/40 (rgba 24,24,27,0.40)
 *   - Border: White/5 (rgba 255,255,255,0.05), 1dp width
 *   - Shape: 40dp rounded corners
 *   - Shadow: 16dp elevation with 25% opacity
 *
 * Low-perf fallback (disableGlassmorphism = true):
 *   - Background: TadSurface (solid #161B22)
 *   - Border: TadBorder solid 1dp
 *   - Shape: 24dp rounded corners
 *   - Shadow: 4dp elevation
 *
 * Usage:
 * ```
 * Card(modifier = Modifier.stitchedCard()) { ... }
 * ```
 */
@Composable
fun Modifier.stitchedCard(): Modifier = this.then(
    if (isLowPerf()) {
        background(TadSurface, LowPerfCardShape)
            .border(BorderStroke(1.dp, TadBorder), LowPerfCardShape)
            .shadow(LowPerfElevation, LowPerfCardShape, ambientColor = ShadowColor, spotColor = ShadowColor)
    } else {
        background(Zinc900Alpha40, StitchedCardShape)
            .border(BorderStroke(1.dp, WhiteAlpha5), StitchedCardShape)
            .shadow(CardElevation, StitchedCardShape, ambientColor = ShadowColor, spotColor = ShadowColor)
    }
)

// ── Hover variant ────────────────────────────────────────────────────────────────

/**
 * stitchedCardHover() — glassmorphism card in hover/active state.
 *
 * Full fidelity:
 *   - Background: Zinc900/60 (rgba 24,24,27,0.60)
 *   - Border: TadYellow/40 (rgba 255,212,0,0.40), 1dp width
 *   - Shape: 40dp rounded corners
 *   - Shadow: 24dp elevation (heavier than default)
 *
 * Low-perf fallback:
 *   - Background: TadSurfaceVariant (solid #1C2128)
 *   - Border: TadBorderFocus (solid #FFD400) 1dp
 *   - Shape: 24dp corners, 4dp shadow
 */
@Composable
fun Modifier.stitchedCardHover(): Modifier = this.then(
    if (isLowPerf()) {
        background(TadSurfaceVariant, LowPerfCardShape)
            .border(BorderStroke(1.dp, TadBorderFocus), LowPerfCardShape)
            .shadow(LowPerfElevation, LowPerfCardShape, ambientColor = ShadowColor, spotColor = ShadowColor)
    } else {
        background(Zinc900Alpha60, StitchedCardShape)
            .border(BorderStroke(1.dp, TadYellowAlpha20.copy(alpha = 0.40f)), StitchedCardShape)
            .shadow(CardHoverElevation, StitchedCardShape, ambientColor = ShadowColor, spotColor = ShadowColor)
    }
)

// ── Bottom navigation ───────────────────────────────────────────────────────────

/**
 * bottomNav() — glassmorphism bottom navigation bar.
 *
 * Full fidelity:
 *   - Background: rgba(10,10,10,0.92) — nearly opaque but still layered
 *   - Border-top: TadYellow/8 (rgba 255,212,0,0.08)
 *   - Shape: 16dp top corners
 *   - Shadow: 12dp upward
 *
 * Low-perf fallback:
 *   - Background: TadNavBar (solid #0A0A0A)
 *   - Border-top: TadBorder solid 1dp
 *   - Shape: 8dp top corners, 4dp shadow
 */
@Composable
fun Modifier.bottomNav(): Modifier = this.then(
    if (isLowPerf()) {
        val lowPerfNavShape = RoundedCornerShape(topStart = 8.dp, topEnd = 8.dp)
        background(TadNavBar, lowPerfNavShape)
            .border(BorderStroke(1.dp, TadBorder), lowPerfNavShape)
            .shadow(LowPerfElevation, lowPerfNavShape, ambientColor = ShadowColor, spotColor = ShadowColor)
    } else {
        background(TadDarkAlpha92, BottomNavShape)
            .border(BorderStroke(1.dp, TadYellowAlpha20.copy(alpha = 0.08f)), BottomNavShape)
            .shadow(NavElevation, BottomNavShape, ambientColor = ShadowColor, spotColor = ShadowColor)
    }
)

// ── Active tab indicator ─────────────────────────────────────────────────────────

/**
 * activeTab() — active bottom-nav tab indicator.
 *
 * Full fidelity:
 *   - Background: TadYellow/8
 *   - Border: TadYellow/12
 *   - Gold glow shadow (amber-tinted)
 *
 * Low-perf fallback:
 *   - Background: TadYellowAlpha20
 *   - Border: TadBorderFocus solid 1dp
 *   - Minimal shadow
 */
@Composable
fun Modifier.activeTab(): Modifier = this.then(
    if (isLowPerf()) {
        background(TadYellowAlpha20, RoundedCornerShape(8.dp))
            .border(BorderStroke(1.dp, TadBorderFocus), RoundedCornerShape(8.dp))
            .shadow(2.dp, RoundedCornerShape(8.dp))
    } else {
        background(TadYellowAlpha20.copy(alpha = 0.08f), RoundedCornerShape(8.dp))
            .border(BorderStroke(1.dp, TadYellowAlpha20.copy(alpha = 0.12f)), RoundedCornerShape(8.dp))
            .shadow(
                4.dp,
                RoundedCornerShape(8.dp),
                ambientColor = TadYellowAlpha50,
                spotColor = TadYellowAlpha50
            )
    }
)

// ── Gold gradient text ───────────────────────────────────────────────────────────

/**
 * goldGradientTextStyle() — applies a gold gradient brush to text.
 *
 * Returns a [TextStyle] override (not a Modifier) because Compose text
 * gradients are applied via TextStyle.brush, not via Modifier.
 *
 * Usage:
 * ```
 * Text(
 *     text = "$1,247.50",
 *     style = goldGradientTextStyle()
 * )
 * ```
 *
 * Gradient: TadYellow → TadGold → Amber300 (left → right)
 */
fun goldGradientTextStyle(): TextStyle = TextStyle(
    brush = Brush.linearGradient(
        colors = listOf(TadYellow, TadGold, Amber300)
    )
)

// ── Low-perf card (explicit, non-automatic) ──────────────────────────────────────

/**
 * lowPerfCard() — explicitly degraded glassmorphism card.
 * Use when you want to opt into low-perf rendering regardless of
 * [LocalPerformanceFallback] (e.g. for background list items).
 *
 * Always renders as:
 *   - Background: TadSurface (solid #161B22)
 *   - Border: TadBorder solid 1dp
 *   - Shape: 24dp corners
 *   - Shadow: 2dp
 *
 * This is NOT a @Composable modifier — it doesn't read any composition locals.
 */
fun Modifier.lowPerfCard(): Modifier = this
    .background(TadSurface, LowPerfCardShape)
    .border(BorderStroke(1.dp, TadBorder), LowPerfCardShape)
    .shadow(2.dp, LowPerfCardShape, ambientColor = ShadowColor, spotColor = ShadowColor)

// ── Kill-switch overlay ──────────────────────────────────────────────────────────

/**
 * killSwitchOverlay() — full-screen lockdown overlay when the
 * subscription kill-switch fires.
 *
 * Renders a semi-opaque dark scrim with red tint:
 *   - Background: rgba(12,15,20,0.85) with red overlay at 5% opacity
 *   - No border (fills entire screen)
 *   - No shadow (flat overlay)
 *
 * This is always the same regardless of performance tier — it must look
 * authoritative and unmistakable on every device.
 * NOT a @Composable modifier — no composition local reads.
 */
fun Modifier.killSwitchOverlay(): Modifier = this
    .background(
        color = Color(0xD90C0F14), // rgba(12,15,20,0.85) — heavy scrim
        shape = RoundedCornerShape(0.dp)
    )
    .then(
        Modifier.background(
            color = TadRed.copy(alpha = 0.05f),
            shape = RoundedCornerShape(0.dp)
        )
    )
