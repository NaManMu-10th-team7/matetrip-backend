import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateMessageReqDto {
  @IsNotEmpty()
  @IsUUID()
  workspaceId: string;

  @IsNotEmpty()
  @IsUUID()
  userId: string;

  @IsNotEmpty()
  @IsString()
  username: string; // 최적화를 위해 일부러 넘겨주기를 기대(Users 테이블 매번 조회하는 비용 줄이기 위해)

  @IsNotEmpty()
  @IsString()
  message: string;

  @IsOptional()
  @IsString()
  tempId?: string;
}
