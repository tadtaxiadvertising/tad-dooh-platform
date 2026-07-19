import 'package:flutter/foundation.dart';

enum OnboardingStage { contract, bank, payment, ready }

@immutable
class DriverHubData {
  const DriverHubData({
    this.driverId = '',
    this.driverName = 'Conductor',
    this.balance = 0,
    this.projectedEarnings = 0,
    this.activeAds = 0,
    this.activeSlots = 0,
    this.maxSlots = 15,
    this.subscriptionPaid = false,
    this.subscriptionStatus = 'UNKNOWN',
    this.deviceId,
    this.gpsPoints = 0,
    this.adsPlayed = 0,
    this.contractAccepted = false,
    this.agreementVersion,
    this.onboardingStatus = 'UNKNOWN',
    this.bankAccountConfigured = false,
  });

  final String driverId;
  final String driverName;
  final double balance;
  final double projectedEarnings;
  final int activeAds;
  final int activeSlots;
  final int maxSlots;
  final bool subscriptionPaid;
  final String subscriptionStatus;
  final String? deviceId;
  final int gpsPoints;
  final int adsPlayed;
  final bool contractAccepted;
  final String? agreementVersion;
  final String onboardingStatus;
  final bool bankAccountConfigured;

  factory DriverHubData.fromJson(Map<String, dynamic> json) {
    return DriverHubData(
      driverId: (json['driverId'] ?? '').toString(),
      driverName: (json['driverName'] ?? 'Conductor').toString(),
      balance: _toNum(json['balance']) ?? 0,
      projectedEarnings: _toNum(json['projectedEarnings']) ?? 0,
      activeAds: (_toNum(json['activeAds']) ?? 0).toInt(),
      activeSlots: (_toNum(json['activeSlots']) ?? 0).toInt(),
      maxSlots: (_toNum(json['maxSlots']) ?? 15).toInt(),
      gpsPoints: (_toNum(json['gpsPoints']) ?? 0).toInt(),
      adsPlayed: (_toNum(json['adsPlayed']) ?? 0).toInt(),
      deviceId: json['deviceId']?.toString(),
      contractAccepted: json['contractAccepted'] == true,
      agreementVersion: json['agreementVersion']?.toString(),
      onboardingStatus: (json['onboardingStatus'] ?? 'UNKNOWN').toString(),
      bankAccountConfigured: json['bankAccountConfigured'] == true,
    );
  }

  Map<String, dynamic> toJson() => {
    'driverId': driverId,
    'driverName': driverName,
    'balance': balance,
    'projectedEarnings': projectedEarnings,
    'activeAds': activeAds,
    'activeSlots': activeSlots,
    'maxSlots': maxSlots,
    'subscriptionPaid': subscriptionPaid,
    'subscriptionStatus': subscriptionStatus,
    'deviceId': deviceId,
    'gpsPoints': gpsPoints,
    'adsPlayed': adsPlayed,
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
class GpsCoord {
  const GpsCoord({required this.lat, required this.lng, required this.timestamp, this.accuracy});

  final double lat;
  final double lng;
  final int timestamp;
  final double? accuracy;

  factory GpsCoord.fromJson(Map<String, dynamic> json) => GpsCoord(
    lat: (json['lat'] as double?) ?? 0,
    lng: (json['lng'] as double?) ?? 0,
    timestamp: json['ts'] ?? json['timestamp'] ?? 0,
    accuracy: json['accuracy']?.toDouble(),
  );

  Map<String, dynamic> toJson() => {'lat': lat, 'lng': lng, 'timestamp': timestamp, if (accuracy != null) 'accuracy': accuracy};
}
