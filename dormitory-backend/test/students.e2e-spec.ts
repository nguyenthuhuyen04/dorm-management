import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from './../src/app.module';
import cookieParser from 'cookie-parser';
import session from 'express-session';

/**
 * Students E2E Tests
 * ===================
 * Tests all Students API endpoints and business rules.
 *
 * Prerequisites:
 * - MySQL database must be running with proper schema (run database/quan_ly_ky_tuc_xa.sql)
 * - Environment variables must be set (DB_HOST, DB_PORT, DB_USERNAME, DB_PASSWORD, DB_NAME)
 *
 * Test accounts needed (pre-seeded in database):
 * - Admin: admin / Admin123!
 * - Manager: manager1 / Manager123! (manages building ID 1)
 * - Student: student1 / Student123! (has active contract in room ID 1, student record ID 1)
 */

const TEST_TIMEOUT = 30000;

// Pre-seeded test credentials
const ADMIN_CREDENTIALS = { identifier: 'admin', password: 'Admin123!' };
const MANAGER_CREDENTIALS = { identifier: 'manager1', password: 'Manager123!' };
const STUDENT_CREDENTIALS = { identifier: 'student1', password: 'Student123!' };

const EXISTING_STUDENT_ID = 1;
const EXISTING_USER_ID_FOR_STUDENT = 3;
const NON_EXISTENT_ID = 9999;

describe('Students (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  let adminToken: string;
  let managerToken: string;
  let studentToken: string;

  // ─── Test Setup ─────────────────────────────────────────────────────────────

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    dataSource = app.get(DataSource);

    // Apply global configuration matching main.ts
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

    // Login as different users to obtain tokens
    adminToken = await loginAndGetToken(ADMIN_CREDENTIALS);
    managerToken = await loginAndGetToken(MANAGER_CREDENTIALS);
    studentToken = await loginAndGetToken(STUDENT_CREDENTIALS);
  }, TEST_TIMEOUT);

  afterAll(async () => {
    await app.close();
  });

  // ─── Helper Functions ───────────────────────────────────────────────────────

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

  // ─── API TEST: GET /students ──────────────────────────────────────────────

  describe('GET /students', () => {
    it('[200] should return paginated students for admin', async () => {
      const res = await get('/api/students', adminToken).expect(200);

      expect(res.body).toHaveProperty('total');
      expect(res.body).toHaveProperty('page');
      expect(res.body).toHaveProperty('limit');
      expect(res.body).toHaveProperty('totalPages');
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('[200] should return students for manager (scoped to managed building)', async () => {
      const res = await get('/api/students', managerToken).expect(200);

      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('[200] should return own student profile for student role', async () => {
      const res = await get('/api/students', studentToken).expect(200);

      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('[200] should support search query', async () => {
      const res = await get('/api/students?search=SV001', adminToken).expect(
        200,
      );

      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('[200] should support filter by faculty', async () => {
      const res = await get(
        '/api/students?faculty=Công nghệ',
        adminToken,
      ).expect(200);

      expect(res.body).toHaveProperty('data');
    });

    it('[200] should support filter by class_name', async () => {
      const res = await get(
        '/api/students?class_name=CNTT01',
        adminToken,
      ).expect(200);

      expect(res.body).toHaveProperty('data');
    });

    it('[200] should support filter by gender', async () => {
      const res = await get('/api/students?gender=Female', adminToken).expect(
        200,
      );

      expect(res.body).toHaveProperty('data');
    });

    it('[200] should support pagination (page & limit)', async () => {
      const res = await get('/api/students?page=1&limit=2', adminToken).expect(
        200,
      );

      expect(res.body.page).toBe(1);
      expect(res.body.limit).toBe(2);
      expect(res.body.data.length).toBeLessThanOrEqual(2);
    });

    it('[200] should return correct pagination metadata', async () => {
      const res = await get('/api/students?page=1&limit=5', adminToken).expect(
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
      await request(app.getHttpServer()).get('/api/students').expect(401);
    });
  });

  // ─── API TEST: GET /students/:id ─────────────────────────────────────────

  describe('GET /students/:id', () => {
    it('[200] should return a student by id for admin', async () => {
      const res = await get(
        `/api/students/${EXISTING_STUDENT_ID}`,
        adminToken,
      ).expect(200);

      expect(res.body).toHaveProperty('id', EXISTING_STUDENT_ID);
      expect(res.body).toHaveProperty('studentCode');
      expect(res.body).toHaveProperty('user');
      expect(res.body.user).toHaveProperty('id');
    });

    it('[200] should return a student for manager (if they manage building)', async () => {
      const res = await get(
        `/api/students/${EXISTING_STUDENT_ID}`,
        managerToken,
      ).expect(200);

      expect(res.body).toHaveProperty('id', EXISTING_STUDENT_ID);
    });

    it('[200] should return own student profile for student', async () => {
      // student1 has userId=3, which should have student record with id=1
      const res = await get(
        `/api/students/${EXISTING_STUDENT_ID}`,
        studentToken,
      ).expect(200);

      expect(res.body).toHaveProperty('id');
    });

    it('[400] should reject invalid student id (non-numeric)', async () => {
      const res = await get('/api/students/abc', adminToken).expect(400);

      expect(res.body.message).toContain('Invalid student id');
    });

    it('[404] should return 404 for non-existent student', async () => {
      await get(`/api/students/${NON_EXISTENT_ID}`, adminToken).expect(404);
    });

    it('[401] should reject unauthenticated requests', async () => {
      await request(app.getHttpServer())
        .get(`/api/students/${EXISTING_STUDENT_ID}`)
        .expect(401);
    });
  });

  // ─── API TEST: POST /students ────────────────────────────────────────────

  describe('POST /students', () => {
    // We'll need a fresh user with STUDENT role that doesn't have a student profile yet
    // Since we can't modify existing data easily, we'll test validation errors

    it('[400] should reject empty body', async () => {
      await post('/api/students', adminToken, {}).expect(400);
    });

    it('[400] should reject missing required fields', async () => {
      await post('/api/students', adminToken, {
        student_code: 'SV100',
      }).expect(400);
    });

    it('[400] should reject invalid user_id (non-numeric)', async () => {
      await post('/api/students', adminToken, {
        user_id: 'abc',
        student_code: 'SV100',
      }).expect(400);
    });

    it('[400] should reject student_code exceeding max length', async () => {
      await post('/api/students', adminToken, {
        user_id: EXISTING_USER_ID_FOR_STUDENT,
        student_code: 'A'.repeat(21),
      }).expect(400);
    });

    it('[401] should reject unauthenticated requests', async () => {
      await request(app.getHttpServer())
        .post('/api/students')
        .send({ user_id: 3, student_code: 'SV100' })
        .expect(401);
    });

    it('[403] should reject manager role', async () => {
      await post('/api/students', managerToken, {
        user_id: EXISTING_USER_ID_FOR_STUDENT,
        student_code: 'SV100',
      }).expect(403);
    });

    it('[403] should reject student role', async () => {
      await post('/api/students', studentToken, {
        user_id: EXISTING_USER_ID_FOR_STUDENT,
        student_code: 'SV100',
      }).expect(403);
    });

    it('[409] should reject duplicate student_code', async () => {
      await post('/api/students', adminToken, {
        user_id: EXISTING_USER_ID_FOR_STUDENT,
        student_code: 'SV001',
      }).expect(409);
    });

    it('[409] should reject duplicate user_id', async () => {
      await post('/api/students', adminToken, {
        user_id: EXISTING_USER_ID_FOR_STUDENT,
        student_code: 'SV999',
      }).expect(409);
    });
  });

  // ─── API TEST: PUT /students/:id ──────────────────────────────────────────

  describe('PUT /students/:id', () => {
    it('[200] should update a student (admin)', async () => {
      const res = await put(
        `/api/students/${EXISTING_STUDENT_ID}`,
        adminToken,
        {
          faculty: 'Updated Faculty',
        },
      ).expect(200);

      expect(res.body).toHaveProperty('id', EXISTING_STUDENT_ID);
    });

    it('[200] should partially update a student (single field)', async () => {
      const res = await put(
        `/api/students/${EXISTING_STUDENT_ID}`,
        adminToken,
        {
          class_name: 'UpdatedClass',
        },
      ).expect(200);

      expect(res.body).toHaveProperty('id', EXISTING_STUDENT_ID);
    });

    it('[400] should reject invalid student id (non-numeric)', async () => {
      await put('/api/students/abc', adminToken, { faculty: 'New' }).expect(
        400,
      );
    });

    it('[400] should reject invalid enum value for gender', async () => {
      await put(`/api/students/${EXISTING_STUDENT_ID}`, adminToken, {
        gender: 'InvalidGender',
      }).expect(400);
    });

    it('[404] should return 404 for non-existent student', async () => {
      await put(`/api/students/${NON_EXISTENT_ID}`, adminToken, {
        faculty: 'New',
      }).expect(404);
    });

    it('[401] should reject unauthenticated requests', async () => {
      await request(app.getHttpServer())
        .put(`/api/students/${EXISTING_STUDENT_ID}`)
        .send({ faculty: 'New' })
        .expect(401);
    });

    it('[403] should reject manager role', async () => {
      await put(`/api/students/${EXISTING_STUDENT_ID}`, managerToken, {
        faculty: 'New',
      }).expect(403);
    });
  });

  // ─── API TEST: DELETE /students/:id ──────────────────────────────────────

  describe('DELETE /students/:id', () => {
    it('[400] should reject invalid student id (non-numeric)', async () => {
      await del('/api/students/abc', adminToken).expect(400);
    });

    it('[404] should return 404 for non-existent student', async () => {
      await del(`/api/students/${NON_EXISTENT_ID}`, adminToken).expect(404);
    });

    it('[401] should reject unauthenticated requests', async () => {
      await request(app.getHttpServer())
        .delete(`/api/students/${EXISTING_STUDENT_ID}`)
        .expect(401);
    });

    it('[403] should reject manager role', async () => {
      await del(`/api/students/${EXISTING_STUDENT_ID}`, managerToken).expect(
        403,
      );
    });

    it('[403] should reject student role', async () => {
      await del(`/api/students/${EXISTING_STUDENT_ID}`, studentToken).expect(
        403,
      );
    });
  });

  // ─── BUSINESS RULE TESTS ──────────────────────────────────────────────────

  describe('Business Rules', () => {
    it('[BR-01] Create student - validation errors returned properly', async () => {
      const res = await post('/api/students', adminToken, {
        user_id: 'not-a-number',
        student_code: '',
      }).expect(400);

      expect(res.body).toHaveProperty('message');
    });

    it('[BR-02] Search functionality', async () => {
      const res = await get('/api/students?search=SV001', adminToken).expect(
        200,
      );

      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('[BR-03] Filter functionality', async () => {
      const res = await get(
        '/api/students?faculty=Công nghệ&gender=Female',
        adminToken,
      ).expect(200);

      expect(res.body).toHaveProperty('data');
    });

    it('[BR-04] Pagination functionality', async () => {
      const res = await get('/api/students?page=1&limit=2', adminToken).expect(
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
        '/api/students?search=ZZZZNONEXISTENT',
        adminToken,
      ).expect(200);

      expect(res.body.data).toEqual([]);
      expect(res.body.total).toBe(0);
    });

    it('[BR-06] Very large page number handled gracefully', async () => {
      const res = await get('/api/students?page=99999', adminToken).expect(200);

      expect(res.body.data).toEqual([]);
    });

    it('[BR-07] Special characters in search handled', async () => {
      await get('/api/students?search=%3Cscript%3E', adminToken).expect(200);
    });
  });
});
