import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RoomsModule } from './rooms/rooms.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: (config: Record<string, string | undefined>) => {
        if (!config.DB_PASSWORD) {
          throw new Error(
            'Missing DB_PASSWORD. Create a .env file from .env.example and set your MySQL password.',
          );
        }

        if (config.DB_PASSWORD === 'CLICK_TO_REVEAL_PASSWORD') {
          throw new Error(
            'DB_PASSWORD is still a placeholder. Copy the real password from Aiven into your .env file.',
          );
        }

        return config;
      },
    }),
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: process.env.DB_HOST ?? 'localhost',
      port: Number(process.env.DB_PORT ?? 3307),
      username: process.env.DB_USERNAME ?? 'root',
      password: process.env.DB_PASSWORD ?? '',
      database: process.env.DB_DATABASE ?? 'quan_ly_ky_tuc_xa',
      ssl:
        process.env.DB_SSL === 'true'
          ? {
              rejectUnauthorized:
                process.env.DB_SSL_REJECT_UNAUTHORIZED === 'true',
            }
          : undefined,
      autoLoadEntities: true,
      retryAttempts: 1,
      synchronize: false,
    }),
    RoomsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
