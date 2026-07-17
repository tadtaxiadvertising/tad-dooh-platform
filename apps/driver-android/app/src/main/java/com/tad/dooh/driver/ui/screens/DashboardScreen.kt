package com.tad.dooh.driver.ui.screens

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.tad.dooh.driver.TadApplication
import com.tad.dooh.driver.data.local.AuthEntity
import com.tad.dooh.driver.data.remote.DriverHubData
import com.tad.dooh.driver.data.remote.GlobalState
import com.tad.dooh.driver.data.remote.TadApiService
import com.tad.dooh.driver.service.TelemetryRepository
import com.tad.dooh.driver.ui.theme.*
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.serialization.json.Json
import kotlin.math.round

enum class DashboardTab(val label: String, val icon: String) {
    HOME("Inicio", "🏠"),
    ROUTES("Rutas", "🛣️"),
    WALLET("Billetera", "💰"),
    SETTINGS("Config", "⚙️")
}

@Composable
fun DashboardScreen(
    onNavigateToOnboarding: () -> Unit = {},
    onNavigateToBankWizard: () -> Unit = {},
    onNavigateToWallet: () -> Unit = {},
    onLogout: () -> Unit = {}
) {
    val context = LocalContext.current
    val app = TadApplication.getInstance()
    val apiService: TadApiService = app.apiService
    val authDao = app.database.authDao()
    val hubCacheDao = app.database.hubCacheDao()

    // TelemetryRepository must be created with context
    val telemetryRepo = remember { TelemetryRepository.create(context) }

    var selectedTab by remember { mutableStateOf(DashboardTab.HOME) }
    var hubData by remember { mutableStateOf(DriverHubData()) }
    var isHubLoading by remember { mutableStateOf(true) }
    var hubError by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    // ─── Auto-start GPS tracking on screen entry ────────────────────────────
    LaunchedEffect(Unit) {
        telemetryRepo.startTracking()
    }

    // ─── Fetch hub data ─────────────────────────────────────────────────────
    LaunchedEffect(Unit) {
        try {
            hubData = apiService.getHub()
            GlobalState.isKillSwitchActive = !hubData.subscriptionPaid
            // Cache hub to Room for offline use
            hubCacheDao.save(
                com.tad.dooh.driver.data.local.HubCacheEntity(
                    key = "TAD_DRIVER_HUB_CACHE",
                    data = Json.encodeToString(hubData),
                    updatedAt = System.currentTimeMillis()
                )
            )
            isHubLoading = false
        } catch (e: Exception) {
            isHubLoading = false
            hubError = "Error al cargar datos. Modo local activo."
            // Load from Room cache
            try {
                val cached = hubCacheDao.read("TAD_DRIVER_HUB_CACHE")
                if (cached != null) {
                    hubData = Json.decodeFromString<DriverHubData>(cached.data)
                }
            } catch (_: Exception) { /* use default empty hub */ }
        }
    }

    // ─── Refresh connection status periodically ─────────────────────────────
    LaunchedEffect(Unit) {
        while (true) {
            telemetryRepo.refreshConnectionStatus()
            delay(10_000L)
        }
    }

    // ─── Collect telemetry StateFlows ───────────────────────────────────────
    val isTracking by telemetryRepo.isTracking.collectAsState()
    val batchCount by telemetryRepo.batchCount.collectAsState()
    val offlineCount by telemetryRepo.offlineCount.collectAsState()
    val isOnline by telemetryRepo.connectionStatus.collectAsState()

    // ─── Kill-switch state ──────────────────────────────────────────────────
    val isKillSwitchActive = GlobalState.isKillSwitchActive

    // ─── Connection indicator ───────────────────────────────────────────────
    val connectionColor = when {
        !isOnline -> TadRed           // offline
        offlineCount > 0 -> Amber500  // syncing
        else -> TadYellow             // online
    }
    val connectionLabel = when {
        !isOnline -> "Sin conexión"
        offlineCount > 0 -> "Sincronizando..."
        else -> "Conectado"
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
    ) {
        Column(modifier = Modifier.fillMaxSize()) {

            // ─── Top status bar ────────────────────────────────────────────
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 12.dp)
                    .stitchedCard()
                    .padding(12.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Connection indicator dot
                Box(
                    modifier = Modifier
                        .size(12.dp)
                        .background(connectionColor, BadgeShape)
                        .border(1.dp, connectionColor, BadgeShape)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(connectionLabel, style = TadLabel, color = connectionColor)
                Spacer(modifier = Modifier.weight(1f))
                if (isHubLoading) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(16.dp),
                        color = TadYellow,
                        strokeWidth = 2.dp
                    )
                }
            }

            // ─── Tab content area ──────────────────────────────────────────
            Box(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp)
            ) {
                when (selectedTab) {
                    DashboardTab.HOME -> HomeTabContent(
                        hubData = hubData,
                        hubError = hubError,
                        isOnline = isOnline,
                        onNavigateToWallet = { selectedTab = DashboardTab.WALLET },
                        onNavigateToOnboarding = onNavigateToOnboarding
                    )
                    DashboardTab.ROUTES -> RoutesTabContent(
                        isTracking = isTracking,
                        batchCount = batchCount,
                        offlineCount = offlineCount,
                        isOnline = isOnline,
                        onSync = { scope.launch { telemetryRepo.syncPending() } }
                    )
                    DashboardTab.WALLET -> WalletTabContent(
                        hubData = hubData,
                        onNavigateToWalletDetail = onNavigateToWallet
                    )
                    DashboardTab.SETTINGS -> SettingsTabContent(
                        isOnline = isOnline,
                        isTracking = isTracking,
                        onLogout = {
                            scope.launch {
                                GlobalState.clear()
                                app.database.authDao().deleteAll()
                                telemetryRepo.stopTracking()
                                onLogout()
                            }
                        }
                    )
                }
            }

            // ─── Bottom navigation bar (glassmorphism) ────────────────────
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .bottomNav()
                    .padding(horizontal = 8.dp, vertical = 8.dp),
                horizontalArrangement = Arrangement.SpaceEvenly,
                verticalAlignment = Alignment.CenterVertically
            ) {
                DashboardTab.entries.forEach { tab ->
                    val isSelected = selectedTab == tab
                    Column(
                        modifier = Modifier
                            .then(if (isSelected) Modifier.activeTab() else Modifier)
                            .clickable { selectedTab = tab }
                            .padding(horizontal = 16.dp, vertical = 8.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Text(
                            text = tab.icon,
                            style = TadSubheading,
                            color = if (isSelected) TadYellow else TadTextSecondary
                        )
                        Text(
                            text = tab.label,
                            style = TadCaption,
                            color = if (isSelected) TadYellow else TadTextDisabled
                        )
                    }
                }
            }
        }

        // ─── KillSwitch overlay at z-9999 ──────────────────────────────────
        if (isKillSwitchActive) {
            KillSwitchOverlay()
        }
    }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// HOME TAB
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@Composable
private fun HomeTabContent(
    hubData: DriverHubData,
    hubError: String?,
    isOnline: Boolean,
    onNavigateToWallet: () -> Unit,
    onNavigateToOnboarding: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(vertical = 8.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        // Driver greeting
        Text(
            text = "Hola, ${hubData.driverName}",
            style = goldGradientTextStyle()
        )

        hubError?.let { msg ->
            Text(msg, color = TadWarning, style = TadCaption)
        }

        // ─── Wallet card ──────────────────────────────────────────────────
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .stitchedCard()
                .padding(20.dp)
                .clickable { onNavigateToWallet() }
        ) {
            Text("Billetera", style = TadSubheading, color = TadYellow)
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Column {
                    Text(
                        text = "RD$${formatPeso(hubData.balance)}",
                        style = TadDisplay,
                        color = TadTextPrimary
                    )
                    Text("Balance disponible", style = TadLabel, color = TadTextSecondary)
                }
                Column(horizontalAlignment = Alignment.End) {
                    Text(
                        text = "${hubData.activeSlots.toInt()}/${hubData.maxSlots}",
                        style = TadHeading,
                        color = TadYellow
                    )
                    Text("Slots activos", style = TadLabel, color = TadTextSecondary)
                }
            }
        }

        // ─── Quick stats grid ──────────────────────────────────────────────
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            StatCard("Anuncios", "${hubData.activeAds.toInt()}", TadTextPrimary, Modifier.weight(1f))
            StatCard("Puntos GPS", "${hubData.gpsPoints.toInt()}", TadTextPrimary, Modifier.weight(1f))
        }
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            StatCard("Proyectado", "RD$${formatPeso(hubData.projectedEarnings)}", TadGreen, Modifier.weight(1f))
            StatCard("Estado", if (isOnline) "Online" else "Local", if (isOnline) TadGreen else TadWarning, Modifier.weight(1f))
        }

        // ─── Onboarding check ──────────────────────────────────────────────
        val onboardingStage = getDriverOnboardingStage(hubData)
        if (onboardingStage != OnboardingStage.READY) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .stitchedCard()
                    .padding(16.dp)
                    .clickable { onNavigateToOnboarding() },
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(
                    text = when (onboardingStage) {
                        OnboardingStage.CONTRACT -> "Debes aceptar el contrato"
                        OnboardingStage.BANK -> "Configura tus datos bancarios"
                        OnboardingStage.PAYMENT -> "Realiza el pago del Starter Kit"
                        OnboardingStage.READY -> ""
                    },
                    style = TadLabel,
                    color = TadWarning
                )
                Text("Completar configuración →", style = TadCaption, color = TadYellow)
            }
        }
    }
}

@Composable
private fun StatCard(
    label: String,
    value: String,
    valueColor: androidx.compose.ui.graphics.Color = TadTextPrimary,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier.stitchedCard().padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(value, style = TadSubheading, color = valueColor)
        Text(label, style = TadCaption, color = TadTextSecondary)
    }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ROUTES TAB
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@Composable
private fun RoutesTabContent(
    isTracking: Boolean,
    batchCount: Int,
    offlineCount: Int,
    isOnline: Boolean,
    onSync: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(vertical = 8.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Text("Rutas y GPS", style = goldGradientTextStyle())

        // GPS tracking status card
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .stitchedCard()
                .padding(20.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text("Estado GPS", style = TadSubheading, color = TadTextPrimary)
                val (statusText, statusColor) = if (isTracking) ("Activo", TadGreen) else ("Inactivo", TadRed)
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(modifier = Modifier.size(8.dp).background(statusColor, BadgeShape))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(statusText, style = TadLabel, color = statusColor)
                }
            }
        }

        // Batch stats
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            StatCard("Pendientes (batch)", "$batchCount", TadYellow, Modifier.weight(1f))
            StatCard("Offline", "$offlineCount", if (offlineCount > 0) TadWarning else TadGreen, Modifier.weight(1f))
        }

        // Manual sync button
        Button(
            onClick = onSync,
            modifier = Modifier.fillMaxWidth().height(48.dp),
            colors = ButtonDefaults.buttonColors(containerColor = TadYellow, contentColor = Black),
            shape = ButtonShape,
            enabled = isOnline && offlineCount > 0
        ) {
            Text("SINCRONIZAR AHORA", style = TadLabel, color = Black)
        }

        if (!isOnline) {
            Text(
                "Sin conexión — los datos se guardarán localmente y se sincronizarán automáticamente cuando vuelva el internet.",
                style = TadCaption,
                color = TadWarning,
                textAlign = TextAlign.Center
            )
        }
    }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// WALLET TAB
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@Composable
private fun WalletTabContent(
    hubData: DriverHubData,
    onNavigateToWalletDetail: () -> Unit
) {
    val earningsBreakdown = minOf(hubData.activeAds.toInt(), 15) * 500

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(vertical = 8.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Text("Billetera", style = goldGradientTextStyle())

        // Balance card
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .stitchedCard()
                .padding(20.dp)
                .clickable { onNavigateToWalletDetail() }
        ) {
            Text("RD$${formatPeso(hubData.balance)}", style = TadDisplay, color = TadTextPrimary)
            Text("Balance disponible", style = TadLabel, color = TadTextSecondary)
            Spacer(modifier = Modifier.height(8.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier = Modifier
                        .border(1.dp, TadYellow, BadgeShape)
                        .padding(horizontal = 8.dp, vertical = 4.dp)
                ) {
                    Text("${hubData.activeAds.toInt()} anuncios", style = TadCaption, color = TadYellow)
                }
            }
        }

        // Monthly projected
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .stitchedCard()
                .padding(16.dp)
        ) {
            Text("Proyectado este mes", style = TadSubheading, color = TadTextPrimary)
            Text("RD$${formatPeso(hubData.projectedEarnings)}", style = TadHeading, color = TadGreen)
        }

        // Earnings breakdown
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .stitchedCard()
                .padding(16.dp)
        ) {
            Text("Desglose de ganancias", style = TadSubheading, color = TadYellow)
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text("Anuncios activos × RD$500", style = TadBody, color = TadTextSecondary)
                Text("RD$${formatPeso(earningsBreakdown.toDouble())}", style = TadBody, color = TadTextPrimary)
            }
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text("Slots ocupados", style = TadBody, color = TadTextSecondary)
                Text("${hubData.activeSlots.toInt()}/${hubData.maxSlots}", style = TadBody, color = TadTextPrimary)
            }
            Text(
                "min(anuncios, 15) × RD$500 = RD$${formatPeso(earningsBreakdown.toDouble())}",
                style = TadCaption,
                color = TadTextDisabled
            )
        }

        // Referral stats
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .stitchedCard()
                .padding(16.dp)
        ) {
            Text("Referidos", style = TadSubheading, color = TadYellow)
            Text("Invita conductores y gana RD$500 por cada referido activo.", style = TadBody, color = TadTextSecondary)
        }
    }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SETTINGS TAB
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@Composable
private fun SettingsTabContent(
    isOnline: Boolean,
    isTracking: Boolean,
    onLogout: () -> Unit
) {
    val context = LocalContext.current

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(vertical = 8.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Text("Configuración", style = goldGradientTextStyle())

        // Connectivity status
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .stitchedCard()
                .padding(16.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text("Conexión", style = TadSubheading, color = TadTextPrimary)
                val (label, color) = if (isOnline) ("Online", TadGreen) else ("Offline", TadRed)
                Text(label, style = TadLabel, color = color)
            }
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text("GPS tracking", style = TadSubheading, color = TadTextPrimary)
                val (gpsLabel, gpsColor) = if (isTracking) ("Activo", TadGreen) else ("Inactivo", TadWarning)
                Text(gpsLabel, style = TadLabel, color = gpsColor)
            }
        }

        // WhatsApp support
        Button(
            onClick = {
                val whatsappUrl = "https://wa.me/18095551234?text=Hola%20TAD%20-%20necesito%20ayuda"
                val intent = Intent(Intent.ACTION_VIEW, Uri.parse(whatsappUrl))
                intent.setPackage("com.whatsapp")
                try { context.startActivity(intent) } catch (_: Exception) {
                    context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(whatsappUrl)))
                }
            },
            modifier = Modifier.fillMaxWidth().height(48.dp),
            colors = ButtonDefaults.buttonColors(containerColor = TadYellow, contentColor = Black),
            shape = ButtonShape
        ) {
            Text("SOPORTE WHATSAPP", style = TadLabel, color = Black)
        }

        // Report issue
        OutlinedButton(
            onClick = {
                val whatsappUrl = "https://wa.me/18095551234?text=Hola%20TAD%20-%20tengo%20un%20problema%20técnico"
                val intent = Intent(Intent.ACTION_VIEW, Uri.parse(whatsappUrl))
                intent.setPackage("com.whatsapp")
                try { context.startActivity(intent) } catch (_: Exception) {
                    context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(whatsappUrl)))
                }
            },
            modifier = Modifier.fillMaxWidth().height(48.dp),
            colors = ButtonDefaults.outlinedButtonColors(contentColor = TadTextPrimary),
            border = BorderStroke(1.dp, TadBorder),
            shape = ButtonShape
        ) {
            Text("REPORTAR PROBLEMA", style = TadLabel)
        }

        // Sync data
        OutlinedButton(
            onClick = { /* Trigger WorkManager sync */ },
            modifier = Modifier.fillMaxWidth().height(48.dp),
            colors = ButtonDefaults.outlinedButtonColors(contentColor = TadYellow),
            border = BorderStroke(1.dp, TadYellow),
            shape = ButtonShape,
            enabled = isOnline
        ) {
            Text("SINCRONIZAR DATOS", style = TadLabel, color = TadYellow)
        }

        // Logout
        Button(
            onClick = onLogout,
            modifier = Modifier.fillMaxWidth().height(48.dp),
            colors = ButtonDefaults.buttonColors(containerColor = TadRed, contentColor = White),
            shape = ButtonShape
        ) {
            Text("CERRAR SESIÓN", style = TadLabel, color = White)
        }
    }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// UTILITY
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

private fun formatPeso(value: Double): String {
    val rounded = round(value).toInt()
    return "%,d".format(rounded).replace(',', '.')
}
