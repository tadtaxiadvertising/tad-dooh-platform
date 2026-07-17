# TAD Driver Android — ProGuard Rules

# Keep serialized data classes for Retrofit/kotlinx.serialization
-keepattributes *Annotation*, SerialName

# Keep all @Serializable classes and their fields
-keepclassmembers class * {
    @kotlinx.serialization.SerialName <fields>;
}

# Keep Retrofit service interfaces
-keep,allowobfuscation,allowshrinking interface com.tad.dooh.driver.data.remote.TadApiService

# Keep Room entities and DAOs
-keep class com.tad.dooh.driver.data.local.* { *; }

# Keep Supabase models
-keep class com.tad.dooh.driver.data.remote.DriverHubData { *; }
-keep class com.tad.dooh.driver.data.remote.TrackBatchRequest { *; }
-keep class com.tad.dooh.driver.data.remote.TelemetryPoint { *; }

# OkHttp
-dontwarn okhttp3.**
-dontwarn okio.**

# Kotlinx Serialization
-keepattributes *Annotation*
-keepclassmembers class kotlinx.serialization.json.** { *** COMMA; *** NAME; *** LBRACE; *** RBRACE; }
