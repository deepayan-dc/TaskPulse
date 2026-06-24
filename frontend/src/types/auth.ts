// Permission role within TaskPulse (independent of job designation).
export type Role = 'ADMIN' | 'MEMBER';

export interface Organization {
  id: string;
  name: string;
  logoUrl?: string | null;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  designation?: string | null;
  phone?: string | null;
  mustResetPassword?: boolean;
  organization?: Organization | null;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken?: string;
}

export interface LoginCredentials {
  email: string;
  password?: string;
}

export interface RegisterCredentials {
  email: string;
  password?: string;
  name?: string;
  phone?: string;
  organizationName: string;
  designation?: string;
}
