import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../services/payment_service.dart';
import '../widgets/tad_theme.dart';

class PaymentScreen extends StatefulWidget {
  const PaymentScreen({super.key});

  @override
  State<PaymentScreen> createState() => _PaymentScreenState();
}

class _PaymentScreenState extends State<PaymentScreen> {
  final _service = PaymentService;
  bool _isProcessing = false;
  String? _selectedMethod;
  SubscriptionTier _selectedTier = SubscriptionTier.basic;

  Future<void> _launchUrl(String url) async {
    final uri = Uri.parse(url);
    if (!await launchUrl(uri, mode: LaunchMode.externalApplication)) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('No se pudo abrir el enlace')),
      );
    }
  }

  Future<void> _launchWhatsApp(String phone, String text) async {
    final encoded = Uri.encodeComponent(text);
    final url = 'https://wa.me/$phone?text=$encoded';
    await _launchUrl(url);
  }

  Future<void> _processPayment() async {
    if (_selectedMethod == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Selecciona un método de pago')),
      );
      return;
    }
    setState(() => _isProcessing = true);

    try {
      final method = switch (_selectedMethod) {
        'Transferencia' => _processTransfer(),
        'Link de Pago' => _launchUrl(PaymentService.paymentLinkUrl),
        'WhatsApp' => _launchWhatsApp(
            PaymentService.supportPhone,
            'Hola TAD, deseo realizar el pago de mi suscripción anual RD\$6,000. Mi conductor ID: ${_service._kDriverIdKey}'),
        _ => throw Exception('Método no válido'),
      };

      // Si es un Future (no void), esperar
      await method;

      if (!mounted) return;
      // Registrar intento de pago en historial local
      final tx =
          await _service.createPaymentIntent(tier: _selectedTier, method: _selectedMethod!);
      setState(() => _isProcessing = false);
      if (!mounted) return;
      await Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => PaymentConfirmationScreen(transaction: tx, method: _selectedMethod!),
        ),
      );
    } catch (e) {
      if (!mounted) return;
      setState(() => _isProcessing = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error: $e')),
      );
    }
  }

  Future<void> _processTransfer() async {
    final prefs = await SharedPreferences.getInstance();
    final driverId = prefs.getString(PaymentService._kDriverIdKey) ?? 'unknown';
    final reference = 'DRV-${driverId.toUpperCase()}-${DateTime.now().millisecondsSinceEpoch}';
    final message =
        'Pago de Suscripción TAD\n'
        'Monto: RD\$7,080 (Incluye ITBIS 18%)\n'
        'Referencia: $reference\n'
        'Concepto: Suscripción Anual Básica 2026';
    await Clipboard.setData(ClipboardData(text: message));
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Datos de transferencia copiados al portapapeles'),
        duration: Duration(seconds: 2),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final effective = _isProcessing;

    return Scaffold(
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        iconTheme: const IconThemeData(color: Colors.white),
        title: const Text('Suscripción', style: TADTheme.headingSm),
      ),
      body: effective
          ? const Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  CircularProgressIndicator(color: TADTheme.yellow),
                  SizedBox(height: 24),
                  Text('Procesando...', style: TextStyle(color: Colors.white70, fontSize: 14)),
                ],
              ),
            )
          : SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Header
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(24),
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: [
                          TADTheme.yellow.withOpacity(0.15),
                          Colors.black,
                        ],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      borderRadius: BorderRadius.circular(24),
                      border: Border.all(color: TADTheme.yellow.withOpacity(0.3)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Container(
                              width: 48,
                              height: 48,
                              decoration: const BoxDecoration(
                                color: TADTheme.yellow,
                                shape: BoxShape.circle,
                              ),
                              child: const Icon(Icons.public, color: Colors.black, size: 24),
                            ),
                            const SizedBox(width: 16),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text('Suscripción Anual TAD', style: TADTheme.headingMd),
                                  const SizedBox(height: 4),
                                  RichText(
                                    text: TextSpan(
                                      style: TADTheme.bodyMuted,
                                      children: [
                                        const TextSpan(text: 'ITBIS 18% incluido · '),
                                        TextSpan(
                                          text: 'RD\$7,080',
                                          style: const TextStyle(color: TADTheme.yellow, fontWeight: FontWeight.w700),
                                        ),
                                        const TextSpan(text: '/año'),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 20),
                        const Text(
                          'Beneficios incluidos:',
                          style: TextStyle(color: Colors.white70, fontSize: 13, fontWeight: FontWeight.w600),
                        ),
                        const SizedBox(height: 12),
                        _benefit('Reproducción garantizada 48h sin internet (offline-first)'),
                        _benefit('Earnings: RD\$500 por slot + RD\$500 CPA por referido'),
                        _benefit('Acceso a red de pantallas TAD DOOH'),
                        _benefit('Soporte prioritario vía WhatsApp'),
                        _benefit('Facturación automática mensual'),
                      ],
                    ),
                  ),

                  const SizedBox(height: 32),

                  // Plan selector
                  const Text('Plan', style: TADTheme.headingSm),
                  const SizedBox(height: 12),
                  _PlanCard(
                    tier: SubscriptionTier.basic,
                    selected: _selectedTier == SubscriptionTier.basic,
                    onTap: () => setState(() => _selectedTier = SubscriptionTier.basic),
                  ),
                  const SizedBox(height: 12),
                  _PlanCard(
                    tier: SubscriptionTier.premium,
                    selected: _selectedTier == SubscriptionTier.premium,
                    onTap: () => setState(() => _selectedTier = SubscriptionTier.premium),
                  ),

                  const SizedBox(height: 32),

                  // Método
                  const Text('Método de pago', style: TADTheme.headingSm),
                  const SizedBox(height: 8),
                  const Text('Elige cómo quieres pagar tu suscripción', style: TADTheme.bodyMuted),
                  const SizedBox(height: 16),
                  _PaymentMethodTile(
                    icon: Icons.account_balance,
                    label: 'Transferencia',
                    sub: 'Banco Popular · Cuenta ****802',
                    selected: _selectedMethod == 'Transferencia',
                    onTap: () => setState(() => _selectedMethod = 'Transferencia'),
                  ),
                  const SizedBox(height: 12),
                  _PaymentMethodTile(
                    icon: Icons.link,
                    label: 'Link de Pago',
                    sub: 'tad.do/pagos',
                    selected: _selectedMethod == 'Link de Pago',
                    onTap: () => setState(() => _selectedMethod = 'Link de Pago'),
                  ),
                  const SizedBox(height: 12),
                  _PaymentMethodTile(
                    icon: Icons.chat,
                    label: 'WhatsApp',
                    sub: 'Asesor personalizado',
                    selected: _selectedMethod == 'WhatsApp',
                    onTap: () => setState(() => _selectedMethod = 'WhatsApp'),
                  ),

                  const SizedBox(height: 40),

                  // CTA
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: _isProcessing ? null : _processPayment,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: TADTheme.yellow,
                        foregroundColor: Colors.black,
                        padding: const EdgeInsets.symmetric(vertical: 18),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                        disabledBackgroundColor: Colors.grey[700],
                      ),
                      child: Text(
                        _isProcessing ? 'Procesando...' : 'Pagar ahora',
                        style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14, letterSpacing: 0.5),
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Center(
                    child: Text(
                      'Pago seguro encriptado SSL',
                      style: TextStyle(color: Colors.grey[600], fontSize: 11),
                    ),
                  ),
                  const SizedBox(height: 8),
                  Center(
                    child: TextButton.icon(
                      icon: Icon(Icons.history, size: 16, color: Colors.grey[500]),
                      label: const Text('Historial de transacciones', style: TextStyle(color: Colors.grey)),
                      onPressed: () => Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => const PaymentHistoryScreen()),
                      ),
                    ),
                  ),
                  const SizedBox(height: 32),
                ],
              ),
            ),
    );
  }

  Widget _benefit(String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          const Icon(Icons.check_circle, color: TADTheme.yellow, size: 16),
          const SizedBox(width: 8),
          Expanded(child: Text(text, style: const TextStyle(color: Colors.white70, fontSize: 13))),
        ],
      ),
    );
  }
}
