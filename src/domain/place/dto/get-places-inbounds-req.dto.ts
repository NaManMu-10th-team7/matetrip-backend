import { IsNumber } from 'class-validator';

export class GetPlacesInboundsReqDto {
  @IsNumber()
  southWestLatitude: number;

  @IsNumber()
  southWestLongitude: number;

  @IsNumber()
  northEastLatitude: number;

  @IsNumber()
  northEastLongitude: number;
}
