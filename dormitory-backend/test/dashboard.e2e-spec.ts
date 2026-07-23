import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import cookieParser from 'cookie-parser';
import session from 'express-session';

const TEST_TIMEOUT = 30000;
const ADMIN_CREDENTIALS = { identifier: 'admin', password: 'Admin123!' };
const MANAGER_CREDENTIALS = { identifier: 'manager1', password: 'Manager123!' };
const STUDENT_CREDENTIALS = { identifier: 'student1', password: 'Student123!' };

describe('Dashboard (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let managerToken: string;
  let studentToken: string;

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

    adminToken = await loginAndGetToken(app, ADMIN_CREDENTIALS);
    managerToken = await loginAndGetToken(app, MANAGER_CREDENTIALS);
    studentToken = await loginAndGetToken(app, STUDENT_CREDENTIALS);
  }, TEST_TIMEOUT);

  afterAll(async () => {
    await app.close();
  });

  async function loginAndGetToken(
    app: INestApplication,
    credentials: { identifier: string; password: string },
  ) {
    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send(credentials)
      .expect(200);
    return response.body.accessToken;
  }

  it('[200] should return dashboard for admin', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/dashboard')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(response.body).toHaveProperty('users');
    expect(response.body).toHaveProperty('buildings');
    expect(response.body).toHaveProperty('rooms');
    expect(response.body.users).toHaveProperty('total');
    expect(response.body.rooms).toHaveProperty('occupancyRate');
  });

  it('[200] should return dashboard for manager scoped to own building data', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/dashboard')
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(200);

    expect(response.body).toHaveProperty('users');
    expect(response.body).toHaveProperty('buildings');
    expect(response.body.buildings.total).toBeGreaterThanOrEqual(0);
    expect(response.body.users.admins).toBe(0);
  });

  it('[403] should forbid student access', async () => {
    await request(app.getHttpServer())
      .get('/api/dashboard')
      .set('Authorization', `Bearer ${studentToken}`)
      .expect(403);
  });
});
