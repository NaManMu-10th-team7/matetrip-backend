import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
  Req,
  Logger,
  NotFoundException,
  Headers,
} from '@nestjs/common';
import { WorkspaceService } from './service/workspace.service';
import { CreateWorkspaceReqDto } from './dto/create-workspace-req.dto';
import { AuthGuard } from '@nestjs/passport';
import { CreateReviewDto } from '../review/dto/create-review.dto';
import { ReviewService } from '../review/review.service';
import { PoiGateway } from './gateway/poi.gateway.js';
import { PoiOptimizeReqDto } from './dto/poi/poi-optimize-req.dto.js';
import { PlanReqDto } from './dto/workspace-res.dto';
import { PlanDayScheduledPoisGroupDto } from './dto/poi/get-date-grouped-scheduled-pois.dto.js';
import { PoiAddScheduleReqDto } from './dto/poi/poi-add-schedule-req.dto.js';
import { PoiService } from './service/poi.service.js';
import { PlanDayService } from './service/plan-day.service.js';
import { PlanDayResDto } from './dto/planday/plan-day-res.dto.js';
import { ChimeMeetingService } from './service/chime-meeting.service.js';
import { JoinChimeMeetingDto } from './dto/chime/join-chime-meeting.dto.js';

import { AddScheduleByPlaceReqDto } from './dto/poi/poi-add-schedule-by-place-req.dto.js';
import { AiScheduleBatchCreateReqDto } from './dto/poi/ai-schedule-batch-create-req.dto.js';
import { AiScheduleReplaceReqDto } from './dto/poi/ai-schedule-replace-req.dto.js';

@Controller('workspace')
export class WorkspaceController {
  private readonly logger = new Logger(WorkspaceController.name);
  constructor(
    private readonly workspaceService: WorkspaceService,
    private readonly reviewService: ReviewService,
    private readonly poiGateway: PoiGateway,
    private readonly poiService: PoiService,
    private readonly planDayService: PlanDayService,
    private readonly chimeMeetingService: ChimeMeetingService,
  ) {}

  @Post()
  create(@Body() createWorkspaceDto: CreateWorkspaceReqDto) {
    return this.workspaceService.create(createWorkspaceDto);
  }

  @Post('generate-ai-plan')
  async generatePlan(@Body() createPlanDto: PlanReqDto) {
    return this.workspaceService.getConsensusRecommendedAccommodations(
      createPlanDto,
    );
  }

  @Post(':workspaceId/chime/join')
  async joinChimeMeeting(
    @Param('workspaceId') workspaceId: string,
    @Body() joinDto: JoinChimeMeetingDto,
  ) {
    const exists = await this.workspaceService.isExist(workspaceId);
    if (!exists) {
      throw new NotFoundException("Workspace doesn't exist");
    }

    const { meeting, attendee } = await this.chimeMeetingService.joinWorkspace(
      workspaceId,
      joinDto.userId,
      joinDto.username ?? joinDto.userId,
    );

    return {
      meeting,
      attendee,
      joinInfo: { meeting, attendee }, // 프론트에서 바로 Amazon Chime SDK에 넘길 수 있는 구조
    };
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':workspaceId/reviews')
  createReview(
    @Param('workspaceId') workspaceId: string,
    @Body() createReviewDtos: CreateReviewDto[],
    @Req() req: Request & { user: { id: string } },
  ) {
    const userId = req.user.id;
    return this.reviewService.create(createReviewDtos, workspaceId, userId);
  }

  /**
   * Python AI 서버로부터 POI 최적화 결과를 받아 WebSocket으로 브로드캐스트
   * @param optimizeData - 최적화된 POI 순서 정보
   */
  @Post('poi/optimize')
  async optimizePoiBroadcast(@Body() optimizeData: PoiOptimizeReqDto) {
    await this.poiGateway.broadcastPoiReorder(
      optimizeData.workspaceId,
      optimizeData.planDayId,
      optimizeData.poiIds,
      optimizeData.apiKey,
    );

    return {
      success: true,
      message: 'POI order optimized and broadcasted successfully',
    };
  }

  /**
   * AI 에이전트가 POI를 특정 날짜의 일정에 추가할 때 호출하는 엔드포인트
   */
  @Post('poi/add-schedule')
  async addPoiToScheduleByAi(@Body() data: PoiAddScheduleReqDto) {
    // AI 에이전트의 요청임을 검증하는 로직 추가 가능 (e.g. API Key)
    await this.poiService.addPoiToSchedule(data);

    return {
      success: true,
      message: 'POI added to schedule and broadcasted successfully',
    };
  }

  /**
   * AI 에이전트가 placeId를 이용해 POI를 생성하고 바로 일정에 추가할 때 호출하는 엔드포인트
   */
  @Post('schedule/add-by-place')
  async addScheduleByPlace(@Body() reqDto: AddScheduleByPlaceReqDto) {
    await this.workspaceService.addScheduleByPlace(reqDto);
    return {
      success: true,
      message: 'POI created and added to schedule successfully',
    };
  }

  /**
   * AI 에이전트가 여행 코스를 생성할 때 일괄적으로 POI를 일정에 추가하는 엔드포인트
   * 기존 POI/일정을 모두 삭제하고 새로운 POI들을 생성합니다.
   * @param workspaceId - 워크스페이스 ID
   * @param data - AI가 생성한 장소 목록
   * @param apiKey - AI 서버 인증용 API Key
   */
  @Post(':workspaceId/ai/schedule-batch')
  async createAiScheduleBatch(
    @Param('workspaceId') workspaceId: string,
    @Body() data: AiScheduleBatchCreateReqDto,
  ) {
    // TODO : API Key 검증

    // 1. 기존 POI 및 일정 전체 삭제
    await this.workspaceService.clearAllPois(workspaceId);

    // 2. 새로운 POI들 생성 및 일정 추가
    const createdPois = await this.workspaceService.createAiScheduleBatch(
      workspaceId,
      data,
    );

    // 3. 모든 클라이언트에게 브로드캐스트
    await this.poiGateway.broadcastSync(workspaceId);

    return {
      success: true,
      count: createdPois.length,
      message: `Successfully created ${createdPois.length} POIs and broadcasted to all clients`,
    };
  }

  /**
   * AI 에이전트가 일정 내 장소를 교체할 때 사용하는 엔드포인트
   * @param workspaceId - 워크스페이스 ID
   * @param data - AI가 생성한 교체 장소 목록
   */
  @Post(':workspaceId/ai/replace-schedule')
  async replaceAiSchedulePlaces(
    @Param('workspaceId') workspaceId: string,
    @Body() data: AiScheduleReplaceReqDto,
  ) {
    // TODO : API Key 검증
    // Service 레이어에서 교체 로직 수행
    await this.workspaceService.replaceSchedulePlaces(workspaceId, data);
    // 모든 클라이언트에게 브로드캐스트 (Redis 캐시 동기화 + Socket)
    await this.poiGateway.broadcastSync(workspaceId);
  }

  /**
   * 특정 워크스페이스 내에서 placeId를 기준으로 POI를 조회합니다.
   * @param workspaceId - 워크스페이스 ID
   * @param placeId - 장소 ID
   * @returns PoiResDto
   */
  @Get(':workspaceId/poi/by-place/:placeId')
  async getPoiByPlaceId(
    @Param('workspaceId') workspaceId: string,
    @Param('placeId') placeId: string,
  ) {
    const poi = await this.poiService.getPoiByPlaceId(workspaceId, placeId);
    if (!poi) {
      throw new NotFoundException(
        `POI with placeId ${placeId} not found in workspace ${workspaceId}`,
      );
    }
    return poi;
  }

  /**
   * @description 워크스페이스의 모든 PlanDay 목록을 조회합니다.
   * @param workspaceId - 워크스페이스 ID
   * @returns PlanDayResDto[]
   */
  @Get(':workspaceId/plan-days')
  async getWorkspacePlanDays(
    @Param('workspaceId') workspaceId: string,
  ): Promise<PlanDayResDto[]> {
    return this.planDayService.getWorkspacePlanDays(workspaceId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.workspaceService.findOne(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.workspaceService.remove(id);
  }

  /**
   * 워크스페이스 참여자 모두의 성향을 종합하여 장소를 추천합니다.
   */
  @Get(':workspaceId/recommendations')
  async getConsensusRecommendations(@Param('workspaceId') workspaceId: string) {
    return this.workspaceService.getConsensusRecommendations(workspaceId);
  }

  /**
   * @description 워크스페이스에 연결된 게시글 정보를 조회합니다.
   */
  @Get(':workspaceId/post')
  getPostByWorkspaceId(@Param('workspaceId') workspaceId: string) {
    return this.workspaceService.getPostByWorkspaceId(workspaceId);
  }

  @Get(':workspaceId/scheduled-pois')
  getScheduledPois(
    @Param('workspaceId') workspaceId: string,
  ): Promise<PlanDayScheduledPoisGroupDto[]> {
    this.logger.log(`[getScheduledPois] 시작 - workspaceId: ${workspaceId}`);
    return this.poiService.getScheduledPois(workspaceId);
  }
}
