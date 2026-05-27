import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsIn,
  IsNotEmpty,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { ConnectionType } from '../devices.service';

export class CreateDeviceDto {
  @ApiProperty({ description: 'Human-readable device name', example: 'Balanza Toledo N1' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({
    description: 'Sensor/device type',
    enum: ['scale', 'temperature', 'humidity', 'level', 'co2', 'plc', 'camera'],
  })
  @IsString()
  @IsIn(['scale', 'temperature', 'humidity', 'level', 'co2', 'plc', 'camera'])
  type!: string;

  @ApiProperty({
    description: 'Device category',
    enum: ['silo', 'scale', 'plc', 'camera'],
  })
  @IsString()
  @IsIn(['silo', 'scale', 'plc', 'camera'])
  category!: string;

  @ApiProperty({ enum: ['tcp', 'serial'] })
  @IsIn(['tcp', 'serial'])
  connectionType!: ConnectionType;

  @ApiPropertyOptional({ example: '192.168.1.100' })
  @IsOptional()
  @IsString()
  ipAddress?: string;

  @ApiPropertyOptional({ example: 502 })
  @IsOptional()
  @IsNumber()
  port?: number;

  @ApiPropertyOptional({ example: '/dev/ttyUSB0' })
  @IsOptional()
  @IsString()
  serialPort?: string;

  @ApiPropertyOptional({ example: 9600 })
  @IsOptional()
  @IsNumber()
  baudRate?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  unitId?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  registerAddress?: number;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @IsNumber()
  registerCount?: number;

  @ApiPropertyOptional({
    enum: ['float32_be', 'float32_le', 'int16', 'int32_be', 'bcd'],
    example: 'float32_be',
  })
  @IsOptional()
  @IsString()
  encoding?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  multiplier?: number;

  @ApiPropertyOptional({ description: 'Minimum value change to emit a reading', example: 0.5 })
  @IsOptional()
  @IsNumber()
  minChange?: number;

  @ApiProperty({ example: 'acme' })
  @IsString()
  @IsNotEmpty()
  tenantSlug!: string;

  @ApiProperty({ description: 'ID of the silo/scale/PLC this device feeds', example: 'silo-uuid' })
  @IsString()
  @IsNotEmpty()
  targetId!: string;

  @ApiProperty({
    description: 'MQTT sensor type used in the topic',
    example: 'temperature',
  })
  @IsString()
  @IsNotEmpty()
  sensorType!: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
