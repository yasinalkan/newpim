import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User } from '../types';
import { initialUsers } from '../data/mockData';

interface AuthContextType {
  currentUser: User | null;
  users: User[];
  login: (email: string, password: string) => boolean;
  logout: () => void;
  switchUser: (userId: number) => void;
  hasPermission: (page: string, permissionType: 'view' | 'edit' | 'update' | 'pageAccess') => boolean;
  createUser: (user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateUser: (userId: number, updates: Partial<User>) => void;
  deleteUser: (userId: number) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>(initialUsers);

  // Auto-login admin user by default (login disabled for testing)
  useEffect(() => {
    // Auto-login admin user by default - login feature disabled for testing
    const adminUser = initialUsers.find(u => u.id === 1 && u.status === 'active');
    if (adminUser && !currentUser) {
      setCurrentUser(adminUser);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

  // Save to localStorage when user changes
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('currentUserId', currentUser.id.toString());
    } else {
      localStorage.removeItem('currentUserId');
    }
  }, [currentUser]);

  const login = (email: string, password: string): boolean => {
    const user = users.find(u => u.email === email && u.password === password && u.status === 'active');
    if (user) {
      const updatedUser = { ...user, lastLogin: new Date().toISOString() };
      setCurrentUser(updatedUser);
      setUsers(users.map(u => u.id === user.id ? updatedUser : u));
      return true;
    }
    return false;
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('currentUserId');
  };

  const switchUser = (userId: number) => {
    const user = users.find(u => u.id === userId && u.status === 'active');
    if (user) {
      setCurrentUser(user);
    }
  };

  const hasPermission = (page: string, permissionType: 'view' | 'edit' | 'update' | 'pageAccess'): boolean => {
    if (!currentUser) return false;
    
    // Admins have all permissions
    if (currentUser.role === 'admin') return true;
    
    // Standard users check specific permissions
    if (currentUser.permissions && currentUser.permissions[page]) {
      return currentUser.permissions[page][permissionType] || false;
    }
    
    return false;
  };

  const createUser = (userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newUser: User = {
      ...userData,
      id: Math.max(...users.map(u => u.id)) + 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setUsers([...users, newUser]);
  };

  const updateUser = (userId: number, updates: Partial<User>) => {
    setUsers(users.map(u => 
      u.id === userId 
        ? { ...u, ...updates, updatedAt: new Date().toISOString() }
        : u
    ));
    
    // Update current user if it's being edited
    if (currentUser?.id === userId) {
      setCurrentUser({ ...currentUser, ...updates, updatedAt: new Date().toISOString() });
    }
  };

  const deleteUser = (userId: number) => {
    if (currentUser?.id === userId) {
      // Cannot delete current user
      return;
    }
    setUsers(users.filter(u => u.id !== userId));
  };

  return (
    <AuthContext.Provider value={{
      currentUser,
      users,
      login,
      logout,
      switchUser,
      hasPermission,
      createUser,
      updateUser,
      deleteUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
};


