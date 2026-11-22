package com.tad.dooh.driver.data.remote

import kotlinx.serialization.Serializable
import retrofit2.http.*

// ─── Request DTOs ────────────────────────────────────────────────────────────

@Serializable
data class LoginRequest(
    val phone: String,
    val password: String
)

@Serializable
data class RegisterDriverRequest(
    val name: String,
    val phone: String,
    val cedula: String,
    val plate: String,
    val password: String,
    val contractAccepted: Boolean = false
)

@Serializable
data class AcceptAgreementRequest(
    val agreementVersion: String
)

@Serializable
data class BankAccountRequest(
    val bankName: String,
    val accountNumber: String,
    val accountType: String,
    val ownerName: String,
    val cedula: String
)

@Serializable
data class ChangePasswordRequest(
    val currentPassword: String,
    val newPassword: String
)

// ─── Response DTOs ───────────────────────────────────────────────────────────

/** Login response — mirrors backend `access_token` + driver profile shape. */
@Serializable
data class LoginResponse(
    val access_token: String,
    val driverId: String,
    val name: String,
    val role: String = "DRIVER",
    val entityId: String,
    val deviceId: String? = null,
    val subscriptionPaid: Boolean = false,
    val contractAccepted: Boolean = false,
    val agreementVersion: String? = null,
    val onboardingStatus: String = "UNKNOWN",
    val bankAccountConfigured: Boolean = false
)

/** Registration response — backend returns the full driver object + generatedPassword. */
@Serializable
data class RegisterDriverResponse(
    val id: String,
    val fullName: String,
    val phone: String,
    val cedula: String? = null,
    val licensePlate: String? = null,
    val taxiPlate: String? = null,
    val status: String = "PENDIENTE_PAGO",
    val subscriptionPaid: Boolean = false,
    val contractAccepted: Boolean = false,
    val agreementVersion: String? = null,
    val onboardingStatus: String = "PENDING_AGREEMENT",
    val generatedPassword: String? = null
)

/** Accept-agreement confirmation — minimal response. */
@Serializable
data class AcceptAgreementResponse(
    val contractAccepted: Boolean = true,
    val agreementVersion: String? = null
)

/** Unified transaction item — backend merges PayrollPayment + Subscription. */
@Serializable
data class TransactionDto(
    val id: String,
    val type: String,              // "EARNING" | "SUBSCRIPTION" | "SUBSCRIPTION_PENDING"
    val amount: Double = 0.0,
    val date: String,              // ISO-8601
    val desc: String = "",
    val status: String = "PENDING",

    // Earning-specific fields (null for SUBSCRIPTION type)
    val penaltyApplied: Boolean? = null,
    val penaltyPercentage: Double? = null,
    val transmissionHours: Double? = null,
    val activeAds: Double? = null,
    val gpsPoints: Double? = null,

    // Subscription-specific fields (null for EARNING type)
    val validUntil: String? = null
)

/** Bank-account update confirmation. */
@Serializable
data class BankAccountResponse(
    val bankAccountConfigured: Boolean = true
)

/** Password-change confirmation. */
@Serializable
data class ChangePasswordResponse(
    val success: Boolean = true
)

/**
 * Server receipt: { count, input }. count=0 is a valid idempotent replay.
 * Missing or malformed acknowledgements must never erase queued GPS.
 */
@Serializable
data class TrackBatchResponse(
    val count: Int? = null,
    val input: Int? = null
) {
    fun acknowledges(expectedInput: Int): Boolean {
        val persisted = count ?: return false
        return expectedInput > 0 &&
            input == expectedInput &&
            persisted in 0..expectedInput
    }
}

// ─── Retrofit interface ──────────────────────────────────────────────────────

/**
 * Retrofit service interface for all TAD NestJS backend endpoints.
 *
 * Base URL is configured in [TadApiClient] and already includes the
 * `/api/v1` prefix from BuildConfig, so endpoint paths are relative
 * to that base.
 *
 * All methods are `suspend` to integrate with Kotlin coroutines.
 * Uses kotlinx.serialization for JSON via the Retrofit converter.
 */
interface TadApiService {

    // ── Auth ──────────────────────────────────────────────────────────────

    @POST("drivers/login")
    suspend fun login(@Body request: LoginRequest): LoginResponse

    @POST("drivers")
    suspend fun registerDriver(@Body request: RegisterDriverRequest): RegisterDriverResponse

    // ── Hub ───────────────────────────────────────────────────────────────

    @GET("drivers/me/hub")
    suspend fun getHub(): DriverHubData

    // ── Agreement ─────────────────────────────────────────────────────────

    @POST("drivers/{id}/accept-agreement")
    suspend fun acceptAgreement(
        @Path("id") driverId: String,
        @Body request: AcceptAgreementRequest
    ): AcceptAgreementResponse

    // ── Wallet ────────────────────────────────────────────────────────────

    @PUT("wallet/bank")
    suspend fun updateBankAccount(@Body request: BankAccountRequest): BankAccountResponse

    @GET("drivers/me/transactions")
    suspend fun getTransactions(): List<TransactionDto>

    // ── Telemetry ─────────────────────────────────────────────────────────

    @POST("fleet/track-batch")
    suspend fun trackBatch(@Body request: TrackBatchRequest): TrackBatchResponse

    // ── Password ──────────────────────────────────────────────────────────

    @POST("drivers/me/password")
    suspend fun changePassword(@Body request: ChangePasswordRequest): ChangePasswordResponse
}
