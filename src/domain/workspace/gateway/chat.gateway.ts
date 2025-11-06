import { Logger, UsePipes, ValidationPipe } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JoinChatReqDto } from '../dto/chat/join-chat-req.dto.js';
import { CreateMessageReqDto } from '../dto/chat/create-message-req.dto.js';
import { WorkspaceService } from '../service/workspace.service.js';
import { LeaveChatReqDto } from '../dto/chat/leave-chat-req.dto.js';
import { ChatMessageResDto } from '../dto/chat/chat-message-res.dto.js';
import { ChatConnectionReqDto } from '../dto/chat/connect-chat-req.dto.js';

const ChatEvent = {
  JOIN: 'join',
  JOINED: 'joined',
  LEAVE: 'leave',
  LEFT: 'left',
  MESSAGE: 'message',
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
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
    // TODO 메시지 캐시로할지 고민(휘발성 or 영구저장)
    socket.broadcast
      .to(this.getChatRoomName(data.workspaceId))
      .emit(
        ChatEvent.JOINED,
        JSON.stringify(ChatMessageResDto.of(data.username, data.message)),
      ); // 일단은 그냥 넘기자
  }

  @SubscribeMessage(ChatEvent.JOIN)
  async handleJoin(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: JoinChatReqDto,
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
    @MessageBody() data: LeaveChatReqDto,
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

  @SubscribeMessage(ChatEvent.DISCONNECT)
  async handleChatDisconnection(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: ChatConnectionReqDto,
  ) {
    await socket.leave(this.getChatRoomName(data.workspaceId));
    // cleanup이 필요하면
    // 자세한 로직은 나중에
  }

  private getChatRoomName(workspaceId: string) {
    return `chat:${workspaceId}`;
  }
}
