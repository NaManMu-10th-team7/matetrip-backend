import { IsArray, IsString, IsUUID } from 'class-validator';

export class PoiReorderReqDto {
  @IsString()
  @IsUUID()
  workspaceId: string;

  @IsString()
  @IsUUID()
  planDayId: string;

  @IsArray()
  @IsString({ each: true })
  poiIds: string[]; // 새로운 순서대로 정렬된 POI ID 배열
}
