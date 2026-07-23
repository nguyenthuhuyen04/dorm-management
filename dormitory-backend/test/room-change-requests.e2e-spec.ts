import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from './../src/app.module';
import cookieParser from 'cookie-parser';
import session from 'express-session';

const TEST_TIMEOUT = 30000;
const ADMIN_CREDENTIALS = { identifier: 'admin', password: 'Admin123!' };
const MANAGER_CREDENTIALS = { identifier: 'manager1', password: 'Manager123!' };
const STUDENT3_CREDENTIALS = {
  identifier: 'student3',
  password: 'Student123!',
};

const EXISTING_STUDENT_ID = 3;
const EXISTING_REQUESTED_ROOM_ID = 1;

async function loginAndGetToken(
  app: INestApplication,
  credentials: { identifier: string; password: string },
) {
  const res = await request(app.getHttpServer())
    .post('/api/auth/login')
    .send(credentials)
    .expect(200);
  return res.body.accessToken;
}

describe('RoomChangeRequests (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let managerToken: string;
  let studentToken: string;
  let createdRequestId: number;
  let dataSource: DataSource;

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
    studentToken = await loginAndGetToken(app, STUDENT3_CREDENTIALS);
    dataSource = app.get(DataSource);

    await dataSource.query(
      'DELETE FROM room_change_requests WHERE student_id = ?',
      [EXISTING_STUDENT_ID],
    );
  }, TEST_TIMEOUT);

  afterAll(async () => {
    await app.close();
  });

  function get(url: string, token: string) {
    return request(app.getHttpServer())
      .get(url)
      .set('Authorization', `Bearer ${token}`);
  }

  function post(url: string, token: string, body: any) {
    return request(app.getHttpServer())
      .post(url)
      .set('Authorization', `Bearer ${token}`)
      .send(body);
  }

  function put(url: string, token: string, body: any) {
    return request(app.getHttpServer())
      .put(url)
      .set('Authorization', `Bearer ${token}`)
      .send(body);
  }

  function del(url: string, token: string) {
    return request(app.getHttpServer())
      .delete(url)
      .set('Authorization', `Bearer ${token}`);
  }

  it('[201] should allow student to create a room change request', async () => {
    const res = await post('/api/room-change-requests', studentToken, {
      studentId: EXISTING_STUDENT_ID,
      requestedRoomId: EXISTING_REQUESTED_ROOM_ID,
      reason: 'Need quieter room',
    }).expect(201);

    createdRequestId = res.body.id;
    expect(res.body).toHaveProperty('id');
    expect(res.body.status).toBe('PENDING');
  });

  it('[200] should allow admin to list room change requests', async () => {
    const res = await get('/api/room-change-requests', adminToken).expect(200);
    expect(res.body).toHaveProperty('total');
    expect(res.body).toHaveProperty('data');
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('[200] should allow student to view own request', async () => {
    const list = await get(
      `/api/room-change-requests?studentId=${EXISTING_STUDENT_ID}`,
      studentToken,
    ).expect(200);
    expect(Array.isArray(list.body.data)).toBe(true);
  });

  it('[403] should prevent student from approving request', async () => {
    await put(`/api/room-change-requests/${createdRequestId}`, studentToken, {
      status: 'APPROVED',
      approvedBy: 3,
    }).expect(403);
  });

  it('[200] should allow admin to reject a request', async () => {
    const res = await put(
      `/api/room-change-requests/${createdRequestId}`,
      adminToken,
      {
        status: 'REJECTED',
        approvedBy: 1,
      },
    ).expect(200);
    expect(res.body.status).toBe('REJECTED');
  });

  it('[403] should prevent manager from deleting request', async () => {
    await del(
      `/api/room-change-requests/${createdRequestId}`,
      managerToken,
    ).expect(403);
  });
});
