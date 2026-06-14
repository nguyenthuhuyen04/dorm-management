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
    }),
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: process.env.DB_HOST ?? 'localhost',
      port: Number(process.env.DB_PORT ?? 3307),
      username: process.env.DB_USERNAME ?? 'root',
      password: process.env.DB_PASSWORD ?? '',
      database: process.env.DB_DATABASE ?? 'quan_ly_ky_tuc_xa',
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
