import { Injectable, Logger } from '@nestjs/common';
import { UpdateChatMessageReqDto } from '../dto/chat/update-chat-message-req.dto';
import { CreateMessageReqDto } from '../dto/chat/create-message-req.dto.js';
import { InjectRepository } from '@nestjs/typeorm';
import { ChatMessage } from '../entities/chat-message.entity.js';
import { Repository } from 'typeorm';
import { Users } from '../../users/entities/users.entity.js';
import { Workspace } from '../entities/workspace.entity.js';

// AGENT_USER_ID를 게이트웨이와 공유하기 위해 가져오거나 상수로 정의합니다.
const AGENT_USER_ID = '00000000-0000-0000-0000-000000000000';

@Injectable()
export class ChatMessageService {
  private readonly logger = new Logger(ChatMessageService.name);

  constructor(
    @InjectRepository(ChatMessage)
    private readonly chatMessageRepository: Repository<ChatMessage>,
  ) {}

  /**
   * 채팅 메시지를 데이터베이스에 저장합니다.
   * @param dto 메시지 생성에 필요한 데이터
   * @returns 저장된 ChatMessage 엔티티
   */
  async create(dto: CreateMessageReqDto): Promise<ChatMessage> {
    this.logger.log(`Attempting to create message for user: ${dto.userId}`);
    try {
      const message = this.chatMessageRepository.create({
        user: { id: dto.userId } as Users,
        workspace: { id: dto.workspaceId } as Workspace,
        content: dto.message,
      });
      const savedMessage = await this.chatMessageRepository.save(message);
      this.logger.log(`Message saved successfully with id: ${savedMessage.id}`);
      return savedMessage;
    } catch (error) {
      this.logger.error(`Failed to save message for user ${dto.userId}.`);
      throw error;
    }
  }

  /**
   * 특정 워크스페이스의 모든 채팅 메시지를 조회하여 프론트엔드 형식으로 반환합니다.
   * @param workspaceId 워크스페이스 ID
   */
  async getMessagesByWorkspaceId(workspaceId: string) {
    const messages = await this.chatMessageRepository.find({
      where: { workspace: { id: workspaceId } },
      relations: ['user', 'user.profile'], // user와 user.profile 정보를 함께 가져오기 위해 관계 설정
      order: { createdAt: 'ASC' }, // 시간순으로 정렬
    });

    // DB 엔티티를 프론트엔드가 사용하는 페이로드 형식으로 변환
    return messages.map((msg) => {
      const username = msg.user
        ? msg.user.profile?.nickname || '알 수 없는 사용자'
        : '알 수 없는 사용자';
      const userId = msg.user ? msg.user.id : undefined;

      return {
        id: msg.id,
        username: username,
        message: msg.content,
        userId: userId,
        // userId를 기반으로 role을 동적으로 결정합니다.
        role: userId === AGENT_USER_ID ? 'ai' : 'user',
        toolData: null, // 과거 메시지에는 toolData가 없습니다.
        createdAt: msg.createdAt,
      };
    });
  }

  findOne(id: number) {
    return `This action returns a #${id} chatMessage`;
  }

  update(id: number, updateChatMessageDto: UpdateChatMessageReqDto) {
    return `This action updates a #${id} chatMessage`;
  }

  remove(id: number) {
    return `This action removes a #${id} chatMessage`;
  }
}
