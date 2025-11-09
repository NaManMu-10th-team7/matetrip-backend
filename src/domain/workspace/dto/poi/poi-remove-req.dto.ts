import { IsNotEmpty, IsUUID } from 'class-validator';

export class PoiRemoveReqDto {
  @IsUUID()
  @IsNotEmpty()
  workspaceId: string;

  @IsUUID()
  @IsNotEmpty()
  poiId: string;
}
