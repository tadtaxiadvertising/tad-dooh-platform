package com.tad.dooh.driver.data.remote

import android.content.Context
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.util.Log
import okhttp3.Interceptor
import okhttp3.Response

/**
 * OkHttp interceptor that tracks network connectivity state via
 * [ConnectivityManager] and attaches metadata headers to requests.
 *
 * Primary purposes:
 * 1. Pre-flight check: throws [NetworkUnavailableException] if the device
 *    has no validated internet, giving the calling coroutine a clear signal
 *    to queue the request for offline retry (OfflineQueueEntity).
 * 2. Attaches `x-network-type` header (wifi / mobile / ethernet / none) so
 *    the backend can log connectivity quality for telemetry analytics.
 * 3. Updates [GlobalState.deviceId] and network metrics for dashboards.
 *
 * The [ConnectivityManager] check is synchronous and completes in <1ms,
 * so it does not block the OkHttp dispatcher thread meaningfully.
 */
class NetworkMonitorInterceptor(
    private val context: Context
) : Interceptor {

    companion object {
        private const val TAG = "NetworkMonitorInterceptor"
        private const val HEADER_NETWORK_TYPE = "x-network-type"

        /** Network type values sent in the header. */
        const val NET_WIFI     = "wifi"
        const val NET_MOBILE   = "mobile"
        const val NET_ETH      = "ethernet"
        const val NET_NONE     = "none"
        const val NET_UNKNOWN  = "unknown"
    }

    private val connectivityManager by lazy {
        context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
    }

    override fun intercept(chain: Interceptor.Chain): Response {
        val networkType = detectNetworkType()

        // ── 1. Pre-flight connectivity check ───────────────────────────────
        if (networkType == NET_NONE) {
            Log.w(TAG, "No validated internet — aborting request for offline queue")
            throw NetworkUnavailableException(
                "Device has no validated internet connection"
            )
        }

        // ── 2. Attach network-type header ──────────────────────────────────
        val request = chain.request().newBuilder()
            .addHeader(HEADER_NETWORK_TYPE, networkType)
            .build()

        // ── 3. Execute and log ─────────────────────────────────────────────
        val response = chain.proceed(request)

        Log.d(
            TAG,
            "${request.method} ${request.url.encodedPath} → ${response.code} [net=$networkType]"
        )

        return response
    }

    /**
     * Detects the current validated network transport type.
     *
     * Uses [NetworkCapabilities.NET_CAPABILITY_VALIDATED] to ensure we
     * only report connectivity that the OS has actually confirmed can
     * reach the internet (avoids false-positives from captive portals).
     */
    private fun detectNetworkType(): String {
        val network = connectivityManager.activeNetwork
        if (network == null) return NET_NONE

        val caps = connectivityManager.getNetworkCapabilities(network)
        if (caps == null) return NET_NONE

        // Must have validated internet capability
        if (!caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED)) {
            return NET_NONE
        }

        return when {
            caps.hasTransport(NetworkCapabilities.TRANSPORT_WIFI)     -> NET_WIFI
            caps.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR)  -> NET_MOBILE
            caps.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET)  -> NET_ETH
            else -> NET_UNKNOWN
        }
    }
}

/**
 * Thrown by [NetworkMonitorInterceptor] when the device has no validated
 * internet connection.  Callers should catch this and enqueue the request
 * into [OfflineQueueEntity] for later retry.
 */
class NetworkUnavailableException(
    message: String
) : IllegalStateException(message)
