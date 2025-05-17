import { 
  collection, 
  getDocs, 
  doc, 
  getDoc, 
  setDoc, 
  query, 
  where, 
  Timestamp, 
  serverTimestamp,
  writeBatch,
  limit
} from 'firebase/firestore';
import { db } from './firebase';

/**
 * Utility to migrate data from old schema to new schema
 * Old schema:
 * - users, commitments, user_stats, reports as root collections
 * 
 * New schema:
 * - users as root collection
 * - users/{userId}/commitments/daily/{date} for daily commitments
 * - users/{userId}/commitments/weekly/{weekId} for weekly commitments
 * - users/{userId}/commitments/monthly/{monthId} for monthly commitments
 * - users/{userId}/stats/weeklyAccomplishments/entries/{weekId} for weekly stats
 * - users/{userId}/stats/monthlyAccomplishments/entries/{monthId} for monthly stats
 * - users/{userId}/reports/{date} for reports
 */

/**
 * Helper function to get week string from date
 */
const getWeekString = (date: Date): string => {
  const year = date.getFullYear();
  const weekNum = getWeekNumber(date);
  return `${year}-W${weekNum.toString().padStart(2, '0')}`;
};

/**
 * Helper function to get month string from date
 */
const getMonthString = (date: Date): string => {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  return `${year}-${month.toString().padStart(2, '0')}`;
};

/**
 * Helper function to get week number of a date
 */
const getWeekNumber = (date: Date): number => {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
};

/**
 * Helper function to get the end of a week
 */
const getEndOfWeek = (date: Date): Date => {
  const dayOfWeek = date.getDay();
  const daysToEndOfWeek = 6 - dayOfWeek; // 6 = Saturday (end of week)
  const endOfWeek = new Date(date);
  endOfWeek.setDate(date.getDate() + daysToEndOfWeek);
  endOfWeek.setHours(23, 59, 59, 999);
  return endOfWeek;
};

/**
 * Helper function to get the end of a month
 */
const getEndOfMonth = (date: Date): Date => {
  const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  endOfMonth.setHours(23, 59, 59, 999);
  return endOfMonth;
};

/**
 * Migrate users from old schema to new schema
 */
const migrateUsers = async (): Promise<void> => {
  console.log('Migrating users...');
  
  try {
    const usersRef = collection(db, 'users');
    const userSnapshot = await getDocs(usersRef);
    
    for (const userDoc of userSnapshot.docs) {
      const userData = userDoc.data();
      
      // Update user document to match new schema
      await setDoc(doc(db, 'users', userDoc.id), {
        uid: userDoc.id,
        email: userData.email,
        name: userData.displayName || userData.name,
        role: userData.role || 'employee',
        joinedDate: userData.createdAt || serverTimestamp(),
        isActive: true,
        profilePictureUrl: userData.photoURL || null,
        lastLogin: userData.lastLogin || serverTimestamp(),
        // Remove stats from user document
      }, { merge: true });
      
      console.log(`Migrated user ${userDoc.id}`);
    }
    
    console.log('Users migration completed');
  } catch (error) {
    console.error('Error migrating users:', error);
  }
};

/**
 * Migrate commitments from old schema to new schema
 */
const migrateCommitments = async (): Promise<void> => {
  console.log('Migrating commitments...');
  
  try {
    const commitmentsRef = collection(db, 'commitments');
    const commitmentSnapshot = await getDocs(commitmentsRef);
    
    for (const commitmentDoc of commitmentSnapshot.docs) {
      const commitmentData = commitmentDoc.data();
      const userId = commitmentData.userId;
      
      if (!userId) {
        console.log(`Skipping commitment ${commitmentDoc.id} - no userId`);
        continue;
      }
      
      const date = commitmentData.date?.toDate() || new Date();
      const dateStr = date.toISOString().split('T')[0];
      const weekStr = getWeekString(date);
      const monthStr = getMonthString(date);
      
      // Create daily commitment
      await setDoc(doc(db, `users/${userId}/commitments/daily/${dateStr}`), {
        target: commitmentData.callsToBeMade || 0,
        achieved: commitmentData.actualCalls || 0,
        startDate: commitmentData.date || Timestamp.fromDate(date),
        endDate: Timestamp.fromDate(new Date(date.setHours(23, 59, 59, 999))),
        status: commitmentData.status || 'pending',
        dayOfWeek: date.getDay(),
        dayOfMonth: date.getDate(),
        expectedClosures: commitmentData.expectedClosures?.length || 0,
        totalExpectedRevenue: commitmentData.totalExpectedRevenue || 0,
        createdAt: commitmentData.date || serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      // Check if weekly commitment exists and update or create
      const weeklyRef = doc(db, `users/${userId}/commitments/weekly/${weekStr}`);
      const weeklyDoc = await getDoc(weeklyRef);
      
      if (weeklyDoc.exists()) {
        // Update existing weekly commitment
        const weeklyData = weeklyDoc.data();
        await setDoc(weeklyRef, {
          target: (weeklyData.target || 0) + (commitmentData.callsToBeMade || 0),
          achieved: (weeklyData.achieved || 0) + (commitmentData.actualCalls || 0),
          expectedClosures: (weeklyData.expectedClosures || 0) + (commitmentData.expectedClosures?.length || 0),
          totalExpectedRevenue: (weeklyData.totalExpectedRevenue || 0) + (commitmentData.totalExpectedRevenue || 0),
          updatedAt: serverTimestamp()
        }, { merge: true });
      } else {
        // Create new weekly commitment
        await setDoc(weeklyRef, {
          target: commitmentData.callsToBeMade || 0,
          achieved: commitmentData.actualCalls || 0,
          startDate: Timestamp.fromDate(new Date(date.getFullYear(), date.getMonth(), date.getDate() - date.getDay())),
          endDate: Timestamp.fromDate(getEndOfWeek(date)),
          status: commitmentData.status || 'pending',
          weekNumber: getWeekNumber(date),
          expectedClosures: commitmentData.expectedClosures?.length || 0,
          totalExpectedRevenue: commitmentData.totalExpectedRevenue || 0,
          createdAt: commitmentData.date || serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
      
      // Check if monthly commitment exists and update or create
      const monthlyRef = doc(db, `users/${userId}/commitments/monthly/${monthStr}`);
      const monthlyDoc = await getDoc(monthlyRef);
      
      if (monthlyDoc.exists()) {
        // Update existing monthly commitment
        const monthlyData = monthlyDoc.data();
        await setDoc(monthlyRef, {
          target: (monthlyData.target || 0) + (commitmentData.callsToBeMade || 0),
          achieved: (monthlyData.achieved || 0) + (commitmentData.actualCalls || 0),
          expectedClosures: (monthlyData.expectedClosures || 0) + (commitmentData.expectedClosures?.length || 0),
          totalExpectedRevenue: (monthlyData.totalExpectedRevenue || 0) + (commitmentData.totalExpectedRevenue || 0),
          updatedAt: serverTimestamp()
        }, { merge: true });
      } else {
        // Create new monthly commitment
        await setDoc(monthlyRef, {
          target: commitmentData.callsToBeMade || 0,
          achieved: commitmentData.actualCalls || 0,
          startDate: Timestamp.fromDate(new Date(date.getFullYear(), date.getMonth(), 1)),
          endDate: Timestamp.fromDate(getEndOfMonth(date)),
          status: commitmentData.status || 'pending',
          monthNumber: date.getMonth() + 1,
          expectedClosures: commitmentData.expectedClosures?.length || 0,
          totalExpectedRevenue: commitmentData.totalExpectedRevenue || 0,
          createdAt: commitmentData.date || serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
      
      console.log(`Migrated commitment ${commitmentDoc.id} for user ${userId}`);
    }
    
    console.log('Commitments migration completed');
  } catch (error) {
    console.error('Error migrating commitments:', error);
  }
};

/**
 * Migrate reports from old schema to new schema
 */
const migrateReports = async (): Promise<void> => {
  console.log('Migrating reports...');
  
  try {
    const reportsRef = collection(db, 'reports');
    const reportSnapshot = await getDocs(reportsRef);
    
    for (const reportDoc of reportSnapshot.docs) {
      const reportData = reportDoc.data();
      const userId = reportData.userId;
      
      if (!userId) {
        console.log(`Skipping report ${reportDoc.id} - no userId`);
        continue;
      }
      
      const date = reportData.date?.toDate() || new Date();
      const dateStr = date.toISOString().split('T')[0];
      const weekStr = getWeekString(date);
      const monthStr = getMonthString(date);
      
      // Store the report in the new schema
      await setDoc(doc(db, `users/${userId}/reports/${dateStr}`), {
        callsMade: reportData.callsMade || 0,
        callsTarget: reportData.callsPlanned || 0,
        completion: reportData.callCompletion || 0,
        prospects: reportData.prospects || [],
        prospectsCount: reportData.prospectsCount || reportData.prospects?.length || 0,
        meetingsBooked: reportData.meetingsBooked || 0,
        totalExpectedRevenue: reportData.totalExpectedRevenue || 0,
        feedback: reportData.feedback || '',
        date: reportData.date || Timestamp.fromDate(date),
        dateStr: dateStr,
        weekStr: weekStr,
        monthStr: monthStr,
        year: date.getFullYear(),
        month: date.getMonth() + 1,
        day: date.getDate(),
        weekNumber: getWeekNumber(date),
        createdAt: reportData.date || serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      // Update commitment status if there's a linked commitment
      if (reportData.commitmentId) {
        // Get the old commitment 
        const commitmentRef = doc(db, `users/${userId}/commitments/daily/${dateStr}`);
        const commitmentDoc = await getDoc(commitmentRef);
        
        if (commitmentDoc.exists()) {
          await setDoc(commitmentRef, {
            achieved: reportData.callsMade || 0,
            status: (reportData.callsMade >= commitmentDoc.data().target) ? 'achieved' : 'missed',
            updatedAt: serverTimestamp()
          }, { merge: true });
        }
      }
      
      // Update weekly accomplishments
      const weeklyStatsRef = doc(db, `users/${userId}/stats/weeklyAccomplishments/entries/${weekStr}`);
      const weeklyStatsDoc = await getDoc(weeklyStatsRef);
      
      if (weeklyStatsDoc.exists()) {
        const weeklyStats = weeklyStatsDoc.data();
        await setDoc(weeklyStatsRef, {
          tasksCompleted: (weeklyStats.tasksCompleted || 0) + 1,
          extraTasks: (weeklyStats.extraTasks || 0) + Math.max(0, (reportData.callsMade || 0) - (reportData.callsPlanned || 0)),
          updatedAt: serverTimestamp()
        }, { merge: true });
      } else {
        await setDoc(weeklyStatsRef, {
          tasksCompleted: reportData.callsPlanned && reportData.callsMade >= reportData.callsPlanned ? 1 : 0,
          extraTasks: Math.max(0, (reportData.callsMade || 0) - (reportData.callsPlanned || 0)),
          startDate: Timestamp.fromDate(new Date(date.getFullYear(), date.getMonth(), date.getDate() - date.getDay())),
          endDate: Timestamp.fromDate(getEndOfWeek(date)),
          createdAt: reportData.date || serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
      
      // Update monthly accomplishments
      const monthlyStatsRef = doc(db, `users/${userId}/stats/monthlyAccomplishments/entries/${monthStr}`);
      const monthlyStatsDoc = await getDoc(monthlyStatsRef);
      
      if (monthlyStatsDoc.exists()) {
        const monthlyStats = monthlyStatsDoc.data();
        await setDoc(monthlyStatsRef, {
          tasksCompleted: (monthlyStats.tasksCompleted || 0) + 1,
          extraTasks: (monthlyStats.extraTasks || 0) + Math.max(0, (reportData.callsMade || 0) - (reportData.callsPlanned || 0)),
          updatedAt: serverTimestamp()
        }, { merge: true });
      } else {
        await setDoc(monthlyStatsRef, {
          tasksCompleted: reportData.callsPlanned && reportData.callsMade >= reportData.callsPlanned ? 1 : 0,
          extraTasks: Math.max(0, (reportData.callsMade || 0) - (reportData.callsPlanned || 0)),
          startDate: Timestamp.fromDate(new Date(date.getFullYear(), date.getMonth(), 1)),
          endDate: Timestamp.fromDate(getEndOfMonth(date)),
          createdAt: reportData.date || serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
      
      console.log(`Migrated report ${reportDoc.id} for user ${userId}`);
    }
    
    console.log('Reports migration completed');
  } catch (error) {
    console.error('Error migrating reports:', error);
  }
};

/**
 * Migrate user stats from old schema to new schema
 */
const migrateUserStats = async (): Promise<void> => {
  console.log('Migrating user stats...');
  
  try {
    const userStatsRef = collection(db, 'user_stats');
    const userStatsSnapshot = await getDocs(userStatsRef);
    
    for (const userStatsDoc of userStatsSnapshot.docs) {
      const userId = userStatsDoc.id;
      const statsData = userStatsDoc.data();
      
      if (!userId) {
        console.log(`Skipping user stats - no userId`);
        continue;
      }
      
      // Create a minimal set of weekly stats from the existing data
      const now = new Date();
      const currentWeekStr = getWeekString(now);
      const currentMonthStr = getMonthString(now);
      
      // Initialize weekly accomplishments for current week
      await setDoc(doc(db, `users/${userId}/stats/weeklyAccomplishments/entries/${currentWeekStr}`), {
        tasksCompleted: statsData.completedCommitments || 0,
        extraTasks: statsData.lastWeekCalls || 0,
        startDate: Timestamp.fromDate(new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay())),
        endDate: Timestamp.fromDate(getEndOfWeek(now)),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }, { merge: true });
      
      // Initialize monthly accomplishments for current month
      await setDoc(doc(db, `users/${userId}/stats/monthlyAccomplishments/entries/${currentMonthStr}`), {
        tasksCompleted: statsData.completedCommitments || 0,
        extraTasks: statsData.lastWeekCalls || 0,
        startDate: Timestamp.fromDate(new Date(now.getFullYear(), now.getMonth(), 1)),
        endDate: Timestamp.fromDate(getEndOfMonth(now)),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }, { merge: true });
      
      console.log(`Migrated user stats for user ${userId}`);
    }
    
    console.log('User stats migration completed');
  } catch (error) {
    console.error('Error migrating user stats:', error);
  }
};

/**
 * Main migration function to run all migrations
 */
export const runDataMigration = async (): Promise<void> => {
  try {
    console.log('Starting data migration...');
    
    // Run migrations in sequence
    await migrateUsers();
    await migrateCommitments();
    await migrateReports();
    await migrateUserStats();
    
    console.log('Data migration completed successfully');
  } catch (error) {
    console.error('Error during data migration:', error);
  }
};

/**
 * Create a migration utility page
 */
export default function SchemaMigration() {
  // This function is only used for creating a utility page
  // The actual migration code is exported as runDataMigration
  return null;
} 