import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class LeaveChatReqDto {
  @IsNotEmpty()
  @IsUUID()
  workspaceId: string;

  @IsNotEmpty()
  @IsString()
  username: string;
}
