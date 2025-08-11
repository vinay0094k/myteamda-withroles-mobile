
import React from 'react';
import { useRole } from '@/contexts/RoleContext';
import { UserRole } from '@/types/roles';

interface RoleBasedAccessProps {
  requiredRoles: UserRole[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

const RoleBasedAccess: React.FC<RoleBasedAccessProps> = ({
  requiredRoles,
  children,
  fallback = null
}) => {
  const { canAccess } = useRole();

  if (canAccess(requiredRoles)) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
};

export default RoleBasedAccess;
