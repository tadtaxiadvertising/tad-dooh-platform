package com.tad.dooh.driver.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.tad.dooh.driver.TadApplication
import com.tad.dooh.driver.data.local.OfflineQueueEntity
import com.tad.dooh.driver.data.local.OfflineQueueDao
import com.tad.dooh.driver.data.remote.BankAccountRequest
import com.tad.dooh.driver.data.remote.GlobalState
import com.tad.dooh.driver.data.remote.TadApiService
import com.tad.dooh.driver.ui.theme.*
import kotlinx.coroutines.launch
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

private val DOMINICAN_BANKS = listOf(
    "Banco Popular Dominicano",
    "BHD León",
    "Banreservas",
    "ScotiaBank",
    "APAP"
)

private val json = Json { ignoreUnknownKeys = true }

@Composable
fun BankWizardScreen(
    onComplete: () -> Unit,
    onBack: () -> Unit
) {
    val app = TadApplication.getInstance()
    val apiService: TadApiService = app.apiService
    val offlineQueueDao: OfflineQueueDao = app.database.offlineQueueDao()

    var currentStep by remember { mutableIntStateOf(1) }
    var selectedBank by remember { mutableStateOf("") }
    var accountNumber by remember { mutableStateOf("") }
    var accountType by remember { mutableStateOf("AHORRO") }
    var ownerName by remember { mutableStateOf("") }
    var cedula by remember { mutableStateOf("") }
    var isLoading by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    val totalSteps = 5
    val progressFraction = currentStep.toFloat() / totalSteps.toFloat()

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(16.dp)
        ) {
            // ─── Top bar with back button + progress ──────────────────────
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                IconButton(onClick = { if (currentStep > 1) currentStep-- else onBack() }) {
                    Text("←", color = TadYellow, style = TadSubheading)
                }
                Spacer(modifier = Modifier.width(8.dp))
                Text("Datos bancarios", style = TadSubheading, color = TadTextPrimary, modifier = Modifier.weight(1f))
                Text("$currentStep / $totalSteps", style = TadLabel, color = TadYellow)
            }

            Spacer(modifier = Modifier.height(8.dp))

            // ─── Progress indicator ────────────────────────────────────────
            LinearProgressIndicator(
                progress = { progressFraction },
                modifier = Modifier.fillMaxWidth().height(4.dp),
                color = TadYellow,
                trackColor = TadBorder
            )

            Spacer(modifier = Modifier.height(16.dp))

            // ─── Step content inside stitched card ─────────────────────────
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f)
                    .stitchedCard()
                    .padding(24.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                errorMessage?.let { msg ->
                    Text(msg, color = TadError, style = TadCaption, textAlign = TextAlign.Center)
                }

                when (currentStep) {
                    1 -> StepBankSelection(
                        selectedBank = selectedBank,
                        onBankSelected = { selectedBank = it; errorMessage = null }
                    )
                    2 -> StepAccountNumber(
                        accountNumber = accountNumber,
                        onAccountNumberChanged = { accountNumber = it; errorMessage = null }
                    )
                    3 -> StepAccountType(
                        accountType = accountType,
                        onAccountTypeChanged = { accountType = it; errorMessage = null }
                    )
                    4 -> StepOwnerName(
                        ownerName = ownerName,
                        onOwnerNameChanged = { ownerName = it; errorMessage = null }
                    )
                    5 -> StepCedula(
                        cedula = cedula,
                        onCedulaChanged = { cedula = it; errorMessage = null }
                    )
                }
            }

            // ─── Continue / Submit button ──────────────────────────────────
            Button(
                onClick = {
                    errorMessage = null
                    when (currentStep) {
                        1 -> {
                            if (selectedBank.isBlank()) { errorMessage = "Selecciona un banco"; return@Button }
                            currentStep = 2
                        }
                        2 -> {
                            if (accountNumber.length != 10 || accountNumber.any { !it.isDigit() }) {
                                errorMessage = "El número de cuenta debe tener 10 dígitos"
                                return@Button
                            }
                            currentStep = 3
                        }
                        3 -> currentStep = 4 // always has default selection
                        4 -> {
                            if (ownerName.isBlank() || ownerName.length < 3) {
                                errorMessage = "Ingresa tu nombre completo"
                                return@Button
                            }
                            currentStep = 5
                        }
                        5 -> {
                            val cleanCedula = cedula.replace("-", "")
                            if (cleanCedula.length != 11 || cleanCedula.any { !it.isDigit() }) {
                                errorMessage = "La cédula debe tener 11 dígitos"
                                return@Button
                            }
                            isLoading = true
                            scope.launch {
                                try {
                                    apiService.updateBankAccount(
                                        BankAccountRequest(
                                            bankName = selectedBank,
                                            accountNumber = accountNumber,
                                            accountType = accountType,
                                            ownerName = ownerName.trim(),
                                            cedula = cleanCedula
                                        )
                                    )
                                    onComplete()
                                } catch (_: Exception) {
                                    // Offline-first: queue to Room for later sync
                                    try {
                                        val payload = json.encodeToString(
                                            BankAccountRequest(
                                                bankName = selectedBank,
                                                accountNumber = accountNumber,
                                                accountType = accountType,
                                                ownerName = ownerName.trim(),
                                                cedula = cleanCedula
                                            )
                                        )
                                        offlineQueueDao.insert(
                                            OfflineQueueEntity(
                                                endpoint = "wallet/bank",
                                                method = "PUT",
                                                payload = payload,
                                                idempotencyKey = "bank-${GlobalState.driverId}-${System.currentTimeMillis()}",
                                                timestamp = System.currentTimeMillis()
                                            )
                                        )
                                        onComplete()
                                    } catch (_: Exception) {
                                        isLoading = false
                                        errorMessage = "Error de conexión. No se pudo guardar localmente."
                                    }
                                }
                            }
                        }
                    }
                },
                modifier = Modifier.fillMaxWidth().height(48.dp).padding(vertical = 8.dp),
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
                    Text(
                        text = if (currentStep == 5) "GUARDAR DATOS BANCARIOS" else "CONTINUAR",
                        style = TadLabel,
                        color = Black
                    )
                }
            }
        }
    }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// STEP 1 — Bank Selection
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@Composable
private fun StepBankSelection(
    selectedBank: String,
    onBankSelected: (String) -> Unit
) {
    Text("Selecciona tu banco", style = TadHeading, color = TadTextPrimary)
    Text("Bancos disponibles en República Dominicana", style = TadBody, color = TadTextSecondary)
    Spacer(modifier = Modifier.height(8.dp))

    DOMINICAN_BANKS.forEach { bank ->
        val isSelected = selectedBank == bank
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .then(if (isSelected) Modifier.border(1.dp, TadYellow, StitchedCardShape) else Modifier)
                .clickable { onBankSelected(bank) }
        ) {
            Row(
                modifier = Modifier
                    .then(if (isSelected) Modifier.stitchedCardHover() else Modifier.stitchedCard())
                    .padding(16.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = bank,
                    style = TadSubheading,
                    color = if (isSelected) TadYellow else TadTextPrimary,
                    modifier = Modifier.weight(1f)
                )
                if (isSelected) {
                    Text("✓", color = TadYellow, style = TadSubheading)
                }
            }
        }
        Spacer(modifier = Modifier.height(4.dp))
    }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// STEP 2 — Account Number
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@Composable
private fun StepAccountNumber(
    accountNumber: String,
    onAccountNumberChanged: (String) -> Unit
) {
    Text("Número de cuenta", style = TadHeading, color = TadTextPrimary)
    Text("Ingresa los 10 dígitos de tu cuenta bancaria", style = TadBody, color = TadTextSecondary)
    Spacer(modifier = Modifier.height(8.dp))

    OutlinedTextField(
        value = accountNumber,
        onValueChange = { if (it.length <= 10 && it.all { c -> c.isDigit() }) onAccountNumberChanged(it) },
        label = { Text("Número de cuenta", color = TadTextSecondary) },
        placeholder = { Text("1234567890", color = TadTextDisabled) },
        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
        singleLine = true,
        modifier = Modifier.fillMaxWidth(),
        colors = OutlinedTextFieldDefaults.colors(
            focusedContainerColor = TadSurfaceVariant,
            unfocusedContainerColor = TadSurface,
            focusedBorderColor = TadYellow,
            unfocusedBorderColor = TadBorder,
            focusedTextColor = TadTextPrimary,
            unfocusedTextColor = TadTextPrimary
        ),
        shape = InputShape
    )

    if (accountNumber.length == 10) {
        Text("✓ Cuenta válida", color = TadGreen, style = TadLabel)
    }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// STEP 3 — Account Type (AHORRO / CORRIENTE)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@Composable
private fun StepAccountType(
    accountType: String,
    onAccountTypeChanged: (String) -> Unit
) {
    Text("Tipo de cuenta", style = TadHeading, color = TadTextPrimary)
    Text("Selecciona si es cuenta de ahorro o corriente", style = TadBody, color = TadTextSecondary)
    Spacer(modifier = Modifier.height(16.dp))

    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        AccountTypeOption("AHORRO", accountType == "AHORRO", { onAccountTypeChanged("AHORRO") }, Modifier.weight(1f))
        AccountTypeOption("CORRIENTE", accountType == "CORRIENTE", { onAccountTypeChanged("CORRIENTE") }, Modifier.weight(1f))
    }
}

@Composable
private fun AccountTypeOption(
    label: String,
    isSelected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Box(
        modifier = modifier
            .then(if (isSelected) Modifier.border(1.dp, TadYellow, StitchedCardShape) else Modifier)
            .clickable { onClick() },
        contentAlignment = Alignment.Center
    ) {
        Column(
            modifier = Modifier
                .then(if (isSelected) Modifier.stitchedCardHover() else Modifier.stitchedCard())
                .padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Text(label, style = TadSubheading, color = if (isSelected) TadYellow else TadTextPrimary)
            if (isSelected) {
                Spacer(modifier = Modifier.height(4.dp))
                Text("✓", color = TadYellow, style = TadLabel)
            }
        }
    }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// STEP 4 — Owner Name
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@Composable
private fun StepOwnerName(
    ownerName: String,
    onOwnerNameChanged: (String) -> Unit
) {
    Text("Nombre del titular", style = TadHeading, color = TadTextPrimary)
    Text("Ingresa el nombre completo del titular de la cuenta", style = TadBody, color = TadTextSecondary)
    Spacer(modifier = Modifier.height(8.dp))

    OutlinedTextField(
        value = ownerName,
        onValueChange = onOwnerNameChanged,
        label = { Text("Nombre completo", color = TadTextSecondary) },
        placeholder = { Text("Juan Pérez Rodríguez", color = TadTextDisabled) },
        singleLine = true,
        modifier = Modifier.fillMaxWidth(),
        colors = OutlinedTextFieldDefaults.colors(
            focusedContainerColor = TadSurfaceVariant,
            unfocusedContainerColor = TadSurface,
            focusedBorderColor = TadYellow,
            unfocusedBorderColor = TadBorder,
            focusedTextColor = TadTextPrimary,
            unfocusedTextColor = TadTextPrimary
        ),
        shape = InputShape
    )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// STEP 5 — Cédula (Dominican ID: 11 digits)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@Composable
private fun StepCedula(
    cedula: String,
    onCedulaChanged: (String) -> Unit
) {
    Text("Cédula de identidad", style = TadHeading, color = TadTextPrimary)
    Text("Ingresa tu número de cédula dominicana (11 dígitos)", style = TadBody, color = TadTextSecondary)
    Spacer(modifier = Modifier.height(8.dp))

    OutlinedTextField(
        value = cedula,
        onValueChange = { if (it.length <= 13) onCedulaChanged(it) },
        label = { Text("Cédula", color = TadTextSecondary) },
        placeholder = { Text("000-0000000-0", color = TadTextDisabled) },
        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
        singleLine = true,
        modifier = Modifier.fillMaxWidth(),
        colors = OutlinedTextFieldDefaults.colors(
            focusedContainerColor = TadSurfaceVariant,
            unfocusedContainerColor = TadSurface,
            focusedBorderColor = TadYellow,
            unfocusedBorderColor = TadBorder,
            focusedTextColor = TadTextPrimary,
            unfocusedTextColor = TadTextPrimary
        ),
        shape = InputShape
    )

    val cleanCedula = cedula.replace("-", "")
    if (cleanCedula.length == 11 && cleanCedula.all { it.isDigit() }) {
        Text("✓ Cédula válida", color = TadGreen, style = TadLabel)
    }
}
