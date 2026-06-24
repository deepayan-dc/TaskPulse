import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, LoginCredentials, RegisterCredentials } from '../types/auth';
import { authService } from '../services/auth.service';

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (credentials: RegisterCredentials) => Promise<void>;
  resetPassword: (newPassword: string) => Promise<void>;
  updateOrganization: (payload: { name?: string; logoUrl?: string | null }) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // Check local storage on mount
    const storedToken = localStorage.getItem('accessToken');
    const storedUser = localStorage.getItem('user');

    if (storedToken && storedUser) {
      try {
        setAccessToken(storedToken);
        setUser(JSON.parse(storedUser));
        setIsAuthenticated(true);
      } catch (e) {
        // Handle invalid JSON
        localStorage.removeItem('accessToken');
        localStorage.removeItem('user');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (credentials: LoginCredentials) => {
    try {
      const response = await authService.login(credentials);
      
      setUser(response.user);
      setAccessToken(response.accessToken);
      setIsAuthenticated(true);
      
      localStorage.setItem('accessToken', response.accessToken);
      localStorage.setItem('user', JSON.stringify(response.user));
    } catch (error) {
      throw error;
    }
  };

  const register = async (credentials: RegisterCredentials) => {
    try {
      const response = await authService.register(credentials);
      
      setUser(response.user);
      setAccessToken(response.accessToken);
      setIsAuthenticated(true);
      
      localStorage.setItem('accessToken', response.accessToken);
      localStorage.setItem('user', JSON.stringify(response.user));
    } catch (error) {
      throw error;
    }
  };

  const resetPassword = async (newPassword: string) => {
    if (!user) throw new Error('Not authenticated');
    await authService.resetPassword(newPassword);
    // The basic-auth token embeds the password, so recompute it, and clear the flag.
    const newToken = btoa(`${user.email}:${newPassword}`);
    const updatedUser = { ...user, mustResetPassword: false };
    setAccessToken(newToken);
    setUser(updatedUser);
    localStorage.setItem('accessToken', newToken);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  const updateOrganization = async (payload: { name?: string; logoUrl?: string | null }) => {
    if (!user) throw new Error('Not authenticated');
    const org = await authService.updateOrganization(payload);
    const updatedUser = { ...user, organization: org };
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  const logout = () => {
    setUser(null);
    setAccessToken(null);
    setIsAuthenticated(false);

    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
  };

  if (isLoading) {
    return <div className="min-h-screen bg-gray-950 flex items-center justify-center">Loading...</div>;
  }

  return (
    <AuthContext.Provider value={{ user, accessToken, isAuthenticated, login, register, resetPassword, updateOrganization, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
