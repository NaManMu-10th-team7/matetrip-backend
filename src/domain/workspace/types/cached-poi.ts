import { randomUUID } from 'node:crypto';
import { PoiCreateReqDto } from '../dto/poi/poi-create-req.dto.js';
import { PoiStatus } from '../entities/poi-status.enum.js';
import { Poi } from '../entities/poi.entity.js';

export interface CachedPoi {
  id: string;
  workspaceId: string;
  planDayId?: string;
  createdBy: string;
  placeId: string;
  placeName: string;
  longitude: number;
  latitude: number;
  address: string;
  status: PoiStatus;
  sequence: number;
  isPersisted: boolean;
}

export const buildToCachedPoiFromCreateDto = (
  dto: PoiCreateReqDto,
): CachedPoi => ({
  id: dto.poiId ?? randomUUID(),
  workspaceId: dto.workspaceId,
  planDayId: dto.planDayId,
  createdBy: dto.createdBy,
  placeId: dto.placeId,
  placeName: dto.placeName,
  longitude: dto.longitude,
  latitude: dto.latitude,
  address: dto.address,
  status: PoiStatus.MARKED,
  sequence: 0,
  isPersisted: false,
});

export const buildCachedPoiFromEntity = (
  poi: Poi,
  workspaceId: string,
): CachedPoi => ({
  id: poi.id,
  workspaceId,
  planDayId: poi.planDay?.id,
  createdBy: poi.createdBy.id,
  placeId: poi.place.id,
  longitude: poi.longitude,
  latitude: poi.latitude,
  address: poi.address,
  placeName: poi.placeName,
  status: poi.status,
  sequence: poi.sequence,
  isPersisted: true,
});
