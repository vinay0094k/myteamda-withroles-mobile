
import React, { createContext, useContext, ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types/roles';

// export type UserRole = 'admin' | 'hr' | 'manager' | 'team-lead' | 'employee';

interface RoleContextType {
  userRole: UserRole;
  isAdmin: boolean;
  isHR: boolean;
  isManager: boolean;
  isTeamLead: boolean;
  isEmployee: boolean;
  hasRole: (roles: UserRole[]) => boolean;
  canAccess: (requiredRoles: UserRole[]) => boolean;
}


const RoleContext = createContext<RoleContextType | undefined>(undefined);


export const useRole = () => {
  const context = useContext(RoleContext);
  if (context === undefined) {
    throw new Error('useRole must be used within a RoleProvider');
  }
  return context;
};

interface RoleProviderProps {
  children: ReactNode;
}

export const RoleProvider: React.FC<RoleProviderProps> = ({ children }) => {
  const { user } = useAuth();
  // const authContext = useAuth();
  // const { user } = authContext;

  const userRole: UserRole = user?.role || 'employee';
  
  const isAdmin = userRole === 'admin';
  const isHR = userRole === 'hr';
  const isManager = userRole === 'manager';
  const isTeamLead = userRole === 'team-lead';
  const isEmployee = userRole === 'employee';

  const hasRole = (roles: UserRole[]): boolean => {
    return roles.includes(userRole);
  };

  const canAccess = (requiredRoles: UserRole[]): boolean => {
    // Admin can access everything
    if (isAdmin) return true;
    
    // HR can access most things except admin-only
    if (isHR && !requiredRoles.includes('admin')) return true;
    
    // Manager can access manager, team-lead, and employee features
    if (isManager && requiredRoles.some(role => ['manager', 'team-lead', 'employee'].includes(role))) return true;
    
    // Team lead can access team-lead and employee features
    if (isTeamLead && requiredRoles.some(role => ['team-lead', 'employee'].includes(role))) return true;
    
    // Employee can only access employee features
    if (isEmployee && requiredRoles.includes('employee')) return true;
    
    return false;
  };

  const value: RoleContextType = {
    userRole,
    isAdmin,
    isHR,
    isManager,
    isTeamLead,
    isEmployee,
    hasRole,
    canAccess,
  };

  return (
    <RoleContext.Provider value={value}>
      {children}
    </RoleContext.Provider>
  );
};

/////////////////////////////////////////////////////////////////////////////////////////////////
// src/contexts/RoleContext.tsx
// import React, { createContext, useContext, ReactNode } from 'react';
// import { useAuth } from '@/contexts/AuthContext';
// import { UserRole } from '@/types/roles';

// export type RoleContextType = {
//   hasRole: (roles: UserRole[]) => boolean;
//   canAccess: (requiredRoles: UserRole[]) => boolean;
// };

// const RoleContext = createContext<RoleContextType | undefined>(undefined);

// // Now useAuth() is only called inside this hook, which is used inside components:
// export const useRole = (): RoleContextType => {
//   // THIS is valid: useAuth() runs inside a React component/hook call
//   const { user } = useAuth();
//   const userRole: UserRole = user?.role || 'employee';

//   const isAdmin = userRole === 'admin';
//   const isHR = userRole === 'hr';
//   const isManager = userRole === 'manager';
//   const isTeamLead = userRole === 'team-lead';
//   const isEmployee = userRole === 'employee';

//   const hasRole = (roles: UserRole[]): boolean => roles.includes(userRole);

//   const canAccess = (requiredRoles: UserRole[]): boolean => {
//     if (isAdmin) return true;
//     if (isHR && !requiredRoles.includes('admin')) return true;
//     if (isManager && requiredRoles.some(r => ['manager','team-lead','employee'].includes(r))) return true;
//     if (isTeamLead && requiredRoles.some(r => ['team-lead','employee'].includes(r))) return true;
//     if (isEmployee && requiredRoles.includes('employee')) return true;
//     return false;
//   };

//   return { hasRole, canAccess };
// };

// // You no longer need a provider! Consumers just call useRole()
// export const RoleProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
//   // Provide dummy functions so that context is never undefined:
//   const dummy: RoleContextType = {
//     hasRole: () => false,
//     canAccess: () => false,
//   };
//   return (
//     <RoleContext.Provider value={dummy}>
//       {children}
//     </RoleContext.Provider>
//   );
// };
