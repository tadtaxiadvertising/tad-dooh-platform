import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:url_launcher/url_launcher.dart';
import '../theme/tad_theme.dart';
import '../models/hub_data.dart';

// ─── API ──────────────────────────────────────────────────────────────────────

/// API base URL — production vs debug (emulator maps 10.0.2.2 → host localhost)
/// Backend uses global prefix `/api/v1`, so all paths start from `/api/v1`.
final String kApiBase = kReleaseMode
    ? 'https://tad-api.rewvid.easypanel.host/api/v1'
    : 'http://10.0.2.2:3000/api/v1';

/// SharedPreferences keys
const String kPrefToken = 'tad_driver_token';
const String kPrefHub = 'tad_driver_user';
const String kPrefTokenExp = 'tad_driver_token_exp';
const String kPrefPhone = 'tad_driver_phone';
const String kPrefPassword = 'tad_driver_pass';

class LoginResult {
  final DriverHubData hub;
  final String accessToken;

  /// Backend no emite refresh token — re-login via cached creds on 401.
  /// Este campo se mantiene por compatibilidad pero siempre es ''.
  final String refreshToken;

  LoginResult({
    required this.hub,
    required this.accessToken,
    this.refreshToken = '',
  });

  factory LoginResult.fromJson(Map<String, dynamic> json) {
    /// Backend contact (POST /api/v1/drivers/login):
    //   access_token, driverId, name, role, entityId, deviceId,
    //   subscriptionPaid, contractAccepted, agreementVersion,
    //   onboardingStatus, bankAccountConfigured
    final hub = DriverHubData(
      driverId: (json['driverId'] ?? json['entityId'] ?? '').toString(),
      driverName: (json['name'] ?? json['driverName'] ?? 'Conductor').toString(),
      subscriptionPaid: json['subscriptionPaid'] == true,
      subscriptionStatus: json['subscriptionPaid'] == true ? 'ACTIVE' : 'PENDING',
      deviceId: json['deviceId']?.toString(),
      contractAccepted: json['contractAccepted'] == true,
      agreementVersion: json['agreementVersion']?.toString(),
      onboardingStatus: (json['onboardingStatus'] ?? 'UNKNOWN').toString(),
      bankAccountConfigured: json['bankAccountConfigured'] == true,
    );
    return LoginResult(
      hub: hub,
      accessToken: (json['access_token'] ?? json['accessToken'] ?? '').toString(),
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

/// POST /api/drivers/login
/// 200 → LoginResult (access_token + driver hub data)
/// 401 → "Credenciales inválidas"
/// 402 → "Suscripción vencida" (KillSwitch — backend bloquea si no pagó)
/// 403 → "Cuenta suspendada"
/// 403 AUTH_CONFIG_MISSING → "Error de configuración del servidor"
/// 5xx → retry up to 2 times with backoff
Future<LoginResult> apiLogin(String phone, String password) async {
  const maxRetries = 2;
  String? lastError;

  for (var attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      final client = HttpClient();
      client.connectionTimeout = const Duration(seconds: 10);

      final req = await client.postUrl(Uri.parse('$kApiBase/drivers/login'));
      req.headers.contentType = ContentType.json;
      req.write(jsonEncode({'phone': phone, 'password': password}));

      final res = await req.close();
      final body = await res.transform(utf8.decoder).join();
      client.close();

      if (res.statusCode == 200 || res.statusCode == 201) {
        final json = jsonDecode(body) as Map<String, dynamic>;
        return LoginResult.fromJson(json);
      }

      // Error responses
      String msg;
      try {
        final errJson = jsonDecode(body) as Map<String, dynamic>;
        msg = (errJson['message'] ?? errJson['error'] ?? 'Error').toString();
      } catch (_) {
        msg = 'Error del servidor (${res.statusCode})';
      }

      throw ApiException(res.statusCode, msg);
    } on ApiException catch (e) {
      // 5xx → retry
      if (e.statusCode >= 500 && attempt < maxRetries) {
        lastError = e.message;
        await Future.delayed(Duration(milliseconds: 500 * (attempt + 1)));
        continue;
      }
      rethrow;
    } on HandshakeException catch (_) {
      if (attempt < maxRetries) {
        await Future.delayed(Duration(milliseconds: 500 * (attempt + 1)));
        continue;
      }
      throw ApiException(0, 'No se pudo conectar al servidor');
    } on SocketException catch (_) {
      if (attempt < maxRetries) {
        await Future.delayed(Duration(milliseconds: 500 * (attempt + 1)));
        continue;
      }
      throw ApiException(0, 'Sin conexión a internet');
    } catch (e) {
      if (e is ApiException) rethrow;
      if (attempt < maxRetries) {
        await Future.delayed(Duration(milliseconds: 500 * (attempt + 1)));
        continue;
      }
      throw ApiException(0, 'Error de conexión');
    }
  }
  throw ApiException(0, lastError ?? 'Error desconocido');
}

// ─── Token persistence (SharedPreferences) ──────────────────────────────────

/// Saves auth + cached creds after successful login.
/// Creds se guardan para re-login silencioso en 401 (backend no tiene refresh).
Future<void> persistLogin(LoginResult result, {String? phone, String? password}) async {
  final prefs = await SharedPreferences.getInstance();
  await prefs.setString(kPrefToken, result.accessToken);
  await prefs.setString(kPrefHub, jsonEncode(result.hub.toJson()));
  await prefs.setString(
    kPrefTokenExp,
    DateTime.now().add(const Duration(days: 7)).toIso8601String(),
  );
  // Cache creds for silent re-login on 401
  if (phone != null) await prefs.setString(kPrefPhone, phone);
  if (password != null) await prefs.setString(kPrefPassword, password);
}

/// Clears all auth state — call on logout.
Future<void> clearLogin() async {
  final prefs = await SharedPreferences.getInstance();
  await prefs.remove(kPrefToken);
  await prefs.remove(kPrefHub);
  await prefs.remove(kPrefTokenExp);
  await prefs.remove(kPrefPhone);
  await prefs.remove(kPrefPassword);
}

/// Restores cached DriverHubData for fast initial load (before API fetch).
Future<DriverHubData?> restoreCachedHub() async {
  final prefs = await SharedPreferences.getInstance();
  final raw = prefs.getString(kPrefHub);
  if (raw == null) return null;
  try {
    return DriverHubData.fromJson(jsonDecode(raw) as Map<String, dynamic>);
  } catch (_) {
    return null;
  }
}

/// Returns cached token or null — for authenticated API calls.
Future<String?> getCachedToken() async {
  final prefs = await SharedPreferences.getInstance();
  return prefs.getString(kPrefToken);
}

/// Silent re-login using cached phone/password (called on 401).
/// Returns new LoginResult or null if no cached creds.
Future<LoginResult?> silentReLogin() async {
  final prefs = await SharedPreferences.getInstance();
  final phone = prefs.getString(kPrefPhone);
  final password = prefs.getString(kPrefPassword);
  if (phone == null || password == null) return null;
  try {
    final result = await apiLogin(phone, password);
    await persistLogin(result, phone: phone, password: password);
    return result;
  } catch (_) {
    return null;
  }
}

/// Sets onboarding force flag. In Flutter native, the dashboard checks
/// hub flags directly; this is a no-op preserved for web compatibility.
void setOnboardingForceFlag() {
  // Flutter native: no-op (dashboard checks hub flags directly).
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
    _phoneCtrl = TextEditingController(text: '8090000000');
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
    final rawPhone = _phoneCtrl.text.trim();
    final password = _passwordCtrl.text;
    final phone = _toDigitsOnly(rawPhone);

    if (phone.isEmpty) { setState(() => _error = 'Ingresa tu número de teléfono'); return; }
    if (password.isEmpty) { setState(() => _error = 'Ingresa tu contraseña'); return; }
    if (password.length < 6) { setState(() => _error = 'La contraseña debe tener al menos 6 caracteres'); return; }

    setState(() { _loading = true; _error = null; });

    try {
      final result = await apiLogin(phone, password);
      await persistLogin(result, phone: phone, password: password);

      final hub = result.hub;
      if (!hub.contractAccepted || !hub.bankAccountConfigured) {
        setOnboardingForceFlag();
      }

      if (mounted) {
        Navigator.pushReplacementNamed(context, '/dashboard', arguments: result.hub);
      }
       // Let dashboard decide onboarding from hub.contractAccepted /
       // hub.bankAccountConfigured (already computed by backend).
       return;
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

    static String _toDigitsOnly(String value) => value.replaceAll(RegExp(r'\D+'), '');

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
                   const Text(
                     'TAD Driver',
                     style: TextStyle(
                       color: TadColors.tadYellow,
                       fontSize: 44,
                       fontWeight: FontWeight.w900,
                       letterSpacing: -1,
                     ),
                   ),
                   const SizedBox(height: 8),
                   const Text(
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
                                    Uri.parse('https://wa.me/18295551234?text=Hello%2C%20I%20want%20to%20register%20as%20a%20TAD%20driver'),
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