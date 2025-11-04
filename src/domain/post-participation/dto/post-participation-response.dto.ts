import { Expose, Type } from 'class-transformer';
import { IsEnum, IsUUID } from 'class-validator';
import { PostParticipationStatus } from '../entities/post-participation-status';
import { SimpleUserResponseDto } from 'src/domain/post-participation/dto/simple-user-response.dto';

export class PostParticipationResponseDto {
  @Expose()
  @IsUUID()
  id: string;

  @Expose()
  @IsUUID()
  postId: string;

  @Expose()
  @IsEnum(PostParticipationStatus)
  status: PostParticipationStatus;

  @Expose()
  @Type(() => SimpleUserResponseDto)
  requester: SimpleUserResponseDto;
}
