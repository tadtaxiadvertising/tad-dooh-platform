package com.tad.dooh.driver.di

import dagger.Module
import dagger.hilt.InstallIn
import dagger.hilt.android.components.WorkerComponent

/**
 * Hilt worker module.
 *
 * With `androidx.hilt:hilt-work` 1.2.0 on the classpath and KSP processing
 * `androidx.hilt:hilt-compiler`, a class annotated with `@HiltWorker` using
 * `@AssistedInject` constructor is automatically picked up by the generated
 * `HiltWorkerFactory`. No explicit `@Binds` is required for the workers
 * themselves — the processor emits the binding into `WorkerComponent`.
 *
 * This module is intentionally empty: it exists solely to document the
 * Worker-DI wiring and to be a future extension point for custom worker
 * qualifiers (e.g. a `@IoDispatcher` qualifier for coroutine workers that
 * need an explicit dispatcher override).
 *
 * The [com.tad.dooh.driver.worker.TelemetrySyncWorker] is transformed from a
 * plain `CoroutineWorker` to `@HiltWorker @AssistedInject constructor(...)`
 * in its own file; see that file for the dependency list.
 *
 * The `HiltWorkerFactory` is installed by overriding `Configuration.Provider`
 * in [com.tad.dooh.driver.TadApplication] (see `workManagerConfiguration`).
 */
@Module
@InstallIn(WorkerComponent::class)
object WorkerModule
