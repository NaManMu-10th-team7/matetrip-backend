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
import { CachedPoi } from './types/cached-poi.js';
import { GroupedPoiConncetionsDto } from './types/grouped-poi-conncetions.dto.js';

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

      const pois: CachedPoi[] = await this.poiService.getWorkspacePois(
        data.workspaceId,
      );
      const connections: GroupedPoiConncetionsDto =
        await this.poiConnectionService.getAllPoiConnections(data.workspaceId);
      // todo: 나중에 DTO로
      socket.emit(PoiSocketEvent.SYNC, { pois, connections });

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
      if (!socket.rooms.has(data.workspaceId)) {
        this.logger.warn(
          `Socket ${socket.id} tried to mark without joining ${data.workspaceId}`,
        );
        return;
      }
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
      // todo : flushPoiConnections
      await this.workspaceService.flushPois(data.workspaceId);
      await this.workspaceService.flushConnections(data.workspaceId);

      // 일단은 log는 Poi만
      this.logger.log(`Workspace ${data.workspaceId} flushed POIs `);
      this.logger.log(`Workspace ${data.workspaceId} flushed POIConnections `);
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
        .to(data.workspaceId)
        // todo : 이거 일단은 전체로 넘겨서 client에서 알아서 day 구분하라고 한거라 최적화 안됨
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
      const removedId =
        await this.poiConnectionService.removePoiConnection(data);

      socket.emit(PoiSocketEvent.DISCONNECTED, removedId);
      socket.broadcast
        .to(data.workspaceId)
        .emit(PoiSocketEvent.DISCONNECTED, removedId);
    } catch {
      this.logger.error(
        `Socket ${socket.id} failed to disconnect from POI connection`,
      );
    }
  }
}
