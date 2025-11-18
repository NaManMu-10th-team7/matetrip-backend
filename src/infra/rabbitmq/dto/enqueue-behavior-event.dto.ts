import { CachedPoi } from '../../../domain/workspace/types/cached-poi.js';

export enum BehaviorEventType {
  POI_MARK = 'POI_MARK',
  POI_SCHEDULE = 'POI_SCHEDULE',
  POI_UNMARK = 'POI_UNMARK',
  POI_UNSCHEDULE = 'POI_UNSCHEDULE',
}

/**
 * 행동 타입별 가중치 매핑
 * TODO: 나중에 가중치 조절
 */
export const BEHAVIOR_EVENT_WEIGHTS: Record<BehaviorEventType, number> = {
  [BehaviorEventType.POI_SCHEDULE]: 5.0,
  [BehaviorEventType.POI_MARK]: 3.0,
  [BehaviorEventType.POI_UNSCHEDULE]: -2.0,
  [BehaviorEventType.POI_UNMARK]: -1.5,
};

export class EnqueueBehaviorEventDto {
  userId: string;
  placeId: string;
  eventType: BehaviorEventType;
  createdAt: Date;
  weight: number;
  plandayId?: string;
  workspaceId?: string;

  /**
   * CachedPoi에서 EnqueueBehaviorEventDto를 생성하는 정적 팩토리 메서드
   * @param cachedPoi - 캐시된 POI 정보
   * @param eventType - 행동 이벤트 타입
   * @param placeId - focus에서 추천받은 place의 ID (옵셔널)
   */
  static fromCachedPoi(
    cachedPoi: CachedPoi,
    eventType: BehaviorEventType,
    placeId?: string,
  ): EnqueueBehaviorEventDto {
    const dto = new EnqueueBehaviorEventDto();
    dto.userId = cachedPoi.createdBy;
    dto.placeId = placeId || cachedPoi.id; // placeId가 있으면 사용, 없으면 poi.id 사용
    dto.eventType = eventType;
    dto.createdAt = new Date();
    dto.weight = BEHAVIOR_EVENT_WEIGHTS[eventType];
    dto.plandayId = cachedPoi.planDayId;
    dto.workspaceId = cachedPoi.workspaceId;
    return dto;
  }
}
