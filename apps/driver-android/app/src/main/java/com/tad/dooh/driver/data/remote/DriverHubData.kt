package com.tad.dooh.driver.data.remote

import kotlinx.serialization.KSerializer
import kotlinx.serialization.Serializable
import kotlinx.serialization.descriptors.PrimitiveKind
import kotlinx.serialization.descriptors.PrimitiveSerialDescriptor
import kotlinx.serialization.descriptors.SerialDescriptor
import kotlinx.serialization.encoding.Decoder
import kotlinx.serialization.encoding.Encoder

// ─── Constants ───────────────────────────────────────────────────────────────

/** Maximum ad slots a driver can occupy simultaneously (business rule). */
const val MAX_DRIVER_SLOTS = 15

// ─── Custom serializers for lenient coercion ─────────────────────────────────

/**
 * Serializer that coerces String → Double, falling back to [fallback] on
 * parse failure or null input.  Mirrors the PWA `toNumber()` helper.
 */
class FlexibleDoubleSerializer(private val fallback: Double = 0.0) : KSerializer<Double> {
    override val descriptor: SerialDescriptor =
        PrimitiveSerialDescriptor("FlexibleDouble", PrimitiveKind.STRING)

    override fun serialize(encoder: Encoder, value: Double) {
        encoder.encodeDouble(value)
    }

    override fun deserialize(decoder: Decoder): Double {
        return try {
            decoder.decodeDouble()
        } catch (_: Exception) {
            // String values like "500" arrive as STRING primitives;
            // fall through to String-decode then parse.
            try {
                decoder.decodeString().toDouble()
            } catch (_: Exception) {
                fallback
            }
        }
    }
}

/**
 * Serializer that coerces any input → Boolean (truthy string "true"/"1" → true,
 * everything else → false).  Mirrors the PWA `Boolean(raw?.field)` coercion.
 */
object FlexibleBooleanSerializer : KSerializer<Boolean> {
    override val descriptor: SerialDescriptor =
        PrimitiveSerialDescriptor("FlexibleBoolean", PrimitiveKind.STRING)

    override fun serialize(encoder: Encoder, value: Boolean) {
        encoder.encodeBoolean(value)
    }

    override fun deserialize(decoder: Decoder): Boolean {
        return try {
            decoder.decodeBoolean()
        } catch (_: Exception) {
            try {
                decoder.decodeString().lowercase() in listOf("true", "1")
            } catch (_: Exception) {
                false
            }
        }
    }
}

// ─── Data class ──────────────────────────────────────────────────────────────

/**
 * Canonical driver hub response — the single source of truth for the dashboard.
 *
 * 15 meaningful fields + [maxSlots] hardcoded constant, identical to the PWA
 * `DriverHubData` interface.  The backend returns more fields; [normalizeHubData]
 * strips them down and coerces types to safe defaults.
 */
@Serializable
data class DriverHubData(
    @Serializable(with = FlexibleDoubleSerializer::class)
    val balance: Double = 0.0,

    @Serializable(with = FlexibleDoubleSerializer::class)
    val projectedEarnings: Double = 0.0,

    @Serializable(with = FlexibleDoubleSerializer::class)
    val activeAds: Double = 0.0,

    @Serializable(with = FlexibleDoubleSerializer::class)
    val activeSlots: Double = 0.0,

    val maxSlots: Int = MAX_DRIVER_SLOTS,

    @Serializable(with = FlexibleBooleanSerializer::class)
    val subscriptionPaid: Boolean = false,

    val subscriptionStatus: String = "UNKNOWN",

    val deviceId: String? = null,

    @Serializable(with = FlexibleDoubleSerializer::class)
    val gpsPoints: Double = 0.0,

    @Serializable(with = FlexibleDoubleSerializer::class)
    val adsPlayed: Double = 0.0,

    @Serializable(with = FlexibleBooleanSerializer::class)
    val contractAccepted: Boolean = false,

    val agreementVersion: String? = null,

    val onboardingStatus: String = "UNKNOWN",

    @Serializable(with = FlexibleBooleanSerializer::class)
    val bankAccountConfigured: Boolean = false,

    val driverId: String = "",
    val driverName: String = "Conductor"
)

// ─── Normalization ───────────────────────────────────────────────────────────

/**
 * Robust number coercion matching the PWA `toNumber()` helper:
 * - `number` values that are finite → kept
 * - `string` values → parsed via `String.toDouble()`
 * - Everything else → [fallback]
 */
private fun toNumber(value: Any?, fallback: Double = 0.0): Double {
    if (value is Number && value.toDouble().isFinite()) return value.toDouble()
    if (value is String) {
        val parsed = value.toDoubleOrNull()
        if (parsed != null && parsed.isFinite()) return parsed
    }
    return fallback
}

/**
 * Normalizes the raw backend hub response into a safe [DriverHubData].
 *
 * Mirrors the PWA `normalizeHubData()` logic exactly:
 * - Numbers coerced via [toNumber] (handles String → Number gracefully)
 * - Booleans coerced via Kotlin `Boolean()` semantics
 * - `activeSlots` derived from `activeAds`, clamped to [MAX_DRIVER_SLOTS]
 * - Nullable strings preserved (deviceId, agreementVersion)
 * - `maxSlots` always hardcoded to 15
 *
 * Call this after deserializing the raw JSON to ensure runtime safety
 * even if the backend sends unexpected types (e.g. String "500" for balance).
 */
fun normalizeHubData(raw: Map<String, Any?>): DriverHubData {
    val activeAds = toNumber(raw["activeAds"], 0.0)

    return DriverHubData(
        driverId          = (raw["driverId"] as? String ?: "").ifEmpty { "" },
        driverName        = (raw["driverName"] as? String ?: "Conductor").ifEmpty { "Conductor" },
        balance           = toNumber(raw["balance"], 0.0),
        projectedEarnings = toNumber(raw["projectedEarnings"], 0.0),
        activeAds         = activeAds,
        activeSlots       = activeAds.coerceIn(0.0, MAX_DRIVER_SLOTS.toDouble()),
        maxSlots          = MAX_DRIVER_SLOTS,
        subscriptionPaid  = raw["subscriptionPaid"] as? Boolean ?: false,
        subscriptionStatus = (raw["subscriptionStatus"] as? String ?: "UNKNOWN").ifEmpty { "UNKNOWN" },
        deviceId          = (raw["deviceId"] as? String)?.ifEmpty { null },
        gpsPoints         = toNumber(raw["gpsPoints"], 0.0),
        adsPlayed         = toNumber(raw["adsPlayed"], 0.0),
        contractAccepted  = raw["contractAccepted"] as? Boolean ?: false,
        agreementVersion  = (raw["agreementVersion"] as? String)?.ifEmpty { null },
        onboardingStatus  = (raw["onboardingStatus"] as? String ?: "UNKNOWN").ifEmpty { "UNKNOWN" },
        bankAccountConfigured = raw["bankAccountConfigured"] as? Boolean ?: false
    )
}
