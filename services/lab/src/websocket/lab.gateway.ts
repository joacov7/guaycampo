// =============================================================================
// LabGateway — WebSocket gateway para notificaciones en tiempo real de lab
// Namespace: /lab
// Rooms:
//   lab:{tenantId}      — laboratoristas y operadores de balanza
//   driver:{driverId}   — chofer (notificaciones personales)
// =============================================================================

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

export interface NewSamplePayload {
  sampleId: string;
  sampleNumber: string;
  scaleTicketId: string;
  ticketNumber: string;
  takenAt: string;
}

export interface SampleResultPayload {
  sampleId: string;
  sampleNumber: string;
  scaleTicketId: string;
  status: 'aprobado' | 'condicionado' | 'rechazado';
  grade: string;
  netAdjustment: number;
  summary: string;
}

export interface SampleRejectionPayload {
  sampleId: string;
  sampleNumber: string;
  scaleTicketId: string;
  reasons: string[];
}

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/lab',
})
export class LabGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;

  private readonly logger = new Logger(LabGateway.name);

  handleConnection(client: Socket): void {
    this.logger.log(`Lab client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket): void {
    this.logger.log(`Lab client disconnected: ${client.id}`);
  }

  /**
   * Laboratorista/operador se une al room del tenant para recibir
   * notificaciones de nuevas muestras y resultados.
   */
  @SubscribeMessage('join:lab')
  handleJoinLab(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { tenantId: string },
  ): void {
    if (!data?.tenantId) return;
    const room = `lab:${data.tenantId}`;
    void client.join(room);
    this.logger.log(`Client ${client.id} joined ${room}`);
    client.emit('joined', { room });
  }

  /**
   * Chofer se une a su room personal para recibir el resultado de su muestra.
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

  // ---------------------------------------------------------------------------
  // Broadcast methods (called from SamplesService)
  // ---------------------------------------------------------------------------

  /**
   * Notificar al laboratorista que hay una nueva muestra lista para analizar.
   */
  broadcastNewSample(tenantId: string, payload: NewSamplePayload): void {
    this.server.to(`lab:${tenantId}`).emit('sample:new', payload);
    this.logger.debug(`Broadcast sample:new → lab:${tenantId} (${payload.sampleNumber})`);
  }

  /**
   * Notificar resultado de análisis (aprobado / condicionado) al operador
   * de balanza para que continúe el pesaje.
   */
  broadcastSampleResult(tenantId: string, payload: SampleResultPayload): void {
    this.server.to(`lab:${tenantId}`).emit('sample:result', payload);
    this.logger.debug(
      `Broadcast sample:result → lab:${tenantId} (${payload.sampleNumber}: ${payload.status})`,
    );
  }

  /**
   * Notificar rechazo al operador de balanza con los motivos.
   */
  broadcastSampleRejection(tenantId: string, payload: SampleRejectionPayload): void {
    this.server.to(`lab:${tenantId}`).emit('sample:rejected', payload);
    this.logger.warn(
      `Broadcast sample:rejected → lab:${tenantId} (${payload.sampleNumber}: ${payload.reasons.join(', ')})`,
    );
  }

  /**
   * Notificar al chofer el resultado de su muestra.
   */
  broadcastDriverNotification(driverId: string, payload: SampleResultPayload): void {
    this.server.to(`driver:${driverId}`).emit('lab:result', payload);
    this.logger.debug(`Broadcast lab:result → driver:${driverId}`);
  }
}
