import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { SocketPoiDto } from './dto/socket-poi.dto.js';
import { CreatePoiDto } from './dto/create-poi.dto.js';
import { WorkspaceService } from './service/workspace.service.js';
import { RemovePoiDto } from './dto/remove-poi.dto.js';
import { PoiService } from './service/poi.service.js';
import { CreatePoiConnectionDto } from './dto/create-poi-connection.dto.js';
import { RemovePoiConnectionDto } from './dto/remove-poi-connection.dto.js';
import { PoiConnectionService } from './service/poi-connection.service.js';

const PoiSocketEvent = {
  JOIN: 'join',
  JOINED: 'joined',
  SYNC: 'sync',
  LEAVE: 'leave',
  LEFT: 'left',
  MARK: 'mark',
  MARKED: 'marked',
  UNMARK: 'unmark',
  UNMARKED: 'unmarked',
  FLUSH: 'flush',
  FLUSHED: 'flushed',
  CONNECT: 'connect',
  CONNECTED: 'connected',
  DISCONNECT: 'disconnect',
  DISCONNECTED: 'disconnected',
} as const;

@WebSocketGateway(3003, {
  namespace: 'poi',
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || [
      'http://localhost:3000',
    ],
  },
})
export class PoiGateway {
  private readonly logger = new Logger(PoiGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(
    private readonly workspaceService: WorkspaceService,
    private readonly poiService: PoiService,
    private readonly poiConnectionService: PoiConnectionService,
  ) {}

  @SubscribeMessage(PoiSocketEvent.JOIN)
  async handlePoiJoin(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: SocketPoiDto,
  ) {
    try {
      await socket.join(data.workspaceId);
      socket.emit(PoiSocketEvent.JOINED, {
        workspaceId: data.workspaceId,
      });

      const pois = await this.poiService.getWorkspacePois(data.workspaceId);

      if (pois.length > 0) {
        socket.emit(PoiSocketEvent.SYNC, pois);
      }

      this.logger.log(
        `Socket ${socket.id} joined workspace ${data.workspaceId}`,
      );
    } catch {
      this.logger.error(
        `Socket ${socket.id} failed to join workspace ${data.workspaceId}`,
      );
    }
  }

  @SubscribeMessage(PoiSocketEvent.LEAVE)
  async handlePoiLeave(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: SocketPoiDto,
  ) {
    try {
      await socket.leave(data.workspaceId);
      socket.emit(PoiSocketEvent.LEFT, {
        workspaceId: data.workspaceId,
      });
      this.logger.log(`Socket ${socket.id} left workspace ${data.workspaceId}`);
    } catch {
      this.logger.error(
        `Socket ${socket.id} failed to leave workspace ${data.workspaceId}`,
      );
    }
  }

  @SubscribeMessage(PoiSocketEvent.MARK)
  async handlePoiMark(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: CreatePoiDto,
  ) {
    try {
      const cachedPoi = await this.workspaceService.cachePoi(
        data.workspaceId,
        data,
      );

      socket.emit(PoiSocketEvent.MARKED, cachedPoi);
      socket.broadcast
        .to(data.workspaceId)
        .emit(PoiSocketEvent.MARKED, cachedPoi);

      this.logger.debug(
        `Socket ${socket.id} marked POI ${cachedPoi.id} in workspace ${data.workspaceId}`,
      );
    } catch {
      this.logger.error(
        `Socket ${socket.id} failed to mark POI in workspace ${data.workspaceId}`,
      );
    }
  }

  @SubscribeMessage(PoiSocketEvent.UNMARK)
  async handlePoiUnmark(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: RemovePoiDto,
  ) {
    try {
      const removedPoi = await this.poiService.removeWorkspacePoi(
        data.workspaceId,
        data.poiId,
      );

      if (!removedPoi) {
        this.logger.warn(
          `Socket ${socket.id} failed to unmark POI ${data.poiId} in workspace ${data.workspaceId}`,
        );
        return;
      }

      socket.emit(PoiSocketEvent.UNMARKED, removedPoi);
      socket.broadcast
        .to(data.workspaceId)
        .emit(PoiSocketEvent.UNMARKED, removedPoi);

      this.logger.debug(
        `Socket ${socket.id} unmarked POI ${data.poiId} in workspace ${data.workspaceId}`,
      );
    } catch {
      this.logger.error(
        `Socket ${socket.id} failed to unmark POI ${data.poiId} in workspace ${data.workspaceId}`,
      );
    }
  }

  @SubscribeMessage(PoiSocketEvent.FLUSH)
  async handlePoiFlush(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: SocketPoiDto,
  ) {
    try {
      const { persistedPois, newlyPersistedCount } =
        await this.workspaceService.flushWorkspacePois(data.workspaceId);

      this.logger.log(`Flushed Counter:  + ${newlyPersistedCount}`);
      this.logger.log(
        `Workspace ${data.workspaceId} flushed POIs (newly persisted: ${newlyPersistedCount})`,
      );
    } catch {
      this.logger.error(
        `Socket ${socket.id} failed to flush workspace ${data.workspaceId}`,
      );
    }
  }

  @SubscribeMessage(PoiSocketEvent.CONNECT)
  async handlePoiConnection(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: CreatePoiConnectionDto,
  ) {
    try {
      const cachedPoiConnection =
        await this.workspaceService.cachePoiConnection(data);

      socket.emit(PoiSocketEvent.CONNECTED, cachedPoiConnection);
      socket.broadcast
        .to(data.planDayId)
        .emit(PoiSocketEvent.CONNECTED, cachedPoiConnection);

      this.logger.debug(
        `Socket ${socket.id} connected to POI connection ${cachedPoiConnection.id}`,
      );
    } catch {
      this.logger.error(
        `Socket ${socket.id} failed to connect to POI connection`,
      );
    }
  }

  @SubscribeMessage(PoiSocketEvent.DISCONNECT)
  async handlePoiDisConnection(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: RemovePoiConnectionDto,
  ) {
    try {
      await this.poiConnectionService.removePoiConnection(data.id);

      socket.emit(PoiSocketEvent.DISCONNECTED, data.id);
      socket.broadcast
        .to(data.planDayId)
        .emit(PoiSocketEvent.DISCONNECTED, data.id);
    } catch {
      this.logger.error(
        `Socket ${socket.id} failed to disconnect from POI connection`,
      );
    }
  }
}
