'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import AppLayout from '@/components/layout/AppLayout';
import Card from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { FiUsers, FiActivity, FiSettings, FiDatabase, FiArrowRight } from 'react-icons/fi';

interface AdminStats {
  totalEmployees: number;
  activeEmployees: number;
  totalProspects: number;
  totalMeetings: number;
  totalRevenue: number;
}

interface RecentActivity {
  id: string;
  type: string;
  description: string;
  timestamp: Date;
  userId: string;
  userName: string;
}

export default function AdminDashboard() {
  const router = useRouter();
  const auth = useAuth();
  const userData = auth?.userData;
  const [stats, setStats] = useState<AdminStats>({
    totalEmployees: 0,
    activeEmployees: 0,
    totalProspects: 0,
    totalMeetings: 0,
    totalRevenue: 0
  });
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userData || userData.role !== 'admin') {
      router.push('/dashboard');
      return;
    }
    fetchAdminData();
  }, [userData, router]);

  const fetchAdminData = async () => {
    if (!userData) return;

    try {
      setLoading(true);

      // Fetch employee stats
      const usersRef = collection(db, 'users');
      const usersSnapshot = await getDocs(usersRef);
      const totalEmployees = usersSnapshot.size;
      const activeEmployees = usersSnapshot.docs.filter(doc => doc.data().isActive).length;

      // Fetch prospect stats
      const prospectsRef = collection(db, 'prospects');
      const prospectsSnapshot = await getDocs(prospectsRef);
      const totalProspects = prospectsSnapshot.size;

      // Fetch meeting stats
      const meetingsRef = collection(db, 'meetings');
      const meetingsSnapshot = await getDocs(meetingsRef);
      const totalMeetings = meetingsSnapshot.size;

      // Calculate total revenue
      const closuresRef = collection(db, 'closures');
      const closuresSnapshot = await getDocs(closuresRef);
      const totalRevenue = closuresSnapshot.docs.reduce((sum, doc) => sum + (doc.data().amount || 0), 0);

      setStats({
        totalEmployees,
        activeEmployees,
        totalProspects,
        totalMeetings,
        totalRevenue
      });

      // Fetch recent activities
      const activitiesRef = collection(db, 'activities');
      const activitiesQuery = query(
        activitiesRef,
        orderBy('timestamp', 'desc'),
        limit(5)
      );
      const activitiesSnapshot = await getDocs(activitiesQuery);
      
      const activities = await Promise.all(
        activitiesSnapshot.docs.map(async doc => {
          const data = doc.data();
          const userDoc = await getDocs(query(collection(db, 'users'), where('uid', '==', data.userId)));
          const userName = userDoc.docs[0]?.data().name || 'Unknown User';
          
          return {
            id: doc.id,
            type: data.type,
            description: data.description,
            timestamp: data.timestamp.toDate(),
            userId: data.userId,
            userName
          };
        })
      );

      setRecentActivities(activities);
    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex justify-center items-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-secondary-900 dark:text-secondary-100">Admin Dashboard</h1>
          <div className="flex gap-4">
            <Button
              variant="outline"
              onClick={() => router.push('/admin/employees')}
            >
              <FiUsers className="mr-2" />
              Manage Employees
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push('/admin/migrate')}
            >
              <FiDatabase className="mr-2" />
              Data Migration
            </Button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-secondary-500 dark:text-secondary-400">Total Employees</p>
                <h3 className="text-2xl font-bold text-secondary-900 dark:text-secondary-100">{stats.totalEmployees}</h3>
                <p className="text-sm text-green-600 dark:text-green-400">{stats.activeEmployees} Active</p>
              </div>
              <FiUsers className="text-4xl text-primary-500" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-secondary-500 dark:text-secondary-400">Total Prospects</p>
                <h3 className="text-2xl font-bold text-secondary-900 dark:text-secondary-100">{stats.totalProspects}</h3>
                <p className="text-sm text-secondary-500 dark:text-secondary-400">All Time</p>
              </div>
              <FiActivity className="text-4xl text-primary-500" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-secondary-500 dark:text-secondary-400">Total Meetings</p>
                <h3 className="text-2xl font-bold text-secondary-900 dark:text-secondary-100">{stats.totalMeetings}</h3>
                <p className="text-sm text-secondary-500 dark:text-secondary-400">All Time</p>
              </div>
              <FiActivity className="text-4xl text-primary-500" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-secondary-500 dark:text-secondary-400">Total Revenue</p>
                <h3 className="text-2xl font-bold text-secondary-900 dark:text-secondary-100">
                  ${stats.totalRevenue.toLocaleString()}
                </h3>
                <p className="text-sm text-secondary-500 dark:text-secondary-400">All Time</p>
              </div>
              <FiActivity className="text-4xl text-primary-500" />
            </div>
          </Card>
        </div>

        {/* Recent Activities */}
        <Card className="mb-8">
          <div className="p-6">
            <h2 className="text-xl font-semibold text-secondary-900 dark:text-secondary-100 mb-4">Recent Activities</h2>
            <div className="space-y-4">
              {recentActivities.map(activity => (
                <div
                  key={activity.id}
                  className="flex items-center justify-between p-4 bg-secondary-50 dark:bg-secondary-800/50 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-secondary-900 dark:text-secondary-100">{activity.description}</p>
                    <p className="text-sm text-secondary-500 dark:text-secondary-400">
                      By {activity.userName} • {activity.timestamp.toLocaleDateString()}
                    </p>
                  </div>
                  <FiArrowRight className="text-secondary-400" />
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-secondary-900 dark:text-secondary-100 mb-4">Employee Management</h2>
            <p className="text-secondary-500 dark:text-secondary-400 mb-4">
              Manage employee accounts, roles, and permissions. View performance metrics and activity logs.
            </p>
            <Button
              variant="primary"
              onClick={() => router.push('/admin/employees')}
            >
              <FiUsers className="mr-2" />
              Manage Employees
            </Button>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-semibold text-secondary-900 dark:text-secondary-100 mb-4">System Settings</h2>
            <p className="text-secondary-500 dark:text-secondary-400 mb-4">
              Configure system settings, manage data migration, and view system logs.
            </p>
            <Button
              variant="primary"
              onClick={() => router.push('/admin/migrate')}
            >
              <FiSettings className="mr-2" />
              System Settings
            </Button>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
} 