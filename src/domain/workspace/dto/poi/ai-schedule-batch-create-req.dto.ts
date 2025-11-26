import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';

/**
 * DB에 저장된 장소(Place)를 기반으로 한 POI
 */
export class AiSchedulePlaceDto {
  @IsUUID()
  @IsNotEmpty()
  placeId: string;

  @IsString()
  @IsNotEmpty()
  placeName: string;

  @Type(() => Number)
  @IsNumber()
  latitude: number;

  @Type(() => Number)
  @IsNumber()
  longitude: number;

  @IsString()
  @IsNotEmpty()
  address: string;

  // AI에서 보내는 일자 정보 (1일차, 2일차 등)
  @Type(() => Number)
  @IsNumber()
  day: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  sequence?: number;
}

/**
 * 경유지 (DB에 없는 사용자 지정 위치)
 */
export class AiScheduleWaypointDto {
  @IsString()
  @IsNotEmpty()
  waypointName: string;

  @Type(() => Number)
  @IsNumber()
  latitude: number;

  @Type(() => Number)
  @IsNumber()
  longitude: number;

  @IsString()
  @IsOptional()
  address?: string;

  // AI에서 보내는 일자 정보 (1일차, 2일차 등)
  @Type(() => Number)
  @IsNumber()
  day: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  sequence?: number;
}

export enum AiScheduleSource {
  AI_ROUTE = 'ai_route',
  AI_RECOMMENDATION = 'ai_recommendation',
}

export class AiScheduleBatchCreateReqDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AiSchedulePlaceDto)
  places: AiSchedulePlaceDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AiScheduleWaypointDto)
  @IsOptional()
  waypoints?: AiScheduleWaypointDto[];

  @IsEnum(AiScheduleSource)
  source: AiScheduleSource;
}
