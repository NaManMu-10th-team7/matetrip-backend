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
