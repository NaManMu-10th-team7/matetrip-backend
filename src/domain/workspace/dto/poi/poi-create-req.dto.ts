import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class PoiCreateReqDto {
  @IsUUID()
  @IsNotEmpty()
  workspaceId: string;

  @IsOptional()
  @IsUUID()
  poiId?: string;

  @IsUUID()
  @IsNotEmpty()
  createdBy: string;

  @IsOptional()
  @IsUUID()
  planDayId?: string;

  @IsOptional()
  @IsUUID()
  placeId?: string; // focus에서 추천받은 place의 ID (행동 이벤트용)

  @Type(() => Number)
  @IsNumber()
  longitude: number;

  @Type(() => Number)
  @IsNumber()
  latitude: number;

  @IsString()
  @IsNotEmpty()
  address: string;

  @IsNotEmpty()
  @IsString()
  placeName: string;

  @IsOptional()
  @IsString()
  tempId?: string;
}
