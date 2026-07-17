package com.tad.dooh.driver.di

import android.content.Context
import androidx.room.Room
import com.tad.dooh.driver.data.local.AuthDao
import com.tad.dooh.driver.data.local.HubCacheDao
import com.tad.dooh.driver.data.local.NotificationDao
import com.tad.dooh.driver.data.local.OfflineQueueDao
import com.tad.dooh.driver.data.local.TadDatabase
import com.tad.dooh.driver.data.local.TelemetryDao
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

/**
 * Hilt module exposing the Room [TadDatabase] and its 5 DAOs as application-scoped
 * singletons. Replaces the previous `TadApplication.database lateinit var`
 * service-locator pattern.
 *
 * The DB keeps the name `tad_driver_native.db` and WAL pragmas are applied via
 * [TadDatabase.WalPragmaCallback] (already wired inside [TadDatabase.buildDatabase]).
 */
@Module
@InstallIn(SingletonComponent::class)
object DatabaseModule {

    @Provides
    @Singleton
    fun provideTadDatabase(@ApplicationContext context: Context): TadDatabase {
        // Delegates to the existing thread-safe getInstance() so the WAL callback
        // and fallback migration policy stay co-located with the database class.
        return TadDatabase.getInstance(context)
    }

    @Provides
    fun provideTelemetryDao(db: TadDatabase): TelemetryDao = db.telemetryDao()

    @Provides
    fun provideOfflineQueueDao(db: TadDatabase): OfflineQueueDao = db.offlineQueueDao()

    @Provides
    fun provideNotificationDao(db: TadDatabase): NotificationDao = db.notificationDao()

    @Provides
    fun provideHubCacheDao(db: TadDatabase): HubCacheDao = db.hubCacheDao()

    @Provides
    fun provideAuthDao(db: TadDatabase): AuthDao = db.authDao()
}
