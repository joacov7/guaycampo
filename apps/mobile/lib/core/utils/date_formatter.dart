import 'package:intl/intl.dart';

class DateFormatter {
  DateFormatter._();

  static final _dateFormat = DateFormat('dd/MM/yyyy', 'es_AR');
  static final _timeFormat = DateFormat('HH:mm', 'es_AR');
  static final _dateTimeFormat = DateFormat('dd/MM/yyyy HH:mm', 'es_AR');
  static final _dayNameFormat = DateFormat('EEEE d \'de\' MMMM', 'es_AR');

  static String formatDate(DateTime date) => _dateFormat.format(date);

  static String formatTime(DateTime time) => _timeFormat.format(time);

  static String formatDateTime(DateTime dateTime) =>
      _dateTimeFormat.format(dateTime);

  static String formatDayName(DateTime date) => _dayNameFormat.format(date);

  static String formatRelative(DateTime date) {
    final now = DateTime.now();
    final diff = date.difference(now);

    if (diff.isNegative) {
      final absDiff = diff.abs();
      if (absDiff.inMinutes < 60) return 'hace ${absDiff.inMinutes} min';
      if (absDiff.inHours < 24) return 'hace ${absDiff.inHours} h';
      return 'hace ${absDiff.inDays} días';
    } else {
      if (diff.inMinutes < 60) return 'en ${diff.inMinutes} min';
      if (diff.inHours < 24) return 'en ${diff.inHours} h';
      return 'en ${diff.inDays} días';
    }
  }

  static String formatCountdown(DateTime target) {
    final now = DateTime.now();
    final diff = target.difference(now);

    if (diff.isNegative) return 'Vencido';

    final hours = diff.inHours;
    final minutes = diff.inMinutes % 60;

    if (hours > 0) return '${hours}h ${minutes}min';
    return '${minutes} min';
  }

  static bool isToday(DateTime date) {
    final now = DateTime.now();
    return date.year == now.year &&
        date.month == now.month &&
        date.day == now.day;
  }

  static bool isTomorrow(DateTime date) {
    final tomorrow = DateTime.now().add(const Duration(days: 1));
    return date.year == tomorrow.year &&
        date.month == tomorrow.month &&
        date.day == tomorrow.day;
  }
}
