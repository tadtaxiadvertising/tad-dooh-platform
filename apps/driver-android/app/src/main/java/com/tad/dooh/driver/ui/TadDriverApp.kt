package com.tad.dooh.driver.ui

import androidx.compose.runtime.*
import androidx.navigation.compose.rememberNavController
import com.tad.dooh.driver.data.local.AuthDao
import com.tad.dooh.driver.data.remote.GlobalState
import com.tad.dooh.driver.ui.navigation.TadNavHost
import com.tad.dooh.driver.ui.navigation.TadRoute
import com.tad.dooh.driver.ui.theme.*

@Composable
fun TadDriverApp() {
    val navController = rememberNavController()
    val startDestination = remember {
        // Check if user is already authenticated
        // In production this reads from AuthDao; here we default to login
        TadRoute.Login.route
    }

    TadDriverTheme {
        TadPerformanceFallbackProvider {
            TadNavHost(
                navController = navController,
                startDestination = startDestination,
            )
        }
    }
}
