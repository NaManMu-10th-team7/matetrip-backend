import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Profile } from './entities/profile.entity';
import { Users } from '../users/entities/users.entity';
import { BinaryContent } from '../binary-content/entities/binary-content.entity';
import { BinaryContentModule } from '../binary-content/binary-content.module';

import { ProfileService } from './profile.service';
import { ProfileController } from './profile.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Profile, Users, BinaryContent]),
    BinaryContentModule,
  ],
  controllers: [ProfileController],
  providers: [ProfileService],
})
export class ProfileModule {}
