package com.tad.dooh.driver.service

import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import com.tad.dooh.driver.TadApplication
import com.tad.dooh.driver.data.local.TelemetryDao
import com.tad.dooh.driver.data.local.AuthDao
import com.tad.dooh.driver.data.local.TelemetryEntity
import com.tad.dooh.driver.data.remote.GlobalState
import com.tad.dooh.driver.data.remote.NetworkUnavailableException
import com.tad.dooh.driver.data.remote.TadApiService
import com.tad.dooh.driver.data.remote.TrackBatchRequest
import com.tad.dooh.driver.data.remote.TelemetryPoint
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import retrofit2.HttpException

// ─── Repository ────────────────────────────────────────────────────────

/**
 * Repository coordinating telemetry state between the Room DAO, Retrofit
 * API, foreground service, and WorkManager.
 *
 * Provides Flow-based observable state for the UI layer:
 * - [isTracking]: whether the GPS foreground service is active
 * - [batchCount]: number of in-flight coords awaiting flush
 * - [offlineCount]: number of offline coords queued for sync
 * - [connectionStatus]: whether the device currently has validated internet
 *
 * Exposes lifecycle methods:
 * - [startTracking]: starts the foreground GPS service
 * - [stopTracking]: stops the foreground GPS service
 * - [syncPending]: manual trigger for immediate offline queue drip-sync
 *
 * This is the native equivalent of the PWA's `useBackgroundTelemetry` hook
 * — all business rules are delegated to [TelemetryForegroundService]
 * and [TelemetrySyncWorker], with this class acting as the single
 * coordination point for the Compose UI.
 */
class TelemetryRepository(
    private val context: Context,
    private val telemetryDao: TelemetryDao,
    private val authDao: AuthDao,
    private val apiService: TadApiService,
    private val app: TadApplication
) {

    companion object {
        /** Drip-sync chunk size for manual [syncPending] calls. */
        const val DRIP_CHUNK_SIZE = 50

        private const val TAG = "TelemetryRepository"

        fun create(context: Context): TelemetryRepository {
            val app = TadApplication.getInstance()
            return TelemetryRepository(
                context       = context,
                telemetryDao  = app.database.telemetryDao(),
                authDao       = app.database.authDao(),
                apiService    = app.apiService,
                app           = app
            )
        }
    }

    // ─── Coroutine scope ────────────────────────────────────────────────

    private val repoScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    // ─── Observable state ────────────────────────────────────────────────

    /**
     * Whether the foreground GPS tracking service is currently active.
     *
     * Updated by [startTracking] / [stopTracking].  The UI can observe
     * this to show/hide the tracking indicator.
     */
    private val _isTracking = MutableStateFlow(false)
    val isTracking: StateFlow<Boolean> = _isTracking

    /**
     * Number of telemetry coords with status "batch" awaiting the
     * next 5-minute flush to the backend.
     */
    val batchCount: StateFlow<Int> = telemetryDao.getByStatusFlow("batch")
        .map { it.size }
        .stateIn(repoScope, SharingStarted.Eagerly, 0)

    /**
     * Number of telemetry coords with status "offline" queued for
     * the next drip-sync cycle.
     */
    val offlineCount: StateFlow<Int> = telemetryDao.getByStatusFlow("offline")
        .map { it.size }
        .stateIn(repoScope, SharingStarted.Eagerly, 0)

    /**
     * Whether the device currently has validated internet connectivity.
     *
     * Backed by [TadApplication.isNetworkAvailable] which is updated
     * by the ConnectivityManager NetworkCallback registered in
     * [TadApplication.registerNetworkObserver].
     */
    private val _connectionStatus = MutableStateFlow(app.isNetworkAvailable)
    val connectionStatus: StateFlow<Boolean> = _connectionStatus

    /**
     * Updates [connectionStatus] from [TadApplication]'s live network
     * state.  Called periodically or after network events to keep the
     * StateFlow in sync with the actual connectivity state.
     */
    fun refreshConnectionStatus() {
        _connectionStatus.value = app.isNetworkAvailable
    }

    // ─── Service lifecycle ───────────────────────────────────────────────

    /**
     * Starts the [TelemetryForegroundService] for continuous GPS tracking.
     *
     * On Android 8+ (API 26), uses [Context.startForegroundService] which
     * requires the service to call `startForeground()` within 5 seconds.
     * On older versions, uses [Context.startService].
     *
     * Sets [_isTracking] to `true` on success.
     */
    fun startTracking() {
        val intent = Intent(context, TelemetryForegroundService::class.java)

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.startForegroundService(intent)
        } else {
            context.startService(intent)
        }

        _isTracking.value = true
        Log.i(TAG, "Foreground telemetry service started")
    }

    /**
     * Stops the [TelemetryForegroundService] and ends GPS tracking.
     *
     * Sets [_isTracking] to `false`.
     */
    fun stopTracking() {
        context.stopService(Intent(context, TelemetryForegroundService::class.java))
        _isTracking.value = false
        Log.i(TAG, "Foreground telemetry service stopped")
    }

    // ─── Manual sync trigger ─────────────────────────────────────────────

    /**
     * Manually triggers an immediate drip-sync of the offline queue.
     *
     * Useful when the UI detects that connectivity has been restored
     * and wants to flush pending coords before the next automatic cycle.
     *
     * Processes offline records in [DRIP_CHUNK_SIZE] (50) chunks with
     * random inter-chunk delay (200–800 ms), matching the PWA's
     * `syncOfflineQueue` logic.
     *
     * Returns `true` if all offline records were successfully synced,
     * `false` if the sync was aborted (failure, 402, or no driver/device ID).
     */
    suspend fun syncPending(): Boolean {
        Log.d(TAG, "Manual syncPending triggered")

        if (GlobalState.isKillSwitchActive) {
            Log.w(TAG, "Kill-switch active — aborting manual sync")
            return false
        }

        refreshConnectionStatus()
        if (!_connectionStatus.value) {
            Log.d(TAG, "No network — aborting manual sync")
            return false
        }

        val offlineCoords: List<TelemetryEntity> = telemetryDao.getByStatus("offline")
        if (offlineCoords.isEmpty()) {
            Log.d(TAG, "Offline queue empty — nothing to sync")
            return true
        }

        val driverId = GlobalState.driverId ?: run {
            Log.w(TAG, "No driverId — cannot sync")
            return false
        }
        val deviceId = GlobalState.deviceId ?: run {
            Log.w(TAG, "No deviceId — cannot sync")
            return false
        }

        Log.i(TAG, "Manual drip-sync — ${offlineCoords.size} offline coords")

        offlineCoords.chunked(DRIP_CHUNK_SIZE).forEach { chunk ->
            val points = chunk.map { it.toTelemetryPoint() }
            val request = TrackBatchRequest(driverId, deviceId, points)

            try {
                val response = apiService.trackBatch(request)
                if (!response.acknowledges(points.size)) {
                    Log.w(TAG, "Incomplete GPS receipt; retaining manual sync chunk")
                    return false
                }
                Log.d(TAG, "Manual GPS receipt — count=${response.count}, input=${response.input}")
                telemetryDao.deleteByTsList(chunk.map { it.ts })

            } catch (e: HttpException) {
                if (e.code() == 402) {
                    Log.w(TAG, "HTTP 402 — kill-switch during manual sync, aborting")
                    return false
                }
                Log.w(TAG, "HTTP ${e.code()} — aborting manual sync")
                return false

            } catch (e: NetworkUnavailableException) {
                Log.d(TAG, "Network unavailable — aborting manual sync")
                return false

            } catch (e: Exception) {
                Log.w(TAG, "Manual sync chunk failed (${e::class.simpleName}) — aborting")
                return false
            }

            // ── Random inter-chunk delay (200–800 ms) ────────────────────
            val delayMs = (200L..800L).random()
            delay(delayMs)
        }

        Log.i(TAG, "Manual drip-sync complete — all offline records synced")
        return true
    }

    // ─── Cleanup ─────────────────────────────────────────────────────────

    /**
     * Cancels the repository's coroutine scope.
     *
     * Call this when the ViewModel or Activity is destroyed to prevent
     * leaked coroutines.  The StateFlows will stop updating after this.
     */
    fun cancel() {
        repoScope.cancel()
    }

    // ─── Extension helper ────────────────────────────────────────────────

    private fun TelemetryEntity.toTelemetryPoint() = TelemetryPoint(
        lat       = lat,
        lng       = lng,
        speed     = 0.0,       // PWA canonical: always 0
        timestamp = ts
    )

    // ─── Factory ─────────────────────────────────────────────────────────

    /**
     * Creates a [TelemetryRepository] wired to the app's singletons.
     *
     * Prefer this over direct constructor calls in Compose/UI code —
     * it ensures all dependencies come from [TadApplication].
     */
    fun create(context: Context): TelemetryRepository {
        val app = TadApplication.getInstance()
        return TelemetryRepository(
            context       = context,
            telemetryDao  = app.database.telemetryDao(),
            authDao       = app.database.authDao(),
            apiService    = app.apiService,
            app           = app
        )
    }
}