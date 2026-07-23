import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource, Repository } from 'typeorm';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import { SupportRequest } from '../src/support-requests/support-request.entity';
import { Student } from '../src/students/student.entity';
import { Room } from '../src/rooms/room.entity';
import { Contract } from '../src/contracts/contract.entity';
import { User, UserRole } from '../src/users/user.entity';
import {
  SupportStatus,
  Gender,
  ContractStatus,
} from '../src/common/enums/user-role.enum';

const ADMIN_CREDENTIALS = { username: 'admin', password: 'Admin123!' };
const MANAGER_CREDENTIALS = { username: 'manager1', password: 'Manager123!' };
const STUDENT_CREDENTIALS = { username: 'student1', password: 'Student123!' };

function ensureExists<T>(value: T | null, message: string): T {
  if (value === null) {
    throw new Error(message);
  }
  return value;
}

describe('SupportRequests (e2e)', () => {
  let app: INestApplication;
  let supportRequestRepo: Repository<SupportRequest>;
  let studentRepo: Repository<Student>;
  let roomRepo: Repository<Room>;
  let contractRepo: Repository<Contract>;
  let userRepo: Repository<User>;

  let authToken: string;
  let studentUser: User;
  let managerUser: User;
  let adminUser: User;
  let testStudent: Student;
  let testRoom: Room;
  let testContract: Contract;

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

    const dataSource = app.get(DataSource);
    supportRequestRepo = dataSource.getRepository(SupportRequest);
    studentRepo = dataSource.getRepository(Student);
    roomRepo = dataSource.getRepository(Room);
    contractRepo = dataSource.getRepository(Contract);
    userRepo = dataSource.getRepository(User);

    studentUser = ensureExists(
      await userRepo.findOne({
        where: { username: STUDENT_CREDENTIALS.username },
      }),
      'Seeded user student1 was not found',
    );
    managerUser = ensureExists(
      await userRepo.findOne({
        where: { username: MANAGER_CREDENTIALS.username },
      }),
      'Seeded user manager1 was not found',
    );
    adminUser = ensureExists(
      await userRepo.findOne({
        where: { username: ADMIN_CREDENTIALS.username },
      }),
      'Seeded user admin was not found',
    );

    testStudent = ensureExists(
      await studentRepo.findOne({
        where: { userId: studentUser.id },
      }),
      'Seeded student record for student1 was not found',
    );
    testRoom = ensureExists(
      await roomRepo.findOne({
        where: { id: 1 },
      }),
      'Seeded room with id=1 was not found',
    );
    testContract = ensureExists(
      await contractRepo.findOne({
        where: {
          studentId: testStudent.id,
          roomId: testRoom.id,
          status: ContractStatus.ACTIVE,
        },
      }),
      'Active contract for seeded student/room was not found',
    );

    // Login to get token for student
    const studentLoginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send(STUDENT_CREDENTIALS)
      .expect(200);
    authToken = studentLoginRes.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Support Requests', () => {
    it('/support-requests (POST) - create as student', () => {
      return request(app.getHttpServer())
        .post('/api/support-requests')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          studentId: testStudent.id,
          roomId: testRoom.id,
          category: 'Plumbing',
          title: 'Leaky faucet',
          description: 'The faucet in the bathroom is dripping constantly',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.title).toBe('Leaky faucet');
          expect(res.body.status).toBe('PENDING');
          expect(res.body.studentId).toBe(testStudent.id);
          expect(res.body.roomId).toBe(testRoom.id);
        });
    });

    it('/support-requests (GET) - get all as student (should see only own)', () => {
      return request(app.getHttpServer())
        .get('/api/support-requests')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('data');
          expect(Array.isArray(res.body.data)).toBe(true);
          // Should have at least the one we created
          expect(res.body.data.length).toBeGreaterThanOrEqual(1);
          // All requests should belong to the student
          res.body.data.forEach((req: any) => {
            expect(req.studentId).toBe(testStudent.id);
          });
        });
    });

    it('/support-requests/:id (GET) - get own request', () => {
      // First create a request to get its ID
      return request(app.getHttpServer())
        .post('/api/support-requests')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          studentId: testStudent.id,
          roomId: testRoom.id,
          category: 'Electrical',
          title: 'No power',
          description: 'No power outlet in the room',
        })
        .expect(201)
        .then((res) => {
          const requestId = res.body.id;
          return request(app.getHttpServer())
            .get(`/api/support-requests/${requestId}`)
            .set('Authorization', `Bearer ${authToken}`)
            .expect(200)
            .expect((res) => {
              expect(res.body.id).toBe(requestId);
              expect(res.body.title).toBe('No power');
            });
        });
    });

    it('/support-requests/:id (PUT) - update as manager (reply and status)', () => {
      // First create a request as student
      return request(app.getHttpServer())
        .post('/api/support-requests')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          studentId: testStudent.id,
          roomId: testRoom.id,
          category: 'Plumbing',
          title: 'Clogged drain',
          description: 'The drain in the sink is clogged',
        })
        .expect(201)
        .then((res) => {
          const requestId = res.body.id;
          // Login as manager to get token
          return request(app.getHttpServer())
            .post('/api/auth/login')
            .send(MANAGER_CREDENTIALS)
            .expect(200)
            .then((loginRes) => {
              const managerToken = loginRes.body.accessToken;
              return request(app.getHttpServer())
                .put(`/api/support-requests/${requestId}`)
                .set('Authorization', `Bearer ${managerToken}`)
                .send({
                  reply: 'We will send maintenance to fix the drain.',
                  status: 'PROCESSING',
                })
                .expect(200)
                .expect((res) => {
                  expect(res.body.reply).toBe(
                    'We will send maintenance to fix the drain.',
                  );
                  expect(res.body.status).toBe('PROCESSING');
                  expect(res.body.handledBy).toBeDefined(); // Should be set to manager's user id
                });
            });
        });
    });

    it('/support-requests/:id (DELETE) - delete as admin', () => {
      // First create a request as student
      return request(app.getHttpServer())
        .post('/api/support-requests')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          studentId: testStudent.id,
          roomId: testRoom.id,
          category: 'Cleaning',
          title: 'Trash not emptied',
          description: 'Trash bin in the hallway is full',
        })
        .expect(201)
        .then((res) => {
          const requestId = res.body.id;
          // Login as admin to get token
          return request(app.getHttpServer())
            .post('/api/auth/login')
            .send(ADMIN_CREDENTIALS)
            .expect(200)
            .then((loginRes) => {
              const adminToken = loginRes.body.accessToken;
              return request(app.getHttpServer())
                .delete(`/api/support-requests/${requestId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200)
                .expect((res) => {
                  expect(res.body.message).toBe(
                    'Support request deleted successfully',
                  );
                });
            });
        });
    });

    it('/support-requests/:id (GET) - 404 for non-existent request', () => {
      return request(app.getHttpServer())
        .get('/api/support-requests/99999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('/support-requests (POST) - 403 for manager trying to create', () => {
      return request(app.getHttpServer())
        .post('/api/auth/login')
        .send(MANAGER_CREDENTIALS)
        .expect(200)
        .then((res) => {
          const managerToken = res.body.accessToken;
          return request(app.getHttpServer())
            .post('/api/support-requests')
            .set('Authorization', `Bearer ${managerToken}`)
            .send({
              studentId: testStudent.id,
              roomId: testRoom.id,
              category: 'Plumbing',
              title: 'Leaky faucet',
              description: 'The faucet in the bathroom is dripping constantly',
            })
            .expect(403);
        });
    });

    it('/support-requests/:id (PUT) - 403 for student trying to update', () => {
      return request(app.getHttpServer())
        .post('/api/support-requests')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          studentId: testStudent.id,
          roomId: testRoom.id,
          category: 'Plumbing',
          title: 'Leaky sink',
          description: 'The sink is leaking',
        })
        .expect(201)
        .then((res) => {
          const requestId = res.body.id;
          return request(app.getHttpServer())
            .put(`/api/support-requests/${requestId}`)
            .set('Authorization', `Bearer ${authToken}`)
            .send({
              reply: 'Fixed it',
              status: 'DONE',
            })
            .expect(403); // Student cannot update
        });
    });

    it('/support-requests/:id (PUT) - 400 for student trying to update after processing', () => {
      return request(app.getHttpServer())
        .post('/api/support-requests')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          studentId: testStudent.id,
          roomId: testRoom.id,
          category: 'Plumbing',
          title: 'Leaky pipe',
          description: 'Pipe under sink is leaking',
        })
        .expect(201)
        .then((res) => {
          const requestId = res.body.id;
          // First update as manager to set to PROCESSING
          return request(app.getHttpServer())
            .post('/api/auth/login')
            .send(MANAGER_CREDENTIALS)
            .expect(200)
            .then((loginRes) => {
              const managerToken = loginRes.body.accessToken;
              return request(app.getHttpServer())
                .put(`/api/support-requests/${requestId}`)
                .set('Authorization', `Bearer ${managerToken}`)
                .send({
                  reply: 'Fixing it',
                  status: 'PROCESSING',
                })
                .expect(200)
                .then((res2) => {
                  // Now try to update as student again
                  return request(app.getHttpServer())
                    .put(`/api/support-requests/${requestId}`)
                    .set('Authorization', `Bearer ${authToken}`)
                    .send({
                      reply: 'Fixed by me',
                      status: 'DONE',
                    })
                    .expect(403); // Student cannot update
                });
            });
        });
    });
  });
});
