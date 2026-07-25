import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../theme/tad_theme.dart';

const _supportPhone = '+18295551234';
const _paymentUrl = 'https://tad.do/pago';

void _openUrl(String url) async {
  final uri = Uri.parse(url);
  if (await canLaunchUrl(uri)) await launchUrl(uri, mode: LaunchMode.externalApplication);
}

void _openWhatsApp() async {
  final uri = Uri.parse('https://wa.me/$_supportPhone?text=Hola%2C%20tengo%20un%20problema%20con%20mi%20suscripción');
  if (await canLaunchUrl(uri)) await launchUrl(uri, mode: LaunchMode.externalApplication);
}

/// Full-screen red overlay shown when the driver subscription is past-due (HTTP 402).
///
/// Rendered as a blocking ModalBarrier on top of the entire app.
/// Requires the driver to renew their HaaS membership before any other action.
class KillSwitchOverlay extends StatelessWidget {
  const KillSwitchOverlay({super.key});

  /// Shows the 402 KillSwitch overlay as a full-screen dialog.
  /// Call from any screen via:
  ///   showDialog(context: context, barrierDismissible: false, builder: (_) => KillSwitchOverlay());
  static void show(BuildContext context) {
    showDialog(
      context: context,
      barrierDismissible: false,
      barrierColor: Colors.black87,
      builder: (_) => const KillSwitchOverlay(),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      backgroundColor: Colors.transparent,
      insetPadding: EdgeInsets.zero,
      child: Container(
        width: double.infinity,
        height: double.infinity,
        color: TadColors.tadDark,
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(32),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                // Red alert icon
                Container(
                  width: 90,
                  height: 90,
                  decoration: BoxDecoration(
                    color: TadColors.tadRed.withValues(alpha: 0.15),
                    shape: BoxShape.circle,
                    border: Border.all(color: TadColors.tadRed, width: 2),
                  ),
                  alignment: Alignment.center,
                  child: Icon(
                    Icons.payment,
                    color: TadColors.tadRed,
                    size: 44,
                  ),
                ),
                const SizedBox(height: 28),

                // Title
                Text(
                  'Suscripción vencida',
                  style: TextStyle(
                    color: TadColors.tadRed,
                    fontWeight: FontWeight.w900,
                    fontSize: 26,
                    letterSpacing: -0.5,
                  ),
                ),
                const SizedBox(height: 14),

                // Message
                Text(
                  'Tu membresía del Starter Kit ha expirado. '
                  'Para continuar operando y recibiendo pagos, '
                  'renueva tu suscripción.',
                  style: TextStyle(
                    color: TadColors.tadTextSecondary,
                    fontSize: 15,
                    height: 1.5,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 28),

                // Price card
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(18),
                  decoration: BoxDecoration(
                    color: TadColors.tadSurface,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: TadColors.tadRed.withValues(alpha: 0.35),
                    ),
                  ),
                  child: Column(
                    children: [
                      Text(
                        'Starter Kit — HaaS v2.0',
                        style: TextStyle(
                          color: TadColors.tadTextPrimary,
                          fontWeight: FontWeight.w700,
                          fontSize: 15,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(
                            'RD\$6,000',
                            style: TextStyle(
                              color: TadColors.tadYellow,
                              fontWeight: FontWeight.w900,
                              fontSize: 28,
                            ),
                          ),
                          const SizedBox(width: 8),
                          Text(
                            '+ ITBIS 18%',
                            style: TextStyle(
                              color: TadColors.tadTextSecondary,
                              fontSize: 13,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '= RD\$7,080 facturado',
                        style: TextStyle(
                          color: TadColors.tadTextSecondary,
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 28),

                // Actions
                SizedBox(
                  width: double.infinity,
                  height: 52,
                  child: ElevatedButton.icon(
                    onPressed: () => _openUrl(_paymentUrl),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: TadColors.tadYellow,
                      foregroundColor: TadColors.black,
                    ),
                    icon: const Icon(Icons.payment),
                    label: const Text(
                      'RENOVAR AHORA',
                      style: TextStyle(
                        fontWeight: FontWeight.w700,
                        letterSpacing: 1.4,
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                SizedBox(
                  width: double.infinity,
                  height: 48,
                  child: OutlinedButton.icon(
                    onPressed: _openWhatsApp,
                    style: OutlinedButton.styleFrom(
                      foregroundColor: TadColors.tadTextPrimary,
                      side: BorderSide(color: TadColors.tadBorder),
                    ),
                    icon: const Icon(Icons.support_agent),
                    label: const Text(
                      'CONTACTAR SOPORTE',
                      style: TextStyle(fontWeight: FontWeight.w700, letterSpacing: 1.1),
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                TextButton(
                  onPressed: () {
                    // Force logout
                    Navigator.of(context).pushNamedAndRemoveUntil('/', (_) => false);
                  },
                  child: Text(
                    'Cerrar sesión',
                    style: TextStyle(color: TadColors.tadTextSecondary, fontSize: 13),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Convenience widget to wrap any dashboard content that should be
/// blocked when subscription is locked.
/// Detects 402 from the hub data's subscriptionStatus field.
class SubscriptionGate extends StatelessWidget {
  final String subscriptionStatus;
  final Widget child;

  const SubscriptionGate({
    super.key,
    required this.subscriptionStatus,
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    // 'PAST_DUE' | 'SUSPENDED' | 'CANCELLED' → show KillSwitch
    final isLocked = subscriptionStatus == 'PAST_DUE' ||
        subscriptionStatus == 'SUSPENDED' ||
        subscriptionStatus == 'CANCELLED';

    if (isLocked) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        KillSwitchOverlay.show(context);
      });
    }

    return child;
  }
}