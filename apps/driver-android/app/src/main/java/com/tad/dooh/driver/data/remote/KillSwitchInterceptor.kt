package com.tad.dooh.driver.data.remote

import android.util.Log
import com.tad.dooh.driver.BuildConfig
import com.tad.dooh.driver.data.local.AuthDao
import com.tad.dooh.driver.data.local.AuthEntity
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.gotrue.GoTrue
import kotlinx.coroutines.runBlocking
import okhttp3.Interceptor
import okhttp3.Response

// ─── Auth key constants ──────────────────────────────────────────────────────

/** Room key for the JWT access token. */
const val AUTH_KEY_TOKEN = "tad_driver_token"

/** Room key for the registered device ID. */
const val AUTH_KEY_DEVICE_ID = "TAD_DEVICE_ID"

// ─── Interceptor ─────────────────────────────────────────────────────────────

/**
 * OkHttp interceptor that handles authentication headers and kill-switch logic.
 *
 * Responsibilities:
 * 1. Injects `Authorization: Bearer <token>` from [AuthDao] into every request.
 * 2. Injects `x-device-id` header from [AuthDao].
 * 3. On **HTTP 402** (Payment Required): activates the subscription kill-switch
 *    — sets [GlobalState.isKillSwitchActive], clears auth, triggers force-logout.
 * 4. On **HTTP 401** (Unauthorized): clears the stale token and attempts a
 *    Supabase GoTrue refresh; if refresh fails, triggers force-logout.
 *
 * DAO reads use `runBlocking` because OkHttp interceptors run on the
 * OkHttp dispatcher thread pool, not on a coroutine scope.  This is safe
 * because Room KV reads are single-row lookups that complete in microseconds
 * under WAL mode.
 */
class KillSwitchInterceptor(
    private val authDao: AuthDao,
    private val supabaseClient: SupabaseClient? = null
) : Interceptor {

    companion object {
        private const val TAG = "KillSwitchInterceptor"
    }

    override fun intercept(chain: Interceptor.Chain): Response {
        val originalRequest = chain.request()

        // ── 1. Read token & device-id from Room ────────────────────────────
        val token: String? = runBlocking { authDao.read(AUTH_KEY_TOKEN) }
        val deviceId: String? = runBlocking { authDao.read(AUTH_KEY_DEVICE_ID) }

        // ── 2. Build authenticated request ──────────────────────────────────
        val authenticatedRequest = originalRequest.newBuilder().apply {
            if (token != null) {
                addHeader("Authorization", "Bearer $token")
            }
            if (deviceId != null) {
                addHeader("x-device-id", deviceId)
            }
        }.build()

        // ── 3. Execute request ──────────────────────────────────────────────
        val response: Response = chain.proceed(authenticatedRequest)

        // ── 4. Handle kill-switch (HTTP 402) ────────────────────────────────
        if (response.code == 402) {
            Log.w(TAG, "HTTP 402 — subscription kill-switch activated")

            GlobalState.isKillSwitchActive = true
            GlobalState.forceLogoutReason = "KILL_SWITCH"

            runBlocking {
                authDao.delete(AUTH_KEY_TOKEN)
                authDao.delete(AUTH_KEY_DEVICE_ID)
            }

            GlobalState.driverId = null
            GlobalState.deviceId = null

            response.close()
            return response
        }

        // ── 5. Handle unauthorized (HTTP 401) ──────────────────────────────
        if (response.code == 401) {
            Log.w(TAG, "HTTP 401 — token expired or invalid, attempting refresh")

            // Try Supabase GoTrue token refresh
            val refreshed = attemptTokenRefresh()

            if (refreshed) {
                Log.i(TAG, "Token refresh succeeded — retrying original request")
                response.close()

                // Re-read the new token after refresh
                val newToken: String? = runBlocking { authDao.read(AUTH_KEY_TOKEN) }
                val retryRequest = originalRequest.newBuilder().apply {
                    if (newToken != null) {
                        header("Authorization", "Bearer $newToken")
                    }
                }.build()

                return chain.proceed(retryRequest)
            } else {
                Log.w(TAG, "Token refresh failed — clearing auth, forcing logout")
                GlobalState.forceLogoutReason = "TOKEN_EXPIRED"

                runBlocking {
                    authDao.delete(AUTH_KEY_TOKEN)
                }

                GlobalState.driverId = null

                response.close()
                return response
            }
        }

        // ── 6. Success — sync GlobalState with current auth ─────────────────
        if (response.isSuccessful && token != null) {
            GlobalState.deviceId = deviceId
        }

        return response
    }

    /**
     * Attempt Supabase GoTrue session refresh.
     *
     * If successful, the new access token is persisted to [AuthDao] so
     * the retry request picks it up.  Returns `true` on success, `false`
     * on any failure (no Supabase client, expired session, network error).
     */
    private fun attemptTokenRefresh(): Boolean {
        if (supabaseClient == null) {
            Log.w(TAG, "No Supabase client available — skipping token refresh")
            return false
        }

        return try {
            runBlocking {
                supabaseClient.gotrue.refreshSession()

                val newAccessToken = supabaseClient.gotrue.currentAccessTokenOrNull()
                if (newAccessToken != null) {
                    authDao.save(AuthEntity(key = AUTH_KEY_TOKEN, value = newAccessToken))
                    Log.i(TAG, "New token persisted after Supabase refresh")
                    true
                } else {
                    Log.w(TAG, "Supabase refresh returned null access token")
                    false
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Supabase token refresh failed: ${e.message}", e)
            false
        }
    }
}
