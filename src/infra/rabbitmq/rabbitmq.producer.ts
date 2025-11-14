import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';

@Injectable()
export class RabbitmqProducer {
  constructor(
    @Inject('PROFILE_EMBEDDING_CLIENT')
    private readonly profile_embedding_client: ClientProxy,
  ) {}

  // 필요한 DTO
  enqueueProfileEmbedding(userId: string) {
    console.log(`sendProfileEmbedding: ${userId}`);
    this.profile_embedding_client.emit('profile_embedding', { userId });
  }
}
