import { apiFetch } from './client.js';
import type { LoginResponse, PublicMember } from '../types/api.js';

export const authApi = {
  login(username: string, password: string): Promise<LoginResponse> {
    return apiFetch<LoginResponse>('/auth/login', {
      method: 'POST',
      body: { username, password },
      anonymous: true,
    });
  },

  me(): Promise<PublicMember> {
    return apiFetch<PublicMember>('/auth/me');
  },

  logout(): Promise<void> {
    return apiFetch<void>('/auth/logout', { method: 'POST' });
  },
};
