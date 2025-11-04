import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../../../redis/redis.service.js';
import { CachePoiConnection } from '../types/cached-poi-connection.js';

@Injectable()
export class PoiConnectionCacheService {
  private readonly logger = new Logger(PoiConnectionCacheService.name);
  private readonly ttlSeconds = 60 * 60 * 24; // 24 hours

  constructor(private readonly redisService: RedisService) {}

  private buildKey(planDayId: string): string {
    return `poi-connection:${planDayId}`;
  }

  async upsertPoiConnection(poiConnection: CachePoiConnection) {
    const client = this.redisService.getClient();
    const key = this.buildKey(poiConnection.planDayId);
    // todo : 원자성 보장
    const pipeline = client.multi();
    pipeline.hSet(key, poiConnection.prevPoiId, JSON.stringify(poiConnection));
    pipeline.hSet(key, poiConnection.nextPoiId, JSON.stringify(poiConnection));
    pipeline.expire(key, this.ttlSeconds);
    await pipeline.exec();

    this.logger.debug(
      `POI Connection cached : ${JSON.stringify(poiConnection)}`,
    );
  }

  async removePoiConnection(planDayId: string): Promise<string> {
    const client = this.redisService.getClient();
    const key = this.buildKey(planDayId);
    await client.del(key);
    return key;
  }
}
