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
import { AuthModule } from './domain/auth/auth.module';
import { RedisModule } from './infra/redis/redis.module';
import { NotificationsModule } from './domain/notifications/notifications.module';
// import { OpenviduModule } from './openvidu/openvidu.module';
import { AiModule } from './ai/ai.module';
import { HttpModule } from '@nestjs/axios';
import { PlaceModule } from './domain/place/place.module';
import { RabbitmqModule } from './infra/rabbitmq/rabbitmq.module';
import { ProxyModule } from './domain/proxy/proxy.module';
import { UserBehaviorModule } from './domain/user_behavior/user_behavior.module';
import { PlaceUserReviewModule } from './domain/place_user_review/place_user_review.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: getTypeOrmConfig,
    }),
    HttpModule.register({
      timeout: 5000, // 5초 타임아웃
      maxRedirects: 5,
    }),
    BinaryContentModule,
    ProfileModule,
    UsersModule,
    PostModule,
    PostParticipationModule,
    ReviewModule,
    WorkspaceModule,
    AuthModule,
    RedisModule,
    NotificationsModule,
    // OpenviduModule,
    AiModule,
    PlaceModule,
    RabbitmqModule,
    ProxyModule,
    UserBehaviorModule,
    PlaceUserReviewModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
