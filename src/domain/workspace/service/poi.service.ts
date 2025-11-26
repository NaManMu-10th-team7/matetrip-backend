import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  forwardRef,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { Poi } from '../entities/poi.entity.js';
import { DataSource, In, Repository } from 'typeorm';
import { PoiCacheService } from './poi-cache.service.js';
import { CachedPoi } from '../types/cached-poi.js';
import { Users } from '../../users/entities/users.entity.js';
import { PlanDay } from '../entities/plan-day.entity.js';
import { Place } from '../../place/entities/place.entity.js';
import { PlanDayService } from './plan-day.service.js';
import { PlanDayResDto } from '../dto/planday/plan-day-res.dto.js';
import { PoiResDto } from '../dto/poi/poi-res.dto.js';
import {
  PlanDayScheduledPoisGroupDto,
  PlanDayScheduleSummaryDto,
} from '../dto/poi/get-date-grouped-scheduled-pois.dto.js';
import { plainToInstance } from 'class-transformer';
import { PoiStatus } from '../entities/poi-status.enum.js';
import { PoiGateway } from '../gateway/poi.gateway.js';
import { BehaviorEventType } from '../../../infra/rabbitmq/dto/enqueue-behavior-event.dto.js';
import { PoiAddScheduleReqDto } from '../dto/poi/poi-add-schedule-req.dto.js';
// import { DateGroupedScheduledPoisResDto } from '../dto/poi/get-date-grouped-scheduled-pois.dto.js';

@Injectable()
export class PoiService {
  private readonly logger = new Logger(PoiService.name);

  constructor(
    @InjectRepository(Poi)
    private readonly poiRepository: Repository<Poi>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly planDayService: PlanDayService,
    private readonly poiCacheService: PoiCacheService,
    @Inject(forwardRef(() => PoiGateway))
    private readonly poiGateway: PoiGateway,
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
  async getWorkspacePoisByWorkspace(workspaceId: string): Promise<PoiResDto[]> {
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

    // 'MARKED' 상태이거나 planDayId가 없는 POI는 DB에 저장하지 않음
    const poisToPersist = cachedPois.filter(
      (poi) => poi.status !== PoiStatus.MARKED && poi.planDayId,
    );

    // 저장할 POI가 없는 경우
    if (poisToPersist.length === 0) {
      // 이 경우 캐시를 비우지 않고 그대로 return하여, MARKED 상태의 POI들이 캐시에 남아있도록 함
      return { persistedPois: [], newlyPersistedCount: 0 };
    }

    // 1. 기존 POI와 신규 POI 분리
    const existingPois = poisToPersist.filter((poi) => poi.isPersisted);
    const newPois = poisToPersist.filter((poi) => !poi.isPersisted);
    const newlyPersistedCount = newPois.length;

    // 2. 트랜잭션을 사용하여 DB 작업 수행
    await this.dataSource.transaction(async (transactionalEntityManager) => {
      // 2-1. 기존 POI 업데이트 (순서, 상태 등)
      if (existingPois.length > 0) {
        // 2-1-1. (1단계) 모든 POI의 sequence를 충돌하지 않는 임시 값으로 변경
        // 각 POI의 index를 기반으로 고유한 음수 값을 생성하여 충돌을 방지합니다.
        const temporaryUpdatePromises = existingPois.map((poi, index) =>
          transactionalEntityManager.update(
            Poi,
            { id: poi.id },
            // index를 사용하여 각 POI에 대해 고유한 음수 시퀀스 값을 보장합니다.
            // -1부터 시작하여 기존의 양수 시퀀스와 절대 겹치지 않도록 합니다.
            { sequence: -(index + 1) },
          ),
        );
        await Promise.all(temporaryUpdatePromises);

        // 2-1-2. (2단계) 모든 POI의 sequence를 최종 값으로 변경
        // Promise.all 대신 for...of 루프를 사용하여 순차적으로 업데이트
        for (const poi of existingPois) {
          await transactionalEntityManager.update(
            Poi,
            { id: poi.id },
            {
              placeName: poi.placeName,
              longitude: poi.longitude,
              latitude: poi.latitude,
              address: poi.address,
              status: poi.status,
              sequence: poi.sequence,
            },
          );
        }
      }

      // 2-2. 신규 POI 추가
      if (newPois.length > 0) {
        const newEntities = newPois.map((poi) =>
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
        await transactionalEntityManager
          .createQueryBuilder()
          .insert()
          .into(Poi)
          .values(newEntities)
          .orIgnore() // id가 혹시라도 중복되면 무시 (안전장치)
          .execute();
      }
    });

    const planDayIds =
      await this.planDayService.getWorkspacePlanDayIds(workspaceId);

    // 3. DB 작업 성공 후 캐시 비우기
    await this.poiCacheService.clearWorkspacePois(workspaceId, planDayIds);

    return {
      persistedPois: poisToPersist.map((poi) => ({
        ...poi,
        isPersisted: true,
      })),
      newlyPersistedCount,
    };
  }

  async getScheduledPois(
    workspaceId: string,
  ): Promise<PlanDayScheduledPoisGroupDto[]> {
    // getWorkspacePoisByWorkspace
    /**
     * 1. workspaceId로 planDays 찾기
     * 2. 각 planday별 scheduled pois를 찾기
     * 3. PlanDayScheduledPoisGroupDto 형태로 반환
     */
    const planDays: PlanDayResDto[] =
      await this.planDayService.getWorkspacePlanDays(workspaceId);

    if (planDays.length === 0) {
      return [];
    }
    /**
     * TODO: 캐시에서 가져오는걸 Main으로 바꾸기 (일단 씻고)
     */

    // 각 planDay별로 scheduled POI들을 가져와서 그룹화
    const results: PlanDayScheduledPoisGroupDto[] = [];

    for (const planDay of planDays) {
      const scheduledPois =
        await this.poiCacheService.getScheduledPoisByPlanDay(
          workspaceId,
          planDay.id,
        );

      // if (scheduledPois.length === 0) {
      //   this.poiRepository.find;
      // }

      // DTO로 변환
      const poisDto = scheduledPois.map((poi) => PoiResDto.fromCachedPoi(poi));
      const planDaySummary = plainToInstance(
        PlanDayScheduleSummaryDto,
        planDay,
        {
          excludeExtraneousValues: true,
        },
      );

      // todo: 딕셔너리말고 다르게
      results.push({
        planDay: planDaySummary,
        pois: poisDto,
      });
    }

    return results;
  }

  /**
   * POI를 특정 날짜의 일정에 추가하고, 변경사항을 브로드캐스트합니다.
   * @param data - PoiAddScheduleReqDto
   */
  async addPoiToSchedule(data: PoiAddScheduleReqDto): Promise<void> {
    const { workspaceId, planDayId, poiId } = data;

    // 1. POI를 SCHEDULED로 전환하고 List에 추가
    await this.poiCacheService.addToSchedule(workspaceId, planDayId, poiId);

    const poi: CachedPoi | undefined = await this.poiCacheService.getPoi(
      workspaceId,
      poiId,
    );

    if (!poi) {
      throw new BadRequestException(
        `POI with id ${poiId} not found in workspace ${workspaceId}`,
      );
    }

    // 2. 행동 이벤트 전송
    this.poiGateway.sendBehaviorEvent(poi, BehaviorEventType.POI_SCHEDULE);

    // 3. 같은 워크스페이스의 모든 클라이언트에게 브로드캐스트
    this.poiGateway.broadcastPoiAddSchedule(workspaceId, poi);
  }

  /**
   * 특정 워크스페이스 내에서 placeId를 기준으로 POI를 조회합니다.
   * @param workspaceId - 워크스페이스 ID
   * @param placeId - 장소 ID
   * @returns PoiResDto | null
   */
  async getPoiByPlaceId(
    workspaceId: string,
    placeId: string,
  ): Promise<PoiResDto | null> {
    // 1. 캐시에서 먼저 조회
    const cachedPois = await this.poiCacheService.getWorkspacePois(workspaceId);
    const cachedPoi = cachedPois.find((p) => p.placeId === placeId);
    if (cachedPoi) {
      return PoiResDto.fromCachedPoi(cachedPoi);
    }

    // 2. 캐시에 없으면 DB에서 조회
    const poi = await this.poiRepository.findOne({
      where: { place: { id: placeId } },
      relations: ['createdBy', 'planDay', 'place'],
    });

    return poi ? PoiResDto.fromEntity(poi, workspaceId) : null;
  }

  /**
   * @description 특정 planDay들에 속한 모든 POI를 DB에서 삭제합니다.
   * AI가 새로운 여행 코스를 생성할 때 기존 POI를 삭제하기 위해 사용됩니다.
   * @param planDayIds - PlanDay ID 배열
   */
  async deleteAllPoisByPlanDays(planDayIds: string[]): Promise<void> {
    if (planDayIds.length === 0) {
      return;
    }

    await this.poiRepository.delete({
      planDay: {
        id: In(planDayIds),
      },
    });

    this.logger.log(`Deleted all POIs for planDays: ${planDayIds.join(', ')}`);
  }

  // ): Promise<DateGroupedScheduledPoisResDto> {

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
