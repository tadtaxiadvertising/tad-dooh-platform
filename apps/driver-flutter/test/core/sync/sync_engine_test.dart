import 'dart:async';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:tad_driver/core/sync/sync_engine.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  final queue = OfflineQueue.instance;
  final point = GpsPoint(
    lat: 19.45,
    lng: -70.70,
    speedMps: 8,
    ts: DateTime.utc(2026, 11, 19, 18, 0),
  );

  setUp(() async {
    SharedPreferences.setMockInitialValues({});
    // Shared queue singleton: clear only previously ACKed test data.
    while (await queue.pendingBatches > 0) {
      await queue.acknowledgeFirstBatch();
    }
  });

  Dio clientWithHandler(
    void Function(RequestOptions options, RequestInterceptorHandler handler)
        onRequest,
  ) {
    final dio = Dio(BaseOptions(baseUrl: 'https://fixture.invalid/api/v1'));
    dio.interceptors.add(InterceptorsWrapper(onRequest: onRequest));
    return dio;
  }

  HybridSyncEngine engineFor(Dio dio) => HybridSyncEngine(
        dio: dio,
        deviceId: 'synthetic-device',
        driverId: 'synthetic-driver',
      );

  test('HTTP 402 preserves GPS on disk and later verified retry drains it', () async {
    var calls = 0;
    final dio = clientWithHandler((options, handler) {
      calls++;
      if (calls == 1) {
        handler.reject(
          DioException(
            requestOptions: options,
            type: DioExceptionType.badResponse,
            response: Response(requestOptions: options, statusCode: 402),
          ),
        );
        return;
      }
      handler.resolve(
        Response(
          requestOptions: options,
          statusCode: 200,
          data: <String, dynamic>{'input': 1, 'count': 1},
        ),
      );
    });
    final engine = engineFor(dio);
    engine.addPoint(point.lat, point.lng, point.speedMps, point.ts);

    await engine.flushBatch();
    expect(calls, 1);
    expect(await queue.pendingBatches, 1);
    final prefs = await SharedPreferences.getInstance();
    expect(prefs.getString('tad_driver_offline_gps_queue'), contains('19.45'));

    await engine.flushBatch();
    expect(calls, 2);
    expect(await queue.pendingBatches, 0);
  });

  test('HTTP 200 without matching application receipt preserves queued GPS', () async {
    final dio = clientWithHandler((options, handler) => handler.resolve(
          Response(
            requestOptions: options,
            statusCode: 200,
            data: <String, dynamic>{'success': true},
          ),
        ));
    final engine = engineFor(dio);
    engine.addPoint(point.lat, point.lng, point.speedMps, point.ts);
    await engine.flushBatch();

    expect(await queue.pendingBatches, 1);
    expect((await queue.peekFirstBatch())?.length, 1);
  });

  test('idempotent replay with count 0 but full input receipt is accepted', () async {
    var requests = 0;
    final dio = clientWithHandler((options, handler) {
      requests++;
      handler.resolve(Response(
        requestOptions: options,
        statusCode: 200,
        data: <String, dynamic>{'input': 1, 'count': 0},
      ));
    });
    final engine = engineFor(dio);
    engine.addPoint(point.lat, point.lng, point.speedMps, point.ts);
    await engine.flushBatch();

    expect(requests, 1);
    expect(await queue.pendingBatches, 0);
  });

  test('concurrent flush calls share one request and do not drop new points', () async {
    final release = Completer<void>();
    var requests = 0;
    final dio = clientWithHandler((options, handler) {
      requests++;
      release.future.then((_) => handler.resolve(Response(
            requestOptions: options,
            statusCode: 200,
            data: <String, dynamic>{'input': 1, 'count': 1},
          )));
    });
    final engine = engineFor(dio);
    engine.addPoint(point.lat, point.lng, point.speedMps, point.ts);

    final first = engine.flushBatch();
    final second = engine.flushBatch();
    expect(identical(first, second), isTrue);
    await Future<void>.delayed(const Duration(milliseconds: 10));
    expect(requests, 1);
    release.complete();
    await Future.wait([first, second]);
    expect(await queue.pendingBatches, 0);
  });

  test('two persisted batches are acknowledged one by one', () async {
    var requests = 0;
    final dio = clientWithHandler((options, handler) {
      requests++;
      handler.resolve(Response(
        requestOptions: options,
        statusCode: 200,
        data: <String, dynamic>{'input': 1, 'count': 1},
      ));
    });
    await queue.enqueueGpsBatch([point]);
    await queue.enqueueGpsBatch([point]);

    await engineFor(dio).flushBatch();
    expect(requests, 2);
    expect(await queue.pendingBatches, 0);
  });
}
