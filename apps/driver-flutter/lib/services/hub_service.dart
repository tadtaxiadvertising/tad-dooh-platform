import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/hub_data.dart';
import '../core/di/providers.dart';
import '../core/network/api_constants.dart';

final hubServiceProvider = Provider((ref) => HubService(ref));

class HubService {
  HubService(this.ref);
  final Ref ref;

  Future<DriverHubData?> fetchHub() async {
    try {
      final dio = ref.read(dioProvider);
      debugPrint('[HubService] Fetching hub from: ${dio.options.baseUrl}${ApiConstants.hubPath}');
      final res = await dio.get(ApiConstants.hubPath);
      if (res.statusCode == 200) {
        debugPrint('[HubService] Hub data received OK');
        return DriverHubData.fromJson(res.data as Map<String, dynamic>);
      }
    } on DioException catch (e) {
      debugPrint('[HubService] DioException: ${e.type} - ${e.message}');
      debugPrint('[HubService] Response: ${e.response?.statusCode} - ${e.response?.data}');
    } catch (e) {
      debugPrint('[HubService] Unexpected error: $e');
    }
    return null;
  }
}
