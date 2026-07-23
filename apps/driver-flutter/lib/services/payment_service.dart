import 'package:flutter/foundation.dart';
import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';

/// ═══════════════════════════════════════════════════════════════════════════════
/// TAD DOOH Driver — Payment Service (backend business rules)
/// Source of truth: apps/api/src/common/constants/business-rules.ts
/// ═══════════════════════════════════════════════════════════════════════════════

/// ── Business rule constants (mirror backend) ─────────────────────────────────
/// STARTER_KIT_ANNUAL_FEE_RD = RD$ 6,000
/// ITBIS_RATE = 18% → RD$ 1,080
/// Total con ITBIS = RD$ 7,080
const int kAnnualSubscriptionRD = 6000;
const int kItbisRD = 1080;
const int kTotalWithItbisRD = 7080;

/// Entrada Firestore: /drivers/{driverId}/subscription
const String kFirestoreDriversSubscriptionPath = 'drivers';
const String kFirestoreSubscriptionFieldName = 'subscription';

/// Cuenta por defecto (alineada al backend).
const String kDefaultAccountId = 'AD-ACCOUNT-DEFAULT';

/// ═══════════════════════════════════════════════════════════════════════════════
/// Backend contracts (mock now, HTTP later)
/// ═══════════════════════════════════════════════════════════════════════════════
/// GET  /drivers/me/subscription       -> SubscriptionStatus
/// POST /drivers/me/payment/intent     -> PaymentTransaction (pending)
/// POST /drivers/me/payment/confirm    -> { ok, receiptUrl? }
/// GET  /drivers/me/transactions       -> List<PaymentTransaction>
/// PUT  /drivers/:id/subscription      -> Driver (admin only)
/// Status 402 + body.reason in { SUBSCRIPTION_UNPAID, SUBSCRIPTION_EXPIRED,
///       STATE_BLOCKED, SUBSCRIPTION_PENDING }
/// Grace period: 48h after expiry if offline >24h (lastHeartbeat)

/// ── Enums ────────────────────────────────────────────────────────────────────
enum PaymentStatus { pending, paid, failed, expired }

enum PaymentMethod {
  unknown,
  cash,
  transfer,
  card,
  link,
  whatsapp,}

/// ═══════════════════════════════════════════════════════════════════════════════
/// Models (must remain backend-contract-safe; do NOT add business logic here)
/// ═══════════════════════════════════════════════════════════════════════════════

@immutable
class PaymentTransaction {
  final String id;
  final DateTime date;
  final int amountRD;
  final int itbisRD;
  final int subtotalRD;
  final PaymentStatus status;
  final PaymentMethod method;
  final String? notes;
  final String? receiptUrl;
  final String? externalRef;

  const PaymentTransaction({
    this.id = '',
    required this.date,
    required this.amountRD,
    required this.itbisRD,
    required this.subtotalRD,
    required this.status,
    required this.method,
    this.notes,
    this.receiptUrl,
    this.externalRef,
  });

  PaymentTransaction copyWith({
    String? id,
    DateTime? date,
    int? amountRD,
    int? itbisRD,
    int? subtotalRD,
    PaymentStatus? status,
    PaymentMethod? method,
    String? notes,
    String? receiptUrl,
    String? externalRef,
  }) {
    return PaymentTransaction(
      id: id ?? this.id,
      date: date ?? this.date,
      amountRD: amountRD ?? this.amountRD,
      itbisRD: itbisRD ?? this.itbisRD,
      subtotalRD: subtotalRD ?? this.subtotalRD,
      status: status ?? this.status,
      method: method ?? this.method,
      notes: notes ?? this.notes,
      receiptUrl: receiptUrl ?? this.receiptUrl,
      externalRef: externalRef ?? this.externalRef,
    );
  }
}

@immutable
class SubscriptionStatus {
  final bool? paid;
  final bool? expired;
  final DateTime? endDate;
  final String? plan;
  final int? amountPaidRD;
  final int? graceHoursLeft;

  const SubscriptionStatus({
    this.paid,
    this.expired,
    this.endDate,
    this.plan,
    this.amountPaidRD,
    this.graceHoursLeft,
  });

  bool get needsPayment => !(paid ?? false) || (expired ?? true);
}

/// ═══════════════════════════════════════════════════════════════════════════════
/// API client (mock offline-first, replace with HTTP when backend ready)
/// ═══════════════════════════════════════════════════════════════════════════════

class PaymentService {
  static const _kSubscriptionKey = 'tad_subscription_status';

  static Future<SubscriptionStatus> loadSubscription() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_kSubscriptionKey);
    if (raw == null) {
      return _mockSubscriptionActive;
    }

    try {
      final Map<String, dynamic> map = json.decode(raw);
      final end = map['endDate'] != null ? DateTime.tryParse(map['endDate'] as String) : null;
      final paid = map['paid'] as bool? ?? true;
      final expired = end != null && end.isBefore(DateTime.now());
      final graceHoursLeft = (end != null && expired)
          ? end.add(const Duration(hours: 48)).difference(DateTime.now()).inHours
          : null;

      return SubscriptionStatus(
        paid: paid,
        expired: expired,
        endDate: end,
        plan: map['plan'] as String?,
        amountPaidRD: map['amountPaidRD'] as int?,
        graceHoursLeft: graceHoursLeft,
      );
    } catch (_) {
      return _mockSubscriptionActive;
    }
  }

  static Future<void> setMockSubscriptionActive() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(
      _kSubscriptionKey,
      json.encode({
        'paid': true,
        'expired': false,
        'endDate': DateTime.now().add(const Duration(days: 365)).toIso8601String(),
        'plan': 'basic',
        'amountPaidRD': kAnnualSubscriptionRD,
        'graceHoursLeft': null,
      }),
    );
  }
}

const SubscriptionStatus _mockSubscriptionActive = SubscriptionStatus(
  paid: true,
  expired: false,
  plan: 'basic',
  amountPaidRD: kAnnualSubscriptionRD,
);
