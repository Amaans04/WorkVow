'use client';

import React, { useEffect, useState, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { UserRole } from '@/context/AuthContext';

interface RouteGuardProps {
  children: ReactNode;
  allowedRoles?: UserRole[];
}

const publicRoutes = ['/login', '/register', '/forgot-password'];

export default function RouteGuard({ children, allowedRoles = [] }: RouteGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const auth = useAuth();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    if (!auth) return;

    // Check if route is private and user is not logged in
    if (!auth.loading) {
      if (!auth.currentUser) {
        setAuthorized(false);
        router.push('/login');
      } else if (allowedRoles.length > 0 && auth.userData) {
        // Check if user has required role
        if (!allowedRoles.includes(auth.userData.role)) {
          setAuthorized(false);
          router.push('/dashboard');
        } else {
          setAuthorized(true);
        }
      } else {
        setAuthorized(true);
      }
    }
  }, [auth, router, pathname, allowedRoles]);

  if (!auth) {
    return null;
  }

  if (auth.loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return authorized ? <>{children}</> : null;
} 