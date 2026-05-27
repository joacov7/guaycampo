import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:drift/drift.dart' as drift;
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/database/app_database.dart';
import '../../../core/database/tables/tickets_table.dart';
import '../../../core/network/api_endpoints.dart';
import '../../shifts/data/shifts_repository.dart';
import '../domain/scale_ticket_model.dart';

class TicketRepository {
  TicketRepository({
    required Dio dio,
    required AppDatabase db,
  })  : _dio = dio,
        _db = db;

  final Dio _dio;
  final AppDatabase _db;

  Future<ScaleTicketModel> getTicketById(String id) async {
    try {
      final response = await _dio.get(
        ApiEndpoints.withId(ApiEndpoints.ticketById, id),
      );
      final ticket = ScaleTicketModel.fromJson(
        response.data as Map<String, dynamic>,
      );

      // Cache for offline
      await _db.upsertTicket(
        CachedTicketsCompanion(
          id: drift.Value(ticket.id),
          data: drift.Value(jsonEncode(ticket.toJson())),
          updatedAt: drift.Value(DateTime.now()),
        ),
      );

      return ticket;
    } on DioException {
      final cached = await _db.getTicketById(id);
      if (cached == null) rethrow;
      return ScaleTicketModel.fromJson(
        jsonDecode(cached.data) as Map<String, dynamic>,
      );
    }
  }

  Future<void> submitSignature({
    required String ticketId,
    required String signatureBase64,
  }) async {
    try {
      await _dio.post(
        ApiEndpoints.withId(ApiEndpoints.ticketSignature, ticketId),
        data: {'signature': signatureBase64},
      );
    } on DioException {
      // Offline: queue for later
      await _db.addPendingAction(
        'sign_ticket',
        jsonEncode({
          'ticketId': ticketId,
          'signature': signatureBase64,
        }),
      );
      rethrow;
    }
  }

  Future<List<ScaleTicketModel>> getCachedTickets() async {
    final cached = await _db.getAllTickets();
    return cached
        .map((c) => ScaleTicketModel.fromJson(
              jsonDecode(c.data) as Map<String, dynamic>,
            ))
        .toList();
  }
}

final ticketRepositoryProvider = Provider<TicketRepository>((ref) {
  return TicketRepository(
    dio: ref.watch(dioProvider),
    db: ref.watch(appDatabaseProvider),
  );
});
