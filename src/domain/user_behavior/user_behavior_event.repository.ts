import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { UserBehaviorEvent } from './entities/user_behavior_event.entity.js';
import { GetPlaceIdWithTimeDto } from '../place/dto/get-placeId-with-time.dto.js';

@Injectable()
export class UserBehaviorEventRepository extends Repository<UserBehaviorEvent> {
  constructor(private dataSource: DataSource) {
    super(UserBehaviorEvent, dataSource.createEntityManager());
  }

  /**
   * 사용자의 최근 관심 장소 ID 목록을 조회합니다.
   * @param userId - 사용자 ID
   * @param recentDays - 최근 N일
   * @param limit - 최대 조회 개수
   * @returns 장소 ID와 최신 이벤트 시간 배열 (최신순 정렬)
   */
  async getRecentInterestedPlaceIds(
    userId: string,
    recentDays: number,
    limit = 100,
  ): Promise<GetPlaceIdWithTimeDto[]> {
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - recentDays);

    const eventTypes = ['POI_SCHEDULE', 'POI_MARK'];

    return this.createQueryBuilder('event')
      .innerJoin('event.place', 'place')
      .innerJoin('event.user', 'user')
      .select('place.id', 'placeId')
      .addSelect('event.createdAt', 'latestEventAt')
      .where('user.id = :userId', { userId })
      .andWhere('event.eventType IN (:...eventTypes)', { eventTypes })
      .andWhere('event.createdAt >= :sinceDate', { sinceDate })
      .distinctOn(['place.id'])
      .orderBy('place.id')
      .addOrderBy('event.createdAt', 'DESC')
      .limit(limit)
      .getRawMany<GetPlaceIdWithTimeDto>();
  }
}
