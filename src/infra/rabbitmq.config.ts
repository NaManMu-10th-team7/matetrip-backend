import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';

export const RabbitMQConfig = ClientsModule.registerAsync([
  {
    name: 'PROFILE_EMBEDDING_CLIENT',
    imports: [ConfigModule],
    useFactory: () => ({
      transport: Transport.RMQ,
      options: {
        urls: [process.env.RABBITMQ_URL ?? 'amqp://guest:guest@localhost:5672'],
        queue: process.env.RABBITMQ_PROFILE_QUEUE,
        queueOptions: {
          durable: true,
        },
        noAck: true,
        prefetchCount: 1,
      },
    }),
    inject: [ConfigService],
  },
  {
    name: 'BEHAVIOR_EMBEDDING_CLIENT',
    imports: [ConfigModule],
    useFactory: () => ({
      transport: Transport.RMQ,
      options: {
        urls: [process.env.RABBITMQ_URL ?? 'amqp://guest:guest@localhost:5672'],
        queue: process.env.RABBITMQ_BEHAVIOR_QUEUE,
        queueOptions: {
          durable: true,
        },
        noAck: true,
        prefetchCount: 1,
      },
    }),
    inject: [ConfigService],
  },
]);
