import { apiGet } from './client';

export function fetchDashboardSummary() {
  return apiGet('/dashboard/summary');
}
