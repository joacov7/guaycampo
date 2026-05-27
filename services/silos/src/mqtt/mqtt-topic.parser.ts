// =============================================================================
// MQTT Topic Parser
// =============================================================================
// Topic conventions:
//   guaycampo/{tenantSlug}/silo/{siloId}/temperature/{cable}/{position}
//   guaycampo/{tenantSlug}/silo/{siloId}/humidity
//   guaycampo/{tenantSlug}/silo/{siloId}/level
//   guaycampo/{tenantSlug}/silo/{siloId}/co2
//   guaycampo/{tenantSlug}/silo/{siloId}/aeration/status
// =============================================================================

export type SensorType = 'temperature' | 'humidity' | 'level' | 'co2' | 'aeration';

export interface ParsedTopic {
  tenantSlug: string;
  siloId: string;
  sensorType: SensorType;
  cable?: string;    // for multi-cable temperature sensors
  position?: string; // sensor position within cable (e.g. 'C1P3')
}

const VALID_SENSOR_TYPES = new Set<string>([
  'temperature',
  'humidity',
  'level',
  'co2',
  'aeration',
]);

export class MqttTopicParser {
  /**
   * Parse a MQTT topic string into a structured ParsedTopic object.
   * Returns null if the topic does not match the expected format.
   */
  static parse(topic: string): ParsedTopic | null {
    const parts = topic.split('/');

    // Minimum: guaycampo/{tenant}/silo/{siloId}/{sensorType} = 5 parts
    if (parts.length < 5) return null;
    if (parts[0] !== 'guaycampo') return null;
    if (parts[2] !== 'silo') return null;

    const tenantSlug = parts[1];
    const siloId = parts[3];
    const sensorType = parts[4];

    if (!VALID_SENSOR_TYPES.has(sensorType)) return null;
    if (!tenantSlug || !siloId) return null;

    const base: ParsedTopic = {
      tenantSlug,
      siloId,
      sensorType: sensorType as SensorType,
    };

    // Temperature with cable and position:
    // guaycampo/{tenant}/silo/{siloId}/temperature/{cable}/{position}
    if (sensorType === 'temperature' && parts.length >= 7) {
      base.cable = parts[5];
      base.position = `${parts[5]}P${parts[6]}`;
    }

    return base;
  }

  /**
   * Build the aeration command topic for a given silo.
   */
  static aerationCommand(tenantSlug: string, siloId: string): string {
    return `guaycampo/${tenantSlug}/silo/${siloId}/aeration/command`;
  }

  /**
   * Get the unit for a sensor type.
   */
  static getUnit(sensorType: SensorType): string {
    const units: Record<SensorType, string> = {
      temperature: 'C',
      humidity: '%',
      level: '%',
      co2: 'ppm',
      aeration: '',
    };
    return units[sensorType] ?? '';
  }
}
