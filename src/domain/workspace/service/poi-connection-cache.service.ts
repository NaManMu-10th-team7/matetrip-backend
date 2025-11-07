import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../../../redis/redis.service.js';
import { CachePoiConnection } from '../types/cached-poi-connection.js';
import { isUUID } from 'class-validator';

@Injectable()
export class PoiConnectionCacheService {
  private readonly logger = new Logger(PoiConnectionCacheService.name);
  private readonly ttlSeconds = 60 * 60 * 24; // 24 hours

  constructor(private readonly redisService: RedisService) {}

  private buildConnectionKey(planDayId: string): string {
    return `poi-connection:${planDayId}`;
  }

  async getPoiConnections(planDayId: string): Promise<CachePoiConnection[]> {
    const client = this.redisService.getClient();
    const key = this.buildConnectionKey(planDayId);
    const rawConnections = await client.hVals(key);

    try {
      return rawConnections.map(
        (value) => JSON.parse(value) as CachePoiConnection,
      );
    } catch (error) {
      this.logger.error(
        `Failed to parse cached POI connections for planDay ${planDayId}`,
        error instanceof Error ? error : new Error(String(error)),
      );
      throw error;
    }
  }

  async getPoiConnectionsByPlanDayList(
    planDayIds: string[],
  ): Promise<CachePoiConnection[]> {
    const cachedPoiConnections: CachePoiConnection[] = [];
    for (const planDayId of planDayIds) {
      const cached = await this.getPoiConnections(planDayId);
      if (cached.length > 0) {
        cachedPoiConnections.push(...cached);
      }
    }

    return cachedPoiConnections;
  }

  async getPoiConnection(
    planDayId: string,
    poiConnectionId: string,
  ): Promise<CachePoiConnection | null> {
    const client = this.redisService.getClient();
    const key = this.buildConnectionKey(planDayId);
    const raw = await client.hGet(key, poiConnectionId);
    if (!raw) {
      return null;
    }

    return JSON.parse(raw) as CachePoiConnection;
  }

  async setPoiConnections(connection: CachePoiConnection): Promise<void> {
    // Todo : connections의 모든 planDayId가 같아야 함
    const client = this.redisService.getClient();
    const key = this.buildConnectionKey(connection.planDayId);
    const pipeline = client.multi();
    pipeline.del(key);
    pipeline.hSet(key, connection.id, JSON.stringify(connection));
    pipeline.expire(key, this.ttlSeconds);

    await pipeline.exec();
  }

  async upsertPoiConnection(poiConnection: CachePoiConnection): Promise<void> {
    const client = this.redisService.getClient();
    const key = this.buildConnectionKey(poiConnection.planDayId);
    const pipeline = client.multi();
    pipeline.hSet(key, poiConnection.id, JSON.stringify(poiConnection));
    pipeline.expire(key, this.ttlSeconds);
    await pipeline.exec();

    this.logger.debug(
      `POI Connection cached : ${JSON.stringify(poiConnection)}`,
    );
  }

  async removePoiConnection(
    planDayId: string,
    poiConnectionId: string,
  ): Promise<void> {
    const client = this.redisService.getClient();
    const key = this.buildConnectionKey(planDayId);
    await client.hDel(key, poiConnectionId);
  }

  // todo
  async clearWorkspacePoiConnections(workspaceId: string) {
    if (!isUUID(workspaceId)) {
      return;
    }

    const client = this.redisService.getClient();
    await client.del(this.buildConnectionKey(workspaceId));
  }
}
