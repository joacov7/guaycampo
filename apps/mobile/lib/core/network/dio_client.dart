import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';

import '../constants/app_constants.dart';
import '../storage/secure_storage.dart';
import 'api_endpoints.dart';

class OfflineException implements Exception {
  const OfflineException();

  @override
  String toString() => 'Sin conexión a internet. Por favor verificá tu red.';
}

class UnauthorizedException implements Exception {
  const UnauthorizedException();

  @override
  String toString() => 'Sesión expirada. Por favor iniciá sesión nuevamente.';
}

class DioClient {
  DioClient._();

  static Dio create(SecureStorage storage) {
    final dio = Dio(
      BaseOptions(
        baseUrl: AppConstants.apiBaseUrl,
        connectTimeout: AppConstants.connectTimeout,
        receiveTimeout: AppConstants.receiveTimeout,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      ),
    );

    dio.interceptors.addAll([
      AuthInterceptor(storage),
      RefreshInterceptor(storage, dio),
      if (kDebugMode)
        LogInterceptor(
          requestBody: true,
          responseBody: true,
          logPrint: (obj) => debugPrint('[DIO] $obj'),
        ),
    ]);

    return dio;
  }
}

class AuthInterceptor extends Interceptor {
  AuthInterceptor(this._storage);

  final SecureStorage _storage;

  @override
  Future<void> onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    final token = await _storage.getAccessToken();
    if (token != null) {
      options.headers['Authorization'] = 'Bearer $token';
    }
    handler.next(options);
  }
}

class RefreshInterceptor extends Interceptor {
  RefreshInterceptor(this._storage, this._dio);

  final SecureStorage _storage;
  final Dio _dio;
  bool _isRefreshing = false;

  @override
  Future<void> onError(
    DioException err,
    ErrorInterceptorHandler handler,
  ) async {
    if (err.response?.statusCode == 401 && !_isRefreshing) {
      _isRefreshing = true;
      try {
        final refreshToken = await _storage.getRefreshToken();
        if (refreshToken == null) {
          await _storage.clearAll();
          handler.reject(err);
          return;
        }

        final response = await _dio.post(
          ApiEndpoints.refresh,
          data: {'refreshToken': refreshToken},
          options: Options(
            headers: {'Authorization': null},
          ),
        );

        final newAccessToken = response.data['accessToken'] as String;
        final newRefreshToken = response.data['refreshToken'] as String?;

        await _storage.saveAccessToken(newAccessToken);
        if (newRefreshToken != null) {
          await _storage.saveRefreshToken(newRefreshToken);
        }

        // Retry original request
        final retryOptions = err.requestOptions;
        retryOptions.headers['Authorization'] = 'Bearer $newAccessToken';
        final retryResponse = await _dio.fetch(retryOptions);
        handler.resolve(retryResponse);
      } catch (_) {
        await _storage.clearAll();
        handler.reject(
          DioException(
            requestOptions: err.requestOptions,
            error: const UnauthorizedException(),
          ),
        );
      } finally {
        _isRefreshing = false;
      }
    } else {
      handler.next(err);
    }
  }
}
