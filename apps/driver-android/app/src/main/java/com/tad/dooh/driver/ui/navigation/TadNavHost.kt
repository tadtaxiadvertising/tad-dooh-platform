package com.tad.dooh.driver.ui.navigation

import androidx.compose.runtime.Composable
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import com.tad.dooh.driver.ui.screens.*

sealed class TadRoute(val route: String) {
    data object Login : TadRoute("login")
    data object Register : TadRoute("register")
    data object Dashboard : TadRoute("dashboard")
    data object Onboarding : TadRoute("onboarding")
    data object Wallet : TadRoute("wallet")
    data object BankWizard : TadRoute("bankWizard")
    data object UpdatePassword : TadRoute("updatePassword")
}

@Composable
fun TadNavHost(
    navController: NavHostController,
    startDestination: String = TadRoute.Login.route,
) {
    NavHost(
        navController = navController,
        startDestination = startDestination,
    ) {
        composable(TadRoute.Login.route) {
            LoginScreen(
                onLoginSuccess = {
                    navController.navigate(TadRoute.Dashboard.route) {
                        popUpTo(TadRoute.Login.route) { inclusive = true }
                    }
                },
                onNavigateToRegister = {
                    navController.navigate(TadRoute.Register.route)
                },
            )
        }

        composable(TadRoute.Register.route) {
            // Placeholder — will be built in next iteration
        }

        composable(TadRoute.Dashboard.route) {
            DashboardScreen(
                onNavigateToOnboarding = {
                    navController.navigate(TadRoute.Onboarding.route)
                },
                onNavigateToWallet = {
                    navController.navigate(TadRoute.Wallet.route)
                },
                onLogout = {
                    navController.navigate(TadRoute.Login.route) {
                        popUpTo(TadRoute.Dashboard.route) { inclusive = true }
                    }
                },
            )
        }

        composable(TadRoute.Onboarding.route) {
            OnboardingScreen(
                onComplete = {
                    navController.navigate(TadRoute.Dashboard.route) {
                        popUpTo(TadRoute.Onboarding.route) { inclusive = true }
                    }
                },
            )
        }

        composable(TadRoute.Wallet.route) {
            WalletScreen(
                onNavigateBack = {
                    navController.popBackStack()
                },
            )
        }

        composable(TadRoute.BankWizard.route) {
            BankWizardScreen(
                onComplete = {
                    navController.popBackStack()
                },
            )
        }

        composable(TadRoute.UpdatePassword.route) {
            // Placeholder — will be built in next iteration
        }
    }
}
