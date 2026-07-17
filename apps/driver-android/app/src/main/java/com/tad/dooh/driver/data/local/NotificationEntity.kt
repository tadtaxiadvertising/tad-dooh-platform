package com.tad.dooh.driver.data.local

import androidx.room.*
import kotlinx.coroutines.flow.Flow

// ─── Entity ──────────────────────────────────────────────────────────────────

/**
 * Notification record persisted for driver awareness and audit trail.
 *
 * Mirrors the expo-sqlite `tad_notifications` table that replaced the PWA's
 * IndexedDB `TADDriverNotifications.notifications` object store.
 *
 * Priority levels: CRITICAL → immediate alert, OPERATIONAL → task-related,
 * INFO → general awareness.  acknowledged uses 0/1 as SQLite boolean.
 */
@Entity(
    tableName = "tad_notifications",
    indices = [Index(value = ["receivedAt"], name = "idx_notifications_received")]
)
data class NotificationEntity(
    @PrimaryKey
    val id: String,                                // UUID

    @ColumnInfo(name = "type")
    val type: String,                              // NotificationType enum name

    @ColumnInfo(name = "priority", defaultValue = "INFO")
    val priority: String = "INFO",                 // CRITICAL | OPERATIONAL | INFO

    @ColumnInfo(name = "title")
    val title: String,

    @ColumnInfo(name = "description", defaultValue = "")
    val description: String = "",

    @ColumnInfo(name = "payloadJson", defaultValue = "{}")
    val payloadJson: String = "{}",                // JSON-structured payload

    @ColumnInfo(name = "receivedAt")
    val receivedAt: Long,

    @ColumnInfo(name = "dismissedAt", defaultValue = "0")
    val dismissedAt: Long = 0,

    @ColumnInfo(name = "acknowledged", defaultValue = "0")
    val acknowledged: Int = 0                      // 0 = false, 1 = true
)

// ─── DAO ─────────────────────────────────────────────────────────────────────

@Dao
interface NotificationDao {

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(notification: NotificationEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(notifications: List<NotificationEntity>)

    @Query("SELECT * FROM tad_notifications ORDER BY receivedAt DESC")
    suspend fun getAll(): List<NotificationEntity>

    @Query("SELECT * FROM tad_notifications ORDER BY receivedAt DESC LIMIT :limit")
    suspend fun getAll(limit: Int): List<NotificationEntity>

    @Query("SELECT * FROM tad_notifications ORDER BY receivedAt DESC")
    fun getAllFlow(): Flow<List<NotificationEntity>>

    @Query("DELETE FROM tad_notifications WHERE id = :id")
    suspend fun deleteById(id: String)

    @Query("UPDATE tad_notifications SET acknowledged = 1 WHERE id = :id")
    suspend fun updateAcknowledged(id: String)

    @Query("UPDATE tad_notifications SET dismissedAt = :dismissedAt WHERE id = :id")
    suspend fun updateDismissedAt(id: String, dismissedAt: Long)

    /**
     * Prune notifications older than [cutoffMillis] epoch-ms.
     * Mirrors expo-sqlite pruneNotificationHistory().
     */
    @Query("DELETE FROM tad_notifications WHERE receivedAt < :cutoffMillis")
    suspend fun deleteOlderThan(cutoffMillis: Long)

    /**
     * Keep only the most recent [maxKeep] notifications, delete the rest.
     * Mirrors expo-sqlite pruneNotificationHistory(maxKeep).
     */
    @Query("""
        DELETE FROM tad_notifications WHERE receivedAt NOT IN (
            SELECT receivedAt FROM tad_notifications ORDER BY receivedAt DESC LIMIT :maxKeep
        )
    """)
    suspend fun pruneToMax(maxKeep: Int)

    @Query("DELETE FROM tad_notifications")
    suspend fun deleteAll()
}
