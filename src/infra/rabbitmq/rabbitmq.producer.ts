import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { EnqueueProfileEmbeddingDto } from './dto/create-rabbitmq.dto.js';
import { isUUID } from 'class-validator';

@Injectable()
export class RabbitmqProducer {
  constructor(
    @Inject('PROFILE_EMBEDDING_CLIENT')
    private readonly profile_embedding_client: ClientProxy,
  ) {}

  // 필요한 DTO
  enqueueProfileEmbedding(userId: string) {
    if (isUUID(userId) == false) {
      throw new Error('Invalid user id');
    }
    console.log(`sendProfileEmbedding: ${userId}`);
    this.profile_embedding_client.emit(
      'profile_embedding',
      new EnqueueProfileEmbeddingDto(userId),
    );
  }
}
