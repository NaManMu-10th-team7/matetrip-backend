import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../../../redis/redis.service.js';
import { CachePoiConnection } from '../types/cached-poi-connection.js';
import { isUUID } from 'class-validator';

@Injectable()
export class PoiConnectionCacheService {
  private readonly logger = new Logger(PoiConnectionCacheService.name);
  private readonly ttlSeconds = 60 * 60 * 24; // 24 hours

  constructor(private readonly redisService: RedisService) {}

  private buildKey(planDayId: string): string {
    return `poi-connection:${planDayId}`;
  }

  async getPoiConnections(planDayId: string): Promise<CachePoiConnection[]> {
    const client = this.redisService.getClient();
    const key = this.buildKey(planDayId);
    const rawPoiConnections = await client.hVals(key);
    return rawPoiConnections.map(
      (poiConnection) => JSON.parse(poiConnection) as CachePoiConnection,
    );
  }

  async getPoiConnection(
    planDayId: string,
    poiConnectionId: string,
  ): Promise<CachePoiConnection | null> {
    const client = this.redisService.getClient();
    const key = this.buildKey(planDayId);
    const rawPoiConnection = await client.hGet(key, poiConnectionId);
    if (!rawPoiConnection) {
      return null;
    }

    return JSON.parse(rawPoiConnection) as CachePoiConnection;
  }

  async setPoiConnections(
    workspaceId: string,
    poiConnections: CachePoiConnection[],
  ) {
    if (!isUUID(workspaceId)) {
      throw new Error('Invalid workspaceId');
    }

    const client = this.redisService.getClient();
    const key = this.buildKey(workspaceId);
    const pipeline = client.multi();
    pipeline.del(key);
    if (poiConnections.length === 0) {
      await pipeline.exec();
      return;
    }

    const hashObject = Object.fromEntries(
      poiConnections.map(
        (poiConnection) =>
          [poiConnection.id, JSON.stringify(poiConnection)] as const,
      ),
    );

    pipeline.hSet(key, hashObject);
    pipeline.expire(key, this.ttlSeconds);
    // todo : 이거하고 나중에 어케할지 고르기
  }

  async upsertPoiConnection(poiConnection: CachePoiConnection) {
    const client = this.redisService.getClient();
    const key = this.buildKey(poiConnection.planDayId);
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
  ): Promise<CachePoiConnection | undefined> {
    const client = this.redisService.getClient();
    const key = this.buildKey(planDayId);
    const rawPoiConnection = await client.hGet(key, poiConnectionId);
    if (!rawPoiConnection) {
      return undefined;
    }

    await client.hDel(key, poiConnectionId);
    return JSON.parse(rawPoiConnection) as CachePoiConnection;
  }
}
