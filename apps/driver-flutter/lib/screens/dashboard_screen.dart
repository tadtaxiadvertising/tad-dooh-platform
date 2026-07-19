import 'package:flutter/material.dart';
import '../theme/tad_theme.dart';
import '../models/hub_data.dart';
import 'onboarding_screen.dart';
import 'wallet_screen.dart';

enum _Tab { home, routes, wallet, settings }

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  _Tab _tab = _Tab.home;
  final DriverHubData _hub = const DriverHubData();

  OnboardingStage _stage() {
    if (!_hub.contractAccepted) return OnboardingStage.contract;
    if (!_hub.bankAccountConfigured) return OnboardingStage.bank;
    if (!_hub.subscriptionPaid) return OnboardingStage.payment;
    return OnboardingStage.ready;
  }

  void _logout() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: TadColors.tadSurface,
        title: const Text('Cerrar sesión', style: TextStyle(color: TadColors.tadTextPrimary)),
        content: const Text('¿Seguro que quieres salir?', style: TextStyle(color: TadColors.tadTextSecondary)),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancelar', style: TextStyle(color: TadColors.tadTextSecondary)),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(ctx);
              Navigator.pushReplacementNamed(context, '/');
            },
            child: const Text('Salir', style: TextStyle(color: TadColors.tadError)),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: TadColors.tadDark,
      body: Column(
        children: [
          // Top bar
          Container(
            margin: const EdgeInsets.fromLTRB(16, 14, 16, 0),
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            decoration: BoxDecoration(
              color: TadColors.tadSurface,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: TadColors.tadBorder),
            ),
            child: Row(
              children: [
                Container(width: 10, height: 10, decoration: const BoxDecoration(color: TadColors.tadGreen, shape: BoxShape.circle)),
                const SizedBox(width: 8),
                const Text('Conectado', style: TextStyle(color: TadColors.tadYellow, fontSize: 13)),
              ],
            ),
          ),
          // Tab content
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: _body(),
            ),
          ),
          // Bottom nav
          Container(
            margin: const EdgeInsets.fromLTRB(12, 0, 12, 14),
            padding: const EdgeInsets.symmetric(vertical: 10),
            decoration: BoxDecoration(color: const Color(0xFF0A0A0A), borderRadius: BorderRadius.circular(16)),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: _Tab.values.map((t) => _navItem(t)).toList(),
            ),
          ),
        ],
      ),
    );
  }

  Widget _navItem(_Tab t) {
    final sel = _tab == t;
    final labels = {
      _Tab.home: ('Inicio', '🏠'),
      _Tab.routes: ('Rutas', '🛣️'),
      _Tab.wallet: ('Billetera', '💰'),
      _Tab.settings: ('Config', '⚙️'),
    };
    final (label, emoji) = labels[t]!;
    return InkWell(
      onTap: () => setState(() => _tab = t),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(emoji, style: TextStyle(fontSize: 20)),
            const SizedBox(height: 2),
            Text(
              label,
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w600,
                color: sel ? TadColors.tadYellow : TadColors.tadTextDisabled,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _body() {
    switch (_tab) {
      case _Tab.home: return _home();
      case _Tab.routes: return _routes();
      case _Tab.wallet: return _walletTab();
      case _Tab.settings: return _settings();
    }
  }

  // ── HOME ──

  Widget _home() {
    final stage = _stage();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Hola, ${_hub.driverName}',
          style: const TextStyle(color: TadColors.tadYellow, fontWeight: FontWeight.w800, fontSize: 24),
        ),
        const SizedBox(height: 16),
        stitchedCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Billetera', style: TextStyle(color: TadColors.tadYellow, fontWeight: FontWeight.w700, fontSize: 18)),
              const SizedBox(height: 12),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'RD\$${_hub.balance.toStringAsFixed(0)}',
                    style: const TextStyle(color: TadColors.tadTextPrimary, fontSize: 28, fontWeight: FontWeight.w900),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(
                      border: Border.all(color: TadColors.tadYellow.withValues(alpha: 0.5)),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text('${_hub.activeSlots}/${_hub.maxSlots} Slots',
                        style: const TextStyle(color: TadColors.tadYellow, fontWeight: FontWeight.w700)),
                  ),
                ],
              ),
            ],
          ),
        ),
        Row(children: [
          Expanded(child: _stat('Anuncios', '${_hub.activeAds}')),
          const SizedBox(width: 10),
          Expanded(child: _stat('Puntos GPS', '${_hub.gpsPoints}')),
        ]),
        const SizedBox(height: 4),
        Row(children: [
          Expanded(child: _stat('Proyectado', 'RD\$${_hub.projectedEarnings.toStringAsFixed(0)}', valueColor: TadColors.tadGreen)),
          const SizedBox(width: 10),
          Expanded(child: _stat('Estado', 'Online', valueColor: TadColors.tadGreen)),
        ]),
        if (stage != OnboardingStage.ready) ...[
          const SizedBox(height: 12),
          InkWell(
            onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const OnboardingScreen())),
            child: Container(
              width: double.infinity,
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: TadColors.tadWarning.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: TadColors.tadWarning.withValues(alpha: 0.3)),
              ),
              child: Column(
                children: [
                  Text(
                    stage == OnboardingStage.contract ? 'Debes aceptar el contrato' :
                    stage == OnboardingStage.bank ? 'Configura tus datos bancarios' :
                    'Realiza el pago del Starter Kit',
                    style: const TextStyle(color: TadColors.tadWarning, fontWeight: FontWeight.w600),
                  ),
                  const Text('Completar configuración →', style: TextStyle(color: TadColors.tadYellow, fontSize: 13)),
                ],
              ),
            ),
          ),
        ],
      ],
    );
  }

  Widget _stat(String label, String value, {Color? valueColor}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: TadColors.tadSurface,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: TadColors.tadBorder),
        ),
        child: Column(
          children: [
            Text(value,
                style: TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.w800,
                    color: valueColor ?? TadColors.tadTextPrimary)),
            const SizedBox(height: 4),
            Text(label, style: const TextStyle(color: TadColors.tadTextSecondary, fontSize: 12)),
          ],
        ),
      ),
    );
  }

  // ── ROUTES ──

  Widget _routes() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Rutas y GPS',
            style: TextStyle(color: TadColors.tadYellow, fontWeight: FontWeight.w800, fontSize: 24)),
        const SizedBox(height: 16),
        stitchedCard(
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('Estado GPS', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
              Row(children: [
                Container(width: 8, height: 8, decoration: const BoxDecoration(color: TadColors.tadGreen, shape: BoxShape.circle)),
                const SizedBox(width: 6),
                const Text('Activo', style: TextStyle(color: TadColors.tadGreen, fontWeight: FontWeight.w700)),
              ]),
            ],
          ),
        ),
        Row(children: [
          Expanded(child: _stat('Pendientes (batch)', '0', valueColor: TadColors.tadYellow)),
          const SizedBox(width: 10),
          Expanded(child: _stat('Offline', '0', valueColor: TadColors.tadGreen)),
        ]),
        const SizedBox(height: 8),
        SizedBox(
          width: double.infinity,
          height: 48,
          child: ElevatedButton(
            onPressed: null,
            child: const Text('SINCRONIZAR AHORA',
                style: TextStyle(fontWeight: FontWeight.w700, letterSpacing: 1.2)),
          ),
        ),
      ],
    );
  }

  // ── WALLET TAB ──

  Widget _walletTab() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Billetera',
            style: TextStyle(color: TadColors.tadYellow, fontWeight: FontWeight.w800, fontSize: 24)),
        const SizedBox(height: 16),
        stitchedCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('RD\$${_hub.balance.toStringAsFixed(0)}',
                  style: const TextStyle(color: TadColors.tadTextPrimary, fontSize: 30, fontWeight: FontWeight.w900)),
              const SizedBox(height: 6),
              const Text('Balance disponible', style: TextStyle(color: TadColors.tadTextSecondary, fontSize: 13)),
              const SizedBox(height: 12),
              Row(children: [
                _badge('${_hub.activeAds} anuncios', TadColors.tadYellow),
                const SizedBox(width: 8),
                _badge('${_hub.activeSlots}/${_hub.maxSlots} slots', TadColors.tadGreen),
              ]),
            ],
          ),
        ),
        stitchedCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Proyectado este mes', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
              const SizedBox(height: 6),
              Text('RD\$${_hub.projectedEarnings.toStringAsFixed(0)}',
                  style: const TextStyle(color: TadColors.tadGreen, fontSize: 20, fontWeight: FontWeight.w800)),
            ],
          ),
        ),
        stitchedCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Desglose de ganancias',
                  style: TextStyle(color: TadColors.tadYellow, fontWeight: FontWeight.w700, fontSize: 15)),
              const SizedBox(height: 8),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Min(anuncios, 15) × RD\$500',
                      style: TextStyle(color: TadColors.tadTextSecondary, fontSize: 13)),
                  Text('RD\$${(_hub.activeAds * 500).toStringAsFixed(0)}',
                      style: const TextStyle(fontWeight: FontWeight.w700)),
                ],
              ),
            ],
          ),
        ),
        SizedBox(
          width: double.infinity,
          height: 48,
          child: ElevatedButton(
            onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const WalletScreen())),
            style: ElevatedButton.styleFrom(backgroundColor: TadColors.tadGreen, foregroundColor: TadColors.black),
            child: const Text('VER BILLETERA COMPLETA',
                style: TextStyle(fontWeight: FontWeight.w700, letterSpacing: 1.2)),
          ),
        ),
      ],
    );
  }

  Widget _badge(String text, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        border: Border.all(color: color),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(text, style: TextStyle(color: color, fontSize: 12, fontWeight: FontWeight.w700)),
    );
  }

  // ── SETTINGS ──

  Widget _settings() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Configuración',
            style: TextStyle(color: TadColors.tadYellow, fontWeight: FontWeight.w800, fontSize: 24)),
        const SizedBox(height: 16),
        stitchedCard(
          child: Column(
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: const [
                  Text('Conexión', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
                  Text('Online', style: TextStyle(color: TadColors.tadGreen, fontWeight: FontWeight.w700)),
                ],
              ),
              const SizedBox(height: 10),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: const [
                  Text('GPS tracking', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
                  Text('Activo', style: TextStyle(color: TadColors.tadGreen, fontWeight: FontWeight.w700)),
                ],
              ),
            ],
          ),
        ),
        SizedBox(
          width: double.infinity,
          height: 48,
          child: ElevatedButton(
            onPressed: () {},
            child: const Text('SOPORTE WHATSAPP',
                style: TextStyle(fontWeight: FontWeight.w700, letterSpacing: 1.1)),
          ),
        ),
        const SizedBox(height: 10),
        SizedBox(
          width: double.infinity,
          height: 48,
          child: OutlinedButton(
            onPressed: () {},
            style: OutlinedButton.styleFrom(
              foregroundColor: TadColors.tadTextPrimary,
              side: const BorderSide(color: TadColors.tadBorder),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
            child: const Text('REPORTAR PROBLEMA',
                style: TextStyle(fontWeight: FontWeight.w700, letterSpacing: 1.1)),
          ),
        ),
        const SizedBox(height: 10),
        SizedBox(
          width: double.infinity,
          height: 48,
          child: ElevatedButton(
            onPressed: _logout,
            style: ElevatedButton.styleFrom(backgroundColor: TadColors.tadRed, foregroundColor: TadColors.white),
            child: const Text('CERRAR SESIÓN',
                style: TextStyle(fontWeight: FontWeight.w700, letterSpacing: 1.1)),
          ),
        ),
      ],
    );
  }
}