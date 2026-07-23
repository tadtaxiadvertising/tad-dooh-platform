import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Costo anual oficial: RD\$6,000 (regla negocio v12).
const int kAnnualSubscriptionRD = 6000;
const double kItbisRate = 0.18;

/// Canales reales del negocio (no hardcodear en pantalla, siempre traer del backend cuando esté listo).
const String kPaymentLinkUrl = 'https://tad.do/pagos';
const String kSupportPhone = '8095551234'; // sin + para wa.me
const String kSupportEmail = 'soporte@tad.do';
const String kBankInfo =
    'Banco Popular\nCuenta ****802\nTAD Taxi Advertising SRL\nReferencia: DRV-{driverId}-{yyyyMMdd}';

enum PaymentStatus { pending, paid, failed, refunded }

enum PaymentMethod { transfer, link, whatsapp }

@immutable
class PaymentTransaction {
  final String id;
  final DateTime date;
  final int amountRD;
  final int itbisRD;
  final int subtotalRD;
  final PaymentStatus status;
  final PaymentMethod method;
  final String? externalRef;
  final String? notes;
  final String? receiptUrl;

  const PaymentTransaction({
    required this.id,
    required this.date,
    required this.amountRD,
    required this.itbisRD,
    required this.subtotalRD,
    required this.status,
    required this.method,
    this.externalRef,
    this.notes,
    this.receiptUrl,
  });

  PaymentTransaction copyWith({
    String? id,
    DateTime? date,
    int? amountRD,
    int? itbisRD,
    int? subtotalRD,
    PaymentStatus? status,
    PaymentMethod? method,
    String? externalRef,
    String? notes,
    String? receiptUrl,
  }) =>
      PaymentTransaction(
        id: id ?? this.id,
        date: date ?? this.date,
        amountRD: amountRD ?? this.amountRD,
        itbisRD: itbisRD ?? this.itbisRD,
        subtotalRD: subtotalRD ?? this.subtotalRD,
        status: status ?? this.status,
        method: method ?? this.method,
        externalRef: externalRef ?? this.externalRef,
        notes: notes ?? this.notes,
        receiptUrl: receiptUrl ?? this.receiptUrl,
      );
}

@immutable
class SubscriptionStatus {
  final bool paid;
  final bool expired;
  final DateTime? endDate;
  final String? plan;
  final int? amountPaidRD;
  final int? graceHoursLeft;

  const SubscriptionStatus({
    required this.paid,
    required this.expired,
    this.endDate,
    this.plan,
    this.amountPaidRD,
    this.graceHoursLeft,
  });

  bool get needsPayment => !paid || expired;
  bool get isGracePeriod => graceHoursLeft != null && graceHoursLeft! > 0;
}

/// Mock API layer (cuando backend NestJS esté listo, reemplazar las llamadas por HTTP).
///
/// Contratos (mock, preparado para backend):
/// - GET /drivers/me/subscription     -> SubscriptionStatus
/// - POST /drivers/me/payment/intent  -> PaymentTransaction (pending)
/// - POST /drivers/me/payment/confirm -> { ok, receiptUrl? }
/// - GET /drivers/me/transactions     -> List<PaymentTransaction>
class PaymentService {
  static const _kTransactions = 'tad_payment_transactions';
  static const _kSubscription = 'tad_subscription_status';

  /// Historial desde backend (o mock offline cuando backend no esté).
  static Future<List<PaymentTransaction>> getTransactions() async {
    // TODO: reemplazar por: GET /drivers/me/transactions JWT
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_kTransactions);
    if (raw == null) return _mockHistory();
    final List<dynamic> list = jsonDecode(raw);
    return list
        .map((e) => PaymentTransaction(
              id: e['id'] as String,
              date: DateTime.parse(e['date'] as String),
              amountRD: e['amountRD'] as int,
              itbisRD: e['itbisRD'] as int,
              subtotalRD: e['subtotalRD'] as int,
              status: PaymentStatus.values[e['status'] as int],
              method: PaymentMethod.values[e['method'] as int],
              externalRef: e['externalRef'] as String?,
              notes: e['notes'] as String?,
              receiptUrl: e['receiptUrl'] as String?,
            ))
        .toList();
  }

  static Future<void> _saveTransactions(List<PaymentTransaction> txs) async {
    final prefs = await SharedPreferences.getInstance();
    final encoded = jsonEncode(
      txs
          .map((e) => {
                'id': e.id,
                'date': e.date.toIso8601String(),
                'amountRD': e.amountRD,
                'itbisRD': e.itbisRD,
                'subtotalRD': e.subtotalRD,
                'status': e.status.index,
                'method': e.method.index,
                'externalRef': e.externalRef,
                'notes': e.notes,
                'receiptUrl': e.receiptUrl,
              })
          .toList(),
    );
    await prefs.setString(_kTransactions, encoded);
  }

  static Future<List<PaymentTransaction>> _mockHistory() async {
    final now = DateTime.now();
    return [
      PaymentTransaction(
        id: 'tx-mock-001',
        date: now.subtract(const Duration(days: 300)),
        amountRD: 7080,
        itbisRD: 1080,
        subtotalRD: 6000,
        status: PaymentStatus.paid,
        method: PaymentMethod.transfer,
        externalRef: 'TRF-2025-001',
        notes: 'Suscripción anual Básica',
        receiptUrl: null,
      ),
      PaymentTransaction(
        id: 'tx-mock-002',
        date: now.subtract(const Duration(days: 150)),
        amountRD: 7080,
        itbisRD: 1080,
        subtotalRD: 6000,
        status: PaymentStatus.paid,
        method: PaymentMethod.link,
        externalRef: 'PAY-TAD-002',
        notes: 'Renovación automática',
        receiptUrl: null,
      ),
      PaymentTransaction(
        id: 'tx-mock-003',
        date: now.subtract(const Duration(days: 30)),
        amountRD: 7080,
        itbisRD: 1080,
        subtotalRD: 6000,
        status: PaymentStatus.paid,
        method: PaymentMethod.whatsapp,
        externalRef: null,
        notes: 'Confirmado por soporte TAD',
        receiptUrl: null,
      ),
    ];
  }

  /// Estado de suscripción del conductor (mock).
  static Future<SubscriptionStatus> getSubscriptionStatus() async {
    // TODO: reemplazar por: GET /drivers/me/subscription (JWT)
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_kSubscription);
    if (raw == null) {
      final end = DateTime.now().add(const Duration(days: 300));
      return SubscriptionStatus(
        paid: true,
        expired: false,
        endDate: end,
        plan: 'basic',
        amountPaidRD: kAnnualSubscriptionRD,
        graceHoursLeft: null,
      );
    }
    try {
      final map = jsonDecode(raw) as Map<String, dynamic>;
      final end = map['endDate'] != null ? DateTime.parse(map['endDate'] as String) : null;
      final paid = map['paid'] as bool? ?? true;
      final expired = end != null && end.isBefore(DateTime.now());
      final graceHoursLeft = (end != null && expired)
          ? ((end.add(const Duration(hours: 48)).difference(DateTime.now()).inHours))
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
      return const SubscriptionStatus(paid: true, expired: false);
    }
  }

  static Future<PaymentTransaction> createPaymentIntent({
    required PaymentMethod method,
    required int amountRD,
    String? notes,
  }) async {
    final itbis = (amountRD * kItbisRate).round();
    final tx = PaymentTransaction(
      id: 'tx-${DateTime.now().millisecondsSinceEpoch}-${DateTime.now().microsecond}',
      date: DateTime.now(),
      amountRD: amountRD + itbis,
      itbisRD: itbis,
      subtotalRD: amountRD,
      status: PaymentStatus.pending,
      method: method,
      notes: notes ?? 'Suscripción anual TAD $amountRD RD$ (ITBIS $itbis RD$)',
    );
    final current = await getTransactions();
    current.insert(0, tx);
    await _saveTransactions(current);
    return tx;
  }

  static Future<PaymentTransaction> confirmPayment(String txId) async {
    final list = await getTransactions();
    final idx = list.indexWhere((e) => e.id == txId);
    final updated = list[idx].copyWith(status: PaymentStatus.paid);
    list[idx] = updated;
    await _saveTransactions(list);
    return updated;
  }

  static Future<void> seedMockIfFirstRun() async {
    final prefs = await SharedPreferences.getInstance();
    final stored = prefs.getString(_kTransactions);
    if (stored == null) {
      await _saveTransactions(await _mockHistory());
      await prefs.setString(
        _kSubscription,
        jsonEncode({
          'paid': true,
          'endDate': DateTime.now().add(const Duration(days: 300)).toIso8601String(),
          'plan': 'basic',
          'amountPaidRD': kAnnualSubscriptionRD,
        }),
      );
    }
  }
}
