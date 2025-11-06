import { IsNotEmpty, IsUUID } from 'class-validator';

export class RemovePoiReqDto {
  @IsUUID()
  @IsNotEmpty()
  workspaceId: string;

  @IsUUID()
  @IsNotEmpty()
  poiId: string;
}
