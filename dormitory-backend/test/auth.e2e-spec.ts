import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import { sign } from 'jsonwebtoken';
import { jwtConstants } from '../src/auth/auth.constants';

const TEST_TIMEOUT = 30000;

const ADMIN_CREDENTIALS = { identifier: 'admin', password: 'Admin123!' };

describe('Auth (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.enableCors({ origin: true, credentials: true });
    app.use(cookieParser());
    app.use(
      session({
        secret: process.env.SESSION_SECRET ?? 'sessionSecret',
        resave: false,
        saveUninitialized: false,
        cookie: { httpOnly: true, sameSite: 'lax' as const },
      }),
    );
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidUnknownValues: true,
      }),
    );

    await app.init();
  }, TEST_TIMEOUT);

  afterAll(async () => {
    await app.close();
  });

  it('[401] should reject invalid JWT token on auth logout', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/logout')
      .set('Authorization', 'Bearer invalid.token.value')
      .expect(401);
  });

  it('[401] should reject expired JWT token on auth logout', async () => {
    const expiredToken = sign(
      {
        sub: 1,
        username: 'admin',
        email: 'admin@test.com',
        role: 'ADMIN',
      },
      jwtConstants.secret,
      { expiresIn: '-1h' },
    );

    await request(app.getHttpServer())
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${expiredToken}`)
      .expect(401);
  });
});
