package com.tad.dooh.driver.ui.screens

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.tad.dooh.driver.TadApplication
import com.tad.dooh.driver.data.remote.AcceptAgreementRequest
import com.tad.dooh.driver.data.remote.DriverHubData
import com.tad.dooh.driver.data.remote.GlobalState
import com.tad.dooh.driver.data.remote.TadApiService
import com.tad.dooh.driver.ui.theme.*
import kotlinx.coroutines.launch

/**
 * Determines the onboarding stage from hub data, mirroring the PWA getDriverOnboardingStage().
 */
fun getDriverOnboardingStage(hub: DriverHubData): OnboardingStage {
    return when {
        !hub.contractAccepted -> OnboardingStage.CONTRACT
        !hub.bankAccountConfigured -> OnboardingStage.BANK
        !hub.subscriptionPaid -> OnboardingStage.PAYMENT
        else -> OnboardingStage.READY
    }
}

enum class OnboardingStage {
    CONTRACT, BANK, PAYMENT, READY
}

@Composable
fun OnboardingScreen(
    onNavigateToDashboard: () -> Unit,
    hubData: DriverHubData = remember { DriverHubData() }
) {
    val app = TadApplication.getInstance()
    val apiService: TadApiService = app.apiService

    var currentStage by remember { mutableStateOf(getDriverOnboardingStage(hubData)) }
    var isLoading by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
    ) {
        Row(modifier = Modifier.fillMaxSize()) {

            // ─── Readiness checklist sidebar ───────────────────────────────
            Column(
                modifier = Modifier
                    .width(200.dp)
                    .fillMaxHeight()
                    .padding(16.dp)
                    .stitchedCard()
                    .padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Text("Progreso", style = TadSubheading, color = TadYellow)
                Spacer(modifier = Modifier.height(8.dp))

                ChecklistItem(
                    label = "Contrato",
                    isComplete = currentStage.ordinal > OnboardingStage.CONTRACT.ordinal
                        || (currentStage == OnboardingStage.CONTRACT && hubData.contractAccepted)
                )
                ChecklistItem(
                    label = "Datos bancarios",
                    isComplete = currentStage.ordinal > OnboardingStage.BANK.ordinal
                        || (currentStage == OnboardingStage.BANK && hubData.bankAccountConfigured)
                )
                ChecklistItem(
                    label = "Pago Starter Kit",
                    isComplete = currentStage.ordinal > OnboardingStage.PAYMENT.ordinal
                        || (currentStage == OnboardingStage.PAYMENT && hubData.subscriptionPaid)
                )
                ChecklistItem(
                    label = "¡Listo!",
                    isComplete = currentStage == OnboardingStage.READY
                )
            }

            // ─── Main content area ──────────────────────────────────────────
            Column(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxHeight()
                    .padding(16.dp),
                verticalArrangement = Arrangement.Center,
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                when (currentStage) {
                    OnboardingStage.CONTRACT -> ContractStage(
                        isLoading = isLoading,
                        errorMessage = errorMessage,
                        onAccept = {
                            isLoading = true
                            errorMessage = null
                            scope.launch {
                                try {
                                    val driverId = GlobalState.driverId
                                    if (driverId == null) {
                                        isLoading = false
                                        errorMessage = "No se encontró ID de conductor"
                                        return@launch
                                    }
                                    apiService.acceptAgreement(
                                        driverId,
                                        AcceptAgreementRequest(agreementVersion = "v1")
                                    )
                                    currentStage = OnboardingStage.BANK
                                    isLoading = false
                                } catch (e: Exception) {
                                    isLoading = false
                                    errorMessage = "Error al aceptar contrato. Intenta de nuevo."
                                }
                            }
                        }
                    )

                    OnboardingStage.BANK -> BankStage(
                        onBankComplete = { currentStage = OnboardingStage.PAYMENT },
                        onBack = { currentStage = OnboardingStage.CONTRACT }
                    )

                    OnboardingStage.PAYMENT -> PaymentStage(
                        isLoading = isLoading,
                        errorMessage = errorMessage,
                        onProceed = {
                            isLoading = true
                            errorMessage = null
                            scope.launch {
                                try {
                                    val freshHub = apiService.getHub()
                                    GlobalState.isKillSwitchActive = !freshHub.subscriptionPaid
                                    if (freshHub.subscriptionPaid) {
                                        currentStage = OnboardingStage.READY
                                    } else {
                                        errorMessage = "El pago aún no se ha registrado. Contacta soporte."
                                    }
                                    isLoading = false
                                } catch (e: Exception) {
                                    isLoading = false
                                    errorMessage = "No se pudo verificar el pago. Verifica tu conexión."
                                }
                            }
                        }
                    )

                    OnboardingStage.READY -> ReadyStage(onClose = onNavigateToDashboard)
                }
            }
        }
    }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CHECKLIST ITEM
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@Composable
private fun ChecklistItem(label: String, isComplete: Boolean) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically
    ) {
        val badgeColor = if (isComplete) TadGreen else TadWarning
        val badgeText = if (isComplete) "OK" else "Pendiente"

        Box(
            modifier = Modifier
                .border(1.dp, badgeColor, BadgeShape)
                .padding(horizontal = 8.dp, vertical = 4.dp)
        ) {
            Text(badgeText, style = TadCaption, color = badgeColor)
        }
        Spacer(modifier = Modifier.width(8.dp))
        Text(label, style = TadLabel, color = if (isComplete) TadTextPrimary else TadTextSecondary)
    }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CONTRACT STAGE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@Composable
private fun ContractStage(
    isLoading: Boolean,
    errorMessage: String?,
    onAccept: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .stitchedCard()
            .padding(24.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text("Contrato de conductor", style = goldGradientTextStyle())

        Text(
            text = """
Al aceptar este contrato, usted se compromete a:

1. Operar el dispositivo TAD en su vehículo de acuerdo con las normas establecidas.
2. Mantener el servicio GPS activo durante las horas de operación.
3. Cumplir con el pago mensual del Starter Kit (RD$6,000).
4. Reportar cualquier problema técnico de forma inmediata.
5. No alterar, desmontar o manipular el equipo instalado.

La violación de estos términos puede resultar en la suspensión del servicio y pérdida de ganancias acumuladas.
            """.trimIndent(),
            style = TadBody,
            color = TadTextSecondary,
            textAlign = TextAlign.Start,
            modifier = Modifier.fillMaxWidth()
        )

        errorMessage?.let { msg ->
            Text(msg, color = TadError, style = TadCaption, textAlign = TextAlign.Center)
        }

        Button(
            onClick = onAccept,
            modifier = Modifier.fillMaxWidth().height(48.dp),
            enabled = !isLoading,
            colors = ButtonDefaults.buttonColors(
                containerColor = TadYellow,
                disabledContainerColor = TadYellow.copy(alpha = 0.4f),
                contentColor = Black
            ),
            shape = ButtonShape
        ) {
            if (isLoading) {
                CircularProgressIndicator(modifier = Modifier.size(20.dp), color = Black, strokeWidth = 2.dp)
            } else {
                Text("ACEPTAR CONTRATO", style = TadLabel, color = Black)
            }
        }
    }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BANK STAGE (embeds BankWizardScreen)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@Composable
private fun BankStage(
    onBankComplete: () -> Unit,
    onBack: () -> Unit
) {
    Column(modifier = Modifier.fillMaxSize()) {
        Text(
            "Configura tus datos bancarios para recibir pagos",
            style = TadSubheading,
            color = TadYellow,
            modifier = Modifier.padding(16.dp)
        )
        BankWizardScreen(onComplete = onBankComplete, onBack = onBack)
    }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PAYMENT STAGE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@Composable
private fun PaymentStage(
    isLoading: Boolean,
    errorMessage: String?,
    onProceed: () -> Unit
) {
    val context = LocalContext.current

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .stitchedCard()
            .padding(24.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text("Starter Kit — RD$6,000", style = goldGradientTextStyle())

        Text(
            text = "Para activar tu cuenta de conductor, debes realizar el pago del Starter Kit de RD$6,000.\n\nEste pago incluye:\n• Instalación del dispositivo en tu vehículo\n• Configuración completa del sistema\n• Primer mes de servicio activo",
            style = TadBody,
            color = TadTextSecondary,
            textAlign = TextAlign.Start,
            modifier = Modifier.fillMaxWidth()
        )

        Text("Contacta a soporte por WhatsApp para coordinar tu pago:", style = TadLabel, color = TadYellow)

        // WhatsApp contact button
        Button(
            onClick = {
                val whatsappUrl = "https://wa.me/18095551234?text=Hola%20TAD%20-%20quiero%20pagar%20el%20Starter%20Kit"
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
            Text("WHATSAPP SOPORTE", style = TadLabel, color = Black)
        }

        errorMessage?.let { msg ->
            Text(msg, color = TadError, style = TadCaption, textAlign = TextAlign.Center)
        }

        // Verify payment button
        Button(
            onClick = onProceed,
            modifier = Modifier.fillMaxWidth().height(48.dp),
            enabled = !isLoading,
            colors = ButtonDefaults.buttonColors(
                containerColor = TadGreen,
                disabledContainerColor = TadGreen.copy(alpha = 0.4f),
                contentColor = Black
            ),
            shape = ButtonShape
        ) {
            if (isLoading) {
                CircularProgressIndicator(modifier = Modifier.size(20.dp), color = Black, strokeWidth = 2.dp)
            } else {
                Text("VERIFICAR PAGO", style = TadLabel, color = Black)
            }
        }
    }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// READY STAGE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@Composable
private fun ReadyStage(onClose: () -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .stitchedCard()
            .padding(24.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Box(
            modifier = Modifier
                .size(80.dp)
                .background(TadGreen.copy(alpha = 0.15f), StitchedCardShape)
                .border(2.dp, TadGreen, StitchedCardShape),
            contentAlignment = Alignment.Center
        ) {
            Text("✓", style = TadDisplay, color = TadGreen)
        }

        Text("¡Todo listo!", style = goldGradientTextStyle())

        Text(
            text = "Tu cuenta está completamente configurada. Ya puedes empezar a generar ganancias con TAD Driver.",
            style = TadBody,
            color = TadTextSecondary,
            textAlign = TextAlign.Center
        )

        Button(
            onClick = onClose,
            modifier = Modifier.fillMaxWidth().height(48.dp),
            colors = ButtonDefaults.buttonColors(containerColor = TadYellow, contentColor = Black),
            shape = ButtonShape
        ) {
            Text("IR AL DASHBOARD", style = TadLabel, color = Black)
        }
    }
}
