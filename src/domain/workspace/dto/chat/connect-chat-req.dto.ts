import { IsNotEmpty, IsUUID } from 'class-validator';

export class ChatConnectionReqDto {
  @IsNotEmpty()
  @IsUUID()
  workspaceId: string;
}
