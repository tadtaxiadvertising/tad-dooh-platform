import 'package:flutter/material.dart';
import '../../theme/tad_theme.dart';

/// Pantalla de pago — pendiente del backend.
/// El módulo de pagos (Stripe/link/whatsapp) se implementará cuando
/// el backend expose los endpoints correspondientes.
class PaymentScreen extends StatelessWidget {
  const PaymentScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: TadColors.tadDark,
      appBar: AppBar(
        backgroundColor: TadColors.tadDark,
        leading: IconButton(
          icon: const Text('←', style: TextStyle(color: TadColors.tadYellow, fontSize: 22)),
          onPressed: () => Navigator.pop(context),
        ),
        title: const Text('Pagos',
            style: TextStyle(color: TadColors.tadYellow, fontWeight: FontWeight.w800)),
      ),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.payment, color: TadColors.tadTextDisabled, size: 64),
            const SizedBox(height: 16),
            const Text('Módulo de pagos',
                style: TextStyle(color: TadColors.tadTextPrimary, fontSize: 20, fontWeight: FontWeight.w700)),
            const SizedBox(height: 8),
            const Padding(
              padding: EdgeInsets.symmetric(horizontal: 32),
              child: Text(
                'Próximamente — el módulo de pagos estará disponible cuando el backend expose los endpoints de Stripe.',
                style: TextStyle(color: TadColors.tadTextSecondary, fontSize: 14),
                textAlign: TextAlign.center,
              ),
            ),
          ],
        ),
      ),
    );
  }
}