import 'package:flutter/foundation.dart';

enum ShiftStatus {
  pending,
  confirmed,
  inPlant,
  waiting,
  called,
  inProgress,
  completed,
  cancelled,
  noShow;

  String get label {
    return switch (this) {
      ShiftStatus.pending => 'Pendiente',
      ShiftStatus.confirmed => 'Confirmado',
      ShiftStatus.inPlant => 'En planta',
      ShiftStatus.waiting => 'Esperando',
      ShiftStatus.called => '¡Tu turno!',
      ShiftStatus.inProgress => 'En proceso',
      ShiftStatus.completed => 'Completado',
      ShiftStatus.cancelled => 'Cancelado',
      ShiftStatus.noShow => 'No se presentó',
    };
  }

  bool get isActive {
    return this == pending ||
        this == confirmed ||
        this == inPlant ||
        this == waiting ||
        this == called ||
        this == inProgress;
  }

  static ShiftStatus fromString(String value) {
    return switch (value.toLowerCase()) {
      'pending' => ShiftStatus.pending,
      'confirmed' => ShiftStatus.confirmed,
      'in_plant' || 'inplant' => ShiftStatus.inPlant,
      'waiting' => ShiftStatus.waiting,
      'called' => ShiftStatus.called,
      'in_progress' || 'inprogress' => ShiftStatus.inProgress,
      'completed' => ShiftStatus.completed,
      'cancelled' => ShiftStatus.cancelled,
      'no_show' || 'noshow' => ShiftStatus.noShow,
      _ => ShiftStatus.pending,
    };
  }
}

@immutable
class ShiftModel {
  const ShiftModel({
    required this.id,
    required this.qrCode,
    required this.scheduledAt,
    required this.status,
    required this.cropType,
    required this.plantName,
    required this.plantAddress,
    this.ticketId,
    this.notes,
  });

  final String id;
  final String qrCode;
  final DateTime scheduledAt;
  final ShiftStatus status;
  final String cropType;
  final String plantName;
  final String plantAddress;
  final String? ticketId;
  final String? notes;

  factory ShiftModel.fromJson(Map<String, dynamic> json) {
    return ShiftModel(
      id: json['id'] as String,
      qrCode: json['qrCode'] as String? ?? json['id'] as String,
      scheduledAt: DateTime.parse(json['scheduledAt'] as String),
      status: ShiftStatus.fromString(json['status'] as String? ?? 'pending'),
      cropType: json['cropType'] as String? ?? '',
      plantName: json['plantName'] as String? ?? json['plant']?['name'] as String? ?? '',
      plantAddress: json['plantAddress'] as String? ?? json['plant']?['address'] as String? ?? '',
      ticketId: json['ticketId'] as String?,
      notes: json['notes'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'qrCode': qrCode,
      'scheduledAt': scheduledAt.toIso8601String(),
      'status': status.name,
      'cropType': cropType,
      'plantName': plantName,
      'plantAddress': plantAddress,
      if (ticketId != null) 'ticketId': ticketId,
      if (notes != null) 'notes': notes,
    };
  }

  bool get isQrValid {
    final now = DateTime.now();
    final windowStart = scheduledAt.subtract(const Duration(minutes: 30));
    final windowEnd = scheduledAt.add(const Duration(minutes: 30));
    return now.isAfter(windowStart) && now.isBefore(windowEnd);
  }
}
