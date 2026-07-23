import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export const getDatabaseConfig = (
  configService: ConfigService,
): TypeOrmModuleOptions => {
  const sslEnabled = configService.get<string>('DB_SSL') === 'true';
  const sslRejectUnauthorized = configService.get<string>('DB_SSL_REJECT_UNAUTHORIZED')?.toLowerCase() === 'true';

  return {
    type: 'mysql',
    host: configService.get<string>('DB_HOST'),
    port: Number(configService.get<string>('DB_PORT') ?? 3306),
    username: configService.get<string>('DB_USERNAME'),
    password: configService.get<string>('DB_PASSWORD'),
    database:
      configService.get<string>('DB_NAME') ?? configService.get<string>('DB_DATABASE'),
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    synchronize: false,
    logging: false,
    charset: 'utf8mb4',
    ssl: sslEnabled ? { rejectUnauthorized: sslRejectUnauthorized } : false,
    extra: {
      connectionLimit: 10,
      connectTimeout: 60000,
    },
  };
};
