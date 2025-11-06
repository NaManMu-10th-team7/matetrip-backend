import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { PoiConnection } from '../entities/poi-connection.entity.js';
import { PoiConnectionCacheService } from './poi-connection-cache.service.js';
import { PlanDayService } from './plan-day.service.js';
import {
  CachePoiConnection,
  buildCachedPoiConnectionFromEntity,
} from '../types/cached-poi-connection.js';
import { RemovePoiConnectionReqDto } from '../dto/poi/remove-poi-connection-req.dto.js';
import {
  buildGroupedPoiConnectionsDto,
  GroupedPoiConnectionsDto,
} from '../types/grouped-poi-conncetions.dto.js';
import { PlanDay } from '../entities/plan-day.entity.js';
import { Poi } from '../entities/poi.entity.js';

@Injectable()
export class PoiConnectionService {
  constructor(
    @InjectRepository(PoiConnection)
    private readonly poiConnectionRepository: Repository<PoiConnection>,
    private readonly poiConnectionCacheService: PoiConnectionCacheService,
    private readonly planDayService: PlanDayService,
  ) {}

  async persistPoiConnection(
    cachedPoiConnection: CachePoiConnection,
  ): Promise<PoiConnection> {
    const entity = this.poiConnectionRepository.create({
      id: cachedPoiConnection.id,
      distance: cachedPoiConnection.distance ?? 0,
      duration: cachedPoiConnection.duration ?? 0,
      prevPoi: { id: cachedPoiConnection.prevPoiId } as Poi,
      nextPoi: { id: cachedPoiConnection.nextPoiId } as Poi,
      planDay: { id: cachedPoiConnection.planDayId } as PlanDay,
    });

    const persisted = await this.poiConnectionRepository.save(entity);

    await this.poiConnectionCacheService.upsertPoiConnection({
      ...cachedPoiConnection,
      isPersisted: true,
    });

    return persisted;
  }

  // 이게 문제다... ㅅㅂ
  async getAllPoiConnections(
    workspaceId: string,
  ): Promise<GroupedPoiConnectionsDto> {
    /**
     * 일단 workspaceId에 맞는 planDay들을 찾고
     * planDay에 맞는 poiConnection들을 찾고
     * persistedConnections: planDay에 맞는 poiConnection들
     */
    const planDayIds =
      await this.planDayService.getWorkspacePlanDayIds(workspaceId);

    if (planDayIds.length === 0) {
      return {};
    }

    const cachedPoiConnections: CachePoiConnection[] =
      await this.poiConnectionCacheService.getPoiConnectionsByPlanDayList(
        planDayIds,
      );

    if (cachedPoiConnections.length > 0) {
      return buildGroupedPoiConnectionsDto(planDayIds, cachedPoiConnections);
    }

    // Todo: 성능 이슈 보임 => 나중에 최적화 시키기
    const poiConnections: PoiConnection[] =
      await this.poiConnectionRepository.find({
        where: { planDay: { id: In(planDayIds) } },
        relations: ['prevPoi', 'nextPoi', 'planDay'],
      });

    const persistedConnections: CachePoiConnection[] = poiConnections.map(
      (connection) => buildCachedPoiConnectionFromEntity(connection),
    );

    // 캐시에 저장
    for (const connection of persistedConnections) {
      await this.poiConnectionCacheService.setPoiConnections(connection);
    }

    return buildGroupedPoiConnectionsDto(planDayIds, persistedConnections);
  }

  async removePoiConnection(dto: RemovePoiConnectionReqDto): Promise<string> {
    const { id, planDayId } = dto;

    const existing = await this.poiConnectionRepository.findOne({
      where: { id },
    });

    const cached = await this.poiConnectionCacheService.getPoiConnection(
      planDayId,
      id,
    );

    if (!existing && !cached) {
      throw new NotFoundException(`POI Connection with id ${id} not found`);
    }

    if (existing) {
      await this.poiConnectionRepository.remove(existing);
    }

    await this.poiConnectionCacheService.removePoiConnection(planDayId, id);

    return id;
  }
}
