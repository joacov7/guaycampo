// =============================================================================
// GuayCampo IoT Bridge — Topic Mapper Service
// Maps local plant MQTT topics to cloud-normalised topic paths.
// Local topics follow the same guaycampo/# scheme; this service can apply
// per-tenant prefix rules, environment tagging, or topic translations.
// =============================================================================

import { Injectable, Logger } from '@nestjs/common';

export interface MappedTopic {
  localTopic: string;
  cloudTopic: string;
  tenantSlug: string;
  category: string;
  targetId: string;
  sensorType: string;
}

// Pattern: guaycampo/<tenantSlug>/<category>/<targetId>/<sensorType>[/<extra>...]
const TOPIC_PATTERN =
  /^guaycampo\/([^/]+)\/([^/]+)\/([^/]+)\/([^/]+)(\/.*)?$/;

@Injectable()
export class TopicMapperService {
  private readonly logger = new Logger(TopicMapperService.name);

  /**
   * Parse a GuayCampo MQTT topic into its semantic parts.
   * Returns null for topics that don't match the expected structure.
   */
  parse(topic: string): MappedTopic | null {
    const match = TOPIC_PATTERN.exec(topic);
    if (!match) {
      this.logger.debug(`Topic does not match pattern: ${topic}`);
      return null;
    }

    const [, tenantSlug, category, targetId, sensorType] = match;

    return {
      localTopic: topic,
      cloudTopic: topic, // 1:1 mapping by default — extend here for custom routing
      tenantSlug: tenantSlug!,
      category: category!,
      targetId: targetId!,
      sensorType: sensorType!,
    };
  }

  /**
   * Map a local topic to its cloud destination.
   * Override this method to apply environment-specific routing rules,
   * e.g. prepend a region prefix or redirect dev topics to a sandbox.
   */
  toCloudTopic(localTopic: string): string {
    // By default, publish to the same topic on the cloud broker.
    // Add prefix transformations here if needed.
    return localTopic;
  }

  /**
   * Build a canonical GuayCampo topic from components.
   */
  build(
    tenantSlug: string,
    category: string,
    targetId: string,
    sensorType: string,
    extra?: string,
  ): string {
    const base = `guaycampo/${tenantSlug}/${category}/${targetId}/${sensorType}`;
    return extra ? `${base}/${extra}` : base;
  }
}
