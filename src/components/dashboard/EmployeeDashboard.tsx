import React from 'react';
import { useCommitments, useDailyReports, usePerformanceScores } from '../../hooks/useData';
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
} from 'chart.js';
import { format } from 'date-fns';
import type { Commitment, DailyReport } from '../../types/firestore';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

export function EmployeeDashboard() {
  const { data: commitments, isLoading: commitmentsLoading } = useCommitments('week');
  const { data: reports, isLoading: reportsLoading } = useDailyReports('week');
  const { data: performanceScores, isLoading: scoresLoading } = usePerformanceScores(
    format(new Date(), 'yyyy-MM')
  );

  const isLoading = commitmentsLoading || reportsLoading || scoresLoading;

  if (isLoading) {
    return <div>Loading...</div>;
  }

  // Prepare data for the performance chart
  const chartData = {
    labels: commitments?.map((commitment: Commitment) => format(commitment.date.toDate(), 'MMM d')),
    datasets: [
      {
        label: 'Calls Committed',
        data: commitments?.map((commitment: Commitment) => commitment.calls_committed),
        borderColor: 'rgb(75, 192, 192)',
        tension: 0.1,
      },
      {
        label: 'Calls Made',
        data: reports?.map((report: DailyReport) => report.calls_made),
        borderColor: 'rgb(255, 99, 132)',
        tension: 0.1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Daily Performance: Calls Committed vs Made',
      },
    },
  };

  // Calculate performance metrics
  const totalCallsCommitted = commitments?.reduce((sum: number, c: Commitment) => sum + c.calls_committed, 0) || 0;
  const totalCallsMade = reports?.reduce((sum: number, r: DailyReport) => sum + r.calls_made, 0) || 0;
  const callCompletionRate = totalCallsCommitted > 0 
    ? (totalCallsMade / totalCallsCommitted) * 100 
    : 0;

  const totalProspectsGenerated = reports?.reduce((sum: number, r: DailyReport) => sum + r.prospects_generated, 0) || 0;
  const totalMeetingsDone = reports?.reduce((sum: number, r: DailyReport) => sum + r.meetings_done, 0) || 0;
  const totalClosures = reports?.reduce((sum: number, r: DailyReport) => sum + r.closures_achieved, 0) || 0;
  const totalRevenue = reports?.reduce((sum: number, r: DailyReport) => sum + r.revenue_generated, 0) || 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Call Completion Rate</h3>
          <p className="text-2xl font-semibold">{callCompletionRate.toFixed(1)}%</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Prospects Generated</h3>
          <p className="text-2xl font-semibold">{totalProspectsGenerated}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Meetings Done</h3>
          <p className="text-2xl font-semibold">{totalMeetingsDone}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Revenue Generated</h3>
          <p className="text-2xl font-semibold">${totalRevenue.toLocaleString()}</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow">
        <Line data={chartData} options={chartOptions} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-medium mb-4">Weekly Summary</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Calls Made:</span>
              <span>{totalCallsMade}</span>
            </div>
            <div className="flex justify-between">
              <span>Prospects Generated:</span>
              <span>{totalProspectsGenerated}</span>
            </div>
            <div className="flex justify-between">
              <span>Meetings Done:</span>
              <span>{totalMeetingsDone}</span>
            </div>
            <div className="flex justify-between">
              <span>Closures Achieved:</span>
              <span>{totalClosures}</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-medium mb-4">Performance Score</h3>
          {performanceScores?.map((score: { id: string; score: number; period: string }) => (
            <div key={score.id} className="space-y-2">
              <div className="flex justify-between">
                <span>Current Score:</span>
                <span>{score.score}</span>
              </div>
              <div className="flex justify-between">
                <span>Period:</span>
                <span>{score.period}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 