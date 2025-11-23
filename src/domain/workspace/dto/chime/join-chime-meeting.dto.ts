import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class JoinChimeMeetingDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(64)
  userId: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  username?: string;
}
