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
import { PostResponseDto } from '../post/dto/post-response.dto';
import { SimplePostParticipationResponseDto } from './dto/simple-post-participation-response.dto';
import { PostStatus } from '../post/entities/post-status.enum'; // PostStatus 임포트
import { PostParticipationStatus } from './entities/post-participation-status'; // 이미 임포트되어 있음

@Injectable()
export class PostParticipationService {
  constructor(
    private readonly notificationService: NotificationsService,

    @InjectRepository(PostParticipation)
    private readonly postParticipationRepository: Repository<PostParticipation>,
    @InjectRepository(Post)
    private readonly postRepository: Repository<Post>,
  ) {}

  async findUserParticipations(userId: string): Promise<PostResponseDto[]> {
    const participations = await this.postParticipationRepository.find({
      where: { requester: { id: userId } },
      relations: {
        requester: {
          profile: true,
        },
        post: {
          writer: {
            profile: true,
          },
          participations: {
            requester: {
              profile: true,
            },
          },
        },
      },
    });

    return participations.map((p) =>
      plainToInstance(
        PostResponseDto,
        {
          ...p.post,
          participations: p.post.participations.map((pp) =>
            plainToInstance(SimplePostParticipationResponseDto, pp, {
              excludeExtraneousValues: true,
            }),
          ),
        },
        {
          excludeExtraneousValues: true,
        },
      ),
    );
  }

  async requestParticipation(
    postId: string,
    requesterId: string,
  ): Promise<PostParticipationResponseDto> {
    const post = await this.postRepository.findOne({
      where: { id: postId },
      relations: {
        writer: {
          profile: true,
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

    try {
      await this.notificationService.createAndSaveNotification(
        post.writer,
        post,
      );
    } catch (error) {
      console.error('Failed to send notification : ', error);
    }

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
          profile: true,
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
    console.log(`[updateParticipationStatus] Called with:
      postId: ${postId},
      participationId: ${participationId},
      authorId: ${authorId},
      newStatus: ${updatePostParticipationDto.status}`);

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
    console.log(`[updateParticipationStatus] Found Post:
      postId: ${post.id},
      maxParticipants: ${post.maxParticipants},
      currentPostStatus: ${post.status},
      writerId: ${post.writer.id}`);

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
    console.log(`[updateParticipationStatus] Found Participation:
      participationId: ${participation.id},
      currentParticipationStatus: ${participation.status},
      requesterId: ${participation.requester.id}`);

    participation.status = updatePostParticipationDto.status;
    const updatedParticipation =
      await this.postParticipationRepository.save(participation);

    console.log(
      `[updateParticipationStatus] Participation status updated to: ${updatedParticipation.status}`,
    );

    // 동행 신청이 승인되었을 때, maxParticipants를 확인하여 게시글 상태를 업데이트
    if (updatedParticipation.status === PostParticipationStatus.APPROVED) {
      const approvedParticipations =
        await this.postParticipationRepository.find({
          where: {
            post: { id: postId },
            status: PostParticipationStatus.APPROVED,
          },
        });

      console.log(
        `[updateParticipationStatus] Number of APPROVED participations for post ${postId}: ${approvedParticipations.length}`,
      );

      // 작성자 포함하여 현재 참여자 수 계산
      const currentParticipantsCount = approvedParticipations.length + 1;
      console.log(
        `[updateParticipationStatus] currentParticipantsCount (including writer): ${currentParticipantsCount}`,
      );
      console.log(
        `[updateParticipationStatus] post.maxParticipants: ${post.maxParticipants}`,
      );

      if (currentParticipantsCount >= post.maxParticipants) {
        console.log(
          `[updateParticipationStatus] Condition met: currentParticipantsCount (${currentParticipantsCount}) >= post.maxParticipants (${post.maxParticipants})`,
        );
        console.log(
          `[updateParticipationStatus] Changing post status from ${post.status} to ${PostStatus.COMPLETED}`,
        );
        post.status = PostStatus.COMPLETED;
        await this.postRepository.save(post);
        console.log(
          `[updateParticipationStatus] Post status saved as ${post.status}`,
        );
      } else {
        console.log(
          `[updateParticipationStatus] Condition not met: currentParticipantsCount (${currentParticipantsCount}) < post.maxParticipants (${post.maxParticipants})`,
        );
      }
    }

    return plainToInstance(PostParticipationResponseDto, updatedParticipation);
  }
}
