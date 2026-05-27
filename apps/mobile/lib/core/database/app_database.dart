import 'dart:io';

import 'package:drift/drift.dart';
import 'package:drift/native.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';

import 'tables/pending_actions_table.dart';
import 'tables/shifts_table.dart';
import 'tables/tickets_table.dart';

part 'app_database.g.dart';

@DriftDatabase(tables: [CachedShifts, CachedTickets, PendingActions])
class AppDatabase extends _$AppDatabase {
  AppDatabase() : super(_openConnection());

  @override
  int get schemaVersion => 1;

  // ── Shifts ──────────────────────────────────────────────────────────────────

  Future<void> upsertShift(CachedShiftsCompanion shift) {
    return into(cachedShifts).insertOnConflictUpdate(shift);
  }

  Future<CachedShift?> getShiftById(String id) {
    return (select(cachedShifts)..where((t) => t.id.equals(id)))
        .getSingleOrNull();
  }

  Future<List<CachedShift>> getAllShifts() {
    return (select(cachedShifts)
          ..orderBy([(t) => OrderingTerm.desc(t.updatedAt)]))
        .get();
  }

  Future<int> deleteShift(String id) {
    return (delete(cachedShifts)..where((t) => t.id.equals(id))).go();
  }

  // ── Tickets ─────────────────────────────────────────────────────────────────

  Future<void> upsertTicket(CachedTicketsCompanion ticket) {
    return into(cachedTickets).insertOnConflictUpdate(ticket);
  }

  Future<CachedTicket?> getTicketById(String id) {
    return (select(cachedTickets)..where((t) => t.id.equals(id)))
        .getSingleOrNull();
  }

  Future<List<CachedTicket>> getAllTickets() {
    return (select(cachedTickets)
          ..orderBy([(t) => OrderingTerm.desc(t.updatedAt)]))
        .get();
  }

  // ── Pending Actions ──────────────────────────────────────────────────────────

  Future<int> addPendingAction(String type, String payload) {
    return into(pendingActions).insert(
      PendingActionsCompanion.insert(type: type, payload: payload),
    );
  }

  Future<List<PendingAction>> getPendingActions() {
    return (select(pendingActions)
          ..orderBy([(t) => OrderingTerm.asc(t.createdAt)]))
        .get();
  }

  Future<int> deletePendingAction(int id) {
    return (delete(pendingActions)..where((t) => t.id.equals(id))).go();
  }

  Future<void> incrementRetryCount(int id) async {
    final action = await (select(pendingActions)
          ..where((t) => t.id.equals(id)))
        .getSingleOrNull();
    if (action != null) {
      await (update(pendingActions)..where((t) => t.id.equals(id)))
          .write(PendingActionsCompanion(retryCount: Value(action.retryCount + 1)));
    }
  }
}

LazyDatabase _openConnection() {
  return LazyDatabase(() async {
    final dbFolder = await getApplicationDocumentsDirectory();
    final file = File(p.join(dbFolder.path, 'guaycampo.sqlite'));
    return NativeDatabase(file);
  });
}
