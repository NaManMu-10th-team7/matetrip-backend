import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';

export const RabbitMQConfig = ClientsModule.registerAsync([
  {
    name: 'PROFILE_EMBEDDING_CLIENT',
    imports: [ConfigModule],
    useFactory: (configService: ConfigService) => ({
      transport: Transport.RMQ,
      options: {
        urls: [
          configService.getOrThrow<string>(
            'AWS_RABBITMQ_URL',
            'amqp://guest:guest@localhost:5672',
          ),
        ],
        queue: configService.getOrThrow<string>('RABBITMQ_PROFILE_QUEUE'),
        queueOptions: {
          durable: true,
        },
        prefetchCount: 1,
      },
    }),
    inject: [ConfigService],
  },
  {
    name: 'BEHAVIOR_EMBEDDING_CLIENT',
    imports: [ConfigModule],
    useFactory: (configService: ConfigService) => ({
      transport: Transport.RMQ,
      options: {
        urls: [
          configService.get<string>(
            'AWS_RABBITMQ_URL',
            'amqp://guest:guest@localhost:5672',
          ),
        ],
        queue: configService.get<string>('RABBITMQ_BEHAVIOR_QUEUE'),
        queueOptions: {
          durable: true,
        },
        prefetchCount: 1,
      },
    }),
    inject: [ConfigService],
  },
]);
