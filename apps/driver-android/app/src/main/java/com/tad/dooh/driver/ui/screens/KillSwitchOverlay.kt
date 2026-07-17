package com.tad.dooh.driver.ui.screens

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.tad.dooh.driver.ui.theme.*

/**
 * Full-screen lockdown overlay shown when GlobalState.isKillSwitchActive is true.
 * Cannot be dismissed — only removed when the backend returns non-402 (subscription paid).
 * Rendered at z-order 9999 via a Box wrapper in DashboardScreen.
 */
@Composable
fun KillSwitchOverlay() {
    val context = LocalContext.current
    val whatsappUrl = "https://wa.me/18095551234?text=Hola%20TAD%20-%20necesito%20pagar%20mi%20suscripción"
    val phoneCallUri = Uri.parse("tel:+18095551234")

    Box(
        modifier = Modifier
            .fillMaxSize()
            .killSwitchOverlay()
            .padding(24.dp),
        contentAlignment = Alignment.Center
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .stitchedCard()
                .padding(32.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // ─── Red shield / X icon ──────────────────────────────────────────
            Box(
                modifier = Modifier
                    .size(80.dp)
                    .background(TadRed.copy(alpha = 0.15f), StitchedCardShape)
                    .border(2.dp, TadRed, StitchedCardShape),
                contentAlignment = Alignment.Center
            ) {
                Text("✕", style = TadDisplay, color = TadRed)
            }

            // ─── Title ─────────────────────────────────────────────────────────
            Text(
                text = "SERVICIO BLOQUEADO",
                style = TadHeading,
                color = TadRed,
                textAlign = TextAlign.Center
            )

            // ─── Subtitle ──────────────────────────────────────────────────────
            Text(
                text = "Pago de RD$6,000 requerido",
                style = TadSubheading,
                color = TadTextSecondary,
                textAlign = TextAlign.Center
            )

            Text(
                text = "Tu suscripción mensual no está activa. Para continuar usando la plataforma, realiza el pago del Starter Kit.",
                style = TadBody,
                color = TadTextSecondary,
                textAlign = TextAlign.Center
            )

            Spacer(modifier = Modifier.height(8.dp))

            // ─── WhatsApp support button (yellow background) ──────────────────
            Button(
                onClick = {
                    val intent = Intent(Intent.ACTION_VIEW, Uri.parse(whatsappUrl))
                    intent.setPackage("com.whatsapp")
                    try { context.startActivity(intent) } catch (_: Exception) {
                        // WhatsApp not installed — open in browser
                        context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(whatsappUrl)))
                    }
                },
                modifier = Modifier.fillMaxWidth().height(48.dp),
                colors = ButtonDefaults.buttonColors(containerColor = TadYellow, contentColor = Black),
                shape = ButtonShape
            ) {
                Text("CONTACTAR POR WHATSAPP", style = TadLabel, color = Black)
            }

            // ─── Phone call button ────────────────────────────────────────────
            OutlinedButton(
                onClick = {
                    context.startActivity(Intent(Intent.ACTION_DIAL, phoneCallUri))
                },
                modifier = Modifier.fillMaxWidth().height(48.dp),
                colors = ButtonDefaults.outlinedButtonColors(contentColor = TadTextPrimary),
                border = BorderStroke(1.dp, TadBorder),
                shape = ButtonShape
            ) {
                Text("LLAMAR SOPORTE", style = TadLabel)
            }

            Spacer(modifier = Modifier.height(8.dp))

            // ─── Reassurance text ──────────────────────────────────────────────
            Text(
                text = "Tu información está segura localmente",
                style = TadCaption,
                color = TadTextDisabled,
                textAlign = TextAlign.Center
            )
        }
    }
}
