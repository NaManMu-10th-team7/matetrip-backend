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
import { PlaceService } from '../../place/place.service.js';
import { PoiRemoveReqDto } from '../dto/poi/poi-remove-req.dto.js';
import { PoiResDto } from '../dto/poi/poi-res.dto.js';
import { PoiAddScheduleReqDto } from '../dto/poi/poi-add-schedule-req.dto.js';
import { PoiReorderReqDto } from '../dto/poi/poi-reorder-req.dto.js';
import { CursorMoveDto } from '../dto/poi/cursor-move.dto.js';
import { PoiHoverReqDto } from '../dto/poi/poi-hover-req.dto.js';
import { MapClickReqDto } from '../dto/poi/map-click-req.dto.js';
import { PlaceFocusReqDto } from '../dto/poi/place-focus-req.dto.js';
import { RabbitmqProducer } from '../../../infra/rabbitmq/rabbitmq.producer.js';
import {
  BehaviorEventType,
  EnqueueBehaviorEventDto,
} from '../../../infra/rabbitmq/dto/enqueue-behavior-event.dto.js';
import { CachedPoi } from '../types/cached-poi.js';

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
  CURSOR_MOVE: 'cursorMove',
  CURSOR_MOVED: 'cursorMoved',
  POI_HOVER: 'poi:hover',
  POI_HOVERED: 'poi:hovered',
  MAP_CLICK: 'map:click',
  MAP_CLICKED: 'map:clicked',
  PLACE_FOCUS: 'place:focus',
  PLACE_FOCUSED: 'place:focused',
} as const;

@UsePipes(
  new ValidationPipe({
    transform: true, // 들어오는 데이터를 DTO 타입으로 자동 변환
    forbidNonWhitelisted: true, // DTO에 정의되지 않은 속성이 있으면 요청 거부
  }),
)
@WebSocketGateway(3003, {
  namespace: 'poi',
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || [
      'http://13.125.171.175:3000/',
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
    private readonly rabbitMQProducer: RabbitmqProducer,
    private readonly placeService: PlaceService,
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
  ): Promise<void> {
    try {
      const roomName = this.getPoiRoomName(data.workspaceId);
      this.validateRoomAuth(roomName, socket);

      const cachedPoi = await this.workspaceService.cachePoi(data);

      this.server.to(roomName).emit(PoiSocketEvent.MARKED, cachedPoi);

      // 행동 이벤트 전송
      this.sendBehaviorEvent(cachedPoi, BehaviorEventType.POI_MARK);

      this.logger.debug(
        `Socket ${socket.id} marked POI in workspace ${data.workspaceId}`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Socket ${socket.id} failed to mark POI in workspace ${data.workspaceId}: ${message}`,
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

      // 삭제 전에 캐시에서 POI 정보 가져오기 (행동 이벤트용)
      const cachedPoi: CachedPoi | undefined =
        await this.poiCacheService.getPoi(data.workspaceId, data.poiId);

      if (!cachedPoi) {
        this.logger.warn(
          `Failed to unmark POI ${data.poiId} POI not found in cache`,
        );
        return;
      }

      // UnmarkEvent 전달
      console.log(`UNMARK Event : ${data.poiId}`);
      this.sendBehaviorEvent(cachedPoi, BehaviorEventType.POI_UNMARK);

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

      this.server
        .to(roomName)
        .emit(PoiSocketEvent.UNMARKED, { poiId: data.poiId });

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

      const poi: CachedPoi | undefined = await this.poiCacheService.getPoi(
        data.workspaceId,
        data.poiId,
      );

      if (!poi) {
        this.logger.warn(`Failed to add POI to schedule`);
        return;
      }

      // ScheduleEvent 전달
      this.sendBehaviorEvent(poi, BehaviorEventType.POI_SCHEDULE);

      // 모든 클라이언트에 알림
      this.server.to(roomName).emit(PoiSocketEvent.ADD_SCHEDULE, {
        poiId: data.poiId,
        planDayId: data.planDayId,
      });

      this.logger.debug(`Added POI to schedule in planDay ${data.planDayId}`);
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
      const poi: CachedPoi | undefined = await this.poiCacheService.getPoi(
        data.workspaceId,
        data.poiId,
      );

      if (!poi) {
        this.logger.warn(`Failed to remove POI from schedule`);
        return;
      }

      // RemoveScheduleEvent 전달
      this.sendBehaviorEvent(poi, BehaviorEventType.POI_UNSCHEDULE);
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

  @SubscribeMessage(PoiSocketEvent.CURSOR_MOVE)
  handleCursorMove(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: CursorMoveDto,
  ) {
    try {
      const roomName = this.getPoiRoomName(data.workspaceId);
      this.validateRoomAuth(roomName, socket);

      socket.to(roomName).emit(PoiSocketEvent.CURSOR_MOVED, data);
    } catch (error) {
      this.logger.error(
        `Socket ${socket.id} failed to move cursor in workspace ${data.workspaceId}`,
        error,
      );
    }
  }

  @SubscribeMessage(PoiSocketEvent.POI_HOVER)
  handlePoiHover(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: PoiHoverReqDto,
  ) {
    try {
      const roomName = this.getPoiRoomName(data.workspaceId);
      this.validateRoomAuth(roomName, socket);

      // 자신을 제외한 다른 클라이언트에게만 이벤트 전송
      const payload = {
        poiId: data.poiId,
        userId: data.userId,
      };
      socket.to(roomName).emit(PoiSocketEvent.POI_HOVERED, payload);
    } catch (error) {
      this.logger.error(
        `Socket ${socket.id} failed to handle POI hover in workspace ${data.workspaceId}`,
        error,
      );
    }
  }

  @SubscribeMessage(PoiSocketEvent.MAP_CLICK)
  handleMapClick(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: MapClickReqDto,
  ) {
    try {
      const roomName = this.getPoiRoomName(data.workspaceId);
      this.validateRoomAuth(roomName, socket);

      // 자신을 제외한 다른 클라이언트에게만 이벤트 전송
      const payload = {
        position: data.position,
        userId: data.userId,
        userColor: data.userColor,
        userName: data.userName,
      };
      socket.to(roomName).emit(PoiSocketEvent.MAP_CLICKED, payload);

      this.logger.debug(
        `[MAP_CLICK] Received from socket ${socket.id} for workspace ${data.workspaceId}. User: ${data.userName}`,
      );
      this.logger.debug(
        `[MAP_CLICKED] Emitted to room ${roomName}. Payload: ${JSON.stringify(payload)}`,
      );
    } catch (error) {
      this.logger.error(
        `Socket ${socket.id} failed to handle map click in workspace ${data.workspaceId}`,
        error,
      );
    }
  }

  @SubscribeMessage(PoiSocketEvent.PLACE_FOCUS)
  async handlePlaceFocus(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: PlaceFocusReqDto,
  ) {
    try {
      const roomName = this.getPoiRoomName(data.workspaceId);
      this.validateRoomAuth(roomName, socket);

      // 지도 bounds 내의 장소 목록 (인기도 점수 포함)
      const places = await this.placeService.getPlacesInBoundsWithPopularity({
        southWestLatitude: data.southWestLatitude,
        southWestLongitude: data.southWestLongitude,
        northEastLatitude: data.northEastLatitude,
        northEastLongitude: data.northEastLongitude,
      });

      // 요청한 클라이언트에게 장소 목록 반환
      socket.emit(PoiSocketEvent.PLACE_FOCUSED, {
        userId: data.userId,
        userName: data.userName,
        places,
      });
      this.logger.debug(
        `[PLACE_FOCUS] User ${data.userName} focused, returned ${places.length} places with popularity scores`,
      );
    } catch (error) {
      this.logger.error(
        `Socket ${socket.id} failed to handle place focus in workspace ${data.workspaceId}`,
        error,
      );
    }
  }
  /**
   * Python AI 서버 등 외부에서 호출 가능한 broadcast 메서드
   * Socket 연결 없이 특정 workspace의 모든 클라이언트에게 REORDER 이벤트 전파
   * @param workspaceId - 워크스페이스 ID
   * @param planDayId - 일정 day ID
   * @param poiIds - 최적화된 POI ID 순서
   * @param apiKey - AI 서버 인증용 API Key (선택)
   */
  public async broadcastPoiReorder(
    workspaceId: string,
    planDayId: string,
    poiIds: string[],
    apiKey?: string,
  ) {
    try {
      // API Key 검증 (환경변수 설정 시에만)
      const expectedApiKey = process.env.AI_SERVER_API_KEY;
      if (expectedApiKey && apiKey !== expectedApiKey) {
        this.logger.warn(
          `Invalid API key attempt for workspace ${workspaceId}`,
        );
        throw new UnauthorizedException('Invalid API key');
      }

      const roomName = this.getPoiRoomName(workspaceId);

      // Redis List 순서 업데이트
      await this.poiCacheService.reorderScheduledPois(
        workspaceId,
        planDayId,
        poiIds,
      );

      // 같은 room의 모든 클라이언트에게 순서 변경 알림
      this.server.to(roomName).emit(PoiSocketEvent.REORDER, {
        planDayId,
        poiIds,
      });

      this.logger.debug(
        `[AI Optimize] Broadcasted POI reorder in planDay ${planDayId}: ${poiIds.join(', ')}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to broadcast POI reorder in planDay ${planDayId}`,
        error,
      );
      throw error;
    }
  }

  /**
   * 특정 워크스페이스의 모든 클라이언트에게 현재 POI 목록 전체를 브로드캐스트합니다.
   * @param workspaceId 동기화할 워크스페이스 ID
   */
  async broadcastSync(workspaceId: string) {
    try {
      const roomName = this.getPoiRoomName(workspaceId);
      const pois: PoiResDto[] =
        await this.poiService.getWorkspacePois(workspaceId);

      this.server.to(roomName).emit(PoiSocketEvent.SYNC, { pois });

      this.logger.log(
        `[BROADCAST_SYNC] Synced ${pois.length} POIs to room: ${roomName}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to broadcast sync for workspace ${workspaceId}`,
        error,
      );
    }
  }

  private getPoiRoomName(workspaceId: string) {
    return `poi:${workspaceId}`;
  }

  private validateRoomAuth(roomName: string, socket: Socket) {
    if (!socket.rooms.has(roomName)) {
      this.logger.warn(`Socket ${socket.id} tried to unmark`);
      throw new UnauthorizedException();
    }
  }

  /**
   * 행동 이벤트를 RabbitMQ에 전송하는 공통 메서드
   * @param cachedPoi - 캐시된 POI 정보
   * @param eventType - 행동 이벤트 타입
   * @param placeId - focus에서 추천받은 place의 ID (옵셔널)
   */
  private sendBehaviorEvent(
    cachedPoi: CachedPoi,
    eventType: BehaviorEventType,
  ): void {
    if (!cachedPoi) {
      this.logger.warn(`행동 Event 전송 건너뜀: cachedPoi가 없습니다.`);
      return;
    }

    const placeId = cachedPoi.placeId;
    try {
      const behaviorEvent = EnqueueBehaviorEventDto.fromCachedPoi(
        cachedPoi,
        eventType,
        placeId,
      );
      this.rabbitMQProducer.enqueueBehaviorEvent(behaviorEvent);
      this.logger.debug(`행동 Event 전송 : ${eventType} for place ${placeId}`);
    } catch (error) {
      this.logger.error(`행동 Event 전송 실패 : ${eventType}`, error);
    }
  }
}
