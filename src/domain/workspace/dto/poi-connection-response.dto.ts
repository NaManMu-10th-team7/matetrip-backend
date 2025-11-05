import { PoiConnection } from '../entities/poi-connection.entity.js';

export interface PoiConnectionResponseDto {
  planDayId: string;
  prevPoiId: string;
  nextPoiId: string;
  distance?: number;
  duration?: number;
}

export const buildPoiConnectionResponseDtoFromEntity = (
  entity: PoiConnection,
): PoiConnectionResponseDto => ({
  planDayId: entity.planDay.id,
  prevPoiId: entity.prevPoi.id,
  nextPoiId: entity.nextPoi.id,
  distance: entity.distance,
  duration: entity.duration,
});
