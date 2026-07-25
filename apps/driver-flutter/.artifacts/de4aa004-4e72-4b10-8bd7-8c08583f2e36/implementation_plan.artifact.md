# Fix Flutter Build Failure and Java Configuration

The previous changes to `AndroidManifest.xml` introduced a build failure because `io.flutter.app.FlutterApplication` is part of the deprecated Android v1 embedding. Additionally, the project's `JAVA_HOME` is pointing to an invalid directory, causing Gradle sync and resource resolution issues in the IDE.

## Proposed Changes

### Android Configuration

#### [MODIFY] [AndroidManifest.xml](file:///C:/Users/Arismendy/OneDrive/Escritorio/TAD PLASTFORM/tad-dooh-platform/apps/driver-flutter/android/app/src/main/AndroidManifest.xml)
- Revert `android:name` to `${applicationName}` to allow the Flutter tool to inject the correct v2 application class.
- Revert `MainActivity` name to `.MainActivity` (with `package` attribute present, this is correctly resolved).

#### [MODIFY] [gradle.properties](file:///C:/Users/Arismendy/OneDrive/Escritorio/TAD PLASTFORM/tad-dooh-platform/apps/driver-flutter/android/gradle.properties)
- Add `org.gradle.java.home=C:\\Program Files\\Android\\Android Studio\\jbr` to ensure Gradle uses a valid JDK, fixing the "Cannot resolve symbol" errors in the IDE.

## Verification Plan

### Automated Tests
- Run `flutter build apk --debug` to verify the "v1 embedding" error is resolved.
- Check IDE problems for resource resolution.
