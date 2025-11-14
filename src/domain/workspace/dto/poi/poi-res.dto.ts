import { Expose } from 'class-transformer';
import { CachedPoi } from '../../types/cached-poi.js';
import { Poi } from '../../entities/poi.entity.js';

export class PoiResDto {
  @Expose()
  readonly id: string; // 뺄까??
  @Expose()
  readonly placeName: string;
  @Expose()
  readonly address: string;
  @Expose()
  readonly longitude: number;
  @Expose()
  readonly latitude: number;

  private constructor(
    id: string,
    placeName: string,
    address: string,
    longitude: number,
    latitude: number,
  ) {
    this.id = id;
    this.placeName = placeName;
    this.address = address;
    this.longitude = longitude;
    this.latitude = latitude;
  }

  static of(poi: CachedPoi): PoiResDto {
    return new PoiResDto(
      poi.id,
      poi.placeName,
      poi.address,
      poi.longitude,
      poi.latitude,
    );
  }

  static fromEntity(poi: Poi): PoiResDto {
    return new PoiResDto(
      poi.id,
      poi.placeName,
      poi.address,
      poi.longitude,
      poi.latitude,
    );
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
