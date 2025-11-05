import { randomUUID } from 'crypto';
import { CreatePoiConnectionDto } from '../dto/create-poi-connection.dto.js';
import { PoiConnection } from '../entities/poi-connection.entity.js';

export interface CachePoiConnection {
  id: string;
  prevPoiId: string;
  nextPoiId: string;
  planDayId: string;
  workspaceId: string;
  distance?: number;
  duration?: number;
  persisted: boolean;
}

export const buildCachedPoiConnection = (
  dto: CreatePoiConnectionDto,
  workspaceId: string,
): CachePoiConnection => ({
  id: randomUUID(),
  prevPoiId: dto.prevPoiId,
  nextPoiId: dto.nextPoiId,
  planDayId: dto.planDayId,
  workspaceId,
  distance: dto.distance,
  duration: dto.duration,
  persisted: false,
});

export const buildCachedPoiConnectionFromEntity = (
  entity: PoiConnection,
): CachePoiConnection => ({
  id: entity.id,
  prevPoiId: entity.prevPoiId ?? entity.prevPoi?.id ?? '',
  nextPoiId: entity.nextPoiId ?? entity.nextPoi?.id ?? '',
  planDayId: entity.planDay.id,
  workspaceId: entity.planDay.workspace.id,
  distance: entity.distance,
  duration: entity.duration,
  persisted: true,
});
