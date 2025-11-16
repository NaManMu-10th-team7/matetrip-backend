import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { createClient, RedisClientType } from 'redis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly client: RedisClientType;
  private readonly pubClient: RedisClientType;
  private readonly subClient: RedisClientType;

  constructor() {
    const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';

    this.client = createClient({ url: redisUrl });
    this.pubClient = createClient({ url: redisUrl });
    this.subClient = this.pubClient.duplicate();

    [this.client, this.pubClient, this.subClient].forEach((instance) => {
      instance.on('error', (error) => {
        this.logger.error(`Redis error: ${error}`);
      });
    });
  }

  async onModuleInit(): Promise<void> {
    try {
      await Promise.all([
        this.client.isOpen ? Promise.resolve() : this.client.connect(),
        this.pubClient.isOpen ? Promise.resolve() : this.pubClient.connect(),
        this.subClient.isOpen ? Promise.resolve() : this.subClient.connect(),
      ]);
      this.logger.log('Redis clients connected');
    } catch (error) {
      this.logger.error('Failed to connect Redis clients', error);
      // 연결된 클라이언트 정리
      await Promise.all(
        [this.client, this.pubClient, this.subClient].map((instance) =>
          instance.isOpen ? instance.quit() : Promise.resolve(),
        ),
      );

      throw error;
    }
  }

  getClient(): RedisClientType {
    return this.client;
  }

  getPubClient(): RedisClientType {
    return this.pubClient;
  }

  getSubClient(): RedisClientType {
    return this.subClient;
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.all(
      [this.client, this.pubClient, this.subClient].map((instance) =>
        instance.isOpen ? instance.quit() : Promise.resolve(),
      ),
    );
    this.logger.log('Redis clients disconnected');
  }
}
