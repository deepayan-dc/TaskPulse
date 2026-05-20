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
};