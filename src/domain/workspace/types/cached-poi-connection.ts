import { randomUUID } from 'crypto';
import { CreatePoiConnectionDto } from '../dto/create-poi-connection.dto.js';

export interface CachePoiConnection {
  id: string;
  prevPoiId: string;
  nextPoiId: string;
  planDayId: string;
  distance?: number;
  duration?: number;
}

export const buildCachedPoiConnection = (
  dto: CreatePoiConnectionDto,
): CachePoiConnection => ({
  id: randomUUID(),
  prevPoiId: dto.prevPoiId,
  nextPoiId: dto.nextPoiId,
  planDayId: dto.planDayId,
  distance: dto.distance,
  duration: dto.duration,
});
