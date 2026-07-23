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

describe('Buildings (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let adminToken: string;
  let managerToken: string;
  let studentToken: string;
  let createdBuildingId: number;
  let dynamicManagerId: number;

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
    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send(credentials)
      .expect(200);

    return response.body.accessToken;
  }

  async function registerManager(): Promise<number> {
    const username = `manager_test_${randomSuffix()}`;
    const email = `manager_test_${randomSuffix()}@ktx.edu.vn`;
    const response = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        username,
        password: 'Manager123!',
        full_name: 'Test Manager',
        email,
        role: 'MANAGER',
      })
      .expect(201);

    return response.body.user.id;
  }

  describe('GET /api/buildings', () => {
    it('should return paginated buildings for admin', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/buildings')
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

    it('should return filtered buildings by search and gender', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/buildings')
        .query({ search: 'Tòa', gender: 'Female' })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(response.body.data)).toBe(true);
      response.body.data.forEach((item: any) => {
        expect(item.gender).toBe('Female');
      });
    });

    it('should return one item when limit is 1 and correct pagination metadata', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/buildings')
        .query({ page: 1, limit: 1 })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.page).toBe(1);
      expect(response.body.limit).toBe(1);
      expect(response.body.totalPages).toBeGreaterThanOrEqual(1);
      expect(response.body.data.length).toBeLessThanOrEqual(1);
    });

    it('should forbid STUDENT from accessing building list', async () => {
      await request(app.getHttpServer())
        .get('/api/buildings')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(403);
    });

    it('should scope manager results to their buildings', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/buildings')
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      expect(Array.isArray(response.body.data)).toBe(true);
      response.body.data.forEach((item: any) => {
        expect(item.manager.id).toBe(2);
      });
    });
  });

  describe('GET /api/buildings/:id', () => {
    it('should allow manager to fetch own building', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/buildings/1')
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      expect(response.body.id).toBe(1);
      expect(response.body.manager.id).toBe(2);
    });

    it('should return BadRequest for invalid building id', async () => {
      await request(app.getHttpServer())
        .get('/api/buildings/abc')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });
  });

  describe('POST /api/buildings', () => {
    it('should create a new building with a new manager', async () => {
      dynamicManagerId = await registerManager();

      const response = await request(app.getHttpServer())
        .post('/api/buildings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          building_name: `Tòa Test ${randomSuffix()}`,
          gender: 'Male',
          manager_id: dynamicManagerId,
          description: 'Test building',
        })
        .expect(201);

      expect(response.body.id).toBeDefined();
      expect(response.body.buildingName).toContain('Tòa Test');
      expect(response.body.manager.id).toBe(dynamicManagerId);
      createdBuildingId = response.body.id;
    });

    it('should return Conflict for duplicate building name', async () => {
      await request(app.getHttpServer())
        .post('/api/buildings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          building_name: 'Tòa A',
          gender: 'Female',
          manager_id: 2,
          description: 'Duplicate test',
        })
        .expect(409);
    });

    it('should return BadRequest when manager is not a MANAGER', async () => {
      await request(app.getHttpServer())
        .post('/api/buildings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          building_name: `Tòa Student ${randomSuffix()}`,
          gender: 'Male',
          manager_id: 3,
          description: 'Invalid manager',
        })
        .expect(400);
    });
  });

  describe('PUT /api/buildings/:id', () => {
    it('should update building name and description', async () => {
      const response = await request(app.getHttpServer())
        .put(`/api/buildings/${createdBuildingId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          building_name: `Tòa Updated ${randomSuffix()}`,
          description: 'Updated desc',
        })
        .expect(200);

      expect(response.body.buildingName).toContain('Tòa Updated');
      expect(response.body.description).toBe('Updated desc');
    });
  });

  describe('DELETE /api/buildings/:id', () => {
    it('should not delete building with existing rooms', async () => {
      await request(app.getHttpServer())
        .delete('/api/buildings/1')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });

    it('should delete the newly created building successfully', async () => {
      await request(app.getHttpServer())
        .delete(`/api/buildings/${createdBuildingId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });
  });
});
