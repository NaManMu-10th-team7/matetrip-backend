import { Expose, Type } from 'class-transformer';
import { ProfilePayloadDto } from 'src/domain/profile/dto/profile.payload.dto';

// 인증된 사용자 정보를 전달하기 위한 DTO
// 민감 정보(hashedPassword)를 제외하고 클라이언트나 다른 계층에 전달할 때 사용
export class UserPayloadDto {
  @Expose()
  id: string;

  @Expose()
  email: string;

  @Expose()
  // Profile 엔티티를 ProfilePayloadDto로 변환하도록 지정
  @Type(() => ProfilePayloadDto)
  profile: ProfilePayloadDto;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date | null;
}
