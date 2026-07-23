import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from './../src/app.module';
import cookieParser from 'cookie-parser';
import session from 'express-session';

const TEST_TIMEOUT = 30000;

const ADMIN_CREDENTIALS = { identifier: 'admin', password: 'Admin123!' };
const MANAGER_CREDENTIALS = {
  identifier: 'manager1',
  password: 'Manager123!',
};
const STUDENT_CREDENTIALS = {
  identifier: 'student1',
  password: 'Student123!',
};

const EXISTING_ANNOUNCEMENT_ID = 1;
const NON_EXISTENT_ID = 9999;

describe('Announcements (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  let adminToken: string;
  let managerToken: string;
  let studentToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    dataSource = app.get(DataSource);

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

    adminToken = await loginAndGetToken(ADMIN_CREDENTIALS);
    managerToken = await loginAndGetToken(MANAGER_CREDENTIALS);
    studentToken = await loginAndGetToken(STUDENT_CREDENTIALS);
  }, TEST_TIMEOUT);

  afterAll(async () => {
    await app.close();
  });

  async function loginAndGetToken(credentials: {
    identifier: string;
    password: string;
  }): Promise<string> {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send(credentials)
      .expect(200);
    return res.body.accessToken;
  }

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

  // ─── GET /announcements ──────────────────────────────────────────────────

  describe('GET /announcements', () => {
    it(
      '[200] should return paginated announcements for admin',
      async () => {
        const res = await get('/api/announcements', adminToken).expect(200);

        expect(res.body).toHaveProperty('total');
        expect(res.body).toHaveProperty('page');
        expect(res.body).toHaveProperty('limit');
        expect(res.body).toHaveProperty('totalPages');
        expect(res.body).toHaveProperty('data');
        expect(Array.isArray(res.body.data)).toBe(true);
      },
      TEST_TIMEOUT,
    );

    it(
      '[200] should return announcements for manager',
      async () => {
        const res = await get('/api/announcements', managerToken).expect(200);

        expect(res.body).toHaveProperty('data');
        expect(Array.isArray(res.body.data)).toBe(true);
      },
      TEST_TIMEOUT,
    );

    it(
      '[200] should return announcements for student',
      async () => {
        const res = await get('/api/announcements', studentToken).expect(200);

        expect(res.body).toHaveProperty('data');
        expect(Array.isArray(res.body.data)).toBe(true);
      },
      TEST_TIMEOUT,
    );

    it(
      '[200] should support search query',
      async () => {
        const res = await get(
          '/api/announcements?search=thông báo',
          adminToken,
        ).expect(200);

        expect(res.body).toHaveProperty('data');
        expect(Array.isArray(res.body.data)).toBe(true);
      },
      TEST_TIMEOUT,
    );

    it(
      '[200] should support filter by target_role',
      async () => {
        const res = await get(
          '/api/announcements?target_role=STUDENT',
          adminToken,
        ).expect(200);

        expect(res.body).toHaveProperty('data');
      },
      TEST_TIMEOUT,
    );

    it(
      '[200] should support filter by created_by',
      async () => {
        const res = await get(
          '/api/announcements?created_by=1',
          adminToken,
        ).expect(200);

        expect(res.body).toHaveProperty('data');
      },
      TEST_TIMEOUT,
    );

    it(
      '[200] should support pagination (page & limit)',
      async () => {
        const res = await get(
          '/api/announcements?page=1&limit=2',
          adminToken,
        ).expect(200);

        expect(res.body.page).toBe(1);
        expect(res.body.limit).toBe(2);
        expect(res.body.data.length).toBeLessThanOrEqual(2);
      },
      TEST_TIMEOUT,
    );

    it(
      '[200] should return correct pagination metadata',
      async () => {
        const res = await get(
          '/api/announcements?page=1&limit=5',
          adminToken,
        ).expect(200);

        expect(res.body).toMatchObject({
          page: expect.any(Number),
          limit: expect.any(Number),
          total: expect.any(Number),
          totalPages: expect.any(Number),
          data: expect.any(Array),
        });
      },
      TEST_TIMEOUT,
    );

    it(
      '[401] should reject unauthenticated requests',
      async () => {
        await request(app.getHttpServer())
          .get('/api/announcements')
          .expect(401);
      },
      TEST_TIMEOUT,
    );
  });

  // ─── GET /announcements/:id ──────────────────────────────────────────────

  describe('GET /announcements/:id', () => {
    it(
      '[200] should return an announcement by id for admin',
      async () => {
        const res = await get(
          `/api/announcements/${EXISTING_ANNOUNCEMENT_ID}`,
          adminToken,
        ).expect(200);

        expect(res.body).toHaveProperty('id', EXISTING_ANNOUNCEMENT_ID);
        expect(res.body).toHaveProperty('title');
        expect(res.body).toHaveProperty('content');
        expect(res.body).toHaveProperty('targetRole');
      },
      TEST_TIMEOUT,
    );

    it(
      '[400] should reject invalid announcement id (non-numeric)',
      async () => {
        const res = await get('/api/announcements/abc', adminToken).expect(400);

        expect(res.body.message).toContain('Invalid announcement id');
      },
      TEST_TIMEOUT,
    );

    it(
      '[404] should return 404 for non-existent announcement',
      async () => {
        await get(`/api/announcements/${NON_EXISTENT_ID}`, adminToken).expect(
          404,
        );
      },
      TEST_TIMEOUT,
    );

    it(
      '[401] should reject unauthenticated requests',
      async () => {
        await request(app.getHttpServer())
          .get(`/api/announcements/${EXISTING_ANNOUNCEMENT_ID}`)
          .expect(401);
      },
      TEST_TIMEOUT,
    );
  });

  // ─── POST /announcements ────────────────────────────────────────────────

  describe('POST /announcements', () => {
    it(
      '[201] should create an announcement successfully',
      async () => {
        const res = await post('/api/announcements', adminToken, {
          title: 'E2E Test Announcement',
          content: 'E2E test content',
          target_role: 'ALL',
        });

        expect(res.status).toBe(201);
        expect(res.body).toHaveProperty('title', 'E2E Test Announcement');
      },
      TEST_TIMEOUT,
    );

    it(
      '[400] should reject empty body',
      async () => {
        await post('/api/announcements', adminToken, {}).expect(400);
      },
      TEST_TIMEOUT,
    );

    it(
      '[400] should reject missing required fields',
      async () => {
        await post('/api/announcements', adminToken, {
          title: 'Test',
        }).expect(400);
      },
      TEST_TIMEOUT,
    );

    it(
      '[400] should reject invalid target_role',
      async () => {
        await post('/api/announcements', adminToken, {
          title: 'Test',
          content: 'Test content',
          target_role: 'INVALID',
        }).expect(400);
      },
      TEST_TIMEOUT,
    );

    it(
      '[401] should reject unauthenticated requests',
      async () => {
        await request(app.getHttpServer())
          .post('/api/announcements')
          .send({
            title: 'Test',
            content: 'Test content',
            target_role: 'ALL',
          })
          .expect(401);
      },
      TEST_TIMEOUT,
    );

    it(
      '[403] should reject student role',
      async () => {
        await post('/api/announcements', studentToken, {
          title: 'Test',
          content: 'Test content',
          target_role: 'ALL',
        }).expect(403);
      },
      TEST_TIMEOUT,
    );
  });

  // ─── PUT /announcements/:id ─────────────────────────────────────────────

  describe('PUT /announcements/:id', () => {
    it(
      '[200] should update an announcement (admin)',
      async () => {
        const res = await put(
          `/api/announcements/${EXISTING_ANNOUNCEMENT_ID}`,
          adminToken,
          {
            title: 'Updated Title',
          },
        );

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('id', EXISTING_ANNOUNCEMENT_ID);
        expect(res.body).toHaveProperty('title', 'Updated Title');
      },
      TEST_TIMEOUT,
    );

    it(
      '[400] should reject invalid announcement id (non-numeric)',
      async () => {
        await put('/api/announcements/abc', adminToken, {
          title: 'Test',
        }).expect(400);
      },
      TEST_TIMEOUT,
    );

    it(
      '[404] should return 404 for non-existent announcement',
      async () => {
        await put(`/api/announcements/${NON_EXISTENT_ID}`, adminToken, {
          title: 'Test',
        }).expect(404);
      },
      TEST_TIMEOUT,
    );

    it(
      '[401] should reject unauthenticated requests',
      async () => {
        await request(app.getHttpServer())
          .put(`/api/announcements/${EXISTING_ANNOUNCEMENT_ID}`)
          .send({ title: 'Test' })
          .expect(401);
      },
      TEST_TIMEOUT,
    );

    it(
      '[403] should reject student role',
      async () => {
        await put(
          `/api/announcements/${EXISTING_ANNOUNCEMENT_ID}`,
          studentToken,
          { title: 'Test' },
        ).expect(403);
      },
      TEST_TIMEOUT,
    );
  });

  // ─── DELETE /announcements/:id ───────────────────────────────────────────

  describe('DELETE /announcements/:id', () => {
    it(
      '[400] should reject invalid announcement id (non-numeric)',
      async () => {
        await del('/api/announcements/abc', adminToken).expect(400);
      },
      TEST_TIMEOUT,
    );

    it(
      '[404] should return 404 for non-existent announcement',
      async () => {
        await del(`/api/announcements/${NON_EXISTENT_ID}`, adminToken).expect(
          404,
        );
      },
      TEST_TIMEOUT,
    );

    it(
      '[401] should reject unauthenticated requests',
      async () => {
        await request(app.getHttpServer())
          .delete(`/api/announcements/${EXISTING_ANNOUNCEMENT_ID}`)
          .expect(401);
      },
      TEST_TIMEOUT,
    );

    it(
      '[403] should reject student role',
      async () => {
        await del(
          `/api/announcements/${EXISTING_ANNOUNCEMENT_ID}`,
          studentToken,
        ).expect(403);
      },
      TEST_TIMEOUT,
    );
  });

  // ─── BUSINESS RULE TESTS ──────────────────────────────────────────────────

  describe('Business Rules', () => {
    it(
      '[BR-01] Validation errors returned properly',
      async () => {
        const res = await post('/api/announcements', adminToken, {
          title: '',
          target_role: 'INVALID',
        }).expect(400);

        expect(res.body).toHaveProperty('message');
      },
      TEST_TIMEOUT,
    );

    it(
      '[BR-02] Search functionality',
      async () => {
        const res = await get(
          '/api/announcements?search=thông báo',
          adminToken,
        ).expect(200);

        expect(res.body).toHaveProperty('data');
        expect(Array.isArray(res.body.data)).toBe(true);
      },
      TEST_TIMEOUT,
    );

    it(
      '[BR-03] Filter functionality',
      async () => {
        const res = await get(
          '/api/announcements?target_role=STUDENT&created_by=2',
          adminToken,
        ).expect(200);

        expect(res.body).toHaveProperty('data');
      },
      TEST_TIMEOUT,
    );

    it(
      '[BR-04] Pagination functionality',
      async () => {
        const res = await get(
          '/api/announcements?page=1&limit=2',
          adminToken,
        ).expect(200);

        expect(res.body.page).toBe(1);
        expect(res.body.limit).toBe(2);
        expect(res.body.data.length).toBeLessThanOrEqual(2);
        expect(res.body.total).toBeGreaterThanOrEqual(0);
        expect(res.body.totalPages).toBeGreaterThanOrEqual(0);
      },
      TEST_TIMEOUT,
    );

    it(
      '[BR-05] Empty search results handled gracefully',
      async () => {
        const res = await get(
          '/api/announcements?search=ZZZZNONEXISTENT',
          adminToken,
        ).expect(200);

        expect(res.body.data).toEqual([]);
        expect(res.body.total).toBe(0);
      },
      TEST_TIMEOUT,
    );

    it(
      '[BR-06] Very large page number handled gracefully',
      async () => {
        const res = await get(
          '/api/announcements?page=99999',
          adminToken,
        ).expect(200);

        expect(res.body.data).toEqual([]);
      },
      TEST_TIMEOUT,
    );
  });
});
