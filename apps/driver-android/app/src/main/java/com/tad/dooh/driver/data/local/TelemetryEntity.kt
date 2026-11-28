package com.tad.dooh.driver.data.local

import androidx.room.*
import kotlinx.coroutines.flow.Flow

// ─── Entity ──────────────────────────────────────────────────────────────────

/**
 * GPS telemetry coordinate buffered for bulk upload.
 *
 * Mirrors the expo-sqlite `tad_telemetry` table that replaced the PWA's
 * IndexedDB `TADTelemetryDB.telemetry` object store.
 *
 * - status = "batch"  → in-flight coords awaiting server ACK
 * - status = "offline" → pending coords queued for next upload cycle
 */
@Entity(
    tableName = "tad_telemetry",
    indices = [Index(value = ["status"], name = "idx_telemetry_status")]
)
data class TelemetryEntity(
    @PrimaryKey
    val ts: Long,                                  // GPS capture timestamp (immutable)

    @ColumnInfo(name = "lat")
    val lat: Double,                               // latitude, NOT NULL

    @ColumnInfo(name = "lng")
    val lng: Double,                               // longitude, NOT NULL

    @ColumnInfo(name = "accuracy", defaultValue = "0")
    val accuracy: Double = 0.0,                    // GPS accuracy in meters

    @ColumnInfo(name = "status")
    val status: String,                            // "batch" or "offline"

    @ColumnInfo(name = "createdAt", defaultValue = "0")
    val createdAt: Long = System.currentTimeMillis() // row insert time
)

// ─── DAO ─────────────────────────────────────────────────────────────────────

@Dao
interface TelemetryDao {

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(coords: List<TelemetryEntity>)

    @Query("SELECT * FROM tad_telemetry WHERE status = :status ORDER BY ts ASC")
    suspend fun getByStatus(status: String): List<TelemetryEntity>

    @Query("SELECT * FROM tad_telemetry WHERE status = :status ORDER BY ts ASC")
    fun getByStatusFlow(status: String): Flow<List<TelemetryEntity>>

    @Query("DELETE FROM tad_telemetry WHERE status = :status")
    suspend fun deleteByStatus(status: String)

    /** Atomically move only the failed snapshot to the persistent offline queue. */
    @Query("UPDATE tad_telemetry SET status = 'offline' WHERE status = 'batch' AND ts IN (:tsList)")
    suspend fun markBatchOffline(tsList: List<Long>)

    /** Remove only a server-acknowledged batch snapshot, not concurrent GPS fixes. */
    @Query("DELETE FROM tad_telemetry WHERE status = 'batch' AND ts IN (:tsList)")
    suspend fun deleteAcknowledgedBatch(tsList: List<Long>)

    @Query("SELECT COUNT(*) FROM tad_telemetry WHERE status = :status")
    suspend fun countByStatus(status: String): Int

    /** Counts for both statuses in a single call — mirrors getTelemetryCounts() */
    @Query("""
        SELECT 'batch' AS label, COUNT(*) AS cnt FROM tad_telemetry WHERE status = 'batch'
        UNION ALL
        SELECT 'offline' AS label, COUNT(*) AS cnt FROM tad_telemetry WHERE status = 'offline'
    """)
    suspend fun telemetryCounts(): List<TelemetryCountRow>

    @Query("DELETE FROM tad_telemetry WHERE status = 'offline'")
    suspend fun deleteAllOffline()

    /** Legacy maintenance query. Never use to truncate unacknowledged GPS. */
    @Query("""
        DELETE FROM tad_telemetry WHERE status = 'offline' AND ts IN (
            SELECT ts FROM tad_telemetry WHERE status = 'offline' ORDER BY ts ASC LIMIT :excess
        )
    """)
    suspend fun evictOldestOffline(excess: Int)

    /**
     * Delete specific telemetry records by their primary keys (ts values).
     *
     * Used by drip-sync to delete each successfully synced chunk
     * incrementally, matching the PWA's per-chunk IndexedDB deletion
     * pattern.  This prevents data loss if the sync is interrupted
     * mid-queue — earlier chunks are already cleaned up.
     */
    @Query("DELETE FROM tad_telemetry WHERE status = 'offline' AND ts IN (:tsList)")
    suspend fun deleteByTsList(tsList: List<Long>)

    @Query("DELETE FROM tad_telemetry")
    suspend fun deleteAll()
}

// ─── Helper data class for the UNION query ───────────────────────────────────

data class TelemetryCountRow(
    val label: String,
    val cnt: Int
)
