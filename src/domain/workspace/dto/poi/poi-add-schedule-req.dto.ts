import { IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

export class PoiAddScheduleReqDto {
  @IsNotEmpty()
  @IsUUID()
  workspaceId: string;

  @IsNotEmpty()
  @IsUUID()
  planDayId: string;

  @IsNotEmpty()
  @IsUUID()
  poiId: string;

  @IsOptional()
  @IsUUID()
  placeId?: string; // focus에서 추천받은 place의 ID (행동 이벤트용)
}
