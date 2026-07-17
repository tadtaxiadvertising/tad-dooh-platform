package com.tad.dooh.driver.ui

import android.os.Bundle
import android.view.WindowManager
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.hilt.navigation.compose.hiltViewModel
import com.tad.dooh.driver.ui.navigation.TadNavHost
import com.tad.dooh.driver.ui.theme.TadDriverTheme
import com.tad.dooh.driver.ui.viewmodel.DriverViewModel
import dagger.hilt.android.AndroidEntryPoint

/**
 * MainActivity — the single Compose entry-point for the kiosk-mode driver app.
 *
 * Key behaviours:
 * - `@AndroidEntryPoint` required so Hilt-generated code can inject this Activity
 *   and any nested `@Composable owns it (e.g. a ViewModel created with `hiltViewModel()`).
 * - Splash screen API (Android 12+) with keep-on condition until state is ready.
 * - FLAG_KEEP_SCREEN_ON for always-on kiosk display (taxi-tablet use-case).
 * - Edge-to-edge rendering (status/nav bars transparent under TadDark background).
 * - Landscape-only orientation enforced via AndroidManifest (`screenOrientation`).
 */
@AndroidEntryPoint
class MainActivity : ComponentActivity() {

    // The splash keep-on condition flag. In a production build you'd observe the
    // coroutine-rout (first telemetry sync / auth resolution) instead of this manual bool.

    @Volatile
    private var isReady: Boolean = false

    override fun onCreate(savedInstanceState: Bundle?) {
        // ── Splash screen: keep visible until initialisation finishes ────────
        val splashScreen = installSplashScreen()
        splashScreen.setKeepOnScreenCondition { !isReady }

        // ── Edge-to-edge: draw behind system bars ───────────────────────────
        enableEdgeToEdge()

        super.onCreate(savedInstanceState)

        // ── Kiosk: keep the screen awake permanently ─────────────────────────
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        window.addFlags(WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED)
        window.addFlags(WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD)

        // ── Compose UI ──────────────────────────────────────────────────────
        setContent {
            TadDriverTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    TadNavHost()
                }
            }
        }
    }

    // ── Readiness flag — set true once auth + first telemetry are initialised ─

    fun markReady() {
        isReady = true
    }
}
