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
import type { IScaleTicket } from '@guaycampo/shared-types';

export interface WeightReadingPayload {
  deviceId: string;
  weightKg: number;
  timestamp: string;
}

export interface WeightStablePayload {
  deviceId: string;
  weightKg: number;
  timestamp: string;
}

export interface ScaleErrorPayload {
  deviceId: string;
  errorType: string;
  message?: string;
  timestamp: string;
}

export interface TicketUpdatePayload {
  ticketId: string;
  ticketNumber: string;
  status: string;
  tenantId: string;
  updatedAt: string;
  [key: string]: unknown;
}

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/scale',
})
export class ScaleGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;

  private readonly logger = new Logger(ScaleGateway.name);

  handleConnection(client: Socket): void {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket): void {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  /**
   * Scale operator joins the room for a specific device.
   * Receives real-time weight readings for that device.
   */
  @SubscribeMessage('join:scale')
  handleJoinScale(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { deviceId: string },
  ): void {
    if (!data?.deviceId) return;
    const room = `scale:${data.deviceId}`;
    void client.join(room);
    this.logger.log(`Client ${client.id} joined ${room}`);
    client.emit('joined', { room });
  }

  /**
   * Operations team joins the tenant operations room.
   * Receives ticket updates and overall scale status.
   */
  @SubscribeMessage('join:operations')
  handleJoinOperations(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { tenantId: string },
  ): void {
    if (!data?.tenantId) return;
    const room = `operations:${data.tenantId}`;
    void client.join(room);
    this.logger.log(`Client ${client.id} joined ${room}`);
    client.emit('joined', { room });
  }

  /**
   * Leave a previously joined room.
   */
  @SubscribeMessage('leave:scale')
  handleLeaveScale(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { deviceId: string },
  ): void {
    if (!data?.deviceId) return;
    const room = `scale:${data.deviceId}`;
    void client.leave(room);
    this.logger.log(`Client ${client.id} left ${room}`);
    client.emit('left', { room });
  }

  /**
   * Broadcast a live weight reading to all clients subscribed to a device.
   */
  broadcastWeight(deviceId: string, weightKg: number): void {
    const payload: WeightReadingPayload = {
      deviceId,
      weightKg,
      timestamp: new Date().toISOString(),
    };
    this.server.to(`scale:${deviceId}`).emit('weight:reading', payload);
  }

  /**
   * Broadcast stable weight event when the reading has stabilized.
   */
  broadcastWeightStable(deviceId: string, weightKg: number): void {
    const payload: WeightStablePayload = {
      deviceId,
      weightKg,
      timestamp: new Date().toISOString(),
    };
    this.server.to(`scale:${deviceId}`).emit('weight:stable', payload);
    this.logger.debug(`Broadcast weight:stable to scale:${deviceId} — ${weightKg} kg`);
  }

  /**
   * Broadcast a ticket update (creation, status change, completion) to operations room.
   */
  broadcastTicketUpdate(tenantId: string, ticket: Partial<IScaleTicket>): void {
    const payload: TicketUpdatePayload = {
      ticketId: ticket.id ?? '',
      ticketNumber: ticket.ticketNumber ?? '',
      status: ticket.status ?? '',
      tenantId,
      updatedAt: new Date().toISOString(),
      ...ticket,
    };
    this.server.to(`operations:${tenantId}`).emit('ticket:update', payload);
    this.logger.debug(`Broadcast ticket:update to operations:${tenantId}`);
  }

  /**
   * Broadcast a scale error to clients subscribed to a device.
   */
  broadcastError(deviceId: string, errorType: string, message?: string): void {
    const payload: ScaleErrorPayload = {
      deviceId,
      errorType,
      message,
      timestamp: new Date().toISOString(),
    };
    this.server.to(`scale:${deviceId}`).emit('scale:error', payload);
    this.logger.warn(`Broadcast scale:error to scale:${deviceId} — ${errorType}`);
  }
}
