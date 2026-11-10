import type { MonthKey } from '../domain/month';
import type { MonthSpending } from '../domain/spending';

export type SpendingPort = {
  getMonth(organizationId: string, month: MonthKey): Promise<MonthSpending>;
};
