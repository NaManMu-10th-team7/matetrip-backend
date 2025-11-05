import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { PoiConnection } from '../entities/poi-connection.entity.js';
import { PoiConnectionCacheService } from './poi-connection-cache.service.js';
import { PlanDayService } from './plan-day.service.js';
import { PlanDay } from '../entities/plan-day.entity.js';
import {
  CachePoiConnection,
  buildCachedPoiConnectionFromEntity,
} from '../types/cached-poi-connection.js';
import { RemovePoiConnectionDto } from '../dto/remove-poi-connection.dto.js';

@Injectable()
export class PoiConnectionService {
  constructor(
    @InjectRepository(PoiConnection)
    private readonly poiConnectionRepository: Repository<PoiConnection>,
    private readonly poiConnectionCacheService: PoiConnectionCacheService,
    private readonly planDayService: PlanDayService,
  ) {}

  async getAllPoiConnections(
    workspaceId: string,
  ): Promise<CachePoiConnection[]> {
    const planDays: PlanDay[] =
      await this.planDayService.getWorkspacePlanDays(workspaceId);

    const planDayIds = planDays.map((planDay) => planDay.id);

    if (planDayIds.length === 0) {
      return [];
    }

    const persistedConnections: PoiConnection[] =
      await this.poiConnectionRepository.find({
        where: { planDay: { id: In(planDayIds) } },
        relations: ['planDay'],
        loadRelationIds: { relations: ['prevPoi', 'nextPoi'] },
      });

    const cachedPoiConnections = persistedConnections.map((connecttion) =>
      buildCachedPoiConnectionFromEntity(connecttion),
    );

    await this.poiConnectionCacheService.setPoiConnections(
      workspaceId,
      cachedPoiConnections,
    );
    return cachedPoiConnections;
  }

  async removePoiConnection(dto: RemovePoiConnectionDto): Promise<string> {
    const { id, planDayId, workspaceId } = dto;

    const deleteResult = await this.poiConnectionRepository.delete({
      id: id,
    });

    if (deleteResult.affected === 0) {
      throw new NotFoundException(`POI Connection with id ${id} not found`);
    }

    // Cache 삭제
    await this.poiConnectionCacheService.removePoiConnection(planDayId, id);

    return id;
  }
}
