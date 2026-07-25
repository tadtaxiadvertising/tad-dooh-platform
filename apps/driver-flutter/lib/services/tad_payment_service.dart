import 'dart:convert';
import 'package:flutter/services.dart';
import 'package:url_launcher/url_launcher_string.dart';

/// Servicio de pagos TAD — link directo a Stripe/membresía y WhatsApp soporte.
class TadPaymentService {
  TadPaymentService._();

  static bool _claimed = false;

  static final _defaultConfig = {
    'pricing': {
      'annualMembership': 6000,
      'starterKitAmount': 3500,
      'currency': 'DOP',
    },
    'paymentLinks': {
      'membership': 'https://www.tad.dooh/pay/membership',
      'starterKit': 'https://www.tad.dooh/pay/starter-kit',
    },
    'whatsappSupport': '18095551234',
  };

  /// Abre el link de pago en el navegador externo.
  /// Solo abre una vez por tipo de pago (protección anti-doble-click).
  static Future<void> claimPaymentLink({required String paymentType}) async {
    if (_claimed) return;
    await Future<void>.delayed(const Duration(milliseconds: 150));
    _claimed = true;

    final pricing = await _obtenerPricingConfig();
    final links = pricing['paymentLinks'] as Map<String, dynamic>? ??
        (_defaultConfig['paymentLinks'] as Map<String, dynamic>);
    final targetLink = links[paymentType] as String?;
    if (targetLink == null) return;

    await launchUrlString(targetLink, mode: LaunchMode.externalApplication);
  }

  /// Abre WhatsApp con mensaje prellenado al soporte de TAD.
  static Future<void> contactSupportWhatsApp({String? customMessage}) async {
    const defaultPhone = '18095551234';
    final message = Uri.encodeComponent(
        customMessage ?? 'Hola, necesito ayuda con mi pago en TAD Driver.');
    final whatsappUrl = 'https://wa.me/$defaultPhone?text=$message';
    await launchUrlString(whatsappUrl, mode: LaunchMode.externalApplication);
  }

  static Future<Map<String, dynamic>> _obtenerPricingConfig() async {
    try {
      final configText =
          await rootBundle.loadString('assets/tad_pricing_config.json');
      return json.decode(configText) as Map<String, dynamic>;
    } catch (_) {
      return _defaultConfig;
    }
  }
}

class TadPaymentException implements Exception {
  TadPaymentException(this.message);
  final String message;

  @override
  String toString() => 'TadPaymentException: $message';
}