import { Injectable, MessageEvent, NotFoundException } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';
import { NotificationEventDto } from './dto/notification-event.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Users } from '../users/entities/users.entity';
import { Notification } from './entities/notification.entity';
import { GetNotificationsDto } from './dto/get-notifications.dto';

@Injectable()
export class NotificationsService {
  /**
   * 유저 ID를 키로, 해당 유저의 SSE 스트림(Subject) Set을 값으로 가지는 맵
   * Subject : RxJS에서 사용하는 특별한 객체로, 데이터를 '발행(Push)'할 수도 있고
   * '구독(Subscribe)'할 수도 있음.
   * 동일한 유저가 여러 탭을 열었을 때 하나의 탭을 닫으면 다른 모든 탭의 알림 연결까지 끊어짐
   * 이를 해결하기 위해 각 연결(탭)마다 고유한 Subject를 생성하고 관리하도록 변경
   */
  private userSubjects = new Map<string, Set<Subject<MessageEvent>>>();

  constructor(
    // Notification Repository 주입
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
  ) {}

  /**
   * 컨트롤러에서 호출
   * 새로운 클라이언트(유저)가 SSE 연결을 요청할 때 호출됨
   * @param userId - 인증된 유저의 ID
   * @returns 해당 유저가 구독할 수 있는 { subject, Observable }
   */
  subscribe(userId: string): {
    subject: Subject<MessageEvent>;
    observable: Observable<MessageEvent>;
  } {
    // 맵에서 해당 유저의 Subject Set을 찾음
    let subjects = this.userSubjects.get(userId);

    // 만약 이 유저의 Subject Set이 없으면 새로 생성
    if (!subjects) {
      subjects = new Set<Subject<MessageEvent>>();
      this.userSubjects.set(userId, subjects);
    }

    // 새 연결을 위한 새 Subject 생성
    const newSubject = new Subject<MessageEvent>();
    subjects.add(newSubject);

    // Subject와 Observable을 반환
    // 컨트롤러는 이것을 클라이언트에게 반환해 구독 관계 형성
    return { subject: newSubject, observable: newSubject.asObservable() };
  }

  /**
   * 컨트롤러에서 호출
   * 클라이언트(유저)가 SSE 연결을 끊을 때 호출됨
   * @param userId - 연결을 끊은 유저의 ID
   * @param subjectToUnsubscribe - 연결을 끊은 특정 Subject
   */
  unsubscribe(userId: string, subjectToUnsubscribe: Subject<MessageEvent>) {
    const subjects = this.userSubjects.get(userId);

    if (subjects) {
      // 스트림을 '완료'시켜 더 이상 데이터가 전송되지 않도록 함
      subjectToUnsubscribe.complete();
      // 셋에서 해당 유저를 제거해 메모리 누수 방지
      subjects.delete(subjectToUnsubscribe);

      // 셋이 다 비워지면 맵에서 제거
      if (subjects.size === 0) {
        this.userSubjects.delete(userId);
      }
    }
  }

  /**
   * 다른 서비스에서 호출
   * 특정 유저에게 실시간 알림 전송
   * @param userId - 알림을 받을 유저의 ID
   * @param type - 알림 타입 (e.g., 'new_notification', 'new_message')
   * @param data - 전송할 알림 데이터
   */
  async sendNotification(
    userId: string,
    type: string,
    data: NotificationEventDto,
  ) {
    // 알림을 받을 유저의 Subject Set을 찾음
    const subjects = this.userSubjects.get(userId);

    // Subject Set이 존재한다면 (유저가 현재 온라인 상태라면)
    if (subjects) {
      subjects.forEach((subject) => {
        try {
          // MessageEvent 형식에 맞춰 데이터 전송
          // 'type'을 지정하면 클라이언트에서 addEventListener로 특정 이벤트를 구분 가능합니다.
          subject.next({ type: type, data: data });
        } catch (error) {
          console.error(
            `Failed to send notification to user ${userId} : `,
            error,
          );
          // 실패한 Subject 정리
          this.unsubscribe(userId, subject);
        }
      });
    }
  }

  /**
   * 뱃지 카운트만 전송하는 함수
   */
  async sendUnreadCountUpdate(userId: string) {
    // 1. 최신 뱃지 카운트를 DB에서 조회
    const unreadCount = await this.getUnreadCount(userId);

    // 2. 해당 유저의 Subject Set을 찾음
    const subjects = this.userSubjects.get(userId);

    if (subjects) {
      // 3. 'unread-update'라는 이벤트 타입으로 뱃지 카운트 전송
      subjects.forEach((subject) =>
        subject.next({ type: 'unread-update', data: { unreadCount } }),
      );
    }
  }

  /**
   * 목록을 갱신하라는 신호만 전송하는 함수
   */
  async sendListStaleUpdate(userId: string) {
    const subjects = this.userSubjects.get(userId);

    subjects?.forEach((subject) =>
      subject.next({ type: 'list-stale', data: {} }),
    );
  }

  /**
   * 알림을 생성하고 DB에 저장
   * 실시간 SSE 전송
   */
  async createAndSaveNotification(
    recipient: Users,
    message: string,
    type: string, // type 파라미터 추가
    // TODO: 나중에 알림 클릭 시 이동할 URL도 받을 수 있도록 파라미터 추가 고려
  ) {
    // 2. Notification 엔티티 생성
    const newNotification = this.notificationRepository.create({
      user: { id: recipient.id },
      confirmed: false,
      content: message,
    });

    // 3. DB 저장
    const savedNotification =
      await this.notificationRepository.save(newNotification);

    // 4. 실시간 SSE 알림 전송
    try {
      await this.sendNotification(recipient.id, type, savedNotification);
    } catch (error) {
      console.warn(`Failed to send real-time notification: ${error.message}`);
    }

    // 5. 뱃지 카운트 갱신
    await this.sendUnreadCountUpdate(recipient.id);

    // 6. 목록 갱신 신호 전송 (중복 알림 문제로 주석 처리)
    // await this.sendListStaleUpdate(recipient.id);

    return savedNotification;
  }

  /**
   * 읽지 않은 알림 개수 조회
   * @param userId
   */
  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationRepository.count({
      where: {
        user: { id: userId },
        confirmed: false,
      },
    });
  }

  /**
   * 알림 목록 가져오기 (페이지네이션)
   * @param userId
   * @param getNotificationsDto
   */
  async getNotifications(
    userId: string,
    getNotificationsDto: GetNotificationsDto,
  ) {
    // 1. DTO에서 페이지 번호와 페이지당 항목 수를 가져옴
    const { page, limit } = getNotificationsDto;
    // 2. 데이터베이스에서 건너뛸 항목 수를 계산
    const skip = (page - 1) * limit;

    // 3. 데이터베이스에서 알림 목록과 전체 개수를 한 번에 조회
    const [notifications, total] =
      await this.notificationRepository.findAndCount({
        where: { user: { id: userId } }, // 특정 사용자의 알림만 필터링
        // 4. 정렬 순서 설정
        order: {
          confirmed: 'ASC', // 읽지 않은 것 먼저
          createdAt: 'DESC', // 최신순
        },
        skip: skip, // 건너뛸 개수
        take: limit, // 가져올 개수
      });

    return {
      data: notifications,
      page,
      limit,
      total,
      hasMore: page * limit < total, // 다음 페이지가 있는지 여부
    };
  }

  /**
   * 특정 알림 하나만 읽음 처리
   * @param notificationId
   * @param userId
   */
  async markOneAsRead(notificationId: string, userId: string) {
    // 원자적 업데이트 : confirmed가 false인 경우에만 업데이트
    const result = await this.notificationRepository.update(
      {
        id: notificationId,
        user: { id: userId },
        confirmed: false,
      },
      {
        confirmed: true,
      },
    );

    // 알림을 찾지 못했거나 이미 읽음 처리된 경우
    if (result.affected === 0) {
      const exists = await this.notificationRepository.findOne({
        where: { id: notificationId, user: { id: userId } },
      });

      if (!exists) {
        throw new NotFoundException('Notification not found');
      }

      return { success: true, changed: false };
    }

    await this.sendUnreadCountUpdate(userId);

    return { success: true, changed: true };
  }
}
