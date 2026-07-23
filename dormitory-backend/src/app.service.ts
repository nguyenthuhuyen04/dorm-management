import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class AppService implements OnModuleInit {
  private readonly logger = new Logger(AppService.name);

  constructor(private readonly dataSource: DataSource) {}

  async onModuleInit() {
    if (this.dataSource.isInitialized) {
      this.logger.log(
        `Database connection successful to ${this.dataSource.options.database ?? 'MySQL'}`,
      );
    }
  }

  getHello(): string {
    return 'Hello World!';
  }
}
