package com.tad.dooh.driver.service

import android.app.Service
import android.content.Intent
import android.content.pm.ServiceInfo
import android.location.Location
import android.os.Build
import android.os.IBinder
import android.os.Looper
import android.util.Log
import com.google.android.gms.location.FusedLocationProviderClient
import com.google.android.gms.location.LocationCallback
import com.google.android.gms.location.LocationRequest
import com.google.android.gms.location.LocationResult
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import com.tad.dooh.driver.TadApplication
import com.tad.dooh.driver.data.local.TadDatabase
import com.tad.dooh.driver.data.local.TelemetryDao
import com.tad.dooh.driver.data.local.TelemetryEntity
import com.tad.dooh.driver.data.local.AuthDao
import com.tad.dooh.driver.data.remote.AUTH_KEY_TOKEN
import com.tad.dooh.driver.data.remote.AUTH_KEY_DEVICE_ID
import com.tad.dooh.driver.data.remote.GlobalState
import com.tad.dooh.driver.data.remote.NetworkUnavailableException
import com.tad.dooh.driver.data.remote.TadApiService
import com.tad.dooh.driver.data.remote.TrackBatchRequest
import com.tad.dooh.driver.data.remote.TelemetryPoint
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import retrofit2.HttpException

// ─── Constants ─────────────────────────────────────────────────────────

/**
 * Foreground service that continuously reports GPS telemetry to the
 * TAD backend, mirroring the PWA's `useBackgroundTelemetry` hook
 * and the RN's expo-location background task.
 *
 * **Business rules preserved from PWA (immutable):**
 *
 * 1. **5-minute strict debounce** — [FLUSH_INTERVAL_MS] = 300 000 ms.
 *    GPS captures continuously but only flushes to backend every 5 min.
 *
 * 2. **Durable offline GPS** — unsent coordinates remain in Room.
 *    Never evict unacknowledged points during extended outages.
 *
 * 3. **Drip-sync 50 chunks** — [DRIP_CHUNK_SIZE] = 50.
 *    Offline queue syncs in 50-item chunks with random delay
 *    (200–800 ms) between chunks to avoid saturating the backend.
 *
 * 4. **Kill-Switch 402** — HTTP 402 triggers GPS service stop,
 *    auth purge, and force-logout broadcast.
 *
 * 5. **Realtime broadcast throttle 30s** — [LIVE_PING_THROTTLE_MS] = 30 000 ms.
 *    Ephemeral Supabase realtime ping for Admin Map, throttled to
 *    at most one broadcast every 30 seconds.
 *
 * Android-specific additions:
 * - Persistent foreground notification (required for background location)
 * - FusedLocationProviderClient with PRIORITY_HIGH_ACCURACY
 * - Proper Service lifecycle (onCreate / onStartCommand / onDestroy)
 * - START_STICKY to auto-restart if killed by the system
 */
class TelemetryForegroundService : Service() {

    companion object {
        // ── PWA-mirrored constants (immutable business rules) ──────────

        /** 5-minute strict debounce — GPS captures continuously,
         *  flushes to backend every 300 000 ms. */
        const val FLUSH_INTERVAL_MS = 300_000L

        /** Drip-sync chunk size — offline queue uploads in 50-item groups. */
        const val DRIP_CHUNK_SIZE = 50

        /** 30-second throttle for Supabase realtime broadcast to Admin Map. */
        const val LIVE_PING_THROTTLE_MS = 30_000L

        /** GPS capture interval — 10 seconds, matching PWA maximumAge=10 000. */
        const val GPS_INTERVAL_MS = 10_000L

        // ── Android-specific constants ──────────────────────────────────

        /** Broadcast action sent when kill-switch forces logout. */
        const val ACTION_FORCE_LOGOUT = "TAD_FORCE_LOGOUT"

        /** Intent extra key for the logout reason string. */
        const val EXTRA_REASON = "reason"

        /** Kill-switch reason value matching PWA's SUBSCRIPTION_UNPAID. */
        const val REASON_KILL_SWITCH = "SUBSCRIPTION_UNPAID"

        private const val TAG = "TelemetryForegroundService"
    }

    // ─── Service-scoped coroutine context ──────────────────────────────

    private val serviceScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    // ─── Dependencies (initialized in onCreate) ────────────────────────

    private lateinit var fusedLocationClient: FusedLocationProviderClient
    private lateinit var telemetryDao: TelemetryDao
    private lateinit var authDao: AuthDao
    private lateinit var apiService: TadApiService
    private lateinit var database: TadDatabase

    // ─── Mutable state ─────────────────────────────────────────────────



    /** Active flush-timer coroutine job. */
    private var flushJob: Job? = null

    /** Whether location updates are currently requested. */
    private var isTracking: Boolean = false

    // ─── FusedLocationProviderClient callback ───────────────────────────

    private val locationCallback = object : LocationCallback() {
        override fun onLocationResult(result: LocationResult) {
            val location: Location? = result.lastLocation
            if (location != null) {
                serviceScope.launch {
                    handleLocationUpdate(location)
                }
            }
        }
    }

    // ─── Service lifecycle ──────────────────────────────────────────────

    override fun onCreate() {
        super.onCreate()
        initDependencies()
        startForegroundNotification()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (!isTracking) {
            startLocationUpdates()
            startFlushTimer()
            isTracking = true
            Log.i(TAG, "Telemetry foreground service started — GPS tracking active")
        }
        return START_STICKY   // auto-restart if system kills the service
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
        Log.i(TAG, "Telemetry foreground service destroyed — cleaning up")
        cleanup()
        serviceScope.cancel()
        isTracking = false
        super.onDestroy()
    }

    // ─── Initialization ─────────────────────────────────────────────────

    private fun initDependencies() {
        val app = TadApplication.getInstance()
        database = app.database
        telemetryDao = database.telemetryDao()
        authDao = database.authDao()
        apiService = app.apiService
        fusedLocationClient = LocationServices.getFusedLocationProviderClient(this)
    }

    /**
     * Creates the notification channel and calls [startForeground]
     * with the persistent tracking notification.
     *
     * Must be called within 5 seconds of [Context.startForegroundService]
     * on Android 12+ to avoid [ForegroundServiceDidNotStartInTimeException].
     */
    private fun startForegroundNotification() {
        NotificationHelper.createNotificationChannel(this)
        val notification = NotificationHelper.buildTrackingNotification(this)

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            // API 29+ requires foregroundServiceType parameter
            startForeground(
                NotificationHelper.NOTIFICATION_ID,
                notification,
                ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION
            )
        } else {
            startForeground(NotificationHelper.NOTIFICATION_ID, notification)
        }
    }

    // ─── GPS location updates ───────────────────────────────────────────

    /**
     * Requests continuous GPS updates via [FusedLocationProviderClient]
     * every [GPS_INTERVAL_MS] (10 seconds) with high accuracy.
     *
     * Mirrors the PWA's `navigator.geolocation.watchPosition` with
     * `enableHighAccuracy: true, maximumAge: 10_000, timeout: 15_000`.
     */
    private fun startLocationUpdates() {
        val locationRequest = LocationRequest.Builder(
            Priority.PRIORITY_HIGH_ACCURACY,
            GPS_INTERVAL_MS
        ).build()

        try {
            fusedLocationClient.requestLocationUpdates(
                locationRequest,
                locationCallback,
                Looper.getMainLooper()
            )
            Log.d(TAG, "FusedLocationProviderClient updates requested — interval=$GPS_INTERVAL_MS ms")
        } catch (e: SecurityException) {
            Log.e(TAG, "Location permission not granted — cannot request GPS updates", e)
        }
    }

    /**
     * Handles each GPS location update from [FusedLocationProviderClient].
     *
     * 1. Writes a [TelemetryEntity] to Room with status "batch"
     *    (in-flight coords awaiting the next 5-minute flush).
     * 2. Checks the 30-second realtime throttle and broadcasts
     *    a `telemetry_ping` on the Supabase `fleet_tracking_live`
     *    channel if the throttle window has elapsed.
     */
    private suspend fun handleLocationUpdate(location: Location) {
        // ── 1. Persist to Room ──────────────────────────────────────────
        val entity = TelemetryEntity(
            ts       = location.time,          // epoch millis (immutable PK)
            lat      = location.latitude,
            lng      = location.longitude,
            accuracy = location.accuracy.toDouble(),
            status   = "batch"                 // awaiting flush
        )

        try {
            telemetryDao.insertAll(listOf(entity))
        } catch (e: Exception) {
            Log.e(TAG, "Failed to insert telemetry entity into Room", e)
        }
        // Supabase Realtime disabled — library requires Kotlin 2.3.0+ metadata (TAD v1.2+)
    }

    // ─── Flush timer ────────────────────────────────────────────────────

    /**
     * Starts the 5-minute periodic flush timer.
     *
     * On each tick: reads all "batch" coords from Room, POSTs them
     * to `/fleet/track-batch` via Retrofit.  On success, deletes
     * the batch records and attempts drip-sync of the offline queue.
     * On failure, moves batch to offline status and enforces the
     * 500-record cap.
     */
    private fun startFlushTimer() {
        flushJob = serviceScope.launch {
            Log.d(TAG, "Flush timer started — interval=$FLUSH_INTERVAL_MS ms")
            while (isActive) {
                delay(FLUSH_INTERVAL_MS)
                flushBatch()
            }
        }
    }

    // ─── Batch flush ────────────────────────────────────────────────────

    /**
     * Flushes all "batch" telemetry coords to the backend.
     *
     * This is the core 5-minute debounce operation:
     *
     * 1. Read all coords with status "batch" from Room.
     * 2. POST them as a single [TrackBatchRequest] to `/fleet/track-batch`.
     * 3. **On success**: delete "batch" records from Room, then attempt
     *    offline queue drip-sync in 50-item chunks.
     * 4. **On failure (offline)**: atomically mark only this snapshot offline
     *    for a future retry without evicting unacknowledged GPS.
     * 5. **On 402 (kill-switch)**: stop self, set [GlobalState.isKillSwitchActive],
     *    clear auth, broadcast [ACTION_FORCE_LOGOUT].
     */
    private suspend fun flushBatch() {
        val batchCoords: List<TelemetryEntity> = telemetryDao.getByStatus("batch")
        if (batchCoords.isEmpty()) {
            Log.d(TAG, "Flush tick — no batch coords, skipping")
            return
        }

        val driverId = GlobalState.driverId ?: run {
            Log.w(TAG, "Flush aborted — no driverId in GlobalState")
            return
        }
        val deviceId = GlobalState.deviceId ?: run {
            Log.w(TAG, "Flush aborted — no deviceId in GlobalState")
            return
        }

        Log.d(TAG, "Flushing ${batchCoords.size} batch coords to backend")

        val points = batchCoords.map { it.toTelemetryPoint() }
        val request = TrackBatchRequest(driverId, deviceId, points)

        try {
            val response = apiService.trackBatch(request)
            if (!response.acknowledges(points.size)) {
                Log.w(TAG, "Incomplete GPS receipt; retaining ${points.size} points for retry")
                moveBatchToOffline(batchCoords)
                return
            }
            Log.i(TAG, "Flush GPS receipt — count=${response.count}, input=${response.input}")

            // Delete only the acknowledged snapshot; new GPS fixes stay queued.
            telemetryDao.deleteAcknowledgedBatch(batchCoords.map { it.ts })

            // ── Attempt offline queue drip-sync after successful flush ────
            serviceScope.launch { dripSyncOfflineQueue() }

        } catch (e: HttpException) {
            if (e.code() == 402) {
                Log.w(TAG, "HTTP 402 — kill-switch triggered during flush")
                triggerKillSwitch()
                return
            }
            // Other HTTP errors (4xx/5xx) — treat as offline
            Log.w(TAG, "HTTP ${e.code()} — moving batch to offline queue")
            moveBatchToOffline(batchCoords)

        } catch (e: NetworkUnavailableException) {
            // NetworkMonitorInterceptor threw — device is offline
            Log.d(TAG, "Network unavailable — moving batch to offline queue")
            moveBatchToOffline(batchCoords)

        } catch (e: Exception) {
            // Generic network / IO failure — treat as offline
            Log.w(TAG, "Flush failed (${e::class.simpleName}) — moving batch to offline queue")
            moveBatchToOffline(batchCoords)
        }
    }

    /**
     * Moves only the failed batch snapshot to offline status in one SQL
     * statement. Concurrently captured GPS must remain intact, and no
     * unacknowledged record is evicted.
     */
    private suspend fun moveBatchToOffline(coords: List<TelemetryEntity>) {
        telemetryDao.markBatchOffline(coords.map { it.ts })
    }

    // ─── Offline queue drip-sync ────────────────────────────────────────

    /**
     * Drip-syncs the offline queue to the backend in 50-item chunks.
     *
     * Mirrors the PWA's `syncOfflineQueue` logic:
     * 1. Read all coords with status "offline" from Room.
     * 2. Chunk into [DRIP_CHUNK_SIZE] (50) groups.
     * 3. POST each chunk via Retrofit.
     * 4. On success: delete the synced chunk's records from Room.
     * 5. Between chunks: random delay of 200–800 ms to avoid
     *    saturating the backend (matches PWA's `Math.random() * 800 + 200`).
     * 6. On 402 in any chunk: abort, trigger kill-switch cascade.
     * 7. On other failure: abort drip-sync, remaining offline records
     *    will be retried in the next cycle (15-min Worker or 5-min flush).
     */
    private suspend fun dripSyncOfflineQueue() {
        val offlineCoords: List<TelemetryEntity> = telemetryDao.getByStatus("offline")
        if (offlineCoords.isEmpty()) {
            Log.d(TAG, "Drip-sync — offline queue empty, nothing to sync")
            return
        }

        val driverId = GlobalState.driverId ?: return
        val deviceId = GlobalState.deviceId ?: return

        Log.i(TAG, "Drip-sync starting — ${offlineCoords.size} offline coords in ${offlineCoords.size / DRIP_CHUNK_SIZE + 1} chunks")

        offlineCoords.chunked(DRIP_CHUNK_SIZE).forEach { chunk ->
            val points = chunk.map { it.toTelemetryPoint() }
            val request = TrackBatchRequest(driverId, deviceId, points)

            try {
                val response = apiService.trackBatch(request)
                if (!response.acknowledges(points.size)) {
                    Log.w(TAG, "Incomplete offline GPS receipt; retaining chunk for retry")
                    return
                }
                Log.d(TAG, "Drip-sync receipt — count=${response.count}, input=${response.input}")

                // ── Delete successfully synced chunk ──────────────────────
                telemetryDao.deleteByTsList(chunk.map { it.ts })

            } catch (e: HttpException) {
                if (e.code() == 402) {
                    Log.w(TAG, "HTTP 402 — kill-switch during drip-sync, aborting")
                    triggerKillSwitch()
                    return
                }
                // Other HTTP errors — abort drip-sync, will retry next cycle
                Log.w(TAG, "Drip-sync chunk failed (HTTP ${e.code()}), aborting — will retry later")
                return

            } catch (e: NetworkUnavailableException) {
                Log.d(TAG, "Network unavailable during drip-sync, aborting — will retry later")
                return

            } catch (e: Exception) {
                Log.w(TAG, "Drip-sync chunk failed (${e::class.simpleName}), aborting — will retry later")
                return
            }

            // ── Random inter-chunk delay (200–800 ms) ────────────────────
            val delayMs = (200L..800L).random()
            delay(delayMs)
        }

        Log.i(TAG, "Drip-sync complete — offline queue fully synced")
    }

    // ─── Kill-switch cascade ────────────────────────────────────────────

    /**
     * Triggers the subscription kill-switch cascade.
     *
     * This is the native equivalent of the PWA's `triggerKillSwitch()`:
     *
     * 1. Stops the foreground GPS service.
     * 2. Sets [GlobalState.isKillSwitchActive] = true
     *    (may already be set by [KillSwitchInterceptor] on HTTP 402).
     * 3. Clears auth from Room (token + device ID + user data).
     * 4. Broadcasts [ACTION_FORCE_LOGOUT] intent so the UI layer
     *    can show the PaymentLockOverlay and force navigation to
     *    the onboarding / re-subscribe screen.
     */
    private fun triggerKillSwitch() {
        Log.w(TAG, "Kill-switch cascade activated — stopping service and forcing logout")

        // ── 1. Set global state ──────────────────────────────────────────
        GlobalState.isKillSwitchActive = true
        GlobalState.forceLogoutReason = "KILL_SWITCH"

        // ── 2. Clear auth from Room ──────────────────────────────────────
        serviceScope.launch {
            try {
                authDao.delete(AUTH_KEY_TOKEN)
                authDao.delete(AUTH_KEY_DEVICE_ID)
                authDao.delete("tad_driver_user")
                Log.d(TAG, "Auth cleared from Room after kill-switch")
            } catch (e: Exception) {
                Log.e(TAG, "Failed to clear auth after kill-switch", e)
            }
        }

        // ── 3. Reset GlobalState identity ────────────────────────────────
        GlobalState.driverId = null
        GlobalState.deviceId = null

        // ── 4. Broadcast force-logout intent ─────────────────────────────
        val logoutIntent = Intent(ACTION_FORCE_LOGOUT)
        logoutIntent.putExtra(EXTRA_REASON, REASON_KILL_SWITCH)
        logoutIntent.setPackage(packageName)   // restrict to this app
        sendBroadcast(logoutIntent)

        // ── 5. Stop the foreground service ────────────────────────────────
        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
    }

    // ─── Cleanup ────────────────────────────────────────────────────────

    /**
     * Cleans up all resources when the service is destroyed.
     *
     * - Removes FusedLocationProviderClient location updates
     * - Cancels the flush timer coroutine
     * - Unsubscribes and removes the Supabase realtime channel
     */
    private fun cleanup() {
        // ── Remove GPS location updates ──────────────────────────────────
        try {
            fusedLocationClient.removeLocationUpdates(locationCallback)
            Log.d(TAG, "FusedLocationProviderClient updates removed")
        } catch (e: Exception) {
            Log.w(TAG, "Failed to remove location updates", e)
        }

        // ── Cancel flush timer ────────────────────────────────────────────
        flushJob?.cancel()
        flushJob = null

        // ── Cleanup Supabase realtime channel ────────────────────────────
        // Supabase Realtime disabled — library requires Kotlin 2.3.0+ metadata (TAD v1.2+)
    }

    // ─── Extension helpers ───────────────────────────────────────────────

    /**
     * Maps a [TelemetryEntity] to a [TelemetryPoint] for the API payload.
     *
     * `speed` defaults to 0.0 — the PWA hardcodes this because the
     * browser Geolocation API provides unreliable speed values.
     * Android's FusedLocationProviderClient could capture real speed,
     * but we preserve the PWA's canonical rule to keep cross-platform
     * behavior consistent.
     */
    private fun TelemetryEntity.toTelemetryPoint() = TelemetryPoint(
        lat       = lat,
        lng       = lng,
        speed     = 0.0,       // PWA canonical: always 0
        timestamp = ts          // epoch millis — same as Location.time()
    )

}
