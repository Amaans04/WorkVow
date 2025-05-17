import useSWR from 'swr';
import { useAuth } from '@/context/AuthContext';
import type { Commitment, DailyReport, PerformanceScore } from '@/types/firestore';

// Helper function to format date range for queries
const getDateRange = (period: 'week' | 'month' | 'year') => {
  const now = new Date();
  const start = new Date(now);
  
  switch (period) {
    case 'week':
      start.setDate(now.getDate() - 7);
      break;
    case 'month':
      start.setMonth(now.getMonth() - 1);
      break;
    case 'year':
      start.setFullYear(now.getFullYear() - 1);
      break;
  }
  
  return { start, end: now };
};

export function useCommitments(period: 'week' | 'month' | 'year' = 'week') {
  const auth = useAuth();
  const { start, end } = getDateRange(period);
  
  return useSWR<Commitment[]>(
    auth?.userData ? ['commitments', auth.userData.uid, period] : null,
    async () => {
      if (!auth?.userData) throw new Error('Not authenticated');
      const response = await fetch(`/api/commitments/${auth.userData.uid}?start=${start.toISOString()}&end=${end.toISOString()}`);
      if (!response.ok) throw new Error('Failed to fetch commitments');
      return response.json();
    }
  );
}

export function useDailyReports(period: 'week' | 'month' | 'year' = 'week') {
  const auth = useAuth();
  const { start, end } = getDateRange(period);
  
  return useSWR<DailyReport[]>(
    auth?.userData ? ['dailyReports', auth.userData.uid, period] : null,
    async () => {
      if (!auth?.userData) throw new Error('Not authenticated');
      const response = await fetch(`/api/reports/${auth.userData.uid}/daily?start=${start.toISOString()}&end=${end.toISOString()}`);
      if (!response.ok) throw new Error('Failed to fetch daily reports');
      return response.json();
    }
  );
}

export function usePerformanceScores(period: string) {
  const auth = useAuth();
  
  return useSWR<PerformanceScore[]>(
    auth?.userData ? ['performanceScores', auth.userData.uid, period] : null,
    async () => {
      if (!auth?.userData) throw new Error('Not authenticated');
      const response = await fetch(`/api/performance/${auth.userData.uid}?period=${period}`);
      if (!response.ok) throw new Error('Failed to fetch performance scores');
      return response.json();
    }
  );
}

export function useData() {
  const auth = useAuth();

  if (!auth) {
    return {
      data: null,
      error: new Error('Authentication not available'),
      isLoading: false
    };
  }

  const { data, error, isLoading } = useSWR(
    auth.userData ? `/api/data/${auth.userData.uid}` : null,
    async (url) => {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch data');
      }
      return response.json();
    }
  );

  return {
    data,
    error,
    isLoading
  };
} 