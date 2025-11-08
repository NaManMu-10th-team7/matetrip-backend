import { IsNotEmpty, IsUUID } from 'class-validator';

export class RemovePoiConnectionReqDto {
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
