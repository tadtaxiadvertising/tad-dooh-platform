package com.tad.dooh.driver.data.local

import androidx.room.*
import kotlinx.coroutines.flow.Flow

// ─── Entity ──────────────────────────────────────────────────────────────────

/**
 * Single-row cache for the DriverHubData payload (dashboard state).
 *
 * Mirrors the expo-sqlite `tad_hub_cache` table.
 * The key is always "TAD_DRIVER_HUB_CACHE" but Room allows multiple
 * keyed rows for future extensibility.
 */
@Entity(
    tableName = "tad_hub_cache"
)
data class HubCacheEntity(
    @PrimaryKey
    val key: String,                               // cache key, e.g. "TAD_DRIVER_HUB_CACHE"

    @ColumnInfo(name = "data")
    val data: String,                              // JSON-serialized DriverHubData

    @ColumnInfo(name = "updatedAt")
    val updatedAt: Long                            // last refresh epoch-ms
)

// ─── DAO ─────────────────────────────────────────────────────────────────────

@Dao
interface HubCacheDao {

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun save(cache: HubCacheEntity)

    @Query("SELECT * FROM tad_hub_cache WHERE key = :key")
    suspend fun read(key: String): HubCacheEntity?

    @Query("SELECT * FROM tad_hub_cache WHERE key = :key")
    fun readFlow(key: String): Flow<HubCacheEntity?>

    @Query("DELETE FROM tad_hub_cache WHERE key = :key")
    suspend fun delete(key: String)

    @Query("DELETE FROM tad_hub_cache")
    suspend fun deleteAll()
}
