package com.tad.dooh.driver

import android.app.Application
import android.content.Context
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.NetworkRequest
import androidx.hilt.work.HiltWorkerFactory
import androidx.work.Configuration
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import com.tad.dooh.driver.data.local.TadDatabase
import com.tad.dooh.driver.worker.TelemetrySyncWorker
import dagger.hilt.android.HiltAndroidApp
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import java.util.concurrent.TimeUnit
import javax.inject.Inject

/**
 * TAD Driver Application — `@HiltAndroidApp` entry point for the DI graph.
 *
 * Boot sequence:
 *  1. Hilt generates the singleton component and injects `@Inject` fields
 *     (database) before [onCreate] runs.
 *  2. Room database is now provided by [com.tad.dooh.driver.di.DatabaseModule]
 *     and injected; the `lateinit var database` service-locator is removed.
 *  3. The Retrofit client (`TadApiClient`) remains a Kotlin `object` (option
 *     C2→b) and is exposed to Hilt via [com.tad.dooh.driver.di.NetworkModule].
 *  4. Network connectivity observer is registered (legacy — kept as-is, will
 *     migrate to a Hilt-provided NetworkMonitor in a later iteration).
 *  5. WorkManager periodic telemetry-sync schedule is enqueued; the
 *     [HiltWorkerFactory] is wired via [Configuration.Provider] so
 *     `@HiltWorker`-annotated workers (e.g. [TelemetrySyncWorker]) receive
 *     their `@AssistedInject` dependencies.
 *
 * Supabase initialization has been removed: the kill-switch no longer uses
 * Supabase GoTrue for token refresh — drivers auth is HS256 JWT local with
 * silent re-login via `POST /drivers/login` (verified against backend, no
 * `/drivers/refresh` endpoint exists).
 */
@HiltAndroidApp
class TadApplication : Application(), Configuration.Provider {

    val applicationScope = CoroutineScope(SupervisorJob() + Dispatchers.Default)

    // ── Hilt-injected dependencies ──────────────────────────────────────────

    @Inject
    lateinit var database: TadDatabase

    /**
     * Hilt-provided [HiltWorkerFactory]. Used by WorkManager to construct
     * `@HiltWorker`-annotated workers with their `@AssistedInject` deps.
     * Provided automatically by `androidx.hilt:hilt-work` once it's on the
     * classpath and this Application is `@HiltAndroidApp`.
     */
    @Inject
    lateinit var workerFactory: HiltWorkerFactory

    // ── Legacy singleton accessor (for non-Hilt callers, e.g. TadApiClient) ─

    /** Static accessor used by [com.tad.dooh.driver.data.remote.TadApiClient]
     *  until its own migration to Hilt is complete. New code should prefer Hilt
     *  injection over this. */
    companion object {
        @Volatile
        private lateinit var instance: TadApplication

        fun getInstance(): TadApplication = instance
    }

    // ── Network state (legacy — will migrate to Hilt NetworkMonitor) ─────────

    var isNetworkAvailable: Boolean = false
        private set

    private val connectivityManager by lazy {
        getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
    }

    private val networkCallback = object : ConnectivityManager.NetworkCallback() {
        override fun onAvailable(network: Network) {
            isNetworkAvailable = true
        }

        override fun onLost(network: Network) {
            isNetworkAvailable = false
        }

        override fun onCapabilitiesChanged(
            network: Network,
            capabilities: NetworkCapabilities
        ) {
            isNetworkAvailable = capabilities.hasCapability(
                NetworkCapabilities.NET_CAPABILITY_INTERNET
            ) && capabilities.hasCapability(
                NetworkCapabilities.NET_CAPABILITY_VALIDATED
            )
        }
    }

    // ── WorkManager Configuration.Provider ───────────────────────────────────

    /**
     * Required by WorkManager to inject the [HiltWorkerFactory] so that
     * `@HiltWorker`-annotated workers receive their `@AssistedInject` deps.
     * Returning `null` for `workManagerConfiguration` would fall back to the
     * default factory and crash on the first `@HiltWorker` instantiation.
     */
    override val workManagerConfiguration: Configuration
        get() = Configuration.Builder()
            .setWorkerFactory(workerFactory)
            .build()

    // ── Lifecycle ───────────────────────────────────────────────────────────

    override fun onCreate() {
        super.onCreate()
        instance = this

        // `database` is already injected by Hilt at this point.
        registerNetworkObserver()
        schedulePeriodicTelemetrySync()
    }

    private fun registerNetworkObserver() {
        // Seed initial state
        @Suppress("DEPRECATION")
        val activeNetwork = connectivityManager.activeNetworkInfo
        isNetworkAvailable = activeNetwork?.isConnectedOrConnecting == true

        val request = NetworkRequest.Builder()
            .addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
            .addCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED)
            .build()

        connectivityManager.registerNetworkCallback(request, networkCallback)
    }

    private fun schedulePeriodicTelemetrySync() {
        val syncRequest = PeriodicWorkRequestBuilder<TelemetrySyncWorker>(
            repeatInterval = 15L,
            repeatIntervalTimeUnit = TimeUnit.MINUTES
        )
            .setConstraints(
                androidx.work.Constraints.Builder()
                    .setRequiredNetworkType(androidx.work.NetworkType.CONNECTED)
                    .build()
            )
            .build()

        WorkManager.getInstance(this)
            .enqueueUniquePeriodicWork(
                TelemetrySyncWorker.WORK_NAME,
                ExistingPeriodicWorkPolicy.KEEP,
                syncRequest
            )
    }
}
