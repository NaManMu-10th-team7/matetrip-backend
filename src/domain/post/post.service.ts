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
    return this.toPostResponseDto(savedPost);
  }

  // 아직 미정
  findAll() {
    return `This action returns all post`;
  }

  async findOne(id: string) {
    const foundedPost = await this.postRepository.findOne({
      where: { id: id },
    });
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
      //relations: ['writer'],
      order: { createdAt: 'DESC', id: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    // todo : meta 데이터도 클라에 넘겨주기
    return result.map((post) => this.toPostResponseDto(post));
  }

  async update(userId: string, dto: UpdatePostDto) {
    const entity = await this.postRepository.findOne({
      where: { id: dto.id, writer: { id: userId } },
    });
    if (!entity) {
      throw new NotFoundException('Post update failed');
    }

    const merged = this.postRepository.merge(entity, dto);
    const savedPost = await this.postRepository.save(merged);
    return this.toPostResponseDto(savedPost);
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

    return plainToInstance(PostResponseDto, post, {
      excludeExtraneousValues: true,
    });
  }
}
