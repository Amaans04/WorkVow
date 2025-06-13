'use client';

import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs, Timestamp, orderBy, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import Card from '@/components/ui/Card';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
  ChartData
} from 'chart.js';
import { Select } from '@/components/ui/Select';

// Register all required Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface ProspectData {
  dateAdded: Timestamp;
  status: string;
}

interface DailyStats {
  date: string;
  prospects: number;
  converted: number;
  dailyProspects: number;
  dailyConverted: number;
}

type DateRange = 'week' | 'month' | 'all';

export default function ProspectsGraph() {
  const auth = useAuth();
  const userData = auth?.userData;
  const [stats, setStats] = useState<DailyStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange>('week');
  const [userCreationDate, setUserCreationDate] = useState<Date | null>(null);

  useEffect(() => {
    if (!userData) return;
    fetchUserCreationDate();
  }, [userData]);

  useEffect(() => {
    if (!userData || !userCreationDate) return;
    fetchProspectStats();
  }, [userData, dateRange, userCreationDate]);

  const fetchUserCreationDate = async () => {
    if (!userData) return;

    try {
      const userDoc = await getDoc(doc(db, 'users', userData.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setUserCreationDate(userData.createdAt?.toDate() || new Date());
      }
    } catch (error) {
      console.error('Error fetching user creation date:', error);
      setUserCreationDate(new Date()); // Fallback to current date if error
    }
  };

  const fetchProspectStats = async () => {
    if (!userData || !userCreationDate) return;

    try {
      setLoading(true);
      
      // Calculate start date based on selected range
      const startDate = new Date();
      switch (dateRange) {
        case 'week':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case 'month':
          startDate.setDate(startDate.getDate() - 30);
          break;
        case 'all':
          startDate.setTime(userCreationDate.getTime()); // Use user creation date
          break;
      }
      
      // Get daily reports
      const reportsRef = collection(db, `users/${userData.uid}/reports/daily/entries`);
      const reportsQuery = query(
        reportsRef,
        where('date', '>=', startDate),
        orderBy('date', 'asc')
      );
      const reportsSnapshot = await getDocs(reportsQuery);
      
      // Group by date and calculate stats
      const statsMap = new Map<string, DailyStats>();
      let cumulativeProspects = 0;
      let cumulativeConverted = 0;
      
      // Initialize all dates between start and end with zero values
      const currentDate = new Date(startDate);
      const endDate = new Date();
      while (currentDate <= endDate) {
        const dateStr = currentDate.toISOString().split('T')[0];
        statsMap.set(dateStr, {
          date: dateStr,
          prospects: 0,
          converted: 0,
          dailyProspects: 0,
          dailyConverted: 0
        });
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      // Process reports
      reportsSnapshot.forEach(doc => {
        const data = doc.data();
        const date = data.date.toDate().toISOString().split('T')[0];
        const stats = statsMap.get(date);
        if (stats) {
          stats.dailyProspects = data.totalProspects || 0;
          stats.dailyConverted = data.convertedProspects || 0;
        }
      });
      
      // Calculate cumulative stats
      const sortedDates = Array.from(statsMap.keys()).sort();
      sortedDates.forEach(date => {
        const stats = statsMap.get(date)!;
        // Only add to cumulative if it's not today
        if (date !== endDate.toISOString().split('T')[0]) {
          cumulativeProspects += stats.dailyProspects;
          cumulativeConverted += stats.dailyConverted;
        }
        stats.prospects = cumulativeProspects;
        stats.converted = cumulativeConverted;
      });

      // Convert map to array and sort by date
      const statsArray = Array.from(statsMap.values())
        .sort((a, b) => a.date.localeCompare(b.date));

      setStats(statsArray);
    } catch (error) {
      console.error('Error fetching prospect stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const chartData: ChartData<'line'> = {
    labels: stats.map(stat => stat.date),
    datasets: [
      {
        label: 'Total Prospects',
        data: stats.map(stat => stat.prospects),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
        tension: 0.1,
        pointRadius: 4,
        pointHoverRadius: 6
      },
      {
        label: 'Converted Prospects',
        data: stats.map(stat => stat.converted),
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.5)',
        tension: 0.1,
        pointRadius: 4,
        pointHoverRadius: 6
      }
    ]
  };

  const chartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Prospects Progress'
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const label = context.dataset.label || '';
            const value = context.parsed.y;
            return `${label}: ${value}`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1
        }
      },
      x: {
        ticks: {
          maxRotation: 45,
          minRotation: 45
        }
      }
    }
  };

  if (loading) {
    return (
      <Card>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium">Prospects Progress</h2>
          <Select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as DateRange)}
            className="w-40"
          >
            <option value="week">Last 7 Days</option>
            <option value="month">Last 30 Days</option>
            <option value="all">All Time</option>
          </Select>
        </div>
        <div className="h-64">
          <Line data={chartData} options={chartOptions} />
        </div>
      </div>
    </Card>
  );
} 