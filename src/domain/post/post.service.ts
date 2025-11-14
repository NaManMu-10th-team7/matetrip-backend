import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Post } from './entities/post.entity.js';
import { DataSource, Not, Repository } from 'typeorm';
import { plainToInstance } from 'class-transformer';
import { PostResponseDto } from './dto/post-response.dto.js';
import { PostsPageQueryDto } from './dto/list-posts-query.dto.js';
import { SearchPostDto } from './dto/search-post.dto';
import { SimplePostParticipationResponseDto } from '../post-participation/dto/simple-post-participation-response.dto.js';
import { PostParticipation } from '../post-participation/entities/post-participation.entity';
import { PostParticipationStatus } from '../post-participation/entities/post-participation-status';
import { UserResponseDto } from '../users/dto/user-response.dto';
import { Workspace } from '../workspace/entities/workspace.entity.js';
import { BinaryContent } from '../binary-content/entities/binary-content.entity';
import { BinaryContentService } from '../binary-content/binary-content.service';
import { Profile } from '../profile/entities/profile.entity';
import { Users } from '../users/entities/users.entity';

@Injectable()
export class PostService {
  constructor(
    @InjectRepository(Post)
    private readonly postRepository: Repository<Post>,
    @InjectRepository(Workspace)
    private readonly workspaceRepository: Repository<Workspace>,
    @InjectRepository(PostParticipation)
    private readonly postParticipationRepository: Repository<PostParticipation>,
    @InjectRepository(BinaryContent)
    private readonly binaryContentRepository: Repository<BinaryContent>,
    private readonly binaryContentService: BinaryContentService,
    private readonly dataSource: DataSource,
  ) {}

  async create(createPostDto: CreatePostDto, userId: string) {
    const { imageId, ...rest } = createPostDto;
    const post = this.postRepository.create({
      ...rest,
      writer: { id: userId },
    });

    if (imageId) {
      const image = await this.binaryContentRepository.findOneBy({
        id: imageId,
      });
      post.image = image; // 여기서 관계를 직접 세팅해야 image_id FK가 들어감
    }

    const savedPost = await this.postRepository.save(post);
    // todo : 워크스페이스 생성
    return this.toPostResponseDto(savedPost);
  }

  async findAll(): Promise<PostResponseDto[]> {
    const posts = await this.postRepository
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.writer', 'writer')
      .leftJoinAndSelect('writer.profile', 'profile')
      .leftJoinAndSelect('profile.profileImage', 'profileImage')
      .leftJoinAndSelect('post.image', 'image')
      .leftJoinAndSelect('post.participations', 'participations')
      .leftJoinAndSelect('participations.requester', 'requester')
      .leftJoinAndSelect('requester.profile', 'requesterProfile')
      .leftJoinAndSelect(
        'requesterProfile.profileImage',
        'requesterProfileImage',
      )
      .orderBy('post.createdAt', 'DESC')
      .getMany();

    return posts.map((post) => this.toPostResponseDto(post));
  }

  async findOne(id: string) {
    const foundedPost = await this.postRepository.findOne({
      where: { id },
      relations: {
        image: true,
        writer: { profile: { profileImage: true } },
        participations: {
          requester: {
            profile: { profileImage: true },
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
        image: true,
        writer: {
          profile: { profileImage: true },
        },
        participations: {
          requester: {
            profile: { profileImage: true },
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

  async findPostsByUserId(userId: string): Promise<PostResponseDto[]> {
    // 함수명 변경
    const writtenPosts = await this.postRepository.find({
      where: { writer: { id: userId } },
      relations: {
        image: true,
        writer: { profile: { profileImage: true } },
        participations: { requester: { profile: { profileImage: true } } },
      },
    });

    const participatedPosts = await this.postParticipationRepository
      .createQueryBuilder('participation')
      .leftJoinAndSelect('participation.post', 'post')
      .leftJoinAndSelect('post.image', 'postImage')
      .leftJoinAndSelect('post.writer', 'writer')
      .leftJoinAndSelect('writer.profile', 'profile')
      .leftJoinAndSelect('profile.profileImage', 'writerProfileImage')
      .leftJoinAndSelect('post.participations', 'postParticipations')
      .leftJoinAndSelect('postParticipations.requester', 'requester')
      .leftJoinAndSelect('requester.profile', 'requesterProfile')
      .leftJoinAndSelect(
        'requesterProfile.profileImage',
        'requesterProfileImage',
      )
      .where('participation.requester.id = :userId', { userId })
      .getMany();

    const allPosts = [...writtenPosts, ...participatedPosts.map((p) => p.post)];

    // 중복 제거 (Set을 활용하여 id 기준으로 중복 제거)
    const uniquePosts = Array.from(
      new Map(allPosts.map((post) => [post.id, post])).values(),
    );

    return uniquePosts.map((post) => this.toPostResponseDto(post));
  }

  async update(id: string, userId: string, dto: UpdatePostDto) {
    const post = await this.postRepository.findOne({
      where: { id: id, writer: { id: userId } },
      relations: ['image'],
    });
    if (!post) {
      throw new NotFoundException('Post update failed');
    }

    const { imageId, ...textData } = dto;

    // 텍스트/기타 필드 먼저 병합
    this.postRepository.merge(post, textData);

    const oldImageId = post.image?.id ?? null;

    if (imageId !== undefined) {
      if (imageId === null) {
        post.image = null;
      } else if (imageId !== oldImageId) {
        const newImage = await this.binaryContentRepository.findOne({
          where: { id: imageId },
        });

        if (!newImage) {
          throw new NotFoundException(
            `BinaryContent (Image) with ID ${imageId} not found`,
          );
        }

        const otherPostUsingImage = await this.postRepository.findOne({
          where: {
            image: { id: imageId },
            id: Not(post.id),
          },
        });

        if (otherPostUsingImage) {
          throw new ForbiddenException(
            `BinaryContent (Image) with ID ${imageId} is already linked to another post`,
          );
        }

        post.image = newImage;
      }
      // imageId가 기존 값과 동일하면 아무 작업도 하지 않음
    }

    const updatedPost = await this.postRepository.save(post);
    //기존의 이미지 지우는 작업
    if (oldImageId && oldImageId !== updatedPost.image?.id) {
      const remainingReferences = await this.postRepository.count({
        where: { image: { id: oldImageId } },
      });

      if (remainingReferences === 0) {
        await this.binaryContentService.deleteFile(oldImageId);
      }
    }

    // writer 정보를 포함하여 다시 조회한 후 DTO로 변환하여 반환합니다.
    return this.findOne(id);
  }

  async remove(id: string, userId: string) {
    let orphanImageId: string | null = null;

    await this.dataSource.transaction(async (transactionalEntityManager) => {
      const post = await transactionalEntityManager.findOne(Post, {
        where: { id, writer: { id: userId } },
        relations: ['image'],
      });

      if (!post) {
        throw new NotFoundException(
          'Post delete failed: Post not found or user not authorized',
        );
      }

      const imageId = post.image?.id ?? null;

      await transactionalEntityManager.delete(PostParticipation, {
        post: { id },
      });

      const result = await transactionalEntityManager.delete(Post, {
        id,
        writer: { id: userId },
      });

      if (result.affected === 0) {
        throw new NotFoundException('Post delete failed');
      }

      if (imageId) {
        // 같은 이미지를 다른 게시글이 참조하고 있는지 확인
        const remainingReferences = await transactionalEntityManager.count(
          Post,
          { where: { image: { id: imageId } } },
        );

        if (remainingReferences === 0) {
          // 트랜잭션이 끝난 뒤 실제 S3/BinaryContent 정리를 진행한다.
          orphanImageId = imageId;
        }
      }
    });

    if (orphanImageId) {
      //s3와 binary 에서 삭제 한다
      await this.binaryContentService.deleteFile(orphanImageId);
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
        profile: this.attachProfileImageId(post.writer.profile),
      },
      imageId: post.image?.id ?? null,
      participations: post.participations?.map((p) => {
        const requesterWithProfileImage = {
          ...p.requester,
          profile: this.attachProfileImageId(p.requester?.profile),
        };
        return plainToInstance(
          SimplePostParticipationResponseDto,
          { ...p, requester: requesterWithProfileImage },
          {
            excludeExtraneousValues: true,
          },
        );
      }),
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
      .leftJoinAndSelect('profile.profileImage', 'writerProfileImage')
      .leftJoinAndSelect('post.image', 'image')
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

    const result =
      await this.postParticipationRepository.delete(participationId);

    if (result.affected === 0) {
      throw new BadRequestException('동행 신청 취소에 실패했습니다.');
    }
  }

  async getPostMembersByWorkspaceId(
    workspaceId: string,
  ): Promise<UserResponseDto[]> {
    // workspaceId를 기반으로 Workspace를 찾고, 연관된 Post 정보를 가져옵니다.
    const workspace = await this.workspaceRepository.findOne({
      where: { id: workspaceId },
      relations: ['post'],
    });

    if (!workspace || !workspace.post) {
      throw new NotFoundException(
        `Workspace with ID "${workspaceId}" not found or has no associated post.`,
      );
    }

    return this.getPostMembers(workspace.post.id);
  }
  async getPostMembers(postId: string): Promise<UserResponseDto[]> {
    const post = await this.postRepository.findOne({
      where: { id: postId },
      relations: {
        writer: {
          profile: { profileImage: true },
        },
      },
    });

    if (!post) {
      throw new NotFoundException(`Post with ID "${postId}" not found`);
    }

    const approvedParticipations = await this.postParticipationRepository.find({
      where: {
        post: { id: postId },
        status: PostParticipationStatus.APPROVED,
      },
      relations: {
        requester: {
          profile: { profileImage: true },
        },
      },
    });

    const author = post.writer;
    const participants = approvedParticipations.map(
      (participation) => participation.requester,
    );

    // 작성자와 참여자 목록을 합치고 중복을 제거합니다.
    // Map을 사용하여 id를 키로 중복을 효율적으로 제거합니다.
    const membersMap = new Map<string, Users>();
    if (author) {
      membersMap.set(author.id, author);
    }
    participants.forEach((p) => {
      if (p) {
        membersMap.set(p.id, p);
      }
    });

    const members = Array.from(membersMap.values()).map((member) => ({
      ...member,
      profile: this.attachProfileImageId(member.profile),
    }));

    return members.map((member) =>
      plainToInstance(UserResponseDto, member, {
        excludeExtraneousValues: true,
      }),
    );
  }

  private attachProfileImageId(profile?: Profile | null): Profile {
    if (!profile) {
      throw new BadRequestException('Profile information is missing.');
    }
    return Object.assign(profile, {
      profileImageId: profile.profileImage?.id ?? null,
    });
  }
}
