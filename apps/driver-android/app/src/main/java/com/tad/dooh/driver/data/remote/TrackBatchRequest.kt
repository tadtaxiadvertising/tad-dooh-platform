package com.tad.dooh.driver.data.remote

import kotlinx.serialization.Serializable

/**
 * Telemetry batch upload request — mirrors the PWA `/fleet/track-batch` payload.
 *
 * The driver app accumulates GPS points in Room (TelemetryEntity), then batches
 * them into a single POST request via WorkManager or foreground-service sync.
 */
@Serializable
data class TrackBatchRequest(
    val driverId: String,
    val deviceId: String,
    val points: List<TelemetryPoint>
)

/**
 * Single telemetry datum within a batch.
 *
 * Matches the backend's `TelemetryLog` Prisma model fields consumed by
 * the `/fleet/track-batch` endpoint.
 */
@Serializable
data class TelemetryPoint(
    val lat: Double,
    val lng: Double,
    val speed: Double = 0.0,
    val timestamp: Long            // epoch millis — same as TelemetryEntity.ts
)
