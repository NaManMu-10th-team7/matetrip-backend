import { Expose } from 'class-transformer';
import { CachedPoi } from '../../types/cached-poi.js';

export class PoiCreateResDto {
  @Expose()
  readonly id: string; // 뺄까??
  @Expose()
  readonly address: string;
  @Expose()
  readonly longitude: number;
  @Expose()
  readonly latitude: number;

  private constructor(poi: CachedPoi) {
    this.id = poi.id;
    this.address = poi.address;
    this.longitude = poi.longitude;
    this.latitude = poi.latitude;
  }

  static of(poi: CachedPoi): PoiCreateResDto {
    return new PoiCreateResDto(poi);
  }
}

// export interface CachedPoi {
//   id: string;
//   workspaceId: string;
//   planDayId?: string;
//   createdBy: string;
//   longitude: number;
//   latitude: number;
//   address: string;
//   placeName?: string;
//   isPersisted: boolean;
// }
