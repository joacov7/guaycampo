import 'package:flutter/foundation.dart';

enum TicketStatus {
  pending,
  approved,
  rejected,
  conditional;

  String get label {
    return switch (this) {
      TicketStatus.pending => 'Pendiente',
      TicketStatus.approved => 'Aprobado',
      TicketStatus.rejected => 'Rechazado',
      TicketStatus.conditional => 'Condicionado',
    };
  }

  static TicketStatus fromString(String value) {
    return switch (value.toLowerCase()) {
      'approved' => TicketStatus.approved,
      'rejected' => TicketStatus.rejected,
      'conditional' || 'conditioned' => TicketStatus.conditional,
      _ => TicketStatus.pending,
    };
  }
}

@immutable
class LabResult {
  const LabResult({
    required this.name,
    required this.value,
    required this.unit,
    this.isWithinSpec = true,
  });

  final String name;
  final double value;
  final String unit;
  final bool isWithinSpec;

  factory LabResult.fromJson(Map<String, dynamic> json) {
    return LabResult(
      name: json['name'] as String,
      value: (json['value'] as num).toDouble(),
      unit: json['unit'] as String? ?? '%',
      isWithinSpec: json['isWithinSpec'] as bool? ?? true,
    );
  }
}

@immutable
class WeightAdjustment {
  const WeightAdjustment({
    required this.name,
    required this.percentage,
    required this.kgAmount,
  });

  final String name;
  final double percentage;
  final double kgAmount;

  bool get isDeduction => kgAmount < 0;

  factory WeightAdjustment.fromJson(Map<String, dynamic> json) {
    return WeightAdjustment(
      name: json['name'] as String,
      percentage: (json['percentage'] as num).toDouble(),
      kgAmount: (json['kgAmount'] as num).toDouble(),
    );
  }
}

@immutable
class ScaleTicketModel {
  const ScaleTicketModel({
    required this.id,
    required this.ticketNumber,
    required this.shiftId,
    required this.licensePlate,
    required this.cropType,
    required this.producerName,
    required this.grossWeightKg,
    required this.taraWeightKg,
    required this.netWeightKg,
    required this.status,
    required this.createdAt,
    this.labResults = const [],
    this.adjustments = const [],
    this.driverSignatureUrl,
    this.operatorName,
    this.notes,
  });

  final String id;
  final String ticketNumber;
  final String shiftId;
  final String licensePlate;
  final String cropType;
  final String producerName;
  final double grossWeightKg;
  final double taraWeightKg;
  final double netWeightKg;
  final TicketStatus status;
  final DateTime createdAt;
  final List<LabResult> labResults;
  final List<WeightAdjustment> adjustments;
  final String? driverSignatureUrl;
  final String? operatorName;
  final String? notes;

  bool get isSigned => driverSignatureUrl != null;

  double get adjustedNetWeight {
    final totalAdjustment =
        adjustments.fold(0.0, (sum, a) => sum + a.kgAmount);
    return netWeightKg + totalAdjustment;
  }

  factory ScaleTicketModel.fromJson(Map<String, dynamic> json) {
    final labResultsJson = json['labResults'] as List? ?? [];
    final adjustmentsJson = json['adjustments'] as List? ?? [];

    return ScaleTicketModel(
      id: json['id'] as String,
      ticketNumber: json['ticketNumber'] as String? ?? json['id'] as String,
      shiftId: json['shiftId'] as String? ?? '',
      licensePlate: json['licensePlate'] as String? ?? '',
      cropType: json['cropType'] as String? ?? '',
      producerName: json['producerName'] as String? ??
          json['producer']?['name'] as String? ?? '',
      grossWeightKg: (json['grossWeightKg'] as num).toDouble(),
      taraWeightKg: (json['taraWeightKg'] as num).toDouble(),
      netWeightKg: (json['netWeightKg'] as num).toDouble(),
      status: TicketStatus.fromString(json['status'] as String? ?? 'pending'),
      createdAt: DateTime.parse(json['createdAt'] as String),
      labResults: labResultsJson
          .map((e) => LabResult.fromJson(e as Map<String, dynamic>))
          .toList(),
      adjustments: adjustmentsJson
          .map((e) => WeightAdjustment.fromJson(e as Map<String, dynamic>))
          .toList(),
      driverSignatureUrl: json['driverSignatureUrl'] as String?,
      operatorName: json['operatorName'] as String?,
      notes: json['notes'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'ticketNumber': ticketNumber,
      'shiftId': shiftId,
      'licensePlate': licensePlate,
      'cropType': cropType,
      'producerName': producerName,
      'grossWeightKg': grossWeightKg,
      'taraWeightKg': taraWeightKg,
      'netWeightKg': netWeightKg,
      'status': status.name,
      'createdAt': createdAt.toIso8601String(),
      if (driverSignatureUrl != null) 'driverSignatureUrl': driverSignatureUrl,
      if (operatorName != null) 'operatorName': operatorName,
      if (notes != null) 'notes': notes,
    };
  }
}
