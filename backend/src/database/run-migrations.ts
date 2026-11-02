import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { AppModule } from '../app.module';

async function runMigrations() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn', 'log'] });
  try {
    const dataSource = app.get(DataSource);
    const migrations = await dataSource.runMigrations({ transaction: 'all' });
    for (const migration of migrations) console.log(`Applied ${migration.name}`);
    if (migrations.length === 0) console.log('Database schema is already up to date.');
  } finally {
    await app.close();
  }
}

void runMigrations().catch((error: unknown) => {
  console.error('Database migrations failed:', error);
  process.exitCode = 1;
});
