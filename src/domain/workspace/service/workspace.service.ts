import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateWorkspaceReqDto } from '../dto/create-workspace-req.dto';
import { PostService } from '../../post/post.service.js';
import { InjectRepository } from '@nestjs/typeorm';
import { Workspace } from '../entities/workspace.entity.js';
import { Repository } from 'typeorm';
import { plainToInstance } from 'class-transformer';
import { WorkspaceResDto } from '../dto/workspace-res.dto.js';
import { Transactional } from 'typeorm-transactional';
import { PlanDay } from '../entities/plan-day.entity.js';
import { PoiCreateReqDto } from '../dto/poi/poi-create-req.dto.js';
import { PoiCacheService } from './poi-cache.service.js';
import { CachedPoi, buildCachedPoiFromCreateDto } from '../types/cached-poi.js';
import { PlanDayService } from './plan-day.service.js';
import { PoiService } from './poi.service.js';
import { PlanDayResDto } from '../dto/planday/plan-day-res.dto.js';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class WorkspaceService {
  constructor(
    private readonly postService: PostService,
    @InjectRepository(Workspace)
    private readonly workspaceRepository: Repository<Workspace>,
    @InjectRepository(PlanDay)
    private readonly planDayRepository: Repository<PlanDay>,
    private readonly poiCacheService: PoiCacheService,
    private readonly poiService: PoiService,
    private readonly planDayService: PlanDayService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  @Transactional()
  async create(createWorkspaceDto: CreateWorkspaceReqDto) {
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

    if (existsWorkspace) {
      const planDayDtos: PlanDayResDto[] =
        await this.planDayService.getWorkspacePlanDays(existsWorkspace.id);

      const workspaceResDto = this.toWorkspaceResponseDto(existsWorkspace);
      return {
        planDayDtos,
        workspaceResDto,
      };
    }

    // workspace 생성
    // todo : planDayId도 넘기기
    const workspace = this.workspaceRepository.create({
      workspaceName: workspaceName,
      post: { id: postDto.id },
    });

    const savedWorkspace = await this.workspaceRepository.save(workspace);

    // plan_day 생성
    const planDayDtos: PlanDayResDto[] =
      await this.planDayService.createPlanDays(
        savedWorkspace,
        postDto.startDate,
        postDto.endDate,
      );

    // todo : resposedto 형식 바꾸기 (planday도 포함)
    const workspaceResDto = this.toWorkspaceResponseDto(savedWorkspace);

    return {
      planDayDtos,
      workspaceResDto,
    };
  }

  async cachePoi(dto: PoiCreateReqDto): Promise<CachedPoi> {
    const cachedPoi: CachedPoi = buildCachedPoiFromCreateDto(dto);
    await this.poiCacheService.upsertPoi(dto.workspaceId, cachedPoi);
    return cachedPoi;
  }

  async isExist(workspaceId: string): Promise<boolean> {
    return await this.workspaceRepository.existsBy({
      id: workspaceId,
    });
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

  private toWorkspaceResponseDto(workspace: Workspace | null): WorkspaceResDto {
    if (!workspace) {
      throw new NotFoundException("Workspace doesn't exist");
    }

    return plainToInstance(WorkspaceResDto, workspace, {
      excludeExtraneousValues: true,
    });
  }

  // async cachePoiConnection(
  //   dto: CreatePoiConnectionReqDto,
  // ): Promise<CachePoiConnection> {
  //   const planDay = await this.planDayService.getPlanDayWithWorkspace(
  //     dto.planDayId,
  //   );

  //   // TODO : 바꿀 것
  //   if (dto.workspaceId !== planDay.workspace.id) {
  //     throw new BadRequestException(
  //       'Plan day does not belong to the provided workspace',
  //     );
  //   }

  //   const cachedPoiConnection: CachePoiConnection =
  //     buildCachedPoiConnection(dto);

  //   // // 일단 update도 한번에 처리
  //   // await this.poiConnectionCacheService.upsertPoiConnection(
  //   //   cachedPoiConnection,
  //   // );
  //   return cachedPoiConnection;
  // }

  // async flushConnections(workspaceId: string) {
  //   const connections: CachePoiConnection[] =
  //     await this.poiConnectionCacheService.getPoiConnections(workspaceId);

  //   if (connections.length === 0) return;

  //   const connectionToPersist = connections.filter((c) => !c.isPersisted);

  //   // todo : 이거 배치 처리하는 거 알아보기
  //   if (connectionToPersist.length > 0) {
  //     try {
  //       await Promise.all(
  //         connectionToPersist.map((connection) =>
  //           this.poiConnectionService.persistPoiConnection(connection),
  //         ),
  //       );
  //     } catch (e) {
  //       console.log('connection persist error', e);
  //       throw e;
  //     }
  //   }
  //   await this.poiConnectionCacheService.clearWorkspacePoiConnections(
  //     workspaceId,
  //   );
  // }

  async searchPlaces(query: string) {
    const kakaoKey = this.configService.get<string>('KAKAOMAP_REST_API_KEY');
    const url = 'https://dapi.kakao.com/v2/local/search/keyword.json';

    try {
      const response = await lastValueFrom(
        this.httpService.get(url, {
          headers: { Authorization: `KakaoAK ${kakaoKey}` },
          params: { query: query, size: 30 },
        }),
      );

      return response.data.documents.map((place) => ({
        name: place.place_name,
        address: place.address_name,
        road_address: place.road_address_name,
        phone: place.phone,
        x: parseFloat(place.x),
        y: parseFloat(place.y),
        url: place.place_url,
        category: place.category_name,
      }));
    } catch (error) {
      throw new Error('Kakao API 호출 실패');
    }
  }
}
