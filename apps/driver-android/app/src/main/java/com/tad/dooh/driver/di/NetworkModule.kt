package com.tad.dooh.driver.di

import android.content.Context
import com.tad.dooh.driver.BuildConfig
import com.tad.dooh.driver.data.local.AuthDao
import com.tad.dooh.driver.data.remote.KillSwitchInterceptor
import com.tad.dooh.driver.data.remote.NetworkMonitorInterceptor
import com.tad.dooh.driver.data.remote.TadApiClient
import com.tad.dooh.driver.data.remote.TadApiService
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import kotlinx.serialization.json.Json
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.kotlinx.serialization.asConverterFactory
import okhttp3.MediaType.Companion.toMediaType
import javax.inject.Singleton

/**
 * Hilt network module.
 *
 * Strategy (approved by Arquitecto, option C2→b): the existing [TadApiClient]
 * singleton `object` is kept as the source of truth — it already configures the
 * full OkHttp interceptor chain (NetworkMonitor → KillSwitch → Logging) and the
 * Retrofit builder. This module merely **exposes** its lazily-built instances to
 * the Hilt graph so any `@Inject` consumer gets the same single instances.
 *
 * No call-site changes are required: code that still uses `TadApiClient.apiService`
 * directly continues to work; new Hilt-injected code receives the same instance.
 */
@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {

    /**
     * The shared kotlinx.serialization [Json] instance.
     * Provided from [TadApiClient.json] so the converter and any manual
     * serializer use the same lenient configuration.
     */
    @Provides
    @Singleton
    fun provideJson(): Json = TadApiClient.json

    /**
     * The configured [OkHttpClient] with the full interceptor chain.
     * Exposed for advanced use (e.g. WebSocket); most code should use
     * [provideTadApiService] instead.
     */
    @Provides
    @Singleton
    fun provideOkHttpClient(): OkHttpClient = TadApiClient.httpClient

    /**
     * The single [TadApiService] used by the entire app.
     * Backed by [TadApiClient.apiService] (lazy Retrofit.create).
     */
    @Provides
    @Singleton
    fun provideTadApiService(): TadApiService = TadApiClient.apiService

    /**
     * Injected instance of [KillSwitchInterceptor].
     *
     * The interceptor's [TadApiService] argument MUST be the **bare** service
     * (built without the kill-switch interceptor chain) to avoid
     * Retrofit → Interceptor → Retrofit recursion on the 401 re-login path.
     * We source it directly from [TadApiClient.bareApiService].
     */
    @Provides
    @Singleton
    fun provideKillSwitchInterceptor(
        authDao: AuthDao
    ): KillSwitchInterceptor = KillSwitchInterceptor(authDao, TadApiClient.bareApiService)

    /**
     * Injected instance of [NetworkMonitorInterceptor].
     * Only depends on [Context].
     */
    @Provides
    @Singleton
    fun provideNetworkMonitorInterceptor(
        @ApplicationContext context: Context
    ): NetworkMonitorInterceptor = NetworkMonitorInterceptor(context)
}
