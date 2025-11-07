import { randomUUID } from 'crypto';
import { CreatePoiConnectionReqDto } from '../dto/poi/create-poi-connection-req.dto.js';
import { PoiConnection } from '../entities/poi-connection.entity.js';

export interface CachePoiConnection {
  id: string;
  prevPoiId: string;
  nextPoiId: string;
  planDayId: string;
  distance?: number;
  duration?: number;
  isPersisted: boolean;
}

export const buildCachedPoiConnection = (
  dto: CreatePoiConnectionReqDto,
): CachePoiConnection => ({
  id: randomUUID(),
  prevPoiId: dto.prevPoiId,
  nextPoiId: dto.nextPoiId,
  planDayId: dto.planDayId,
  distance: dto.distance,
  duration: dto.duration,
  isPersisted: false,
});

export const buildCachedPoiConnectionFromEntity = (
  entity: PoiConnection,
): CachePoiConnection => ({
  id: entity.id,
  prevPoiId: entity.prevPoi.id,
  nextPoiId: entity.nextPoi.id,
  planDayId: entity.planDay.id,
  distance: entity.distance,
  duration: entity.duration,
  isPersisted: true,
});
