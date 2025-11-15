import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
  Req,
  Query,
} from '@nestjs/common';
import { WorkspaceService } from './service/workspace.service';
import { CreateWorkspaceReqDto } from './dto/create-workspace-req.dto';
import { AuthGuard } from '@nestjs/passport';
import { CreateReviewDto } from '../review/dto/create-review.dto';
import { ReviewService } from '../review/review.service';
import { PoiGateway } from './gateway/poi.gateway.js';
import { PoiOptimizeReqDto } from './dto/poi/poi-optimize-req.dto.js';
import { PlanReqDto } from './dto/workspace-res.dto';
import { RegionGroup } from '../place/entities/region_group.enum.js';

@Controller('workspace')
export class WorkspaceController {
  constructor(
    private readonly workspaceService: WorkspaceService,
    private readonly reviewService: ReviewService,
    private readonly poiGateway: PoiGateway,
  ) {}

  @Post()
  create(@Body() createWorkspaceDto: CreateWorkspaceReqDto) {
    return this.workspaceService.create(createWorkspaceDto);
  }

  @Post('generate-ai-plan')
  async generatePlan(
    @Param('userId') userId: string,
    @Body() createPlanDto: PlanReqDto,
  ) {
    return this.workspaceService.createAiPlan(userId, createPlanDto);
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

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.workspaceService.findOne(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.workspaceService.remove(id);
  }

  /**
   * 워크스페이스에 연결된 게시글의 모든 참여자 ID를 조회합니다.
   */
  @Get(':workspaceId/participants')
  async getParticipantUserIds(@Param('workspaceId') workspaceId: string) {
    return this.workspaceService.getParticipantUserIds(workspaceId);
  }

  /**
   * 워크스페이스 참여자 모두의 성향을 종합하여 장소를 추천합니다.
   */
  @Get(':workspaceId/recommendations')
  async getConsensusRecommendations(
    @Param('workspaceId') workspaceId: string,
    @Query('region') region: RegionGroup,
  ) {
    // TODO: 현재 post에는 region 이 아니라 location 으로 되어 있음.
    // - 추후에 location을 region 중에서 선택하게 할 것이므로
    // - 일단은 workspaceId 로 post 를 검색하고, 그 post에 있는 location 을 region 으로 전달해서 처리하기
    return this.workspaceService.getConsensusRecommendations(
      workspaceId,
      region,
    );
  }
}
