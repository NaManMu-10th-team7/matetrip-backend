import { IsNotEmpty, IsUUID } from 'class-validator';

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
}
