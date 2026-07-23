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

const randomSuffix = () => Date.now().toString().slice(-6);

describe('Users (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let adminToken: string;
  let managerToken: string;
  let studentToken: string;
  let adminUserId: number;
  let managerUserId: number;
  let studentUserId: number;
  let createdUserId: number;

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

    // Get logged-in user IDs
    const adminRes = await request(app.getHttpServer())
      .get('/api/users/me')
      .set('Authorization', `Bearer ${adminToken}`);
    adminUserId = adminRes.body.id;

    const managerRes = await request(app.getHttpServer())
      .get('/api/users/me')
      .set('Authorization', `Bearer ${managerToken}`);
    managerUserId = managerRes.body.id;

    const studentRes = await request(app.getHttpServer())
      .get('/api/users/me')
      .set('Authorization', `Bearer ${studentToken}`);
    studentUserId = studentRes.body.id;
  }, TEST_TIMEOUT);

  afterAll(async () => {
    await app.close();
  });

  async function loginAndGetToken(credentials: {
    identifier: string;
    password: string;
  }): Promise<string> {
    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send(credentials)
      .expect(200);

    return response.body.accessToken;
  }

  async function createUser(data: any): Promise<any> {
    const response = await request(app.getHttpServer())
      .post('/api/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(data)
      .expect(201);

    return response.body;
  }

  describe('POST /api/users - CREATE', () => {
    it('should create user successfully with all fields', async () => {
      const newUser = {
        username: `user_${randomSuffix()}`,
        email: `user_${randomSuffix()}@test.com`,
        password: 'ValidPass123!',
        full_name: 'Test User',
        phone: '0912345678',
        role: 'STUDENT',
      };

      const response = await request(app.getHttpServer())
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newUser)
        .expect(201);

      expect(response.body).toMatchObject({
        id: expect.any(Number),
        username: newUser.username,
        email: newUser.email,
        fullName: newUser.full_name,
        phone: newUser.phone,
        role: newUser.role,
      });

      createdUserId = response.body.id;
    });

    it('should create user with minimum required fields', async () => {
      const newUser = {
        username: `user_${randomSuffix()}`,
        email: `user_${randomSuffix()}@test.com`,
        password: 'ValidPass123!',
      };

      const response = await request(app.getHttpServer())
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newUser)
        .expect(201);

      expect(response.body.username).toBe(newUser.username);
      expect(response.body.role).toBe('STUDENT');
      expect(response.body.status).toBe('ACTIVE');
    });

    it('should reject duplicate email', async () => {
      const user1 = {
        username: `user_${randomSuffix()}`,
        email: `duplicate_${randomSuffix()}@test.com`,
        password: 'ValidPass123!',
        full_name: 'User One',
      };

      await request(app.getHttpServer())
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(user1)
        .expect(201);

      const user2 = {
        username: `user_${randomSuffix()}`,
        email: user1.email,
        password: 'ValidPass123!',
        full_name: 'User Two',
      };

      await request(app.getHttpServer())
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(user2)
        .expect(409);
    });

    it('should reject duplicate username', async () => {
      const username = `user_${randomSuffix()}`;
      const user1 = {
        username,
        email: `user1_${randomSuffix()}@test.com`,
        password: 'ValidPass123!',
        full_name: 'User One',
      };

      await request(app.getHttpServer())
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(user1)
        .expect(201);

      const user2 = {
        username,
        email: `user2_${randomSuffix()}@test.com`,
        password: 'ValidPass123!',
        full_name: 'User Two',
      };

      await request(app.getHttpServer())
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(user2)
        .expect(409);
    });

    it('should hash password (not stored in plaintext)', async () => {
      const password = 'ValidPass123!';
      const newUser = {
        username: `user_${randomSuffix()}`,
        email: `user_${randomSuffix()}@test.com`,
        password,
        full_name: 'Test User',
      };

      const response = await request(app.getHttpServer())
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newUser)
        .expect(201);

      expect(response.body.password).toBeUndefined();
    });

    it('should reject weak password', async () => {
      const newUser = {
        username: `user_${randomSuffix()}`,
        email: `user_${randomSuffix()}@test.com`,
        password: 'weak',
        full_name: 'Test User',
      };

      await request(app.getHttpServer())
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newUser)
        .expect(400);
    });

    it('should require authentication', async () => {
      const newUser = {
        username: `user_${randomSuffix()}`,
        email: `user_${randomSuffix()}@test.com`,
        password: 'ValidPass123!',
        full_name: 'Test User',
      };

      await request(app.getHttpServer())
        .post('/api/users')
        .send(newUser)
        .expect(401);
    });
  });

  describe('GET /api/users/me - GET CURRENT USER', () => {
    it('should return current user profile', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/users/me')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: expect.any(Number),
        username: 'student1',
        email: expect.any(String),
        fullName: expect.any(String),
        role: 'STUDENT',
      });
    });

    it('should require authentication', async () => {
      await request(app.getHttpServer()).get('/api/users/me').expect(401);
    });
  });

  describe('GET /api/users/:id - GET USER BY ID', () => {
    it('should return user by id', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/users/${adminUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: adminUserId,
        username: expect.any(String),
        email: expect.any(String),
      });
    });

    it('should allow student to view own profile', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/users/${studentUserId}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(response.body.id).toBe(studentUserId);
    });

    it('should forbid student from viewing other profiles', async () => {
      await request(app.getHttpServer())
        .get(`/api/users/${adminUserId}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(403);
    });

    it('should allow manager to view student profiles', async () => {
      // Create a test student first
      const testStudent = await createUser({
        username: `student_${randomSuffix()}`,
        email: `student_${randomSuffix()}@test.com`,
        password: 'ValidPass123!',
        full_name: 'Test Student',
        role: 'STUDENT',
      });

      const response = await request(app.getHttpServer())
        .get(`/api/users/${testStudent.id}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      expect(response.body.role).toBe('STUDENT');
    });

    it('should forbid manager from viewing admin profiles', async () => {
      await request(app.getHttpServer())
        .get(`/api/users/${adminUserId}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(403);
    });

    it('should reject invalid user id', async () => {
      await request(app.getHttpServer())
        .get('/api/users/abc')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });

    it('should return 404 for non-existent user', async () => {
      await request(app.getHttpServer())
        .get('/api/users/99999')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('should require authentication', async () => {
      await request(app.getHttpServer()).get('/api/users/1').expect(401);
    });
  });

  describe('GET /api/users - LIST USERS WITH FILTERS', () => {
    it('should return paginated users for admin', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/users')
        .query({ page: 1, limit: 10 })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        total: expect.any(Number),
        page: 1,
        limit: 10,
        totalPages: expect.any(Number),
        data: expect.any(Array),
      });
    });

    it('should search by username', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/users')
        .query({ username: 'admin' })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            username: expect.stringContaining('admin'),
          }),
        ]),
      );
    });

    it('should search by email', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/users')
        .query({ email: 'admin' })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should search by full name', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/users')
        .query({ full_name: 'Admin' })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should filter by role', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/users')
        .query({ role: 'STUDENT' })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      response.body.data.forEach((user: any) => {
        expect(user.role).toBe('STUDENT');
      });
    });

    it('should filter by status', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/users')
        .query({ status: 'ACTIVE' })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      response.body.data.forEach((user: any) => {
        expect(user.status).toBe('ACTIVE');
      });
    });

    it('should sort by different columns', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/users')
        .query({ sortBy: 'username', sortOrder: 'ASC' })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should respect pagination limits', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/users')
        .query({ page: 1, limit: 5 })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.limit).toBe(5);
      expect(response.body.data.length).toBeLessThanOrEqual(5);
    });

    it('should cap pagination limit at 100', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/users')
        .query({ limit: 10000 })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.limit).toBe(100);
    });

    it('should scope student results to self', async () => {
      await request(app.getHttpServer())
        .get('/api/users')
        .query({ page: 1 })
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(403);
    });

    it('should scope manager results to students only', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/users')
        .query({ page: 1, limit: 10 })
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      response.body.data.forEach((user: any) => {
        expect(user.role).toBe('STUDENT');
      });
    });

    it('should require authentication', async () => {
      await request(app.getHttpServer()).get('/api/users').expect(401);
    });
  });

  describe('PUT /api/users/:id - UPDATE USER', () => {
    it('should update username', async () => {
      const newUsername = `updated_${randomSuffix()}`;
      const user = await createUser({
        username: `user_${randomSuffix()}`,
        email: `user_${randomSuffix()}@test.com`,
        password: 'ValidPass123!',
        full_name: 'Test User',
      });

      const response = await request(app.getHttpServer())
        .put(`/api/users/${user.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ username: newUsername })
        .expect(200);

      expect(response.body.username).toBe(newUsername);
    });

    it('should update email', async () => {
      const newEmail = `updated_${randomSuffix()}@test.com`;
      const user = await createUser({
        username: `user_${randomSuffix()}`,
        email: `user_${randomSuffix()}@test.com`,
        password: 'ValidPass123!',
        full_name: 'Test User',
      });

      const response = await request(app.getHttpServer())
        .put(`/api/users/${user.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: newEmail })
        .expect(200);

      expect(response.body.email).toBe(newEmail);
    });

    it('should update password', async () => {
      const user = await createUser({
        username: `user_${randomSuffix()}`,
        email: `user_${randomSuffix()}@test.com`,
        password: 'ValidPass123!',
        full_name: 'Test User',
      });

      const newPassword = 'NewPass456!';
      await request(app.getHttpServer())
        .put(`/api/users/${user.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ password: newPassword })
        .expect(200);

      const loginResponse = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          identifier: user.username,
          password: newPassword,
        });

      expect(loginResponse.status).toBe(200);
    });

    it('should update full name', async () => {
      const user = await createUser({
        username: `user_${randomSuffix()}`,
        email: `user_${randomSuffix()}@test.com`,
        password: 'ValidPass123!',
        full_name: 'Old Name',
      });

      const response = await request(app.getHttpServer())
        .put(`/api/users/${user.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ full_name: 'New Name' })
        .expect(200);

      expect(response.body.fullName).toBe('New Name');
    });

    it('should update phone', async () => {
      const user = await createUser({
        username: `user_${randomSuffix()}`,
        email: `user_${randomSuffix()}@test.com`,
        password: 'ValidPass123!',
        full_name: 'Test User',
      });

      const response = await request(app.getHttpServer())
        .put(`/api/users/${user.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ phone: '0987654321' })
        .expect(200);

      expect(response.body.phone).toBe('0987654321');
    });

    it('should update role (admin only)', async () => {
      const user = await createUser({
        username: `user_${randomSuffix()}`,
        email: `user_${randomSuffix()}@test.com`,
        password: 'ValidPass123!',
        full_name: 'Test User',
        role: 'STUDENT',
      });

      const response = await request(app.getHttpServer())
        .put(`/api/users/${user.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'MANAGER' })
        .expect(200);

      expect(response.body.role).toBe('MANAGER');
    });

    it('should forbid role update by non-admin', async () => {
      const user = await createUser({
        username: `user_${randomSuffix()}`,
        email: `user_${randomSuffix()}@test.com`,
        password: 'ValidPass123!',
        full_name: 'Test User',
      });

      await request(app.getHttpServer())
        .put(`/api/users/${user.id}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ role: 'ADMIN' })
        .expect(403);
    });

    it('should reject duplicate email update', async () => {
      const user1 = await createUser({
        username: `user1_${randomSuffix()}`,
        email: `user1_${randomSuffix()}@test.com`,
        password: 'ValidPass123!',
        full_name: 'User One',
      });

      const user2 = await createUser({
        username: `user2_${randomSuffix()}`,
        email: `user2_${randomSuffix()}@test.com`,
        password: 'ValidPass123!',
        full_name: 'User Two',
      });

      await request(app.getHttpServer())
        .put(`/api/users/${user1.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: user2.email })
        .expect(409);
    });

    it('should reject duplicate username update', async () => {
      const user1 = await createUser({
        username: `user1_${randomSuffix()}`,
        email: `user1_${randomSuffix()}@test.com`,
        password: 'ValidPass123!',
        full_name: 'User One',
      });

      const user2 = await createUser({
        username: `user2_${randomSuffix()}`,
        email: `user2_${randomSuffix()}@test.com`,
        password: 'ValidPass123!',
        full_name: 'User Two',
      });

      await request(app.getHttpServer())
        .put(`/api/users/${user1.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ username: user2.username })
        .expect(409);
    });

    it('should reject weak password', async () => {
      const user = await createUser({
        username: `user_${randomSuffix()}`,
        email: `user_${randomSuffix()}@test.com`,
        password: 'ValidPass123!',
        full_name: 'Test User',
      });

      await request(app.getHttpServer())
        .put(`/api/users/${user.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ password: 'weak' })
        .expect(400);
    });

    it('should reject invalid user id', async () => {
      await request(app.getHttpServer())
        .put('/api/users/abc')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ username: 'newname' })
        .expect(400);
    });

    it('should return 404 for non-existent user', async () => {
      await request(app.getHttpServer())
        .put('/api/users/99999')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ username: 'newname' })
        .expect(404);
    });

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .put('/api/users/1')
        .send({ username: 'newname' })
        .expect(401);
    });
  });

  describe('DELETE /api/users/:id - DELETE USER', () => {
    it('should delete user successfully', async () => {
      const user = await createUser({
        username: `user_${randomSuffix()}`,
        email: `user_${randomSuffix()}@test.com`,
        password: 'ValidPass123!',
        full_name: 'Test User',
      });

      const response = await request(app.getHttpServer())
        .delete(`/api/users/${user.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.message).toBe('User deleted successfully');
    });

    it('should mark user as inactive on delete', async () => {
      const user = await createUser({
        username: `user_${randomSuffix()}`,
        email: `user_${randomSuffix()}@test.com`,
        password: 'ValidPass123!',
        full_name: 'Test User',
      });

      await request(app.getHttpServer())
        .delete(`/api/users/${user.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const response = await request(app.getHttpServer())
        .get(`/api/users/${user.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
    });

    it('should return message when deleting already deleted user', async () => {
      const user = await createUser({
        username: `user_${randomSuffix()}`,
        email: `user_${randomSuffix()}@test.com`,
        password: 'ValidPass123!',
        full_name: 'Test User',
      });

      await request(app.getHttpServer())
        .delete(`/api/users/${user.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const response = await request(app.getHttpServer())
        .delete(`/api/users/${user.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.message).toBe('User already deleted');
    });

    it('should reject invalid user id', async () => {
      await request(app.getHttpServer())
        .delete('/api/users/abc')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });

    it('should return 404 for non-existent user', async () => {
      await request(app.getHttpServer())
        .delete('/api/users/99999')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('should require authentication', async () => {
      await request(app.getHttpServer()).delete('/api/users/1').expect(401);
    });
  });

  describe('AUTHORIZATION', () => {
    it('should forbid non-admin from creating users', async () => {
      await request(app.getHttpServer())
        .post('/api/users')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          username: `user_${randomSuffix()}`,
          email: `user_${randomSuffix()}@test.com`,
          password: 'ValidPass123!',
          full_name: 'Test User',
        })
        .expect(403);
    });

    it('should forbid non-admin from deleting users', async () => {
      await request(app.getHttpServer())
        .delete('/api/users/1')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(403);
    });

    it('should forbid non-admin from updating users', async () => {
      await request(app.getHttpServer())
        .put('/api/users/1')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ username: 'newname' })
        .expect(403);
    });
  });
});
