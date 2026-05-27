import { Injectable, Logger, Inject } from '@nestjs/common';
import { Pool } from 'pg';

// ---------------------------------------------------------------------------
// DTOs
// ---------------------------------------------------------------------------

export interface InsertReadingDto {
  time: Date;
  siloId: string;
  sensorType: string;
  sensorPosition: string | null;
  value: number;
  unit: string;
  tenantId: string;
}

export interface SensorStatus {
  sensor_type: string;
  sensor_position: string | null;
  value: number;
  time: Date;
}

export interface HourlyAvg {
  hour: Date;
  avg_value: number;
  min_value: number;
  max_value: number;
  reading_count: number;
}

export interface TemperatureMap {
  [position: string]: { value: number; time: Date };
}

export interface SiloStats {
  sensor_type: string;
  avg: number;
  max: number;
  min: number;
  readings_count: number;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

@Injectable()
export class ReadingsService {
  private readonly logger = new Logger(ReadingsService.name);

  constructor(@Inject('PG_POOL') private readonly db: Pool) {}

  /**
   * Insert a single IoT sensor reading into the TimescaleDB hypertable.
   * Uses raw pg for maximum insert throughput.
   */
  async insert(reading: InsertReadingDto): Promise<void> {
    await this.db.query(
      `INSERT INTO silo_readings (time, silo_id, sensor_type, sensor_position, value, unit, tenant_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        reading.time,
        reading.siloId,
        reading.sensorType,
        reading.sensorPosition,
        reading.value,
        reading.unit,
        reading.tenantId,
      ],
    );
  }

  /**
   * Get the latest reading for each sensor in the silo (within last hour).
   */
  async getLatestBySilo(siloId: string, tenantId: string): Promise<SensorStatus[]> {
    const result = await this.db.query<SensorStatus>(
      `SELECT DISTINCT ON (sensor_type, sensor_position)
         sensor_type, sensor_position, value, time
       FROM silo_readings
       WHERE silo_id = $1 AND tenant_id = $2
         AND time > NOW() - INTERVAL '1 hour'
       ORDER BY sensor_type, sensor_position, time DESC`,
      [siloId, tenantId],
    );
    return result.rows;
  }

  /**
   * Get hourly averages from the TimescaleDB continuous aggregate.
   */
  async getHourlyAverages(
    siloId: string,
    sensorType: string,
    hours: number,
    tenantId: string,
  ): Promise<HourlyAvg[]> {
    // Clamp hours to reasonable range
    const safeHours = Math.min(Math.max(hours, 1), 720);
    const result = await this.db.query<HourlyAvg>(
      `SELECT hour, avg_value, min_value, max_value, reading_count
       FROM silo_hourly_avg
       WHERE silo_id = $1 AND sensor_type = $2
         AND hour > NOW() - ($3 || ' hours')::INTERVAL
       ORDER BY hour ASC`,
      [siloId, sensorType, safeHours],
    );
    return result.rows;
  }

  /**
   * Build a temperature map: { 'C1P1': { value, time }, 'C1P2': { value, time }, ... }
   * Used for the SCADA temperature profile visualization.
   */
  async getTemperatureMap(siloId: string, tenantId: string): Promise<TemperatureMap> {
    const result = await this.db.query<{
      sensor_position: string;
      value: number;
      time: Date;
    }>(
      `SELECT DISTINCT ON (sensor_position)
         sensor_position, value, time
       FROM silo_readings
       WHERE silo_id = $1 AND sensor_type = 'temperature' AND tenant_id = $2
         AND time > NOW() - INTERVAL '2 hours'
       ORDER BY sensor_position, time DESC`,
      [siloId, tenantId],
    );

    return result.rows.reduce((map, row) => {
      if (row.sensor_position) {
        map[row.sensor_position] = { value: Number(row.value), time: row.time };
      }
      return map;
    }, {} as TemperatureMap);
  }

  /**
   * Aggregated statistics per sensor type for reporting.
   */
  async getStats(siloId: string, days: number, tenantId: string): Promise<SiloStats[]> {
    const safeDays = Math.min(Math.max(days, 1), 365);
    const result = await this.db.query<SiloStats>(
      `SELECT
         sensor_type,
         AVG(avg_value)::numeric(8,2)  AS avg,
         MAX(max_value)::numeric(8,2)  AS max,
         MIN(min_value)::numeric(8,2)  AS min,
         SUM(reading_count)            AS readings_count
       FROM silo_hourly_avg
       WHERE silo_id = $1 AND tenant_id = $2
         AND hour > NOW() - ($3 || ' days')::INTERVAL
       GROUP BY sensor_type
       ORDER BY sensor_type`,
      [siloId, tenantId, safeDays],
    );
    return result.rows;
  }

  /**
   * Raw recent readings for a specific sensor — used for chart endpoints.
   */
  async getRecentReadings(
    siloId: string,
    sensorType: string,
    hours: number,
    tenantId: string,
  ): Promise<Array<{ time: Date; value: number; sensor_position: string | null }>> {
    const safeHours = Math.min(Math.max(hours, 1), 168);
    const result = await this.db.query<{
      time: Date;
      value: number;
      sensor_position: string | null;
    }>(
      `SELECT time, value, sensor_position
       FROM silo_readings
       WHERE silo_id = $1 AND sensor_type = $2 AND tenant_id = $3
         AND time > NOW() - ($4 || ' hours')::INTERVAL
       ORDER BY time ASC
       LIMIT 5000`,
      [siloId, sensorType, tenantId, safeHours],
    );
    return result.rows;
  }
}
