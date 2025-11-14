import { RegionGroup } from '../entities/region_group.enum.js';

export class GetPersonalizedPlacesByRegionReqDto {
  userId: string;
  region: RegionGroup;
}
