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

export interface QueueStatePayload {
  tenantId: string;
  items: Array<{
    truckShiftId: string;
    position: number;
    plate: string;
    driverName: string;
    estimatedWaitMin: number;
    status: string;
    checkinAt?: string;
    calledAt?: string;
  }>;
  total: number;
  updatedAt: string;
}

export interface QueueMetricsPayload {
  tenantId: string;
  total: number;
  avgWaitMin: number;
  maxWaitMin: number;
  processingNow: number;
}

export interface DriverCalledPayload {
  truckShiftId: string;
  driverId: string;
  plate: string;
  scaleNumber?: string;
  calledAt: string;
}

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/shifts',
})
export class ShiftsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  private readonly logger = new Logger(ShiftsGateway.name);

  handleConnection(client: Socket): void {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket): void {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  /**
   * Operations team joins the tenant operations room.
   * Receives queue updates and metrics.
   */
  @SubscribeMessage('join:operations')
  handleJoinOperations(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { tenantId: string },
  ): void {
    if (!data?.tenantId) return;
    const room = `ops:${data.tenantId}`;
    void client.join(room);
    this.logger.log(`Client ${client.id} joined ${room}`);
    client.emit('joined', { room });
  }

  /**
   * Driver joins their personal room to receive call notifications.
   */
  @SubscribeMessage('join:driver')
  handleJoinDriver(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { driverId: string },
  ): void {
    if (!data?.driverId) return;
    const room = `driver:${data.driverId}`;
    void client.join(room);
    this.logger.log(`Client ${client.id} joined ${room}`);
    client.emit('joined', { room });
  }

  /**
   * Plant display screen joins the display room for call announcements.
   */
  @SubscribeMessage('join:queue_display')
  handleJoinQueueDisplay(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { tenantId: string },
  ): void {
    if (!data?.tenantId) return;
    const room = `display:${data.tenantId}`;
    void client.join(room);
    this.logger.log(`Client ${client.id} joined ${room}`);
    client.emit('joined', { room });
  }

  /**
   * Broadcast updated queue state to operations and display rooms.
   */
  broadcastQueueUpdate(tenantId: string, queueState: QueueStatePayload): void {
    this.server.to(`ops:${tenantId}`).emit('queue:updated', queueState);
    this.server.to(`display:${tenantId}`).emit('queue:updated', queueState);
    this.logger.debug(`Broadcast queue:updated to ops:${tenantId} and display:${tenantId}`);
  }

  /**
   * Notify driver they have been called to the scale.
   */
  broadcastDriverCalled(driverId: string, data: DriverCalledPayload): void {
    this.server.to(`driver:${driverId}`).emit('driver:called', data);
    this.logger.debug(`Broadcast driver:called to driver:${driverId}`);
  }

  /**
   * Broadcast queue metrics to operations room.
   */
  broadcastQueueMetrics(tenantId: string, metrics: QueueMetricsPayload): void {
    this.server.to(`ops:${tenantId}`).emit('queue:metrics', metrics);
    this.logger.debug(`Broadcast queue:metrics to ops:${tenantId}`);
  }
}
