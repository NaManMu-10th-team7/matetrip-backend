// src/domain/review/review.service.ts
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Review } from './entities/review.entity';
import { Post } from '../post/entities/post.entity';
import { Users } from '../users/entities/users.entity';
import { CreateReviewDto } from './dto/create-review.dto';

@Injectable()
export class ReviewService {
  constructor(
    @InjectRepository(Review) private readonly reviewRepo: Repository<Review>,
    @InjectRepository(Post) private readonly postRepo: Repository<Post>,
    @InjectRepository(Users) private readonly userRepo: Repository<Users>,
    private readonly ds: DataSource,
  ) {}

  async create(dto: CreateReviewDto, reviewerId?: string) {
    if (!reviewerId) throw new ForbiddenException('리뷰어 식별이 필요합니다.');
    if (reviewerId === dto.revieweeId) {
      throw new BadRequestException('본인을 평가할 수 없습니다.');
    }

    const reviewee = await this.userRepo.findOne({ where: { id: dto.revieweeId } });
    if (!reviewee) throw new NotFoundException('리뷰 대상 사용자가 없습니다.');

    let post: Post | null = null;
    if (dto.postId) {
      post = await this.postRepo.findOne({ where: { id: dto.postId } });
      if (!post) throw new NotFoundException('게시글이 없습니다.');
      // TODO: reviewer/reviewee가 해당 post의 참여자인지 검증이 필요하면 여기서 확인
    }

    const entity = this.reviewRepo.create({
      rating: dto.rating,
      content: dto.content,
      post: post ?? null,
      reviewer: { id: reviewerId } as Users,
      reviewee,
    });

    const saved = await this.ds.transaction(async (manager) => {
      return manager.getRepository(Review).save(entity);
    });

    return { id: saved.id };
  }
}
