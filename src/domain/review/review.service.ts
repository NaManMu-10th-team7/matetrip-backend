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
    @InjectRepository(Review) private readonly reviewRepo: Repository<Review>,
    @InjectRepository(Post) private readonly postRepo: Repository<Post>,
    @InjectRepository(Users) private readonly userRepo: Repository<Users>,
    private readonly ds: DataSource,
  ) {}

  async create(dto: CreateReviewDto): Promise<{ id: string }> {
    const { rating, content, reviewerId, revieweeId, postId } = dto;

    // 0) 자기평가 금지
    if (reviewerId === revieweeId) {
      throw new BadRequestException('본인을 평가할 수 없습니다.');
    }

    // 1) 존재 확인 (쿼리만 날려서 true/false 확인)
    const [reviewerExists, revieweeExists] = await Promise.all([
      this.userRepo.exist({ where: { id: reviewerId } }),
      this.userRepo.exist({ where: { id: revieweeId } }),
    ]);
    if (!reviewerExists) throw new NotFoundException('리뷰어가 없습니다.');
    if (!revieweeExists) throw new NotFoundException('리뷰 대상 사용자가 없습니다.');

    // 2) post 존재 확인 (옵션) — 존재하지 않으면 즉시 404
    let postRef: Post | null = null;
    if (postId) {
      const postExists = await this.postRepo.exist({ where: { id: postId } });
      if (!postExists) throw new NotFoundException('게시글이 없습니다.');
      postRef = { id: postId } as Post; // id만으로 관계 주입
    }

    // 3) 엔티티 생성 (관계는 id만 주입 → 불필요한 SELECT 없음)
    const entity = this.reviewRepo.create({
      rating,
      content,
      post: postRef ?? null,
      reviewer: { id: reviewerId } as Users,
      reviewee: { id: revieweeId } as Users,
    });

    // 4) 저장 (트랜잭션)
    try {
      const saved = await this.ds.transaction((m) => m.getRepository(Review).save(entity));
      return { id: saved.id };
    } catch (e) {
      if (e instanceof QueryFailedError) {
          const driverError = e.driverError as { code?: string };
        if (driverError?.code === '23505')  {
          // 유니크 인덱스가 있다면(중복 리뷰 방지)
          throw new BadRequestException('이미 해당 사용자에 대한 리뷰가 존재합니다.');
        }
      }
      throw e; // 기타는 500
    }
  }
}
