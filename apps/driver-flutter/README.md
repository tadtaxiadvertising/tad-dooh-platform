# TAD Driver — Flutter

Réplica en Flutter de la app Kotlin nativa de conductor (`apps/driver-android`). Mismo sistema visual "Stitched UI" con paleta TAD exacta.

## Pantallas replicadas

| Kotlin (origen) | Flutter (esta app) | Estado |
| :--- | :--- | :--- |
| `LoginScreen.kt` | `lib/screens/login_screen.dart` | ✅ |
| `DashboardScreen.kt` | `lib/screens/dashboard_screen.dart` | ✅ |
| `OnboardingScreen.kt` | `lib/screens/onboarding_screen.dart` | ✅ |
| `BankWizardScreen.kt` | `lib/screens/bank_wizard_screen.dart` | ✅ |
| `WalletScreen.kt` | `lib/screens/wallet_screen.dart` | ✅ |
| `KillSwitchOverlay.kt` | Omitido | ⏭️ |

## Paleta de marca

`lib/theme/tad_theme.dart` — hex exactos de `apps/driver-android/.../theme/Color.kt`:
- Acento: `#FFD400` (TAD Yellow)
- Background: `#0C0F14` (TAD Dark)
- Surfaces: `#161B22` / `#1C2128`
- Texto: `#F0F6FC` primario, `#8B949E` secundario
- Bordes: `#30363D`

## Cómo visualizarla ahora mismo (sin Android Studio)

Build web ya generado en `build/web/`. Servidor local levantado en http://127.0.0.1:8080.

```bash
cd apps/driver-flutter
C:\dev\flutter\bin\flutter build web --release
cd build/web && python -m http.server 8080
# abre http://127.0.0.1:8080 en Chrome
```

## Para ejecutar en Android Studio (pendiente de instalación)

1. Instalar Android Studio: https://developer.android.com/studio
2. En el primer arranque: instalar Android SDK + SDK Platform 34 + Build Tools
3. Agregar `C:\dev\flutter\bin` al PATH de Windows (Variables de entorno → Path → Nuevo)
4. Crear un emulador Pixel 7 (API 34) desde Device Manager de Android Studio
5. Abrir la carpeta `apps/driver-flutter/android` en Android Studio (// como proyecto Gradle)
6.Desde terminal: `flutter run` o `flutter run -d chrome` (web), `flutter run -d <device-id>` (emulador)

## Estructura

```
apps/driver-flutter/
├── lib/
│   ├── main.dart                    # TadDriverApp, MaterialApp + rutas
│   ├── theme/
│   │   └── tad_theme.dart           # Paleta + ThemeData + stitchedCard()
│   ├── models/
│   │   └── hub_data.dart            # DriverHubData, OnboardingStage
│   └── screens/
│       ├── login_screen.dart        # Login (teléfono + contraseña)
│       ├── dashboard_screen.dart    # Home/Routes/Wallet/Settings con 4 tabs
│       ├── onboarding_screen.dart   # Checklist + Contract/Bank/Payment/Ready
│       ├── bank_wizard_screen.dart  # 5-step wizard (banco→cuenta→tipo→titular→cédula)
│       └── wallet_screen.dart       # Balance + retiro + transacciones
├── android/                         # Proyecto Gradle nativo (generado por `flutter create`)
├── web/                             # PWA shell (generado)
├── test/
│   └── widget_test.dart             # Smoke test: Login render
└── pubspec.yaml                     # Dependencias: flutter, google_fonts
```

## Notas

- `flutter analyze` pasa limpio: 0 errores, 0 warnings (10 info de `const` style).
- `flutter build web --release` pasa exitosamente (`Built build/web`).
- Datos mockedos (sucede el fetch del backend TAD en runtime). Sin dependencia con NestJS API para visualizar.
- Botón "REGÍSTRATE" y pestañas "Rutas" tienen acciones placeholder intencionalmente.
