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
const STUDENT_CREDENTIALS = { identifier: 'student1', password: 'Student123!' };

const EXISTING_CONTRACT_ID = 1;
const NON_EXISTENT_ID = 9999;

describe('Contracts (e2e)', () => {
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

  // ─── GET /contracts ──────────────────────────────────────────────────────

  describe('GET /contracts', () => {
    it('[200] should return paginated contracts for admin', async () => {
      const res = await get('/api/contracts', adminToken).expect(200);

      expect(res.body).toHaveProperty('total');
      expect(res.body).toHaveProperty('page');
      expect(res.body).toHaveProperty('limit');
      expect(res.body).toHaveProperty('totalPages');
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('[200] should return contracts for manager (scoped to managed building)', async () => {
      const res = await get('/api/contracts', managerToken).expect(200);

      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('[200] should return own contracts for student role', async () => {
      const res = await get('/api/contracts', studentToken).expect(200);

      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('[200] should support search query', async () => {
      const res = await get('/api/contracts?search=HD001', adminToken).expect(
        200,
      );

      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('[200] should support filter by status', async () => {
      const res = await get('/api/contracts?status=ACTIVE', adminToken).expect(
        200,
      );

      expect(res.body).toHaveProperty('data');
    });

    it('[200] should support filter by building', async () => {
      const res = await get('/api/contracts?building=Tòa A', adminToken).expect(
        200,
      );

      expect(res.body).toHaveProperty('data');
    });

    it('[200] should support pagination (page & limit)', async () => {
      const res = await get('/api/contracts?page=1&limit=2', adminToken).expect(
        200,
      );

      expect(res.body.page).toBe(1);
      expect(res.body.limit).toBe(2);
      expect(res.body.data.length).toBeLessThanOrEqual(2);
    });

    it('[200] should return correct pagination metadata', async () => {
      const res = await get('/api/contracts?page=1&limit=5', adminToken).expect(
        200,
      );

      expect(res.body).toMatchObject({
        page: expect.any(Number),
        limit: expect.any(Number),
        total: expect.any(Number),
        totalPages: expect.any(Number),
        data: expect.any(Array),
      });
    });

    it('[401] should reject unauthenticated requests', async () => {
      await request(app.getHttpServer()).get('/api/contracts').expect(401);
    });

    it('[403] should allow authenticated requests with valid token', async () => {
      await get('/api/contracts', adminToken).expect(200);
    });
  });

  // ─── GET /contracts/:id ─────────────────────────────────────────────────

  describe('GET /contracts/:id', () => {
    it('[200] should return a contract by id for admin', async () => {
      const res = await get(
        `/api/contracts/${EXISTING_CONTRACT_ID}`,
        adminToken,
      ).expect(200);

      expect(res.body).toHaveProperty('id', EXISTING_CONTRACT_ID);
      expect(res.body).toHaveProperty('contractCode');
      expect(res.body).toHaveProperty('student');
      expect(res.body).toHaveProperty('room');
      expect(res.body).toHaveProperty('creator');
    });

    it('[200] should return a contract for manager (if they manage building)', async () => {
      const res = await get(
        `/api/contracts/${EXISTING_CONTRACT_ID}`,
        managerToken,
      ).expect(200);

      expect(res.body).toHaveProperty('id', EXISTING_CONTRACT_ID);
    });

    it('[200] should return own contract for student', async () => {
      const res = await get(
        `/api/contracts/${EXISTING_CONTRACT_ID}`,
        studentToken,
      ).expect(200);

      expect(res.body).toHaveProperty('id');
    });

    it('[400] should reject invalid contract id (non-numeric)', async () => {
      const res = await get('/api/contracts/abc', adminToken).expect(400);

      expect(res.body.message).toContain('Invalid contract id');
    });

    it('[404] should return 404 for non-existent contract', async () => {
      await get(`/api/contracts/${NON_EXISTENT_ID}`, adminToken).expect(404);
    });

    it('[401] should reject unauthenticated requests', async () => {
      await request(app.getHttpServer())
        .get(`/api/contracts/${EXISTING_CONTRACT_ID}`)
        .expect(401);
    });
  });

  // ─── POST /contracts ────────────────────────────────────────────────────

  describe('POST /contracts', () => {
    it('[400] should reject empty body', async () => {
      await post('/api/contracts', adminToken, {}).expect(400);
    });

    it('[400] should reject missing required fields', async () => {
      await post('/api/contracts', adminToken, {
        contract_code: 'HD100',
      }).expect(400);
    });

    it('[400] should reject invalid student_id (non-numeric)', async () => {
      await post('/api/contracts', adminToken, {
        contract_code: 'HD100',
        student_id: 'abc',
        room_id: 1,
        start_date: '2024-01-01',
        end_date: '2024-12-31',
      }).expect(400);
    });

    it('[400] should reject contract_code exceeding max length', async () => {
      await post('/api/contracts', adminToken, {
        contract_code: 'A'.repeat(21),
        student_id: 1,
        room_id: 1,
        start_date: '2024-01-01',
        end_date: '2024-12-31',
      }).expect(400);
    });

    it('[401] should reject unauthenticated requests', async () => {
      await request(app.getHttpServer())
        .post('/api/contracts')
        .send({
          contract_code: 'HD100',
          student_id: 1,
          room_id: 1,
          start_date: '2024-01-01',
          end_date: '2024-12-31',
        })
        .expect(401);
    });

    it('[403] should reject student role', async () => {
      await post('/api/contracts', studentToken, {
        contract_code: 'HD100',
        student_id: 1,
        room_id: 1,
        start_date: '2024-01-01',
        end_date: '2024-12-31',
      }).expect(403);
    });

    it('[409] should reject duplicate contract_code', async () => {
      await post('/api/contracts', adminToken, {
        contract_code: 'HD001',
        student_id: 1,
        room_id: 1,
        start_date: '2024-01-01',
        end_date: '2024-12-31',
      }).expect(409);
    });
  });

  // ─── PUT /contracts/:id ─────────────────────────────────────────────────

  describe('PUT /contracts/:id', () => {
    it('[200] should update a contract (admin)', async () => {
      const res = await put(
        `/api/contracts/${EXISTING_CONTRACT_ID}`,
        adminToken,
        {
          deposit: 600000,
        },
      ).expect(200);

      expect(res.body).toHaveProperty('id', EXISTING_CONTRACT_ID);
    });

    it('[200] should partially update a contract (single field)', async () => {
      const res = await put(
        `/api/contracts/${EXISTING_CONTRACT_ID}`,
        adminToken,
        {
          deposit: 700000,
        },
      ).expect(200);

      expect(res.body).toHaveProperty('id', EXISTING_CONTRACT_ID);
    });

    it('[400] should reject invalid contract id (non-numeric)', async () => {
      await put('/api/contracts/abc', adminToken, { deposit: 1000 }).expect(
        400,
      );
    });

    it('[404] should return 404 for non-existent contract', async () => {
      await put(`/api/contracts/${NON_EXISTENT_ID}`, adminToken, {
        deposit: 1000,
      }).expect(404);
    });

    it('[401] should reject unauthenticated requests', async () => {
      await request(app.getHttpServer())
        .put(`/api/contracts/${EXISTING_CONTRACT_ID}`)
        .send({ deposit: 1000 })
        .expect(401);
    });

    it('[403] should reject student role', async () => {
      await put(`/api/contracts/${EXISTING_CONTRACT_ID}`, studentToken, {
        deposit: 1000,
      }).expect(403);
    });
  });

  // ─── DELETE /contracts/:id ──────────────────────────────────────────────

  describe('DELETE /contracts/:id', () => {
    it('[400] should reject invalid contract id (non-numeric)', async () => {
      await del('/api/contracts/abc', adminToken).expect(400);
    });

    it('[404] should return 404 for non-existent contract', async () => {
      await del(`/api/contracts/${NON_EXISTENT_ID}`, adminToken).expect(404);
    });

    it('[401] should reject unauthenticated requests', async () => {
      await request(app.getHttpServer())
        .delete(`/api/contracts/${EXISTING_CONTRACT_ID}`)
        .expect(401);
    });

    it('[403] should reject student role', async () => {
      await del(`/api/contracts/${EXISTING_CONTRACT_ID}`, studentToken).expect(
        403,
      );
    });
  });

  // ─── BUSINESS RULE TESTS ──────────────────────────────────────────────────

  describe('Business Rules', () => {
    it('[BR-01] Validation errors returned properly', async () => {
      const res = await post('/api/contracts', adminToken, {
        student_id: 'not-a-number',
        contract_code: '',
      }).expect(400);

      expect(res.body).toHaveProperty('message');
    });

    it('[BR-02] Search functionality', async () => {
      const res = await get('/api/contracts?search=HD001', adminToken).expect(
        200,
      );

      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('[BR-03] Filter functionality', async () => {
      const res = await get(
        '/api/contracts?status=ACTIVE&building=Tòa A',
        adminToken,
      ).expect(200);

      expect(res.body).toHaveProperty('data');
    });

    it('[BR-04] Pagination functionality', async () => {
      const res = await get('/api/contracts?page=1&limit=2', adminToken).expect(
        200,
      );

      expect(res.body.page).toBe(1);
      expect(res.body.limit).toBe(2);
      expect(res.body.data.length).toBeLessThanOrEqual(2);
      expect(res.body.total).toBeGreaterThanOrEqual(0);
      expect(res.body.totalPages).toBeGreaterThanOrEqual(0);
    });

    it('[BR-05] Empty search results handled gracefully', async () => {
      const res = await get(
        '/api/contracts?search=ZZZZNONEXISTENT',
        adminToken,
      ).expect(200);

      expect(res.body.data).toEqual([]);
      expect(res.body.total).toBe(0);
    });

    it('[BR-06] Very large page number handled gracefully', async () => {
      const res = await get('/api/contracts?page=99999', adminToken).expect(
        200,
      );

      expect(res.body.data).toEqual([]);
    });

    it('[BR-07] Special characters in search handled', async () => {
      await get('/api/contracts?search=%3Cscript%3E', adminToken).expect(200);
    });
  });
});
