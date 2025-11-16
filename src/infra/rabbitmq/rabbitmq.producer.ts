import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { isUUID } from 'class-validator';
import { EnqueueProfileEmbeddingDto } from './dto/create-rabbitmq.dto.js';
import { EnqueueBehaviorEventDto } from './dto/enqueue-behavior-event.dto.js';
@Injectable()
export class RabbitmqProducer {
  constructor(
    @Inject('PROFILE_EMBEDDING_CLIENT')
    private readonly profile_embedding_client: ClientProxy,
    @Inject('BEHAVIOR_EMBEDDING_CLIENT')
    private readonly behavior_embedding_client: ClientProxy,
  ) {}

  // 필요한 DTO
  enqueueProfileEmbedding(userId: string) {
    if (!isUUID(userId)) {
      throw new BadRequestException('Invalid user id');
    }
    console.log(`sendProfileEmbedding: ${userId}`);
    this.profile_embedding_client.emit(
      'profile_embedding',
      new EnqueueProfileEmbeddingDto(userId),
    );
  }

  // 행동 이벤트 전송
  enqueueBehaviorEvent(dto: EnqueueBehaviorEventDto) {
    if (!isUUID(dto.userId)) {
      throw new Error('Invalid user id');
    }
    if (dto.placeId && !isUUID(dto.placeId)) {
      throw new Error('Invalid place id');
    }
    console.log(`enqueueBehaviorEvent Full DTO:`, JSON.stringify(dto, null, 2));
    // WARNING : NestJS는 메시지를 { pattern, data } 구조로 감싼다
    this.behavior_embedding_client.emit('behavior_event', dto);
  }
}
