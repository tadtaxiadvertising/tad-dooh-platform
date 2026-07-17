plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
    id("org.jetbrains.kotlin.plugin.serialization")
    id("com.google.devtools.ksp")
    id("com.google.dagger.hilt.android")
}

android {
    namespace = "com.tad.dooh.driver"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.tad.dooh.driver"
        minSdk = 24          // Android 7.0 — covers 99% of Dominican taxi tablets
        targetSdk = 35
        versionCode = 1
        versionName = "1.0.0"

        ksp {
            arg("room.schemaLocation", "$projectDir/schemas")
        }
    }

    buildTypes {
        debug {
            buildConfigField("String", "API_BASE_URL", "\"http://10.0.2.2:3000/api/v1\"")
            buildConfigField("String", "SUPABASE_URL", "\"https://tad.supabase.co\"")
            buildConfigField("String", "SUPABASE_ANON_KEY", "\"\"")
            isMinifyEnabled = false
        }
        release {
            buildConfigField("String", "API_BASE_URL", "\"https://api.tad.dooh.com/api/v1\"")
            buildConfigField("String", "SUPABASE_URL", "\"https://tad.supabase.co\"")
            buildConfigField("String", "SUPABASE_ANON_KEY", "\"\"")
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    buildFeatures {
        compose = true
        buildConfig = true
    }
}

dependencies {
    // ─── Jetpack Compose ──────────────────────────────────────────────
    val composeBom = platform("androidx.compose:compose-bom:2025.01.01")
    implementation(composeBom)
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.foundation:foundation")
    implementation("androidx.compose.animation:animation")
    implementation("androidx.compose.runtime:runtime")
    implementation("androidx.activity:activity-compose:1.9.3")
    implementation("androidx.navigation:navigation-compose:2.8.5")
    implementation("androidx.lifecycle:lifecycle-runtime-compose:2.8.7")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.8.7")

    debugImplementation("androidx.compose.ui:ui-tooling")

    // ─── Room SQLite ──────────────────────────────────────────────────
    implementation("androidx.room:room-runtime:2.6.1")
    implementation("androidx.room:room-ktx:2.6.1")
    ksp("androidx.room:room-compiler:2.6.1")

    // ─── Retrofit + OkHttp ────────────────────────────────────────────
    implementation("com.squareup.retrofit2:retrofit:2.11.0")
    implementation("com.squareup.retrofit2:converter-kotlinx-serialization:2.11.0")
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
    implementation("com.squareup.okhttp3:logging-interceptor:4.12.0")
    implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.7.3")

    // ─── Google Play Services (FusedLocation) ────────────────────────
    implementation("com.google.android.gms:play-services-location:21.3.0")

    // ─── Supabase ─────────────────────────────────────────────────────
    implementation("io.github.jan-tennert.supabase:realtime-kt:2.6.1")
    implementation("io.github.jan-tennert.supabase:postgrest-kt:2.6.1")
    implementation("io.github.jan-tennert.supabase:auth-kt:2.6.1")
    implementation("io.ktor:ktor-client-okhttp:3.0.3")

    // ─── Android Core ────────────────────────────────────────────────
    implementation("androidx.core:core-ktx:1.15.0")
    implementation("androidx.work:work-runtime-ktx:2.10.0")
    implementation("androidx.datastore:datastore-preferences:1.1.1")
    implementation("androidx.core:core-splashscreen:1.0.1")

    // ─── Utility ─────────────────────────────────────────────────────────
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.9.0")
    implementation("androidx.security:security-crypto:1.1.0-alpha06")

    // ─── Dagger-Hilt (Dependency Injection) ───────────────────────────────
    implementation("com.google.dagger:hilt-android:2.52")
    ksp("com.google.dagger:hilt-compiler:2.52")
    // Hilt ViewModel integration with Compose (hiltViewModel() in @Composable)
    implementation("androidx.hilt:hilt-navigation-compose:1.2.0")
    // Hilt + WorkManager (@HiltWorker @AssistedInject via HiltWorkerFactory)
    implementation("androidx.hilt:hilt-work:1.2.0")
    ksp("androidx.hilt:hilt-compiler:1.2.0")   // generates HiltWorkerFactory binding
}
