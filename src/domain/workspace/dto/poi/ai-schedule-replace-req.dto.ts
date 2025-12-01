import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';

/**
 * 장소 교체 항목 DTO
 * AI가 추천한 새 장소로 기존 POI를 1:1 교체
 */
export class PlaceReplacementItemDto {
  @IsUUID()
  @IsNotEmpty()
  old_place_id: string; // 교체할 기존 POI ID

  @IsUUID()
  @IsNotEmpty()
  new_place_id: string; // 새 장소 ID

  @IsString()
  @IsNotEmpty()
  new_place_name: string;

  @Type(() => Number)
  @IsNumber()
  latitude: number;

  @Type(() => Number)
  @IsNumber()
  longitude: number;

  @IsString()
  @IsNotEmpty()
  address: string;
}

export enum AiReplaceSource {
  AI_REPLACE = 'ai_replace',
}

/**
 * AI 장소 교체 요청 DTO
 * AI 서버에서 replace_places 도구 실행 후 Backend로 전송
 */
export class AiScheduleReplaceReqDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PlaceReplacementItemDto)
  replacements: PlaceReplacementItemDto[];

  @IsEnum(AiReplaceSource)
  source: AiReplaceSource;
}
