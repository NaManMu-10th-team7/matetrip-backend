import { Injectable, NotFoundException } from '@nestjs/common';
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
    return result.map((post) => this.toPostResponseDto(post));
  }

  async update(userId: string, updatePostDto: UpdatePostDto) {
    const exist = await this.postRepository.exists({
      where: { id: updatePostDto.id, writer: { id: userId } },
    });
    if (!exist) {
      throw new NotFoundException('Post update failed');
    }

    const result = await this.postRepository.update(
      updatePostDto.id,
      updatePostDto,
    );

    if (result.affected === 0) {
      throw new NotFoundException('Post update failed');
    }

    // 일단 toPostResponseDto써야되서 임시(나중에 이거 제거하고 다시)
    const updatedPost = await this.postRepository.findOne({
      where: { id: updatePostDto.id },
      //relations: ['writer'],
    });

    return this.toPostResponseDto(updatedPost);
  }

  remove(id: number) {
    return `This action removes a #${id} post`;
  }

  toPostResponseDto(post: Post | null) {
    if (!post) {
      throw new NotFoundException("Post doesn't exist");
    }

    return plainToInstance(PostResponseDto, post, {
      excludeExtraneousValues: true,
    });
  }
}
