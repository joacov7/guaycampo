import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_endpoints.dart';
import '../../../core/network/dio_client.dart';
import '../../../core/storage/secure_storage.dart';

class AuthUser {
  const AuthUser({
    required this.id,
    required this.name,
    required this.email,
    required this.tenantSlug,
    this.avatarUrl,
  });

  final String id;
  final String name;
  final String email;
  final String tenantSlug;
  final String? avatarUrl;

  factory AuthUser.fromJson(Map<String, dynamic> json) {
    return AuthUser(
      id: json['id'] as String,
      name: json['name'] as String,
      email: json['email'] as String,
      tenantSlug: json['tenantSlug'] as String? ?? '',
      avatarUrl: json['avatarUrl'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'email': email,
      'tenantSlug': tenantSlug,
      if (avatarUrl != null) 'avatarUrl': avatarUrl,
    };
  }
}

class AuthException implements Exception {
  const AuthException(this.message);

  final String message;

  @override
  String toString() => message;
}

class AuthRepository {
  AuthRepository({
    required SecureStorage storage,
  }) : _storage = storage,
       _dio = DioClient.create(storage);

  final SecureStorage _storage;
  final Dio _dio;

  Future<AuthUser> login({
    required String tenantSlug,
    required String identifier,
    required String password,
  }) async {
    try {
      final response = await _dio.post(
        ApiEndpoints.login,
        data: {
          'tenantSlug': tenantSlug,
          'identifier': identifier,
          'password': password,
        },
      );

      final accessToken = response.data['accessToken'] as String;
      final refreshToken = response.data['refreshToken'] as String;
      final userData = AuthUser.fromJson(
        response.data['user'] as Map<String, dynamic>,
      );

      await _storage.saveAccessToken(accessToken);
      await _storage.saveRefreshToken(refreshToken);
      await _storage.saveTenantSlug(tenantSlug);
      await _storage.saveUserData(jsonEncode(userData.toJson()));

      return userData;
    } on DioException catch (e) {
      if (e.response?.statusCode == 401 || e.response?.statusCode == 400) {
        throw const AuthException('Credenciales incorrectas. Verificá tus datos.');
      }
      if (e.type == DioExceptionType.connectionError ||
          e.type == DioExceptionType.connectionTimeout) {
        throw const AuthException('Sin conexión. Verificá tu red e intentá de nuevo.');
      }
      throw AuthException(e.message ?? 'Error al iniciar sesión.');
    }
  }

  Future<void> logout() async {
    try {
      await _dio.post(ApiEndpoints.logout);
    } catch (_) {
      // Silently fail – still clear local data
    } finally {
      await _storage.clearAll();
    }
  }

  Future<AuthUser?> restoreSession() async {
    final token = await _storage.getAccessToken();
    final userData = await _storage.getUserData();

    if (token == null || userData == null) return null;

    try {
      final json = jsonDecode(userData) as Map<String, dynamic>;
      return AuthUser.fromJson(json);
    } catch (_) {
      return null;
    }
  }

  Future<String?> getSavedTenantSlug() => _storage.getTenantSlug();
}

final secureStorageProvider = Provider<SecureStorage>((ref) {
  return SecureStorage();
});

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  final storage = ref.watch(secureStorageProvider);
  return AuthRepository(storage: storage);
});
