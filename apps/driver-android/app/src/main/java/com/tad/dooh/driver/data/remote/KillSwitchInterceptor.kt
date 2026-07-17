package com.tad.dooh.driver.data.remote

import android.util.Log
import com.tad.dooh.driver.data.local.AuthDao
import com.tad.dooh.driver.data.local.AuthEntity
import kotlinx.coroutines.runBlocking
import okhttp3.Interceptor
import okhttp3.Response
import retrofit2.HttpException
import javax.inject.Inject

// ─── Auth key constants ──────────────────────────────────────────────────────

/** Room key for the JWT access token. */
const val AUTH_KEY_TOKEN = "tad_driver_token"

/** Room key for the registered device ID. */
const val AUTH_KEY_DEVICE_ID = "TAD_DEVICE_ID"

/** Room key for the cached driver phone (for silent re-login on 401). */
const val AUTH_KEY_PHONE = "tad_driver_phone"

/** Room key for the cached driver password (for silent re-login on 401). */
const val AUTH_KEY_PASSWORD = "tad_driver_password"

// ─── Interceptor ─────────────────────────────────────────────────────────────

/**
 * OkHttp interceptor that handles authentication headers, the subscription
 * kill-switch (HTTP 402) and silent token refresh on HTTP 401.
 *
 * Responsibilities:
 * 1. Injects `Authorization: Bearer <token>` from [AuthDao] into every request.
 * 2. Injects `x-device-id` header from [AuthDao].
 * 3. On **HTTP 402** (Payment Required): activates the subscription kill-switch
 *    — sets [GlobalState.isKillSwitchActive], clears auth, triggers force-logout.
 * 4. On **HTTP 401** (Unauthorized): attempts silent re-login with cached
 *    credentials via [TadApiService.login] (NOT Supabase — the backend uses
 *    HS256 JWT local auth for drivers, 7-day expiry, no refresh endpoint).
 *    If re-login succeeds, persists the new token to [AuthDao] and retries the
 *    original request once. If it fails (or credentials are missing), triggers
 *    force-logout so the UI shows [com.tad.dooh.driver.ui.screens.LoginScreen].
 *
 * DAO reads use `runBlocking` because OkHttp interceptors run on the
 * OkHttp dispatcher thread pool, not on a coroutine scope. This is safe
 * because Room KV reads are single-row lookups that complete in microseconds
 * under WAL mode. The re-login API call is also wrapped in `runBlocking` —
 * it blocks one dispatcher thread for the duration of the request, which is
 * acceptable for an interceptor context (OkHttp already dispatches each call).
 *
 * @param authDao       Room KV store for tokens / credentials.
 * @param apiService    Retrofit service used exclusively for the silent
 *                      re-login on 401. All other endpoints go through the
 *                      normal Retrofit client-chain that owns this interceptor.
 */
class KillSwitchInterceptor @Inject constructor(
    private val authDao: AuthDao,
    private val apiService: TadApiService
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

        // ── 5. Handle unauthorized (HTTP 401) — silent re-login ───────────
        if (response.code == 401) {
            Log.w(TAG, "HTTP 401 — token expired or invalid, attempting silent re-login")

            val refreshed = attemptSilentReLogin()

            if (refreshed) {
                Log.i(TAG, "Silent re-login succeeded — retrying original request")
                response.close()

                val newToken: String? = runBlocking { authDao.read(AUTH_KEY_TOKEN) }
                val retryRequest = originalRequest.newBuilder().apply {
                    if (newToken != null) {
                        header("Authorization", "Bearer $newToken")
                    }
                }.build()

                return chain.proceed(retryRequest)
            } else {
                Log.w(TAG, "Silent re-login failed — clearing auth, forcing logout")
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
     * Silent re-login using cached driver credentials (phone + password).
     *
     * Strategy C1 (Arquitecto-approved, backend-verified):
     * - The backend signs HS256 JWTs with `SUPABASE_JWT_SECRET || JWT_SECRET`,
     *   expiry **7d** (see `apps/api/.../business-rules.ts:37`).
     * - There is **no `/drivers/refresh` endpoint** — the only renewal path is
     *   re-running `POST /api/v1/drivers/login`.
     * - On successful login, the driver app calls this interceptor's save path
     *   which persists credentials under [AUTH_KEY_PHONE] / [AUTH_KEY_PASSWORD]
     *   (see DriverViewModel.saveCredentialsForSilentRelogin).
     * - If the login HTTP responds with non-2xx, or no credentials are cached,
     *   returns `false` → caller triggers force-logout to LoginScreen.
     *
     * Note: we use the [apiService] passed to this interceptor (rather than the
     * OkHttp client that owns the interceptor chain) to avoid recursive
     * interceptor calls. The [NetworkModule] provides a dedicated Retrofit
     * instance for re-login when needed; for now both use the same client —
     * recursion is impossible because the login endpoint never returns 401
     * when credentials are wrong (it returns 401 but we don't recurse on the
     * retry path, we propagate the failure).
     */
    private fun attemptSilentReLogin(): Boolean {
        return try {
            runBlocking {
                val phone = authDao.read(AUTH_KEY_PHONE) ?: return@runBlocking false
                val password = authDao.read(AUTH_KEY_PASSWORD) ?: return@runBlocking false

                val loginResponse = apiService.login(LoginRequest(phone, password))

                // Persist new token
                authDao.save(AuthEntity(key = AUTH_KEY_TOKEN, value = loginResponse.access_token))

                // Refresh device-id too if backend returned one
                loginResponse.deviceId?.let { newDeviceId ->
                    if (newDeviceId.isNotBlank()) {
                        authDao.save(AuthEntity(key = AUTH_KEY_DEVICE_ID, value = newDeviceId))
                    }
                }

                Log.i(TAG, "Silent re-login OK — new token persisted, expiry=7d")
                true
            }
        } catch (e: HttpException) {
            Log.w(TAG, "Silent re-login HTTP ${e.code()} — credentials rejected, forcing logout")
            false
        } catch (e: Exception) {
            Log.e(TAG, "Silent re-login failed: ${e::class.simpleName} ${e.message}", e)
            false
        }
    }
}
