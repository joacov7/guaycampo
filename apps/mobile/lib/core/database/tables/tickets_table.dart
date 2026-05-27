import 'package:drift/drift.dart';

class CachedTickets extends Table {
  TextColumn get id => text()();
  TextColumn get data => text()(); // JSON serializado
  TextColumn get shiftId => text().nullable()();
  DateTimeColumn get updatedAt => dateTime().withDefault(currentDateAndTime)();

  @override
  Set<Column> get primaryKey => {id};
}
