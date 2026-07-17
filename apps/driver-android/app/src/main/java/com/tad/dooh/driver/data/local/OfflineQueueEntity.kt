package com.tad.dooh.driver.data.local

import androidx.room.*
import kotlinx.coroutines.flow.Flow

// ─── Entity ──────────────────────────────────────────────────────────────────

/**
 * Offline action queue item for deferred API calls.
 *
 * Mirrors the expo-sqlite `tad_offline_queue` table that replaced the PWA's
 * IndexedDB `TadDriverDB.offline_queue` object store.
 *
 * Each item stores a serialized JSON payload plus an idempotency key so the
 * server can safely deduplicate retries after network recovery.
 */
@Entity(
    tableName = "tad_offline_queue",
    indices = [Index(value = ["timestamp"], name = "idx_offline_queue_timestamp")]
)
data class OfflineQueueEntity(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,

    @ColumnInfo(name = "endpoint")
    val endpoint: String,                          // API endpoint path

    @ColumnInfo(name = "method", defaultValue = "POST")
    val method: String = "POST",                   // HTTP method

    @ColumnInfo(name = "payload")
    val payload: String,                           // JSON-serialized request body

    @ColumnInfo(name = "idempotencyKey")
    val idempotencyKey: String,                    // dedup key for safe retries

    @ColumnInfo(name = "timestamp")
    val timestamp: Long,                           // insertion epoch millis

    @ColumnInfo(name = "createdAt", defaultValue = "0")
    val createdAt: Long = System.currentTimeMillis()
)

// ─── DAO ─────────────────────────────────────────────────────────────────────

@Dao
interface OfflineQueueDao {

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(item: OfflineQueueEntity): Long

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(items: List<OfflineQueueEntity>): List<Long>

    @Query("SELECT * FROM tad_offline_queue ORDER BY timestamp ASC")
    suspend fun getAll(): List<OfflineQueueEntity>

    @Query("SELECT * FROM tad_offline_queue ORDER BY timestamp ASC")
    fun getAllFlow(): Flow<List<OfflineQueueEntity>>

    @Query("DELETE FROM tad_offline_queue WHERE id = :id")
    suspend fun deleteById(id: Long)

    @Query("SELECT COUNT(*) FROM tad_offline_queue")
    suspend fun count(): Int

    @Query("SELECT COUNT(*) FROM tad_offline_queue")
    fun countFlow(): Flow<Int>

    @Query("DELETE FROM tad_offline_queue")
    suspend fun deleteAll()
}
