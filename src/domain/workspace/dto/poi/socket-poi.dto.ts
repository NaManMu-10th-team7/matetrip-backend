import { IsNotEmpty, IsUUID } from 'class-validator';

export class SocketPoiDto {
  @IsUUID()
  @IsNotEmpty()
  workspaceId: string;
}
