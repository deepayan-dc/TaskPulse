import { AuthResponse, LoginCredentials, RegisterCredentials } from '../types/auth';
import { apiFetch } from './api';

export const authService = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    
    const data = await response.json();
    
    return {
      accessToken: btoa(`${credentials.email}:${credentials.password}`),
      refreshToken: "",
      user: data.data,
    };
  },

  async register(credentials: RegisterCredentials): Promise<AuthResponse> {
    const response = await apiFetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    
    const data = await response.json();
    
    return {
      accessToken: btoa(`${credentials.email}:${credentials.password}`),
      refreshToken: "",
      user: data.data,
    };
  },

  async getEmployees(): Promise<Array<{ id: string; name: string; email: string; role: string }>> {
    const response = await apiFetch('/users');
    const data = await response.json();
    return data.data;
  },

  async onboardEmployees(csv: string, organizationName?: string): Promise<OnboardResult> {
    const response = await apiFetch('/users/onboard', {
      method: 'POST',
      body: JSON.stringify({ csv, organizationName }),
    });
    const data = await response.json();
    return data.data;
  },

  async resetPassword(newPassword: string): Promise<void> {
    await apiFetch('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ newPassword }),
    });
  },

  async updateOrganization(payload: { name?: string; logoUrl?: string | null }): Promise<{
    id: string;
    name: string;
    logoUrl?: string | null;
  }> {
    const response = await apiFetch('/users/organization', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    return (await response.json()).data;
  },

  async getTeam(): Promise<TeamMember[]> {
    const response = await apiFetch('/users/team');
    const data = await response.json();
    return data.data;
  },

  async deleteEmployee(id: string): Promise<{ id: string; name: string; email: string }> {
    const response = await apiFetch(`/users/${id}`, { method: 'DELETE' });
    const data = await response.json();
    return data.data;
  },

  async setMemberRole(id: string, role: 'ADMIN' | 'MEMBER'): Promise<void> {
    await apiFetch(`/users/${id}/role`, { method: 'PATCH', body: JSON.stringify({ role }) });
  },
};

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: 'ADMIN' | 'MEMBER';
  designation?: string | null;
  createdAt?: string;
}

export interface OnboardResult {
  organizationId: string;
  organizationName: string;
  created: Array<{ id: string; name: string; email: string; phone: string; designation: string; tempPassword: string }>;
  skipped: Array<{ row: number; email?: string; reason: string }>;
  errors: Array<{ row: number; email?: string; reason: string }>;
  summary: { total: number; created: number; skipped: number; errors: number };
}