import 'package:flutter/foundation.dart';

@immutable
class QueueEntry {
  const QueueEntry({
    required this.position,
    required this.shiftId,
    required this.licensePlate,
    required this.cropType,
    this.estimatedWaitMinutes,
    this.isCurrentUser = false,
  });

  final int position;
  final String shiftId;
  final String licensePlate;
  final String cropType;
  final int? estimatedWaitMinutes;
  final bool isCurrentUser;

  factory QueueEntry.fromJson(Map<String, dynamic> json, {bool isCurrentUser = false}) {
    return QueueEntry(
      position: json['position'] as int,
      shiftId: json['shiftId'] as String,
      licensePlate: json['licensePlate'] as String? ?? '---',
      cropType: json['cropType'] as String? ?? '',
      estimatedWaitMinutes: json['estimatedWaitMinutes'] as int?,
      isCurrentUser: isCurrentUser,
    );
  }
}

@immutable
class QueuePositionModel {
  const QueuePositionModel({
    required this.myPosition,
    required this.entries,
    required this.updatedAt,
    this.totalInQueue = 0,
    this.estimatedWaitMinutes,
    this.scaleNumber,
  });

  final int myPosition;
  final List<QueueEntry> entries;
  final DateTime updatedAt;
  final int totalInQueue;
  final int? estimatedWaitMinutes;
  final int? scaleNumber;

  bool get isCalled => myPosition == 0;
  bool get isFirst => myPosition == 1;

  String get estimatedWaitLabel {
    if (estimatedWaitMinutes == null) return 'Calculando...';
    if (estimatedWaitMinutes! < 1) return 'Menos de 1 min';
    if (estimatedWaitMinutes! < 60) return '$estimatedWaitMinutes min';
    final hours = estimatedWaitMinutes! ~/ 60;
    final mins = estimatedWaitMinutes! % 60;
    return '${hours}h ${mins}min';
  }

  factory QueuePositionModel.fromJson(Map<String, dynamic> json, String myShiftId) {
    final entriesJson = json['queue'] as List? ?? [];
    final entries = entriesJson
        .map((e) => QueueEntry.fromJson(
              e as Map<String, dynamic>,
              isCurrentUser: (e['shiftId'] as String?) == myShiftId,
            ))
        .toList();

    return QueuePositionModel(
      myPosition: json['myPosition'] as int? ?? 0,
      entries: entries,
      updatedAt: DateTime.now(),
      totalInQueue: json['total'] as int? ?? entries.length,
      estimatedWaitMinutes: json['estimatedWaitMinutes'] as int?,
      scaleNumber: json['scaleNumber'] as int?,
    );
  }
}
