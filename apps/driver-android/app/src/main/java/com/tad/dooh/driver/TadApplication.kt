package com.tad.dooh.driver

import android.app.Application
import android.content.Context
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.NetworkRequest
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import com.tad.dooh.driver.data.local.TadDatabase
import com.tad.dooh.driver.data.remote.TadApiClient
import com.tad.dooh.driver.data.remote.TadApiService
import com.tad.dooh.driver.worker.TelemetrySyncWorker
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.createSupabaseClient
import io.github.jan.supabase.gotrue.GoTrue
import io.github.jan.supabase.postgrest.Postgrest
import io.github.jan.supabase.realtime.Realtime
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import java.util.concurrent.TimeUnit

/**
 * TAD Driver Application — initializes all core infrastructure singletons.
 *
 * Boot sequence:
 *  1. Room database (offline-first telemetry cache)
 *  2. Retrofit client (REST API for fallback / non-Realtime endpoints)
 *  3. Supabase client (Realtime + Postgrest + GoTrue)
 *  4. Network connectivity observer (drive online/offline transitions)
 *  5. WorkManager periodic telemetry-sync schedule
 */
class TadApplication : Application() {

    val applicationScope = CoroutineScope(SupervisorJob() + Dispatchers.Default)

    // ── Singletons ──────────────────────────────────────────────────────────

    lateinit var database: TadDatabase
        private set

    /** Retrofit API client — provides auth, kill-switch, and network interceptors. */
    val tadApiClient: TadApiClient = TadApiClient

    /** Pre-built API service instance for convenient access. */
    val apiService: TadApiService by lazy { tadApiClient.apiService }

    lateinit var supabaseClient: SupabaseClient
        private set

    // ── Network state ───────────────────────────────────────────────────────

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

    // ── Lifecycle ───────────────────────────────────────────────────────────

    override fun onCreate() {
        super.onCreate()
        instance = this

        initRoomDatabase()
        initRetrofit()
        initSupabase()
        registerNetworkObserver()
        schedulePeriodicTelemetrySync()
    }

    // ── Initialization ──────────────────────────────────────────────────────

    private fun initRoomDatabase() {
        database = TadDatabase.getInstance(this)
    }

    private fun initRetrofit() {
        // TadApiClient is an object singleton — no explicit init needed;
        // apiService is lazily created on first access via the Retrofit builder.
        // The lazy delegates above (tadApiClient, apiService) will resolve
        // automatically when any code first calls apiService.
    }

    private fun initSupabase() {
        supabaseClient = createSupabaseClient(
            supabaseUrl = BuildConfig.SUPABASE_URL,
            supabaseKey = BuildConfig.SUPABASE_ANON_KEY
        ) {
            install(GoTrue)
            install(Postgrest)
            install(Realtime)
        }
    }

    private fun registerNetworkObserver() {
        // Seed initial state
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

    // ── Static accessor ─────────────────────────────────────────────────────

    companion object {
        @Volatile
        private lateinit var instance: TadApplication

        fun getInstance(): TadApplication = instance
    }
}
