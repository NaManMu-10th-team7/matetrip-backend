import { INestApplicationContext } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { Server, ServerOptions } from 'socket.io';
import { RedisService } from './redis.service.js';

export class RedisIoAdapter extends IoAdapter {
  private adapterConstructor?: ReturnType<typeof createAdapter>;
  constructor(
    app: INestApplicationContext,
    private readonly redisService: RedisService,
  ) {
    super(app);
  }

  connectToRedis() {
    const pubClient = this.redisService.getPubClient();
    const subClient = this.redisService.getSubClient();
    this.adapterConstructor = createAdapter(pubClient, subClient);
  }

  createIOServer(port: number, options?: ServerOptions): Server {
    const server = super.createIOServer(port, options) as Server;

    if (!this.adapterConstructor) {
      throw new Error('Redis adapter가 아직 초기화되지 않았습니다.');
    }

    server.adapter(this.adapterConstructor);
    return server;
  }
}
