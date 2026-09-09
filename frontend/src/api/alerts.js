import { apiGet, apiPatch } from './client';

export function fetchAlerts(params) {
  return apiGet('/alerts', params);
}

export function fetchAlert(id) {
  return apiGet(`/alerts/${id}`);
}

export function acknowledgeAlert(id) {
  return apiPatch(`/alerts/${id}/acknowledge`);
}
