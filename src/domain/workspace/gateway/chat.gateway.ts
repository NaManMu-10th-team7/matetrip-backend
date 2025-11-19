import { Logger, UsePipes, ValidationPipe } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JoinChatReqDto } from '../dto/chat/join-chat-req.dto.js';
import { CreateMessageReqDto } from '../dto/chat/create-message-req.dto.js';
import { WorkspaceService } from '../service/workspace.service.js';
import { LeaveChatReqDto } from '../dto/chat/leave-chat-req.dto.js';
import { ChatConnectionReqDto } from '../dto/chat/connect-chat-req.dto.js';
import { AiService } from '../../../ai/ai.service.js';
import { AiAgentResponseDto } from '../../../ai/dto/ai-response.dto.js';
import { ChatMessage } from '../entities/chat-message.entity.js';
import { ChatMessageService } from '../service/chat-message.service.js';
import { PoiGateway } from './poi.gateway.js';

const ChatEvent = {
  JOIN: 'join',
  JOINED: 'joined', // 프론트에서 사용하므로 복원
  LEAVE: 'leave',
  LEFT: 'left', // 프론트에서 사용하므로 복원
  MESSAGE: 'message',
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  ERROR: 'error', // 에러 처리를 위한 이벤트 추가
};

const AGENT_NAME = '@AI';
const AGENT_USER_ID = '00000000-0000-0000-0000-000000000000'; // AI 에이전트 고유 ID

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
    private readonly chatMessageService: ChatMessageService,
    private readonly poiGateway: PoiGateway,
  ) {}

  @WebSocketServer()
  server: Server;

  @SubscribeMessage(ChatEvent.MESSAGE)
  async handleMessage(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: CreateMessageReqDto,
  ) {
    const { workspaceId, message, username, userId, tempId } = data;
    const roomName = this.getChatRoomName(workspaceId);

    let savedMessage: ChatMessage;
    this.logger.debug('[MESSAGE] Received from socket: ' + socket.id);
    try {
      // 1. 사용자 메시지를 DB에 저장
      savedMessage = await this.chatMessageService.create(data);
    } catch {
      this.logger.error(
        `Could not save user message to DB. Data: ${JSON.stringify(data)}`,
      );
      return; // DB 저장 실패 시 메시지 전송 로직을 중단
    }

    this.logger.debug(
      `[MESSAGE] Saved to DB. Message: ${JSON.stringify(savedMessage)}`,
    );

    // 2. 클라이언트로 전송할 페이로드 생성 (DB에 저장된 ID 사용)
    const messagePayload = {
      id: savedMessage.id,
      username,
      message,
      userId,
      role: 'user' as const, // 사용자 역할 명시
      tempId, // [추가] 클라이언트가 보낸 임시 ID를 다시 전달
    };

    this.logger.debug(
      `[MESSAGE] Emitting to room: ${roomName}, Payload: ${JSON.stringify(messagePayload)}`,
    );
    this.server.to(roomName).emit(ChatEvent.MESSAGE, messagePayload);

    // 3. AI 멘션인지 확인
    if (message.trim().startsWith(AGENT_NAME)) {
      const prompt = message.replace(AGENT_NAME, '').trim();
      const sessionId = workspaceId;

      // 3-1. [추가] "AI 응답 생성 중..." 메시지를 즉시 전송
      const aiLoadingPayload = {
        id: `ai-loading-${Date.now()}`, // 임시 로딩 ID
        username: AGENT_NAME,
        message: 'AI가 응답을 생성하고 있습니다...',
        userId: AGENT_USER_ID,
        role: 'ai' as const,
        isLoading: true, // 로딩 상태임을 명시
      };
      this.server.to(roomName).emit(ChatEvent.MESSAGE, aiLoadingPayload);
      this.logger.debug(
        `[AI_LOADING] Emitting to room: ${roomName}, Payload: ${JSON.stringify(
          aiLoadingPayload,
        )}`,
      );

      try {
        const aiResponse: AiAgentResponseDto =
          await this.aiService.getAgentResponse(prompt, sessionId);

        this.logger.debug(`[DEBUG] Full AI Response:`);
        // 3-2. AI 응답은 DB에 저장하지 않습니다.

        // 3-3. 클라이언트로 전송할 최종 AI 페이로드 생성 (role, toolData 포함)
        const aiMessagePayload = {
          id: `ai-${Date.now()}`, // DB에 저장하지 않으므로 임시 ID 생성
          username: AGENT_NAME,
          message: aiResponse.response,
          userId: AGENT_USER_ID,
          role: 'ai' as const, // AI 역할 명시
          toolData: aiResponse.tool_data, // 프론트엔드 액션을 위한 toolData
          isLoading: false, // [추가] 로딩이 완료되었음을 명시
        };

        // AI 채팅 메시지를 먼저 클라이언트에게 전송합니다.
        this.server.to(roomName).emit(ChatEvent.MESSAGE, aiMessagePayload);
        this.logger.log(
          `[AI_MESSAGE] Emitting to room: ${roomName}, Payload: ${JSON.stringify(aiMessagePayload)}`,
        );
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        this.logger.error(`Error getting AI response: ${errorMessage}`);
        // AI 응답 실패 시 클라이언트에게 에러 메시지 전송
        socket.emit(ChatEvent.ERROR, {
          message: 'AI 응답을 가져오는 데 실패했습니다.',
        });
      }
    }
  }

  @SubscribeMessage(ChatEvent.JOIN)
  async handleJoin(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: JoinChatReqDto,
  ) {
    const isExist = await this.workspaceService.isExist(data.workspaceId);
    // [수정] 서버를 중단시키는 throw 대신 WsException 또는 에러 이벤트 사용
    if (!isExist) {
      this.logger.error(`Workspace ${data.workspaceId} doesn't exist.`);
      socket.emit(ChatEvent.ERROR, {
        message: `존재하지 않는 워크스페이스입니다: ${data.workspaceId}`,
      });
      return; // 핸들러 종료
    }

    try {
      const roomName = this.getChatRoomName(data.workspaceId);
      await socket.join(roomName);
      this.logger.log(
        `[JOIN] Socket ${socket.id} joined room: ${roomName} by user: ${data.username}`,
      );

      // [수정] 1. 입장한 사용자에게 과거 채팅 기록 전송
      // ChatService에서 메시지를 가져온다고 가정합니다.
      const messageHistory =
        await this.chatMessageService.getMessagesByWorkspaceId(
          data.workspaceId,
        );
      socket.emit(ChatEvent.JOINED, messageHistory);
      this.logger.log(
        `[HISTORY] Sent ${messageHistory.length} messages to ${data.username}`,
      );

      // [수정] 2. 다른 사용자들에게는 입장 알림 전송
      socket.broadcast.to(roomName).emit(ChatEvent.JOINED, {
        data: `${data.username}`,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `[${data.username} 접속 실패]Socket failed to join workspace ${data.workspaceId}. Error: ${errorMessage}`,
      );
      // ChatService에서 에러가 발생할 수 있으므로 WsException을 사용
      throw new WsException('채팅방 입장에 실패했습니다.');
    }
  }

  @SubscribeMessage(ChatEvent.LEAVE)
  async handleLeave(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: LeaveChatReqDto,
  ) {
    try {
      const roomName = this.getChatRoomName(data.workspaceId);
      await socket.leave(roomName);
      this.logger.log(
        `[LEAVE] Socket ${socket.id} left room: ${roomName} by user: ${data.username}`,
      );

      // [수정] 프론트 요구사항에 맞춰 LEFT 이벤트로 퇴장 알림 전송
      socket.broadcast.to(roomName).emit(ChatEvent.LEFT, {
        data: `${data.username}`,
      });
    } catch {
      this.logger.error(
        `[${data.username} leave 실패]Socket ${socket.id} failed to leave workspace ${data.workspaceId}`,
      );
    }
  }

  // handleDisconnection은 socket.io에서 자동으로 처리해주는 경우가 많아
  // 명시적인 LEAVE 이벤트로 처리하는 것이 더 안정적일 수 있습니다.
  // 이 핸들러는 클라이언트가 브라우저를 닫는 등 비정상 종료 시 처리를 위해 남겨둘 수 있습니다.
  @SubscribeMessage(ChatEvent.DISCONNECT)
  async handleChatDisconnection(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: ChatConnectionReqDto,
  ) {
    // 이 핸들러가 호출될 때 data가 없을 수 있으므로 방어적으로 코딩해야 합니다.
    if (data && data.workspaceId) {
      await socket.leave(this.getChatRoomName(data.workspaceId));
      this.logger.log(
        `[DISCONNECT] Socket ${socket.id} disconnected from room for workspace ${data.workspaceId}`,
      );
    }
  }

  private getChatRoomName(workspaceId: string): string {
    return `chat:${workspaceId}`;
  }
}
