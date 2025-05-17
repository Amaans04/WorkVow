'use client';

import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
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
}

export default function ProspectsGraph() {
  const { userData } = useAuth();
  const [stats, setStats] = useState<DailyStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userData) return;
    fetchProspectStats();
  }, [userData]);

  const fetchProspectStats = async () => {
    if (!userData) return;

    try {
      setLoading(true);
      
      // Get all prospects from the new path
      const prospectsRef = collection(db, `users/${userData.uid}/prospects`);
      const prospectsQuery = query(prospectsRef, where('dateAdded', '>=', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))); // Last 30 days
      const prospectsSnapshot = await getDocs(prospectsQuery);
      
      const prospectData: ProspectData[] = [];
      
      prospectsSnapshot.forEach(doc => {
        const data = doc.data();
        prospectData.push({
          dateAdded: data.dateAdded,
          status: data.status
        });
      });

      // Group by date and calculate stats
      const statsMap = new Map<string, DailyStats>();
      
      prospectData.forEach(prospect => {
        const date = prospect.dateAdded.toDate().toISOString().split('T')[0];
        
        if (!statsMap.has(date)) {
          statsMap.set(date, {
            date,
            prospects: 0,
            converted: 0
          });
        }
        
        const stats = statsMap.get(date)!;
        stats.prospects++;
        
        if (prospect.status === 'converted') {
          stats.converted++;
        }
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
        label: 'Prospects Added',
        data: stats.map(stat => stat.prospects),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
        tension: 0.1
      },
      {
        label: 'Prospects Converted',
        data: stats.map(stat => stat.converted),
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.5)',
        tension: 0.1
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
        text: 'Prospects vs Conversions (Last 30 Days)'
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1
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
      <div className="p-4 h-64">
        <Line data={chartData} options={chartOptions} />
      </div>
    </Card>
  );
} 