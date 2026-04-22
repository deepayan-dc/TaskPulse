import { AuthResponse, LoginCredentials } from '../types/auth';

export const authService = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    // TEMP MOCK LOGIN (no backend needed)
    const MOCK_USERS = [
      { id: '1', name: 'Rajesh Gupta', email: 'manager1@test.com', role: 'MANAGER' },
      { id: '2', name: 'Anita Sharma', email: 'manager2@test.com', role: 'MANAGER' },
      { id: '3', name: 'Vikram Patel', email: 'employee1@test.com', role: 'EMPLOYEE' },
      { id: '4', name: 'Priya Singh', email: 'employee2@test.com', role: 'EMPLOYEE' },
      { id: '5', name: 'Arjun Mehta', email: 'employee3@test.com', role: 'EMPLOYEE' },
    ];

    const user = MOCK_USERS.find(u => u.email === credentials.email);
    if (!user) throw new Error('Invalid email or password');

    return {
      accessToken: "dummy-token",
      refreshToken: "",
      user: user as any, // Cast to match AuthResponse structure
    };
  },
};