import 'package:flutter/material.dart';
import '../theme/tad_theme.dart';
import '../models/hub_data.dart';
import 'bank_wizard_screen.dart';

class WalletScreen extends StatefulWidget {
  const WalletScreen({super.key});

  @override
  State<WalletScreen> createState() => _WalletScreenState();
}

class _WalletScreenState extends State<WalletScreen> {
  final _hub = const DriverHubData(balance: 3200, projectedEarnings: 8500, activeAds: 8, activeSlots: 4, maxSlots: 6);

  static const _withdrawThreshold = 5000.0;

  @override
  Widget build(BuildContext context) {
    final progress = (_hub.balance / _withdrawThreshold).clamp(0.0, 1.0);
    final breakdown = (_hub.activeAds.clamp(0, 15) * 500).toDouble();

    return Scaffold(
      backgroundColor: TadColors.tadDark,
      appBar: AppBar(
        backgroundColor: TadColors.tadDark,
        leading: IconButton(
          icon: const Text('←', style: TextStyle(color: TadColors.tadYellow, fontSize: 22)),
          onPressed: () => Navigator.pop(context),
        ),
        title: const Text('Billetera',
            style: TextStyle(color: TadColors.tadYellow, fontWeight: FontWeight.w800)),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            // Balance card
            _card(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('RD\$${_hub.balance.toStringAsFixed(0)}',
                      style: const TextStyle(
                          color: TadColors.tadTextPrimary,
                          fontSize: 36,
                          fontWeight: FontWeight.w900)),
                  const SizedBox(height: 6),
                  const Text('Balance disponible',
                      style: TextStyle(color: TadColors.tadTextSecondary, fontSize: 14)),
                  const SizedBox(height: 14),
                  Row(
                    children: [
                      _badge('${_hub.activeAds} anuncios', TadColors.tadYellow),
                      const SizedBox(width: 8),
                      _badge('${_hub.activeSlots}/${_hub.maxSlots} slots', TadColors.tadGreen),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 14),

            // Withdrawal progress
            _card(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Progreso para retiro',
                      style: TextStyle(fontWeight: FontWeight.w700, fontSize: 17)),
                  const SizedBox(height: 4),
                  const Text('Mínimo RD\$5,000 requerido para solicitar retiro',
                      style: TextStyle(color: TadColors.tadTextSecondary, fontSize: 12)),
                  const SizedBox(height: 10),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(4),
                    child: LinearProgressIndicator(
                      value: progress,
                      minHeight: 8,
                      backgroundColor: TadColors.tadBorder,
                      color: progress >= 1 ? TadColors.tadGreen : TadColors.tadYellow,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('RD\$${_hub.balance.toStringAsFixed(0)}',
                          style: const TextStyle(
                              color: TadColors.tadYellow, fontWeight: FontWeight.w700)),
                      const Text('RD\$5.000',
                          style: TextStyle(color: TadColors.tadTextSecondary, fontSize: 13)),
                    ],
                  ),
                  if (progress >= 1)
                    const Padding(
                      padding: EdgeInsets.only(top: 6),
                      child: Text('✓ Elegible para retiro',
                          style: TextStyle(color: TadColors.tadGreen, fontWeight: FontWeight.w700)),
                    ),
                ],
              ),
            ),
            const SizedBox(height: 14),

            // Earnings breakdown
            _card(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Desglose de ganancias',
                      style: TextStyle(
                          color: TadColors.tadYellow, fontWeight: FontWeight.w700, fontSize: 16)),
                  const SizedBox(height: 12),
                  _row('Min(anuncios, 15) × RD\$500',
                      'RD\$${breakdown.toStringAsFixed(0)}'),
                  const SizedBox(height: 8),
                  _row('Proyectado mensual',
                      'RD\$${_hub.projectedEarnings.toStringAsFixed(0)}',
                      valueColor: TadColors.tadGreen),
                ],
              ),
            ),
            const SizedBox(height: 22),

            // Transactions header
            const Align(
              alignment: Alignment.centerLeft,
              child: Text('Transacciones',
                  style: TextStyle(
                      color: TadColors.tadYellow,
                      fontWeight: FontWeight.w700,
                      fontSize: 18)),
            ),
            const SizedBox(height: 12),

            // Empty state
            _card(
              child: const SizedBox(
                width: double.infinity,
                child: Column(
                  children: [
                    SizedBox(
                      width: 60, height: 60,
                      child: Icon(Icons.receipt_long_outlined,
                          color: TadColors.tadTextDisabled, size: 50),
                    ),
                    SizedBox(height: 10),
                    Text('Sin transacciones registradas',
                        style: TextStyle(color: TadColors.tadTextSecondary, fontSize: 14)),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),

            // Configure bank button
            SizedBox(
              width: double.infinity,
              height: 48,
              child: ElevatedButton.icon(
                onPressed: () => Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => BankWizardScreen(
                      onComplete: () => Navigator.pop(context),
                    ),
                  ),
                ),
                icon: const Icon(Icons.account_balance, color: TadColors.black),
                label: const Text('CONFIGURAR BANCO',
                    style: TextStyle(fontWeight: FontWeight.w700, letterSpacing: 1.2)),
                style: ElevatedButton.styleFrom(
                    backgroundColor: TadColors.tadGreen, foregroundColor: TadColors.black),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _card({required Widget child}) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: TadColors.tadSurface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: TadColors.tadBorder),
      ),
      child: child,
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

  Widget _row(String label, String value, {Color? valueColor}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Expanded(child: Text(label, style: const TextStyle(color: TadColors.tadTextSecondary, fontSize: 13))),
        const SizedBox(width: 8),
        Text(value, style: TextStyle(fontWeight: FontWeight.w700, color: valueColor ?? TadColors.tadTextPrimary)),
      ],
    );
  }
}