import { Type } from 'class-transformer';
import { IsNumber } from 'class-validator';

export class GetPlacesReqDto {
  @Type(() => Number)
  @IsNumber()
  southWestLatitude: number;

  @Type(() => Number)
  @IsNumber()
  southWestLongitude: number;

  @Type(() => Number)
  @IsNumber()
  northEastLatitude: number;

  @Type(() => Number)
  @IsNumber()
  northEastLongitude: number;
}
