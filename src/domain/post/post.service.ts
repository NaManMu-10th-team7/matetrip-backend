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

@Injectable()
export class PostService {
  constructor(
    @InjectRepository(Post)
    private readonly postRepository: Repository<Post>,
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
      .orderBy('post.createdAt', 'DESC')
      .getMany();

    return posts.map((post) => this.toPostResponseDto(post));
  }

  async findOne(id: string) {
    const foundedPost = await this.postRepository.findOne({
      where: { id },
      relations: {
        writer: { profile: true },
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
    // DTO로 변환하기 전에 필요한 데이터를 명시적으로 매핑합니다.
    const postWithWriterId = {
      ...post,
      writerId: post.writer.id,
      writerProfile: post.writer.profile,
    };
    return plainToInstance(PostResponseDto, postWithWriterId, {
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
}
