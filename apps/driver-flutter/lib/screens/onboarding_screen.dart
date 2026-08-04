import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import '../theme/tad_theme.dart';

// ─── Constants ────────────────────────────────────────────────────────────────

/// Precio por campaña/mes en RD$
const _earningPerCampaign = 500.0;

/// Costo Starter Kit HaaS
const _starterKitFeeRd = 6000.0;
const _starterKitItbis = (_starterKitFeeRd * 0.18); // 18% ITBIS

// ─── Benefit Cards (Step 1 – Value Pitches) ─────────────────────────────────

class BenefitCard {
  final String emoji;
  final String title;
  final String subtitle;

  const BenefitCard({
    required this.emoji,
    required this.title,
    required this.subtitle,
  });
}

const _benefits = [
  BenefitCard(
    emoji: '📺',
    title: 'Pagos por Campaña',
    subtitle: 'Recibe RD\$500 por cada anuncio que se reproduzca en tu pantalla TAD mientras trabajas.',
  ),
  BenefitCard(
    emoji: '🤝',
    title: 'Referidos de Negocios',
    subtitle: 'Invita anunciantes y gana comisión recurrente por cada cliente que referencies.',
  ),
  BenefitCard(
    emoji: '👨‍✈️',
    title: 'Invitar Compañeros',
    subtitle: 'Recomienda conductores y recibe bonificaciones mensuales por cada uno que se active.',
  ),
];

// ─── Earnings Simulator ──────────────────────────────────────────────────────

class EarningsSimulator extends StatefulWidget {
  const EarningsSimulator({super.key});

  @override
  State<EarningsSimulator> createState() => _EarningsSimulatorState();
}

class _EarningsSimulatorState extends State<EarningsSimulator> {
  int _campaigns = 5;
  int _referredAdvertisers = 0;
  int _referredDrivers = 0;

  double get _totalMonthly => (_campaigns.clamp(0, 15) * _earningPerCampaign) +
      (_referredAdvertisers * 500.0) +
      (_referredDrivers * 500.0);

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: TadColors.tadSurface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: TadColors.tadBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Simulador de Ingresos',
                style: TextStyle(
                  color: TadColors.tadYellow,
                  fontWeight: FontWeight.w700,
                  fontSize: 15,
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: TadColors.tadYellow.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  'RD\$${_totalMonthly.toStringAsFixed(0)}/mes',
                  style: TextStyle(
                    color: TadColors.tadYellow,
                    fontWeight: FontWeight.w800,
                    fontSize: 16,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 18),

          // Campaigns slider
          _sliderRow(
            label: 'Campañas activas (1–15)',
            value: _campaigns,
            min: 1,
            max: 15,
            onChanged: (v) => setState(() => _campaigns = v.round()),
            valueColor: TadColors.tadYellow,
          ),
          const SizedBox(height: 14),

          // Advertisers slider
          _sliderRow(
            label: 'Anunciantes referidos (0–10)',
            value: _referredAdvertisers,
            min: 0,
            max: 10,
            onChanged: (v) => setState(() => _referredAdvertisers = v.round()),
            valueColor: TadColors.tadGreen,
          ),
          const SizedBox(height: 14),

          // Drivers slider
          _sliderRow(
            label: 'Conductores referidos (0–10)',
            value: _referredDrivers,
            min: 0,
            max: 10,
            onChanged: (v) => setState(() => _referredDrivers = v.round()),
            valueColor: TadColors.tadInfo,
          ),

          const SizedBox(height: 16),
          const Divider(color: TadColors.tadBorder),
          const SizedBox(height: 10),

          // Breakdown
          _breakdownRow('Campañas', _campaigns, _earningPerCampaign, TadColors.tadYellow),
          _breakdownRow('Anunciantes', _referredAdvertisers, 500.0, TadColors.tadGreen),
          _breakdownRow('Conductores', _referredDrivers, 500.0, TadColors.tadInfo),
        ],
      ),
    );
  }

  Widget _sliderRow({
    required String label,
    required int value,
    required int min,
    required int max,
    required ValueChanged<double> onChanged,
    required Color valueColor,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              label,
              style: TextStyle(color: TadColors.tadTextSecondary, fontSize: 13),
            ),
            Text(
              '$value',
              style: TextStyle(
                color: valueColor,
                fontWeight: FontWeight.w700,
                fontSize: 14,
              ),
            ),
          ],
        ),
        SliderTheme(
          data: SliderThemeData(
            activeTrackColor: valueColor,
            inactiveTrackColor: TadColors.tadBorder,
            thumbColor: valueColor,
            overlayColor: valueColor.withValues(alpha: 0.2),
          ),
          child: Slider(
            value: value.toDouble(),
            min: min.toDouble(),
            max: max.toDouble(),
            divisions: max - min,
            onChanged: onChanged,
          ),
        ),
      ],
    );
  }

  Widget _breakdownRow(String label, int count, double unit, Color color) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            '$label (${count}×RD\$${unit.toStringAsFixed(0)})',
            style: TextStyle(color: TadColors.tadTextSecondary, fontSize: 12),
          ),
          Text(
            'RD\$${(count * unit).toStringAsFixed(0)}',
            style: TextStyle(
              color: color,
              fontWeight: FontWeight.w700,
              fontSize: 12,
            ),
          ),
        ],
      ),
    );
  }
}

// ─── HaaS Membership Card ─────────────────────────────────────────────────────

class HaaSMembershipCard extends StatelessWidget {
  const HaaSMembershipCard({super.key});

  @override
  Widget build(BuildContext context) {
    final total = _starterKitFeeRd + _starterKitItbis;

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: TadColors.tadSurface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: TadColors.tadYellow.withValues(alpha: 0.4)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: TadColors.tadYellow.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  'HaaS v2.0',
                  style: TextStyle(
                    color: TadColors.tadYellow,
                    fontWeight: FontWeight.w800,
                    fontSize: 12,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Text(
                'Hardware as a Service',
                style: TextStyle(
                  color: TadColors.tadTextSecondary,
                  fontSize: 12,
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          Text(
            'Starter Kit — RD\$${_starterKitFeeRd.toStringAsFixed(0)}/año',
            style: TextStyle(
              color: TadColors.tadTextPrimary,
              fontWeight: FontWeight.w800,
              fontSize: 20,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            'Incluye ITBIS 18% (RD\$${_starterKitItbis.toStringAsFixed(0)}) = '
            'RD\$${total.toStringAsFixed(0)} facturado',
            style: TextStyle(
              color: TadColors.tadTextSecondary,
              fontSize: 12,
            ),
          ),
          const SizedBox(height: 14),
          const Text(
            'Este pago incluye:',
            style: TextStyle(
              color: TadColors.tadTextPrimary,
              fontWeight: FontWeight.w600,
              fontSize: 13,
            ),
          ),
          const SizedBox(height: 6),
          ...[
            'Tablet TAD instalada en tu vehículo',
            'Cableado y soporte de instalación',
            'Acceso a plataforma de monitoreo',
            'Soporte técnico incluido',
            'Seguro contra robo y averías',
          ].map(
            (item) => Padding(
              padding: const EdgeInsets.symmetric(vertical: 2),
              child: Row(
                children: [
                  Icon(Icons.check_circle, color: TadColors.tadGreen, size: 14),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      item,
                      style: TextStyle(
                        color: TadColors.tadTextSecondary,
                        fontSize: 13,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ─── Benefit Cards Row (Step 1) ───────────────────────────────────────────────

class BenefitCards extends StatelessWidget {
  const BenefitCards({super.key});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          '¿Cómo ganas con TAD?',
          style: TextStyle(
            color: TadColors.tadYellow,
            fontWeight: FontWeight.w800,
            fontSize: 18,
          ),
        ),
        const SizedBox(height: 12),
        ..._benefits.map(
          (b) => Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: Container(
              width: double.infinity,
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: TadColors.tadSurface,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: TadColors.tadBorder),
              ),
              child: Row(
                children: [
                  Text(b.emoji, style: const TextStyle(fontSize: 28)),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          b.title,
                          style: TextStyle(
                            color: TadColors.tadTextPrimary,
                            fontWeight: FontWeight.w700,
                            fontSize: 14,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          b.subtitle,
                          style: TextStyle(
                            color: TadColors.tadTextSecondary,
                            fontSize: 12,
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
      ],
    );
  }
}

// ─── Fleet Profile Step ──────────────────────────────────────────────────────

class FleetProfileStep extends StatelessWidget {
  final VoidCallback onAddVehicle;
  final VoidCallback onAddDriver;
  final VoidCallback onCreateAdvertiser;

  const FleetProfileStep({
    super.key,
    required this.onAddVehicle,
    required this.onAddDriver,
    required this.onCreateAdvertiser,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Perfil de flota',
          style: TextStyle(
            color: TadColors.tadYellow,
            fontWeight: FontWeight.w800,
            fontSize: 20,
          ),
        ),
        const SizedBox(height: 8),
        Text(
          'Gestiona vehículos, conductores y crea tu cuenta de anunciante.',
          style: TextStyle(
            color: TadColors.tadTextSecondary,
            fontSize: 14,
          ),
        ),
        const SizedBox(height: 20),
        _fleetItem(
          emoji: '🚕',
          title: 'Agregar vehículo',
          subtitle: 'Registra un nuevo vehículo a tu cuenta',
          onTap: onAddVehicle,
        ),
        const SizedBox(height: 10),
        _fleetItem(
          emoji: '👨‍✈️',
          title: 'Agregar conductor',
          subtitle: 'Vincula un conductor a tu flota',
          onTap: onAddDriver,
        ),
        const SizedBox(height: 10),
        _fleetItem(
          emoji: '📺',
          title: 'Crear cuenta anunciante',
          subtitle: 'Crea tu cuenta de anunciante para gestionar campañas',
          onTap: onCreateAdvertiser,
          highlighted: true,
        ),
      ],
    );
  }

  Widget _fleetItem({
    required String emoji,
    required String title,
    required String subtitle,
    required VoidCallback onTap,
    bool highlighted = false,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(10),
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: highlighted
              ? TadColors.tadYellow.withValues(alpha: 0.08)
              : TadColors.tadSurface,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
            color: highlighted
                ? TadColors.tadYellow.withValues(alpha: 0.4)
                : TadColors.tadBorder,
          ),
        ),
        child: Row(
          children: [
            Text(emoji, style: const TextStyle(fontSize: 26)),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: TextStyle(
                      color: highlighted
                          ? TadColors.tadYellow
                          : TadColors.tadTextPrimary,
                      fontWeight: FontWeight.w700,
                      fontSize: 14,
                    ),
                  ),
                  const SizedBox(height: 2),
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
            Icon(
              Icons.chevron_right,
              color: highlighted
                  ? TadColors.tadYellow
                  : TadColors.tadTextSecondary,
            ),
          ],
        ),
      ),
    );
  }
}

// ─── Hardware Pairing Step ────────────────────────────────────────────────────

enum PairingState { idle, scanning, paired, error }

class HardwarePairingStep extends StatefulWidget {
  const HardwarePairingStep({super.key});

  @override
  State<HardwarePairingStep> createState() => _HardwarePairingStepState();
}

class _HardwarePairingStepState extends State<HardwarePairingStep> {
  PairingState _state = PairingState.idle;
  final _pinCtrl = TextEditingController();
  String? _error;

  @override
  void dispose() {
    _pinCtrl.dispose();
    super.dispose();
  }

  Future<void> _startScan() async {
    final result = await showModalBottomSheet<String>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => Container(
        height: MediaQuery.of(context).size.height * 0.7,
        decoration: BoxDecoration(
          color: TadColors.tadDark,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
        ),
        child: Column(
          children: [
            const SizedBox(height: 12),
            Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: TadColors.tadBorder,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const SizedBox(height: 24),
            Text(
              'Escanear QR del dispositivo',
              style: TextStyle(
                color: TadColors.tadYellow,
                fontWeight: FontWeight.w800,
                fontSize: 18,
              ),
            ),
            const SizedBox(height: 24),
            Expanded(
              child: ClipRRect(
                borderRadius: BorderRadius.circular(16),
                child: MobileScanner(
                  onDetect: (capture) {
                    final List<Barcode> barcodes = capture.barcodes;
                    if (barcodes.isNotEmpty) {
                      Navigator.pop(context, barcodes.first.rawValue);
                    }
                  },
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(24),
              child: Text(
                'Apunta la cámara al código QR que se muestra en la pantalla TAD.',
                textAlign: TextAlign.center,
                style: TextStyle(color: TadColors.tadTextSecondary, fontSize: 13),
              ),
            ),
          ],
        ),
      ),
    );

    if (result != null && mounted) {
      // Pin from QR usually comes in a format like "TAD-123456"
      final pin = result.contains('-') ? result.split('-').last : result;
      if (pin.length == 6 && int.tryParse(pin) != null) {
        _pinCtrl.text = pin;
        await _submitPin();
      } else {
        setState(() => _error = 'Código QR inválido ($result)');
      }
    }
  }

  Future<void> _submitPin() async {
    final pin = _pinCtrl.text.trim();
    if (pin.length != 6) {
      setState(() => _error = 'El PIN debe tener 6 dígitos');
      return;
    }
    setState(() {
      _state = PairingState.paired;
      _error = null;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Vincular dispositivo',
          style: TextStyle(
            color: TadColors.tadYellow,
            fontWeight: FontWeight.w800,
            fontSize: 20,
          ),
        ),
        const SizedBox(height: 8),
        Text(
          'Escanea el código QR del emisor TAD o ingresa el PIN de 6 dígitos.',
          style: TextStyle(color: TadColors.tadTextSecondary, fontSize: 14),
        ),
        const SizedBox(height: 20),

        // QR scan button
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: TadColors.tadSurface,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: TadColors.tadBorder),
          ),
          child: Column(
            children: [
              Icon(
                _state == PairingState.paired
                    ? Icons.check_circle
                    : Icons.qr_code_scanner,
                color: _state == PairingState.paired
                    ? TadColors.tadGreen
                    : TadColors.tadYellow,
                size: 56,
              ),
              const SizedBox(height: 12),
              if (_state == PairingState.scanning)
                Column(
                  children: [
                    CircularProgressIndicator(
                      strokeWidth: 2,
                      color: TadColors.tadYellow,
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Buscando dispositivo...',
                      style: TextStyle(
                        color: TadColors.tadTextSecondary,
                        fontSize: 13,
                      ),
                    ),
                  ],
                )
              else if (_state == PairingState.paired)
                Text(
                  'Dispositivo vinculado',
                  style: TextStyle(
                    color: TadColors.tadGreen,
                    fontWeight: FontWeight.w700,
                  ),
                )
              else
                Text(
                  'Escanea el código QR del emisor',
                  style: TextStyle(
                    color: TadColors.tadTextSecondary,
                    fontSize: 13,
                  ),
                ),
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                height: 44,
                child: ElevatedButton(
                  onPressed: _state == PairingState.scanning ? null : _startScan,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: TadColors.tadYellow,
                    foregroundColor: TadColors.black,
                  ),
                  child: Text(
                    _state == PairingState.scanning ? 'ESCANEANDO...' : 'ESCANEAR QR',
                    style: TextStyle(fontWeight: FontWeight.w700, letterSpacing: 1.1),
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),

        // Divider
        Row(
          children: [
            Expanded(child: Divider(color: TadColors.tadBorder)),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12),
              child: Text(
                'o',
                style: TextStyle(color: TadColors.tadTextDisabled),
              ),
            ),
            Expanded(child: Divider(color: TadColors.tadBorder)),
          ],
        ),
        const SizedBox(height: 16),

        // PIN fallback
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: TadColors.tadSurface,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: TadColors.tadBorder),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Código PIN manual',
                style: TextStyle(
                  color: TadColors.tadTextPrimary,
                  fontWeight: FontWeight.w700,
                  fontSize: 14,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                'Si el QR no funciona, ingresa el PIN de 6 dígitos del dispositivo.',
                style: TextStyle(
                  color: TadColors.tadTextSecondary,
                  fontSize: 12,
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _pinCtrl,
                keyboardType: TextInputType.number,
                maxLength: 6,
                style: TextStyle(
                  color: TadColors.tadTextPrimary,
                  fontSize: 20,
                  letterSpacing: 8,
                  fontWeight: FontWeight.w700,
                ),
                textAlign: TextAlign.center,
                decoration: InputDecoration(
                  hintText: '• • • • • •',
                  hintStyle: TextStyle(
                    color: TadColors.tadTextDisabled,
                    letterSpacing: 8,
                  ),
                  counterText: '',
                ),
                onChanged: (_) {
                  if (_error != null) setState(() => _error = null);
                },
              ),
              if (_error != null) ...[
                const SizedBox(height: 6),
                Text(
                  _error!,
                  style: TextStyle(color: TadColors.tadError, fontSize: 12),
                ),
              ],
              const SizedBox(height: 10),
              SizedBox(
                width: double.infinity,
                height: 44,
                child: OutlinedButton(
                  onPressed: _submitPin,
                  style: OutlinedButton.styleFrom(
                    foregroundColor: TadColors.tadYellow,
                    side: BorderSide(color: TadColors.tadYellow),
                  ),
                  child: Text(
                    'VINCULAR CON PIN',
                    style: TextStyle(fontWeight: FontWeight.w700, letterSpacing: 1.1),
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),

        // Connection status
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: TadColors.tadSurface,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: TadColors.tadBorder),
          ),
          child: Row(
            children: [
              Container(
                width: 10,
                height: 10,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: _state == PairingState.paired
                      ? TadColors.tadGreen
                      : TadColors.tadWarning,
                ),
              ),
              const SizedBox(width: 10),
              Text(
                _state == PairingState.paired
                    ? 'Dispositivo conectado'
                    : 'Sin dispositivo vinculado',
                style: TextStyle(
                  color: _state == PairingState.paired
                      ? TadColors.tadGreen
                      : TadColors.tadWarning,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

// ─── Main OnboardingScreen ────────────────────────────────────────────────────

class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key, this.onDone});

  final VoidCallback? onDone;

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  // Stage 1: Welcome/Benefits
  // Stage 2: Earnings Simulator
  // Stage 3: Contract
  // Stage 4: Fleet Profile
  // Stage 5: Hardware Pairing
  // Stage 6: Bank Data
  // Stage 7: Payment
  // Stage 8: Ready
  int _step = 1;
  static const _totalSteps = 8;

  // Contract acceptance
  bool _contractAccepted = false;

  void _next() {
    if (_step < _totalSteps) {
      setState(() => _step++);
    } else {
      widget.onDone?.call();
    }
  }

  void _showComingSoon(String feature) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('$feature — coming soon'),
        backgroundColor: TadColors.tadSurface,
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  void _prev() {
    if (_step > 1) setState(() => _step--);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: TadColors.tadDark,
      body: SafeArea(
        child: Column(
          children: [
            // Header with step indicator
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
              child: Row(
                children: [
                  IconButton(
                    icon: Text('←', style: TextStyle(color: TadColors.tadYellow, fontSize: 22)),
                    onPressed: _step > 1 ? _prev : null,
                  ),
                  Expanded(
                    child: Column(
                      children: [
                        LinearProgressIndicator(
                          value: _step / _totalSteps,
                          backgroundColor: TadColors.tadBorder,
                          color: TadColors.tadYellow,
                          minHeight: 3,
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Paso $_step de $_totalSteps',
                          style: TextStyle(
                            color: TadColors.tadTextSecondary,
                            fontSize: 11,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 48), // balance the back button
                ],
              ),
            ),

            // Content
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _stepContent(),
                  ],
                ),
              ),
            ),

            // Bottom CTA
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
              child: SizedBox(
                width: double.infinity,
                height: 48,
                child: ElevatedButton(
                  onPressed: _canProceed ? _next : null,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: TadColors.tadYellow,
                    foregroundColor: TadColors.black,
                  ),
                  child: Text(
                    _stepLabel,
                    style: TextStyle(fontWeight: FontWeight.w700, letterSpacing: 1.2),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  bool get _canProceed {
    return switch (_step) {
      3 => _contractAccepted, // Contract step requires acceptance
      _ => true,
    };
  }

  String get _stepLabel => switch (_step) {
    1 => 'CONOCER MIS BENEFICIOS →',
    2 => 'VER SIMULADOR →',
    3 => 'ACEPTAR CONTRATO →',
    4 => 'CONFIGURAR PERFIL →',
    5 => 'VINCULAR DISPOSITIVO →',
    6 => 'CONFIGURAR BANCO →',
    7 => 'REALIZAR PAGO →',
    _ => 'IR AL DASHBOARD',
  };

  Widget _stepContent() {
    return switch (_step) {
      1 => _stepBenefits(),
      2 => _stepSimulator(),
      3 => _stepContract(),
      4 => _stepFleetProfile(),
      5 => _stepHardwarePairing(),
      6 => _stepBank(),
      7 => _stepPayment(),
      _ => _stepReady(),
    };
  }

  Widget _stepBenefits() => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Text('¡Bienvenido a TAD!', style: TextStyle(
        color: TadColors.tadYellow, fontWeight: FontWeight.w900, fontSize: 28)),
      const SizedBox(height: 8),
      Text('Descubre cómo puedes generar ingresos extras mientras trabajas.',
        style: TextStyle(color: TadColors.tadTextSecondary, fontSize: 15)),
      const SizedBox(height: 24),
      const BenefitCards(),
    ],
  );

  Widget _stepSimulator() => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Text('Calcula tus ingresos', style: TextStyle(
        color: TadColors.tadYellow, fontWeight: FontWeight.w800, fontSize: 24)),
      const SizedBox(height: 6),
      Text('Usa los deslizadores para estimar tus ganancias mensuales.',
        style: TextStyle(color: TadColors.tadTextSecondary, fontSize: 14)),
      const SizedBox(height: 20),
      const EarningsSimulator(),
      const SizedBox(height: 16),
      const HaaSMembershipCard(),
    ],
  );

  Widget _stepContract() => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Text('Contrato de conductor', style: TextStyle(
        color: TadColors.tadYellow, fontWeight: FontWeight.w800, fontSize: 22)),
      const SizedBox(height: 16),
      Container(
        width: double.infinity,
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: TadColors.tadSurface,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: TadColors.tadBorder),
        ),
        child: SingleChildScrollView(
          child: Text(
            'Al aceptar este contrato, usted se compromete a:\n\n'
            '1. Operar el dispositivo TAD en su vehículo de acuerdo con las normas establecidas.\n'
            '2. Mantener el servicio GPS activo durante las horas de operación.\n'
            '3. Cumplir con el pago mensual del Starter Kit (RD\$6,000 + ITBIS).\n'
            '4. Reportar cualquier problema técnico de forma inmediata.\n'
            '5. No alterar, desmontar o manipular el equipo instalado.\n'
            '6. Aceptar los términos del programa HaaS (Hardware as a Service) versión 2.0.\n\n'
            'La violación de estos términos puede resultar en la suspensión del servicio.',
            style: TextStyle(color: TadColors.tadTextSecondary, fontSize: 13, height: 1.5),
          ),
        ),
      ),
      const SizedBox(height: 16),
      InkWell(
        onTap: () => setState(() => _contractAccepted = !_contractAccepted),
        child: Row(
          children: [
            Checkbox(
              value: _contractAccepted,
              onChanged: (v) => setState(() => _contractAccepted = v ?? false),
              activeColor: TadColors.tadYellow,
            ),
            Expanded(
              child: Text(
                'He leído y acepto los términos del contrato HaaS v2.0',
                style: TextStyle(
                  color: _contractAccepted
                      ? TadColors.tadTextPrimary
                      : TadColors.tadTextSecondary,
                  fontSize: 13,
                ),
              ),
            ),
          ],
        ),
      ),
      const SizedBox(height: 10),
      TextButton(
        onPressed: () => setState(() => _contractAccepted = false),
        child: Text('Omitir por ahora', style: TextStyle(color: TadColors.tadTextSecondary)),
      ),
    ],
  );

  Widget _stepFleetProfile() => FleetProfileStep(
    onAddVehicle: () => _showComingSoon('Agregar vehículo'),
    onAddDriver: () => _showComingSoon('Agregar conductor'),
    onCreateAdvertiser: () => _showComingSoon('Crear cuenta anunciante'),
  );

  Widget _stepHardwarePairing() => const HardwarePairingStep();

  Widget _stepBank() => Container(
    width: double.infinity,
    padding: const EdgeInsets.all(24),
    decoration: BoxDecoration(
      color: TadColors.tadSurface,
      borderRadius: BorderRadius.circular(12),
      border: Border.all(color: TadColors.tadBorder),
    ),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Datos bancarios', style: TextStyle(
          color: TadColors.tadYellow, fontWeight: FontWeight.w800, fontSize: 20)),
        const SizedBox(height: 12),
        Text('Configura tus datos bancarios para recibir pagos',
          style: TextStyle(color: TadColors.tadTextSecondary, fontSize: 14)),
        const SizedBox(height: 18),
        SizedBox(
          width: double.infinity,
          height: 44,
          child: OutlinedButton(
            onPressed: () {},
            style: OutlinedButton.styleFrom(
              foregroundColor: TadColors.tadYellow,
              side: BorderSide(color: TadColors.tadYellow),
            ),
            child: Text('ABRIR ASISTENTE BANCARIO →',
              style: TextStyle(fontWeight: FontWeight.w700)),
          ),
        ),
        const SizedBox(height: 10),
        Center(
          child: TextButton(
            onPressed: _next,
            child: Text('OMITIR POR AHORA',
              style: TextStyle(color: TadColors.tadTextSecondary)),
          ),
        ),
      ],
    ),
  );

  Widget _stepPayment() => Container(
    width: double.infinity,
    padding: const EdgeInsets.all(24),
    decoration: BoxDecoration(
      color: TadColors.tadSurface,
      borderRadius: BorderRadius.circular(12),
      border: Border.all(color: TadColors.tadBorder),
    ),
    child: Column(
      children: [
        Text('Starter Kit — RD\$$_starterKitFeeRd', style: TextStyle(
          color: TadColors.tadYellow, fontWeight: FontWeight.w800, fontSize: 22)),
        const SizedBox(height: 12),
        const HaaSMembershipCard(),
        const SizedBox(height: 16),
        SizedBox(
          width: double.infinity,
          height: 44,
          child: ElevatedButton(
            onPressed: () {},
            style: ElevatedButton.styleFrom(
              backgroundColor: TadColors.tadYellow,
              foregroundColor: TadColors.black,
            ),
            child: Text('WHATSAPP SOPORTE',
              style: TextStyle(fontWeight: FontWeight.w700, letterSpacing: 1.1)),
          ),
        ),
        const SizedBox(height: 10),
        SizedBox(
          width: double.infinity,
          height: 44,
          child: OutlinedButton(
            onPressed: _next,
            style: OutlinedButton.styleFrom(
              foregroundColor: TadColors.tadGreen,
              side: BorderSide(color: TadColors.tadGreen),
            ),
            child: Text('YA REALICÉ EL PAGO',
              style: TextStyle(fontWeight: FontWeight.w700, letterSpacing: 1.1)),
          ),
        ),
      ],
    ),
  );

  Widget _stepReady() => Container(
    width: double.infinity,
    padding: const EdgeInsets.all(28),
    decoration: BoxDecoration(
      color: TadColors.tadSurface,
      borderRadius: BorderRadius.circular(12),
      border: Border.all(color: TadColors.tadGreen.withValues(alpha: 0.4)),
    ),
    child: Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Container(
          width: 80, height: 80,
          decoration: BoxDecoration(
            color: TadColors.tadGreen.withValues(alpha: 0.15),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: TadColors.tadGreen, width: 2),
          ),
          alignment: Alignment.center,
          child: Icon(Icons.check, color: TadColors.tadGreen, size: 40),
        ),
        const SizedBox(height: 18),
        Text('¡Todo listo!', style: TextStyle(
          color: TadColors.tadYellow, fontWeight: FontWeight.w800, fontSize: 26)),
        const SizedBox(height: 10),
        Text(
          'Tu cuenta está completamente configurada. Ya puedes empezar a generar ganancias con TAD Driver.',
          style: TextStyle(color: TadColors.tadTextSecondary, fontSize: 14),
          textAlign: TextAlign.center,
        ),
      ],
    ),
  );
}