import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { RegionGroup } from '../entities/region_group.enum';

export class GetPersonalizedAccommodationsReqDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsEnum(RegionGroup)
  region: RegionGroup;
}
