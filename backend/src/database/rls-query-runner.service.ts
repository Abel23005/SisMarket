import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource, QueryRunner } from 'typeorm';
import { TenantContextService } from './tenant-context.service';

@Injectable()
export class RlsQueryRunnerService implements OnModuleInit {
  constructor(
    private readonly dataSource: DataSource,
    private readonly config: ConfigService,
    private readonly tenantContext: TenantContextService,
  ) {}

  onModuleInit() {
    if (this.config.get<string>('DB_RLS_CONTEXT', 'true') !== 'true') return;

    const originalCreateQueryRunner = this.dataSource.createQueryRunner.bind(this.dataSource);
    this.dataSource.createQueryRunner = ((mode?: 'master' | 'slave') => {
      const runner = originalCreateQueryRunner(mode);
      this.patchQueryRunner(runner);
      return runner;
    }) as DataSource['createQueryRunner'];
  }

  private patchQueryRunner(runner: QueryRunner) {
    const originalQuery = runner.query.bind(runner);
    const originalRelease = runner.release.bind(runner);
    const originalStartTransaction = runner.startTransaction.bind(runner);
    let appliedContext: string | null = null;
    runner.query = (async (query: string, parameters?: unknown[], useStructuredResult?: boolean) => {
      const context = this.tenantContext.current();
      const encodedContext = context ? JSON.stringify(this.tenantContext.toDatabaseClaims(context)) : null;
      if (encodedContext !== appliedContext) {
        if (encodedContext) await originalQuery("SELECT set_config('app.sismarket_context', $1, false)", [encodedContext]);
        else if (appliedContext) await originalQuery('RESET app.sismarket_context');
        appliedContext = encodedContext;
      }
      return useStructuredResult ? originalQuery(query, parameters, true) : originalQuery(query, parameters);
    }) as QueryRunner['query'];
    runner.startTransaction = (async (isolationLevel?: Parameters<QueryRunner['startTransaction']>[0]) => {
      await originalStartTransaction(isolationLevel);
      const context = this.tenantContext.current();
      if (context) {
        const encodedContext = JSON.stringify(this.tenantContext.toDatabaseClaims(context));
        await originalQuery("SELECT set_config('app.sismarket_context', $1, true)", [encodedContext]);
        appliedContext = encodedContext;
      }
    }) as QueryRunner['startTransaction'];
    runner.release = (async () => {
      if (runner.isTransactionActive) await originalQuery('ROLLBACK').catch(() => undefined);
      if (appliedContext) await originalQuery('RESET app.sismarket_context').catch(() => undefined);
      appliedContext = null;
      return originalRelease();
    }) as QueryRunner['release'];
  }
}
