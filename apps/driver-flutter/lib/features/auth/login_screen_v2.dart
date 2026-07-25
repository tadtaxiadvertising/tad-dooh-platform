import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../core/di/providers.dart';
import '../../theme/tad_theme.dart';
import '../../models/hub_data.dart';
import '../../core/network/kill_switch_state.dart';

/// Login screen — consume los providers globales directamente.
class LoginScreenV2 extends StatefulWidget {
  const LoginScreenV2({super.key});

  @override
  State<LoginScreenV2> createState() => _LoginScreenV2State();
}

class _LoginScreenV2State extends State<LoginScreenV2> {
  late final TextEditingController _phoneCtrl;
  late final TextEditingController _passwordCtrl;
  bool _loading = false;
  String? _error;
  bool _obscurePassword = true;

  @override
  void initState() {
    super.initState();
    _phoneCtrl = TextEditingController(text: '8090000000');
    _passwordCtrl = TextEditingController(text: 'tad123');
  }

  @override
  void dispose() {
    _phoneCtrl.dispose();
    _passwordCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: TadColors.tadDark,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 40),
              Center(
                child: Container(
                  width: 72, height: 72,
                  decoration: BoxDecoration(
                    color: TadColors.tadYellow,
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: const Center(
                    child: Text('TAD',
                        style: TextStyle(
                            color: TadColors.black, fontWeight: FontWeight.w900, fontSize: 22)),
                  ),
                ),
              ),
              const SizedBox(height: 32),
              const Text('Iniciar sesión',
                  style: TextStyle(
                      color: TadColors.tadTextPrimary, fontSize: 28, fontWeight: FontWeight.w800)),
              const SizedBox(height: 8),
              const Text('Conductor TAD',
                  style: TextStyle(color: TadColors.tadTextSecondary, fontSize: 15)),
              const SizedBox(height: 36),
              _label('Teléfono'),
              const SizedBox(height: 8),
              TextField(
                controller: _phoneCtrl,
                keyboardType: TextInputType.phone,
                style: const TextStyle(color: TadColors.tadTextPrimary),
                decoration: _inputDeco(Icons.phone, '+1 (809) 000-0000'),
              ),
              const SizedBox(height: 20),
              _label('Contraseña'),
              const SizedBox(height: 8),
              TextField(
                controller: _passwordCtrl,
                obscureText: _obscurePassword,
                style: const TextStyle(color: TadColors.tadTextPrimary),
                decoration: _inputDeco(
                  Icons.lock_outline,
                  '••••••••',
                  suffix: IconButton(
                    icon: Icon(
                        _obscurePassword ? Icons.visibility_off : Icons.visibility,
                        color: TadColors.tadTextSecondary,
                        size: 20),
                    onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                  ),
                ),
              ),
              if (_error != null) ...[
                const SizedBox(height: 16),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: TadColors.tadError.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: TadColors.tadError.withValues(alpha: 0.3)),
                  ),
                  child: Text(_error!,
                      style: const TextStyle(color: TadColors.tadError, fontSize: 13)),
                ),
              ],
              const SizedBox(height: 32),
              SizedBox(
                width: double.infinity,
                height: 50,
                child: ElevatedButton(
                  onPressed: _loading ? null : _doLogin,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: TadColors.tadYellow,
                    foregroundColor: TadColors.black,
                    disabledBackgroundColor: TadColors.tadBorder,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: _loading
                      ? const SizedBox(
                          width: 22, height: 22,
                          child: CircularProgressIndicator(strokeWidth: 2, color: TadColors.black))
                      : const Text('ENTRAR',
                          style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16, letterSpacing: 1.2)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _label(String text) => Text(text,
      style: const TextStyle(color: TadColors.tadTextSecondary, fontSize: 13, fontWeight: FontWeight.w600));

  InputDecoration _inputDeco(IconData icon, String hint, {Widget? suffix}) {
    return InputDecoration(
      hintText: hint,
      hintStyle: TextStyle(color: TadColors.tadTextSecondary.withValues(alpha: 0.5)),
      prefixIcon: Icon(icon, color: TadColors.tadTextSecondary, size: 20),
      suffixIcon: suffix,
      filled: true,
      fillColor: TadColors.tadSurface,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: TadColors.tadBorder),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: TadColors.tadBorder),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: TadColors.tadYellow),
      ),
    );
  }

  Future<void> _doLogin() async {
    final phone = _phoneCtrl.text.trim();
    final password = _passwordCtrl.text;

    if (phone.isEmpty || password.isEmpty) {
      setState(() => _error = 'Completa todos los campos');
      return;
    }

    setState(() { _loading = true; _error = null; });

    try {
      final res = await dio.fetch(RequestOptions(
        path: '/drivers/login',
        method: 'POST',
        data: {'phone': phone, 'password': password},
      ));

      if (res.statusCode == 200 || res.statusCode == 201) {
        final data = res.data as Map<String, dynamic>;
        // persist token + creds
        await _persistLogin(data, phone, password);
        final hub = DriverHubData.fromJson(data);
        if (mounted) {
          Navigator.pushReplacementNamed(context, '/dashboard', arguments: hub);
        }
      } else {
        setState(() => _error = res.data?['message'] ?? 'Error al iniciar sesión');
      }
    } catch (e) {
      if (e is DioException) {
        if (e.response?.statusCode == 401) {
          setState(() => _error = 'Credenciales inválidas');
        } else if (e.response?.statusCode == 402) {
          killSwitchState.activate('Suscripción vencida — contacte a TAD');
        } else {
          setState(() => _error = 'Error de conexión — intenta de nuevo');
        }
      } else {
        setState(() => _error = 'Error de conexión — intenta de nuevo');
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _persistLogin(Map<String, dynamic> data, String phone, String password) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('tad_driver_token', data['access_token']?.toString() ?? '');
    await prefs.setString('tad_driver_phone', phone);
    await prefs.setString('tad_driver_pass', password);
  }
}