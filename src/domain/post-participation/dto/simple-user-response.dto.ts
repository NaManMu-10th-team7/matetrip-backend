import { Expose, Transform } from 'class-transformer';
import { IsString, IsUUID } from 'class-validator';

export class SimpleUserResponseDto {
  @Expose()
  @IsUUID()
  id: string;

  @Expose()
  @IsString()
  nickname: string;

  @Expose()
  @IsString()
  profileImage: string;
}
