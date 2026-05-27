import 'package:flutter/foundation.dart';

@immutable
class TruckShiftModel {
  const TruckShiftModel({
    required this.truckId,
    required this.licensePlate,
    required this.driverName,
    required this.driverId,
    this.truckBrand,
    this.truckModel,
    this.capacity,
  });

  final String truckId;
  final String licensePlate;
  final String driverName;
  final String driverId;
  final String? truckBrand;
  final String? truckModel;
  final double? capacity;

  factory TruckShiftModel.fromJson(Map<String, dynamic> json) {
    return TruckShiftModel(
      truckId: json['truckId'] as String? ?? json['truck']?['id'] as String? ?? '',
      licensePlate: json['licensePlate'] as String? ?? json['truck']?['licensePlate'] as String? ?? '',
      driverName: json['driverName'] as String? ?? json['driver']?['name'] as String? ?? '',
      driverId: json['driverId'] as String? ?? json['driver']?['id'] as String? ?? '',
      truckBrand: json['truckBrand'] as String? ?? json['truck']?['brand'] as String?,
      truckModel: json['truckModel'] as String? ?? json['truck']?['model'] as String?,
      capacity: (json['capacity'] as num?)?.toDouble(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'truckId': truckId,
      'licensePlate': licensePlate,
      'driverName': driverName,
      'driverId': driverId,
      if (truckBrand != null) 'truckBrand': truckBrand,
      if (truckModel != null) 'truckModel': truckModel,
      if (capacity != null) 'capacity': capacity,
    };
  }
}
