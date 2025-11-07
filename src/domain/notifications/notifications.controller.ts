import {
  Controller,
  Get,
  MessageEvent,
  Param,
  Patch,
  Query,
  Req,
  Res,
  Sse,
  UseGuards,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { AuthGuard } from '@nestjs/passport';
import { type Request, type Response } from 'express';
import { Observable } from 'rxjs';
import { NotificationEventDto } from './dto/notification-event.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Notification } from './entities/notification.entity';
import { Repository } from 'typeorm';
import { GetNotificationsDto } from './dto/get-notifications.dto';

interface RequestWithUser extends Request {
  user: {
    id: string; // 유저 ID
    email: string; // 유저 이메일
  };
}

@Controller('notifications')
@UseGuards(AuthGuard('jwt'))
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    // 1. Notification Repository 주입(테스트용)
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
  ) {}

  /**
   * 클라이언트(React)가 실시간 알림을 구독하기 위해 연결하는 엔드포인트
   * @Sse 데코레이터는 이 엔드포인트가 Server-Sent Events 스트림임을 나타냄
   */
  @Sse('connect')
  subscribe(
    @Req() req: RequestWithUser,
    @Res() res: Response,
  ): Observable<MessageEvent> {
    const userId = req.user.id;

    console.log(`[SSE] User ${userId} connected.`);

    // 1. 서비스에 해당 유저의 구독을 요청하고 Observable 스트림을 받음
    const observable = this.notificationsService.subscribe(userId);

    // 2. 클라이언트가 연결을 끊었을 때
    res.on('close', () => {
      console.log(`[SSE] User ${userId} disconnected.`);
      // 서비스에 알려 리소스 정리
      this.notificationsService.unsubscribe(userId);
    });

    // 3. 컨트롤러는 Observable을 반환해 SSE 연결 수립
    return observable;
  }

  /**
   * 테스트 전용 임시 엔드포인트
   * 사용법 : 로그인 상태에서 GET /notifications/test-send
   */
  @Get('test-send')
  async sentTestNotification(
    @Req() req: RequestWithUser, // 알림 보낼 대상을 req.user에서 찾음
  ) {
    const userId = req.user.id;

    // 1. 테스트용 알림을 DB에 생성 및 저장
    const newNotification = this.notificationRepository.create({
      user: { id: userId },
      confirmed: false,
      content: `테스트 알림 : ${req.user.email}`,
    });

    const savedNotification =
      await this.notificationRepository.save(newNotification);

    const testData: NotificationEventDto = {
      id: savedNotification.id,
      content: savedNotification.content,
    };

    await this.notificationsService.sendNotification(userId, testData);

    return {
      ok: true,
      message: `${userId} (${req.user.email})님에게 테스트 알림 전송 시도`,
      data: testData,
    };
  }

  /**
   * 로그인한 유저가 읽지 않은 알림의 갯수를 반환
   * @param req 로그인한 유저
   * @returns 로그인한 유저가 읽지 않은 알림의 갯수
   */
  @Get('count')
  getUnreadCount(@Req() req: RequestWithUser) {
    return this.notificationsService.getUnreadCount(req.user.id);
  }

  /**
   * 로그인한 유저의 모든 알림 목록을 조회
   * 페이지네이션 추가 가능
   */
  @Get()
  async getMyNotifications(
    @Req() req: RequestWithUser,
    @Query() getNotificationsDto: GetNotificationsDto,
  ) {
    return this.notificationsService.getNotifications(
      req.user.id,
      getNotificationsDto,
    );
  }

  /**
   * 알림 읽음 처리
   */
  @Patch(':id/read')
  markOneAsRead(
    @Param('id') id: string, // URL에서 알림 ID를 받음
    @Req() req: RequestWithUser,
  ) {
    return this.notificationsService.markOneAsRead(id, req.user.id);
  }
}
