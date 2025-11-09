import { IsNotEmpty, IsUUID } from 'class-validator';

export class PoiSocketDto {
  @IsUUID()
  @IsNotEmpty()
  workspaceId: string;
}
