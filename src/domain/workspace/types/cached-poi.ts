import { randomUUID } from 'node:crypto';
import { CreatePoiDto } from '../dto/create-poi.dto.js';
import { Poi } from '../entities/poi.entity.js';

export interface CachedPoi {
  id: string;
  workspaceId: string;
  planDayId?: string;
  createdBy: string;
  longitude: number;
  latitude: number;
  address: string;
  placeName?: string;
  persisted: boolean;
}

export const buildCachedPoi = (
  workspaceId: string,
  dto: CreatePoiDto,
): CachedPoi => ({
  id: dto.poiId ?? randomUUID(),
  workspaceId: workspaceId,
  planDayId: dto.planDayId,
  createdBy: dto.createdBy,
  longitude: dto.longitude,
  latitude: dto.latitude,
  address: dto.address,
  placeName: dto.placeName,
  persisted: false,
});

export const buildCachedPoiFromEntity = (
  poi: Poi,
  workspaceId: string,
): CachedPoi => ({
  id: poi.id,
  workspaceId,
  planDayId: poi.planDay?.id,
  createdBy: poi.createdBy.id,
  longitude: poi.longitude,
  latitude: poi.latitude,
  address: poi.address,
  placeName: poi.placeName,
  persisted: true,
});
