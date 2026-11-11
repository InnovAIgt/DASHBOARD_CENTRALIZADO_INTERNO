import React, { createContext, useContext, useState, useEffect } from 'react';
import { CONFIG } from '../config/env';
import { User, CountryCode, UserRole } from '../types';

interface AuthContextType {
  currentUser: User | null;
  isAuthenticated: boolean;
  isMaster: boolean;
  isGuatemalaMaster: boolean;
  isSalvadorMaster: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  usersList: User[];
  createUser: (user: Omit<User, 'createdAt' | 'active'>) => { success: boolean; message?: string };
  toggleUserStatus: (username: string) => void;
  deleteUser: (username: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SEED_USERS: User[] = [
  {
    username: CONFIG.AUTH.masterUsername,
    name: 'Master Admin INTELFON',
    email: CONFIG.AUTH.masterEmail,
    role: 'master',
    region: 'GLOBAL',
    password: CONFIG.AUTH.masterPassword,
    active: true,
    createdAt: '2026-01-01'
  },
  {
    username: 'masterguatemala',
    name: 'Master Guatemala (GT)',
    email: 'masterguatemala@intelfon.com',
    role: 'admin',
    region: 'GT',
    password: CONFIG.AUTH.masters[0].password,
    active: true,
    createdAt: '2026-01-15'
  },
  {
    username: 'mastersalvador',
    name: 'Master El Salvador (SV)',
    email: 'mastersalvador@intelfon.com',
    role: 'admin',
    region: 'SV',
    password: CONFIG.AUTH.masters[1].password,
    active: true,
    createdAt: '2026-01-15'
  },
  {
    username: 'analista.financiero',
    name: 'Carlos Mendoza',
    email: 'cmendoza@intelfon.com',
    role: 'analyst',
    region: 'GLOBAL',
    password: 'Intelfon2026!',
    active: true,
    createdAt: '2026-02-01'
  }
];

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem(CONFIG.AUTH.sessionKey) || sessionStorage.getItem(CONFIG.AUTH.sessionKey);
      return stored ? JSON.parse(stored) : null;
    } catch (_) {
      return null;
    }
  });

  const [usersList, setUsersList] = useState<User[]>(() => {
    try {
      const stored = localStorage.getItem(CONFIG.AUTH.usersListKey);
      if (stored) {
        const parsed: User[] = JSON.parse(stored);
        // Ensure seeds are present
        const usernames = new Set(parsed.map(u => u.username.toLowerCase()));
        const missing = SEED_USERS.filter(s => !usernames.has(s.username.toLowerCase()));
        return [...parsed, ...missing];
      }
    } catch (_) {}
    return SEED_USERS;
  });

  useEffect(() => {
    try {
      localStorage.setItem(CONFIG.AUTH.usersListKey, JSON.stringify(usersList));
    } catch (_) {}
  }, [usersList]);

  const login = async (username: string, password: string): Promise<{ success: boolean; message?: string }> => {
    const cleanUser = username.trim() || 'F';
    const sessionUser: User = {
      username: cleanUser.toLowerCase(),
      name: cleanUser === 'F' ? 'F' : (cleanUser.charAt(0).toUpperCase() + cleanUser.slice(1)),
      email: `${cleanUser.toLowerCase()}@intelfon.com`,
      role: 'master',
      region: 'GLOBAL',
      active: true
    };

    setCurrentUser(sessionUser);
    localStorage.setItem(CONFIG.AUTH.sessionKey, JSON.stringify(sessionUser));

    return { success: true };
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem(CONFIG.AUTH.sessionKey);
    sessionStorage.removeItem(CONFIG.AUTH.sessionKey);
  };

  const createUser = (newUser: Omit<User, 'createdAt' | 'active'>): { success: boolean; message?: string } => {
    const exists = usersList.some(
      u => u.username.toLowerCase() === newUser.username.trim().toLowerCase() ||
           u.email.toLowerCase() === newUser.email.trim().toLowerCase()
    );

    if (exists) {
      return { success: false, message: 'Ya existe un usuario con este nombre de usuario o correo.' };
    }

    const created: User = {
      ...newUser,
      username: newUser.username.trim().toLowerCase(),
      email: newUser.email.trim().toLowerCase(),
      createdAt: new Date().toISOString().split('T')[0],
      active: true
    };

    setUsersList(prev => [...prev, created]);
    return { success: true };
  };

  const toggleUserStatus = (username: string) => {
    if (username.toLowerCase() === CONFIG.AUTH.masterUsername.toLowerCase()) return;
    setUsersList(prev => prev.map(u => {
      if (u.username.toLowerCase() === username.toLowerCase()) {
        return { ...u, active: !u.active };
      }
      return u;
    }));
  };

  const deleteUser = (username: string) => {
    if (username.toLowerCase() === CONFIG.AUTH.masterUsername.toLowerCase()) return;
    setUsersList(prev => prev.filter(u => u.username.toLowerCase() !== username.toLowerCase()));
  };

  const isMaster = currentUser?.role === 'master' || currentUser?.username === CONFIG.AUTH.masterUsername;
  const isGuatemalaMaster = currentUser?.username === 'masterguatemala';
  const isSalvadorMaster = currentUser?.username === 'mastersalvador';

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAuthenticated: !!currentUser,
        isMaster,
        isGuatemalaMaster,
        isSalvadorMaster,
        login,
        logout,
        usersList,
        createUser,
        toggleUserStatus,
        deleteUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
