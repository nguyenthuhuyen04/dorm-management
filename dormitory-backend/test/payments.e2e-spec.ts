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

const EXISTING_PAYMENT_ID = 1;
const NON_EXISTENT_ID = 9999;

describe('Payments (e2e)', () => {
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

  // ─── GET /payments ──────────────────────────────────────────────────────

  describe('GET /payments', () => {
    it('[200] should return paginated payments for admin', async () => {
      const res = await get('/api/payments', adminToken).expect(200);

      expect(res.body).toHaveProperty('total');
      expect(res.body).toHaveProperty('page');
      expect(res.body).toHaveProperty('limit');
      expect(res.body).toHaveProperty('totalPages');
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('[200] should return payments for manager (scoped to managed building)', async () => {
      const res = await get('/api/payments', managerToken).expect(200);

      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('[200] should return own payments for student role', async () => {
      const res = await get('/api/payments', studentToken).expect(200);

      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('[200] should support search query', async () => {
      const res = await get('/api/payments?search=INV001', adminToken).expect(
        200,
      );

      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('[200] should support filter by status', async () => {
      const res = await get('/api/payments?status=UNPAID', adminToken).expect(
        200,
      );

      expect(res.body).toHaveProperty('data');
    });

    it('[200] should support filter by month and year', async () => {
      const res = await get(
        '/api/payments?month=7&year=2026',
        adminToken,
      ).expect(200);

      expect(res.body).toHaveProperty('data');
    });

    it('[200] should support pagination (page & limit)', async () => {
      const res = await get('/api/payments?page=1&limit=2', adminToken).expect(
        200,
      );

      expect(res.body.page).toBe(1);
      expect(res.body.limit).toBe(2);
      expect(res.body.data.length).toBeLessThanOrEqual(2);
    });

    it('[200] should return correct pagination metadata', async () => {
      const res = await get('/api/payments?page=1&limit=5', adminToken).expect(
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
      await request(app.getHttpServer()).get('/api/payments').expect(401);
    });
  });

  // ─── GET /payments/:id ─────────────────────────────────────────────────

  describe('GET /payments/:id', () => {
    it('[200] should return a payment by id for admin', async () => {
      const res = await get(
        `/api/payments/${EXISTING_PAYMENT_ID}`,
        adminToken,
      ).expect(200);

      expect(res.body).toHaveProperty('id', EXISTING_PAYMENT_ID);
      expect(res.body).toHaveProperty('invoiceCode');
      expect(res.body).toHaveProperty('status');
    });

    it('[200] should return own payment for student', async () => {
      const res = await get(
        `/api/payments/${EXISTING_PAYMENT_ID}`,
        studentToken,
      ).expect(200);

      expect(res.body).toHaveProperty('id');
    });

    it('[400] should reject invalid payment id (non-numeric)', async () => {
      const res = await get('/api/payments/abc', adminToken).expect(400);

      expect(res.body.message).toContain('Invalid payment id');
    });

    it('[404] should return 404 for non-existent payment', async () => {
      await get(`/api/payments/${NON_EXISTENT_ID}`, adminToken).expect(404);
    });

    it('[401] should reject unauthenticated requests', async () => {
      await request(app.getHttpServer())
        .get(`/api/payments/${EXISTING_PAYMENT_ID}`)
        .expect(401);
    });
  });

  // ─── POST /payments ────────────────────────────────────────────────────

  describe('POST /payments', () => {
    it('[201] should create a payment successfully', async () => {
      const uniqueInvoiceCode = `INV-E2E-${Date.now().toString().slice(-7)}-${Math.floor(Math.random() * 100)}`;
      const res = await post('/api/payments', adminToken, {
        invoice_code: uniqueInvoiceCode,
        student_id: 1,
        contract_id: 1,
        utility_bill_id: 1,
        month: 7,
        year: 2026,
        room_fee: 600000,
        electric_fee: 175000,
        water_fee: 50000,
        other_fee: 0,
        total_amount: 825000,
        due_date: '2026-07-20',
      });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('invoiceCode', uniqueInvoiceCode);
    });

    it('[400] should reject empty body', async () => {
      await post('/api/payments', adminToken, {}).expect(400);
    });

    it('[400] should reject missing required fields', async () => {
      await post('/api/payments', adminToken, { invoice_code: 'TEST' }).expect(
        400,
      );
    });

    it('[400] should reject invalid month', async () => {
      await post('/api/payments', adminToken, {
        invoice_code: 'INV-BAD',
        student_id: 1,
        contract_id: 1,
        utility_bill_id: 1,
        month: 13,
        year: 2026,
        room_fee: 600000,
        electric_fee: 0,
        water_fee: 0,
        other_fee: 0,
        total_amount: 600000,
        due_date: '2026-07-20',
      }).expect(400);
    });

    it('[401] should reject unauthenticated requests', async () => {
      await request(app.getHttpServer())
        .post('/api/payments')
        .send({
          invoice_code: 'INV-UNAUTH',
          student_id: 1,
          contract_id: 1,
          utility_bill_id: 1,
          month: 7,
          year: 2026,
          room_fee: 600000,
          electric_fee: 0,
          water_fee: 0,
          other_fee: 0,
          total_amount: 600000,
          due_date: '2026-07-20',
        })
        .expect(401);
    });

    it('[403] should reject student role', async () => {
      await post('/api/payments', studentToken, {
        invoice_code: 'INV-STUDENT',
        student_id: 1,
        contract_id: 1,
        utility_bill_id: 1,
        month: 7,
        year: 2026,
        room_fee: 600000,
        electric_fee: 0,
        water_fee: 0,
        other_fee: 0,
        total_amount: 600000,
        due_date: '2026-07-20',
      }).expect(403);
    });
  });

  // ─── PUT /payments/:id ─────────────────────────────────────────────────

  describe('PUT /payments/:id', () => {
    it('[200] should update a payment (admin)', async () => {
      const res = await put(
        `/api/payments/${EXISTING_PAYMENT_ID}`,
        adminToken,
        {
          room_fee: 650000,
        },
      );

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('id', EXISTING_PAYMENT_ID);
    });

    it('[400] should reject invalid payment id (non-numeric)', async () => {
      await put('/api/payments/abc', adminToken, { room_fee: 1000 }).expect(
        400,
      );
    });

    it('[404] should return 404 for non-existent payment', async () => {
      await put(`/api/payments/${NON_EXISTENT_ID}`, adminToken, {
        room_fee: 1000,
      }).expect(404);
    });

    it('[401] should reject unauthenticated requests', async () => {
      await request(app.getHttpServer())
        .put(`/api/payments/${EXISTING_PAYMENT_ID}`)
        .send({ room_fee: 1000 })
        .expect(401);
    });

    it('[403] should reject student role', async () => {
      await put(`/api/payments/${EXISTING_PAYMENT_ID}`, studentToken, {
        room_fee: 1000,
      }).expect(403);
    });
  });

  // ─── DELETE /payments/:id ──────────────────────────────────────────────

  describe('DELETE /payments/:id', () => {
    it('[400] should reject invalid payment id (non-numeric)', async () => {
      await del('/api/payments/abc', adminToken).expect(400);
    });

    it('[404] should return 404 for non-existent payment', async () => {
      await del(`/api/payments/${NON_EXISTENT_ID}`, adminToken).expect(404);
    });

    it('[401] should reject unauthenticated requests', async () => {
      await request(app.getHttpServer())
        .delete(`/api/payments/${EXISTING_PAYMENT_ID}`)
        .expect(401);
    });

    it('[403] should reject student role', async () => {
      await del(`/api/payments/${EXISTING_PAYMENT_ID}`, studentToken).expect(
        403,
      );
    });
  });

  // ─── BUSINESS RULE TESTS ──────────────────────────────────────────────────

  describe('Business Rules', () => {
    it('[BR-01] Validation errors returned properly', async () => {
      const res = await post('/api/payments', adminToken, {
        student_id: 'not-a-number',
        invoice_code: '',
      }).expect(400);

      expect(res.body).toHaveProperty('message');
    });

    it('[BR-02] Search functionality', async () => {
      const res = await get('/api/payments?search=INV001', adminToken).expect(
        200,
      );

      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('[BR-03] Filter functionality', async () => {
      const res = await get(
        '/api/payments?status=UNPAID&month=7',
        adminToken,
      ).expect(200);

      expect(res.body).toHaveProperty('data');
    });

    it('[BR-04] Pagination functionality', async () => {
      const res = await get('/api/payments?page=1&limit=2', adminToken).expect(
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
        '/api/payments?search=ZZZZNONEXISTENT',
        adminToken,
      ).expect(200);

      expect(res.body.data).toEqual([]);
      expect(res.body.total).toBe(0);
    });

    it('[BR-06] Very large page number handled gracefully', async () => {
      const res = await get('/api/payments?page=99999', adminToken).expect(200);

      expect(res.body.data).toEqual([]);
    });
  });
});
