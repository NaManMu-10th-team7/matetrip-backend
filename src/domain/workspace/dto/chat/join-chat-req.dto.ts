import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class JoinChatReqDto {
  @IsNotEmpty()
  @IsUUID()
  workspaceId: string;

  @IsNotEmpty()
  @IsString()
  username: string;
}
