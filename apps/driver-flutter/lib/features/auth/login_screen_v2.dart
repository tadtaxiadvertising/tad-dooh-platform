import 'package:flutter/material.dart';
import '../../core/di/providers.dart';
import '../../core/network/api_constants.dart';
import '../../theme/tad_theme.dart';
import '../../models/hub_data.dart';

/// Login screen con bypass para desarrollo.
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
              const Text('Modo Desarrollo (Bypass Activo)',
                  style: TextStyle(color: TadColors.tadYellow, fontSize: 13, fontWeight: FontWeight.bold)),
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
                      : const Text('ENTRAR (BYPASS)',
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
    setState(() { _loading = true; _error = null; });

    // BYPASS TOTAL PARA DESARROLLO
    await Future.delayed(const Duration(milliseconds: 500));
    final hub = const DriverHubData(
      driverId: 'dev-driver',
      driverName: 'Dev Arismendy',
      subscriptionStatus: 'ACTIVE',
      contractAccepted: true,
      bankAccountConfigured: true,
      subscriptionPaid: true,
    );
    
    if (mounted) {
      Navigator.pushReplacementNamed(context, '/dashboard', arguments: hub);
    }
  }
}
