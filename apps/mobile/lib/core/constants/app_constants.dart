class AppConstants {
  AppConstants._();

  // API
  static const String apiBaseUrl =
      String.fromEnvironment('API_BASE_URL', defaultValue: 'https://api.guaycampo.com/api/v1');

  // Timeouts
  static const Duration connectTimeout = Duration(seconds: 10);
  static const Duration receiveTimeout = Duration(seconds: 30);

  // Auth
  static const String accessTokenKey = 'access_token';
  static const String refreshTokenKey = 'refresh_token';
  static const String tenantSlugKey = 'tenant_slug';
  static const String userDataKey = 'user_data';

  // QR validity window (minutes before/after shift)
  static const int qrValidityWindowMinutes = 30;

  // Queue refresh interval
  static const Duration queueRefreshInterval = Duration(seconds: 30);

  // Offline sync
  static const int maxRetryCount = 3;

  // Colors (hex)
  static const int primaryColorValue = 0xFF2D6A4F;
  static const int secondaryColorValue = 0xFF74C69D;
  static const int accentColorValue = 0xFFF4A261;
  static const int backgroundColorValue = 0xFFF8F9FA;
  static const int errorColorValue = 0xFFE63946;
  static const int warningColorValue = 0xFFFFC107;
}
