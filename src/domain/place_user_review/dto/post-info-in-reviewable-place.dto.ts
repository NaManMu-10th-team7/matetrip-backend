import { Post } from '../../post/entities/post.entity';

export class PostInfoInReviewablePlaceDto {
  id: string;
  title: string;

  static fromEntity(post: Post): PostInfoInReviewablePlaceDto {
    const dto = new PostInfoInReviewablePlaceDto();
    dto.id = post.id;
    dto.title = post.title;
    return dto;
  }
}
