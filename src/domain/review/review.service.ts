// src/domain/review/review.service.ts
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, QueryFailedError, Repository } from 'typeorm';
import { Review } from './entities/review.entity';
import { Post } from '../post/entities/post.entity';
import { Users } from '../users/entities/users.entity';
import { CreateReviewDto } from './dto/create-review.dto';

@Injectable()
export class ReviewService {
  constructor(
    @InjectRepository(Review)
    private readonly reviewRepo: Repository<Review>,
    @InjectRepository(Post)
    private readonly postRepo: Repository<Post>,
    @InjectRepository(Users)
    private readonly userRepo: Repository<Users>,
    private readonly ds: DataSource,
  ) {}

  async create(dto: CreateReviewDto): Promise<{ id: string }> {
    const { rating, content, reviewerId, revieweeId, postId } = dto;

    const [reviewerExists, revieweeExists] = await Promise.all([
      this.userRepo.exist({ where: { id: reviewerId } }),
      this.userRepo.exist({ where: { id: revieweeId } }),
    ]);

    // post 존재 확인(옵션)
    let postRef: Post | null = null;
    if (postId) {
      const postExists = await this.postRepo.exist({ where: { id: postId } });
      // id만으로 관계 주입
      postRef = { id: postId } as Post;
    }

    // 엔티티 생성 (관계는 id만 주입해 FK 위반/스키마 불일치 이슈 최소화)
    const entity = this.reviewRepo.create({
      rating,
      content,
      post: postRef ?? null,
      reviewer: { id: reviewerId } as Users,
      reviewee: { id: revieweeId } as Users,
    });

    // 저장 (트랜잭션으로 래핑)
    const saved = await this.ds.transaction(async (manager) => {
      return manager.getRepository(Review).save(entity);
    });
    return { id: saved.id };
  }
}
