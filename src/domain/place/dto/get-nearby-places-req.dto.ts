import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsUUID } from 'class-validator';

export class GetNearbyPlacesReqDto {
  @IsNotEmpty()
  @IsUUID()
  readonly placeId: string;

  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  readonly longitude: number;

  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  readonly latitude: number;

  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  readonly limit: number;
}
