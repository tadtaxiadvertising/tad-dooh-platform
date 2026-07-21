import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:url_launcher/url_launcher.dart';
import '../theme/tad_theme.dart';
import '../models/hub_data.dart';

// ─── API ──────────────────────────────────────────────────────────────────────

class LoginResult {
  final DriverHubData hub;
  final String accessToken;
  final String refreshToken;

  LoginResult({
    required this.hub,
    required this.accessToken,
    required this.refreshToken,
  });

  factory LoginResult.fromJson(Map<String, dynamic> json) {
    return LoginResult(
      hub: DriverHubData.fromJson(json['driver'] ?? json),
      accessToken: json['accessToken'] ?? json['access_token'] ?? '',
      refreshToken: json['refreshToken'] ?? json['refresh_token'] ?? '',
    );
  }
}

class ApiException implements Exception {
  final int statusCode;
  final String message;

  ApiException(this.statusCode, this.message);

  @override
  String toString() => 'ApiException($statusCode): $message';
}

/// POST /api/proxy/drivers/login
/// 200 → LoginResult
/// 401 → "Credenciales inválidas"
/// 402 → "Suscripción vencida" (KillSwitch)
/// 403 → "Cuenta suspendida"
/// 5xx → retry up to 2 times
Future<LoginResult> apiLogin(String phone, String password) async {
  const maxRetries = 2;
  String? lastError;

  for (var attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // TODO: replace with real Supabase / backend call:
      // final resp = await supabase.auth.signInWithPassword(
      //   phone: phone,
      //   password: password,
      // );
      await Future.delayed(const Duration(milliseconds: 600));

      // Mock 402 for testing KillSwitch
      if (phone.startsWith('402')) throw ApiException(402, 'Suscripción vencida');
      // Mock 403
      if (phone.startsWith('403')) throw ApiException(403, 'Cuenta suspendida');
      // Mock 401
      if (password.length < 6) throw ApiException(401, 'Credenciales inválidas');

      final mock = {
        'driver': {
          'driverId': 'drv_001',
          'driverName': 'Juan Pérez',
          'balance': 3200.0,
          'projectedEarnings': 8500.0,
          'activeAds': 8,
          'activeSlots': 4,
          'maxSlots': 15,
          'subscriptionPaid': true,
          'subscriptionStatus': 'ACTIVE',
          'deviceId': 'TAD-EMUL-01',
          'gpsPoints': 1240,
          'adsPlayed': 340,
          'contractAccepted': false,
          'agreementVersion': '1.0',
          'onboardingStatus': 'PENDING_PAYMENT',
          'bankAccountConfigured': false,
        },
        'accessToken': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mock',
        'refreshToken': 'refresh_mock_token',
      };

      return LoginResult.fromJson(mock);
    } on ApiException catch (e) {
      if (e.statusCode >= 500 && attempt < maxRetries) {
        lastError = e.message;
        await Future.delayed(Duration(milliseconds: 500 * (attempt + 1)));
        continue;
      }
      rethrow;
    } catch (_) {
      if (attempt < maxRetries) {
        await Future.delayed(Duration(milliseconds: 500 * (attempt + 1)));
        continue;
      }
      throw ApiException(0, 'Error de conexión');
    }
  }
  throw ApiException(0, lastError ?? 'Error desconocido');
}

// ─── Token persistence ───────────────────────────────────────────────────────

/// Saves auth after successful login.
/// Call this: persistLogin(result)
///
/// Flutter implementation uses SharedPreferences (cross-platform key-value).
/// Once shared_preferences is added to pubspec.yaml, uncomment the implementation.
/// Web additionally needs document.cookie handling via js_interop.
Future<void> persistLogin(LoginResult result) async {
  // Add to pubspec.yaml: shared_preferences: ^2.2.0
  // Then uncomment:
  // final prefs = await SharedPreferences.getInstance();
  // await prefs.setString('tad_driver_token', result.accessToken);
  // await prefs.setString('tad_driver_refresh_token', result.refreshToken);
  // await prefs.setString('tad_driver_user', jsonEncode(result.hub.toJson()));
  // await prefs.setString(
  //   'tad_driver_token_exp',
  //   DateTime.now().add(const Duration(days: 7)).toIso8601String(),
  // );
}

/// Clears all auth state — call on logout.
Future<void> clearLogin() async {
  // Add to pubspec.yaml: shared_preferences: ^2.2.0
  // Then uncomment:
  // final prefs = await SharedPreferences.getInstance();
  // await prefs.remove('tad_driver_token');
  // await prefs.remove('tad_driver_refresh_token');
  // await prefs.remove('tad_driver_user');
  // await prefs.remove('tad_driver_token_exp');
}

/// Restores cached DriverHubData for fast initial load (before API fetch).
DriverHubData? restoreCachedHub() {
  // Add to pubspec.yaml: shared_preferences: ^2.2.0
  // Then uncomment:
  // final prefs = await SharedPreferences.getInstance();
  // final raw = prefs.getString('tad_driver_user');
  // if (raw == null) return null;
  // return DriverHubData.fromJson(jsonDecode(raw));
  return null;
}

/// Sets onboarding force flag in sessionStorage.
/// Call when contractAccepted=false or bankAccountConfigured=false.
/// In Flutter, the dashboard checks hub flags directly; this persists the signal
/// for web (sessionStorage) environments.
void setOnboardingForceFlag() {
  // Flutter native: no-op (dashboard checks hub flags directly).
  // Web: sessionStorage.setItem('tad_driver_force_onboarding', '1');
}

// ─── Login Screen ─────────────────────────────────────────────────────────────

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  late final TextEditingController _phoneCtrl;
  late final TextEditingController _passwordCtrl;
  final FocusNode _passwordFocus = FocusNode();

  bool _loading = false;
  bool _obscurePassword = true;
  bool _capsLockOn = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _phoneCtrl = TextEditingController(text: '809-123-4567');
    _passwordCtrl = TextEditingController(text: 'tad123');
    _passwordFocus.addListener(_onPasswordFocusChange);
    HardwareKeyboard.instance.addHandler(_onKeyEvent);
  }

  @override
  void dispose() {
    _phoneCtrl.dispose();
    _passwordCtrl.dispose();
    _passwordFocus.removeListener(_onPasswordFocusChange);
    _passwordFocus.dispose();
    HardwareKeyboard.instance.removeHandler(_onKeyEvent);
    super.dispose();
  }

  void _onPasswordFocusChange() {
    // Re-check caps lock whenever password field gains focus
    if (_passwordFocus.hasFocus) _updateCapsLock();
  }

  bool _onKeyEvent(KeyEvent event) {
    if (event is KeyDownEvent &&
        event.logicalKey == LogicalKeyboardKey.capsLock) {
      setState(() => _capsLockOn = !_capsLockOn);
    }
    return false;
  }

  void _updateCapsLock() {
    // Caps Lock is active when the key is currently toggled.
    // Check via HardwareKeyboard logical keys pressed.
    final caps = HardwareKeyboard.instance.logicalKeysPressed.any(
      (key) => key == LogicalKeyboardKey.capsLock,
    );
    if (caps != _capsLockOn) setState(() => _capsLockOn = caps);
  }

  Future<void> _login() async {
    final phone = _phoneCtrl.text.trim();
    final password = _passwordCtrl.text;

    // ── Validation ──
    if (phone.isEmpty) {
      setState(() => _error = 'Ingresa tu número de teléfono');
      return;
    }
    if (password.isEmpty) {
      setState(() => _error = 'Ingresa tu contraseña');
      return;
    }
    if (password.length < 6) {
      setState(() => _error = 'La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final result = await apiLogin(phone, password);
      await persistLogin(result);

      // Set onboarding force flag if onboarding not complete
      final hub = result.hub;
      if (!hub.contractAccepted || !hub.bankAccountConfigured) {
        setOnboardingForceFlag();
      }

      if (mounted) {
        Navigator.pushReplacementNamed(
          context,
          '/dashboard',
          arguments: result.hub,
        );
      }
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = switch (e.statusCode) {
          401 => 'Credenciales inválidas',
          402 => 'Suscripción vencida — contacta a soporte',
          403 => 'Cuenta suspendida — contacta a soporte',
          _ => e.message.isNotEmpty ? e.message : 'Error de conexión',
        };
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = 'Error de conexión — intenta de nuevo';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: TadColors.tadDark,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                // Logo
                Text(
                  'TAD Driver',
                  style: TextStyle(
                    color: TadColors.tadYellow,
                    fontSize: 44,
                    fontWeight: FontWeight.w900,
                    letterSpacing: -1,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Inicia sesión en tu cuenta',
                  style: TextStyle(
                    color: TadColors.tadTextSecondary,
                    fontSize: 15,
                  ),
                ),
                const SizedBox(height: 36),

                // Card
                stitchedCard(
                  padding: const EdgeInsets.fromLTRB(20, 28, 20, 28),
                  child: Column(
                    children: [
                      // ── Phone ──
                      TextField(
                        controller: _phoneCtrl,
                        keyboardType: TextInputType.phone,
                        textInputAction: TextInputAction.next,
                        style: TextStyle(
                          color: TadColors.tadTextPrimary,
                          fontSize: 16,
                        ),
                        decoration: InputDecoration(
                          labelText: 'Teléfono',
                          hintText: '809-123-4567',
                          prefixIcon: Icon(
                            Icons.phone_android,
                            color: TadColors.tadWarning,
                            size: 20,
                          ),
                        ),
                      ),
                      const SizedBox(height: 16),

                      // ── Password + Eye toggle ──
                      TextField(
                        controller: _passwordCtrl,
                        focusNode: _passwordFocus,
                        obscureText: _obscurePassword,
                        textInputAction: TextInputAction.done,
                        onSubmitted: (_) => _login(),
                        style: TextStyle(
                          color: TadColors.tadTextPrimary,
                          fontSize: 16,
                        ),
                        decoration: InputDecoration(
                          labelText: 'Contraseña',
                          prefixIcon: Icon(
                            Icons.lock_outline,
                            color: TadColors.tadWarning,
                            size: 20,
                          ),
                          suffixIcon: IconButton(
                            icon: Icon(
                              _obscurePassword
                                  ? Icons.visibility_off
                                  : Icons.visibility,
                              color: TadColors.tadTextSecondary,
                              size: 20,
                            ),
                            onPressed: () =>
                                setState(() => _obscurePassword = !_obscurePassword),
                            tooltip: _obscurePassword
                                ? 'Mostrar contraseña'
                                : 'Ocultar contraseña',
                          ),
                          helperText: 'Mínimo 6 caracteres',
                          helperStyle: TextStyle(
                            color: TadColors.tadTextDisabled,
                            fontSize: 11,
                          ),
                        ),
                      ),

                      // ── Caps Lock warning ──
                      if (_capsLockOn) ...[
                        const SizedBox(height: 8),
                        Container(
                          width: double.infinity,
                          padding: const EdgeInsets.symmetric(
                              horizontal: 10, vertical: 6),
                          decoration: BoxDecoration(
                            color: TadColors.tadWarning.withValues(alpha: 0.12),
                            borderRadius: BorderRadius.circular(6),
                            border: Border.all(
                              color: TadColors.tadWarning.withValues(alpha: 0.35),
                            ),
                          ),
                          child: Row(
                            children: [
                              Icon(
                                Icons.warning_amber_rounded,
                                color: TadColors.tadWarning,
                                size: 16,
                              ),
                              const SizedBox(width: 6),
                              Text(
                                'Bloq Mayús activado',
                                style: TextStyle(
                                  color: TadColors.tadWarning,
                                  fontSize: 12,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],

                      // ── Error message ──
                      if (_error != null) ...[
                        const SizedBox(height: 14),
                        Container(
                          width: double.infinity,
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: TadColors.tadError.withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(
                              color: TadColors.tadError.withValues(alpha: 0.3),
                            ),
                          ),
                          child: Text(
                            _error!,
                            style: TextStyle(
                              color: TadColors.tadError,
                              fontSize: 13,
                            ),
                            textAlign: TextAlign.center,
                          ),
                        ),
                      ],

                      const SizedBox(height: 22),

                      // ── Submit ──
                      SizedBox(
                        width: double.infinity,
                        height: 52,
                        child: ElevatedButton(
                          onPressed: _loading ? null : _login,
                          child: _loading
                              ? SizedBox(
                                  width: 22,
                                  height: 22,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                    color: TadColors.black,
                                  ),
                                )
                              : Text(
                                  'INICIAR SESIÓN',
                                  style: TextStyle(
                                    fontWeight: FontWeight.w700,
                                    letterSpacing: 1.4,
                                  ),
                                ),
                        ),
                      ),
                      const SizedBox(height: 10),
                      TextButton(
                        onPressed: () {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: const Text('Registro coming soon — contacta a soporte'),
                              backgroundColor: TadColors.tadSurface,
                              behavior: SnackBarBehavior.floating,
                              action: SnackBarAction(
                                label: 'WhatsApp',
                                textColor: TadColors.tadYellow,
                                onPressed: () {
                                  launchUrl(
                                    Uri.parse('https://wa.me/+18095551234?text=Hola%2C%20quiero%20registrarme%20como%20conductor%20TAD'),
                                    mode: LaunchMode.externalApplication,
                                  );
                                },
                              ),
                            ),
                          );
                        },
                        child: Text(
                          '¿Nuevo conductor? Regístrate',
                          style: TextStyle(
                            color: TadColors.tadYellow,
                            fontSize: 14,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}