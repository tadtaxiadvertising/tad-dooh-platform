package com.tad.dooh.driver.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.*
import androidx.compose.material3.ButtonDefaults
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.tad.dooh.driver.TadApplication
import com.tad.dooh.driver.data.local.AuthEntity
import com.tad.dooh.driver.data.remote.GlobalState
import com.tad.dooh.driver.data.remote.LoginRequest
import com.tad.dooh.driver.data.remote.TadApiService
import com.tad.dooh.driver.ui.theme.*
import kotlinx.coroutines.launch
import retrofit2.HttpException

@Composable
fun LoginScreen(
    onNavigateToDashboard: () -> Unit,
    onNavigateToRegister: () -> Unit
) {
    val app = TadApplication.getInstance()
    val apiService = app.apiService
    val authDao = app.database.authDao()

    var phone by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var isLoading by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()
    val snackbarHostState = remember { SnackbarHostState() }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background),
        contentAlignment = Alignment.Center
    ) {
        SnackbarHost(hostState = snackbarHostState) { data ->
            Snackbar(
                snackbarData = data,
                containerColor = TadError,
                contentColor = White
            )
        }

        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 24.dp)
                .stitchedCard()
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // ─── Brand title ────────────────────────────────────────────────
            Text(
                text = "TAD Driver",
                style = goldGradientTextStyle(),
                fontSize = MaterialTheme.typography.displayLarge.fontSize
            )

            Text(
                text = "Inicia sesión en tu cuenta",
                style = TadSubheading,
                color = TadTextSecondary
            )

            Spacer(modifier = Modifier.height(8.dp))

            // ─── Phone input ───────────────────────────────────────────────
            OutlinedTextField(
                value = phone,
                onValueChange = { phone = it },
                label = { Text("Teléfono", color = TadTextSecondary) },
                placeholder = { Text("809-123-4567", color = TadTextDisabled) },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
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

            // ─── Password input ────────────────────────────────────────────
            OutlinedTextField(
                value = password,
                onValueChange = { password = it },
                label = { Text("Contraseña", color = TadTextSecondary) },
                visualTransformation = PasswordVisualTransformation(),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
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

            // ─── Error message ─────────────────────────────────────────────
            errorMessage?.let { msg ->
                Text(
                    text = msg,
                    color = TadError,
                    style = TadCaption,
                    textAlign = TextAlign.Center
                )
            }

            // ─── Login button ──────────────────────────────────────────────
            Button(
                onClick = {
                    if (phone.isBlank() || password.isBlank()) {
                        errorMessage = "Ingresa teléfono y contraseña"
                        return@Button
                    }
                    isLoading = true
                    errorMessage = null
                    scope.launch {
                        try {
                            val response = apiService.login(
                                LoginRequest(phone = phone.trim(), password = password)
                            )
                            // Save token to Room (AuthDao)
                            authDao.save(AuthEntity(key = "access_token", value = response.access_token))
                            authDao.save(AuthEntity(key = "driverId", value = response.driverId))
                            authDao.save(AuthEntity(key = "driverName", value = response.name))
                            // Set global state
                            GlobalState.driverId = response.driverId
                            GlobalState.deviceId = response.deviceId
                            GlobalState.isKillSwitchActive = !response.subscriptionPaid
                            // Navigate to dashboard (which handles onboarding check internally)
                            isLoading = false
                            onNavigateToDashboard()
                        } catch (e: HttpException) {
                            isLoading = false
                            val msg = when (e.code()) {
                                401 -> "Teléfono o contraseña incorrectos"
                                402 -> "Suscripción no pagada — servicio bloqueado"
                                429 -> "Demasiados intentos. Espera un momento."
                                else -> "Error del servidor (${e.code()})"
                            }
                            errorMessage = msg
                            scope.launch { snackbarHostState.showSnackbar(msg) }
                        } catch (e: Exception) {
                            isLoading = false
                            errorMessage = "Error de conexión. Verifica tu internet."
                            scope.launch { snackbarHostState.showSnackbar("Error de conexión") }
                        }
                    }
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(48.dp),
                enabled = !isLoading && phone.isNotBlank() && password.isNotBlank(),
                colors = ButtonDefaults.buttonColors(
                    containerColor = TadYellow,
                    disabledContainerColor = TadYellow.copy(alpha = 0.4f),
                    contentColor = Black
                ),
                shape = ButtonShape
            ) {
                if (isLoading) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(20.dp),
                        color = Black,
                        strokeWidth = 2.dp
                    )
                } else {
                    Text("INICIAR SESIÓN", style = TadLabel, color = Black)
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            // ─── Register link ──────────────────────────────────────────────
            TextButton(
                onClick = onNavigateToRegister,
                colors = ButtonDefaults.textButtonColors(contentColor = TadYellow)
            ) {
                Text("¿Nuevo conductor? Regístrate", style = TadLabel)
            }
        }
    }
}
