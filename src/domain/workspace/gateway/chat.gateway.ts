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
import { AiService } from '../../../ai/ai.service.js';

const ChatEvent = {
  JOIN: 'join',
  JOINED: 'joined',
  LEAVE: 'leave',
  LEFT: 'left',
  MESSAGE: 'message',
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
};

const AGENT_NAME = '@AI';
// AI 에이전트를 위한 고유 식별자 (UUID 형식)
const AGENT_USER_ID = '00000000-0000-0000-0000-000000000000';

@UsePipes(new ValidationPipe())
@WebSocketGateway(3004, {
  namespace: 'chat',
  cors: '*',
})
export class ChatGateway {
  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private readonly workspaceService: WorkspaceService,
    private readonly aiService: AiService,
  ) {}

  @WebSocketServer()
  server: Server;

  @SubscribeMessage(ChatEvent.MESSAGE)
  async handleMessage(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: CreateMessageReqDto,
  ) {
    const { workspaceId, message } = data;
    const roomName = this.getChatRoomName(workspaceId);
    const messagePayload = ChatMessageResDto.of(
      data.username,
      data.message,
      data.userId,
    ); // data.userId 전달

    this.logger.log(
      `[MESSAGE] Emitting to room: ${roomName}, Payload: ${JSON.stringify(messagePayload)}`,
    );
    this.server.to(roomName).emit(ChatEvent.MESSAGE, messagePayload);

    // 1. AI 멘션인지 확인
    if (message.trim().startsWith(AGENT_NAME)) {
      // 2. AI에게 보낼 프롬프트 정리
      const prompt = message.replace(AGENT_NAME, '').trim();
      // 각 채팅방을 AI 세션으로 사용
      const sessionId = workspaceId;

      try {
        // 3. AiService를 호출해 AI 응답을 받음
        const aiResponse = await this.aiService.getAgentResponse(
          prompt,
          sessionId,
        );

        // 4. AI 응답을 ChatMessageResDto 형식으로 만듦
        const aiMessagePayload = ChatMessageResDto.of(
          AGENT_NAME,
          aiResponse.response, // ai.service.ts의 응답 형식에 따라 'response' 필드 사용
          AGENT_USER_ID, // AI 에이전트의 고유 ID 사용
          aiResponse.tool_data, // tool_data 전달
        );

        // 5. 채팅방에 AI 메시지 전송
        this.server.to(roomName).emit(ChatEvent.MESSAGE, aiMessagePayload);
        this.logger.log(
          `[AI_MESSAGE] Emitting to room: ${roomName}, Payload: ${JSON.stringify(aiMessagePayload)}`,
        );
      } catch (error) {
        this.logger.error(`Error getting AI response: ${error.message}`);
      }
    }
  }

  @SubscribeMessage(ChatEvent.JOIN)
  async handleJoin(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: JoinChatReqDto,
  ) {
    console.log(`join 요청 받았습니다`);
    const isExist = await this.workspaceService.isExist(data.workspaceId);
    if (!isExist) {
      throw new Error("Workspace doesn't exist");
    }
    console.log(`${data.username}이 join했습니다`);

    try {
      const roomName = this.getChatRoomName(data.workspaceId);
      await socket.join(roomName);
      this.logger.log(
        `[JOIN] Socket ${socket.id} joined room: ${roomName} by user: ${data.username}`,
      );

      socket.broadcast.to(roomName).emit(ChatEvent.JOINED, {
        data: `${data.username}`,
      });

      this.logger.log(`${data.username}님이 채팅방에 들어왔습니다.`);
    } catch (error) {
      this.logger.error(
        `[${data.username} 접속 실패]Socket failed to join workspace ${data.workspaceId}. Error: ${error.message}`,
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
        `[${data.username} leave 실패]Socket ${socket.id} failed to leave workspace ${data.workspaceId}`,
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
