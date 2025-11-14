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
  constructor(private readonly notificationsService: NotificationsService) {}

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

    console.log(`[SSE] User ${userId} connected for a new session.`);

    // 1. 서비스에 해당 유저의 구독을 요청하고 Observable 스트림을 받음
    const { subject, observable } = this.notificationsService.subscribe(userId);

    // 2. 클라이언트가 연결을 끊었을 때
    res.on('close', () => {
      console.log(`[SSE] User ${userId} disconnected from a session.`);
      // 서비스에 알려 리소스 정리
      this.notificationsService.unsubscribe(userId, subject);
    });

    // 3. 컨트롤러는 Observable을 반환해 SSE 연결 수립
    return observable;
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
