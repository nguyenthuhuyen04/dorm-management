import { ConfigService } from '@nestjs/config';
import { getDatabaseConfig } from './database.config';

describe('getDatabaseConfig', () => {
  it('uses DB_DATABASE when DB_NAME is not set', () => {
    const configService = {
      get: jest.fn((key: string) => {
        switch (key) {
          case 'DB_HOST':
            return 'localhost';
          case 'DB_PORT':
            return '3306';
          case 'DB_USERNAME':
            return 'root';
          case 'DB_PASSWORD':
            return 'secret';
          case 'DB_DATABASE':
            return 'test_db';
          case 'DB_SSL':
            return 'true';
          case 'DB_SSL_REJECT_UNAUTHORIZED':
            return 'false';
          default:
            return undefined;
        }
      }),
    } as unknown as ConfigService;

    const config = getDatabaseConfig(configService) as any;

    expect(config.host).toBe('localhost');
    expect(config.port).toBe(3306);
    expect(config.username).toBe('root');
    expect(config.password).toBe('secret');
    expect(config.database).toBe('test_db');
    expect(config.ssl).toEqual({ rejectUnauthorized: false });
  });
});
