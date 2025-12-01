import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { PostgresDriver } from 'typeorm/driver/postgres/PostgresDriver';

const driverPrototype: { supportedDataTypes?: string[] } =
  (PostgresDriver as { prototype?: { supportedDataTypes?: string[] } })
    ?.prototype ?? {};
driverPrototype.supportedDataTypes = driverPrototype.supportedDataTypes ?? [];
if (!driverPrototype.supportedDataTypes.includes('vector')) {
  driverPrototype.supportedDataTypes.push('vector');
}

export const getTypeOrmConfig = (
  configService: ConfigService,
): TypeOrmModuleOptions => ({
  type: 'postgres',
  host: configService.get<string>('DB_HOST'),
  port: configService.get<number>('DB_PORT'),
  username: configService.get<string>('DB_USERNAME'),
  password: configService.get<string>('DB_PASSWORD'),
  database: configService.get<string>('DB_NAME'),
  entities: [__dirname + '/../**/*.entity.{js,ts}'],
  synchronize: false,
  autoLoadEntities: true, // Nest의 엔티티 자동 로드 기능
  ssl: {
    rejectUnauthorized: false,
  },

  //터미널 에 console 찍히는거
  logging: false,
});
