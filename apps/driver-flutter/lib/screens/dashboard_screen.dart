import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:dio/dio.dart';
import '../theme/tad_theme.dart';
import '../models/hub_data.dart';
import '../services/hub_service.dart';
import '../services/gps_service.dart';
import '../core/network/api_constants.dart';
import '../core/sync/sync_engine.dart';
import '../widgets/kill_switch_overlay.dart';
import '../widgets/dashboard_widgets.dart';
import '../core/di/providers.dart';
import 'login_screen.dart' show clearLogin;
import 'onboarding_screen.dart';
import 'routes_screen.dart';

enum _Tab { home, routes, wallet, settings }

class DashboardScreen extends ConsumerStatefulWidget {
  const DashboardScreen({super.key, this.hub});

  final DriverHubData? hub;

  @override
  ConsumerState<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends ConsumerState<DashboardScreen> {
  _Tab _tab = _Tab.home;
  DriverHubData _hub;
  bool _loading = true;

  _DashboardScreenState() : _hub = const DriverHubData();

  @override
  void dispose() {
    GPSService.I.detachSyncEngine();
    super.dispose();
  }

  @override
  void initState() {
    super.initState();
    _hub = widget.hub ?? const DriverHubData();
    _loadHub();
  }

  Future<void> _loadHub() async {
    final fresh = await ref.read(hubServiceProvider).fetchHub();
    if (fresh != null && mounted) {
      setState(() {
        _hub = fresh;
        _loading = false;
      });
      _startGpsAndSync();
    } else if (mounted) {
      setState(() => _loading = false);
    }
    if (mounted) _checkSubscriptionLock();
  }

  /// Wire GPS capture → HybridSyncEngine → POST /fleet/track-batch.
  /// Called once after hub data arrives with a valid driverId.
  void _startGpsAndSync() {
    if (_hub.driverId.isEmpty) return;

    final engine = ref.read(syncEngineProvider);
    engine.setIdentity(
      driverId: _hub.driverId,
      deviceId: _hub.deviceId,
    );
    GPSService.I.attachSyncEngine(engine);
    GPSService.I.startTracking();
  }

  void _checkSubscriptionLock() {
    if (_hub.subscriptionStatus == 'PAST_DUE' ||
        _hub.subscriptionStatus == 'SUSPENDED' ||
        _hub.subscriptionStatus == 'CANCELLED') {
      KillSwitchOverlay.show(context);
    }
  }

  OnboardingStage get _stage {
    if (!_hub.contractAccepted) return OnboardingStage.contract;
    if (!_hub.bankAccountConfigured) return OnboardingStage.bank;
    if (!_hub.subscriptionPaid) return OnboardingStage.payment;
    return OnboardingStage.ready;
  }

  ReadinessLevel get _readiness => DriverReadinessCard.fromHub(
        contractAccepted: _hub.contractAccepted,
        bankAccountConfigured: _hub.bankAccountConfigured,
        subscriptionPaid: _hub.subscriptionPaid,
      );

  void _logout() {
    GPSService.I.detachSyncEngine();
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: TadColors.tadSurface,
        title: const Text('Cerrar sesión',
            style: TextStyle(color: TadColors.tadTextPrimary)),
        content: const Text('¿Seguro que quieres salir?',
            style: TextStyle(color: TadColors.tadTextSecondary)),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancelar',
                style: TextStyle(color: TadColors.tadTextSecondary)),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(ctx);
              clearLogin(); // borra token + creds cached
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
          _topBar(),
          // Tab content
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator(color: TadColors.tadGreen))
                : SingleChildScrollView(
                    padding: const EdgeInsets.all(16),
                    child: _body(),
                  ),
          ),
          // Bottom nav
          _bottomNav(),
        ],
      ),
    );
  }

  Widget _topBar() {
    return Container(
      margin: const EdgeInsets.fromLTRB(16, 14, 16, 0),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: TadColors.tadSurface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: TadColors.tadBorder),
      ),
      child: Row(
        children: [
          Container(
            width: 10,
            height: 10,
            decoration: BoxDecoration(
              color: _hub.subscriptionStatus == 'ACTIVE'
                  ? TadColors.tadGreen
                  : TadColors.tadWarning,
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  _hub.driverName,
                  style: TextStyle(
                    color: TadColors.tadYellow,
                    fontWeight: FontWeight.w700,
                    fontSize: 14,
                  ),
                ),
                Text(
                  _hub.subscriptionStatus == 'ACTIVE'
                      ? 'Conectado'
                      : 'Suscripción ${_hub.subscriptionStatus}',
                  style: TextStyle(
                    color: TadColors.tadTextSecondary,
                    fontSize: 11,
                  ),
                ),
              ],
            ),
          ),
          if (_hub.deviceId != null)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(
                color: TadColors.tadYellow.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(6),
              ),
              child: Text(
                _hub.deviceId!,
                style: TextStyle(
                  color: TadColors.tadYellow,
                  fontSize: 10,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _bottomNav() {
    return Container(
      margin: const EdgeInsets.fromLTRB(12, 0, 12, 14),
      padding: const EdgeInsets.symmetric(vertical: 8),
      decoration: BoxDecoration(
        color: const Color(0xFF0A0A0A),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
        children: _Tab.values.map((t) => _navItem(t)).toList(),
      ),
    );
  }

  Widget _navItem(_Tab t) {
    final sel = _tab == t;
    final labels = {
      _Tab.home: ('Inicio', Icons.home_outlined, Icons.home),
      _Tab.routes: ('Rutas', Icons.route_outlined, Icons.route),
      _Tab.wallet: ('Billetera', Icons.account_balance_wallet_outlined, Icons.account_balance_wallet),
      _Tab.settings: ('Config', Icons.settings_outlined, Icons.settings),
    };
    final (label, iconOutlined, iconFilled) = labels[t]!;
    return InkWell(
      onTap: () => setState(() => _tab = t),
      borderRadius: BorderRadius.circular(8),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              sel ? iconFilled : iconOutlined,
              size: 22,
              color: sel ? TadColors.tadYellow : TadColors.tadTextDisabled,
            ),
            const SizedBox(height: 3),
            Text(
              label,
              style: TextStyle(
                fontSize: 10,
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
    return switch (_tab) {
      _Tab.home => _home(),
      _Tab.routes => RoutesTab(hub: _hub),
      _Tab.wallet => WalletTab(hub: _hub),
      _Tab.settings => SettingsTab(onLogout: _logout),
    };
  }

  // ── HOME ──────────────────────────────────────────────────────────────────

  Widget _home() {
    final stage = _stage;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Greeting
        Text(
          'Hola, ${_hub.driverName.split(' ').first}',
          style: TextStyle(
            color: TadColors.tadYellow,
            fontWeight: FontWeight.w800,
            fontSize: 24,
          ),
        ),
        const SizedBox(height: 16),

        // KPI chips row
        Row(
          children: [
            Expanded(
              child: KpiChip(
                label: 'Balance',
                value: 'RD\$${_hub.balance.toStringAsFixed(0)}',
                valueColor: TadColors.tadYellow,
                icon: Icons.account_balance_wallet_outlined,
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: KpiChip(
                label: 'Proyectado',
                value: 'RD\$${_hub.projectedEarnings.toStringAsFixed(0)}',
                valueColor: TadColors.tadGreen,
                icon: Icons.trending_up,
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: KpiChip(
                label: 'Campañas',
                value: '${_hub.activeAds}',
                valueColor: TadColors.tadInfo,
                icon: Icons.campaign_outlined,
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),

        // Quick actions grid
        Text(
          'Acciones rápidas',
          style: TextStyle(
            color: TadColors.tadTextSecondary,
            fontWeight: FontWeight.w600,
            fontSize: 13,
          ),
        ),
        const SizedBox(height: 8),
        GridView.count(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          crossAxisCount: 2,
          mainAxisSpacing: 8,
          crossAxisSpacing: 8,
          childAspectRatio: 1.45,
          children: [
            QuickActionTile(
              icon: Icons.home_outlined,
              label: 'Inicio',
              color: TadColors.tadYellow,
              tooltip: 'Volver al inicio',
              onTap: () {},
            ),
            QuickActionTile(
              icon: Icons.route,
              label: 'Mis rutas',
              color: TadColors.tadInfo,
              badge: '${_hub.gpsPoints}',
              tooltip: 'Ver rutas asignadas',
              onTap: () => setState(() => _tab = _Tab.routes),
            ),
            QuickActionTile(
              icon: Icons.campaign,
              label: 'Campañas',
              color: TadColors.tadGreen,
              badge: '${_hub.activeAds}',
              tooltip: 'Ver campañas activas',
              onTap: () {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('Campañas próximamente'),
                    backgroundColor: TadColors.tadSurface,
                  ),
                );
              },
            ),
            QuickActionTile(
              icon: Icons.account_balance_wallet,
              label: 'Mi billetera',
              color: TadColors.tadWarning,
              tooltip: 'Gestionar billetera y retiros',
              onTap: () => setState(() => _tab = _Tab.wallet),
            ),
          ],
        ),
        const SizedBox(height: 12),

        // Onboarding readiness CTA
        if (stage != OnboardingStage.ready)
          DriverReadinessCard(
            level: _readiness,
            onTap: () => Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const OnboardingScreen()),
            ),
          ),

        // Balance + earnings card
        stitchedCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Billetera',
                style: TextStyle(
                    color: TadColors.tadYellow,
                    fontWeight: FontWeight.w700,
                    fontSize: 18),
              ),
              const SizedBox(height: 12),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'RD\$${_hub.balance.toStringAsFixed(0)}',
                        style: const TextStyle(
                          color: TadColors.tadTextPrimary,
                          fontSize: 28,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                      Text(
                        'Balance disponible',
                        style: TextStyle(
                          color: TadColors.tadTextSecondary,
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(
                      border: Border.all(
                          color: TadColors.tadYellow.withValues(alpha: 0.5)),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      '${_hub.activeSlots}/${_hub.maxSlots} Slots',
                      style: const TextStyle(
                          color: TadColors.tadYellow,
                          fontWeight: FontWeight.w700),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),

        // Stats row
        Row(
          children: [
            Expanded(child: _stat('Anuncios', '${_hub.activeAds}', TadColors.tadYellow)),
            const SizedBox(width: 8),
            Expanded(child: _stat('Puntos GPS', '${_hub.gpsPoints}', TadColors.tadInfo)),
          ],
        ),
        Row(
          children: [
            Expanded(child: _stat('Proyectado', 'RD\$${_hub.projectedEarnings.toStringAsFixed(0)}', TadColors.tadGreen)),
            const SizedBox(width: 8),
            Expanded(child: _stat('Anuncios reproducidos', '${_hub.adsPlayed}', TadColors.tadTextSecondary)),
          ],
        ),
      ],
    );
  }

  Widget _stat(String label, String value, Color valueColor) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: TadColors.tadSurface,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: TadColors.tadBorder),
        ),
        child: Column(
          children: [
            Text(
              value,
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w800,
                color: valueColor,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              label,
              style: TextStyle(
                color: TadColors.tadTextSecondary,
                fontSize: 11,
              ),
            ),
          ],
        ),
      ),
    );
  }
}