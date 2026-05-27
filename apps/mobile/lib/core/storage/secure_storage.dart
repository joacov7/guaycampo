import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../constants/app_constants.dart';

class SecureStorage {
  SecureStorage() : _storage = const FlutterSecureStorage(
    aOptions: AndroidOptions(encryptedSharedPreferences: true),
    iOptions: IOSOptions(
      accessibility: KeychainAccessibility.first_unlock_this_device,
    ),
  );

  final FlutterSecureStorage _storage;

  // Access token
  Future<String?> getAccessToken() =>
      _storage.read(key: AppConstants.accessTokenKey);

  Future<void> saveAccessToken(String token) =>
      _storage.write(key: AppConstants.accessTokenKey, value: token);

  // Refresh token
  Future<String?> getRefreshToken() =>
      _storage.read(key: AppConstants.refreshTokenKey);

  Future<void> saveRefreshToken(String token) =>
      _storage.write(key: AppConstants.refreshTokenKey, value: token);

  // Tenant slug
  Future<String?> getTenantSlug() =>
      _storage.read(key: AppConstants.tenantSlugKey);

  Future<void> saveTenantSlug(String slug) =>
      _storage.write(key: AppConstants.tenantSlugKey, value: slug);

  // User data (JSON string)
  Future<String?> getUserData() =>
      _storage.read(key: AppConstants.userDataKey);

  Future<void> saveUserData(String json) =>
      _storage.write(key: AppConstants.userDataKey, value: json);

  // Clear all (logout)
  Future<void> clearAll() => _storage.deleteAll();

  // Check if authenticated
  Future<bool> isAuthenticated() async {
    final token = await getAccessToken();
    return token != null && token.isNotEmpty;
  }
}
