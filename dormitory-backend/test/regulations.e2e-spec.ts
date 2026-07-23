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

const EXISTING_REGULATION_ID = 1;
const NON_EXISTENT_ID = 9999;

describe('Regulations (e2e)', () => {
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

  // ─── GET /regulations ──────────────────────────────────────────────────

  describe('GET /regulations', () => {
    it(
      '[200] should return paginated regulations for admin',
      async () => {
        const res = await get('/api/regulations', adminToken).expect(200);

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
      '[200] should return regulations for manager',
      async () => {
        const res = await get('/api/regulations', managerToken).expect(200);

        expect(res.body).toHaveProperty('data');
        expect(Array.isArray(res.body.data)).toBe(true);
      },
      TEST_TIMEOUT,
    );

    it(
      '[200] should return regulations for student',
      async () => {
        const res = await get('/api/regulations', studentToken).expect(200);

        expect(res.body).toHaveProperty('data');
        expect(Array.isArray(res.body.data)).toBe(true);
      },
      TEST_TIMEOUT,
    );

    it(
      '[200] should support search query',
      async () => {
        const res = await get(
          '/api/regulations?search=nội quy',
          adminToken,
        ).expect(200);

        expect(res.body).toHaveProperty('data');
        expect(Array.isArray(res.body.data)).toBe(true);
      },
      TEST_TIMEOUT,
    );

    it(
      '[200] should support filter by created_by',
      async () => {
        const res = await get(
          '/api/regulations?created_by=1',
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
          '/api/regulations?page=1&limit=2',
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
          '/api/regulations?page=1&limit=5',
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
        await request(app.getHttpServer()).get('/api/regulations').expect(401);
      },
      TEST_TIMEOUT,
    );
  });

  // ─── GET /regulations/:id ──────────────────────────────────────────────

  describe('GET /regulations/:id', () => {
    it(
      '[200] should return a regulation by id for admin',
      async () => {
        const res = await get(
          `/api/regulations/${EXISTING_REGULATION_ID}`,
          adminToken,
        ).expect(200);

        expect(res.body).toHaveProperty('id', EXISTING_REGULATION_ID);
        expect(res.body).toHaveProperty('title');
        expect(res.body).toHaveProperty('content');
      },
      TEST_TIMEOUT,
    );

    it(
      '[400] should reject invalid regulation id (non-numeric)',
      async () => {
        const res = await get('/api/regulations/abc', adminToken).expect(400);

        expect(res.body.message).toContain('Invalid regulation id');
      },
      TEST_TIMEOUT,
    );

    it(
      '[404] should return 404 for non-existent regulation',
      async () => {
        await get(`/api/regulations/${NON_EXISTENT_ID}`, adminToken).expect(
          404,
        );
      },
      TEST_TIMEOUT,
    );

    it(
      '[401] should reject unauthenticated requests',
      async () => {
        await request(app.getHttpServer())
          .get(`/api/regulations/${EXISTING_REGULATION_ID}`)
          .expect(401);
      },
      TEST_TIMEOUT,
    );
  });

  // ─── POST /regulations ────────────────────────────────────────────────

  describe('POST /regulations', () => {
    it(
      '[201] should create a regulation successfully',
      async () => {
        const res = await post('/api/regulations', adminToken, {
          title: 'E2E Test Regulation',
          content: 'E2E test content',
        });

        expect(res.status).toBe(201);
        expect(res.body).toHaveProperty('title', 'E2E Test Regulation');

        // Cleanup
        if (res.body.id) {
          await del(`/api/regulations/${res.body.id}`, adminToken);
        }
      },
      TEST_TIMEOUT,
    );

    it(
      '[400] should reject empty body',
      async () => {
        await post('/api/regulations', adminToken, {}).expect(400);
      },
      TEST_TIMEOUT,
    );

    it(
      '[400] should reject missing required fields',
      async () => {
        await post('/api/regulations', adminToken, {
          title: 'Test',
        }).expect(400);
      },
      TEST_TIMEOUT,
    );

    it(
      '[401] should reject unauthenticated requests',
      async () => {
        await request(app.getHttpServer())
          .post('/api/regulations')
          .send({
            title: 'Test',
            content: 'Test content',
          })
          .expect(401);
      },
      TEST_TIMEOUT,
    );

    it(
      '[403] should reject manager role from creating',
      async () => {
        await post('/api/regulations', managerToken, {
          title: 'Test',
          content: 'Test content',
        }).expect(403);
      },
      TEST_TIMEOUT,
    );

    it(
      '[403] should reject student role from creating',
      async () => {
        await post('/api/regulations', studentToken, {
          title: 'Test',
          content: 'Test content',
        }).expect(403);
      },
      TEST_TIMEOUT,
    );
  });

  // ─── PUT /regulations/:id ─────────────────────────────────────────────

  describe('PUT /regulations/:id', () => {
    it(
      '[200] should update a regulation (admin)',
      async () => {
        // First create a regulation to update
        const createRes = await post('/api/regulations', adminToken, {
          title: 'Update Test Regulation',
          content: 'Update test content',
        });
        expect(createRes.status).toBe(201);

        const res = await put(
          `/api/regulations/${createRes.body.id}`,
          adminToken,
          {
            title: 'Updated Title E2E',
          },
        );

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('id', createRes.body.id);
        expect(res.body).toHaveProperty('title', 'Updated Title E2E');

        // Cleanup
        await del(`/api/regulations/${createRes.body.id}`, adminToken);
      },
      TEST_TIMEOUT,
    );

    it(
      '[400] should reject invalid regulation id (non-numeric)',
      async () => {
        await put('/api/regulations/abc', adminToken, {
          title: 'Test',
        }).expect(400);
      },
      TEST_TIMEOUT,
    );

    it(
      '[404] should return 404 for non-existent regulation',
      async () => {
        await put(`/api/regulations/${NON_EXISTENT_ID}`, adminToken, {
          title: 'Test',
        }).expect(404);
      },
      TEST_TIMEOUT,
    );

    it(
      '[401] should reject unauthenticated requests',
      async () => {
        await request(app.getHttpServer())
          .put(`/api/regulations/${EXISTING_REGULATION_ID}`)
          .send({ title: 'Test' })
          .expect(401);
      },
      TEST_TIMEOUT,
    );

    it(
      '[403] should reject manager role from updating',
      async () => {
        await put(`/api/regulations/${EXISTING_REGULATION_ID}`, managerToken, {
          title: 'Test',
        }).expect(403);
      },
      TEST_TIMEOUT,
    );

    it(
      '[403] should reject student role from updating',
      async () => {
        await put(`/api/regulations/${EXISTING_REGULATION_ID}`, studentToken, {
          title: 'Test',
        }).expect(403);
      },
      TEST_TIMEOUT,
    );
  });

  // ─── DELETE /regulations/:id ───────────────────────────────────────────

  describe('DELETE /regulations/:id', () => {
    it(
      '[200] should delete a regulation (admin)',
      async () => {
        // First create a regulation to delete
        const createRes = await post('/api/regulations', adminToken, {
          title: 'Delete Test Regulation',
          content: 'Delete test content',
        });
        expect(createRes.status).toBe(201);

        await del(`/api/regulations/${createRes.body.id}`, adminToken).expect(
          200,
        );
      },
      TEST_TIMEOUT,
    );

    it(
      '[400] should reject invalid regulation id (non-numeric)',
      async () => {
        await del('/api/regulations/abc', adminToken).expect(400);
      },
      TEST_TIMEOUT,
    );

    it(
      '[404] should return 404 for non-existent regulation',
      async () => {
        await del(`/api/regulations/${NON_EXISTENT_ID}`, adminToken).expect(
          404,
        );
      },
      TEST_TIMEOUT,
    );

    it(
      '[401] should reject unauthenticated requests',
      async () => {
        await request(app.getHttpServer())
          .delete(`/api/regulations/${EXISTING_REGULATION_ID}`)
          .expect(401);
      },
      TEST_TIMEOUT,
    );

    it(
      '[403] should reject manager role from deleting',
      async () => {
        await del(
          `/api/regulations/${EXISTING_REGULATION_ID}`,
          managerToken,
        ).expect(403);
      },
      TEST_TIMEOUT,
    );

    it(
      '[403] should reject student role from deleting',
      async () => {
        await del(
          `/api/regulations/${EXISTING_REGULATION_ID}`,
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
        const res = await post('/api/regulations', adminToken, {
          title: '',
        }).expect(400);

        expect(res.body).toHaveProperty('message');
      },
      TEST_TIMEOUT,
    );

    it(
      '[BR-02] Search functionality',
      async () => {
        const res = await get(
          '/api/regulations?search=nội quy',
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
          '/api/regulations?created_by=1',
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
          '/api/regulations?page=1&limit=2',
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
          '/api/regulations?search=ZZZZNONEXISTENT',
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
        const res = await get('/api/regulations?page=99999', adminToken).expect(
          200,
        );

        expect(res.body.data).toEqual([]);
      },
      TEST_TIMEOUT,
    );
  });
});
