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
import { UpdatePostParticipationDto } from './dto/update-post-participation.dto';
import { Users } from '../users/entities/users.entity';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class PostParticipationService {
  constructor(
    private readonly notificationService: NotificationsService,

    @InjectRepository(PostParticipation)
    private readonly postParticipationRepository: Repository<PostParticipation>,
    @InjectRepository(Post)
    private readonly postRepository: Repository<Post>,
    // @InjectRepository(Users)
    // private readonly userRepository: Repository<Users>,
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

    this.notificationService.createAndSaveNotification(post.writer, post);

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

  async getParticipationsForPost(
    postId: string,
  ): Promise<PostParticipationResponseDto[]> {
    const participations = await this.postParticipationRepository.find({
      where: { post: { id: postId } },
      relations: {
        requester: {
          profile: true, // 작성자의 프로필 정보까지 함께 조회합니다.
        },
      },
    });

    return plainToInstance(PostParticipationResponseDto, participations);
  }

  /**
   * 동행 신청 상태를 '승인' 또는 '거절'로 변경한다.
   * 게시글 작성자만 이 작업을 수행할 수 있다.
   * @param postId
   * @param participationId
   * @param authorId
   * @param updatePostParticipationDto
   */
  async updateParticipationStatus(
    postId: string,
    participationId: string,
    authorId: string,
    updatePostParticipationDto: UpdatePostParticipationDto,
  ): Promise<PostParticipationResponseDto> {
    // 1. 게시물을 찾아 작성자가 맞는지 확인한다.
    const post = await this.postRepository.findOne({
      where: { id: postId },
      relations: {
        writer: true,
      },
    });

    if (!post) {
      throw new NotFoundException(
        `ID가 "${postId}"인 게시물을 찾을 수 없습니다.`,
      );
    }

    if (post.writer.id !== authorId) {
      throw new ForbiddenException(
        '해당 게시물의 동행 신청을 관리할 권한이 없습니다.',
      );
    }

    const participation = await this.postParticipationRepository.findOne({
      where: { id: participationId, post: { id: postId } },
      relations: {
        requester: true,
        post: true,
      },
    });

    if (!participation) {
      throw new NotFoundException(
        `ID가 "${participationId}"인 동행 신청을 찾을 수 없습니다.`,
      );
    }

    participation.status = updatePostParticipationDto.status;
    const updatedParticipation =
      await this.postParticipationRepository.save(participation);

    return plainToInstance(PostParticipationResponseDto, updatedParticipation);
  }
}
