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

const EXISTING_BILL_ID = 1;
const NON_EXISTENT_ID = 9999;

describe('UtilityBills (e2e)', () => {
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

  // ─── GET /utility-bills ──────────────────────────────────────────────────

  describe('GET /utility-bills', () => {
    it('[200] should return paginated bills for admin', async () => {
      const res = await get('/api/utility-bills', adminToken).expect(200);

      expect(res.body).toHaveProperty('total');
      expect(res.body).toHaveProperty('page');
      expect(res.body).toHaveProperty('limit');
      expect(res.body).toHaveProperty('totalPages');
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('[200] should return bills for manager (scoped to managed building)', async () => {
      const res = await get('/api/utility-bills', managerToken).expect(200);

      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('[200] should return own bills for student role', async () => {
      const res = await get('/api/utility-bills', studentToken).expect(200);

      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('[200] should support search query', async () => {
      const res = await get(
        '/api/utility-bills?search=A101',
        adminToken,
      ).expect(200);

      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('[200] should support filter by status', async () => {
      const res = await get(
        '/api/utility-bills?status=DRAFT',
        adminToken,
      ).expect(200);

      expect(res.body).toHaveProperty('data');
    });

    it('[200] should support filter by month/year', async () => {
      const res = await get(
        '/api/utility-bills?month=7&year=2026',
        adminToken,
      ).expect(200);

      expect(res.body).toHaveProperty('data');
    });

    it('[200] should support pagination (page & limit)', async () => {
      const res = await get(
        '/api/utility-bills?page=1&limit=2',
        adminToken,
      ).expect(200);

      expect(res.body.page).toBe(1);
      expect(res.body.limit).toBe(2);
      expect(res.body.data.length).toBeLessThanOrEqual(2);
    });

    it('[200] should return correct pagination metadata', async () => {
      const res = await get(
        '/api/utility-bills?page=1&limit=5',
        adminToken,
      ).expect(200);

      expect(res.body).toMatchObject({
        page: expect.any(Number),
        limit: expect.any(Number),
        total: expect.any(Number),
        totalPages: expect.any(Number),
        data: expect.any(Array),
      });
    });

    it('[401] should reject unauthenticated requests', async () => {
      await request(app.getHttpServer()).get('/api/utility-bills').expect(401);
    });

    it('[403] should allow authenticated requests with valid token', async () => {
      await get('/api/utility-bills', adminToken).expect(200);
    });
  });

  // ─── GET /utility-bills/:id ─────────────────────────────────────────────

  describe('GET /utility-bills/:id', () => {
    it('[200] should return a bill by id for admin', async () => {
      const res = await get(
        `/api/utility-bills/${EXISTING_BILL_ID}`,
        adminToken,
      ).expect(200);

      expect(res.body).toHaveProperty('id', EXISTING_BILL_ID);
      expect(res.body).toHaveProperty('month');
      expect(res.body).toHaveProperty('year');
      expect(res.body).toHaveProperty('room');
      expect(res.body).toHaveProperty('creator');
    });

    it('[200] should return a bill for manager (if they manage building)', async () => {
      const res = await get(
        `/api/utility-bills/${EXISTING_BILL_ID}`,
        managerToken,
      ).expect(200);

      expect(res.body).toHaveProperty('id', EXISTING_BILL_ID);
    });

    it('[200] should return own bill for student', async () => {
      const res = await get(
        `/api/utility-bills/${EXISTING_BILL_ID}`,
        studentToken,
      ).expect(200);

      expect(res.body).toHaveProperty('id');
    });

    it('[400] should reject invalid bill id (non-numeric)', async () => {
      const res = await get('/api/utility-bills/abc', adminToken).expect(400);

      expect(res.body.message).toContain('Invalid utility bill id');
    });

    it('[404] should return 404 for non-existent bill', async () => {
      await get(`/api/utility-bills/${NON_EXISTENT_ID}`, adminToken).expect(
        404,
      );
    });

    it('[401] should reject unauthenticated requests', async () => {
      await request(app.getHttpServer())
        .get(`/api/utility-bills/${EXISTING_BILL_ID}`)
        .expect(401);
    });
  });

  // ─── POST /utility-bills ────────────────────────────────────────────────

  describe('POST /utility-bills', () => {
    it('[400] should reject empty body', async () => {
      await post('/api/utility-bills', adminToken, {}).expect(400);
    });

    it('[400] should reject missing required fields', async () => {
      await post('/api/utility-bills', adminToken, {
        room_id: 1,
      }).expect(400);
    });

    it('[400] should reject invalid room_id (non-numeric)', async () => {
      await post('/api/utility-bills', adminToken, {
        room_id: 'abc',
        month: 8,
        year: 2026,
        electric_old: 0,
        electric_new: 100,
        water_old: 0,
        water_new: 10,
      }).expect(400);
    });

    it('[400] should reject invalid month ( > 12)', async () => {
      await post('/api/utility-bills', adminToken, {
        room_id: 1,
        month: 13,
        year: 2026,
        electric_old: 0,
        electric_new: 100,
        water_old: 0,
        water_new: 10,
      }).expect(400);
    });

    it('[401] should reject unauthenticated requests', async () => {
      await request(app.getHttpServer())
        .post('/api/utility-bills')
        .send({
          room_id: 1,
          month: 8,
          year: 2026,
          electric_old: 0,
          electric_new: 100,
          water_old: 0,
          water_new: 10,
        })
        .expect(401);
    });

    it('[403] should reject student role', async () => {
      await post('/api/utility-bills', studentToken, {
        room_id: 1,
        month: 8,
        year: 2026,
        electric_old: 0,
        electric_new: 100,
        water_old: 0,
        water_new: 10,
      }).expect(403);
    });

    it('[409] should reject duplicate room/month/year', async () => {
      await post('/api/utility-bills', adminToken, {
        room_id: 1,
        month: 7,
        year: 2026,
        electric_old: 1000,
        electric_new: 1100,
        water_old: 500,
        water_new: 520,
      }).expect(409);
    });
  });

  // ─── PUT /utility-bills/:id ─────────────────────────────────────────────

  describe('PUT /utility-bills/:id', () => {
    it('[200] should update a bill (admin)', async () => {
      const res = await put(
        `/api/utility-bills/${EXISTING_BILL_ID}`,
        adminToken,
        {
          electric_fee: 200000,
        },
      ).expect(200);

      expect(res.body).toHaveProperty('id', EXISTING_BILL_ID);
    });

    it('[200] should partially update a bill (single field)', async () => {
      const res = await put(
        `/api/utility-bills/${EXISTING_BILL_ID}`,
        adminToken,
        {
          electric_fee: 180000,
        },
      ).expect(200);

      expect(res.body).toHaveProperty('id', EXISTING_BILL_ID);
    });

    it('[400] should reject invalid bill id (non-numeric)', async () => {
      await put('/api/utility-bills/abc', adminToken, {
        electric_fee: 1000,
      }).expect(400);
    });

    it('[404] should return 404 for non-existent bill', async () => {
      await put(`/api/utility-bills/${NON_EXISTENT_ID}`, adminToken, {
        electric_fee: 1000,
      }).expect(404);
    });

    it('[401] should reject unauthenticated requests', async () => {
      await request(app.getHttpServer())
        .put(`/api/utility-bills/${EXISTING_BILL_ID}`)
        .send({ electric_fee: 1000 })
        .expect(401);
    });

    it('[403] should reject student role', async () => {
      await put(`/api/utility-bills/${EXISTING_BILL_ID}`, studentToken, {
        electric_fee: 1000,
      }).expect(403);
    });
  });

  // ─── DELETE /utility-bills/:id ──────────────────────────────────────────

  describe('DELETE /utility-bills/:id', () => {
    it('[400] should reject invalid bill id (non-numeric)', async () => {
      await del('/api/utility-bills/abc', adminToken).expect(400);
    });

    it('[404] should return 404 for non-existent bill', async () => {
      await del(`/api/utility-bills/${NON_EXISTENT_ID}`, adminToken).expect(
        404,
      );
    });

    it('[401] should reject unauthenticated requests', async () => {
      await request(app.getHttpServer())
        .delete(`/api/utility-bills/${EXISTING_BILL_ID}`)
        .expect(401);
    });

    it('[403] should reject student role', async () => {
      await del(`/api/utility-bills/${EXISTING_BILL_ID}`, studentToken).expect(
        403,
      );
    });

    it('[403] should reject manager role', async () => {
      await del(`/api/utility-bills/${EXISTING_BILL_ID}`, managerToken).expect(
        403,
      );
    });
  });

  // ─── BUSINESS RULE TESTS ──────────────────────────────────────────────────

  describe('Business Rules', () => {
    it('[BR-01] Validation errors returned properly', async () => {
      const res = await post('/api/utility-bills', adminToken, {
        room_id: 'not-a-number',
        month: '',
      }).expect(400);

      expect(res.body).toHaveProperty('message');
    });

    it('[BR-02] Search functionality', async () => {
      const res = await get(
        '/api/utility-bills?search=A101',
        adminToken,
      ).expect(200);

      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('[BR-03] Filter functionality', async () => {
      const res = await get(
        '/api/utility-bills?month=7&year=2026&status=DRAFT',
        adminToken,
      ).expect(200);

      expect(res.body).toHaveProperty('data');
    });

    it('[BR-04] Pagination functionality', async () => {
      const res = await get(
        '/api/utility-bills?page=1&limit=2',
        adminToken,
      ).expect(200);

      expect(res.body.page).toBe(1);
      expect(res.body.limit).toBe(2);
      expect(res.body.data.length).toBeLessThanOrEqual(2);
      expect(res.body.total).toBeGreaterThanOrEqual(0);
      expect(res.body.totalPages).toBeGreaterThanOrEqual(0);
    });

    it('[BR-05] Empty search results handled gracefully', async () => {
      const res = await get(
        '/api/utility-bills?search=ZZZZNONEXISTENT',
        adminToken,
      ).expect(200);

      expect(res.body.data).toEqual([]);
      expect(res.body.total).toBe(0);
    });

    it('[BR-06] Very large page number handled gracefully', async () => {
      const res = await get('/api/utility-bills?page=99999', adminToken).expect(
        200,
      );

      expect(res.body.data).toEqual([]);
    });

    it('[BR-07] Special characters in search handled', async () => {
      await get('/api/utility-bills?search=%3Cscript%3E', adminToken).expect(
        200,
      );
    });
  });
});
