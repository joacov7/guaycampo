class ApiEndpoints {
  ApiEndpoints._();

  // Auth
  static const String login = '/auth/login';
  static const String refresh = '/auth/refresh';
  static const String logout = '/auth/logout';
  static const String me = '/auth/me';

  // Shifts
  static const String shifts = '/shifts';
  static const String myShifts = '/shifts/my';
  static const String shiftCheckin = '/shifts/{id}/checkin';
  static const String shiftById = '/shifts/{id}';

  // Queue
  static const String queue = '/queue';
  static const String queuePosition = '/queue/my-position';

  // Tickets
  static const String tickets = '/tickets';
  static const String ticketById = '/tickets/{id}';
  static const String ticketSignature = '/tickets/{id}/signature';
  static const String ticketPdf = '/tickets/{id}/pdf';

  // Utils
  static String withId(String endpoint, String id) {
    return endpoint.replaceFirst('{id}', id);
  }
}
