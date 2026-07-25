import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'theme/tad_theme.dart';
import 'features/auth/login_screen_v2.dart';
import 'features/onboarding/onboarding_flow_screen.dart';
import 'features/wallet/wallet_screen_v2.dart';
import 'features/refer_qr/refer_qr_screen.dart';
import 'core/di/providers.dart';
import 'core/network/kill_switch_state.dart';
import 'models/hub_data.dart';

const kAppVersion = '1.0.0';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  await Supabase.initialize(
    url: 'https://ltdcdhqixvbpdcitthqf.supabase.co',
    anonKey:
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx0ZGNkaHFpeHZicGRjaXR0aHFmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkxMTc4MTYsImV4cCI6MjA2NDY5MzgxNn0.ZopN0cOPM1cCqIlx9FiA5Y7A4_NRX',
  );

  runApp(const TadDriverApp());
}

class TadDriverApp extends StatefulWidget {
  const TadDriverApp({super.key});

  @override
  State<TadDriverApp> createState() => _TadDriverAppState();
}

class _TadDriverAppState extends State<TadDriverApp> {
  @override
  void initState() {
    super.initState();
    killSwitchState.addListener(_onKillSwitchChanged);
  }

  @override
  void dispose() {
    killSwitchState.removeListener(_onKillSwitchChanged);
    super.dispose();
  }

  void _onKillSwitchChanged() {
    // Trigger rebuild cuando el kill-switch cambia
    setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'TAD Driver',
      debugShowCheckedModeBanner: false,
      theme: tadTheme(),
      home: killSwitchState.active
          ? _KillSwitchScreen(message: killSwitchState.message)
          : const LoginScreenV2(),
      routes: {
        '/dashboard': (context) {
          final hub = ModalRoute.of(context)?.settings.arguments as DriverHubData?;
          return _DashboardShell(hub: hub);
        },
        '/onboarding': (context) => OnboardingFlowScreen(
          onComplete: () {
            Navigator.pushReplacementNamed(context, '/dashboard');
          },
        ),
        '/wallet': (context) => const WalletScreenV2(),
        '/refer': (context) => const ReferQrScreen(),
      },
    );
  }
}

/// Pantalla de bloqueo cuando la suscripción está vencida (402).
class _KillSwitchScreen extends StatelessWidget {
  const _KillSwitchScreen({this.message});

  final String? message;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: TadColors.tadDark,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.payment, color: TadColors.tadError, size: 64),
              const SizedBox(height: 24),
              const Text(
                'Suscripción vencida',
                style: TextStyle(
                    color: TadColors.tadTextPrimary, fontSize: 24, fontWeight: FontWeight.w800),
              ),
              const SizedBox(height: 12),
              Text(
                message ?? 'Contacta a TAD para renovar tu membresía.',
                style: const TextStyle(color: TadColors.tadTextSecondary, fontSize: 15),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 36),
              SizedBox(
                width: double.infinity,
                height: 50,
                child: ElevatedButton.icon(
                  onPressed: () {
                    // TODO: launch WhatsApp
                  },
                  icon: const Icon(Icons.chat, color: TadColors.black),
                  label: const Text(
                    'CONTACTAR POR WHATSAPP',
                    style: TextStyle(fontWeight: FontWeight.w700, letterSpacing: 1.2),
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: TadColors.tadGreen,
                    foregroundColor: TadColors.black,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Shell mínimo del dashboard que muestra los features implementados.
class _DashboardShell extends StatelessWidget {
  const _DashboardShell({this.hub});

  final DriverHubData? hub;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: TadColors.tadDark,
      appBar: AppBar(
        backgroundColor: TadColors.tadDark,
        title: Text(
          'TAD Driver',
          style: TextStyle(color: TadColors.tadYellow, fontWeight: FontWeight.w800),
        ),
        actions: [
          IconButton(
            icon: Icon(Icons.account_balance_wallet, color: TadColors.tadYellow),
            onPressed: () => Navigator.pushNamed(context, '/wallet'),
            tooltip: 'Billetera',
          ),
          IconButton(
            icon: Icon(Icons.qr_code, color: TadColors.tadYellow),
            onPressed: () => Navigator.pushNamed(context, '/refer'),
            tooltip: 'Referir',
          ),
          IconButton(
            icon: Icon(Icons.person_add, color: TadColors.tadYellow),
            onPressed: () => Navigator.pushNamed(context, '/onboarding'),
            tooltip: 'Onboarding',
          ),
        ],
      ),
      body: hub == null
          ? const Center(
              child: Text(
                'Cargando...',
                style: TextStyle(color: TadColors.tadTextSecondary),
              ),
            )
          : _HubView(hub: hub!),
    );
  }
}

class _HubView extends StatelessWidget {
  const _HubView({required this.hub});

  final DriverHubData hub;

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // Status card
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: TadColors.tadSurface,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: TadColors.tadBorder),
          ),
          child: Row(
            children: [
              Container(
                width: 10, height: 10,
                decoration: BoxDecoration(
                  color: hub.subscriptionStatus == 'ACTIVE'
                      ? TadColors.tadGreen
                      : TadColors.tadWarning,
                  shape: BoxShape.circle,
                ),
              ),
              const SizedBox(width: 10),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    hub.driverName,
                    style: const TextStyle(
                        color: TadColors.tadYellow, fontWeight: FontWeight.w700, fontSize: 16),
                  ),
                  Text(
                    hub.subscriptionStatus == 'ACTIVE'
                        ? 'Conectado'
                        : 'Suscripción ${hub.subscriptionStatus}',
                    style: const TextStyle(color: TadColors.tadTextSecondary, fontSize: 12),
                  ),
                ],
              ),
              const Spacer(),
              Text(
                'RD\$${hub.balance.toStringAsFixed(0)}',
                style: const TextStyle(
                    color: TadColors.tadGreen, fontWeight: FontWeight.w800, fontSize: 20),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        // Earnings card
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: TadColors.tadSurface,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: TadColors.tadBorder),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Ganancias del mes',
                style: TextStyle(color: TadColors.tadTextSecondary, fontSize: 12),
              ),
              const SizedBox(height: 4),
              Text(
                'RD\$${hub.projectedEarnings.toStringAsFixed(0)}',
                style: const TextStyle(
                    color: TadColors.tadTextPrimary, fontWeight: FontWeight.w800, fontSize: 28),
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  _InfoChip(
                    icon: Icons.visibility,
                    label: '${hub.activeAds} anuncios activos',
                  ),
                  const SizedBox(width: 8),
                  _InfoChip(
                    icon: Icons.group_add,
                    label: '${hub.referralsCount} referidos',
                  ),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        // Navigation buttons
        _NavTile(
          icon: Icons.account_balance_wallet,
          title: 'Billetera',
          subtitle: 'RD\$${hub.balance.toStringAsFixed(0)} disponibles',
          onTap: () => Navigator.pushNamed(context, '/wallet'),
        ),
        _NavTile(
          icon: Icons.qr_code,
          title: 'Invitar referidos',
          subtitle: 'Gana RD\$500 por cada referido',
          onTap: () => Navigator.pushNamed(context, '/refer'),
        ),
        _NavTile(
          icon: Icons.assignment,
          title: 'Onboarding',
          subtitle: hub.contractAccepted ? 'Contrato firmado' : 'Contrato pendiente',
          onTap: () => Navigator.pushNamed(context, '/onboarding'),
        ),
      ],
    );
  }
}

class _InfoChip extends StatelessWidget {
  const _InfoChip({required this.icon, required this.label});

  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: TadColors.tadYellow.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: TadColors.tadYellow.withValues(alpha: 0.3)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, color: TadColors.tadYellow, size: 14),
          const SizedBox(width: 4),
          Text(
            label,
            style: const TextStyle(color: TadColors.tadYellow, fontSize: 12, fontWeight: FontWeight.w600),
          ),
        ],
      ),
    );
  }
}

class _NavTile extends StatelessWidget {
  const _NavTile({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.onTap,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(
        color: TadColors.tadSurface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: TadColors.tadBorder),
      ),
      child: ListTile(
        leading: Icon(icon, color: TadColors.tadYellow),
        title: Text(title,
            style: const TextStyle(color: TadColors.tadTextPrimary, fontWeight: FontWeight.w600)),
        subtitle: Text(subtitle, style: const TextStyle(color: TadColors.tadTextSecondary, fontSize: 12)),
        trailing: const Icon(Icons.chevron_right, color: TadColors.tadTextDisabled),
        onTap: onTap,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
    );
  }
}