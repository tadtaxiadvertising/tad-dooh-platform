import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/di/providers.dart';
import '../../theme/tad_theme.dart';
import '../../models/hub_data.dart';

enum OnboardingStage { contract, bank, payment, starterKit, ready }

/// Flujo de onboarding del conductor: contrato → banco → pago → listo.
class OnboardingFlowScreen extends StatefulWidget {
  const OnboardingFlowScreen({super.key, required this.onComplete});

  final VoidCallback onComplete;

  @override
  State<OnboardingFlowScreen> createState() => _OnboardingFlowScreenState();
}

class _OnboardingFlowScreenState extends State<OnboardingFlowScreen> {
  late OnboardingStage _stage;
  bool _contractAccepted = false;
  bool _loading = false;

  @override
  void initState() {
    super.initState();
    _resolveStage();
  }

  Future<void> _resolveStage() async {
    final hub = await fetchHub();
    if (!mounted) return;
    if (hub == null) {
      setState(() => _stage = OnboardingStage.contract);
      return;
    }
    if (!hub.contractAccepted) {
      setState(() => _stage = OnboardingStage.contract);
    } else if (!hub.bankAccountConfigured) {
      setState(() => _stage = OnboardingStage.bank);
    } else if (!hub.subscriptionPaid) {
      setState(() => _stage = OnboardingStage.payment);
    } else {
      widget.onComplete();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: TadColors.tadDark,
      appBar: AppBar(
        backgroundColor: TadColors.tadDark,
        leading: IconButton(
          icon: const Text('×', style: TextStyle(color: TadColors.tadTextSecondary, fontSize: 28)),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text(_stageTitle,
            style: const TextStyle(color: TadColors.tadYellow, fontWeight: FontWeight.w700)),
      ),
      body:
          _loading
              ? const Center(child: CircularProgressIndicator(color: TadColors.tadGreen))
              : SingleChildScrollView(padding: const EdgeInsets.all(24), child: _body()),
    );
  }

  String get _stageTitle {
    switch (_stage) {
      case OnboardingStage.contract: return 'Contrato TAD';
      case OnboardingStage.bank: return 'Cuenta bancaria';
      case OnboardingStage.payment: return 'Pago membresía';
      case OnboardingStage.starterKit: return 'Starter Kit';
      case OnboardingStage.ready: return 'Listo';
    }
  }

  Widget _body() {
    return switch (_stage) {
      OnboardingStage.contract => _contractBody(),
      OnboardingStage.bank => _bankBody(),
      OnboardingStage.payment => _paymentBody(),
      OnboardingStage.starterKit => _starterKitBody(),
      OnboardingStage.ready => const SizedBox(),
    };
  }

  Widget _contractBody() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: TadColors.tadSurface,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: TadColors.tadBorder),
          ),
          child: const Text(
            'CONTRATO DE PRESTACIÓN DE SERVICIOS TAD v2.0\n\n'
            'El conductor acepta reproducir publicidad en su vehículo durante un mínimo de 8 horas diarias. '
            'El servicio TAD provee la tablet, instalación y mantenimiento incluido en la membresía anual de RD\$6,000.\n\n'
            'El conductor recibe RD\$500 por cada anuncio mostrado (tope 15 anuncios/día) más RD\$500 por cada referido que se registre.',
            style: TextStyle(color: TadColors.tadTextSecondary, fontSize: 13, height: 1.6),
          ),
        ),
        const SizedBox(height: 20),
        Row(children: [
          Checkbox(
            value: _contractAccepted,
            onChanged: (v) => setState(() => _contractAccepted = v ?? false),
            activeColor: TadColors.tadYellow,
          ),
          const Expanded(
            child: Text(
              'Acepto los términos y condiciones del Contrato TAD v2.0',
              style: TextStyle(color: TadColors.tadTextSecondary, fontSize: 13),
            ),
          ),
        ]),
        const SizedBox(height: 24),
        SizedBox(
          width: double.infinity,
          height: 50,
          child: ElevatedButton(
            onPressed: _contractAccepted ? _submitContract : null,
            style: ElevatedButton.styleFrom(
              backgroundColor: TadColors.tadYellow,
              foregroundColor: TadColors.black,
              disabledBackgroundColor: TadColors.tadBorder,
            ),
            child: const Text('FIRMAR CONTRATO',
                style: TextStyle(fontWeight: FontWeight.w700, letterSpacing: 1.2)),
          ),
        ),
      ],
    );
  }

  Widget _bankBody() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Configura tu cuenta bancaria para recibir pagos.',
            style: TextStyle(color: TadColors.tadTextSecondary, fontSize: 14)),
        const SizedBox(height: 20),
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: TadColors.tadSurface,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: TadColors.tadBorder),
          ),
          child: const Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Próximamente',
                  style: TextStyle(color: TadColors.tadYellow, fontWeight: FontWeight.w700, fontSize: 16)),
              SizedBox(height: 8),
              Text('El formulario de registro bancario estará disponible en la próxima actualización.',
                  style: TextStyle(color: TadColors.tadTextSecondary, fontSize: 13)),
            ],
          ),
        ),
        const SizedBox(height: 24),
        SizedBox(
          width: double.infinity,
          height: 50,
          child: OutlinedButton(
            onPressed: () => setState(() => _stage = OnboardingStage.payment),
            style: OutlinedButton.styleFrom(
              side: const BorderSide(color: TadColors.tadYellow),
              foregroundColor: TadColors.tadYellow,
            ),
            child: const Text('CONFIGURAR DESPUÉS',
                style: TextStyle(fontWeight: FontWeight.w700, letterSpacing: 1.2)),
          ),
        ),
      ],
    );
  }

  Widget _paymentBody() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: TadColors.tadSurface,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: TadColors.tadBorder),
          ),
          child: const Column(children: [
            Icon(Icons.credit_card, color: TadColors.tadYellow, size: 40),
            SizedBox(height: 12),
            Text('Membresía anual TAD',
                style: TextStyle(color: TadColors.tadTextPrimary, fontWeight: FontWeight.w700, fontSize: 18)),
            SizedBox(height: 8),
            Text('RD\$6,000 / año',
                style: TextStyle(color: TadColors.tadYellow, fontWeight: FontWeight.w800, fontSize: 28)),
            SizedBox(height: 8),
            Text('RD\$500 / mes',
                style: TextStyle(color: TadColors.tadTextSecondary, fontSize: 14)),
          ]),
        ),
        const SizedBox(height: 24),
        SizedBox(
          width: double.infinity,
          height: 50,
          child: ElevatedButton.icon(
            onPressed: () => _contactWhatsApp(),
            icon: const Icon(Icons.chat, color: TadColors.black),
            label: const Text('CONTACTAR POR WHATSAPP',
                style: TextStyle(fontWeight: FontWeight.w700, letterSpacing: 1.2)),
            style: ElevatedButton.styleFrom(
              backgroundColor: TadColors.tadGreen,
              foregroundColor: TadColors.black,
            ),
          ),
        ),
      ],
    );
  }

  Widget _starterKitBody() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: TadColors.tadSurface,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: TadColors.tadBorder),
          ),
          child: const Column(children: [
            Icon(Icons.tablet_android, color: TadColors.tadYellow, size: 40),
            SizedBox(height: 12),
            Text('Starter Kit',
                style: TextStyle(color: TadColors.tadTextPrimary, fontWeight: FontWeight.w700, fontSize: 18)),
            SizedBox(height: 8),
            Text('Próximamente — el kit incluye tablet + instalación.',
                style: TextStyle(color: TadColors.tadTextSecondary, fontSize: 13)),
          ]),
        ),
        const SizedBox(height: 24),
        SizedBox(
          width: double.infinity,
          height: 50,
          child: ElevatedButton(
            onPressed: widget.onComplete,
            style: ElevatedButton.styleFrom(
              backgroundColor: TadColors.tadGreen,
              foregroundColor: TadColors.black,
            ),
            child: const Text('COMENZAR',
                style: TextStyle(fontWeight: FontWeight.w700, letterSpacing: 1.2)),
          ),
        ),
      ],
    );
  }

  Future<void> _submitContract() async {
    setState(() => _loading = true);
    try {
      // TODO: POST /api/v1/drivers/{id}/accept-agreement
      await Future.delayed(const Duration(milliseconds: 600));
      setState(() { _loading = false; _stage = OnboardingStage.bank; });
    } catch (e) {
      setState(() => _loading = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Error al firmar contrato'),
            backgroundColor: TadColors.tadError,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    }
  }

  Future<void> _contactWhatsApp() async {
    final uri = Uri.parse('https://wa.me/18095551234?text=Hola%2C%20deseo%20activar%20mi%20membresía%20TAD');
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }
}