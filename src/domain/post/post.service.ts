import { Injectable, NotFoundException } from '@nestjs/common';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Post } from './entities/post.entity.js';
import { Repository } from 'typeorm';
import { plainToInstance } from 'class-transformer';
import { PostResponseDto } from './dto/post-response.dto.js';
import { PostsPageQueryDto } from './dto/list-posts-query.dto.js';
import { Users } from '../users/entities/users.entity.js';

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

  findAll() {
    return `This action returns all post`;
  }

  async findOne(id: string) {
    const foundedPost = await this.postRepository.findOne({
      where: { id: id },
    });

    if (!foundedPost) {
      throw new NotFoundException("Post doesn't exist");
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
      //relations: ['writer'],
      order: { createdAt: 'DESC', id: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return result.map((post) => this.toPostResponseDto(post));
  }

  update(id: number, updatePostDto: UpdatePostDto) {
    return `This action updates a #${id} post`;
  }

  remove(id: number) {
    return `This action removes a #${id} post`;
  }

  toPostResponseDto(post: Post) {
    return plainToInstance(PostResponseDto, post, {
      excludeExtraneousValues: true,
    });
  }
}
