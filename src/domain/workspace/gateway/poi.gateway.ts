import {
  Logger,
  UnauthorizedException,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { PoiSocketDto } from '../dto/poi/poi-socket.dto.js';
import { PoiCreateReqDto } from '../dto/poi/poi-create-req.dto.js';
import { WorkspaceService } from '../service/workspace.service.js';
import { PoiService } from '../service/poi.service.js';
import { PoiCacheService } from '../service/poi-cache.service.js';
import { PoiRemoveReqDto } from '../dto/poi/poi-remove-req.dto.js';
import { PoiResDto } from '../dto/poi/poi-res.dto.js';
import { PoiAddScheduleReqDto } from '../dto/poi/poi-add-schedule-req.dto.js';
import { PoiReorderReqDto } from '../dto/poi/poi-reorder-req.dto.js';

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
  // POI_CONNECT: 'poi:connect',
  // POI_DISCONNECT: 'poi:disconnect',
  REORDER: 'reorder',
  ADD_SCHEDULE: 'addSchedule',
  REMOVE_SCHEDULE: 'removeSchedule',
  CONNECTED: 'connected',
  DISCONNECT: 'disconnect',
  DISCONNECTED: 'disconnected',
  POIDRAG: 'drag',
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
    private readonly poiCacheService: PoiCacheService,
  ) {}

  @SubscribeMessage(PoiSocketEvent.JOIN)
  async handlePoiJoin(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: PoiSocketDto,
  ) {
    // todo : 보안 체크
    try {
      await socket.join(this.getPoiRoomName(data.workspaceId));
      socket.emit(PoiSocketEvent.JOINED, {
        workspaceId: data.workspaceId,
      });

      const pois: PoiResDto[] = await this.poiService.getWorkspacePois(
        data.workspaceId,
      );

      // todo: 나중에 DTO로
      socket.emit(PoiSocketEvent.SYNC, { pois });

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
    @MessageBody() data: PoiSocketDto,
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
    @MessageBody() data: PoiCreateReqDto,
  ) {
    try {
      const roomName = this.getPoiRoomName(data.workspaceId);
      this.validateRoomAuth(roomName, socket);

      const cachedPoi = await this.workspaceService.cachePoi(data);

      // todo : 바뀐거 말하기
      const markedPoi: PoiResDto = PoiResDto.of(cachedPoi);

      this.server.to(roomName).emit(PoiSocketEvent.MARKED, markedPoi);

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
    @MessageBody() data: PoiRemoveReqDto,
  ) {
    try {
      const roomName = this.getPoiRoomName(data.workspaceId);
      this.validateRoomAuth(roomName, socket);

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
    @MessageBody() data: PoiSocketDto,
  ) {
    try {
      this.validateRoomAuth(this.getPoiRoomName(data.workspaceId), socket);

      await this.poiService.flushWorkspacePois(data.workspaceId);

      this.logger.log(`Workspace ${data.workspaceId} flushed POIs`);
    } catch (error) {
      this.logger.error(
        `Socket ${socket.id} failed to flush workspace ${data.workspaceId}`,
        error,
      );
    }
  }

  @SubscribeMessage(PoiSocketEvent.ADD_SCHEDULE)
  async handlePoiAddSchedule(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: PoiAddScheduleReqDto,
  ) {
    try {
      const roomName = this.getPoiRoomName(data.workspaceId);
      this.validateRoomAuth(roomName, socket);

      // POI를 SCHEDULED로 전환하고 List에 추가
      await this.poiCacheService.addToSchedule(
        data.workspaceId,
        data.planDayId,
        data.poiId,
      );

      // 모든 클라이언트에 알림
      this.server.to(roomName).emit(PoiSocketEvent.ADD_SCHEDULE, {
        poiId: data.poiId,
        planDayId: data.planDayId,
      });

      this.logger.debug(
        `Socket ${socket.id} added POI ${data.poiId} to schedule in planDay ${data.planDayId}`,
      );
    } catch (error) {
      this.logger.error(
        `Socket ${socket.id} failed to add POI to schedule`,
        error,
      );
    }
  }

  @SubscribeMessage(PoiSocketEvent.REMOVE_SCHEDULE)
  async handlePoiRemoveSchedule(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: PoiAddScheduleReqDto,
  ) {
    try {
      const roomName = this.getPoiRoomName(data.workspaceId);
      this.validateRoomAuth(roomName, socket);

      // POI를 MARKED로 전환하고 List에서 제거
      await this.poiCacheService.removeFromSchedule(
        data.workspaceId,
        data.planDayId,
        data.poiId,
      );

      // 모든 클라이언트에 알림
      this.server.to(roomName).emit(PoiSocketEvent.REMOVE_SCHEDULE, {
        poiId: data.poiId,
        planDayId: data.planDayId,
      });

      this.logger.debug(
        `Socket ${socket.id} removed POI ${data.poiId} from schedule in planDay ${data.planDayId}`,
      );
    } catch (error) {
      this.logger.error(
        `Socket ${socket.id} failed to remove POI from schedule`,
        error,
      );
    }
  }

  @SubscribeMessage(PoiSocketEvent.REORDER)
  async handlePoiReorder(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: PoiReorderReqDto,
  ) {
    try {
      const roomName = this.getPoiRoomName(data.workspaceId);
      this.validateRoomAuth(roomName, socket);

      // Redis List 순서 업데이트 (Hash의 sequence도 함께 업데이트됨)
      await this.poiCacheService.reorderScheduledPois(
        data.workspaceId,
        data.planDayId,
        data.poiIds,
      );

      // 같은 room의 모든 클라이언트에게 순서 변경 알림
      this.server.to(roomName).emit(PoiSocketEvent.REORDER, {
        planDayId: data.planDayId,
        poiIds: data.poiIds,
      });

      this.logger.debug(
        `Socket ${socket.id} reordered POIs in planDay ${data.planDayId}: ${data.poiIds.join(', ')}`,
      );
    } catch (error) {
      this.logger.error(
        `Socket ${socket.id} failed to reorder POIs in planDay ${data.planDayId}`,
        error,
      );
    }
  }

  // @SubscribeMessage(PoiSocketEvent.POI_CONNECT)
  // async handlePoiConnection(
  //   @ConnectedSocket() socket: Socket,
  //   @MessageBody() data: CreatePoiConnectionReqDto,
  // ) {
  //   try {
  //     const roomName = this.getPoiRoomName(data.workspaceId);
  //     if (!socket.rooms.has(roomName)) {
  //       this.logger.warn(
  //         `Socket ${socket.id} tried to connect without joining ${data.workspaceId}`,
  //       );
  //       return;
  //     }

  //     const cachedPoiConnection =
  //       await this.workspaceService.cachePoiConnection(data);

  //     this.server
  //       .to(roomName)
  //       .emit(PoiSocketEvent.CONNECTED, cachedPoiConnection);

  //     this.logger.debug(
  //       `Socket ${socket.id} connected to POI connection ${cachedPoiConnection.id}`,
  //     );
  //   } catch {
  //     this.logger.error(
  //       `Socket ${socket.id} failed to connect to POI connection`,
  //     );
  //   }
  // }

  // @SubscribeMessage(PoiSocketEvent.POI_DISCONNECT)
  // async handlePoiDisConnection(
  //   @ConnectedSocket() socket: Socket,
  //   @MessageBody() data: RemovePoiConnectionReqDto,
  // ) {
  //   try {
  //     const roomName = this.getPoiRoomName(data.workspaceId);
  //     if (!socket.rooms.has(roomName)) {
  //       this.logger.warn(
  //         `Socket ${socket.id} tried to disconnect without joining ${data.workspaceId}`,
  //       );
  //       return;
  //     }

  //     // this.server.to(roomName).emit(PoiSocketEvent.DISCONNECTED, removedId);
  //   } catch {
  //     this.logger.error(
  //       `Socket ${socket.id} failed to disconnect from POI connection`,
  //     );
  //   }
  // }

  /**
   * Poi 위치를 드래그앤 드랍으로 바꾸는 경우
   */
  @SubscribeMessage(PoiSocketEvent.POIDRAG)
  async handlePoiDrag(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: PoiSocketDto,
  ) {}

  private getPoiRoomName(workspaceId: string) {
    return `poi:${workspaceId}`;
  }

  private validateRoomAuth(roomName: string, socket: Socket) {
    if (!socket.rooms.has(roomName)) {
      this.logger.warn(`Socket ${socket.id} tried to unmark`);
      throw new UnauthorizedException();
    }
  }
}
