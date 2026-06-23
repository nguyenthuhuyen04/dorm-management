import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RoomsModule } from './rooms/rooms.module';
import { StudentsModule } from './students/students.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: process.env.DB_HOST ?? 'localhost',
      port: Number(process.env.DB_PORT ?? 3306),
      username: process.env.DB_USERNAME ?? 'root',
      password: process.env.DB_PASSWORD ?? '',
      database: process.env.DB_DATABASE ?? 'quan_ly_ky_tuc_xa',
      ssl: process.env.DB_SSL === 'false',
      extra: {
        ssl: process.env.DB_SSL === 'false' ? {
          rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED === 'false',
        } : undefined,
      },
      autoLoadEntities: true,
      synchronize: false,
    }),
    RoomsModule,
    StudentsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
