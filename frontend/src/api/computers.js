import { apiGet } from './client';

export function fetchComputers() {
  return apiGet('/computers');
}

export function fetchComputer(id) {
  return apiGet(`/computers/${id}`);
}
