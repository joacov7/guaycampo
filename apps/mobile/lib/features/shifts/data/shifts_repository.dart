import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:drift/drift.dart' as drift;
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/database/app_database.dart';
import '../../../core/database/tables/shifts_table.dart';
import '../../../core/network/api_endpoints.dart';
import '../../../core/network/dio_client.dart';
import '../../auth/data/auth_repository.dart';
import '../domain/shift_model.dart';

class ShiftsRepository {
  ShiftsRepository({
    required Dio dio,
    required AppDatabase db,
  })  : _dio = dio,
        _db = db;

  final Dio _dio;
  final AppDatabase _db;

  Future<List<ShiftModel>> getMyShifts() async {
    try {
      final response = await _dio.get(ApiEndpoints.myShifts);
      final data = (response.data as List)
          .map((json) => ShiftModel.fromJson(json as Map<String, dynamic>))
          .toList();

      // Cache results
      for (final shift in data) {
        await _db.upsertShift(
          CachedShiftsCompanion(
            id: drift.Value(shift.id),
            data: drift.Value(jsonEncode(shift.toJson())),
            tenantId: const drift.Value(''),
            updatedAt: drift.Value(DateTime.now()),
          ),
        );
      }

      return data;
    } on DioException {
      // Return cached data when offline
      return _getCachedShifts();
    }
  }

  Future<ShiftModel?> getActiveShift() async {
    final shifts = await getMyShifts();
    try {
      return shifts.firstWhere((s) => s.status.isActive);
    } catch (_) {
      return null;
    }
  }

  Future<List<ShiftModel>> getShiftHistory() async {
    try {
      final response = await _dio.get(ApiEndpoints.shifts);
      final data = (response.data as List)
          .map((json) => ShiftModel.fromJson(json as Map<String, dynamic>))
          .toList();
      return data;
    } on DioException {
      final cached = await _getCachedShifts();
      return cached.where((s) => !s.status.isActive).toList();
    }
  }

  Future<ShiftModel> getShiftById(String id) async {
    try {
      final response = await _dio.get(ApiEndpoints.withId(ApiEndpoints.shiftById, id));
      return ShiftModel.fromJson(response.data as Map<String, dynamic>);
    } on DioException {
      final cached = await _db.getShiftById(id);
      if (cached == null) rethrow;
      return ShiftModel.fromJson(jsonDecode(cached.data) as Map<String, dynamic>);
    }
  }

  Future<List<ShiftModel>> _getCachedShifts() async {
    final cached = await _db.getAllShifts();
    return cached.map((c) {
      return ShiftModel.fromJson(jsonDecode(c.data) as Map<String, dynamic>);
    }).toList();
  }
}

final appDatabaseProvider = Provider<AppDatabase>((ref) {
  return AppDatabase();
});

final dioProvider = Provider<Dio>((ref) {
  final storage = ref.watch(secureStorageProvider);
  return DioClient.create(storage);
});

final shiftsRepositoryProvider = Provider<ShiftsRepository>((ref) {
  return ShiftsRepository(
    dio: ref.watch(dioProvider),
    db: ref.watch(appDatabaseProvider),
  );
});
