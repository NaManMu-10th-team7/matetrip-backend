import { PoiConnection } from '../../entities/poi-connection.entity.js';

export interface PoiConnectionResDto {
  planDayId: string;
  prevPoiId: string;
  nextPoiId: string;
  distance?: number;
  duration?: number;
}

export const buildPoiConnectionResDtoFromEntity = (
  entity: PoiConnection,
): PoiConnectionResDto => ({
  planDayId: entity.planDay.id,
  prevPoiId: entity.prevPoi.id,
  nextPoiId: entity.nextPoi.id,
  distance: entity.distance,
  duration: entity.duration,
});
