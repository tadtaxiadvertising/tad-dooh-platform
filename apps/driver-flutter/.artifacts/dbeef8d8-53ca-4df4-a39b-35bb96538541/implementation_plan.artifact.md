# Plan to Fix Project Errors and Warnings

The project has several errors and warnings reported by Android Studio, primarily related to Android resource validation, Gradle configuration, and Dart linting.

## User Review Required

> [!IMPORTANT]
> Some Android errors are "IDE-side" issues caused by the static analyzer not correctly resolving Flutter-injected properties (like `${applicationName}` and `flutter.minSdkVersion`). I will apply changes to make these properties more explicit or standard to satisfy the IDE's validation.

## Proposed Changes

### Android Configuration

#### [MODIFY] [AndroidManifest.xml](file:///C:/Users/Arismendy/OneDrive/Escritorio/TAD PLASTFORM/tad-dooh-platform/apps/driver-flutter/android/app/src/main/AndroidManifest.xml)
- Replace `android:name="${applicationName}"` with `android:name="io.flutter.app.FlutterApplication"` to resolve the "Unresolved class" error.
- Remove `package="com.example.tad_driver"` from the `<manifest>` tag (redundant with `build.gradle` namespace).

#### [MODIFY] [build.gradle](file:///C:/Users/Arismendy/OneDrive/Escritorio/TAD PLASTFORM/tad-dooh-platform/apps/driver-flutter/android/app/build.gradle)
- Hardcode `minSdk` and `targetSdk` (or set them to reasonable defaults like 21 and 34) if the IDE continues to report warnings about `minSdk=1`. This helps the IDE resolve Android attributes correctly.

#### [MODIFY] [gradle.properties](file:///C:/Users/Arismendy/OneDrive/Escritorio/TAD PLASTFORM/tad-dooh-platform/apps/driver-flutter/android/gradle.properties)
- Remove `org.gradle.java.home` to prevent "General" Gradle failures caused by hardcoded JBR paths that might not match the environment.

#### [MODIFY] [styles.xml](file:///C:/Users/Arismendy/OneDrive/Escritorio/TAD PLASTFORM/tad-dooh-platform/apps/driver-flutter/android/app/src/main/res/values/styles.xml) and [styles.xml](file:///C:/Users/Arismendy/OneDrive/Escritorio/TAD PLASTFORM/tad-dooh-platform/apps/driver-flutter/android/app/src/main/res/values-night/styles.xml)
- Ensure the parent themes and attributes are correctly referenced. The IDE errors here are usually side-effects of the `minSdk` issue.

### Dart Code (Linting)

#### [MODIFY] [login_screen_v2.dart](file:///C:/Users/Arismendy/OneDrive/Escritorio/TAD PLASTFORM/tad-dooh-platform/apps/driver-flutter/lib/features/auth/login_screen_v2.dart)
- Remove unnecessary `package:flutter/services.dart` import.

#### [MODIFY] [main.dart](file:///C:/Users/Arismendy/OneDrive/Escritorio/TAD PLASTFORM/tad-dooh-platform/apps/driver-flutter/lib/main.dart)
- Address `anonKey` deprecation by using `publishableKey` if applicable, or just acknowledge it.
- Add `const` to widgets to resolve `prefer_const_constructors` warnings.

## Verification Plan

### Automated Tests
- Run `flutter analyze` to ensure Dart errors/warnings are reduced.
- Run `analyze_file` on `AndroidManifest.xml` and `styles.xml` to verify the "Unresolved class" and "Cannot resolve symbol" errors are gone.

### Manual Verification
- The user should check the "Problems" view in Android Studio to confirm the error count has decreased.
