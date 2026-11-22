package com.tad.dooh.driver.worker

import android.content.Context
import android.content.Intent
import android.util.Log
import androidx.hilt.work.HiltWorker
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.tad.dooh.driver.data.local.AuthDao
import com.tad.dooh.driver.data.local.TelemetryDao
import com.tad.dooh.driver.data.local.TelemetryEntity
import com.tad.dooh.driver.data.remote.AUTH_KEY_DEVICE_ID
import com.tad.dooh.driver.data.remote.AUTH_KEY_TOKEN
import dagger.assisted.Assisted
import dagger.assisted.AssistedFactory
import dagger.assisted.AssistedInject
import com.tad.dooh.driver.data.remote.GlobalState
import com.tad.dooh.driver.data.remote.NetworkUnavailableException
import com.tad.dooh.driver.data.remote.TadApiService
import com.tad.dooh.driver.data.remote.TrackBatchRequest
import com.tad.dooh.driver.data.remote.TelemetryPoint
import com.tad.dooh.driver.service.TelemetryForegroundService
import kotlinx.coroutines.delay
import retrofit2.HttpException

// ─── Constants ─────────────────────────────────────────────────────────

/**
 * WorkManager [CoroutineWorker] that periodically syncs offline telemetry
 * records to the backend, complementing the foreground service's 5-minute
 * flush cycle.
 *
 * Scheduled by [com.tad.dooh.driver.TadApplication.schedulePeriodicTelemetrySync]
 * as a `PeriodicWorkRequest` every 15 minutes with `NetworkType.CONNECTED`
 * constraint.
 *
 * **Hilt integration:** annotated with [HiltWorker] and constructed via
 * [AssistedInject] — the [HiltWorkerFactory] (installed by [TadApplication]
 * via `Configuration.Provider`) supplies the non-assisted dependencies
 * (`telemetryDao`, `authDao`, `apiService`) from the Hilt graph, while
 * WorkManager supplies the [Context] and [WorkerParameters] via the
 * assisted parameters. The previous `TadApplication.getInstance()` service-
 * locator pattern has been removed.
 *
 * **Business rules (matching PWA's `syncOfflineQueue`):**
 *
 * - Drip-sync in 50-item chunks ([DRIP_CHUNK_SIZE])
 * - Random inter-chunk delay (200–800 ms) to avoid backend saturation
 * - On HTTP 402: triggers kill-switch cascade (stop service, clear auth,
 *   broadcast force-logout)
 * - Marks work as `Result.success()` when all offline records are synced
 * - Marks work as `Result.retry()` on transient failures so WorkManager
 *   reschedules with its backoff policy
 */
@HiltWorker
class TelemetrySyncWorker @AssistedInject constructor(
    @Assisted appContext: Context,
    @Assisted params: WorkerParameters,
    private val telemetryDao: TelemetryDao,
    private val authDao: AuthDao,
    private val apiService: TadApiService
) : CoroutineWorker(appContext, params) {

    companion object {
        /** Unique work name for WorkManager enqueue — matches schedule in TadApplication. */
        const val WORK_NAME = "TelemetrySyncWorker"

        /** Drip-sync chunk size — 50 items per POST, matching PWA DRIP_CHUNK_SIZE. */
        const val DRIP_CHUNK_SIZE = 50

        private const val TAG = "TelemetrySyncWorker"
    }

    /**
     * Hilt-assisted factory — WorkManager + Hilt use this to build instances of
     * [TelemetrySyncWorker]. Generated for us by the `androidx.hilt:hilt-compiler`
     * KSP processor when it sees [HiltWorker] + [AssistedInject]. We declare it
     * explicitly so the compiler wires [create] to be called with the assisted
     * [Context] + [WorkerParameters], and Hilt resolves the other deps.
     */
    @AssistedFactory
    interface Factory {
        fun create(appContext: Context, params: WorkerParameters): TelemetrySyncWorker
    }

    // ─── Work execution ──────────────────────────────────────────────────

    /**
     * Reads "offline" coords from Room and drip-syncs them in 50-item
     * chunks via Retrofit.
     *
     * On success: deletes synced items from Room → `Result.success()`.
     * On 402: triggers kill-switch → `Result.failure()`.
     * On transient failure: `Result.retry()` so WorkManager reschedules.
     */
    override suspend fun doWork(): Result {
        Log.d(TAG, "TelemetrySyncWorker starting — checking offline queue")

        // ── Pre-flight: skip if kill-switch is already active ────────────
        if (GlobalState.isKillSwitchActive) {
            Log.w(TAG, "Kill-switch active — aborting sync worker")
            return Result.failure()
        }

        val offlineCoords: List<TelemetryEntity> = telemetryDao.getByStatus("offline")
        if (offlineCoords.isEmpty()) {
            Log.d(TAG, "Offline queue empty — nothing to sync, work succeeds")
            return Result.success()
        }

        val driverId = GlobalState.driverId ?: run {
            Log.w(TAG, "No driverId — cannot sync, will retry when available")
            return Result.retry()
        }
        val deviceId = GlobalState.deviceId ?: run {
            Log.w(TAG, "No deviceId — cannot sync, will retry when available")
            return Result.retry()
        }

        Log.i(TAG, "Drip-sync starting — ${offlineCoords.size} offline coords")

        // ── Drip-sync: process in 50-item chunks ────────────────────────
        offlineCoords.chunked(DRIP_CHUNK_SIZE).forEach { chunk ->
            val points = chunk.map { it.toTelemetryPoint() }
            val request = TrackBatchRequest(driverId, deviceId, points)

            try {
                val response = apiService.trackBatch(request)
                if (!response.acknowledges(points.size)) {
                    Log.w(TAG, "Incomplete GPS receipt; retaining chunk for WorkManager retry")
                    return Result.retry()
                }
                Log.d(TAG, "Chunk GPS receipt — count=${response.count}, input=${response.input}")

                // ── Delete synced chunk from Room ──────────────────────────
                telemetryDao.deleteByTsList(chunk.map { it.ts })

            } catch (e: HttpException) {
                if (e.code() == 402) {
                    Log.w(TAG, "HTTP 402 — kill-switch triggered during Worker sync")
                    triggerKillSwitch()
                    return Result.failure()
                }
                // Other HTTP errors — transient, let WorkManager retry
                Log.w(TAG, "HTTP ${e.code()} during drip-sync — will retry")
                return Result.retry()

            } catch (e: NetworkUnavailableException) {
                // Network gone mid-sync — WorkManager will retry when connected
                Log.d(TAG, "Network unavailable during drip-sync — will retry")
                return Result.retry()

            } catch (e: Exception) {
                // Generic failure — transient, let WorkManager retry
                Log.w(TAG, "Drip-sync failed (${e::class.simpleName}) — will retry")
                return Result.retry()
            }

            // ── Random inter-chunk delay (200–800 ms) ────────────────────
            val delayMs = (200L..800L).random()
            delay(delayMs)
        }

        Log.i(TAG, "Drip-sync complete — all offline records synced")
        return Result.success()
    }

    // ─── Kill-switch cascade ────────────────────────────────────────────

    /**
     * Triggers the kill-switch cascade from the Worker context.
     *
     * Since Workers don't have access to the Service lifecycle,
     * we broadcast the force-logout intent so the foreground service
     * (if running) can stop itself, and the UI can show the payment
     * lock overlay.
     */
    private fun triggerKillSwitch() {
        Log.w(TAG, "Kill-switch cascade from Worker — setting GlobalState and broadcasting")

        GlobalState.isKillSwitchActive = true
        GlobalState.forceLogoutReason = "KILL_SWITCH"

        // ── Clear auth from Room ──────────────────────────────────────────
        try {
            kotlinx.coroutines.runBlocking {
                authDao.delete(AUTH_KEY_TOKEN)
                authDao.delete(AUTH_KEY_DEVICE_ID)
                authDao.delete("tad_driver_user")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to clear auth in Worker kill-switch", e)
        }

        GlobalState.driverId = null
        GlobalState.deviceId = null

        // ── Broadcast force-logout intent ─────────────────────────────────
        val logoutIntent = Intent(TelemetryForegroundService.ACTION_FORCE_LOGOUT)
        logoutIntent.putExtra(TelemetryForegroundService.EXTRA_REASON, TelemetryForegroundService.REASON_KILL_SWITCH)
        logoutIntent.setPackage(applicationContext.packageName)
        applicationContext.sendBroadcast(logoutIntent)
    }

    // ─── Extension helper ────────────────────────────────────────────────

    private fun TelemetryEntity.toTelemetryPoint() = TelemetryPoint(
        lat       = lat,
        lng       = lng,
        speed     = 0.0,       // PWA canonical: always 0
        timestamp = ts
    )
}
