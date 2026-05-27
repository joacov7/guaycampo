import { Logger } from '@nestjs/common';
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

export interface SiloReadingEvent {
  siloId: string;
  sensorType: string;
  position?: string;
  cable?: string;
  value: number;
  timestamp: string;
}

export interface SiloAlertEvent {
  id: string;
  siloId: string;
  alertType: string;
  severity: string;
  message: string;
  value?: number;
  threshold?: number;
  triggeredAt: string;
}

export interface SiloStockEvent {
  siloId: string;
  newStock: number;
  capacityPercent: number;
}

export interface AerationStatusEvent {
  siloId: string;
  isActive: boolean;
  changedAt: string;
  changedBy?: string;
}

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/silos',
})
export class SilosGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;

  private readonly logger = new Logger(SilosGateway.name);

  handleConnection(client: Socket): void {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket): void {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  /**
   * Operator joins tenant-wide room for all silos updates.
   */
  @SubscribeMessage('join:tenant')
  handleJoinTenant(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { tenantSlug: string },
  ): void {
    if (!data?.tenantSlug) return;
    const room = `tenant:${data.tenantSlug}`;
    void client.join(room);
    this.logger.log(`Client ${client.id} joined ${room}`);
    client.emit('joined', { room });
  }

  /**
   * Dashboard joins room for a specific silo.
   */
  @SubscribeMessage('join:silo')
  handleJoinSilo(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { siloId: string; tenantSlug: string },
  ): void {
    if (!data?.siloId) return;
    const siloRoom = `silo:${data.siloId}`;
    void client.join(siloRoom);
    if (data.tenantSlug) {
      const tenantRoom = `tenant:${data.tenantSlug}`;
      void client.join(tenantRoom);
    }
    this.logger.log(`Client ${client.id} joined ${siloRoom}`);
    client.emit('joined', { room: siloRoom });
  }

  /**
   * Broadcast IoT sensor reading to relevant rooms.
   */
  broadcastReading(tenantSlug: string, reading: SiloReadingEvent): void {
    this.server.to(`tenant:${tenantSlug}`).emit('silo:reading', reading);
    this.server.to(`silo:${reading.siloId}`).emit('silo:reading', reading);
  }

  /**
   * Broadcast alert to all operators in the tenant.
   */
  broadcastAlert(tenantSlug: string, alert: SiloAlertEvent): void {
    this.server.to(`tenant:${tenantSlug}`).emit('silo:alert', alert);
    this.logger.debug(`Broadcast silo:alert to tenant:${tenantSlug}`);
  }

  /**
   * Broadcast stock level update after a movement.
   */
  broadcastStockUpdate(tenantSlug: string, update: SiloStockEvent): void {
    this.server.to(`tenant:${tenantSlug}`).emit('silo:stock', update);
    this.server.to(`silo:${update.siloId}`).emit('silo:stock', update);
    this.logger.debug(`Broadcast silo:stock to tenant:${tenantSlug}`);
  }

  /**
   * Broadcast aeration status change.
   */
  broadcastAerationStatus(tenantSlug: string, event: AerationStatusEvent): void {
    this.server.to(`tenant:${tenantSlug}`).emit('silo:aeration', event);
    this.server.to(`silo:${event.siloId}`).emit('silo:aeration', event);
    this.logger.debug(`Broadcast silo:aeration to tenant:${tenantSlug}`);
  }
}
