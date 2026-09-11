import { apiGet, apiDelete } from './client';

export function fetchComputers() {
  return apiGet('/computers');
}

export function fetchComputer(id) {
  return apiGet(`/computers/${id}`);
}

export function deleteComputer(id) {
  return apiDelete(`/computers/${id}`);
}
