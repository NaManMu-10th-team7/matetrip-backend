import { Expose } from 'class-transformer';
import { IsEnum, IsUUID } from 'class-validator';
import { PostParticipationStatus } from '../entities/post-participation-status';

export class PostParticipationResponseDto {
  @Expose()
  @IsUUID()
  id: string;

  @Expose()
  @IsUUID()
  requesterId: string;

  @Expose()
  @IsUUID()
  postId: string;

  @Expose()
  @IsEnum(PostParticipationStatus)
  status: PostParticipationStatus;
}
