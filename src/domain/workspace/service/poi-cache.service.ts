import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../../../infra/redis/redis.service';
import { buildCachedPoiFromEntity, CachedPoi } from '../types/cached-poi.js';
import { isUUID } from 'class-validator';
import { Poi } from '../entities/poi.entity.js';
import { PoiStatus } from '../entities/poi-status.enum.js';

@Injectable()
export class PoiCacheService {
  private readonly logger = new Logger(PoiCacheService.name);

  constructor(private readonly redisService: RedisService) {}

  private buildPoisKey(workspaceId: string): string {
    return `workspace:${workspaceId}:poi`;
  }

  private buildScheduledPoiIdsKey(planDayId: string): string {
    return `workspace:${planDayId}:scheduled`;
  }

  async getWorkspacePois(workspaceId: string): Promise<CachedPoi[]> {
    const client = this.redisService.getClient();
    const key = this.buildPoisKey(workspaceId);
    const rawPois = await client.hVals(key);
    return rawPois.map((poi) => JSON.parse(poi) as CachedPoi);
  }

  // Poi는 hash구조로 (main key = workspaceId, sub key = poiId, value = json)
  async upsertPoi(workspaceId: string, poi: CachedPoi): Promise<void> {
    const client = this.redisService.getClient();
    const key = this.buildPoisKey(workspaceId);
    await client.hSet(key, poi.id, JSON.stringify(poi));

    // todo : 삭제할 것
    // await client.expire(key, this.ttlSeconds);
    this.logger.debug(
      `POI cached for workspace ${workspaceId}: ${JSON.stringify(poi)}`,
    );
  }

  async upsertScheduledPoiIds(
    planDayId: string,
    poiIds: string[],
  ): Promise<void> {
    if (poiIds.length === 0) {
      return;
    }

    const client = this.redisService.getClient();
    const key = this.buildScheduledPoiIdsKey(planDayId);
    // await client.hSet(key, poi.id, JSON.stringify(poi));
    const pipeline = client.multi();
    pipeline.del(key);
    pipeline.rPush(key, poiIds);
    // await client.expire(key, this.ttlSeconds);
    await pipeline.exec();
  }

  async removePoi(
    workspaceId: string,
    poiId: string,
  ): Promise<CachedPoi | undefined> {
    // MARKED인지 아닌지 확인
    const client = this.redisService.getClient();
    const key = this.buildPoisKey(workspaceId);
    const raw = await client.hGet(key, poiId);
    if (!raw) {
      return undefined;
    }

    await client.hDel(key, poiId);
    return JSON.parse(raw) as CachedPoi;
  }

  async setWorkspacePois(workspaceId: string, pois: Poi[]): Promise<void> {
    if (!isUUID(workspaceId)) {
      throw new Error('Invalid workspaceId');
    }

    if (pois.length === 0) {
      return;
    }
    // 생성된 key + pois 를 바탕으로 object 생성
    const key = this.buildPoisKey(workspaceId);
    const client = this.redisService.getClient();

    const pipeline = client.multi();
    const poisToCache = pois.map((poi) =>
      buildCachedPoiFromEntity(poi, workspaceId),
    );
    pipeline.del(key);
    const hashObject = Object.fromEntries(
      poisToCache.map((poi) => [poi.id, JSON.stringify(poi)] as const),
    );
    pipeline.hSet(key, hashObject);

    await this.syncScheduledPoisToRedis(pois);
    await pipeline.exec();

    // todo : 이거 삭제하고 나중에 어케할지 고르기
  }

  async syncScheduledPoisToRedis(pois: Poi[]): Promise<void> {
    // 1. SCHEDULED만 필터
    const scheduledPois = pois.filter(
      (poi) => poi.status === PoiStatus.SCHEDULED,
    );

    // 2. planDayId별로 그룹핑
    const grouped: Record<string, { id: string; seq: number }[]> = {};

    for (const poi of scheduledPois) {
      const key = poi.planDay.id;
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push({ id: poi.id, seq: poi.sequence });
    }

    // 3. 각 planDayId마다 seq순 정렬 -> id 리스트 -> Redis 저장
    for (const planDayId in grouped) {
      const list = grouped[planDayId];

      list.sort((a, b) => a.seq - b.seq);

      const ids = list.map((item) => item.id);

      await this.upsertScheduledPoiIds(planDayId, ids);
    }
  }

  // DB에 배치 처리는 이거 호출한 Poi Service에서 ㄱㄱ
  async clearWorkspacePois(
    workspaceId: string,
    planDayIds: string[],
  ): Promise<void> {
    if (!isUUID(workspaceId)) {
      return;
    }

    const client = this.redisService.getClient();
    const pipeline = client.multi();
    pipeline.del(this.buildPoisKey(workspaceId));
    for (const planDayId of planDayIds) {
      pipeline.del(this.buildScheduledPoiIdsKey(planDayId));
    }
    await pipeline.exec();
  }

  /**
   * SCHEDULED POI의 순서를 변경합니다.
   * Redis List를 새로운 순서로 덮어쓰고, 각 POI Hash의 sequence도 업데이트합니다.
   */
  async reorderScheduledPois(
    workspaceId: string,
    planDayId: string,
    poiIds: string[],
  ): Promise<void> {
    if (poiIds.length === 0) {
      return;
    }

    const client = this.redisService.getClient();
    const listKey = this.buildScheduledPoiIdsKey(planDayId);

    // 1. List 업데이트
    const pipeline = client.multi();
    pipeline.del(listKey);
    pipeline.rPush(listKey, poiIds);
    await pipeline.exec();

    // 2. 각 POI Hash의 sequence 업데이트 (SCHEDULED는 1부터 시작)
    for (let i = 0; i < poiIds.length; i++) {
      const poi = await this.getPoi(workspaceId, poiIds[i]);
      if (poi) {
        poi.sequence = i + 1;
        await this.upsertPoi(workspaceId, poi);
      }
    }

    this.logger.debug(
      `Reordered POIs for planDay ${planDayId}: ${poiIds.join(', ')}`,
    );
  }

  /**
   * 특정 planDay의 SCHEDULED POI ID들을 순서대로 가져옵니다.
   */
  async getScheduledPoiIds(planDayId: string): Promise<string[]> {
    const client = this.redisService.getClient();
    const key = this.buildScheduledPoiIdsKey(planDayId);
    return client.lRange(key, 0, -1);
  }

  /**
   * planDayId 기준으로 캐시된 SCHEDULED POI 전체를 순서대로 가져옵니다.
   * Redis List에 저장된 순서를 그대로 유지합니다.
   */
  async getScheduledPoisByPlanDay(
    workspaceId: string,
    planDayId: string,
  ): Promise<CachedPoi[]> {
    const ids = await this.getScheduledPoiIds(planDayId);
    if (ids.length === 0) {
      return [];
    }

    const pois = await Promise.all(
      ids.map((poiId) => this.getPoi(workspaceId, poiId)),
    );

    // List 순서 유지한 채 존재하는 것만 반환
    return pois.filter((poi): poi is CachedPoi => Boolean(poi));
  }

  /**
   * 특정 POI를 Redis Hash에서 가져옵니다.
   */
  async getPoi(
    workspaceId: string,
    poiId: string,
  ): Promise<CachedPoi | undefined> {
    const client = this.redisService.getClient();
    const key = this.buildPoisKey(workspaceId);
    const raw = await client.hGet(key, poiId);
    if (!raw) {
      return undefined;
    }
    return JSON.parse(raw) as CachedPoi;
  }

  /**
   * POI 상태를 업데이트합니다 (MARKED <-> SCHEDULED 전환 등)
   */
  async updatePoiStatus(
    workspaceId: string,
    poiId: string,
    status: PoiStatus,
    planDayId?: string,
  ): Promise<void> {
    const poi = await this.getPoi(workspaceId, poiId);
    if (!poi) {
      this.logger.warn(`POI ${poiId} not found in cache`);
      return;
    }
    const seq = status === PoiStatus.MARKED ? 0 : poi.sequence;
    const updatedPoi: CachedPoi = {
      ...poi,
      status,
      planDayId: planDayId ?? poi.planDayId,
      sequence: seq,
    };

    await this.upsertPoi(workspaceId, updatedPoi);
    this.logger.debug(
      `Updated POI ${poiId} status to ${status} in workspace ${workspaceId}`,
    );
  }

  /**
   * POI를 SCHEDULED로 전환하고 List에 추가합니다.
   * MARKED → SCHEDULED 전환 시 사용됩니다.
   */
  async addToSchedule(
    workspaceId: string,
    planDayId: string,
    poiId: string,
  ): Promise<void> {
    // 1. POI 상태를 SCHEDULED로 변경
    await this.updatePoiStatus(
      workspaceId,
      poiId,
      PoiStatus.SCHEDULED,
      planDayId,
    );

    // 2. SCHEDULED List에 추가 (맨 뒤에)
    const currentPoiIds = await this.getScheduledPoiIds(planDayId);
    currentPoiIds.push(poiId);
    await this.reorderScheduledPois(workspaceId, planDayId, currentPoiIds);

    this.logger.debug(`Added POI ${poiId} to schedule in planDay ${planDayId}`);
  }

  /**
   * POI를 MARKED로 전환하고 List에서 제거합니다.
   * SCHEDULED → MARKED 전환 시 사용됩니다.
   */
  async removeFromSchedule(
    workspaceId: string,
    planDayId: string,
    poiId: string,
  ): Promise<void> {
    // 1. POI 상태를 MARKED로 변경 (sequence도 0으로 초기화됨)
    await this.updatePoiStatus(workspaceId, poiId, PoiStatus.MARKED, planDayId);

    // 2. SCHEDULED List에서 제거
    const client = this.redisService.getClient();
    const key = this.buildScheduledPoiIdsKey(planDayId);
    await client.lRem(key, 0, poiId);

    this.logger.debug(
      `Removed POI ${poiId} from schedule in planDay ${planDayId}`,
    );
  }
}
