const { Test } = require('@nestjs/testing');
const { ValidationPipe } = require('@nestjs/common');
const request = require('supertest');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const { AppModule } = require('./src/app.module');

(async () => {
  const moduleFixture = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  const app = moduleFixture.createNestApplication();
  app.setGlobalPrefix('api');
  app.enableCors({ origin: true, credentials: true });
  app.use(cookieParser());
  app.use(
    session({
      secret: process.env.SESSION_SECRET || 'sessionSecret',
      resave: false,
      saveUninitialized: false,
      cookie: { httpOnly: true, sameSite: 'lax' },
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

  const loginRes = await request(app.getHttpServer())
    .post('/api/auth/login')
    .send({ identifier: 'admin', password: 'Admin123!' });
  console.log('login status', loginRes.status);
  console.log('login body', JSON.stringify(loginRes.body));
  const token = loginRes.body.accessToken;

  const payload = {
    invoice_code: 'INV-DEBUG-' + Date.now(),
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
  };

  const res2 = await request(app.getHttpServer())
    .post('/api/payments')
    .set('Authorization', `Bearer ${token}`)
    .send(payload);
  console.log('create status', res2.status);
  console.log('create body', JSON.stringify(res2.body));
  await app.close();
})();
