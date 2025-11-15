export enum BehaviorEventType {
  POI_MARK = 'POI_MARK',
  POI_SCHEDULE = 'POI_SCHEDULE',
  POI_UNMARK = 'POI_UNMARK',
  POI_UNSCHEDULE = 'POI_UNSCHEDULE',
}

// 행동 타입별 가중치 매핑
export const BEHAVIOR_EVENT_WEIGHTS: Record<BehaviorEventType, number> = {
  [BehaviorEventType.POI_SCHEDULE]: 5.0,
  [BehaviorEventType.POI_MARK]: 3.0,
  [BehaviorEventType.POI_UNSCHEDULE]: -2.0,
  [BehaviorEventType.POI_UNMARK]: -1.5,
};

export class BehaviorEventDataDto {
  placeId?: string;
  placeName?: string;
  category?: string;
  workspaceId?: string;
  planDayId?: string;
}

export class EnqueueBehaviorEventDto {
  userId: string;
  eventType: BehaviorEventType;
  timestamp: Date;
  eventData: BehaviorEventDataDto;
  weight: number; // 자동으로 계산됨
  workspaceId?: string;
  placeId?: string;

  constructor(
    userId: string,
    eventType: BehaviorEventType,
    eventData: BehaviorEventDataDto,
    workspaceId?: string,
    placeId?: string,
  ) {
    this.userId = userId;
    this.eventType = eventType;
    this.timestamp = new Date();
    this.eventData = eventData;
    this.weight = BEHAVIOR_EVENT_WEIGHTS[eventType]; // enum에서 자동 매핑
    this.workspaceId = workspaceId;
    this.placeId = placeId;
  }
}
