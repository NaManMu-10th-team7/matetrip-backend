import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Poi } from '../entities/poi.entity.js';
import { In, Repository } from 'typeorm';
import { PoiCacheService } from './poi-cache.service.js';
import { CachedPoi } from '../types/cached-poi.js';
import { Users } from '../../users/entities/users.entity.js';
import { PlanDay } from '../entities/plan-day.entity.js';
import { Place } from '../../place/entities/place.entity.js';
import { PlanDayService } from './plan-day.service.js';
import { PlanDayResDto } from '../dto/planday/plan-day-res.dto.js';
import { PoiResDto } from '../dto/poi/poi-res.dto.js';

@Injectable()
export class PoiService {
  constructor(
    @InjectRepository(Poi)
    private readonly poiRepository: Repository<Poi>,
    private readonly planDayService: PlanDayService,
    private readonly poiCacheService: PoiCacheService,
  ) {}

  async persistPoi(cachedPoi: CachedPoi): Promise<Poi> {
    const poi = this.poiRepository.create({
      placeName: cachedPoi.placeName,
      longitude: cachedPoi.longitude,
      latitude: cachedPoi.latitude,
      address: cachedPoi.address,
      createdBy: { id: cachedPoi.createdBy } as Users,
      planDay: { id: cachedPoi.planDayId as string } as PlanDay,
    });
    return this.poiRepository.save(poi);
  }

  // workspace의 저장된 poi들 전부 반환
  // 캐시에 있다면 그대로 반환
  // 캐시에 없다면 DB에서 반환 후 캐시
  async getWorkspacePois(workspaceId: string): Promise<PoiResDto[]> {
    const cached = await this.poiCacheService.getWorkspacePois(workspaceId);
    if (cached.length > 0) {
      return cached.map((poi) => PoiResDto.fromCachedPoi(poi));
    }

    // DB에서 찾고 캐시에 저장
    const planDays: PlanDayResDto[] =
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
      // TODO: 너무 무거운 JOIN인가 의심되니까 나중에 Refac생각해보기(일단 나중에) ex. userId만 필요한데 전체를 가져오니까
      relations: ['createdBy', 'planDay', 'place'],
    });

    await this.poiCacheService.setWorkspacePois(workspaceId, pois);

    return pois.map((poi) => PoiResDto.fromEntity(poi, workspaceId));
  }

  async removeWorkspacePoi(
    workspaceId: string,
    poiId: string,
  ): Promise<string> {
    // DB에서 먼저 삭제 시도
    await this.poiRepository.delete({ id: poiId });

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

    const missingPlanDay = cachedPois.filter((poi) => !poi.planDayId);
    if (missingPlanDay.length > 0) {
      throw new BadRequestException(
        'planDayId is required to persist POIs for a workspace',
      );
    }

    /**
     * 1. 모든 POI를 DB에 upsert
     * - 새로 생성된 POI (isPersisted=false)
     * - 상태가 변경된 POI (SCHEDULED↔MARKED)
     * - sequence가 변경된 POI
     */
    const newlyPersistedCount = cachedPois.filter(
      (poi) => !poi.isPersisted,
    ).length;

    const entities = cachedPois.map((poi) =>
      this.poiRepository.create({
        id: poi.id,
        longitude: poi.longitude,
        latitude: poi.latitude,
        address: poi.address,
        place: poi.placeId ? ({ id: poi.placeId } as Place) : undefined,
        placeName: poi.placeName ?? '',
        status: poi.status,
        sequence: poi.sequence,
        createdBy: { id: poi.createdBy } as Users,
        planDay: { id: poi.planDayId as string } as PlanDay,
      }),
    );

    // 모든 POI upsert: id 중복이면 update, 아니면 insert
    // 변경 없는 POI는 실제로 write 안 일어남 (DB 최적화)
    await this.poiRepository.upsert(entities, ['id']);

    const planDayIds =
      await this.planDayService.getWorkspacePlanDayIds(workspaceId);

    await this.poiCacheService.clearWorkspacePois(workspaceId, planDayIds);

    return {
      persistedPois: cachedPois.map((poi) => ({ ...poi, isPersisted: true })),
      newlyPersistedCount,
    };
  }

  // async getScheduledPoisWithDate(workspaceId: string): Promise<Poi[]> {
  //   const planDays: PlanDayResDto[] =
  //     await this.planDayService.getWorkspacePlanDays(workspaceId);

  //   if (planDays.length === 0) {
  //     return [];
  //   }

  //   const planDayIds = planDays.map((planDay) => planDay.id);
  //   // 캐시 찾기
  //   // planDayIds.map(() -> {
  //   //   poiCacheService.getsh
  //   // })
  //   return this.poiRepository.find({
  //     where: {
  //       planDay: {
  //         workspace: { id: workspaceId },
  //         status: PlanDayStatus.SCHEDULED,
  //       },
  //     },
  //   });
}
