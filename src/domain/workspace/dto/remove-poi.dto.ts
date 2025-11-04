import { IsNotEmpty, IsUUID } from 'class-validator';

export class RemovePoiDto {
  @IsUUID()
  @IsNotEmpty()
  workspaceId: string;

  @IsUUID()
  @IsNotEmpty()
  poiId: string;
}
