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

/**
 * Singleton that creates and configures the Retrofit instance for the
 * TAD NestJS backend.
 *
 * Wire-up:
 * 1. Builds an [OkHttpClient] with the full interceptor chain:
 *    - [NetworkMonitorInterceptor] — pre-flight connectivity check + network-type header
 *    - [KillSwitchInterceptor] — auth headers, 402 kill-switch, 401 refresh
 *    - [HttpLoggingInterceptor] — debug-only request/response logging
 * 2. Creates a [Retrofit] instance with kotlinx-serialization JSON converter.
 * 3. Exposes [apiService] as the primary entry point for all API calls.
 *
 * The base URL is sourced from [BuildConfig.API_BASE_URL] which is already
 * differentiated between debug (emulator localhost) and release (production).
 *
 * Usage (from TadApplication.initRetrofit):
 * ```
 *     val apiService = TadApiClient.instance.apiService
 * ```
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

    private val killSwitchInterceptor: KillSwitchInterceptor by lazy {
        val supabaseClient = try {
            TadApplication.getInstance().supabaseClient
        } catch (_: UninitializedPropertyAccessException) {
            Log.w(TAG, "Supabase client not yet initialized — kill-switch will skip refresh")
            null
        }
        KillSwitchInterceptor(authDao, supabaseClient)
    }

    private val okHttpClient: OkHttpClient by lazy {
        OkHttpClient.Builder()
            // Interceptor order matters: network monitor first (pre-flight),
            // then auth/kill-switch, then logging (outermost = sees final request).
            .addInterceptor(networkMonitorInterceptor)
            .addInterceptor(killSwitchInterceptor)
            .addInterceptor(loggingInterceptor)
            // Timeout configuration for taxi-tablet network conditions
            .connectTimeout(30, java.util.concurrent.TimeUnit.SECONDS)
            .readTimeout(60, java.util.concurrent.TimeUnit.SECONDS)     // hub endpoint can be slow
            .writeTimeout(30, java.util.concurrent.TimeUnit.SECONDS)     // telemetry batch uploads
            .callTimeout(90, java.util.concurrent.TimeUnit.SECONDS)      // overall call budget
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
     * The single [TadApiService] instance used by the entire app.
     *
     * Prefer accessing this directly rather than calling [create] with
     * a custom service class.
     */
    val apiService: TadApiService by lazy {
        retrofit.create(TadApiService::class.java)
    }

    /**
     * Create a Retrofit service for a custom interface (e.g. for future
     * endpoints not yet in [TadApiService]).
     */
    fun <T> create(serviceClass: Class<T>): T {
        return retrofit.create(serviceClass)
    }

    // ── Helpers ─────────────────────────────────────────────────────────────

    /**
     * Retrofit requires the base URL to end with `/`.  BuildConfig values
     * may not, so we enforce it here.
     */
    private fun ensureTrailingSlash(url: String): String {
        return if (url.endsWith("/")) url else "$url/"
    }

    /**
     * Expose the underlying OkHttp client for advanced use (e.g. WebSocket,
     * custom request builders).  Most code should prefer [apiService].
     */
    val httpClient: OkHttpClient by lazy { okHttpClient }
}
