import 'package:flutter/material.dart';
import '../theme/tad_theme.dart';
import '../models/hub_data.dart';

class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key, this.onDone});

  final VoidCallback? onDone;

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  var _stage = OnboardingStage.contract;

  void _next() => setState(() {
        _stage = switch (_stage) {
          OnboardingStage.contract => OnboardingStage.bank,
          OnboardingStage.bank => OnboardingStage.payment,
          OnboardingStage.payment => OnboardingStage.ready,
          _ => _stage,
        };
      });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: TadColors.tadDark,
      body: SafeArea(
        child: LayoutBuilder(
          builder: (context, constraints) {
            if (constraints.maxWidth < 640) {
              return _mobile();
            }
            return _desktop();
          },
        ),
      ),
    );
  }

  Widget _mobile() => _content(false);

  Widget _desktop() => Row(
        children: [
          Expanded(child: _content(true)),
        ],
      );

  Widget _content(bool showSidebar) {
    final sidebar = <Widget>[];
    if (showSidebar) {
      sidebar.addAll([
        const Text('Progreso',
            style: TextStyle(color: TadColors.tadYellow, fontWeight: FontWeight.w800, fontSize: 18)),
        const SizedBox(height: 14),
        _check('Contrato',
            _stage.index > OnboardingStage.contract.index || _stage == OnboardingStage.contract),
        _check('Datos bancarios',
            _stage.index > OnboardingStage.bank.index || _stage == OnboardingStage.bank),
        _check('Pago Starter Kit',
            _stage.index > OnboardingStage.payment.index || _stage == OnboardingStage.payment),
        _check('¡Listo!', _stage == OnboardingStage.ready),
      ]);
    }

    final main = <Widget>[];
    switch (_stage) {
      case OnboardingStage.contract:
        main.add(_contractCard());
      case OnboardingStage.bank:
        main.add(_bankCard());
      case OnboardingStage.payment:
        main.add(_paymentCard());
      case OnboardingStage.ready:
        main.add(_readyCard());
    }

    final body = <Widget>[
      if (showSidebar)
        Container(
          width: 200,
          margin: const EdgeInsets.all(14),
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: TadColors.tadSurface,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: TadColors.tadBorder),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: sidebar,
          ),
        ),
      Expanded(
        child: SingleChildScrollView(
          padding: EdgeInsets.fromLTRB(showSidebar ? 8 : 16, 24, showSidebar ? 24 : 16, 24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: main,
          ),
        ),
      ),
    ];

    if (!showSidebar) {
      return Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
        child: Column(children: main),
      );
    }
    return Row(children: body);
  }

  Widget _check(String label, bool done) {
    final color = done ? TadColors.tadGreen : TadColors.tadWarning;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 5),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(6),
              border: Border.all(color: color),
            ),
            child: Text(done ? 'OK' : 'Pendiente',
                style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.w700)),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(label,
                style: TextStyle(
                    color: done ? TadColors.tadTextPrimary : TadColors.tadTextSecondary,
                    fontSize: 13)),
          ),
        ],
      ),
    );
  }

  Widget _contractCard() {
    return Container(
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
          const Text('Contrato de conductor',
              style: TextStyle(color: TadColors.tadYellow, fontWeight: FontWeight.w800, fontSize: 20)),
          const SizedBox(height: 18),
          const Text(
            'Al aceptar este contrato, usted se compromete a:\n\n'
            '1. Operar el dispositivo TAD en su vehículo de acuerdo con las normas establecidas.\n'
            '2. Mantener el servicio GPS activo durante las horas de operación.\n'
            '3. Cumplir con el pago mensual del Starter Kit (RD\$6,000).\n'
            '4. Reportar cualquier problema técnico de forma inmediata.\n'
            '5. No alterar, desmontar o manipular el equipo instalado.\n\n'
            'La violación de estos términos puede resultar en la suspensión del servicio.',
            style: TextStyle(color: TadColors.tadTextSecondary, fontSize: 14, height: 1.45),
          ),
          const SizedBox(height: 20),
          SizedBox(
            width: double.infinity,
            height: 48,
            child: ElevatedButton(
              onPressed: _next,
              style: ElevatedButton.styleFrom(
                  backgroundColor: TadColors.tadYellow, foregroundColor: TadColors.black),
              child: const Text('ACEPTAR CONTRATO',
                  style: TextStyle(fontWeight: FontWeight.w700, letterSpacing: 1.2)),
            ),
          ),
        ],
      ),
    );
  }

  Widget _bankCard() {
    return Container(
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
          const Text('Datos bancarios',
              style: TextStyle(color: TadColors.tadYellow, fontWeight: FontWeight.w800, fontSize: 20)),
          const SizedBox(height: 12),
          const Text('Configura tus datos bancarios para recibir pagos',
              style: TextStyle(color: TadColors.tadTextSecondary, fontSize: 14)),
          const SizedBox(height: 18),
          SizedBox(
            width: double.infinity,
            height: 48,
            child: OutlinedButton(
              onPressed: () {},
              style: OutlinedButton.styleFrom(
                foregroundColor: TadColors.tadYellow,
                side: const BorderSide(color: TadColors.tadYellow),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
              child: const Text('ABRIR ASISTENTE BANCARIO →',
                  style: TextStyle(fontWeight: FontWeight.w700, letterSpacing: 1)),
            ),
          ),
          const SizedBox(height: 10),
          SizedBox(
            width: double.infinity,
            height: 48,
            child: TextButton(
              onPressed: _next,
              child: const Text('OMITIR POR AHORA',
                  style: TextStyle(color: TadColors.tadTextSecondary)),
            ),
          ),
        ],
      ),
    );
  }

  Widget _paymentCard() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: TadColors.tadSurface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: TadColors.tadBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          const Text('Starter Kit — RD\$6,000',
              style: TextStyle(color: TadColors.tadYellow, fontWeight: FontWeight.w800, fontSize: 20)),
          const SizedBox(height: 16),
          const Text(
            'Para activar tu cuenta de conductor, debes realizar el pago del Starter Kit de RD\$6,000.\n\n'
            'Este pago incluye:\n'
            '• Instalación del dispositivo en tu vehículo\n'
            '• Configuración completa del sistema\n'
            '• Primer mes de servicio activo',
            style: TextStyle(color: TadColors.tadTextSecondary, fontSize: 14, height: 1.4),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 12),
          const Text('Contacta a soporte por WhatsApp para coordinar tu pago:',
              style: TextStyle(color: TadColors.tadYellow, fontSize: 13)),
          const SizedBox(height: 14),
          SizedBox(
            width: double.infinity,
            height: 48,
            child: ElevatedButton(
              onPressed: () {},
              style: ElevatedButton.styleFrom(
                  backgroundColor: TadColors.tadYellow, foregroundColor: TadColors.black),
              child: const Text('WHATSAPP SOPORTE',
                  style: TextStyle(fontWeight: FontWeight.w700, letterSpacing: 1.2)),
            ),
          ),
          const SizedBox(height: 14),
          SizedBox(
            width: double.infinity,
            height: 48,
            child: ElevatedButton(
              onPressed: _next,
              style: ElevatedButton.styleFrom(
                  backgroundColor: TadColors.tadGreen, foregroundColor: TadColors.black),
              child: const Text('VERIFICAR PAGO',
                  style: TextStyle(fontWeight: FontWeight.w700, letterSpacing: 1.1)),
            ),
          ),
        ],
      ),
    );
  }

  Widget _readyCard() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(28),
      decoration: BoxDecoration(
        color: TadColors.tadSurface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: TadColors.tadBorder),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 80,
            height: 80,
            decoration: BoxDecoration(
              color: TadColors.tadGreen.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: TadColors.tadGreen, width: 2),
            ),
            alignment: Alignment.center,
            child: const Text('✓',
                        style: TextStyle(
                            color: TadColors.tadGreen,
                            fontSize: 40,
                            fontWeight: FontWeight.w800)),
          ),
          const SizedBox(height: 18),
          const Text('¡Todo listo!',
              style: TextStyle(
                  color: TadColors.tadYellow,
                  fontWeight: FontWeight.w800,
                  fontSize: 26)),
          const SizedBox(height: 10),
          const Text(
            'Tu cuenta está completamente configurada. Ya puedes empezar a generar ganancias con TAD Driver.',
            style: TextStyle(color: TadColors.tadTextSecondary, fontSize: 14),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 22),
          SizedBox(
            width: double.infinity,
            height: 48,
            child: ElevatedButton(
              onPressed: () {
                widget.onDone?.call();
                if (mounted) Navigator.pop(context);
              },
              style: ElevatedButton.styleFrom(
                  backgroundColor: TadColors.tadYellow, foregroundColor: TadColors.black),
              child: const Text('IR AL DASHBOARD',
                  style: TextStyle(fontWeight: FontWeight.w700, letterSpacing: 1.2)),
            ),
          ),
        ],
      ),
    );
  }
}
