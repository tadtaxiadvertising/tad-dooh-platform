package com.tad.dooh.driver.data.remote

/**
 * Singleton holding global app-state flags consumed by UI, interceptors, and workers.
 *
 * Written by [KillSwitchInterceptor] on HTTP 402, read by the UI layer
 * to enforce the subscription kill-switch flow (force-logout → onboarding → re-subscribe).
 */
object GlobalState {

    /** Set to `true` when the backend returns HTTP 402 (Payment Required).
     *  Stays true until the driver completes the re-subscription flow. */
    var isKillSwitchActive: Boolean = false

    /** Current driver ID, seeded from login response and persisted by AuthDao. */
    var driverId: String? = null

    /** Current device ID, seeded from device registration and persisted by AuthDao. */
    var deviceId: String? = null

    /** Non-null when a forced logout is in progress.
     *  Values: `"KILL_SWITCH"` | `"TOKEN_EXPIRED"` | `"UNAUTHORIZED"` */
    var forceLogoutReason: String? = null

    /** Reset all state after a successful re-login. */
    fun clear() {
        isKillSwitchActive = false
        driverId = null
        deviceId = null
        forceLogoutReason = null
    }
}
