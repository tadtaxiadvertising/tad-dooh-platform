import 'package:flutter/material.dart';
import '../theme/tad_theme.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  late final TextEditingController phoneCtrl;
  late final TextEditingController passwordCtrl;
  bool _loading = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    phoneCtrl = TextEditingController(text: '809-123-4567');
    passwordCtrl = TextEditingController(text: 'tad123');
  }

  @override
  void dispose() {
    phoneCtrl.dispose();
    passwordCtrl.dispose();
    super.dispose();
  }

  Future<void> _login() async {
    if (phoneCtrl.text.trim().isEmpty || passwordCtrl.text.trim().isEmpty) {
      setState(() => _error = 'Ingresa teléfono y contraseña');
      return;
    }
    setState(() { _loading = true; _error = null; });
    await Future.delayed(const Duration(milliseconds: 800));
    if (mounted) {
      setState(() => _loading = false);
      Navigator.pushReplacementNamed(context, '/dashboard');
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
                const Text(
                  'Inicia sesión en tu cuenta',
                  style: TextStyle(color: TadColors.tadTextSecondary, fontSize: 15),
                ),
                const SizedBox(height: 36),
                stitchedCard(
                  padding: const EdgeInsets.fromLTRB(20, 28, 20, 28),
                  child: Column(
                    children: [
                      TextField(
                        controller: phoneCtrl,
                        keyboardType: TextInputType.phone,
                        style: const TextStyle(color: TadColors.tadTextPrimary, fontSize: 16),
                        decoration: const InputDecoration(
                          labelText: 'Teléfono',
                          hintText: '809-123-4567',
                          prefixIcon: Icon(Icons.phone_android, color: TadColors.tadWarning, size: 20),
                        ),
                      ),
                      const SizedBox(height: 16),
                      TextField(
                        controller: passwordCtrl,
                        obscureText: true,
                        style: const TextStyle(color: TadColors.tadTextPrimary, fontSize: 16),
                        decoration: const InputDecoration(
                          labelText: 'Contraseña',
                          prefixIcon: Icon(Icons.lock_outline, color: TadColors.tadWarning, size: 20),
                        ),
                      ),
                      if (_error != null) ...[
                        const SizedBox(height: 14),
                        Container(
                          width: double.infinity,
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: TadColors.tadError.withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: TadColors.tadError.withValues(alpha: 0.3)),
                          ),
                          child: Text(
                            _error!,
                            style: const TextStyle(color: TadColors.tadError, fontSize: 13),
                            textAlign: TextAlign.center,
                          ),
                        ),
                      ],
                      const SizedBox(height: 22),
                      SizedBox(
                        width: double.infinity,
                        height: 52,
                        child: ElevatedButton(
                          onPressed: _loading ? null : _login,
                          child: _loading
                              ? const SizedBox(
                                  width: 22, height: 22,
                                  child: CircularProgressIndicator(strokeWidth: 2, color: TadColors.black),
                                )
                              : const Text(
                                  'INICIAR SESIÓN',
                                  style: TextStyle(fontWeight: FontWeight.w700, letterSpacing: 1.4),
                                ),
                        ),
                      ),
                      const SizedBox(height: 10),
                      TextButton(
                        onPressed: () {},
                        child: const Text(
                          '¿Nuevo conductor? Regístrate',
                          style: TextStyle(color: TadColors.tadYellow, fontSize: 14),
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