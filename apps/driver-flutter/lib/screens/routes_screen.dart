import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../theme/tad_theme.dart';
import '../models/hub_data.dart';
import 'bank_wizard_screen.dart';

/// Routes tab — shows assigned routes with search and filter.
class RoutesTab extends StatefulWidget {
  const RoutesTab({super.key, required this.hub});

  final DriverHubData hub;

  @override
  State<RoutesTab> createState() => _RoutesTabState();
}

class _RoutesTabState extends State<RoutesTab> {
  String _searchQuery = '';
  String _filter = 'todas'; // 'todas' | 'activas' | 'completadas'

  /// Routes derivadas del hub data real (no mock).
  /// Cada anuncio activo = una "ruta" donde se reproduce contenido.
  List<_RouteData> get _routes {
    final hub = widget.hub;
    final active = hub.activeAds;
    final slots = hub.activeSlots;
    final maxSlots = hub.maxSlots;

    // Activa: anuncios actualmente reproduciéndose
    final List<_RouteData> routes = List.generate(
      active,
      (i) => _RouteData(
        id: 'AD-${(i + 1).toString().padLeft(3, '0')}',
        name: 'Anuncio activo #${i + 1}',
        status: 'active',
        progress: slots > 0 ? ((i + 1) / maxSlots).clamp(0.0, 1.0) : 0.0,
      ),
    );

    // Slots disponibles sin asignar = pending
    final pendingCount = (maxSlots - active - slots).clamp(0, maxSlots);
    for (var i = 0; i < pendingCount; i++) {
      routes.add(_RouteData(
        id: 'SLOT-${(i + 1).toString().padLeft(3, '0')}',
        name: 'Slot disponible #${i + 1}',
        status: 'pending',
        progress: 0.0,
      ));
    }

    // Slots ya usados = completed (reproducción finalizada del período)
    for (var i = 0; i < slots; i++) {
      routes.add(_RouteData(
        id: 'DONE-${(i + 1).toString().padLeft(3, '0')}',
        name: 'Slot completado #${i + 1}',
        status: 'completed',
        progress: 1.0,
      ));
    }

    return routes;
  }

  List<_RouteData> get _filtered {
    var routes = _routes;
    if (_filter == 'activas') {
      routes = routes.where((r) => r.status == 'active').toList();
    } else if (_filter == 'completadas') {
      routes = routes.where((r) => r.status == 'completed').toList();
    }
    if (_searchQuery.isNotEmpty) {
      routes = routes.where((r) => r.name.toLowerCase().contains(_searchQuery.toLowerCase())).toList();
    }
    return routes;
  }

  @override
  Widget build(BuildContext context) {
    final routes = _filtered;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Header
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'Mis rutas',
              style: TextStyle(
                color: TadColors.tadYellow,
                fontWeight: FontWeight.w800,
                fontSize: 22,
              ),
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: TadColors.tadYellow.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                '${routes.length} rutas',
                style: TextStyle(
                  color: TadColors.tadYellow,
                  fontWeight: FontWeight.w700,
                  fontSize: 13,
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),

        // Search
        TextField(
          onChanged: (v) => setState(() => _searchQuery = v),
          style: TextStyle(color: TadColors.tadTextPrimary, fontSize: 14),
          decoration: InputDecoration(
            hintText: 'Buscar ruta...',
            hintStyle: TextStyle(color: TadColors.tadTextDisabled),
            prefixIcon: Icon(Icons.search, color: TadColors.tadTextSecondary, size: 18),
            filled: true,
            fillColor: TadColors.tadSurface,
            contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(10),
              borderSide: BorderSide(color: TadColors.tadBorder),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(10),
              borderSide: BorderSide(color: TadColors.tadBorder),
            ),
          ),
        ),
        const SizedBox(height: 10),

        // Filter chips
        Row(
          children: [
            _filterChip('todas', 'Todas'),
            const SizedBox(width: 6),
            _filterChip('activas', 'Activas'),
            const SizedBox(width: 6),
            _filterChip('completadas', 'Completadas'),
          ],
        ),
        const SizedBox(height: 12),

        // GPS status card
        stitchedCard(
          padding: const EdgeInsets.all(14),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Icon(Icons.gps_fixed, color: TadColors.tadGreen, size: 18),
                  const SizedBox(width: 8),
                  Text(
                    'GPS activo',
                    style: TextStyle(
                      color: TadColors.tadGreen,
                      fontWeight: FontWeight.w700,
                      fontSize: 13,
                    ),
                  ),
                ],
              ),
              Text(
                '${widget.hub.gpsPoints} puntos registrados',
                style: TextStyle(
                  color: TadColors.tadTextSecondary,
                  fontSize: 12,
                ),
              ),
            ],
          ),
        ),

        // Routes list
        if (routes.isEmpty)
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(32),
            decoration: BoxDecoration(
              color: TadColors.tadSurface,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: TadColors.tadBorder),
            ),
            child: Column(
              children: [
                Icon(Icons.route, color: TadColors.tadTextDisabled, size: 40),
                const SizedBox(height: 8),
                Text(
                  'No se encontraron rutas',
                  style: TextStyle(color: TadColors.tadTextSecondary),
                ),
              ],
            ),
          )
        else
          ...routes.map((r) => _routeCard(r)),

        const SizedBox(height: 12),

        // Sync button
        SizedBox(
          width: double.infinity,
          height: 46,
          child: OutlinedButton.icon(
            onPressed: () {
              // TODO: trigger GPS sync
            },
            style: OutlinedButton.styleFrom(
              foregroundColor: TadColors.tadYellow,
              side: BorderSide(color: TadColors.tadYellow),
            ),
            icon: const Icon(Icons.sync),
            label: const Text(
              'SINCRONIZAR GPS AHORA',
              style: TextStyle(fontWeight: FontWeight.w700, letterSpacing: 1.1),
            ),
          ),
        ),
      ],
    );
  }

  Widget _filterChip(String value, String label) {
    final sel = _filter == value;
    return InkWell(
      onTap: () => setState(() => _filter = value),
      borderRadius: BorderRadius.circular(8),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: sel ? TadColors.tadYellow.withValues(alpha: 0.15) : TadColors.tadSurface,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(
            color: sel ? TadColors.tadYellow : TadColors.tadBorder,
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: sel ? TadColors.tadYellow : TadColors.tadTextSecondary,
            fontWeight: FontWeight.w600,
            fontSize: 12,
          ),
        ),
      ),
    );
  }

  Widget _routeCard(_RouteData route) {
    final color = switch (route.status) {
      'active' => TadColors.tadGreen,
      'completed' => TadColors.tadInfo,
      _ => TadColors.tadWarning,
    };
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
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(
                  route.status == 'completed'
                      ? Icons.check_circle
                      : route.status == 'active'
                          ? Icons.directions_bus
                          : Icons.schedule,
                  color: color,
                  size: 18,
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    route.name,
                    style: TextStyle(
                      color: TadColors.tadTextPrimary,
                      fontWeight: FontWeight.w600,
                      fontSize: 14,
                    ),
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: color.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Text(
                    route.status.toUpperCase(),
                    style: TextStyle(
                      color: color,
                      fontWeight: FontWeight.w700,
                      fontSize: 10,
                    ),
                  ),
                ),
              ],
            ),
            if (route.status != 'pending') ...[
              const SizedBox(height: 10),
              ClipRRect(
                borderRadius: BorderRadius.circular(3),
                child: LinearProgressIndicator(
                  value: route.progress,
                  minHeight: 4,
                  backgroundColor: TadColors.tadBorder,
                  color: color,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                '${(route.progress * 100).toInt()}% completado',
                style: TextStyle(
                  color: TadColors.tadTextSecondary,
                  fontSize: 11,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _RouteData {
  final String id;
  final String name;
  final String status; // 'active' | 'pending' | 'completed'
  final double progress;

  _RouteData({
    required this.id,
    required this.name,
    required this.status,
    required this.progress,
  });
}

/// Settings tab — logout, password update, theme, support.
class SettingsTab extends StatelessWidget {
  final VoidCallback onLogout;

  const SettingsTab({super.key, required this.onLogout});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Configuración',
          style: TextStyle(
            color: TadColors.tadYellow,
            fontWeight: FontWeight.w800,
            fontSize: 22,
          ),
        ),
        const SizedBox(height: 16),

        _settingsSection('Cuenta', [
          _settingsTile(
            icon: Icons.lock_outline,
            title: 'Actualizar contraseña',
            subtitle: 'Cambia tu contraseña de acceso',
            onTap: () {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: const Text('Próximamente — usa la app web'),
                    backgroundColor: TadColors.tadSurface),
              );
            },
          ),
          _settingsTile(
            icon: Icons.person_outline,
            title: 'Editar perfil',
            subtitle: 'Nombre, teléfono, foto',
            onTap: () {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: const Text('Próximamente en futuras actualizaciones'),
                    backgroundColor: TadColors.tadSurface),
              );
            },
          ),
        ]),

        _settingsSection('Aplicación', [
          _settingsTile(
            icon: Icons.dark_mode_outlined,
            title: 'Tema',
            subtitle: 'Oscuro (predeterminado)',
            trailing: Icon(
              Icons.chevron_right,
              color: TadColors.tadTextSecondary,
              size: 20,
            ),
            onTap: () {},
          ),
          _settingsTile(
            icon: Icons.notifications_outlined,
            title: 'Notificaciones',
            subtitle: 'Sonido y alertas',
            trailing: Switch(
              value: true,
              onChanged: (_) {},
              activeColor: TadColors.tadYellow,
            ),
            onTap: () {},
          ),
        ]),

        _settingsSection('Soporte', [
          _settingsTile(
            icon: Icons.support_agent,
            title: 'WhatsApp Soporte',
            subtitle: 'Escríbenos directamente',
            onTap: () {
              launchUrl(
                Uri.parse('https://wa.me/18295551234?text=Hola%2C%20tengo%20una%20consulta'),
                mode: LaunchMode.externalApplication,
              );
            },
          ),
          _settingsTile(
            icon: Icons.bug_report_outlined,
            title: 'Reportar problema',
            subtitle: 'Envía un reporte al equipo técnico',
            onTap: () {
              launchUrl(
                Uri.parse('mailto:soporte@tad.do?subject=Reporte%20de%20problema%20TAD%20Driver'),
                mode: LaunchMode.externalApplication,
              );
            },
          ),
          _settingsTile(
            icon: Icons.help_outline,
            title: 'Ayuda y preguntas frecuentes',
            subtitle: 'Resuelve tus dudas',
            onTap: () {
              launchUrl(
                Uri.parse('https://tad.do/ayuda'),
                mode: LaunchMode.externalApplication,
              );
            },
          ),
        ]),

        _settingsSection('Sesión', [
          _settingsTile(
            icon: Icons.logout,
            title: 'Cerrar sesión',
            subtitle: 'Salir de tu cuenta',
            titleColor: TadColors.tadError,
            onTap: onLogout,
          ),
        ]),

        const SizedBox(height: 24),
        Center(
          child: Text(
            'TAD Driver v1.0.0',
            style: TextStyle(
              color: TadColors.tadTextDisabled,
              fontSize: 11,
            ),
          ),
        ),
      ],
    );
  }

  Widget _settingsSection(String title, List<Widget> tiles) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SizedBox(height: 16),
        Text(
          title,
          style: TextStyle(
            color: TadColors.tadTextSecondary,
            fontWeight: FontWeight.w700,
            fontSize: 12,
            letterSpacing: 1,
          ),
        ),
        const SizedBox(height: 8),
        Container(
          decoration: BoxDecoration(
            color: TadColors.tadSurface,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: TadColors.tadBorder),
          ),
          child: Column(children: tiles),
        ),
      ],
    );
  }

  Widget _settingsTile({
    required IconData icon,
    required String title,
    String? subtitle,
    Widget? trailing,
    Color? titleColor,
    VoidCallback? onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
        child: Row(
          children: [
            Icon(
              icon,
              color: titleColor ?? TadColors.tadTextSecondary,
              size: 20,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: TextStyle(
                      color: titleColor ?? TadColors.tadTextPrimary,
                      fontWeight: FontWeight.w600,
                      fontSize: 14,
                    ),
                  ),
                  if (subtitle != null)
                    Text(
                      subtitle,
                      style: TextStyle(
                        color: TadColors.tadTextSecondary,
                        fontSize: 12,
                      ),
                    ),
                ],
              ),
            ),
            if (trailing != null) trailing,
          ],
        ),
      ),
    );
  }
}

/// Wallet tab (replaces old wallet_screen for use inside dashboard).
/// Shows total calculation, Resumen / Movimientos / Configurar retiro tabs.
class WalletTab extends StatefulWidget {
  const WalletTab({super.key, required this.hub});

  final DriverHubData hub;

  @override
  State<WalletTab> createState() => _WalletTabState();
}

class _WalletTabState extends State<WalletTab> with SingleTickerProviderStateMixin {
  late final TabController _tabCtrl;

  @override
  void initState() {
    super.initState();
    _tabCtrl = TabController(length: 3, vsync: this);
  }

  @override
  void dispose() {
    _tabCtrl.dispose();
    super.dispose();
  }

  // total = pending + cleared + pendingWithdrawal
  double get _totalWallet =>
      widget.hub.balance + (widget.hub.projectedEarnings * 0.1);

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Header
        Text(
          'Billetera',
          style: TextStyle(
            color: TadColors.tadYellow,
            fontWeight: FontWeight.w800,
            fontSize: 22,
          ),
        ),
        const SizedBox(height: 12),

        // Total card
        stitchedCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'RD\$${_totalWallet.toStringAsFixed(0)}',
                style: TextStyle(
                  color: TadColors.tadTextPrimary,
                  fontSize: 36,
                  fontWeight: FontWeight.w900,
                ),
              ),
              const SizedBox(height: 4),
              const Text(
                'Total en billetera',
                style: TextStyle(color: TadColors.tadTextSecondary, fontSize: 13),
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  _walletBadge('${widget.hub.activeAds} anuncios', TadColors.tadYellow),
                  const SizedBox(width: 8),
                  _walletBadge(
                      '${widget.hub.activeSlots}/${widget.hub.maxSlots} slots', TadColors.tadGreen),
                  const SizedBox(width: 8),
                  _walletBadge(
                      'RD\$${widget.hub.projectedEarnings.toStringAsFixed(0)} proyectado',
                      TadColors.tadInfo),
                ],
              ),
            ],
          ),
        ),

        // Tabs
        Container(
          decoration: BoxDecoration(
            color: TadColors.tadSurface,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: TadColors.tadBorder),
          ),
          child: TabBar(
            controller: _tabCtrl,
            labelColor: TadColors.tadYellow,
            unselectedLabelColor: TadColors.tadTextSecondary,
            indicatorSize: TabBarIndicatorSize.tab,
            dividerColor: Colors.transparent,
            indicator: BoxDecoration(
              color: TadColors.tadYellow.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(10),
            ),
            labelStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13),
            tabs: const [
              Tab(text: 'Resumen'),
              Tab(text: 'Movimientos'),
              Tab(text: 'Retirar'),
            ],
          ),
        ),
        const SizedBox(height: 12),

        // Tab content
        SizedBox(
          height: 260,
          child: TabBarView(
            controller: _tabCtrl,
            children: [
              _tabResumen(),
              _tabMovimientos(),
              _tabRetirar(),
            ],
          ),
        ),

        // CTA
        SizedBox(
          width: double.infinity,
          height: 46,
          child: ElevatedButton.icon(
            onPressed: () => Navigator.push(
              context,
              MaterialPageRoute(
                builder: (_) => BankWizardScreen(
                      onComplete: () => Navigator.pop(context),
                      driverId: widget.hub.driverId,
                    ),
              ),
            ),
            style: ElevatedButton.styleFrom(
              backgroundColor: TadColors.tadGreen,
              foregroundColor: TadColors.black,
            ),
            icon: const Icon(Icons.account_balance),
            label: const Text(
              'CONFIGURAR BANCO',
              style: TextStyle(fontWeight: FontWeight.w700, letterSpacing: 1.1),
            ),
          ),
        ),
      ],
    );
  }

  Widget _walletBadge(String text, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        border: Border.all(color: color),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(
        text,
        style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.w700),
      ),
    );
  }

  Widget _tabResumen() {
    final adsEarning = widget.hub.activeAds.clamp(0, 15) * 500.0;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _breakdownRow('Anuncios activos (min(ads,15)×RD\$500)', 'RD\$${adsEarning.toStringAsFixed(0)}'),
        _breakdownRow('Proyectado mensual', 'RD\$${widget.hub.projectedEarnings.toStringAsFixed(0)}',
            valueColor: TadColors.tadGreen),
        _breakdownRow('Puntos GPS ganados', '${widget.hub.gpsPoints} pts'),
        const Divider(color: TadColors.tadBorder),
        _breakdownRow('Total estimado', 'RD\$${widget.hub.projectedEarnings.toStringAsFixed(0)}',
            valueColor: TadColors.tadYellow, bold: true),
      ],
    );
  }

  Widget _tabMovimientos() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.receipt_long, color: TadColors.tadTextDisabled, size: 48),
          const SizedBox(height: 8),
          Text(
            'Sin movimientos registrados',
            style: TextStyle(color: TadColors.tadTextSecondary),
          ),
        ],
      ),
    );
  }

  Widget _tabRetirar() {
    final minWithdrawal = 500.0;
    final eligible = widget.hub.balance >= minWithdrawal;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: TadColors.tadSurface,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: eligible ? TadColors.tadGreen.withValues(alpha: 0.3) : TadColors.tadWarning.withValues(alpha: 0.3),
            ),
          ),
          child: Column(
            children: [
              Text(
                'RD\$${widget.hub.balance.toStringAsFixed(0)}',
                style: TextStyle(
                  color: TadColors.tadTextPrimary,
                  fontSize: 28,
                  fontWeight: FontWeight.w900,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                eligible
                    ? '✓ Elegible para retiro'
                    : 'Mínimo RD\$500 para retirar',
                style: TextStyle(
                  color: eligible ? TadColors.tadGreen : TadColors.tadWarning,
                  fontWeight: FontWeight.w700,
                  fontSize: 13,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        SizedBox(
          width: double.infinity,
          height: 46,
          child: ElevatedButton(
            onPressed: eligible
                ? () => _showWithdrawConfirmation(context)
                : null,
            style: ElevatedButton.styleFrom(
              backgroundColor: TadColors.tadGreen,
              foregroundColor: TadColors.black,
            ),
            child: const Text(
              'SOLICITAR RETIRO',
              style: TextStyle(fontWeight: FontWeight.w700, letterSpacing: 1.2),
            ),
          ),
        ),
        if (!eligible)
          Padding(
            padding: const EdgeInsets.only(top: 8),
            child: Text(
              'Necesitas al menos RD\$500 disponibles',
              style: TextStyle(color: TadColors.tadTextSecondary, fontSize: 12),
            ),
          ),
      ],
    );
  }

  Widget _breakdownRow(String label, String value, {Color? valueColor, bool bold = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 5),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Expanded(
            child: Text(
              label,
              style: TextStyle(color: TadColors.tadTextSecondary, fontSize: 13),
            ),
          ),
          Text(
            value,
            style: TextStyle(
              fontWeight: bold ? FontWeight.w800 : FontWeight.w700,
              color: valueColor ?? TadColors.tadTextPrimary,
            ),
          ),
        ],
      ),
    );
  }

  void _showWithdrawConfirmation(BuildContext context) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: TadColors.tadSurface,
        title: Text(
          'Confirmar retiro',
          style: TextStyle(color: TadColors.tadYellow, fontWeight: FontWeight.w800),
        ),
        content: Text(
          '¿Solicitar retiro de RD\$${widget.hub.balance.toStringAsFixed(0)}?',
          style: TextStyle(color: TadColors.tadTextPrimary),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: Text('Cancelar', style: TextStyle(color: TadColors.tadTextSecondary)),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(ctx);
              // TODO: call withdraw API
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: TadColors.tadGreen,
              foregroundColor: TadColors.black,
            ),
            child: const Text('CONFIRMAR'),
          ),
        ],
      ),
    );
  }
}