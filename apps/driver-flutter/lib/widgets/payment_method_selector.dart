import 'package:flutter/material.dart';
import '../theme/tad_theme.dart';

/// Selector de método de pago — pantalla pendiente del backend.
/// Reemplazará al stub cuando el módulo de pagos esté listo en el API.
class PaymentMethodSelector extends StatelessWidget {
  const PaymentMethodSelector({
    super.key,
    this.selected,
    required this.onSelected,
    required this.subtotalRD,
  });

  final dynamic selected;
  final ValueChanged<dynamic> onSelected;
  final double subtotalRD;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.payment, color: TadColors.tadTextDisabled, size: 48),
          const SizedBox(height: 16),
          Text(
            'Métodos de pago — próximo',
            style: TextStyle(color: TadColors.tadTextSecondary, fontSize: 16),
          ),
          const SizedBox(height: 8),
          Text(
            'subtotal RD\$$subtotalRD',
            style: TextStyle(color: TadColors.tadTextDisabled, fontSize: 13),
          ),
        ],
      ),
    );
  }
}