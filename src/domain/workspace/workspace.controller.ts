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

@Controller('workspace')
export class WorkspaceController {
  private readonly logger = new Logger(WorkspaceController.name);
  constructor(
    private readonly workspaceService: WorkspaceService,
    private readonly reviewService: ReviewService,
    private readonly poiGateway: PoiGateway,
    private readonly poiService: PoiService,
    private readonly planDayService: PlanDayService,
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
