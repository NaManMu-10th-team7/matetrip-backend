import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class LeaveChatDto {
  @IsNotEmpty()
  @IsUUID()
  workspaceId: string;

  @IsNotEmpty()
  @IsString()
  username: string;
}
