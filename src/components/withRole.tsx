import React from 'react';
import { useAuth } from '@/context/AuthContext';
import type { UserRole } from '@/context/AuthContext';

interface WithRoleProps {
  allowedRoles: UserRole[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function WithRole({ allowedRoles, children, fallback = null }: WithRoleProps) {
  const auth = useAuth();

  if (!auth) {
    return null;
  }

  if (auth.loading) {
    return null; // Or a loading spinner
  }

  if (!auth.userData || !allowedRoles.includes(auth.userData.role)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

// Helper HOCs for specific roles
export function WithAdmin({ children, fallback }: Omit<WithRoleProps, 'allowedRoles'>) {
  return <WithRole allowedRoles={['admin']} fallback={fallback}>{children}</WithRole>;
}

export function WithManager({ children, fallback }: Omit<WithRoleProps, 'allowedRoles'>) {
  return <WithRole allowedRoles={['manager', 'admin']} fallback={fallback}>{children}</WithRole>;
}

export function WithEmployee({ children, fallback }: Omit<WithRoleProps, 'allowedRoles'>) {
  return <WithRole allowedRoles={['employee', 'manager', 'admin']} fallback={fallback}>{children}</WithRole>;
} 