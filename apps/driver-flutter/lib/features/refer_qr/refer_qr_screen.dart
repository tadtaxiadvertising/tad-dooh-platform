import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:qr_flutter/qr_flutter.dart';
import '../../core/di/providers.dart';
import '../../theme/tad_theme.dart';

/// Pantalla de referidos — genera QR offline con el referralCode del conductor.
class ReferQrScreen extends StatelessWidget {
  const ReferQrScreen({super.key});

  @override
  Widget build(BuildContext context) {
    // Get referral code from cached hub data (set after login)
    final code = _getCachedReferralCode();
    final shareUrl = 'https://tad.dooh/r/$code';

    return Scaffold(
      backgroundColor: TadColors.tadDark,
      appBar: AppBar(
        backgroundColor: TadColors.tadDark,
        leading: IconButton(
          icon: const Text('←', style: TextStyle(color: TadColors.tadYellow, fontSize: 22)),
          onPressed: () => Navigator.pop(context),
        ),
        title: const Text('Referir',
            style: TextStyle(color: TadColors.tadYellow, fontWeight: FontWeight.w800)),
      ),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          children: [
            const Text('Invita a otros conductores o anunciantes',
                style: TextStyle(color: TadColors.tadTextSecondary, fontSize: 14),
                textAlign: TextAlign.center),
            const SizedBox(height: 28),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
              ),
              child: QrImageView(
                data: shareUrl,
                version: QrVersions.auto,
                size: 220,
                backgroundColor: Colors.white,
              ),
            ),
            const SizedBox(height: 24),
            Text(code,
                style: const TextStyle(
                    color: TadColors.tadYellow, fontSize: 20, fontWeight: FontWeight.w800,
                    letterSpacing: 2)),
            const SizedBox(height: 12),
            const Text(
              'Gana RD\$500 por cada anunciante o conductor que se registre con tu código.',
              style: TextStyle(color: TadColors.tadTextSecondary, fontSize: 13),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 32),
            SizedBox(
              width: double.infinity,
              height: 48,
              child: ElevatedButton.icon(
                onPressed: () => _copyCode(context, code),
                icon: const Icon(Icons.copy, color: TadColors.black),
                label: const Text('COPIAR CÓDIGO',
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

  String _getCachedReferralCode() {
    // TODO: read from SharedPreferences cache after login
    // For now return a placeholder
    return 'TAD-DRIVER';
  }

  void _copyCode(BuildContext context, String code) {
    Clipboard.setData(ClipboardData(text: code));
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Código $code copiado'),
        backgroundColor: TadColors.tadGreen,
        behavior: SnackBarBehavior.floating,
      ),
    );
  }
}