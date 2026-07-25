import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// ═══════════════════════════════════════════════════════════════════════════════
/// TAD DOOH Driver — Payment Service (backend business rules)
/// Source of truth: apps/api/src/common/constants/business-rules.ts
/// ═══════════════════════════════════════════════════════════════════════════════

/// ── Business rule constants (mirror backend) ─────────────────────────────────
const int kAnnualSubscriptionRD = 6000;
const int kItbisRD = 1080;
const int kTotalWithItbisRD = 7080;

/// ── API endpoints ────────────────────────────────────────────────────────────
/// GET  /drivers/me/subscription       -> SubscriptionStatus
/// POST /drivers/me/payment/intent     -> PaymentTransaction (pending)
/// POST /drivers/me/payment/confirm    -> { ok, receiptUrl? }
/// GET  /drivers/me/transactions       -> List<PaymentTransaction>
/// PUT  /drivers/:id/subscription      -> Driver (admin only)

/// Backend API base — read from login_screen shared constant
// ignore: depend_on_referenced_packages
import '../screens/login_screen.dart' show kApiBase;

/// ── Enums ────────────────────────────────────────────────────────────────────
enum PaymentStatus { pending, paid, failed, expired }
enum PaymentMethod { unknown, cash, transfer, card, link, whatsapp }

/// ── Models ───────────────────────────────────────────────────────────────────

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

  factory PaymentTransaction.fromJson(Map<String, dynamic> json) {
    return PaymentTransaction(
      id: (json['id'] ?? '').toString(),
      date: json['date'] != null
          ? DateTime.tryParse(json['date'].toString()) ?? DateTime.now()
          : DateTime.now(),
      amountRD: (json['amount'] ?? 0).toInt(),
      itbisRD: (json['itbis'] ?? kItbisRD).toInt(),
      subtotalRD: (json['subtotal'] ?? json['amount'] ?? 0).toInt(),
      status: _parseStatus(json['status']),
      method: _parseMethod(json['paymentMethod'] ?? json['method']),
      notes: json['notes']?.toString(),
      receiptUrl: json['receiptUrl']?.toString(),
      externalRef: json['externalRef']?.toString(),
    );
  }

  static PaymentStatus _parseStatus(dynamic s) {
    switch (s?.toString().toUpperCase()) {
      case 'PENDING': return PaymentStatus.pending;
      case 'PAID': return PaymentStatus.paid;
      case 'FAILED': return PaymentStatus.failed;
      case 'EXPIRED': return PaymentStatus.expired;
      default: return PaymentStatus.pending;
    }
  }

  static PaymentMethod _parseMethod(dynamic m) {
    switch (m?.toString().toUpperCase()) {
      case 'CASH': return PaymentMethod.cash;
      case 'TRANSFER': return PaymentMethod.transfer;
      case 'CARD': return PaymentMethod.card;
      case 'LINK': return PaymentMethod.link;
      case 'WHATSAPP': return PaymentMethod.whatsapp;
      default: return PaymentMethod.unknown;
    }
  }

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

  factory SubscriptionStatus.fromJson(Map<String, dynamic> json) {
    final endStr = json['endDate']?.toString();
    final end = endStr != null ? DateTime.tryParse(endStr) : null;
    final hasPaid = json['paid'] == true || json['status'] == 'ACTIVE';
    final isExpired = end != null && end.isBefore(DateTime.now());

    return SubscriptionStatus(
      paid: hasPaid,
      expired: isExpired,
      endDate: end,
      plan: json['plan']?.toString(),
      amountPaidRD: (json['amount'] ?? 0).toInt(),
      graceHoursLeft: (isExpired && end != null)
          ? end.add(const Duration(hours: 48)).difference(DateTime.now()).inHours
          : null,
    );
  }

  bool get needsPayment => !(paid ?? false) || (expired ?? true);
}

/// ── API Client ───────────────────────────────────────────────────────────────

class PaymentService {
  static const Duration _timeout = Duration(seconds: 10);

  static Future<SubscriptionStatus?> getSubscription(String token) async {
    try {
      final client = HttpClient();
      client.connectionTimeout = _timeout;
      final req = await client.getUrl(
        Uri.parse('$kApiBase/drivers/me/subscription'),
      );
      req.headers.set('Authorization', 'Bearer $token');
      final res = await req.close();
      final body = await res.transform(utf8.decoder).join();
      client.close();

      if (res.statusCode == 200) {
        return SubscriptionStatus.fromJson(
          jsonDecode(body) as Map<String, dynamic>,
        );
      }
      if (res.statusCode == 404) return null;
      return null;
    } catch (_) {
      return null;
    }
  }

  static Future<PaymentTransaction?> createPaymentIntent(
    String token, {
    required int amountRD,
    PaymentMethod method = PaymentMethod.transfer,
  }) async {
    try {
      final client = HttpClient();
      client.connectionTimeout = _timeout;
      final req = await client.postUrl(
        Uri.parse('$kApiBase/drivers/me/payment/intent'),
      );
      req.headers.set('Authorization', 'Bearer $token');
      req.headers.contentType = ContentType.json;
      req.write(jsonEncode({
        'amount': amountRD,
        'method': method.name.toUpperCase(),
      }));
      final res = await req.close();
      final body = await res.transform(utf8.decoder).join();
      client.close();

      if (res.statusCode == 200 || res.statusCode == 201) {
        return PaymentTransaction.fromJson(
          jsonDecode(body) as Map<String, dynamic>,
        );
      }
      return null;
    } catch (_) {
      return null;
    }
  }

  static Future<Map<String, dynamic>?> confirmPayment(
    String token, {
    required String paymentId,
  }) async {
    try {
      final client = HttpClient();
      client.connectionTimeout = _timeout;
      final req = await client.postUrl(
        Uri.parse('$kApiBase/drivers/me/payment/confirm'),
      );
      req.headers.set('Authorization', 'Bearer $token');
      req.headers.contentType = ContentType.json;
      req.write(jsonEncode({'paymentId': paymentId}));
      final res = await req.close();
      final body = await res.transform(utf8.decoder).join();
      client.close();

      if (res.statusCode == 200) {
        return jsonDecode(body) as Map<String, dynamic>;
      }
      return null;
    } catch (_) {
      return null;
    }
  }

  static Future<List<PaymentTransaction>> getTransactions(
    String token,
  ) async {
    try {
      final client = HttpClient();
      client.connectionTimeout = _timeout;
      final req = await client.getUrl(
        Uri.parse('$kApiBase/drivers/me/transactions'),
      );
      req.headers.set('Authorization', 'Bearer $token');
      final res = await req.close();
      final body = await res.transform(utf8.decoder).join();
      client.close();

      if (res.statusCode == 200) {
        final list = jsonDecode(body) as List<dynamic>;
        return list
            .map((e) =>
                PaymentTransaction.fromJson(e as Map<String, dynamic>))
            .toList();
      }
      return [];
    } catch (_) {
      return [];
    }
  }
}