import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { PoiConnection } from '../entities/poi-connection.entity.js';
import { PoiConnectionCacheService } from './poi-connection-cache.service.js';
import { PlanDayService } from './plan-day.service.js';
import { PlanDay } from '../entities/plan-day.entity.js';

@Injectable()
export class PoiConnectionService {
  private readonly logger = new Logger(PoiConnectionService.name);
  private readonly ttlSeconds = 60 * 60 * 24; // 24 hours

  constructor(
    @InjectRepository(PoiConnection)
    private readonly poiConnectionRepository: Repository<PoiConnection>,
    private readonly poiConnectionCacheService: PoiConnectionCacheService,
    private readonly planDayService: PlanDayService,
  ) {}

  async getAllPoiConnections(workspaceId: string): Promise<PoiConnection[]> {
    const planDays: PlanDay[] =
      await this.planDayService.getWorkspacePlanDays(workspaceId);

    const planDayIds = planDays.map((planDay) => planDay.id);

    // todo : DTO로
    return this.poiConnectionRepository.find({
      where: { planDay: { id: In(planDayIds) } },
      relations: ['planDay'],
    });
  }

  async removePoiConnection(id: string): Promise<string> {
    const deleteResult = await this.poiConnectionRepository.delete({
      id: id,
    });
    if (deleteResult.affected === 0) {
      throw new NotFoundException(`POI Connection with id ${id} not found`);
    }

    await this.poiConnectionCacheService.removePoiConnection(id);
    return id;
  }
}
