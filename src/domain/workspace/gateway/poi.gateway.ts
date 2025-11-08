import { Logger, UsePipes, ValidationPipe } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { SocketPoiDto } from '../dto/poi/socket-poi.dto.js';
import { CreatePoiReqDto } from '../dto/poi/create-poi-req.dto.js';
import { WorkspaceService } from '../service/workspace.service.js';
import { PoiService } from '../service/poi.service.js';
import { CreatePoiConnectionReqDto } from '../dto/poi/create-poi-connection-req.dto.js';
import { RemovePoiConnectionReqDto } from '../dto/poi/remove-poi-connection-req.dto.js';
import { PoiConnectionService } from '../service/poi-connection.service.js';
import { CachedPoi } from '../types/cached-poi.js';
import { GroupedPoiConnectionsDto } from '../types/grouped-poi-conncetions.dto.js';
import { RemovePoiReqDto } from '../dto/poi/remove-poi-req.dto.js';

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
  POI_CONNECT: 'poi:connect',
  POI_DISCONNECT: 'poi:disconnect',
  CONNECTED: 'connected',
  DISCONNECT: 'disconnect',
  DISCONNECTED: 'disconnected',
} as const;

@UsePipes(new ValidationPipe())
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
    // todo : 보안 체크
    try {
      await socket.join(this.getPoiRoomName(data.workspaceId));
      socket.emit(PoiSocketEvent.JOINED, {
        workspaceId: data.workspaceId,
      });

      const pois: CachedPoi[] = await this.poiService.getWorkspacePois(
        data.workspaceId,
      );
      const connections: GroupedPoiConnectionsDto =
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
      await socket.leave(this.getPoiRoomName(data.workspaceId));
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
    @MessageBody() data: CreatePoiReqDto,
  ) {
    try {
      const roomName = this.getPoiRoomName(data.workspaceId);
      if (!socket.rooms.has(roomName)) {
        this.logger.warn(
          `Socket ${socket.id} tried to mark without joining ${data.workspaceId}`,
        );
        return;
      }
      const cachedPoi = await this.workspaceService.cachePoi(
        data.workspaceId,
        data,
      );

      this.server.to(roomName).emit(PoiSocketEvent.MARKED, cachedPoi);

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
    @MessageBody() data: RemovePoiReqDto,
  ) {
    try {
      const roomName = this.getPoiRoomName(data.workspaceId);
      if (!socket.rooms.has(roomName)) {
        this.logger.warn(
          `Socket ${socket.id} tried to unmark without joining ${data.workspaceId}`,
        );
        return;
      }

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

      this.server.to(roomName).emit(PoiSocketEvent.UNMARKED, removedPoi);
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

  @SubscribeMessage(PoiSocketEvent.POI_CONNECT)
  async handlePoiConnection(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: CreatePoiConnectionReqDto,
  ) {
    try {
      const roomName = this.getPoiRoomName(data.workspaceId);
      if (!socket.rooms.has(roomName)) {
        this.logger.warn(
          `Socket ${socket.id} tried to connect without joining ${data.workspaceId}`,
        );
        return;
      }

      const cachedPoiConnection =
        await this.workspaceService.cachePoiConnection(data);

      this.server
        .to(roomName)
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

  @SubscribeMessage(PoiSocketEvent.POI_DISCONNECT)
  async handlePoiDisConnection(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: RemovePoiConnectionReqDto,
  ) {
    try {
      const roomName = this.getPoiRoomName(data.workspaceId);
      if (!socket.rooms.has(roomName)) {
        this.logger.warn(
          `Socket ${socket.id} tried to disconnect without joining ${data.workspaceId}`,
        );
        return;
      }

      const removedId =
        await this.poiConnectionService.removePoiConnection(data);

      this.server.to(roomName).emit(PoiSocketEvent.DISCONNECTED, removedId);
    } catch {
      this.logger.error(
        `Socket ${socket.id} failed to disconnect from POI connection`,
      );
    }
  }

  private getPoiRoomName(workspaceId: string) {
    return `poi:${workspaceId}`;
  }
}
