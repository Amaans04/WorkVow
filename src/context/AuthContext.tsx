'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  User, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged, 
  sendPasswordResetEmail, 
  updateProfile,
  UserCredential
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  getDoc, 
  serverTimestamp, 
  DocumentData,
  collection
} from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

// Define user roles
export type UserRole = 'employee' | 'admin' | 'manager';

// Define user data interface
export interface UserData {
  uid: string;
  email: string | null;
  name: string | null;
  role: UserRole;
  joinedDate: any;
  isActive: boolean;
  profilePictureUrl?: string;
  lastLogin?: any;
}

// Define the shape of the context
interface AuthContextType {
  currentUser: User | null;
  userData: UserData | null;
  loading: boolean;
  signup: (email: string, password: string, name: string, role: UserRole) => Promise<UserCredential>;
  login: (email: string, password: string) => Promise<UserCredential>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateUserProfile: (name: string, photoURL?: string) => Promise<void>;
}

// Create the context with a default value
const AuthContext = createContext<AuthContextType | null>(null);

// Custom hook to use the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Props interface for AuthProvider
interface AuthProviderProps {
  children: ReactNode;
}

// AuthProvider component
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Create new user with email & password
  const signup = async (email: string, password: string, name: string, role: UserRole = 'employee'): Promise<UserCredential> => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    console.log("User created successfully:", userCredential.user.email);
    
    // Update profile with name
    await updateProfile(userCredential.user, { displayName: name });
    console.log("Profile updated with name:", name);
    
    // Create user document in Firestore with new schema
    const userDocData = {
      uid: userCredential.user.uid,
      email,
      name,
      role,
      joinedDate: serverTimestamp(),
      isActive: true,
      lastLogin: serverTimestamp()
    };
    
    console.log("Creating user document in Firestore:", userDocData);
    await setDoc(doc(db, 'users', userCredential.user.uid), userDocData);
    
    // Initialize the weekly stats subcollection
    const weeklyStatsRef = doc(db, `users/${userCredential.user.uid}/stats/weeklyAccomplishments/entries`, getWeekString());
    await setDoc(weeklyStatsRef, {
      tasksCompleted: 0,
      extraTasks: 0, 
      startDate: serverTimestamp(),
      endDate: getEndOfWeek()
    });
    
    // Initialize the monthly stats subcollection
    const monthlyStatsRef = doc(db, `users/${userCredential.user.uid}/stats/monthlyAccomplishments/entries`, getMonthString());
    await setDoc(monthlyStatsRef, {
      tasksCompleted: 0,
      extraTasks: 0,
      startDate: serverTimestamp(),
      endDate: getEndOfMonth()
    });
    
    console.log("User document and stats created successfully");
    
    // Update userData state
    setUserData(userDocData as UserData);
    
    return userCredential;
  };

  // Sign in with email & password
  const login = async (email: string, password: string): Promise<UserCredential> => {
    console.log("Logging in user:", email);
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    console.log("User logged in successfully:", userCredential.user.email);
    
    // Update last login time
    await setDoc(doc(db, 'users', userCredential.user.uid), {
      lastLogin: serverTimestamp()
    }, { merge: true });
    console.log("Updated lastLogin timestamp in Firestore");
    
    // Fetch user data to update context immediately
    try {
      const userDocRef = doc(db, 'users', userCredential.user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data() as UserData;
        console.log("User data fetched from Firestore:", userData);
        setUserData(userData);
      } else {
        console.log("No user document found in Firestore, creating one");
        // Create a basic user document if it doesn't exist
        const newUserData = {
          uid: userCredential.user.uid,
          email: userCredential.user.email,
          name: userCredential.user.displayName,
          role: 'employee' as UserRole,
          joinedDate: serverTimestamp(),
          isActive: true,
          lastLogin: serverTimestamp()
        };
        
        await setDoc(doc(db, 'users', userCredential.user.uid), newUserData);
        
        // Initialize weekly stats
        const weeklyStatsRef = doc(db, `users/${userCredential.user.uid}/stats/weeklyAccomplishments/entries`, getWeekString());
        await setDoc(weeklyStatsRef, {
          tasksCompleted: 0,
          extraTasks: 0,
          startDate: serverTimestamp(),
          endDate: getEndOfWeek()
        });
        
        // Initialize monthly stats
        const monthlyStatsRef = doc(db, `users/${userCredential.user.uid}/stats/monthlyAccomplishments/entries`, getMonthString());
        await setDoc(monthlyStatsRef, {
          tasksCompleted: 0,
          extraTasks: 0,
          startDate: serverTimestamp(),
          endDate: getEndOfMonth()
        });
        
        setUserData(newUserData as UserData);
      }
    } catch (error) {
      console.error("Error fetching user data after login:", error);
    }
    
    return userCredential;
  };

  // Sign out
  const logout = () => signOut(auth);

  // Reset password
  const resetPassword = (email: string) => sendPasswordResetEmail(auth, email);

  // Update user profile
  const updateUserProfile = async (name: string, photoURL?: string) => {
    if (!currentUser) throw new Error('No user is logged in');
    
    await updateProfile(currentUser, { 
      displayName: name, 
      photoURL: photoURL || currentUser.photoURL 
    });
    
    // Update Firestore document
    await setDoc(doc(db, 'users', currentUser.uid), {
      name
    }, { merge: true });
  };

  // Listen for auth state changes
  useEffect(() => {
    console.log("Setting up auth state change listener");
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log("Auth state changed:", user ? `User: ${user.email}` : "No user");
      setCurrentUser(user);
      
      if (user) {
        // Get user data from Firestore
        const userDocRef = doc(db, 'users', user.uid);
        try {
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            const data = userDoc.data() as UserData;
            console.log("User data retrieved from Firestore:", data);
            setUserData(data);
          } else {
            console.log("No user document found in Firestore");
            setUserData(null);
          }
        } catch (error) {
          console.error("Error retrieving user data:", error);
          setUserData(null);
        }
      } else {
        setUserData(null);
      }
      
      setLoading(false);
    });
    
    return unsubscribe;
  }, []);

  // Helper functions for date handling
  const getWeekString = (): string => {
    const now = new Date();
    const year = now.getFullYear();
    const weekNum = getWeekNumber(now);
    return `${year}-W${weekNum.toString().padStart(2, '0')}`;
  };
  
  const getMonthString = (): string => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    return `${year}-${month.toString().padStart(2, '0')}`;
  };
  
  const getWeekNumber = (date: Date): number => {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  };
  
  const getEndOfWeek = (): Date => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const daysToEndOfWeek = 6 - dayOfWeek; // 6 = Saturday (end of week)
    const endOfWeek = new Date(now);
    endOfWeek.setDate(now.getDate() + daysToEndOfWeek);
    endOfWeek.setHours(23, 59, 59, 999);
    return endOfWeek;
  };
  
  const getEndOfMonth = (): Date => {
    const now = new Date();
    // Last day of the current month
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    endOfMonth.setHours(23, 59, 59, 999);
    return endOfMonth;
  };

  // Define context value
  const value: AuthContextType = {
    currentUser,
    userData,
    loading,
    signup,
    login,
    logout,
    resetPassword,
    updateUserProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

// Use this context in components
export default AuthContext; 