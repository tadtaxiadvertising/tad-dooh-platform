package com.tad.dooh.driver.service

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import com.tad.dooh.driver.R
import com.tad.dooh.driver.ui.MainActivity

// ─── Notification channel constants ────────────────────────────────────

/**
 * Utility for creating the foreground-service notification channel and
 * building the persistent tracking notification.
 *
 * Android requires a visible notification for any foreground service
 * (since Android 8.0 / API 26).  The notification must use a channel
 * with `IMPORTANCE_LOW` so it doesn't distract the driver in kiosk mode.
 *
 * Mirrors the PWA's `useBackgroundTelemetry` requirement that GPS
 * tracking runs continuously in the background with a visible indicator.
 */
object NotificationHelper {

    /** Channel ID used for the telemetry foreground-service notification. */
    const val CHANNEL_ID = "tad_telemetry"

    /** Channel name visible in Android notification settings. */
    const val CHANNEL_NAME = "TAD GPS Tracking"

    /** Channel description for accessibility / settings UI. */
    const val CHANNEL_DESCRIPTION = "Notificación persistente de seguimiento GPS del conductor TAD"

    /** Notification ID used by [TelemetryForegroundService.startForeground]. */
    const val NOTIFICATION_ID = 1001

    // ─── Channel creation ──────────────────────────────────────────────────

    /**
     * Creates the [CHANNEL_ID] notification channel if it doesn't already exist.
     *
     * Safe to call multiple times — Android ignores duplicate channel
     * creation.  Must be called before [buildTrackingNotification] or
     * [Service.startForeground] on API 26+.
     *
     * Channel priority is `IMPORTANCE_LOW` so the notification appears
     * silently in the status bar without sound or heads-up, matching
     * the kiosk-mode UX requirement.
     */
    fun createNotificationChannel(context: Context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                CHANNEL_NAME,
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = CHANNEL_DESCRIPTION
                setShowBadge(false)   // no badge on launcher icon for tracking
                lockscreenVisibility = Notification.VISIBILITY_PUBLIC
            }

            val manager = context.getSystemService(Context.NOTIFICATION_SERVICE)
                as NotificationManager

            manager.createNotificationChannel(channel)
        }
    }

    // ─── Notification builder ────────────────────────────────────────────

    /**
     * Builds the persistent foreground-service notification.
     *
     * Title: "TAD GPS Tracking activo"
     * Body:  "Sincronizando ubicación cada 5 min"
     *
     * The notification is `ongoing` (cannot be swiped away) and opens
     * [MainActivity] when tapped, so the driver can return to the
     * dashboard from the notification shade.
     */
    fun buildTrackingNotification(context: Context): android.app.Notification {
        // ── PendingIntent to open MainActivity on tap ────────────────────
        val openAppIntent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }

        val pendingIntent = PendingIntent.getActivity(
            context,
            0,
            openAppIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        // ── Build notification ──────────────────────────────────────────
        return NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle("TAD GPS Tracking activo")
            .setContentText("Sincronizando ubicación cada 5 min")
            .setOngoing(true)                     // cannot be dismissed while service runs
            .setPriority(NotificationCompat.PRIORITY_LOW)  // silent, no heads-up
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .setContentIntent(pendingIntent)
            .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE)
            .build()
    }
}
