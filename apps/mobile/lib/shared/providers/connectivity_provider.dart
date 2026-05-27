import 'dart:convert';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/database/app_database.dart';
import '../../core/network/api_endpoints.dart';
import '../../features/shifts/data/shifts_repository.dart';

/// Stream of connectivity status: true = online, false = offline
final isOnlineProvider = StreamProvider<bool>((ref) {
  return Connectivity().onConnectivityChanged.map((results) {
    return results.any((r) => r != ConnectivityResult.none);
  });
});

/// Synchronous bool: last known connectivity (defaults to true = optimistic)
final connectivityStatusProvider = Provider<bool>((ref) {
  return ref.watch(isOnlineProvider).when(
        data: (online) => online,
        loading: () => true,
        error: (_, __) => true,
      );
});

/// Sync service: when connection restores, sends queued offline actions
final syncServiceProvider = Provider<SyncService>((ref) {
  final db = ref.watch(appDatabaseProvider);
  final dio = ref.watch(dioProvider);
  final service = SyncService(db: db, dio: dio);

  // Trigger sync whenever connectivity restores
  ref.listen<AsyncValue<bool>>(isOnlineProvider, (prev, next) {
    next.whenData((isOnline) {
      final wasOffline = prev?.value == false;
      if (isOnline && wasOffline) {
        service.processPendingActions();
      }
    });
  });

  return service;
});

class SyncService {
  SyncService({required AppDatabase db, required Dio dio})
      : _db = db,
        _dio = dio;

  final AppDatabase _db;
  final Dio _dio;
  bool _isSyncing = false;

  Future<void> processPendingActions() async {
    if (_isSyncing) return;
    _isSyncing = true;

    try {
      final actions = await _db.getPendingActions();

      for (final action in actions) {
        if (action.retryCount >= 3) {
          // Exceeded retries — discard
          await _db.deletePendingAction(action.id);
          continue;
        }

        try {
          final payload = jsonDecode(action.payload) as Map<String, dynamic>;
          await _executeAction(action.type, payload);
          await _db.deletePendingAction(action.id);
        } catch (_) {
          await _db.incrementRetryCount(action.id);
        }
      }
    } finally {
      _isSyncing = false;
    }
  }

  Future<void> _executeAction(
    String type,
    Map<String, dynamic> payload,
  ) async {
    switch (type) {
      case 'sign_ticket':
        await _dio.post(
          ApiEndpoints.withId(
            ApiEndpoints.ticketSignature,
            payload['ticketId'] as String,
          ),
          data: {'signature': payload['signature']},
        );
        break;

      case 'checkin':
        await _dio.post(
          ApiEndpoints.withId(
            ApiEndpoints.shiftCheckin,
            payload['shiftId'] as String,
          ),
        );
        break;

      default:
        // Unknown action type — ignore
        break;
    }
  }
}
