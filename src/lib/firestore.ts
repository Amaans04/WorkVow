import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  Timestamp,
  orderBy,
  limit
} from 'firebase/firestore';
import { db } from './firebase';
import type {
  User,
  Commitment,
  DailyReport,
  Prospect,
  Meeting,
  Closure,
  Followup,
  PerformanceScore,
  Target
} from '../types/firestore';

// Users Collection
export const usersCollection = collection(db, 'users');

export const getUser = async (userId: string): Promise<User | null> => {
  const docRef = doc(usersCollection, userId);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } as User : null;
};

export const getUsersByManager = async (managerId: string): Promise<User[]> => {
  const q = query(usersCollection, where('manager_id', '==', managerId));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
};

// Commitments Collection
export const commitmentsCollection = collection(db, 'commitments');

export const getCommitmentsByUser = async (userId: string, startDate: Date, endDate: Date): Promise<Commitment[]> => {
  const q = query(
    commitmentsCollection,
    where('user_id', '==', userId),
    where('date', '>=', Timestamp.fromDate(startDate)),
    where('date', '<=', Timestamp.fromDate(endDate)),
    orderBy('date', 'desc')
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Commitment));
};

// Daily Reports Collection
export const dailyReportsCollection = collection(db, 'daily_reports');

export const getDailyReportsByUser = async (userId: string, startDate: Date, endDate: Date): Promise<DailyReport[]> => {
  const q = query(
    dailyReportsCollection,
    where('user_id', '==', userId),
    where('date', '>=', Timestamp.fromDate(startDate)),
    where('date', '<=', Timestamp.fromDate(endDate)),
    orderBy('date', 'desc')
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DailyReport));
};

// Prospects Collection
export const prospectsCollection = collection(db, 'prospects');

export const getProspectsByUser = async (userId: string): Promise<Prospect[]> => {
  const q = query(prospectsCollection, where('user_id', '==', userId));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Prospect));
};

// Meetings Collection
export const meetingsCollection = collection(db, 'meetings');

export const getMeetingsByProspect = async (prospectId: string): Promise<Meeting[]> => {
  const q = query(meetingsCollection, where('prospect_id', '==', prospectId));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Meeting));
};

// Closures Collection
export const closuresCollection = collection(db, 'closures');

export const getClosuresByProspect = async (prospectId: string): Promise<Closure[]> => {
  const q = query(closuresCollection, where('prospect_id', '==', prospectId));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Closure));
};

// Followups Collection
export const followupsCollection = collection(db, 'followups');

export const getFollowupsByProspect = async (prospectId: string): Promise<Followup[]> => {
  const q = query(followupsCollection, where('prospect_id', '==', prospectId));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Followup));
};

// Performance Scores Collection
export const performanceScoresCollection = collection(db, 'performance_scores');

export const getPerformanceScoresByUser = async (userId: string, period: string): Promise<PerformanceScore[]> => {
  const q = query(
    performanceScoresCollection,
    where('user_id', '==', userId),
    where('period', '==', period)
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PerformanceScore));
};

// Targets Collection
export const targetsCollection = collection(db, 'targets');

export const getTargetsByUser = async (userId: string, month: string): Promise<Target[]> => {
  const q = query(
    targetsCollection,
    where('user_id', '==', userId),
    where('month', '==', month)
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Target));
};

export const getGlobalTargets = async (month: string): Promise<Target[]> => {
  const q = query(
    targetsCollection,
    where('user_id', '==', null),
    where('month', '==', month)
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Target));
}; 