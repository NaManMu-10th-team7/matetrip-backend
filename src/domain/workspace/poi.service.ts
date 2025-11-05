import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Poi } from './entities/poi.entity.js';
import { In, Repository } from 'typeorm';
import { CreatePoiDto } from './dto/create-poi.dto.js';
import { PoiCacheService } from './poi-cache.service.js';
import {
  buildCachedPoi,
  buildCachedPoiFromEntity,
  CachedPoi,
} from './types/cached-poi.js';
import { Users } from '../users/entities/users.entity.js';
import { PlanDay } from './entities/plan-day.entity.js';
import { PlanDayService } from './plan-day.service.js';

@Injectable()
export class PoiService {
  constructor(
    @InjectRepository(Poi)
    private readonly poiRepository: Repository<Poi>,
    private readonly planDayService: PlanDayService,
    private readonly poiCacheService: PoiCacheService,
  ) {}

  async createPoi(workspaceId: string, dto: CreatePoiDto) {
    return this.cachePoi(workspaceId, dto);
  }

  // workspace의 저장된 poi들 전부 반환
  // 캐시에 있다면 그대로 반환
  // 캐시에 없다면 DB에서 반환 후 캐시
  async getWorkspacePois(workspaceId: string): Promise<CachedPoi[]> {
    const cached = await this.poiCacheService.getWorkspacePois(workspaceId);
    if (cached.length > 0) {
      // TODO: DTO로 변환
      return cached;
    }

    // DB에서 찾고 캐시에 저장
    const planDays: PlanDay[] =
      await this.planDayService.getWorkspacePlanDays(workspaceId);

    if (planDays.length === 0) {
      return [];
    }

    const planDayIds = planDays.map((planDay) => planDay.id);

    const pois: Poi[] = await this.poiRepository.find({
      where: {
        planDay: {
          id: In(planDayIds),
        },
      },
      relations: ['createdBy', 'planDay'],
      order: {
        createdAt: 'ASC',
      },
    });

    const cachedPois = pois.map((poi) =>
      buildCachedPoiFromEntity(poi, workspaceId),
    );
    await this.poiCacheService.setWorkspacePois(workspaceId, cachedPois);
    // TODO : DTO로 반환
    return cachedPois;
  }

  async removeWorkspacePoi(
    workspaceId: string,
    poiId: string,
  ): Promise<string> {
    // DB에서 먼저 삭제 시도
    const deleteResult = await this.poiRepository.delete({
      id: poiId,
    });

    if (deleteResult.affected === 0) {
      throw new NotFoundException(`POI with id ${poiId} not found`);
    }

    // DB 삭제 성공 후 캐시 제거
    await this.poiCacheService.removePoi(workspaceId, poiId);
    return poiId;
  }

  // Redis캐시에 쌓여 있는 POI들을 DB에 반영하고 캐시를 비우는 플러시
  async flushWorkspacePois(
    workspaceId: string,
  ): Promise<{ persistedPois: CachedPoi[]; newlyPersistedCount: number }> {
    const cachedPois = await this.poiCacheService.getWorkspacePois(workspaceId);
    // flush 할 것도 없는 경우
    if (cachedPois.length === 0) {
      return { persistedPois: [], newlyPersistedCount: 0 };
    }

    /**
     * flush 해야하는 경우
     * - 일단 persisted가 false인 애들 고르기
     * -
     */
    const poisToPersist = cachedPois.filter((poi) => !poi.persisted);
    const newlyPersistedCount = poisToPersist.length;
    if (poisToPersist.length > 0) {
      const missingPlanDay = poisToPersist.filter((poi) => !poi.planDayId);
      if (missingPlanDay.length > 0) {
        throw new BadRequestException(
          'planDayId is required to persist POIs for a workspace',
        );
      }

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

      await this.poiRepository.save(entities);
    }

    await this.poiCacheService.clearWorkspacePois(workspaceId);

    return {
      persistedPois: cachedPois.map((poi) => ({ ...poi, persisted: true })),
      newlyPersistedCount,
    };
  }

  private async cachePoi(
    workspaceId: string,
    dto: CreatePoiDto,
  ): Promise<CachedPoi> {
    // cachedPoi 전용 DTO 변환
    const cachedPoi = buildCachedPoi(workspaceId, dto);

    // Redis에 저장
    await this.poiCacheService.upsertPoi(workspaceId, cachedPoi);
    return cachedPoi;
  }
}
