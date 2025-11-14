import { IsEnum, IsNotEmpty, IsString, IsUUID } from 'class-validator';
import { RegionGroup } from '../entities/region_group.enum.js';

export class GetPersonalizedPlacesByRegionReqDto {
  @IsNotEmpty()
  @IsString()
  @IsUUID()
  userId: string;

  @IsNotEmpty()
  @IsEnum(RegionGroup)
  region: RegionGroup;
}
