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
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.tad.dooh.driver.ui.screen.HomeScreen
import com.tad.dooh.driver.ui.screen.OfflineScreen
import com.tad.dooh.driver.ui.screen.SettingsScreen
import com.tad.dooh.driver.ui.theme.TadDriverTheme

/**
 * MainActivity — the single Compose entry-point for the kiosk-mode driver app.
 *
 * Key behaviours:
 *  - Splash screen API (Android 12+) with keep-on condition until Supabase auth resolves
 *  - FLAG_KEEP_SCREEN_ON for always-on kiosk display
 *  - Edge-to-edge rendering (status/nav bars transparent under TadDark background)
 *  - Landscape-only orientation enforced via manifest
 */
class MainActivity : ComponentActivity() {

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
                    TadDriverApp()
                }
            }
        }
    }

    // ── Readiness flag — set true once Supabase session + GPS are initialised ──

    @Volatile
    private var isReady: Boolean = false

    fun markReady() {
        isReady = true
    }
}

// ── Navigation host ──────────────────────────────────────────────────────────

@Composable
fun TadDriverApp() {
    val navController = rememberNavController()

    NavHost(
        navController = navController,
        startDestination = "home"
    ) {
        composable("home") {
            HomeScreen(
                onNavigateToSettings = { navController.navigate("settings") },
                onNavigateToOffline = { navController.navigate("offline") }
            )
        }
        composable("settings") {
            SettingsScreen(
                onNavigateBack = { navController.popBackStack() }
            )
        }
        composable("offline") {
            OfflineScreen(
                onNavigateBack = { navController.popBackStack() }
            )
        }
    }
}
