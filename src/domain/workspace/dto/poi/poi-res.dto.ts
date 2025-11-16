import { Expose } from 'class-transformer';
import { CachedPoi } from '../../types/cached-poi.js';
import { Poi } from '../../entities/poi.entity.js';
import { PoiStatus } from '../../entities/poi-status.enum.js';

type PoiResDtoProps = {
  id: string;
  workspaceId: string;
  createdBy: string;
  placeName: string;
  address: string;
  longitude: number;
  latitude: number;
  status: PoiStatus;
  sequence: number;
  planDayId?: string;
  placeId?: string;
};

export class PoiResDto {
  @Expose()
  readonly id: string;
  @Expose()
  readonly workspaceId: string;
  @Expose()
  readonly createdBy: string;
  @Expose()
  readonly placeName: string;
  @Expose()
  readonly address: string;
  @Expose()
  readonly longitude: number;
  @Expose()
  readonly latitude: number;
  @Expose()
  readonly planDayId?: string;
  @Expose()
  readonly placeId?: string; // places 테이블의 ID
  @Expose()
  readonly status: PoiStatus;
  @Expose()
  readonly sequence: number;

  private constructor(props: PoiResDtoProps) {
    this.id = props.id;
    this.workspaceId = props.workspaceId;
    this.createdBy = props.createdBy;
    this.placeName = props.placeName;
    this.address = props.address;
    this.longitude = props.longitude;
    this.latitude = props.latitude;
    this.status = props.status;
    this.sequence = props.sequence;
    this.planDayId = props.planDayId;
    this.placeId = props.placeId;
  }

  static of(poi: CachedPoi): PoiResDto {
    return new PoiResDto({
      id: poi.id,
      workspaceId: poi.workspaceId,
      createdBy: poi.createdBy,
      placeName: poi.placeName,
      address: poi.address,
      longitude: poi.longitude,
      latitude: poi.latitude,
      planDayId: poi.planDayId,
      placeId: poi.placeId,
      status: poi.status,
      sequence: poi.sequence,
    });
  }

  static fromEntity(poi: Poi, workspaceId: string): PoiResDto {
    return new PoiResDto({
      id: poi.id,
      workspaceId,
      createdBy: poi.createdBy.id,
      placeName: poi.placeName,
      address: poi.address,
      longitude: poi.longitude,
      latitude: poi.latitude,
      status: poi.status,
      sequence: poi.sequence,
      planDayId: poi.planDay?.id,
      placeId: poi.placeId,
    });
  }
}
