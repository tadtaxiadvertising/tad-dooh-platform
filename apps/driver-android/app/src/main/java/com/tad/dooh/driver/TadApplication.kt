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
import com.tad.dooh.driver.data.remote.TadApiService
import com.tad.dooh.driver.worker.TelemetrySyncWorker
import dagger.hilt.android.HiltAndroidApp
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.createSupabaseClient
import io.github.jan.supabase.postgrest.Postgrest
import io.github.jan.supabase.realtime.Realtime
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
 *     before [onCreate] runs.
 *  2. Room database is provided by [com.tad.dooh.driver.di.DatabaseModule].
 *  3. Retrofit client via [com.tad.dooh.driver.di.NetworkModule].
 *  4. Network connectivity observer is registered.
 *  5. WorkManager periodic telemetry-sync is enqueued via [HiltWorkerFactory].
 *
 * Drivers auth is HS256 JWT local with silent re-login via `POST /drivers/login`.
 */
@HiltAndroidApp
class TadApplication : Application(), Configuration.Provider {

    val applicationScope = CoroutineScope(SupervisorJob() + Dispatchers.Default)

    // ── Hilt-injected dependencies ──────────────────────────────────────────

    @Inject
    lateinit var database: TadDatabase

    @Inject
    lateinit var apiService: TadApiService

    /** Hilt-provided [HiltWorkerFactory]. */
    @Inject
    lateinit var workerFactory: HiltWorkerFactory

    /**
     * Supabase client — kept for [TelemetryForegroundService] realtime broadcast
     * to the Admin Map (channel `fleet_tracking_live`). NOT used for auth.
     */
    lateinit var supabaseClient: SupabaseClient
        private set

    // ── Legacy singleton accessor ──────────────────────────────────────────

    companion object {
        @Volatile
        private lateinit var instance: TadApplication

        fun getInstance(): TadApplication = instance
    }

    // ── Network state ──────────────────────────────────────────────────────

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

    // ── WorkManager Configuration.Provider ──────────────────────────────────

    override val workManagerConfiguration: Configuration
        get() = Configuration.Builder()
            .setWorkerFactory(workerFactory)
            .build()

    // ── Lifecycle ──────────────────────────────────────────────────────────

    override fun onCreate() {
        super.onCreate()
        instance = this

        // `database`, `apiService`, `workerFactory` already injected by Hilt.
        initSupabase()
        registerNetworkObserver()
        schedulePeriodicTelemetrySync()
    }

    private fun initSupabase() {
        supabaseClient = createSupabaseClient(
            supabaseUrl = BuildConfig.SUPABASE_URL,
            supabaseKey = BuildConfig.SUPABASE_ANON_KEY
        ) {
            install(Postgrest)
            install(Realtime)
        }
    }

    private fun registerNetworkObserver() {
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