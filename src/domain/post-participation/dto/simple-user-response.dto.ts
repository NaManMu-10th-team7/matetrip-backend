import { Expose, Transform } from 'class-transformer';
import { IsString, IsUUID } from 'class-validator';
import { Profile } from 'src/domain/profile/entities/profile.entity';

export class SimpleUserResponseDto {
  @Expose()
  @IsUUID()
  id: string;

  @Expose()
  @Transform(({ obj }) => obj.profile?.nickname)
  @IsString()
  nickname: string;

  @Expose()
  @Transform(({ obj }) => obj.profile?.profileImage)
  @IsString()
  profileImage: string;

  profile: Profile;
}
