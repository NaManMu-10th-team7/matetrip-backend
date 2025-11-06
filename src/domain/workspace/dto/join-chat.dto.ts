import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class JoinChatDto {
  @IsNotEmpty()
  @IsUUID()
  workspaceId: string;

  @IsNotEmpty()
  @IsString()
  username: string;
}
