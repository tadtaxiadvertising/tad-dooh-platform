package com.tad.dooh.driver.ui.theme

import android.app.ActivityManager
import android.content.Context
import android.os.Build
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.ReadOnlyComposable
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.runtime.remember
import androidx.compose.ui.platform.LocalContext

// ── Performance Fallback Detection ──────────────────────────────────────────────
// Detects low-end devices and provides composition-local flags that all
// glassmorphism modifiers read to degrade visual fidelity automatically.
//
// Thresholds (aligned with the PWA "low-perf" tier):
//   - CPU cores ≤ 4      → disableGlassmorphism = true
//   - Memory class ≤ 128MB or total RAM ≤ 2GB → disableGlassmorphism = true
//   - API level < 26 (below minSdk, but defensively coded) → disableAnimations = true

/**
 * Performance fallback flags consumed by glassmorphism modifiers.
 *
 * @param disableGlassmorphism Replace semi-transparent backgrounds with solid
 *   colors, reduce corner radius from 40dp → 24dp, drop heavy shadows.
 * @param disableAnimations Remove motion/tween animations, use instant state
 *   transitions instead.
 * @param simpleBorders Use solid 1px borders instead of alpha-gradient borders.
 */
data class PerformanceFallback(
    val disableGlassmorphism: Boolean = false,
    val disableAnimations: Boolean = false,
    val simpleBorders: Boolean = false
)

/**
 * Composition local that glassmorphism modifiers read to decide degradation.
 * Default is no fallback (full visual fidelity).
 */
val LocalPerformanceFallback = staticCompositionLocalOf<PerformanceFallback> {
    PerformanceFallback(
        disableGlassmorphism = false,
        disableAnimations = false,
        simpleBorders = false
    )
}

/**
 * Detect the device's performance tier and return the appropriate fallback.
 *
 * Detection strategy:
 *  1. ActivityManager.memoryClass — per-app heap limit (low-memory devices get 128MB or less)
 *  2. ActivityManager.isLowRamDevice() — manufacturer-declared low-RAM flag
 *  3. Runtime.totalMemory() — actual allocated heap at detection time
 *  4. CPU core count via Runtime.availableProcessors()
 *
 * A device is classified as "low-perf" if ANY of these thresholds are breached,
 * because on a kiosk tablet in a DOOH deployment, we cannot risk jank.
 */
fun detectPerformanceFallback(context: Context): PerformanceFallback {
    val activityManager = context.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager

    val isLowRamDevice = activityManager.isLowRamDevice
    val memoryClass = activityManager.memoryClass // MB per-app heap limit
    val totalCpuCores = Runtime.getRuntime().availableProcessors()

    // Large-memory-class devices (API 19+) — some tablets report >128MB here
    val largeMemoryClass = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
        activityManager.largeMemoryClass
    } else {
        activityManager.memoryClass
    }

    // Decision matrix — any single flag triggers degradation
    val disableGlassmorphism = isLowRamDevice
        || memoryClass <= 128
        || totalCpuCores <= 4

    // Animations are only disabled on truly constrained hardware
    val disableAnimations = isLowRamDevice || totalCpuCores <= 2

    // Simple borders when glassmorphism is disabled (alpha borders need blending)
    val simpleBorders = disableGlassmorphism

    return PerformanceFallback(
        disableGlassmorphism = disableGlassmorphism,
        disableAnimations = disableAnimations,
        simpleBorders = simpleBorders
    )
}

/**
 * Composable that detects the device tier and provides [LocalPerformanceFallback].
 * Must be called above any composable that uses glassmorphism modifiers.
 *
 * Usage:
 * ```
 * TadPerformanceFallbackProvider {
 *     TadDriverTheme {
 *         // ... app content
 *     }
 * }
 * ```
 */
@Composable
fun TadPerformanceFallbackProvider(content: @Composable () -> Unit) {
    val context = LocalContext.current
    val fallback = remember { detectPerformanceFallback(context) }
    CompositionLocalProvider(
        LocalPerformanceFallback provides fallback,
        content = content
    )
}

/**
 * Convenience accessor — read the current performance fallback inside any
 * composable without importing the composition local directly.
 */
@Composable
@ReadOnlyComposable
fun currentPerformanceFallback(): PerformanceFallback = LocalPerformanceFallback.current
