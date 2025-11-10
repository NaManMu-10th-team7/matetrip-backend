import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Post } from './entities/post.entity.js';
import { Repository } from 'typeorm';
import { plainToInstance } from 'class-transformer';
import { PostResponseDto } from './dto/post-response.dto.js';
import { PostsPageQueryDto } from './dto/list-posts-query.dto.js';
import { SearchPostDto } from './dto/search-post.dto';
import { SimplePostParticipationResponseDto } from '../post-participation/dto/simple-post-participation-response.dto.js';
import { PostParticipation } from '../post-participation/entities/post-participation.entity';
import { PostParticipationStatus } from '../post-participation/entities/post-participation-status';

@Injectable()
export class PostService {
  constructor(
    @InjectRepository(Post)
    private readonly postRepository: Repository<Post>,
    @InjectRepository(PostParticipation)
    private readonly postParticipationRepository: Repository<PostParticipation>,
  ) {}

  async create(createPostDto: CreatePostDto, userId: string) {
    const post = this.postRepository.create({
      ...createPostDto,
      writer: { id: userId },
    });

    const savedPost = await this.postRepository.save(post);
    // todo : 워크스페이스 생성
    return this.toPostResponseDto(savedPost);
  }

  async findAll(): Promise<PostResponseDto[]> {
    const posts = await this.postRepository
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.writer', 'writer')
      .leftJoinAndSelect('writer.profile', 'profile')
      .leftJoinAndSelect('post.participations', 'participations')
      .leftJoinAndSelect('participations.requester', 'requester')
      .leftJoinAndSelect('requester.profile', 'requesterProfile')
      .orderBy('post.createdAt', 'DESC')
      .getMany();

    return posts.map((post) => this.toPostResponseDto(post));
  }

  async findOne(id: string) {
    const foundedPost = await this.postRepository.findOne({
      where: { id },
      relations: {
        writer: { profile: true },
        participations: {
          requester: {
            profile: true,
          },
        },
      },
    });

    if (!foundedPost) {
      throw new NotFoundException('게시물의 id와 일치하는 게시물가 없습니다');
    }

    return this.toPostResponseDto(foundedPost);
  }

  // /users/{userId}/posts에서 사용
  async findAllByUserId(
    userId: string,
    listPostsQueryDto: PostsPageQueryDto,
  ): Promise<PostResponseDto[]> {
    const { page, limit } = listPostsQueryDto;
    const result = await this.postRepository.find({
      where: { writer: { id: userId } },
      relations: {
        writer: {
          profile: true,
        },
        participations: {
          requester: {
            profile: true,
          },
        },
      },
      order: { createdAt: 'DESC', id: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    // todo : meta 데이터도 클라에 넘겨주기
    return result.map((post) => this.toPostResponseDto(post));
  }

  async update(id: string, userId: string, dto: UpdatePostDto) {
    const post = await this.postRepository.findOne({
      where: { id: id, writer: { id: userId } },
    });
    if (!post) {
      throw new NotFoundException('Post update failed');
    }

    // dto의 내용을 post 엔티티에 병합합니다.
    this.postRepository.merge(post, dto);
    // 변경된 엔티티를 저장합니다.
    await this.postRepository.save(post);
    // writer 정보를 포함하여 다시 조회한 후 DTO로 변환하여 반환합니다.
    return this.findOne(id);
  }

  async remove(id: string, userId: string) {
    const result = await this.postRepository.delete({
      id: id,
      writer: { id: userId },
    });

    if (!result.affected) {
      throw new NotFoundException('Post delete failed');
    }
  }

  private toPostResponseDto(post: Post | null) {
    if (!post) {
      throw new NotFoundException("Post doesn't exist");
    }
    // `post.writer`가 로드되지 않았을 경우를 대비한 방어 코드
    if (!post.writer || !post.writer.id) {
      // 실제 운영 환경에서는 로깅을 통해 이런 케이스를 추적하는 것이 좋습니다.
      throw new BadRequestException(
        'Writer information is missing for the post.',
      );
    }

    const postResponse = {
      ...post,
      writer: {
        id: post.writer.id,
        email: post.writer.email,
        profile: post.writer.profile,
      },
      participations: post.participations?.map((p) =>
        plainToInstance(SimplePostParticipationResponseDto, p, {
          excludeExtraneousValues: true,
        }),
      ),
    };
    return plainToInstance(PostResponseDto, postResponse, {
      excludeExtraneousValues: true,
    });
  }

  async searchPosts(searchPostDto: SearchPostDto): Promise<PostResponseDto[]> {
    const { startDate, endDate, title, location } = searchPostDto;

    const queryBuilder = this.postRepository.createQueryBuilder('post');

    if (title) {
      queryBuilder.andWhere('post.title ILIKE :title', { title: `%${title}%` });
    }

    if (location) {
      queryBuilder.andWhere('post.location ILIKE :location', {
        location: `%${location}%`,
      });
    }

    if (startDate) {
      queryBuilder.andWhere('post.start_date >= :startDate', { startDate });
    }

    if (endDate) {
      queryBuilder.andWhere('post.end_date <= :endDate', { endDate });
    }

    const posts = await queryBuilder
      .leftJoinAndSelect('post.writer', 'writer')
      .leftJoinAndSelect('writer.profile', 'profile')
      .orderBy('post.createdAt', 'DESC')
      // .skip((page - 1) * limit)
      // .take(limit)
      .getMany();

    return posts.map((post) => this.toPostResponseDto(post));
  }

  async cancelParticipation(
    postId: string,
    participationId: string,
    userId: string,
  ): Promise<void> {
    const participation = await this.postParticipationRepository.findOne({
      where: {
        id: participationId,
        post: { id: postId },
        requester: { id: userId },
      },
    });

    if (!participation) {
      throw new NotFoundException(
        '해당하는 동행 신청을 찾을 수 없습니다. (잘못된 postId, participationId 또는 userId)',
      );
    }

    const result = await this.postParticipationRepository.delete(participationId);

    if (result.affected === 0) {
      throw new BadRequestException('동행 신청 취소에 실패했습니다.');
    }
  }
}
