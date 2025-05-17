import { useEffect, useState } from 'react';
import { 
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import { getUser } from '../lib/firestore';
import type { User, UserRole } from '../types/firestore';

interface AuthState {
  user: User | null;
  loading: boolean;
  error: Error | null;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (firebaseUser: FirebaseUser | null) => {
        try {
          if (firebaseUser) {
            const userData = await getUser(firebaseUser.uid);
            setState({
              user: userData,
              loading: false,
              error: null,
            });
          } else {
            setState({
              user: null,
              loading: false,
              error: null,
            });
          }
        } catch (error) {
          setState({
            user: null,
            loading: false,
            error: error as Error,
          });
        }
      },
      (error) => {
        setState({
          user: null,
          loading: false,
          error: error as Error,
        });
      }
    );

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      throw error;
    }
  };

  const hasRole = (role: UserRole) => {
    return state.user?.role === role;
  };

  const isAdmin = () => hasRole('admin');
  const isManager = () => hasRole('manager');
  const isEmployee = () => hasRole('employee');

  return {
    ...state,
    login,
    logout,
    hasRole,
    isAdmin,
    isManager,
    isEmployee,
  };
} 