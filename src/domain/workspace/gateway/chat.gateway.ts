import { Logger, UsePipes, ValidationPipe } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JoinChatDto } from '../dto/join-chat.dto.js';
import { ChatMessageReqDto } from '../dto/chat-message-req.dto.js';
import { WorkspaceService } from '../service/workspace.service.js';

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
    @MessageBody() data: ChatMessageReqDto,
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
          participant: `${data.username}`,
        });

      this.logger.log(
        `Socket ${socket.id} joined workspace ${data.workspaceId}`,
      );
    } catch {
      this.logger.error(
        `Socket ${socket.id} failed to join workspace ${data.workspaceId}`,
      );
    }
  }

  private getChatRoomName(workspaceId: string) {
    return `chat:${workspaceId}`;
  }
}
