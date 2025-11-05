import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateWorkspaceDto } from '../dto/create-workspace.dto';
import { UpdateWorkspaceDto } from '../dto/update-workspace.dto';
import { PostService } from '../../post/post.service.js';
import { InjectRepository } from '@nestjs/typeorm';
import { Workspace } from '../entities/workspace.entity.js';
import { Repository } from 'typeorm';
import { plainToInstance } from 'class-transformer';
import { WorkspaceResponseDto } from '../dto/workspace-response.dto.js';
import { Transactional } from 'typeorm-transactional';
import { PlanDay } from '../entities/plan-day.entity.js';
import { Poi } from '../entities/poi.entity.js';
import { CreatePoiDto } from '../dto/create-poi.dto.js';
import { PoiCacheService } from './poi-cache.service.js';
import { CachedPoi, buildCachedPoi } from '../types/cached-poi.js';
import { Users } from '../../users/entities/users.entity.js';
import { PlanDayService } from './plan-day.service.js';
import { CreatePoiConnectionDto } from '../dto/create-poi-connection.dto.js';
import {
  buildCachedPoiConnection,
  CachePoiConnection,
} from '../types/cached-poi-connection.js';
import { PoiConnectionCacheService } from './poi-connection-cache.service.js';

@Injectable()
export class WorkspaceService {
  constructor(
    private readonly postService: PostService,
    @InjectRepository(Workspace)
    private readonly workspaceRepository: Repository<Workspace>,
    @InjectRepository(PlanDay)
    private readonly planDayRepository: Repository<PlanDay>,
    @InjectRepository(Poi)
    private readonly poiRepository: Repository<Poi>,
    private readonly poiCacheService: PoiCacheService,
    private readonly poiConnectionCacheService: PoiConnectionCacheService,
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
    const cachedPoiConnection: CachePoiConnection =
      buildCachedPoiConnection(dto);
    // 일단 update도 한번에 처리
    await this.poiConnectionCacheService.upsertPoiConnection(
      cachedPoiConnection,
    );
    return cachedPoiConnection;
  }

  async flushWorkspacePois(
    workspaceId: string,
  ): Promise<{ persistedPois: CachedPoi[]; newlyPersistedCount: number }> {
    const cachedPois = await this.poiCacheService.getWorkspacePois(workspaceId);
    if (cachedPois.length === 0) {
      return { persistedPois: [], newlyPersistedCount: 0 };
    }

    const poisToPersist = cachedPois.filter((poi) => !poi.persisted);
    const newlyPersistedCount = poisToPersist.length;
    if (poisToPersist.length > 0) {
      const missingPlanDay = poisToPersist.filter((poi) => !poi.planDayId);
      if (missingPlanDay.length > 0) {
        throw new BadRequestException(
          '[POI Persist 실패] : 누락된 PlanDay ID가 있습니다',
        );
      }

      // 순회하면서 entity 만드록 한번에 save
      const entities = poisToPersist.map((poi) =>
        this.poiRepository.create({
          longitude: poi.longitude,
          latitude: poi.latitude,
          address: poi.address,
          placeName: poi.placeName ?? '',
          createdBy: { id: poi.createdBy } as Users,
          planDay: { id: poi.planDayId as string } as PlanDay,
        }),
      );

      if (entities.length > 0) {
        await this.poiRepository.save(entities);
      }
    }

    await this.poiCacheService.clearWorkspacePois(workspaceId);
    // todo : DTO 형식 바꾸기
    return {
      persistedPois: cachedPois.map((poi) => ({ ...poi, persisted: true })),
      newlyPersistedCount,
    };
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
