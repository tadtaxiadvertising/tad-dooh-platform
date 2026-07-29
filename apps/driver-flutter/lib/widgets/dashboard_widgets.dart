import 'package:flutter/material.dart';
import 'dart:math' as math;
import '../theme/tad_theme.dart';

/// Progress level of onboarding readiness.
/// 1/3 → contract pending
/// 2/3 → contract accepted, bank pending
/// 3/3 → fully ready
enum ReadinessLevel { one, two, three }

extension ReadinessLevelX on ReadinessLevel {
  String get label => switch (this) {
        ReadinessLevel.one => 'Aceptar contrato',
        ReadinessLevel.two => 'Configurar banco',
        ReadinessLevel.three => '¡Listo para operar!',
      };

  int get value => switch (this) {
        ReadinessLevel.one => 1,
        ReadinessLevel.two => 2,
        ReadinessLevel.three => 3,
      };

  Color get color => switch (this) {
        ReadinessLevel.one => TadColors.tadWarning,
        ReadinessLevel.two => TadColors.tadYellow,
        ReadinessLevel.three => TadColors.tadGreen,
      };
}

/// CTA card shown on dashboard when the driver hasn't completed onboarding.
/// Displays a radial progress indicator (1/3, 2/3, 3/3) with the next action.
class DriverReadinessCard extends StatelessWidget {
  final ReadinessLevel level;
  final VoidCallback onTap;

  const DriverReadinessCard({
    super.key,
    required this.level,
    required this.onTap,
  });

  /// Determines readiness level from hub data.
  static ReadinessLevel fromHub({
    required bool contractAccepted,
    required bool bankAccountConfigured,
    required bool subscriptionPaid,
  }) {
    if (contractAccepted && bankAccountConfigured && subscriptionPaid) {
      return ReadinessLevel.three;
    }
    if (contractAccepted) {
      return ReadinessLevel.two;
    }
    return ReadinessLevel.one;
  }

  @override
  Widget build(BuildContext context) {
    final color = level.color;

    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: color.withValues(alpha: 0.35)),
        ),
        child: Row(
          children: [
            // Radial indicator
            SizedBox(
              width: 60,
              height: 60,
              child: CustomPaint(
                painter: _RadialPainter(
                  progress: level.value / 3,
                  color: color,
                  bgColor: TadColors.tadBorder,
                ),
                child: Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        '${level.value}/3',
                        style: TextStyle(
                          color: color,
                          fontWeight: FontWeight.w900,
                          fontSize: 16,
                        ),
                      ),
                      Text(
                        'pasos',
                        style: TextStyle(
                          color: TadColors.tadTextSecondary,
                          fontSize: 9,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
            const SizedBox(width: 14),

            // Label + CTA
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Completar preparación',
                    style: TextStyle(
                      color: TadColors.tadTextPrimary,
                      fontWeight: FontWeight.w700,
                      fontSize: 15,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    level.label,
                    style: TextStyle(
                      color: color,
                      fontWeight: FontWeight.w600,
                      fontSize: 13,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      Text(
                        'Continuar →',
                        style: TextStyle(
                          color: TadColors.tadYellow,
                          fontWeight: FontWeight.w700,
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Paints a radial arc progress indicator.
class _RadialPainter extends CustomPainter {
  final double progress;
  final Color color;
  final Color bgColor;

  _RadialPainter({
    required this.progress,
    required this.color,
    required this.bgColor,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = math.min(size.width, size.height) / 2 - 4;
    const strokeWidth = 5.0;

    // Background arc
    final bgPaint = Paint()
      ..color = bgColor
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth
      ..strokeCap = StrokeCap.round;

    canvas.drawCircle(center, radius, bgPaint);

    // Progress arc
    final fgPaint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth
      ..strokeCap = StrokeCap.round;

    canvas.drawArc(
      Rect.fromCircle(center: center, radius: radius),
      -math.pi / 2,
      2 * math.pi * progress,
      false,
      fgPaint,
    );
  }

  @override
  bool shouldRepaint(_RadialPainter old) =>
      old.progress != progress || old.color != color;
}

/// Small badge showing pending withdrawal count.
/// Shown on Wallet tab when there are pending payouts.
class PendingWithdrawalBadge extends StatelessWidget {
  final int count;

  const PendingWithdrawalBadge({super.key, required this.count});

  @override
  Widget build(BuildContext context) {
    if (count == 0) return const SizedBox.shrink();

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: TadColors.tadWarning,
        borderRadius: BorderRadius.circular(10),
      ),
      child: Text(
        '$count',
        style: TextStyle(
          color: TadColors.black,
          fontWeight: FontWeight.w800,
          fontSize: 11,
        ),
      ),
    );
  }
}

/// Chip-style KPI badge for dashboard home screen.
/// Shows a metric with label and optional trend indicator.
class KpiChip extends StatelessWidget {
  final String label;
  final String value;
  final Color? valueColor;
  final IconData? icon;

  const KpiChip({
    super.key,
    required this.label,
    required this.value,
    this.valueColor,
    this.icon,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: TadColors.tadSurface,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: TadColors.tadBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (icon != null) ...[
                Icon(icon, color: TadColors.tadTextSecondary, size: 12),
                const SizedBox(width: 4),
              ],
              Text(
                label,
                style: TextStyle(
                  color: TadColors.tadTextSecondary,
                  fontSize: 11,
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            value,
            style: TextStyle(
              color: valueColor ?? TadColors.tadTextPrimary,
              fontWeight: FontWeight.w800,
              fontSize: 18,
            ),
          ),
        ],
      ),
    );
  }
}

/// Quick action tile for the dashboard grid.
/// Each action has an icon, label, and optional badge/count.
class QuickActionTile extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color? color;
  final String? badge;
  final VoidCallback? onTap;
  final String? tooltip;

  const QuickActionTile({
    super.key,
    required this.icon,
    required this.label,
    this.color,
    this.badge,
    this.onTap,
    this.tooltip,
  });

  @override
  Widget build(BuildContext context) {
    return Tooltip(
      message: tooltip ?? label,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: TadColors.tadSurface,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: TadColors.tadBorder),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Icon(
                    icon,
                    color: color ?? TadColors.tadYellow,
                    size: 22,
                  ),
                  const Spacer(),
                  if (badge != null)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
                      decoration: BoxDecoration(
                        color: TadColors.tadYellow.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        badge!,
                        style: TextStyle(
                          color: TadColors.tadYellow,
                          fontWeight: FontWeight.w700,
                          fontSize: 10,
                        ),
                      ),
                    ),
                ],
              ),
              const Spacer(),
              Text(
                label,
                style: TextStyle(
                  color: TadColors.tadTextPrimary,
                  fontWeight: FontWeight.w600,
                  fontSize: 13,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}