import 'package:flutter/foundation.dart';

enum OnboardingStage { contract, bank, payment, starterKit, ready }

@immutable
class DriverHubData {
  const DriverHubData({
    this.driverId = '',
    this.driverName = 'Conductor',
    this.level = 'BRONZE',
    this.consecutiveMonthsUnderGoal = 0,
    this.phone,
    this.cedula,
    this.taxiNumber,
    this.balance = 0,
    this.projectedEarnings = 0,
    this.baseEarnings = 0,
    this.penaltyApplied = false,
    this.penaltyAmount = 0,
    this.referralEarnings = 0,
    this.referralCode = '',
    this.referralsCount = 0,
    this.advertiserReferralEarnings = 0,
    this.advertiserReferralsCount = 0,
    this.activeAds = 0,
    this.activeSlots = 0,
    this.maxSlots = 15,
    this.subscriptionPaid = false,
    this.subscriptionStatus = 'UNKNOWN',
    this.deviceId,
    this.gpsPoints = 0,
    this.adsPlayed = 0,
    this.totalPaid = 0,
    this.lastPayment,
    this.contractAccepted = false,
    this.agreementVersion,
    this.onboardingStatus = 'UNKNOWN',
    this.bankAccountConfigured = false,
  });

  final String driverId;
  final String driverName;
  final String level;
  final int consecutiveMonthsUnderGoal;
  final String? phone;
  final String? cedula;
  final String? taxiNumber;
  final double balance;
  final double projectedEarnings;
  final double baseEarnings;
  final bool penaltyApplied;
  final double penaltyAmount;
  final double referralEarnings;
  final String referralCode;
  final int referralsCount;
  final double advertiserReferralEarnings;
  final int advertiserReferralsCount;
  final int activeAds;
  final int activeSlots;
  final int maxSlots;
  final bool subscriptionPaid;
  final String subscriptionStatus;
  final String? deviceId;
  final int gpsPoints;
  final int adsPlayed;
  final double totalPaid;
  final LastPayment? lastPayment;
  final bool contractAccepted;
  final String? agreementVersion;
  final String onboardingStatus;
  final bool bankAccountConfigured;

  factory DriverHubData.fromJson(Map<String, dynamic> json) {
    return DriverHubData(
      driverId: (json['driverId'] ?? '').toString(),
      driverName: (json['driverName'] ?? 'Conductor').toString(),
      level: (json['level'] ?? 'BRONZE').toString(),
      consecutiveMonthsUnderGoal: _toNum(json['consecutiveMonthsUnderGoal'])?.toInt() ?? 0,
      phone: json['phone']?.toString(),
      cedula: json['cedula']?.toString(),
      taxiNumber: json['taxiNumber']?.toString(),
      balance: _toNum(json['balance']) ?? 0,
      projectedEarnings: _toNum(json['projectedEarnings']) ?? 0,
      baseEarnings: _toNum(json['baseEarnings']) ?? 0,
      penaltyApplied: json['penaltyApplied'] == true,
      penaltyAmount: _toNum(json['penaltyAmount']) ?? 0,
      referralEarnings: _toNum(json['referralEarnings']) ?? 0,
      referralCode: json['referralCode'] as String? ?? '',
      referralsCount: _toNum(json['referralsCount'])?.toInt() ?? 0,
      advertiserReferralEarnings: _toNum(json['advertiserReferralEarnings']) ?? 0,
      advertiserReferralsCount: _toNum(json['advertiserReferralsCount'])?.toInt() ?? 0,
      activeAds: (_toNum(json['activeAds']) ?? 0).toInt(),
      activeSlots: (_toNum(json['activeSlots']) ?? 0).toInt(),
      maxSlots: (_toNum(json['maxSlots']) ?? 15).toInt(),
      subscriptionPaid: true, // FORCED ACTIVE
      subscriptionStatus: 'ACTIVE', // FORCED ACTIVE
      deviceId: json['deviceId']?.toString(),
      gpsPoints: (_toNum(json['gpsPoints']) ?? 0).toInt(),
      adsPlayed: (_toNum(json['adsPlayed']) ?? 0).toInt(),
      totalPaid: _toNum(json['totalPaid']) ?? 0,
      lastPayment: json['lastPayment'] != null
          ? LastPayment.fromJson(json['lastPayment'] as Map<String, dynamic>)
          : null,
      contractAccepted: true, // FORCED ACTIVE
      agreementVersion: json['agreementVersion']?.toString(),
      onboardingStatus: 'READY', // FORCED ACTIVE
      bankAccountConfigured: true, // FORCED ACTIVE
    );
  }

  Map<String, dynamic> toJson() => {
    'driverId': driverId,
    'driverName': driverName,
    'level': level,
    'consecutiveMonthsUnderGoal': consecutiveMonthsUnderGoal,
    'phone': phone,
    'cedula': cedula,
    'taxiNumber': taxiNumber,
    'balance': balance,
    'projectedEarnings': projectedEarnings,
    'baseEarnings': baseEarnings,
    'penaltyApplied': penaltyApplied,
    'penaltyAmount': penaltyAmount,
    'referralEarnings': referralEarnings,
    'referralCode': referralCode,
    'referralsCount': referralsCount,
    'advertiserReferralEarnings': advertiserReferralEarnings,
    'advertiserReferralsCount': advertiserReferralsCount,
    'activeAds': activeAds,
    'activeSlots': activeSlots,
    'maxSlots': maxSlots,
    'subscriptionPaid': subscriptionPaid,
    'subscriptionStatus': subscriptionStatus,
    'deviceId': deviceId,
    'gpsPoints': gpsPoints,
    'adsPlayed': adsPlayed,
    'totalPaid': totalPaid,
    'lastPayment': lastPayment?.toJson(),
    'contractAccepted': contractAccepted,
    'agreementVersion': agreementVersion,
    'onboardingStatus': onboardingStatus,
    'bankAccountConfigured': bankAccountConfigured,
  };

  static double? _toNum(dynamic value) {
    if (value is num) return value.toDouble();
    if (value is String) return double.tryParse(value);
    return null;
  }
}

@immutable
class LastPayment {
  const LastPayment({this.amount = 0, this.status = '', this.date});

  final double amount;
  final String status;
  final String? date;

  factory LastPayment.fromJson(Map<String, dynamic> json) => LastPayment(
    amount: DriverHubData._toNum(json['amount']) ?? 0,
    status: (json['status'] ?? '').toString(),
    date: json['date']?.toString(),
  );

  Map<String, dynamic> toJson() => {'amount': amount, 'status': status, 'date': date};
}

@immutable
class GpsCoord {
  const GpsCoord({required this.lat, required this.lng, required this.timestamp, this.accuracy});

  final double lat;
  final double lng;
  final int timestamp;
  final double? accuracy;

  factory GpsCoord.fromJson(Map<String, dynamic> json) => GpsCoord(
    lat: (json['lat'] as double?) ?? 0,
    lng: (json['lng'] as double?) ?? 0,
    timestamp: (json['ts'] ?? json['timestamp'] ?? 0) as int,
    accuracy: (json['accuracy'] as num?)?.toDouble(),
  );

  Map<String, dynamic> toJson() => {'lat': lat, 'lng': lng, 'timestamp': timestamp, if (accuracy != null) 'accuracy': accuracy};
}
