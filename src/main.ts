import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';
import session from 'express-session';
// somewhere in your initialization file

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
// somewhere in your initialization file
  app.use(cookieParser());
  app.use(
  session({
    secret: 'my-secret',
    resave: false,
    saveUninitialized: false,
  }),
);

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
