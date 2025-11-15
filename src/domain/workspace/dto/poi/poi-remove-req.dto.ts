import { IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

export class PoiRemoveReqDto {
  @IsUUID()
  @IsNotEmpty()
  workspaceId: string;

  @IsUUID()
  @IsNotEmpty()
  poiId: string;

  @IsOptional()
  @IsUUID()
  placeId?: string; // focus에서 추천받은 place의 ID (행동 이벤트용)
}
