package com.tad.dooh.driver.data.local

import android.content.Context
import androidx.room.*
import androidx.sqlite.db.SupportSQLiteDatabase
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

// ─── Type Converters ─────────────────────────────────────────────────────────
// Room natively handles Long, Double, Int, String — no converters needed for
// the current schema.  This class is a placeholder for future non-primitive
// types (e.g. enums, Date, List<String>).

class TadConverters {
    // Reserved for future type conversions
}

// ─── Database ────────────────────────────────────────────────────────────────

/**
 * Room database consolidating all offline-first persistence for the TAD Driver
 * Android app.
 *
 * Replaces the expo-sqlite `tad_driver_native.db` (which itself replaced 3
 * separate PWA IndexedDB databases).  WAL mode is set via callback to match
 * the expo-sqlite PRAGMA sequence:
 *   PRAGMA journal_mode = WAL;
 *   PRAGMA synchronous = NORMAL;
 *   PRAGMA cache_size = -2000;
 *
 * Database version starts at 1 and must be incremented for any future schema
 * migrations.
 */
@Database(
    entities = [
        TelemetryEntity::class,
        OfflineQueueEntity::class,
        NotificationEntity::class,
        HubCacheEntity::class,
        AuthEntity::class
    ],
    version = 1,
    exportSchema = true
)
@TypeConverters(TadConverters::class)
abstract class TadDatabase : RoomDatabase() {

    abstract fun telemetryDao(): TelemetryDao
    abstract fun offlineQueueDao(): OfflineQueueDao
    abstract fun notificationDao(): NotificationDao
    abstract fun hubCacheDao(): HubCacheDao
    abstract fun authDao(): AuthDao

    companion object {
        @Volatile
        private var INSTANCE: TadDatabase? = null

        fun getInstance(context: Context): TadDatabase {
            return INSTANCE ?: synchronized(this) {
                INSTANCE ?: buildDatabase(context).also { INSTANCE = it }
            }
        }

        private fun buildDatabase(context: Context): TadDatabase {
            return Room.databaseBuilder(
                context.applicationContext,
                TadDatabase::class.java,
                "tad_driver_native.db"
            )
                .addCallback(WalPragmaCallback())
                .fallbackToDestructiveMigrationFrom(1) // safe during initial dev
                .build()
        }

        /**
         * Callback that executes WAL-mode pragmas on every database open,
         * matching the expo-sqlite init sequence for concurrent background reads.
         */
        private class WalPragmaCallback : Callback() {
            override fun onOpen(db: SupportSQLiteDatabase) {
                super.onOpen(db)
                db.execSQL("PRAGMA journal_mode = WAL")
                db.execSQL("PRAGMA synchronous = NORMAL")
                db.execSQL("PRAGMA cache_size = -2000")
            }
        }
    }
}
