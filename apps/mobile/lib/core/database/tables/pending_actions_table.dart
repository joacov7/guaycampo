import 'package:drift/drift.dart';

class PendingActions extends Table {
  IntColumn get id => integer().autoIncrement()();
  TextColumn get type => text()(); // e.g. 'sign_ticket', 'checkin'
  TextColumn get payload => text()(); // JSON serializado
  IntColumn get retryCount => integer().withDefault(const Constant(0))();
  DateTimeColumn get createdAt => dateTime().withDefault(currentDateAndTime)();
}
