import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateWorkspaceDto } from '../dto/create-workspace.dto';
import { PostService } from '../../post/post.service.js';
import { InjectRepository } from '@nestjs/typeorm';
import { Workspace } from '../entities/workspace.entity.js';
import { Repository } from 'typeorm';
import { plainToInstance } from 'class-transformer';
import { WorkspaceResponseDto } from '../dto/workspace-response.dto.js';
import { Transactional } from 'typeorm-transactional';
import { PlanDay } from '../entities/plan-day.entity.js';
import { CreatePoiDto } from '../dto/create-poi.dto.js';
import { PoiCacheService } from './poi-cache.service.js';
import { CachedPoi, buildCachedPoi } from '../types/cached-poi.js';
import { PlanDayService } from './plan-day.service.js';
import { CreatePoiConnectionDto } from '../dto/create-poi-connection.dto.js';
import {
  buildCachedPoiConnection,
  CachePoiConnection,
} from '../types/cached-poi-connection.js';
import { PoiConnectionCacheService } from './poi-connection-cache.service.js';
import { PoiConnectionService } from './poi-connection.service.js';
import { PoiService } from './poi.service.js';

@Injectable()
export class WorkspaceService {
  constructor(
    private readonly postService: PostService,
    @InjectRepository(Workspace)
    private readonly workspaceRepository: Repository<Workspace>,
    @InjectRepository(PlanDay)
    private readonly planDayRepository: Repository<PlanDay>,
    private readonly poiCacheService: PoiCacheService,
    private readonly poiConnectionCacheService: PoiConnectionCacheService,
    private readonly poiConnectionService: PoiConnectionService,
    private readonly poiService: PoiService,
    private readonly planDayService: PlanDayService,
  ) {}

  @Transactional()
  async create(createWorkspaceDto: CreateWorkspaceDto) {
    /**
     * 1. postId에 맞는 workSpace가 있는지 확인
     * 2. 있으면 그에 맞는 workSpace 그대로 반환
     * 3. 없으면 새로 생성
     *
     * 생성
     * - workspace
     * - 날짜별 plan_day 객체
     */
    const { postId, workspaceName } = createWorkspaceDto;
    const postDto = await this.postService.findOne(postId);

    const existsWorkspace = await this.workspaceRepository.findOne({
      where: { post: { id: postId } },
    });

    // 이미 존재하는 workspace 어케처리할지는 미정
    if (existsWorkspace) {
      return this.toWorkspaceResponseDto(existsWorkspace);
    }

    // workspace 생성
    const workspace = this.workspaceRepository.create({
      workspaceName: workspaceName,
      post: { id: postDto.id },
    });

    const savedWorkspace = await this.workspaceRepository.save(workspace);

    const planDays: PlanDay[] = this.planDayService.createPlanDays(
      savedWorkspace,
      postDto.startDate,
      postDto.endDate,
    );
    // plan_day 생성

    if (planDays.length > 0) {
      await this.planDayRepository.save(planDays);
    }

    // todo : resposedto 형식 바꾸기 (planday도 포함)
    return this.toWorkspaceResponseDto(savedWorkspace);
  }

  async cachePoi(workspaceId: string, dto: CreatePoiDto): Promise<CachedPoi> {
    const cachedPoi: CachedPoi = buildCachedPoi(workspaceId, dto);
    await this.poiCacheService.upsertPoi(workspaceId, cachedPoi);
    return cachedPoi;
  }

  async cachePoiConnection(
    dto: CreatePoiConnectionDto,
  ): Promise<CachePoiConnection> {
    const planDay = await this.planDayService.getPlanDayWithWorkspace(
      dto.planDayId,
    );

    if (dto.workspaceId !== planDay.workspace.id) {
      throw new BadRequestException(
        'Plan day does not belong to the provided workspace',
      );
    }

    const cachedPoiConnection: CachePoiConnection =
      buildCachedPoiConnection(dto);

    // 일단 update도 한번에 처리
    await this.poiConnectionCacheService.upsertPoiConnection(
      cachedPoiConnection,
    );
    return cachedPoiConnection;
  }

  async flushConnections(workspaceId: string) {
    const connections: CachePoiConnection[] =
      await this.poiConnectionCacheService.getPoiConnections(workspaceId);

    if (connections.length === 0) return;

    const connectionToPersist = connections.filter((c) => !c.isPersisted);

    // todo : 이거 배치 처리하는 거 알아보기
    if (connectionToPersist) {
      await Promise.all(
        connectionToPersist.map((connection) =>
          this.poiConnectionService.persistPoiConnection(connection),
        ),
      );
    }
    await this.poiConnectionCacheService.clearWorkspacePoiConnections(
      workspaceId,
    );
  }

  async flushPois(workspaceId: string) {
    const cachedPois: CachedPoi[] =
      await this.poiCacheService.getWorkspacePois(workspaceId);

    if (cachedPois.length === 0) return;

    const poisToPersist: CachedPoi[] = cachedPois.filter(
      (poi) => !poi.isPersisted,
    );

    if (poisToPersist) {
      await Promise.all(
        poisToPersist.map((poi) => this.poiService.persistPoi(poi)),
      );
    }

    // 다 저장했으면 clear
    await this.poiCacheService.clearWorkspacePois(workspaceId);
  }

  async remove(id: string) {
    await this.workspaceRepository.delete(id);
  }

  async findOne(id: string) {
    const workspace = await this.workspaceRepository.findOne({
      where: { id },
    });
    return this.toWorkspaceResponseDto(workspace);
  }

  private toWorkspaceResponseDto(workspace: Workspace | null) {
    if (!workspace) {
      throw new NotFoundException("Workspace doesn't exist");
    }

    return plainToInstance(WorkspaceResponseDto, workspace, {
      excludeExtraneousValues: true,
    });
  }
}
