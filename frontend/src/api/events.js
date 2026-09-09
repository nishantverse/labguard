import { apiGet } from './client';

export function fetchEvents(params) {
  return apiGet('/events', params);
}

export function fetchEvent(id) {
  return apiGet(`/events/${id}`);
}
