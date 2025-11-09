import { IsNotEmpty, IsUUID } from 'class-validator';

export class PoiConnectionRemoveReqDto {
  @IsNotEmpty()
  @IsUUID()
  id: string;

  @IsNotEmpty()
  @IsUUID()
  planDayId: string;

  @IsNotEmpty()
  @IsUUID()
  workspaceId: string;
}
