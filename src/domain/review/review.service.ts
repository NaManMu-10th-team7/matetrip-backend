// src/domain/review/review.service.ts
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  QueryFailedError,
  Repository,
} from 'typeorm';
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

  /**
   * 리뷰 생성
   * - JWT 미사용: dto.reviewerId를 필수로 받습니다.
   * - Users 엔티티-DB 스키마 불일치(login_id 등) 이슈 회피를 위해
   *   findOne 대신 exist()로 존재만 확인합니다.
   */
  async create(dto: CreateReviewDto): Promise<{ id: string }> {
    const { rating, content, reviewerId, revieweeId, postId } = dto;

    // 1) 자기평가 금지
    if (reviewerId === revieweeId) {
      throw new BadRequestException('본인을 평가할 수 없습니다.');
    }

    // 2) reviewer / reviewee 존재 확인 (exist 사용)
    const [reviewerExists, revieweeExists] = await Promise.all([
      this.userRepo.exist({ where: { id: reviewerId } }),
      this.userRepo.exist({ where: { id: revieweeId } }),
    ]);
    if (!reviewerExists) {
      throw new NotFoundException('리뷰어가 없습니다.');
    }
    if (!revieweeExists) {
      throw new NotFoundException('리뷰 대상 사용자가 없습니다.');
    }

    // 3) post 존재 확인(옵션)
    let postRef: Post | null = null;
    if (postId) {
      const postExists = await this.postRepo.exist({ where: { id: postId } });
      if (!postExists) {
        throw new NotFoundException('게시글이 없습니다.');
      }
      // id만으로 관계 주입
      postRef = { id: postId } as Post;
    }

    // 4) 엔티티 생성 (관계는 id만 주입해 FK 위반/스키마 불일치 이슈 최소화)
    const entity = this.reviewRepo.create({
      rating,
      content,
      post: postRef ?? null,
      reviewer: { id: reviewerId } as Users,
      reviewee: { id: revieweeId } as Users,
    });

    // 5) 저장 (트랜잭션으로 래핑)
    try {
      const saved = await this.ds.transaction(async (manager) => {
        return manager.getRepository(Review).save(entity);
      });
      return { id: saved.id };
    } catch (e) {
      // 개발 중 원인 파악용 로깅(원하시면 제거 가능)
      // eslint-disable-next-line no-console
      console.error('[Review Save Error]', e);

      if (e instanceof QueryFailedError) {
        const err: any = e;
        switch (err.code) {
          case '23503': // FK 위반
            // detail 문자열에 어떤 FK가 위반됐는지 포함되는 경우가 많습니다.
            // 예: Key (reviewer_id)=(...) is not present in table "users".
            throw new NotFoundException('연결된 사용자/게시글을 찾을 수 없습니다.');
          case '23505': // UNIQUE 위반(중복 리뷰 인덱스가 있다면)
            throw new BadRequestException('이미 해당 사용자에 대한 리뷰가 존재합니다.');
          case '23502': // NOT NULL 위반
            throw new BadRequestException('필수 컬럼이 비어 있습니다. 스키마를 확인해 주세요.');
          case '42703': // 잘못된 컬럼명 (엔티티-DB 스키마 불일치)
            throw new BadRequestException('엔티티와 DB 스키마의 컬럼명이 일치하지 않습니다.');
          case '42P01': // 테이블 없음
            throw new BadRequestException('테이블이 존재하지 않습니다. 마이그레이션을 적용해 주세요.');
        }
      }
      // 기타는 그대로 던져 Nest의 500 처리에 맡깁니다.
      throw e;
    }
  }
}
