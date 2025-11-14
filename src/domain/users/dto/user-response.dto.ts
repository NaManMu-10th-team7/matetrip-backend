import { Expose, Type } from 'class-transformer';
import { IsEmail, IsUUID } from 'class-validator';
import { ProfilePayloadDto } from '../../profile/dto/profile.payload.dto';

export class UserResponseDto {
  @Expose()
  @IsUUID()
  id: string;

  @Expose()
  @IsEmail()
  email: string;

  @Expose()
  @Type(() => ProfilePayloadDto)
  profile: ProfilePayloadDto | null; //게시물 작성때 오류가 나서.. null 값도 허용
}
