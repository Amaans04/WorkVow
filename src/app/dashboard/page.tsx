'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FiPhone, FiDollarSign, FiUsers, FiCalendar, FiAward, FiChevronRight, FiFilter, FiClipboard, FiFileText, FiUser, FiCheck } from 'react-icons/fi';
import { useAuth } from '@/context/AuthContext';
import { collection, query, where, getDocs, orderBy, limit, doc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import AppLayout from '@/components/layout/AppLayout';
import Card from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { toast } from 'react-toastify';
import StatCard from '@/components/StatCard';
import ProspectsGraph from '@/components/ProspectsGraph';

// Updated to match the intended roles in the system
type UserRole = 'employee' | 'manager' | 'admin';

interface LeaderboardEntry {
  id: string;
  name: string;
  tasksCompleted: number;
  extraTasks: number;
  isCurrentUser: boolean;
}

interface Announcement {
  id: string;
  title: string;
  content: string;
  date: Date;
  priority: 'high' | 'medium' | 'low';
}

interface UserCommitment {
  target: number;
  achieved: number;
  status: string;
  date: string;
}

interface UserStats {
  tasksCompleted: number;
  extraTasks: number;
  totalCompletedTasks: number;
}

interface Commitment {
  id: string;
  target: number;
  achieved: number;
  status: string;
  date: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const auth = useAuth();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [recentCommitments, setRecentCommitments] = useState<Commitment[]>([]);
  const [todaysCommitment, setTodaysCommitment] = useState<UserCommitment | null>(null);
  
  // Date filtering
  const [timeRange, setTimeRange] = useState<'weekly' | 'monthly'>('weekly');
  const [dateInfo, setDateInfo] = useState({
    todayDateStr: '',
    currentWeekStr: '',
    currentMonthStr: ''
  });

  // Helper function to check if user has admin or manager role
  const hasAdminOrManagerRole = () => {
    // Safely check the role without type errors
    return Boolean(auth?.userData?.role && ['admin', 'manager'].includes(auth.userData.role));
  };

  // Setup date references
  useEffect(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    
    const dateStr = `${year}-${month}-${day}`;
    
    // Calculate week number
    const firstDayOfYear = new Date(year, 0, 1);
    const pastDaysOfYear = (now.getTime() - firstDayOfYear.getTime()) / 86400000;
    const weekNum = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
    const weekStr = `${year}-W${weekNum.toString().padStart(2, '0')}`;
    
    const monthStr = `${year}-${month}`;
    
    setDateInfo({
      todayDateStr: dateStr,
      currentWeekStr: weekStr,
      currentMonthStr: monthStr
    });
  }, []);

  // Helper function to get formatted date strings
  const getDateStrings = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    
    // Date string for daily commitment
    const dateStr = `${year}-${month}-${day}`;
    
    // Calculate week number for weekly stats
    const firstDayOfYear = new Date(year, 0, 1);
    const pastDaysOfYear = (now.getTime() - firstDayOfYear.getTime()) / 86400000;
    const weekNum = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
    const weekStr = `${year}-W${weekNum.toString().padStart(2, '0')}`;
    
    // Month string for monthly stats
    const monthStr = `${year}-${month}`;
    
    return { dateStr, weekStr, monthStr };
  };

  // Fetch dashboard data
  useEffect(() => {
    if (!auth?.userData) return;
    const userData = auth.userData;  // Store in a const to help TypeScript understand it won't be null

    const fetchDashboardData = async () => {
      try {
        setIsLoadingData(true);
        
        // Get date strings
        const { dateStr, weekStr, monthStr } = getDateStrings();
        
        // 1. Fetch today's commitment
        const dailyCommitmentRef = doc(db, `users/${userData.uid}/commitments/daily/entries/${dateStr}`);
        const dailyCommitmentDoc = await getDoc(dailyCommitmentRef);
        
        if (dailyCommitmentDoc.exists()) {
          const commitmentData = dailyCommitmentDoc.data();
          setTodaysCommitment({
            target: commitmentData.target,
            achieved: commitmentData.achieved || 0,
            status: commitmentData.status,
            date: dateStr
          });
        } else {
          console.log('No commitment found for today');
          setTodaysCommitment(null);
        }
        
        // 2. Fetch user stats
        // Weekly stats
        const weeklyStatsRef = doc(db, `users/${userData.uid}/stats/weeklyAccomplishments/entries/${weekStr}`);
        const weeklyStatsDoc = await getDoc(weeklyStatsRef);
        
        if (weeklyStatsDoc.exists()) {
          const statsData = weeklyStatsDoc.data();
          setUserStats({
            tasksCompleted: statsData.tasksCompleted || 0,
            extraTasks: statsData.extraTasks || 0,
            totalCompletedTasks: (statsData.tasksCompleted || 0) + (statsData.extraTasks || 0)
          });
        } else {
          console.log('No weekly stats found');
          setUserStats({
            tasksCompleted: 0,
            extraTasks: 0,
            totalCompletedTasks: 0
          });
        }
        
        // Monthly stats
        const monthlyStatsRef = doc(db, `users/${userData.uid}/stats/monthlyAccomplishments/entries/${monthStr}`);
        const monthlyStatsDoc = await getDoc(monthlyStatsRef);
        
        if (monthlyStatsDoc.exists()) {
          const statsData = monthlyStatsDoc.data();
          setUserStats({
            tasksCompleted: statsData.tasksCompleted || 0,
            extraTasks: statsData.extraTasks || 0,
            totalCompletedTasks: (statsData.tasksCompleted || 0) + (statsData.extraTasks || 0)
          });
        } else {
          console.log('No monthly stats found');
          setUserStats({
            tasksCompleted: 0,
            extraTasks: 0,
            totalCompletedTasks: 0
          });
        }
        
        // 3. Fetch leaderboard data
        const leaderboardData: LeaderboardEntry[] = [];
        
        // Only fetch leaderboard data if the user has admin or manager role
        if (hasAdminOrManagerRole()) {
          const usersSnapshot = await getDocs(collection(db, 'users'));
          
          const userPromises = usersSnapshot.docs.map(async userDoc => {
            const userData = userDoc.data();
            
            // Get weekly stats for this user
            const userWeeklyStatsRef = doc(db, `users/${userDoc.id}/stats/weeklyAccomplishments/entries/${weekStr}`);
            const userWeeklyStatsDoc = await getDoc(userWeeklyStatsRef);
            
            if (userWeeklyStatsDoc.exists()) {
              const statsData = userWeeklyStatsDoc.data();
              leaderboardData.push({
                id: userDoc.id,
                name: userData.name || 'Anonymous',
                tasksCompleted: statsData.tasksCompleted || 0,
                extraTasks: statsData.extraTasks || 0,
                isCurrentUser: userDoc.id === userData.uid
              });
            }
          });
          
          await Promise.all(userPromises);
          
          // Sort leaderboard by tasks completed and extra tasks
          leaderboardData.sort((a, b) => {
            if (b.tasksCompleted === a.tasksCompleted) {
              return b.extraTasks - a.extraTasks;
            }
            return b.tasksCompleted - a.tasksCompleted;
          });
          
          setLeaderboard(leaderboardData.slice(0, 5)); // Top 5 users
        } else {
          // For non-admin/manager users, only show their own stats in the leaderboard
          const userWeeklyStatsRef = doc(db, `users/${userData.uid}/stats/weeklyAccomplishments/entries/${weekStr}`);
          const userWeeklyStatsDoc = await getDoc(userWeeklyStatsRef);
          
          if (userWeeklyStatsDoc.exists()) {
            const statsData = userWeeklyStatsDoc.data();
            leaderboardData.push({
              id: userData.uid,
              name: userData.name || 'You',
              tasksCompleted: statsData.tasksCompleted || 0,
              extraTasks: statsData.extraTasks || 0,
              isCurrentUser: true
            });
            
            setLeaderboard(leaderboardData);
          }
        }
        
        // 4. Fetch announcements
        const announcementsSnapshot = await getDocs(query(
          collection(db, 'announcements'),
          orderBy('createdAt', 'desc'),
          limit(3)
        ));
        
        const announcementsData: Announcement[] = [];
        announcementsSnapshot.forEach(doc => {
          const data = doc.data();
          announcementsData.push({
            id: doc.id,
            title: data.title,
            content: data.content,
            date: data.createdAt.toDate(),
            priority: data.priority || 'medium'
          });
        });
        
        setAnnouncements(announcementsData);
        
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        toast.error('Error fetching dashboard data: ' + (error as Error).message);
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchDashboardData();
  }, [auth?.userData]);

  const handleTimeRangeChange = (range: 'weekly' | 'monthly') => {
    setTimeRange(range);
  };

  if (!auth) {
    return null;
  }

  if (auth.loading || isLoadingData) {
    return (
      <AppLayout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <StatCard
            title="Tasks Completed"
            value={userStats?.tasksCompleted || 0}
            icon={<FiCheck className="text-green-500" />}
            subtitle="This week"
            color="green"
          />
          <StatCard
            title="Extra Tasks"
            value={userStats?.extraTasks || 0}
            icon={<FiAward className="text-yellow-500" />}
            subtitle="Beyond target"
            color="yellow"
          />
          <StatCard
            title="Total Tasks"
            value={userStats?.totalCompletedTasks || 0}
            icon={<FiClipboard className="text-blue-500" />}
            subtitle="Overall completion"
            color="blue"
          />
          <StatCard
            title="Today's Calls"
            value={todaysCommitment?.target || 0}
            icon={<FiPhone className="text-purple-500" />}
            subtitle="Target for today"
            color="purple"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <ProspectsGraph />
          <Card className="p-4">
            <h2 className="text-lg font-medium mb-4">Announcements</h2>
            {announcements.length > 0 ? (
              <div className="space-y-4">
                {announcements.map(announcement => (
                  <div key={announcement.id} className="border-b pb-3 last:border-b-0 last:pb-0">
                    <div className="flex justify-between items-start mb-1">
                      <h3 className="font-medium">{announcement.title}</h3>
                      <span className={`text-xs px-2 py-1 rounded ${
                        announcement.priority === 'high' 
                          ? 'bg-red-100 text-red-800' 
                          : announcement.priority === 'medium'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-green-100 text-green-800'
                      }`}>
                        {announcement.priority}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-1">{announcement.content}</p>
                    <p className="text-xs text-gray-500">
                      {announcement.date.toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No announcements available</p>
            )}
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-4">
            <h2 className="text-lg font-medium mb-4">
              {hasAdminOrManagerRole() 
                ? 'Top Performers' 
                : 'Your Performance'}
            </h2>
            {leaderboard.length > 0 ? (
              <div className="space-y-4">
                {leaderboard.map((entry, index) => (
                  <div 
                    key={entry.id}
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      entry.isCurrentUser ? 'bg-blue-50' : (index % 2 === 0 ? 'bg-gray-50' : '')
                    }`}
                  >
                    <div className="flex items-center">
                      <span className="w-6 h-6 flex items-center justify-center bg-gray-200 rounded-full text-sm font-medium mr-3">
                        {hasAdminOrManagerRole() ? index + 1 : <FiUser />}
                      </span>
                      <div>
                        <p className="font-medium">{entry.name}</p>
                        <p className="text-xs text-gray-500">
                          {entry.tasksCompleted} completed, {entry.extraTasks} extra
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{entry.tasksCompleted + entry.extraTasks}</p>
                      <p className="text-xs text-gray-500">total tasks</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No performance data available</p>
            )}
          </Card>
        </div>
        
        <div className="flex justify-between mt-8">
          <Button
            variant="outline"
            onClick={() => router.push('/commitments/new')}
          >
            New Commitment
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push('/commitments')}
          >
            View Commitments
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push('/reports/new')}
          >
            Submit Report
          </Button>
        </div>
      </div>
    </AppLayout>
  );
} 