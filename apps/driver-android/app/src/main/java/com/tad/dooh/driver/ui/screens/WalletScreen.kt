package com.tad.dooh.driver.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.tad.dooh.driver.TadApplication
import com.tad.dooh.driver.data.local.HubCacheEntity
import com.tad.dooh.driver.data.remote.DriverHubData
import com.tad.dooh.driver.data.remote.GlobalState
import com.tad.dooh.driver.data.remote.TadApiService
import com.tad.dooh.driver.data.remote.TransactionDto
import com.tad.dooh.driver.ui.theme.*
import kotlinx.coroutines.launch
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import kotlin.math.round

private const val WITHDRAWAL_THRESHOLD = 5000.0

@Composable
fun WalletScreen(
    onNavigateBack: () -> Unit
) {
    val app = TadApplication.getInstance()
    val apiService: TadApiService = app.apiService
    val hubCacheDao = app.database.hubCacheDao()

    var hubData by remember { mutableStateOf(DriverHubData()) }
    var transactions by remember { mutableStateOf<List<TransactionDto>>(emptyList()) }
    var isHubLoading by remember { mutableStateOf(true) }
    var isTxLoading by remember { mutableStateOf(true) }
    var isLocalMode by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    val scrollState = rememberScrollState()

    // ─── Fetch hub data ─────────────────────────────────────────────────────
    LaunchedEffect(Unit) {
        try {
            hubData = apiService.getHub()
            GlobalState.isKillSwitchActive = !hubData.subscriptionPaid
            // Cache locally for offline use
            hubCacheDao.save(
                HubCacheEntity(
                    key = "TAD_DRIVER_HUB_CACHE",
                    data = Json.encodeToString(hubData),
                    updatedAt = System.currentTimeMillis()
                )
            )
            isHubLoading = false
        } catch (e: Exception) {
            isHubLoading = false
            isLocalMode = true
            // Load from Room cache
            try {
                val cached = hubCacheDao.read("TAD_DRIVER_HUB_CACHE")
                if (cached != null) {
                    hubData = Json.decodeFromString<DriverHubData>(cached.data)
                }
            } catch (_: Exception) { /* use default empty */ }
        }
    }

    // ─── Fetch transactions ──────────────────────────────────────────────────
    LaunchedEffect(Unit) {
        try {
            transactions = apiService.getTransactions()
            isTxLoading = false
        } catch (e: Exception) {
            isTxLoading = false
            isLocalMode = true
        }
    }

    val withdrawalProgress = (hubData.balance / WITHDRAWAL_THRESHOLD).coerceIn(0.0, 1.0)
    val earningsBreakdown = minOf(hubData.activeAds.toInt(), 15) * 500

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(scrollState)
                .padding(16.dp)
        ) {
            // ─── Header with back button ──────────────────────────────────
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                IconButton(onClick = onNavigateBack) {
                    Text("←", color = TadYellow, style = TadSubheading)
                }
                Text("Billetera", style = goldGradientTextStyle(), modifier = Modifier.weight(1f))
            }

            Spacer(modifier = Modifier.height(12.dp))

            // ─── Offline banner ───────────────────────────────────────────
            if (isLocalMode) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .stitchedCard()
                        .padding(12.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(modifier = Modifier.size(8.dp).background(TadWarning, BadgeShape))
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Modo local — datos cargados desde caché", style = TadLabel, color = TadWarning)
                    }
                }
                Spacer(modifier = Modifier.height(8.dp))
            }

            // ─── Balance card with streak badge ──────────────────────────
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .stitchedCard()
                    .padding(24.dp)
            ) {
                Text("RD$${formatPeso(hubData.balance)}", style = TadDisplay, color = TadTextPrimary)
                Text("Balance disponible", style = TadLabel, color = TadTextSecondary)
                Spacer(modifier = Modifier.height(12.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // Streak badge
                    Box(
                        modifier = Modifier
                            .border(1.dp, TadYellow, BadgeShape)
                            .padding(horizontal = 8.dp, vertical = 4.dp)
                    ) {
                        Text("${hubData.activeAds.toInt()} anuncios", style = TadCaption, color = TadYellow)
                    }
                    // Slots badge
                    Box(
                        modifier = Modifier
                            .border(1.dp, TadGreen, BadgeShape)
                            .padding(horizontal = 8.dp, vertical = 4.dp)
                    ) {
                        Text("${hubData.activeSlots.toInt()}/${hubData.maxSlots} slots", style = TadCaption, color = TadGreen)
                    }
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // ─── Withdrawal progress bar ──────────────────────────────────
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .stitchedCard()
                    .padding(16.dp)
            ) {
                Text("Progreso para retiro", style = TadSubheading, color = TadTextPrimary)
                Text("Mínimo RD$5,000 requerido para solicitar retiro", style = TadCaption, color = TadTextSecondary)
                Spacer(modifier = Modifier.height(8.dp))

                LinearProgressIndicator(
                    progress = { withdrawalProgress },
                    modifier = Modifier.fillMaxWidth().height(8.dp),
                    color = if (withdrawalProgress >= 1.0) TadGreen else TadYellow,
                    trackColor = TadBorder
                )

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text("RD$${formatPeso(hubData.balance)}", style = TadLabel, color = TadYellow)
                    Text("RD$${formatPeso(WITHDRAWAL_THRESHOLD)}", style = TadLabel, color = TadTextSecondary)
                }

                if (withdrawalProgress >= 1.0) {
                    Spacer(modifier = Modifier.height(4.dp))
                    Text("✓ Elegible para retiro", style = TadLabel, color = TadGreen)
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // ─── Earnings breakdown ────────────────────────────────────────
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
                    Text("min(anuncios, 15) × RD$500", style = TadBody, color = TadTextSecondary)
                    Text("RD$${formatPeso(earningsBreakdown.toDouble())}", style = TadBody, color = TadTextPrimary)
                }
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text("Proyectado mensual", style = TadBody, color = TadTextSecondary)
                    Text("RD$${formatPeso(hubData.projectedEarnings)}", style = TadBody, color = TadGreen)
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // ─── Transaction list ──────────────────────────────────────────
            Text("Transacciones", style = TadSubheading, color = TadYellow)

            if (isTxLoading) {
                CircularProgressIndicator(
                    modifier = Modifier.align(Alignment.CenterHorizontally),
                    color = TadYellow,
                    strokeWidth = 2.dp
                )
            } else if (transactions.isEmpty()) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .stitchedCard()
                        .padding(24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text("Sin transacciones registradas", style = TadBody, color = TadTextSecondary)
                    if (isLocalMode) {
                        Text("Las transacciones se cargarán cuando vuelva la conexión.", style = TadCaption, color = TadWarning)
                    }
                }
            } else {
                transactions.forEach { tx ->
                    val isEarning = tx.type == "EARNING"
                    val txColor = if (isEarning) TadGreen else TadRed
                    val sign = if (isEarning) "+" else "-"

                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .stitchedCard()
                            .padding(12.dp)
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = tx.desc.ifEmpty { if (isEarning) "Ganancia" else "Retiro" },
                                    style = TadLabel,
                                    color = TadTextPrimary
                                )
                                Text(tx.date, style = TadCaption, color = TadTextDisabled)
                            }
                            Text(
                                text = "$sign RD$${formatPeso(tx.amount)}",
                                style = TadSubheading,
                                color = txColor
                            )
                        }

                        // Status badge
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.End
                        ) {
                            val statusLabel = when (tx.status) {
                                "COMPLETED" -> "Completado"
                                "PENDING" -> "Pendiente"
                                "FAILED" -> "Fallido"
                                else -> tx.status
                            }
                            val statusColor = when (tx.status) {
                                "COMPLETED" -> TadGreen
                                "PENDING" -> TadWarning
                                "FAILED" -> TadRed
                                else -> TadTextDisabled
                            }
                            Box(
                                modifier = Modifier
                                    .border(1.dp, statusColor, BadgeShape)
                                    .padding(horizontal = 6.dp, vertical = 2.dp)
                            ) {
                                Text(statusLabel, style = TadCaption, color = statusColor)
                            }
                        }
                    }
                    Spacer(modifier = Modifier.height(4.dp))
                }
            }
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
