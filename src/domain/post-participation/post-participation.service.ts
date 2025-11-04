import {
  ConflictException,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PostParticipation } from './entities/post-participation.entity';
import { Repository } from 'typeorm';
import { Post } from '../post/entities/post.entity';
import { PostParticipationResponseDto } from './dto/post-participation-response.dto';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class PostParticipationService {
  constructor(
    @InjectRepository(PostParticipation)
    private readonly postParticipationRepository: Repository<PostParticipation>,
    @InjectRepository(Post)
    private readonly postRepository: Repository<Post>,
  ) {}

  async requestParticipation(
    postId: string,
    requesterId: string,
  ): Promise<PostParticipationResponseDto> {
    const post = await this.postRepository.findOne({
      where: { id: postId },
      relations: {
        writer: {
          profile: true, // 작성자의 프로필 정보까지 함께 조회합니다.
        },
      },
    });

    if (!post) {
      throw new NotFoundException('게시글을 찾을 수 없습니다.');
    }

    console.log(post);
    if (post.writer.id === requesterId) {
      throw new ForbiddenException(
        '자신이 작성한 게시글에는 참여 신청할 수 없습니다.',
      );
    }

    const existingParticipation =
      await this.postParticipationRepository.findOne({
        where: {
          post: { id: postId },
          requester: { id: requesterId },
        },
      });

    if (existingParticipation) {
      throw new ConflictException('이미 참여 신청한 게시글입니다.');
    }

    const participation = this.postParticipationRepository.create({
      post: { id: postId },
      requester: { id: requesterId },
    });

    const savedParticipation =
      await this.postParticipationRepository.save(participation);

    return plainToInstance(
      PostParticipationResponseDto,
      {
        ...savedParticipation,
        postId: savedParticipation.post.id,
        requesterId: savedParticipation.requester.id,
      },
      {
        excludeExtraneousValues: true,
      },
    );
  }
}
