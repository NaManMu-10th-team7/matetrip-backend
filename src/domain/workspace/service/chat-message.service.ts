import { Injectable } from '@nestjs/common';
import { UpdateChatMessageReqDto } from '../dto/chat/update-chat-message-req.dto';
import { CreateMessageReqDto } from '../dto/chat/create-message-req.dto.js';
import { InjectRepository } from '@nestjs/typeorm';
import { ChatMessage } from '../entities/chat-message.entity.js';
import { Repository } from 'typeorm';
import { Users } from '../../users/entities/users.entity.js';
import { Workspace } from '../entities/workspace.entity.js';
import { ChatMessageResDto } from '../dto/chat/chat-message-res.dto.js';

@Injectable()
export class ChatMessageService {
  constructor(
    @InjectRepository(ChatMessage)
    private readonly chatMessageRepository: Repository<ChatMessage>,
  ) {}
  async create(dto: CreateMessageReqDto): Promise<ChatMessageResDto> {
    const message = this.chatMessageRepository.create({
      user: { id: dto.userId } as Users,
      workspace: { id: dto.workspaceId } as Workspace,
      content: dto.message,
    });
    await this.chatMessageRepository.save(message);

    return ChatMessageResDto.of(dto.username, dto.message);
  }

  findAll() {
    return `This action returns all chatMessage`;
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
