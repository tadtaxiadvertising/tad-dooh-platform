import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;

class ApiClient {
  ApiClient({http.Client? client})
      : _client = client ?? http.Client(),
        baseUrl = const String.fromEnvironment('TAD_API_URL', defaultValue: 'http://10.0.2.2:3000');

  final http.Client _client;
  final String baseUrl;

  Future<http.Response> get(String path, {Map<String, String>? headers}) async {
    final uri = Uri.parse('$baseUrl$path');
    debugPrint('API GET $uri');
    return _client.get(uri, headers: headers);
  }

  Future<http.Response> post(String path, Map<String, dynamic> body, {Map<String, String>? headers}) async {
    final uri = Uri.parse('$baseUrl$path');
    final encoded = json.encode(body);
    debugPrint('API POST $uri body=$encoded');
    return _client.post(uri, body: encoded, headers: {
      'Content-Type': 'application/json',
      ...?headers,
    });
  }
}