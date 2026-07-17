package com.tad.dooh.driver.data.local

import androidx.room.*
import kotlinx.coroutines.flow.Flow

// ─── Entity ──────────────────────────────────────────────────────────────────

/**
 * Key-value auth storage replacing localStorage/cookies from the PWA.
 *
 * Mirrors the expo-sqlite `tad_auth` table.
 * Common keys: "tad_driver_token", "tad_driver_user", "TAD_DEVICE_ID".
 */
@Entity(
    tableName = "tad_auth"
)
data class AuthEntity(
    @PrimaryKey
    val key: String,                               // auth key identifier

    @ColumnInfo(name = "value")
    val value: String                              // serialized value (token, JSON, etc.)
)

// ─── DAO ─────────────────────────────────────────────────────────────────────

@Dao
interface AuthDao {

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun save(auth: AuthEntity)

    @Query("SELECT value FROM tad_auth WHERE key = :key")
    suspend fun read(key: String): String?

    @Query("SELECT * FROM tad_auth WHERE key = :key")
    suspend fun readEntity(key: String): AuthEntity?

    @Query("SELECT value FROM tad_auth WHERE key = :key")
    fun readFlow(key: String): Flow<String?>

    @Query("DELETE FROM tad_auth WHERE key = :key")
    suspend fun delete(key: String)

    @Query("DELETE FROM tad_auth")
    suspend fun deleteAll()
}
