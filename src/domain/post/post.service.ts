import { Injectable } from '@nestjs/common';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Post } from './entities/post.entity.js';
import { Repository } from 'typeorm';
import { plainToInstance } from 'class-transformer';
import { PostResponseDto } from './dto/post-response.dto.js';

@Injectable()
export class PostService {
  constructor(
    @InjectRepository(Post)
    private readonly postRepository: Repository<Post>,
  ) {}

  async create(createPostDto: CreatePostDto, userId: string) {
    const post = this.postRepository.create({
      ...createPostDto,
      writer: { id: userId }, // typeorm의 관계 매핑은 객체 참조 ->
    });

    const savedPost = await this.postRepository.save(post);
    return plainToInstance(PostResponseDto, savedPost, {
      excludeExtraneousValues: true,
    });
  }

  findAll() {
    return `This action returns all post`;
  }

  findOne(id: number) {
    return `This action returns a #${id} post`;
  }

  update(id: number, updatePostDto: UpdatePostDto) {
    return `This action updates a #${id} post`;
  }

  remove(id: number) {
    return `This action removes a #${id} post`;
  }
}
