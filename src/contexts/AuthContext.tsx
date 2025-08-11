import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiClient, User } from '@/lib/api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  // login: (email: string, password: string) => Promise<boolean>;
  login: (employeeId: string, password: string) => Promise<{ success: boolean; user: User | null }>; // MODIFIED LINE
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  isAuthenticated: boolean;
  isPending: boolean;
  isRejected: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// export const useAuth = () => {
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshUser = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.getCurrentUser();
      if (response.success && response.data) {
        setUser(response.data);
      } else {
        setUser(null);
        apiClient.setToken(null);
      }
    } catch (err) {
      console.error('Failed to refresh user:', err);
      setUser(null);
      apiClient.setToken(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (employeeId: string, password: string): Promise<{ success: boolean; user: User | null }> => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.login({ employee_id: employeeId, password });
      if (response.success && response.data) {
        apiClient.setToken(response.data.token);
        setUser(response.data.user);
        console.log(
          `User logged in successfully: ${response.data.user.employee_id} (Role: ${response.data.user.role})`
        );
        return { success: true, user: response.data.user }; // MODIFIED LINE
      } else {
        setError(response.error || 'Login failed');
        return { success: false, user: null }; // MODIFIED LINE
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(err instanceof Error ? err.message : 'Login failed');
      return { success: false, user: null }; // MODIFIED LINE
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await apiClient.logout();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      const loggedOutId = user?.employee_id || 'N/A';
      const loggedOutRole = user?.role || 'N/A';
      setUser(null);
      apiClient.setToken(null);
      console.log(
        `User logged out successfully. (ID: ${loggedOutId}, Role: ${loggedOutRole})`
      );
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      apiClient.setToken(token);
      refreshUser();
    } else {
      setLoading(false);
    }
  }, []);
  // Add a second useEffect to handle HMR token restoration
  useEffect(() => {
    // During development, if we lose auth state but have a token, restore it
    if (process.env.NODE_ENV === 'development' && !user && !loading) {
      const token = localStorage.getItem('auth_token');
      if (token) {
        console.log('HMR detected: Restoring authentication state');
        apiClient.setToken(token);
        refreshUser();
      }
    }
  }, [user, loading]);

  const value: AuthContextType = {
    user,
    loading,
    error,
    login,
    logout,
    refreshUser,
    isAuthenticated: !!user && !user.is_anonymous && user.approval_status === 'approved',
    isPending: !!user && user.approval_status === 'pending',
    isRejected: !!user && user.approval_status === 'rejected',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
