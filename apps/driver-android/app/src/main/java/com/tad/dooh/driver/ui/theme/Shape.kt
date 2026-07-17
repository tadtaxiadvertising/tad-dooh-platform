package com.tad.dooh.driver.ui.theme

import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Shapes
import androidx.compose.ui.unit.dp

// ── Stitched UI Shapes ──────────────────────────────────────────────────────────
// The signature 40dp rounded corners (2.5rem ≈ 40dp) define the TAD visual identity.
// Low-perf variants reduce radius and shadow weight for devices ≤4 CPU cores.

/** StitchedCardShape — 40dp rounded corners, the signature TAD glassmorphism shape. */
val StitchedCardShape = RoundedCornerShape(40.dp)

/** BottomNavShape — 16dp top corners only, for the glassmorphism navigation bar. */
val BottomNavShape = RoundedCornerShape(
    topStart = 16.dp,
    topEnd = 16.dp,
    bottomStart = 0.dp,
    bottomEnd = 0.dp
)

/** InputShape — 12dp, used for text fields and search inputs. */
val InputShape = RoundedCornerShape(12.dp)

/** ButtonShape — 12dp, used for action buttons and CTAs. */
val ButtonShape = RoundedCornerShape(12.dp)

/** DialogShape — 24dp, softer than card but less extreme for modal surfaces. */
val DialogShape = RoundedCornerShape(24.dp)

/** BadgeShape — 8dp, small rounded indicator shapes. */
val BadgeShape = RoundedCornerShape(8.dp)

/** LowPerfCardShape — 24dp, reduced corner radius for low-end devices. */
val LowPerfCardShape = RoundedCornerShape(24.dp)

/** LowPerfButtonShape — 8dp, minimal rounding on buttons for low-end devices. */
val LowPerfButtonShape = RoundedCornerShape(8.dp)

// ── Material3 Shapes mapping ────────────────────────────────────────────────────
// Maps Stitched UI shapes into Material3 shape slots.

val TadShapes = Shapes(
    extraSmall = BadgeShape,
    small = InputShape,
    medium = ButtonShape,
    large = StitchedCardShape,
    extraLarge = StitchedCardShape
)

/** Low-performance fallback shapes — reduced radius, simpler geometry. */
val LowPerfShapes = Shapes(
    extraSmall = RoundedCornerShape(4.dp),
    small = RoundedCornerShape(8.dp),
    medium = LowPerfButtonShape,
    large = LowPerfCardShape,
    extraLarge = LowPerfCardShape
)
