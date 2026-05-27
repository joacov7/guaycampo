import 'package:drift/drift.dart';

class CachedShifts extends Table {
  TextColumn get id => text()();
  TextColumn get data => text()(); // JSON serializado
  TextColumn get tenantId => text()();
  DateTimeColumn get updatedAt => dateTime().withDefault(currentDateAndTime)();

  @override
  Set<Column> get primaryKey => {id};
}
