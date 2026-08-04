import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter/material.dart';
import '../../core/di/providers.dart';
import '../../services/hub_service.dart';
import '../../theme/tad_theme.dart';
import '../../models/hub_data.dart';

/// Wallet con la fórmula oficial de ganancias:
/// E = min(Ads,15) × 500 + CPA × 500
/// (RD$500 por anuncio activo, tope de 15, y RD$500 por cada referido)
class WalletScreenV2 extends ConsumerStatefulWidget {
  const WalletScreenV2({super.key, this.hub});

  final DriverHubData? hub;

  @override
  ConsumerState<WalletScreenV2> createState() => _WalletScreenV2State();
}

class _WalletScreenV2State extends ConsumerState<WalletScreenV2> {
  DriverHubData? _hub;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _hub = widget.hub;
    _loadHub();
  }

  Future<void> _loadHub() async {
    final fresh = await ref.read(hubServiceProvider).fetchHub();
    if (fresh != null && mounted) {
      setState(() { _hub = fresh; _loading = false; });
    } else if (mounted) {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return Scaffold(
        backgroundColor: TadColors.tadDark,
        appBar: AppBar(backgroundColor: TadColors.tadDark, title: _title('Billetera')),
        body: const Center(child: CircularProgressIndicator(color: TadColors.tadGreen)),
      );
    }

    if (_hub == null) {
      return Scaffold(
        backgroundColor: TadColors.tadDark,
        appBar: AppBar(backgroundColor: TadColors.tadDark, title: _title('Billetera')),
        body: const Center(
          child: Text('No se pudo cargar la billetera',
              style: TextStyle(color: TadColors.tadTextSecondary)),
        ),
      );
    }

    final d = _hub!;
    final activeAds = (d.activeAds).clamp(0, 15);
    final baseEarnings = activeAds * 500.0;
    final referralTotal = d.referralEarnings + d.advertiserReferralEarnings;
    final penaltyAmount = d.penaltyApplied ? d.penaltyAmount : 0.0;

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
        child: Column(children: [
          // Balance card
          _card([
            Text('RD\$${d.balance.toStringAsFixed(0)}',
                style: const TextStyle(
                    color: TadColors.tadTextPrimary, fontSize: 38, fontWeight: FontWeight.w900)),
            const SizedBox(height: 6),
            const Text('Balance disponible',
                style: TextStyle(color: TadColors.tadTextSecondary, fontSize: 14)),
            const SizedBox(height: 14),
            Row(children: [
              _badge('${d.activeAds} anuncios', TadColors.tadYellow),
              const SizedBox(width: 8),
              _badge('${d.activeSlots}/${d.maxSlots} slots', TadColors.tadGreen),
            ]),
          ]),
          const SizedBox(height: 14),

          // Progress card
          _card([
            const Text('Progreso para retiro',
                style: TextStyle(fontWeight: FontWeight.w700, fontSize: 17)),
            const SizedBox(height: 4),
            Text('Mínimo RD 5,000 requerido para solicitar retiro',
                            style: TextStyle(color: TadColors.tadTextSecondary, fontSize: 12)),
            const SizedBox(height: 10),
            ClipRRect(
              borderRadius: BorderRadius.circular(4),
              child: LinearProgressIndicator(
                value: (d.balance / 5000.0).clamp(0.0, 1.0),
                minHeight: 8,
                backgroundColor: TadColors.tadBorder,
                color: d.balance >= 5000 ? TadColors.tadGreen : TadColors.tadYellow,
              ),
            ),
            const SizedBox(height: 8),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('RD\$${d.balance.toStringAsFixed(0)}',
                    style: const TextStyle(color: TadColors.tadYellow, fontWeight: FontWeight.w700)),
                const Text('RD\$5,000',
                    style: TextStyle(color: TadColors.tadTextSecondary, fontSize: 13)),
              ],
            ),
            if (d.balance >= 5000)
              const Padding(padding: EdgeInsets.only(top: 6),
                child: Text('✓ Elegible para retiro',
                    style: TextStyle(color: TadColors.tadGreen, fontWeight: FontWeight.w700)),
              ),
          ]),
          const SizedBox(height: 14),

          // Earnings breakdown
          _card([
            const Text('Desglose de ganancias',
                style: TextStyle(color: TadColors.tadYellow, fontWeight: FontWeight.w700, fontSize: 16)),
            const SizedBox(height: 12),
            _row('Anuncios activos × RD\$500', 'RD\$${baseEarnings.toStringAsFixed(0)}'),
            if (referralTotal > 0) ...[
              const SizedBox(height: 6),
              _row('Referidos', '+RD\$${referralTotal.toStringAsFixed(0)}',
                  valueColor: TadColors.tadGreen),
            ],
            if (penaltyAmount > 0) ...[
              const SizedBox(height: 6),
              _row('Penalización', '-RD\$${penaltyAmount.toStringAsFixed(0)}',
                  valueColor: TadColors.tadError),
            ],
            const SizedBox(height: 6),
            _row('Proyectado mensual', 'RD\$${d.projectedEarnings.toStringAsFixed(0)}',
                valueColor: TadColors.tadGreen),
            const SizedBox(height: 6),
            _row('Total pagado', 'RD\$${d.totalPaid.toStringAsFixed(0)}',
                valueColor: TadColors.tadTextSecondary),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: TadColors.tadYellow.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: TadColors.tadYellow.withValues(alpha: 0.3)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Fórmula oficial',
                      style: TextStyle(color: TadColors.tadYellow, fontWeight: FontWeight.w700, fontSize: 12)),
                  const SizedBox(height: 4),
                  Text(
                    'E = min(Ads,15)×\$500 + CPA×\$500\n'
                    '= min($activeAds,15)×\$500 + ${(referralTotal / 500).toStringAsFixed(0)}×\$500',
                    style: const TextStyle(color: TadColors.tadTextSecondary, fontSize: 11, height: 1.5),
                  ),
                ],
              ),
            ),
          ]),

          // Last payment
          if (d.lastPayment != null) ...[
            const SizedBox(height: 14),
            _card([
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('RD\$${(d.lastPayment!.amount).toStringAsFixed(0)}',
                          style: const TextStyle(
                              color: TadColors.tadGreen, fontWeight: FontWeight.w800, fontSize: 18)),
                      const SizedBox(height: 4),
                      Text(d.lastPayment!.status,
                          style: const TextStyle(color: TadColors.tadTextSecondary, fontSize: 12)),
                    ],
                  ),
                  if (d.lastPayment!.date != null)
                    Text(d.lastPayment!.date!,
                        style: const TextStyle(color: TadColors.tadTextSecondary, fontSize: 12)),
                ],
              ),
            ]),
          ],
        ]),
      ),
    );
  }

  Widget _title(String text) => Text(text,
      style: const TextStyle(color: TadColors.tadYellow, fontWeight: FontWeight.w800));

  Widget _card(List<Widget> children) => Container(
    width: double.infinity,
    padding: const EdgeInsets.all(20),
    decoration: BoxDecoration(
      color: TadColors.tadSurface,
      borderRadius: BorderRadius.circular(12),
      border: Border.all(color: TadColors.tadBorder),
    ),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: children,
    ),
  );

  Widget _row(String label, String value, {Color? valueColor}) => Row(
    mainAxisAlignment: MainAxisAlignment.spaceBetween,
    children: [
      Text(label, style: const TextStyle(color: TadColors.tadTextSecondary, fontSize: 13)),
      Text(value,
          style: TextStyle(
              color: valueColor ?? TadColors.tadTextPrimary,
              fontWeight: FontWeight.w600,
              fontSize: 13)),
    ],
  );

  Widget _badge(String text, Color color) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
    decoration: BoxDecoration(
        border: Border.all(color: color),
        borderRadius: BorderRadius.circular(6)),
    child: Text(text, style: TextStyle(color: color, fontSize: 12, fontWeight: FontWeight.w600)),
  );
}