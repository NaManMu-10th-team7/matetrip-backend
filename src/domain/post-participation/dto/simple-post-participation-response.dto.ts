import { Expose, Type } from 'class-transformer';
import { IsDateString, IsEnum, IsUUID, ValidateNested } from 'class-validator';
import { PostParticipationStatus } from '../entities/post-participation-status';
import { UserResponseDto } from '../../users/dto/user-response.dto';

export class SimplePostParticipationResponseDto {
  @Expose()
  @IsUUID()
  id: string;

  @Expose()
  @IsEnum(PostParticipationStatus)
  status: PostParticipationStatus;

  @Expose()
  @Type(() => UserResponseDto)
  @ValidateNested()
  requester: UserResponseDto;

  @Expose()
  @IsDateString()
  requestedAt: string;
}
