package com.tad.dooh.driver.data.remote

import android.content.Context
import android.util.Log
import com.tad.dooh.driver.BuildConfig
import com.tad.dooh.driver.TadApplication
import com.tad.dooh.driver.data.local.AuthDao
import kotlinx.serialization.json.Json
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.kotlinx.serialization.asConverterFactory
import okhttp3.MediaType.Companion.toMediaType
import java.util.concurrent.TimeUnit

/**
 * Singleton that creates and configures the Retrofit instances for the
 * TAD NestJS backend.
 *
 * Wire-up (after Hilt migration):
 * 1. Builds two [OkHttpClient]s:
 *    - **fullClient** — NetworkMonitor → KillSwitch → Logging. Used by
 *      [apiService] for all authenticated requests.
 *    - **bareClient** — NetworkMonitor → Logging only (no KillSwitch, no auth
 *      headers). Used by [bareApiService], which the [KillSwitchInterceptor]
 *      itself calls for silent re-login on 401. This breaks the circular
 *      dependency Retrofit → Interceptor → Retrofit.
 * 2. Creates two [Retrofit] instances (full + bare).
 * 3. Exposes [apiService] (with kill-switch) and [bareApiService] (without).
 *
 * The base URL is sourced from [BuildConfig.API_BASE_URL] which is already
 * differentiated between debug (emulator localhost) and release (production).
 *
 * The Hilt [com.tad.dooh.driver.di.NetworkModule] exposes these singletons to
 * the DI graph; existing direct callers (`TadApiClient.apiService`) keep working.
 */
object TadApiClient {

    private const val TAG = "TadApiClient"

    /** JSON configuration matching the backend's lenient serialization. */
    val json: Json = Json {
        ignoreUnknownKeys = true          // backend returns extra fields we don't need
        coerceInputValues = true          // null → default for non-null fields
        isLenient = true                  // allow non-standard JSON (unquoted keys, etc.)
        encodeDefaults = true             // include default values in serialized output
        prettyPrint = false               // compact JSON for network efficiency
    }

    private val contentType = "application/json".toMediaType()

    // ── Lazy singletons (initialized on first access) ───────────────────────

    private val loggingInterceptor: HttpLoggingInterceptor by lazy {
        HttpLoggingInterceptor { message ->
            Log.d("OkHttp", message)
        }.apply {
            level = if (BuildConfig.DEBUG) {
                HttpLoggingInterceptor.Level.BODY
            } else {
                HttpLoggingInterceptor.Level.NONE    // no logging in release builds
            }
        }
    }

    private val authDao: AuthDao by lazy {
        TadApplication.getInstance().database.authDao()
    }

    private val networkMonitorInterceptor: NetworkMonitorInterceptor by lazy {
        NetworkMonitorInterceptor(TadApplication.getInstance())
    }

    /**
     * Kill-switch interceptor — depends on [bareApiService] (defined below)
     * to avoid interceptor ←→ Retrofit recursion on the 401 re-login path.
     */
    private val killSwitchInterceptor: KillSwitchInterceptor by lazy {
        KillSwitchInterceptor(authDao, bareApiService)
    }

    // ── Bare client & service (no KillSwitch, no auth headers) ──────────────
    // Used ONLY by the KillSwitchInterceptor for silent re-login. Binding this
    // to the full client would recurse: client → interceptor → client → ...

    private val bareOkHttpClient: OkHttpClient by lazy {
        OkHttpClient.Builder()
            .addInterceptor(networkMonitorInterceptor)
            .addInterceptor(loggingInterceptor)
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(60, TimeUnit.SECONDS)
            .writeTimeout(30, TimeUnit.SECONDS)
            .callTimeout(90, TimeUnit.SECONDS)
            .build()
    }

    private val bareRetrofit: Retrofit by lazy {
        Retrofit.Builder()
            .baseUrl(ensureTrailingSlash(BuildConfig.API_BASE_URL))
            .client(bareOkHttpClient)
            .addConverterFactory(json.asConverterFactory(contentType))
            .build()
    }

    /** Retrofit service WITHOUT the kill-switch/auth interceptor chain.
     *  Used internally by [killSwitchInterceptor] for re-login on 401. */
    val bareApiService: TadApiService by lazy {
        bareRetrofit.create(TadApiService::class.java)
    }

    // ── Full client & service (with KillSwitch + auth) ─────────────────────

    private val okHttpClient: OkHttpClient by lazy {
        OkHttpClient.Builder()
            // Interceptor order matters: network monitor first (pre-flight),
            // then auth/kill-switch, then logging (outermost = sees final request).
            .addInterceptor(networkMonitorInterceptor)
            .addInterceptor(killSwitchInterceptor)
            .addInterceptor(loggingInterceptor)
            // Timeout configuration for taxi-tablet network conditions
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(60, TimeUnit.SECONDS)     // hub endpoint can be slow
            .writeTimeout(30, TimeUnit.SECONDS)     // telemetry batch uploads
            .callTimeout(90, TimeUnit.SECONDS)      // overall call budget
            .build()
    }

    /**
     * Retrofit instance — base URL sourced from BuildConfig with trailing `/`
     * enforcement (Retrofit requirement).
     */
    private val retrofit: Retrofit by lazy {
        val baseUrl = ensureTrailingSlash(BuildConfig.API_BASE_URL)

        Retrofit.Builder()
            .baseUrl(baseUrl)
            .client(okHttpClient)
            .addConverterFactory(json.asConverterFactory(contentType))
            .build()
    }

    // ── Public API ──────────────────────────────────────────────────────────

    /**
     * The single [TadApiService] instance used by the entire app (with kill-switch).
     *
     * Prefer accessing this via Hilt injection (provided by [NetworkModule])
     * rather than the singleton directly.
     */
    val apiService: TadApiService by lazy {
        retrofit.create(TadApiService::class.java)
    }

    /** Create a Retrofit service for a custom interface (advanced use). */
    fun <T> create(serviceClass: Class<T>): T {
        return retrofit.create(serviceClass)
    }

    // ── Helpers ─────────────────────────────────────────────────────────────

    /** Retrofit requires the base URL to end with `/`. */
    private fun ensureTrailingSlash(url: String): String {
        return if (url.endsWith("/")) url else "$url/"
    }

    /** Expose the underlying OkHttp client for advanced use. */
    val httpClient: OkHttpClient by lazy { okHttpClient }
}
