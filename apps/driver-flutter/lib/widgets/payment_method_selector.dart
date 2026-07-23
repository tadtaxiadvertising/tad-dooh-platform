import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../services/payment_service.dart';
import 'tad_theme.dart';

class PaymentMethodSelector extends StatelessWidget {
  final PaymentMethod? selected;
  final ValueChanged<PaymentMethod> onSelected;
  final double subtotalRD;

  const PaymentMethodSelector({
    super.key,
    this.selected,
    required this.onSelected,
    required this.subtotalRD,
  });

  @override
  Widget build(BuildContext context) {
    final itbis = (subtotalRD * PaymentService.kItbisRate).round();
    final total = subtotalRD + itbis;
    final methods = PaymentMethod.values;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Monto total a pagar', style: TADTheme.headingSm),
        const SizedBox(height: 16),
        Row(
          children: [
            Expanded(
              child: _SummaryCard(
                label: 'Subtotal',
                value: 'RD\$ ${subtotalRD.toString()}',
                type: SummaryType.subtotal,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _SummaryCard(
                label: 'ITBIS 18%',
                value: 'RD\$ ${itbis.toString()}',
                type: SummaryType.itbis,
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        Container(
          width: double.infinity,
          padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 20),
          decoration: BoxDecoration(
            gradient: LinearGradient(colors: [TADTheme.yellow, TADTheme.yellow.withOpacity(0.8)]),
            borderRadius: BorderRadius.circular(20),
            boxShadow: [BoxShadow(color: TADTheme.yellow.withOpacity(0.25), blurRadius: 20, offset: const Offset(0, 8))],
          ),
          child: Text(
            'Total RD\$ ${total.toString()}',
            textAlign: TextAlign.center,
            style: const TextStyle(color: Colors.black, fontWeight: FontWeight.w800, fontSize: 20, letterSpacing: -0.5),
          ),
        ),
        const SizedBox(height: 24),
        Text('Método de pago', style: TADTheme.headingSm),
        const SizedBox(height: 8),
        Text('Elige cómo quieres pagar tu suscripción anual', style: TADTheme.bodyMuted),
        const SizedBox(height: 16),
        ...methods.map((m) => _MethodTile(
              method: m,
              selected: selected == m,
              onSelected: () => onSelected(m),
              totalRD: total,
              itbisRD: itbis,
              subtotalRD: subtotalRD,
            )),
      ],
    );
  }
}
