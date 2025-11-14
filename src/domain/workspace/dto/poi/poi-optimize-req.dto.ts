import { IsArray, IsOptional, IsString, IsUUID } from 'class-validator';

/**
 * Python AI 서버로부터 POI 최적화 결과를 받아 브로드캐스트하는 요청 DTO
 */
export class PoiOptimizeReqDto {
  @IsString()
  @IsUUID()
  workspaceId: string;

  @IsString()
  @IsUUID()
  planDayId: string;

  @IsArray()
  @IsString({ each: true })
  poiIds: string[]; // AI가 최적화한 순서대로 정렬된 POI ID 배열

  @IsOptional()
  @IsString()
  apiKey?: string; // AI 서버 인증용 API Key (선택)
}
