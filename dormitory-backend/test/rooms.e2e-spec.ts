import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from './../src/app.module';
import cookieParser from 'cookie-parser';
import session from 'express-session';

/**
 * Rooms E2E Tests
 * ================
 * Tests all Rooms API endpoints and business rules.
 *
 * Prerequisites:
 * - MySQL database must be running with proper schema (run database/quan_ly_ky_tuc_xa.sql)
 * - Environment variables must be set (DB_HOST, DB_PORT, DB_USERNAME, DB_PASSWORD, DB_NAME)
 * - JWT_SECRET and SESSION_SECRET environment variables (or defaults will be used)
 *
 * Test accounts needed (pre-seeded in database):
 * - Admin: admin / Admin123!
 * - Manager: manager1 / Manager123! (manages building ID 1)
 * - Student: student1 / Student123! (has active contract in room ID 1)
 */

// ─── Test Constants ───────────────────────────────────────────────────────────
const TEST_TIMEOUT = 30000;

// Pre-seeded test credentials matching the database seed data
const ADMIN_CREDENTIALS = { identifier: 'admin', password: 'Admin123!' };
const MANAGER_CREDENTIALS = { identifier: 'manager1', password: 'Manager123!' };
const STUDENT_CREDENTIALS = { identifier: 'student1', password: 'Student123!' };

const makeRoomNumber = (prefix: string) =>
  `${prefix}${Date.now().toString().slice(-6)}${Math.random()
    .toString(36)
    .slice(2, 4)}`;

// Pre-seeded test data IDs (adjust as needed)
const EXISTING_BUILDING_ID = 1;
const EXISTING_ROOM_ID = 1;
const NON_EXISTENT_ID = 9999;

describe('Rooms (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  // Auth tokens cached from login
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

  /** Login and return the Bearer token */
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

  /** Make an authenticated GET request */
  function get(url: string, token: string) {
    return request(app.getHttpServer())
      .get(url)
      .set('Authorization', `Bearer ${token}`);
  }

  /** Make an authenticated POST request */
  function post(url: string, token: string, body: any) {
    return request(app.getHttpServer())
      .post(url)
      .set('Authorization', `Bearer ${token}`)
      .send(body);
  }

  /** Make an authenticated PUT request */
  function put(url: string, token: string, body: any) {
    return request(app.getHttpServer())
      .put(url)
      .set('Authorization', `Bearer ${token}`)
      .send(body);
  }

  /** Make an authenticated DELETE request */
  function del(url: string, token: string) {
    return request(app.getHttpServer())
      .delete(url)
      .set('Authorization', `Bearer ${token}`);
  }

  async function createActiveContracts(roomId: number, count: number) {
    const [adminUser] = await dataSource.query(
      `SELECT id FROM users WHERE username = ? LIMIT 1`,
      [ADMIN_CREDENTIALS.identifier],
    );
    const [student] = await dataSource.query(
      `SELECT id FROM students ORDER BY id LIMIT 1`,
      [],
    );

    if (!adminUser || !student) {
      throw new Error(
        'Unable to find admin user or student for contract setup',
      );
    }

    for (let index = 0; index < count; index += 1) {
      await dataSource.query(
        `INSERT INTO contracts (contract_code, student_id, room_id, created_by, start_date, end_date, deposit, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `E2E-${Date.now()}-${index}`,
          student.id,
          roomId,
          adminUser.id,
          '2024-01-01',
          '2025-01-01',
          0,
          'ACTIVE',
        ],
      );
    }
  }

  async function cleanupRoom(roomId: number) {
    await dataSource.query(`DELETE FROM contracts WHERE room_id = ?`, [roomId]);
    await dataSource.query(`DELETE FROM rooms WHERE id = ?`, [roomId]);
  }

  async function ensureRoomWithOccupancy(minOccupancy: number) {
    const res = await get('/api/rooms?limit=100', adminToken).expect(200);

    const existingRoom = res.body.data.find(
      (item: any) => item.currentOccupancy >= minOccupancy,
    );

    if (existingRoom) {
      return { room: existingRoom, created: false };
    }

    const createRes = await post('/api/rooms', adminToken, {
      building_id: EXISTING_BUILDING_ID,
      room_number: makeRoomNumber('OCC'),
      floor: 1,
      capacity: 4,
      room_fee: 1000000,
      status: 'ACTIVE',
    }).expect(201);

    await createActiveContracts(createRes.body.id, minOccupancy);

    const roomRes = await get(
      `/api/rooms/${createRes.body.id}`,
      adminToken,
    ).expect(200);

    return { room: roomRes.body, created: true };
  }

  // ─── API TEST: GET /rooms ──────────────────────────────────────────────────

  describe('GET /rooms', () => {
    it('[200] should return paginated rooms for admin', async () => {
      const res = await get('/api/rooms', adminToken).expect(200);

      expect(res.body).toHaveProperty('total');
      expect(res.body).toHaveProperty('page');
      expect(res.body).toHaveProperty('limit');
      expect(res.body).toHaveProperty('totalPages');
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('[200] should return rooms for manager (scoped to managed building)', async () => {
      const res = await get('/api/rooms', managerToken).expect(200);

      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('[200] should return rooms for student (scoped to their room)', async () => {
      const res = await get('/api/rooms', studentToken).expect(200);

      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('[200] should support search query', async () => {
      const res = await get('/api/rooms?search=101', adminToken).expect(200);

      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('[200] should support filter by building_id', async () => {
      const res = await get(
        `/api/rooms?building_id=${EXISTING_BUILDING_ID}`,
        adminToken,
      ).expect(200);

      res.body.data.forEach((room: any) => {
        expect(room.buildingId).toBe(EXISTING_BUILDING_ID);
      });
    });

    it('[200] should support filter by status', async () => {
      const res = await get('/api/rooms?status=ACTIVE', adminToken).expect(200);

      res.body.data.forEach((room: any) => {
        expect(room.status).toBe('ACTIVE');
      });
    });

    it('[200] should support filter by gender', async () => {
      const res = await get('/api/rooms?gender=Female', adminToken).expect(200);

      res.body.data.forEach((room: any) => {
        expect(room.gender).toBe('Female');
      });
    });

    it('[200] should support filter by floor', async () => {
      const res = await get('/api/rooms?floor=1', adminToken).expect(200);

      res.body.data.forEach((room: any) => {
        expect(room.floor).toBe(1);
      });
    });

    it('[200] should support filter by room_type', async () => {
      const res = await get('/api/rooms?room_type=Single', adminToken).expect(
        200,
      );

      expect(res.status).toBe(200);
    });

    it('[200] should support pagination (page & limit)', async () => {
      const res = await get('/api/rooms?page=1&limit=2', adminToken).expect(
        200,
      );

      expect(res.body.page).toBe(1);
      expect(res.body.limit).toBe(2);
      expect(res.body.data.length).toBeLessThanOrEqual(2);
    });

    it('[200] should return correct pagination metadata', async () => {
      const res = await get('/api/rooms?page=1&limit=5', adminToken).expect(
        200,
      );

      expect(res.body).toMatchObject({
        page: expect.any(Number),
        limit: expect.any(Number),
        total: expect.any(Number),
        totalPages: expect.any(Number),
        data: expect.any(Array),
      });
      expect(res.body.totalPages).toBe(
        Math.ceil(res.body.total / res.body.limit),
      );
    });

    it('[401] should reject unauthenticated requests', async () => {
      await request(app.getHttpServer()).get('/api/rooms').expect(401);
    });
  });

  // ─── API TEST: GET /rooms/:id ─────────────────────────────────────────────

  describe('GET /rooms/:id', () => {
    it('[200] should return a room by id for admin', async () => {
      const res = await get(
        `/api/rooms/${EXISTING_ROOM_ID}`,
        adminToken,
      ).expect(200);

      expect(res.body).toHaveProperty('id', EXISTING_ROOM_ID);
      expect(res.body).toHaveProperty('roomNumber');
      expect(res.body).toHaveProperty('building');
      expect(res.body).toHaveProperty('currentOccupancy');
      expect(res.body).toHaveProperty('availableSlots');
      expect(res.body).toHaveProperty('capacity');
    });

    it('[200] should return a room for manager (if they manage the building)', async () => {
      const res = await get(
        `/api/rooms/${EXISTING_ROOM_ID}`,
        managerToken,
      ).expect(200);

      expect(res.body).toHaveProperty('id', EXISTING_ROOM_ID);
    });

    it('[200] should return a room for student (if they have active contract)', async () => {
      const res = await get(
        `/api/rooms/${EXISTING_ROOM_ID}`,
        studentToken,
      ).expect(200);

      expect(res.body).toHaveProperty('id', EXISTING_ROOM_ID);
    });

    it('[400] should reject invalid room id (non-numeric)', async () => {
      const res = await get('/api/rooms/abc', adminToken).expect(400);

      expect(res.body.message).toContain('Invalid room id');
    });

    it('[404] should return 404 for non-existent room', async () => {
      await get(`/api/rooms/${NON_EXISTENT_ID}`, adminToken).expect(404);
    });

    it('[401] should reject unauthenticated requests', async () => {
      await request(app.getHttpServer())
        .get(`/api/rooms/${EXISTING_ROOM_ID}`)
        .expect(401);
    });

    it('[403] should reject student who does not have access to the room', async () => {
      const createRes = await post('/api/rooms', adminToken, {
        building_id: EXISTING_BUILDING_ID,
        room_number: makeRoomNumber('NOACC'),
        floor: 1,
        capacity: 4,
        room_fee: 1000000,
        status: 'ACTIVE',
      }).expect(201);

      try {
        await get(`/api/rooms/${createRes.body.id}`, studentToken).expect(403);
      } finally {
        await del(`/api/rooms/${createRes.body.id}`, adminToken).expect(200);
      }
    });
  });

  // ─── API TEST: POST /rooms ────────────────────────────────────────────────

  describe('POST /rooms', () => {
    const validRoomPayload = {
      building_id: EXISTING_BUILDING_ID,
      room_number: makeRoomNumber('E2E'),
      floor: 2,
      room_type: '4_BEDS',
      gender: 'Female',
      capacity: 4,
      room_fee: 1500000,
      status: 'ACTIVE',
    };

    it('[201] should create a new room (admin)', async () => {
      const res = await post('/api/rooms', adminToken, validRoomPayload).expect(
        201,
      );

      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty(
        'roomNumber',
        validRoomPayload.room_number,
      );
      expect(res.body).toHaveProperty('buildingId', EXISTING_BUILDING_ID);
      expect(res.body).toHaveProperty('capacity', validRoomPayload.capacity);
      expect(res.body).toHaveProperty('currentOccupancy', 0);
      expect(res.body).toHaveProperty(
        'availableSlots',
        validRoomPayload.capacity,
      );
    });

    it('[201] should create a new room (manager with managed building)', async () => {
      const managerPayload = {
        ...validRoomPayload,
        room_number: makeRoomNumber('MGR'),
      };

      const res = await post('/api/rooms', managerToken, managerPayload).expect(
        201,
      );

      expect(res.body).toHaveProperty('id');
    });

    it('[400] should reject empty body', async () => {
      await post('/api/rooms', adminToken, {}).expect(400);
    });

    it('[400] should reject missing required fields', async () => {
      await post('/api/rooms', adminToken, {
        room_number: 'TestRoom',
      }).expect(400);
    });

    it('[400] should reject invalid capacity (less than 1)', async () => {
      await post('/api/rooms', adminToken, {
        ...validRoomPayload,
        room_number: makeRoomNumber('CAP'),
        capacity: 0,
      }).expect(400);
    });

    it('[400] should reject negative room_fee', async () => {
      await post('/api/rooms', adminToken, {
        ...validRoomPayload,
        room_number: makeRoomNumber('FEE'),
        room_fee: -1000,
      }).expect(400);
    });

    it('[400] should reject invalid floor (less than 1)', async () => {
      await post('/api/rooms', adminToken, {
        ...validRoomPayload,
        room_number: makeRoomNumber('FLO'),
        floor: 0,
      }).expect(400);
    });

    it('[400] should reject building_id that is non-numeric', async () => {
      await post('/api/rooms', adminToken, {
        ...validRoomPayload,
        room_number: makeRoomNumber('BLD'),
        building_id: 'abc' as any,
      }).expect(400);
    });

    it('[409] should reject duplicate room_number in same building', async () => {
      const dupRoomNumber = makeRoomNumber('DUP');

      await post('/api/rooms', adminToken, {
        ...validRoomPayload,
        room_number: dupRoomNumber,
      }).expect(201);

      await post('/api/rooms', adminToken, {
        ...validRoomPayload,
        room_number: dupRoomNumber,
      }).expect(409);
    });

    it('[404] should reject non-existent building_id', async () => {
      await post('/api/rooms', adminToken, {
        ...validRoomPayload,
        room_number: makeRoomNumber('NOB'),
        building_id: NON_EXISTENT_ID,
      }).expect(404);
    });

    it('[401] should reject unauthenticated requests', async () => {
      await request(app.getHttpServer())
        .post('/api/rooms')
        .send(validRoomPayload)
        .expect(401);
    });

    it('[403] should reject student role', async () => {
      await post('/api/rooms', studentToken, validRoomPayload).expect(403);
    });
  });

  // ─── API TEST: PUT /rooms/:id ──────────────────────────────────────────────

  describe('PUT /rooms/:id', () => {
    let roomToUpdateId: number;

    beforeAll(async () => {
      // Create a room to update
      const res = await post('/api/rooms', adminToken, {
        building_id: EXISTING_BUILDING_ID,
        room_number: makeRoomNumber('UPD'),
        floor: 1,
        capacity: 4,
        room_fee: 1000000,
        status: 'ACTIVE',
      }).expect(201);
      roomToUpdateId = res.body.id;
    });

    it('[200] should update a room (admin)', async () => {
      const res = await put(`/api/rooms/${roomToUpdateId}`, adminToken, {
        room_number: makeRoomNumber('UPD'),
        floor: 3,
        capacity: 6,
        room_fee: 2000000,
      }).expect(200);

      expect(res.body).toHaveProperty('id', roomToUpdateId);
      expect(res.body.floor).toBe(3);
      expect(res.body.capacity).toBe(6);
    });

    it('[200] should partially update a room (single field)', async () => {
      const res = await put(`/api/rooms/${roomToUpdateId}`, adminToken, {
        room_fee: 2500000,
      }).expect(200);

      expect(res.body.roomFee).toBe(2500000);
    });

    it('[400] should reject invalid room id (non-numeric)', async () => {
      await put('/api/rooms/abc', adminToken, { room_fee: 1000 }).expect(400);
    });

    it('[400] should reject invalid capacity (less than 1)', async () => {
      await put(`/api/rooms/${roomToUpdateId}`, adminToken, {
        capacity: 0,
      }).expect(400);
    });

    it('[400] should reject negative room_fee', async () => {
      await put(`/api/rooms/${roomToUpdateId}`, adminToken, {
        room_fee: -500,
      }).expect(400);
    });

    it('[400] should reject capacity less than current occupancy', async () => {
      const { room, created } = await ensureRoomWithOccupancy(2);

      try {
        const res = await put(`/api/rooms/${room.id}`, adminToken, {
          capacity: room.currentOccupancy - 1,
        }).expect(400);

        expect(res.body.message).toContain(
          'Capacity cannot be less than current occupancy',
        );
      } finally {
        if (created) {
          await cleanupRoom(room.id);
        }
      }
    });

    it('[404] should return 404 for non-existent room', async () => {
      await put(`/api/rooms/${NON_EXISTENT_ID}`, adminToken, {
        room_fee: 1000,
      }).expect(404);
    });

    it('[404] should reject updating to non-existent building_id', async () => {
      await put(`/api/rooms/${roomToUpdateId}`, adminToken, {
        building_id: NON_EXISTENT_ID,
      }).expect(404);
    });

    it('[401] should reject unauthenticated requests', async () => {
      await request(app.getHttpServer())
        .put(`/api/rooms/${roomToUpdateId}`)
        .send({ room_fee: 1000 })
        .expect(401);
    });

    it('[403] should reject student role', async () => {
      await put(`/api/rooms/${roomToUpdateId}`, studentToken, {
        room_fee: 1000,
      }).expect(403);
    });
  });

  // ─── API TEST: DELETE /rooms/:id ──────────────────────────────────────────

  describe('DELETE /rooms/:id', () => {
    let roomToDeleteId: number;

    beforeAll(async () => {
      // Create a room without active contracts for deletion test
      const res = await post('/api/rooms', adminToken, {
        building_id: EXISTING_BUILDING_ID,
        room_number: makeRoomNumber('DEL'),
        floor: 1,
        capacity: 2,
        room_fee: 800000,
        status: 'ACTIVE',
      }).expect(201);
      roomToDeleteId = res.body.id;
    });

    it('[200] should delete a room with no active contracts (admin)', async () => {
      await del(`/api/rooms/${roomToDeleteId}`, adminToken).expect(200);

      // Verify it's deleted
      await get(`/api/rooms/${roomToDeleteId}`, adminToken).expect(404);
    });

    it('[400] should reject invalid room id (non-numeric)', async () => {
      await del('/api/rooms/abc', adminToken).expect(400);
    });

    it('[404] should return 404 for non-existent room', async () => {
      await del(`/api/rooms/${NON_EXISTENT_ID}`, adminToken).expect(404);
    });

    it('[409] should reject deleting room with active contracts', async () => {
      const { room, created } = await ensureRoomWithOccupancy(1);

      try {
        await del(`/api/rooms/${room.id}`, adminToken).expect(409);
      } finally {
        if (created) {
          await cleanupRoom(room.id);
        }
      }
    });

    it('[401] should reject unauthenticated requests', async () => {
      await request(app.getHttpServer())
        .delete(`/api/rooms/${EXISTING_ROOM_ID}`)
        .expect(401);
    });

    it('[403] should reject student role', async () => {
      await del(`/api/rooms/${EXISTING_ROOM_ID}`, studentToken).expect(403);
    });
  });

  // ─── BUSINESS RULE TESTS ──────────────────────────────────────────────────

  describe('Business Rules', () => {
    it('[BR-01] Tạo phòng mới thành công (Create room successfully)', async () => {
      const res = await post('/api/rooms', adminToken, {
        building_id: EXISTING_BUILDING_ID,
        room_number: makeRoomNumber('BRS'),
        floor: 1,
        capacity: 4,
        room_fee: 1000000,
        status: 'ACTIVE',
      }).expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.currentOccupancy).toBe(0);
      expect(res.body.availableSlots).toBe(res.body.capacity);
    });

    it('[BR-02] Không tạo được nếu room_number bị trùng (Duplicate room_number)', async () => {
      const roomNumber = makeRoomNumber('DUP');

      // Create first room
      await post('/api/rooms', adminToken, {
        building_id: EXISTING_BUILDING_ID,
        room_number: roomNumber,
        floor: 1,
        capacity: 4,
        room_fee: 1000000,
      }).expect(201);

      // Try to create duplicate in same building
      await post('/api/rooms', adminToken, {
        building_id: EXISTING_BUILDING_ID,
        room_number: roomNumber,
        floor: 1,
        capacity: 4,
        room_fee: 1000000,
      }).expect(409);
    });

    it('[BR-03] Không tạo được nếu Building không tồn tại (Non-existent building)', async () => {
      await post('/api/rooms', adminToken, {
        building_id: NON_EXISTENT_ID,
        room_number: makeRoomNumber('BNB'),
        floor: 1,
        capacity: 4,
        room_fee: 1000000,
      }).expect(404);
    });

    it('[BR-04] Không sửa được sang Building không tồn tại (Update to non-existent building)', async () => {
      // Create a room first
      const createRes = await post('/api/rooms', adminToken, {
        building_id: EXISTING_BUILDING_ID,
        room_number: makeRoomNumber('BUB'),
        floor: 1,
        capacity: 4,
        room_fee: 1000000,
      }).expect(201);

      // Try to update to non-existent building
      await put(`/api/rooms/${createRes.body.id}`, adminToken, {
        building_id: NON_EXISTENT_ID,
      }).expect(404);
    });

    it('[BR-05] Không xóa được nếu phòng còn sinh viên (Room has active contracts)', async () => {
      const { room, created } = await ensureRoomWithOccupancy(1);

      try {
        await del(`/api/rooms/${room.id}`, adminToken).expect(409);
      } finally {
        if (created) {
          await cleanupRoom(room.id);
        }
      }
    });

    it('[BR-06] Không cho phép số sinh viên vượt quá capacity (Capacity validation)', async () => {
      const { room, created } = await ensureRoomWithOccupancy(2);

      try {
        const res = await put(`/api/rooms/${room.id}`, adminToken, {
          capacity: room.currentOccupancy - 1,
        }).expect(400);

        expect(res.body.message).toContain(
          'Capacity cannot be less than current occupancy',
        );
      } finally {
        if (created) {
          await cleanupRoom(room.id);
        }
      }
    });

    it('[BR-07] current occupancy luôn chính xác (Occupancy accuracy)', async () => {
      const { room, created } = await ensureRoomWithOccupancy(1);

      try {
        const res = await get(`/api/rooms/${room.id}`, adminToken).expect(200);

        expect(res.body).toHaveProperty('currentOccupancy');
        expect(typeof res.body.currentOccupancy).toBe('number');
        expect(res.body.currentOccupancy).toBeGreaterThanOrEqual(0);
      } finally {
        if (created) {
          await cleanupRoom(room.id);
        }
      }
    });

    it('[BR-08] available slots luôn bằng capacity - current occupancy', async () => {
      const { room, created } = await ensureRoomWithOccupancy(1);

      try {
        const res = await get(`/api/rooms/${room.id}`, adminToken).expect(200);

        const calculatedSlots = res.body.capacity - res.body.currentOccupancy;
        expect(res.body.availableSlots).toBe(Math.max(calculatedSlots, 0));
      } finally {
        if (created) {
          await cleanupRoom(room.id);
        }
      }
    });

    it('[BR-09] Search hoạt động (Search functionality)', async () => {
      const res = await get('/api/rooms?search=101', adminToken).expect(200);

      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('[BR-10] Filter hoạt động (Filter functionality)', async () => {
      const res = await get(
        `/api/rooms?building_id=${EXISTING_BUILDING_ID}&status=ACTIVE`,
        adminToken,
      ).expect(200);

      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('[BR-11] Pagination hoạt động (Pagination functionality)', async () => {
      const res = await get('/api/rooms?page=1&limit=3', adminToken).expect(
        200,
      );

      expect(res.body.page).toBe(1);
      expect(res.body.limit).toBe(3);
      expect(res.body.data.length).toBeLessThanOrEqual(3);
      expect(res.body.total).toBeGreaterThanOrEqual(0);
      expect(res.body.totalPages).toBeGreaterThanOrEqual(0);
    });
  });

  // ─── EDGE CASES ───────────────────────────────────────────────────────────

  describe('Edge Cases', () => {
    it('should handle empty search results gracefully', async () => {
      const res = await get(
        '/api/rooms?search=ZZZZNONEXISTENT',
        adminToken,
      ).expect(200);

      expect(res.body.data).toEqual([]);
      expect(res.body.total).toBe(0);
    });

    it('should handle very large page numbers gracefully', async () => {
      const res = await get('/api/rooms?page=99999', adminToken).expect(200);

      expect(res.body.data).toEqual([]);
      expect(res.body.total).toBeGreaterThanOrEqual(0);
    });

    it('should handle special characters in search', async () => {
      await get('/api/rooms?search=%3Cscript%3E', adminToken).expect(200);
    });
  });
});
