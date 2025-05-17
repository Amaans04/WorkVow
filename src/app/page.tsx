'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function HomePage() {
  const router = useRouter();
  const auth = useAuth();

  useEffect(() => {
    console.log("Root page effect running:", { 
      user: auth?.currentUser?.email, 
      loading: auth?.loading, 
      userData: auth?.userData 
    });

    if (!auth) return;

    if (!auth.loading) {
      if (auth.currentUser && auth.userData) {
        // User is logged in, redirect based on role
        if (auth.userData.role === 'admin') {
          router.replace('/admin/dashboard');
        } else {
          router.replace('/dashboard');
        }
      } else {
        // User is not logged in
        router.replace('/login');
      }
    }
  }, [auth, router]);

  if (!auth) {
    return null;
  }

  if (auth.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return null;
}
