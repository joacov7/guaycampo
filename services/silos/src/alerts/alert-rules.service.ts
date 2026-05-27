import { Injectable, Logger, Inject } from '@nestjs/common';
import { Pool } from 'pg';

// ---------------------------------------------------------------------------
// Alert Rule model
// ---------------------------------------------------------------------------

export type AlertOperator = 'gt' | 'lt' | 'gte' | 'lte';

export interface AlertRule {
  id: string;
  siloId: string | null;   // null means applies to all silos in tenant
  tenantId: string;
  sensorType: string;
  operator: AlertOperator;
  threshold: number;
  alertType: string;
  severity: 'info' | 'warning' | 'critical' | 'emergency';
  isActive: boolean;
}

// ---------------------------------------------------------------------------
// Default built-in rules (used when no custom rules exist)
// ---------------------------------------------------------------------------

const DEFAULT_RULES: Omit<AlertRule, 'id' | 'siloId' | 'tenantId' | 'isActive'>[] = [
  // Temperature
  {
    sensorType: 'temperature',
    operator: 'gt',
    threshold: 25,
    alertType: 'temperatura',
    severity: 'warning',
  },
  {
    sensorType: 'temperature',
    operator: 'gt',
    threshold: 30,
    alertType: 'temperatura',
    severity: 'critical',
  },
  {
    sensorType: 'temperature',
    operator: 'gt',
    threshold: 35,
    alertType: 'temperatura',
    severity: 'emergency',
  },
  // Humidity
  {
    sensorType: 'humidity',
    operator: 'gt',
    threshold: 14,
    alertType: 'humedad',
    severity: 'warning',
  },
  {
    sensorType: 'humidity',
    operator: 'gt',
    threshold: 16,
    alertType: 'humedad',
    severity: 'critical',
  },
  // CO2
  {
    sensorType: 'co2',
    operator: 'gt',
    threshold: 500,
    alertType: 'infestacion',
    severity: 'warning',
  },
  {
    sensorType: 'co2',
    operator: 'gt',
    threshold: 1000,
    alertType: 'infestacion',
    severity: 'critical',
  },
  // Level (stock low)
  {
    sensorType: 'level',
    operator: 'lt',
    threshold: 10,
    alertType: 'capacidad',
    severity: 'warning',
  },
  // Level (near full)
  {
    sensorType: 'level',
    operator: 'gt',
    threshold: 95,
    alertType: 'capacidad',
    severity: 'warning',
  },
];

@Injectable()
export class AlertRulesService {
  private readonly logger = new Logger(AlertRulesService.name);

  constructor(@Inject('PG_POOL') private readonly db: Pool) {}

  /**
   * Get applicable alert rules for a given silo and sensor type.
   * Silo-specific rules override tenant-wide defaults when present.
   * Falls back to built-in defaults when no DB rules exist.
   */
  async getRulesForSensor(
    siloId: string,
    sensorType: string,
    tenantId: string,
  ): Promise<AlertRule[]> {
    try {
      const result = await this.db.query<AlertRule>(
        `SELECT id, silo_id as "siloId", tenant_id as "tenantId",
                sensor_type as "sensorType", operator, threshold::float,
                alert_type as "alertType", severity, is_active as "isActive"
         FROM silo_alert_rules
         WHERE tenant_id = $1 AND sensor_type = $2 AND is_active = true
           AND (silo_id IS NULL OR silo_id = $3)
         ORDER BY silo_id DESC NULLS LAST`,
        [tenantId, sensorType, siloId],
      );

      if (result.rows.length > 0) return result.rows;
    } catch {
      // Table may not exist yet (no custom rules configured)
      this.logger.debug('silo_alert_rules table not available, using defaults');
    }

    // Fallback to built-in defaults
    return DEFAULT_RULES.filter((r) => r.sensorType === sensorType).map(
      (r, idx) => ({
        ...r,
        id: `default-${idx}`,
        siloId: null,
        tenantId,
        isActive: true,
      }),
    );
  }
}
