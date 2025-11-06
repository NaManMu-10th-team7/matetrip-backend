import { Logger, UsePipes, ValidationPipe } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JoinChatDto } from '../dto/chat/join-chat.dto.js';
import { CreateMessageReqDto } from '../dto/chat/create-message-req.dto.js';
import { WorkspaceService } from '../service/workspace.service.js';
import { LeaveChatDto } from '../dto/chat/leave-chat.dto.js';

const ChatEvent = {
  JOIN: 'join',
  JOINED: 'joined',
  LEAVE: 'leave',
  LEFT: 'left',
  MESSAGE: 'message',
};

@UsePipes(new ValidationPipe())
@WebSocketGateway(3004, {
  namespace: 'chat',
  cors: '*',
})
export class ChatGateway {
  private readonly logger = new Logger(ChatGateway.name);

  constructor(private readonly workspaceService: WorkspaceService) {}

  @WebSocketServer()
  server: Server;

  @SubscribeMessage(ChatEvent.MESSAGE)
  handleMessage(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: CreateMessageReqDto,
  ) {
    // TODO 메시지 구현
    socket.broadcast
      .to(this.getChatRoomName(data.workspaceId))
      .emit(ChatEvent.JOINED, { data }); // 일단은 그냥 넘기자
  }

  @SubscribeMessage(ChatEvent.JOIN)
  async handleJoin(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: JoinChatDto,
  ) {
    console.log(`join 요청 받었습니다`);
    const isExist = await this.workspaceService.isExist(data.workspaceId);
    if (!isExist) {
      throw new Error("Workspace doesn't exist");
    }
    console.log(`${data.username}이 join했다`);

    try {
      await socket.join(this.getChatRoomName(data.workspaceId));
      socket.broadcast
        .to(this.getChatRoomName(data.workspaceId))
        .emit(ChatEvent.JOINED, {
          data: `${data.username}`,
        });

      this.logger.log(`${data.username}님이 채팅방에 들어왔습니다.`);
    } catch {
      this.logger.error(
        `Socket ${socket.id} failed to join workspace ${data.workspaceId}`,
      );
    }
  }

  @SubscribeMessage(ChatEvent.LEAVE)
  async handleLeave(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: LeaveChatDto,
  ) {
    try {
      await socket.leave(this.getChatRoomName(data.workspaceId));
      socket.broadcast
        .to(this.getChatRoomName(data.workspaceId))
        .emit(ChatEvent.LEFT, {
          data: `${data.username}`,
        });
      console.log(`${data.username}님이 채팅방에서 나갔습니다.`);
    } catch {
      this.logger.error(
        `Socket ${socket.id} failed to leave workspace ${data.workspaceId}`,
      );
    }
  }

  private getChatRoomName(workspaceId: string) {
    return `chat:${workspaceId}`;
  }
}
