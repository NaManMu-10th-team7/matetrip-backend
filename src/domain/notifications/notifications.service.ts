import { Injectable, MessageEvent } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';
import { NotificationEventDto } from './dto/notification-event.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Users } from '../users/entities/users.entity';
import { Post } from '../post/entities/post.entity';
import { Notification } from './entities/notification.entity';

@Injectable()
export class NotificationsService {
  /**
   * 유저 ID를 키로, 해당 유저의 SSE 스트림(Subject)을 값으로 가지는 맵
   * Subject : RxJS에서 사용하는 특별한 객체로, 데이터를 '발행(Push)'할 수도 있고
   * '구독(Subscribe)'할 수도 있음.
   */
  private userSubjects = new Map<string, Subject<MessageEvent>>();

  constructor(
    // Notification Repository 주입
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
  ) {}

  /**
   * 컨트롤러에서 호출
   * 새로운 클라이언트(유저)가 SSE 연결을 요청할 때 호출됨
   * @param userId - 인증된 유저의 ID
   * @returns 해당 유저가 구독할 수 있는 Observable 스트림
   */
  subscribe(userId: string): Observable<MessageEvent> {
    // 맵에서 해당 유저의 Subject를 찾음
    let subject = this.userSubjects.get(userId);

    // 만약 이 유저의 Subject가 없으면 새로 생성
    if (!subject) {
      subject = new Subject<MessageEvent>();
      this.userSubjects.set(userId, subject);
    }

    // Subject를 Observable로 변환해 반환
    // 컨트롤러는 이것을 클라이언트에게 반환해 구독 관계 형성
    return subject.asObservable();
  }

  /**
   * 컨트롤러에서 호출
   * 클라이언트(유저)가 SSE 연결을 끊을 때 호출됨
   * @param userId - 연결을 끊은 유저의 ID
   */
  unsubscribe(userId: string) {
    const subject = this.userSubjects.get(userId);

    if (subject) {
      // 스트림을 '완료'시켜 더 이상 데이터가 전송되지 않도록 함
      subject.complete();
      // 맵에서 해당 유저를 제거해 메모리 누수 방지
      this.userSubjects.delete(userId);
    }
  }

  /**
   * 다른 서비스에서 호출
   * 특정 유저에게 실시간 알림 전송
   * @param userId - 알림을 받을 유저의 ID
   * @param data - 전송할 알림 데이터
   */
  async sendNotification(userId: string, data: NotificationEventDto) {
    // 알림을 받을 유저의 Subject를 찾음
    const subject = this.userSubjects.get(userId);

    // Subject가 존재한다면 (유저가 현재 온라인 상태라면)
    if (subject) {
      // MessageEvent 형식에 맞춰 데이터 전송
      // 'type'을 지정하면 클라이언트에서 addEventListener로 특정 이벤트를 구분 가능
      subject.next({ type: 'new_notification', data: data });
    }
  }

  /**
   * 알림을 생성하고 DB에 저장
   * 나중에 실시간 SSE 전송 로직도 추가 가능
   */
  async createAndSaveNotification(recipient: Users, post: Post) {
    // 1. 알림 메시지 및 URL 생성
    const message = `'${post.title}' 동행에 참여하고 싶은 사람이 있어요!`;

    // 2. Notification 엔티티 생성
    const newNotification = this.notificationRepository.create({
      userId: { id: recipient.id },
      confirmed: false,
      content: message,
    });

    // 3. DB 저장
    const savedNotification =
      await this.notificationRepository.save(newNotification);

    // 4. 향후 확장. 실시간 알림 전송 로직 호출
    //this.sendNotification(recipient.id, savedNotification);

    return savedNotification;
  }
}
