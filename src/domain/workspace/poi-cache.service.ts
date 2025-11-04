import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../../redis/redis.service';
import { CachedPoi } from './types/cached-poi.js';
import { isUUID } from 'class-validator';

@Injectable()
export class PoiCacheService {
  private readonly logger = new Logger(PoiCacheService.name);
  private readonly ttlSeconds = 60 * 60 * 24; // 24 hours

  constructor(private readonly redisService: RedisService) {}

  private buildKey(workspaceId: string): string {
    return `workspace:${workspaceId}:pois`;
  }

  async getWorkspacePois(workspaceId: string): Promise<CachedPoi[]> {
    const client = this.redisService.getClient();
    const key = this.buildKey(workspaceId);
    const rawPois = await client.hVals(key);
    return rawPois.map((poi) => JSON.parse(poi) as CachedPoi);
  }

  async upsertPoi(workspaceId: string, poi: CachedPoi): Promise<void> {
    const client = this.redisService.getClient();
    const key = this.buildKey(workspaceId);
    await client.hSet(key, poi.id, JSON.stringify(poi));

    // todo : 삭제할 것
    await client.expire(key, this.ttlSeconds);
    this.logger.debug(
      `POI cached for workspace ${workspaceId}: ${JSON.stringify(poi)}`,
    );
  }

  async removePoi(
    workspaceId: string,
    poiId: string,
  ): Promise<CachedPoi | undefined> {
    const client = this.redisService.getClient();
    const key = this.buildKey(workspaceId);
    const raw = await client.hGet(key, poiId);
    if (!raw) {
      return undefined;
    }

    await client.hDel(key, poiId);
    return JSON.parse(raw) as CachedPoi;
  }

  async setWorkspacePois(
    workspaceId: string,
    pois: CachedPoi[],
  ): Promise<void> {
    const client = this.redisService.getClient();

    // key 생성하고 만약 이미 존재하면 삭제
    const key = this.buildKey(workspaceId);
    await client.del(key);
    if (pois.length === 0) {
      return;
    }

    // 생성된 key + pois 를 바탕으로 object 생성
    const hashObject = Object.fromEntries(
      pois.map((poi) => [poi.id, JSON.stringify(poi)] as const),
    );
    await client.hSet(key, hashObject);

    // todo : 이거 삭제하고 나중에 어케할지 고르기
    await client.expire(key, this.ttlSeconds);
  }

  // DB에 배치 처리는 이거 호출한 Poi Service에서 ㄱㄱ
  async clearWorkspacePois(workspaceId: string): Promise<void> {
    // todo : 상세히
    if (!isUUID(workspaceId)) {
      return;
    }

    const client = this.redisService.getClient();
    await client.del(this.buildKey(workspaceId));
  }
}
