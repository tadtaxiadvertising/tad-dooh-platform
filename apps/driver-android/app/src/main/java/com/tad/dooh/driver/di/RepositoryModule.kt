package com.tad.dooh.driver.di

import android.content.Context
import com.tad.dooh.driver.data.local.AuthDao
import com.tad.dooh.driver.data.local.TelemetryDao
import com.tad.dooh.driver.data.remote.TadApiService
import com.tad.dooh.driver.service.TelemetryRepository
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

/**
 * Hilt repository module.
 *
 * [TelemetryRepository] coordinates telemetry state between Room, Retrofit, the
 * foreground service and WorkManager. It is the native equivalent of the PWA
 * `useBackgroundTelemetry` hook. Exposed as an application-scoped singleton so
 * both the ViewModel and the foreground service share a single state holder.
 *
 * The existing constructor already takes (context, telemetryDao, authDao,
 * apiService, app) — Hilt resolves all of them from the graph.
 */
@Module
@InstallIn(SingletonComponent::class)
object RepositoryModule {

    @Provides
    @Singleton
    fun provideTelemetryRepository(
        @ApplicationContext context: Context,
        telemetryDao: TelemetryDao,
        authDao: AuthDao,
        apiService: TadApiService
    ): TelemetryRepository {
        val app = context.applicationContext as? com.tad.dooh.driver.TadApplication
            ?: throw IllegalStateException("Context is not TadApplication")
        return TelemetryRepository(context, telemetryDao, authDao, apiService, app)
    }
}
