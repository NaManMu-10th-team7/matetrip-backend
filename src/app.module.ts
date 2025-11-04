import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { getTypeOrmConfig } from './config/typeorm.config.js';
import { BinaryContentModule } from './domain/binary-content/binary-content.module';
import { ProfileModule } from './domain/profile/profile.module';
import { UsersModule } from './domain/users/users.module';
import { PostModule } from './domain/post/post.module';
import { PostParticipationModule } from './domain/post-participation/post-participation.module';
import { ReviewModule } from './domain/review/review.module';
import { WorkspaceModule } from './domain/workspace/workspace.module';
import { ChatMessageModule } from './domain/chat-message/chat-message.module';
import { PoiConnectionModule } from './domain/poi-connection/poi-connection.module';
import { AuthModule } from './domain/auth/auth.module';
import { RedisModule } from './redis/redis.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: getTypeOrmConfig,
    }),
    BinaryContentModule,
    ProfileModule,
    UsersModule,
    PostModule,
    PostParticipationModule,
    ReviewModule,
    WorkspaceModule,
    ChatMessageModule,
    PoiConnectionModule,
    AuthModule,
    RedisModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
