'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FiFileText, FiChevronRight, FiCheck, FiX, FiPlus } from 'react-icons/fi';
import { useAuth } from '@/context/AuthContext';
import { collection, query, getDocs, orderBy, doc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import AppLayout from '@/components/layout/AppLayout';
import Card from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { toast } from 'react-toastify';

interface Report {
  id: string;
  date: string;
  formattedDate: string;
  callsMade: number;
  callsTarget: number;
  meetingsBooked: number;
  totalExpectedRevenue: number;
  completion: number;
  hasCommitment: boolean;
}

export default function ReportsPage() {
  const router = useRouter();
  const auth = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'exceeded' | 'met' | 'missed'>('all');

  useEffect(() => {
    if (!auth?.userData) return;
    const userData = auth.userData;  // Store in a const to help TypeScript understand it won't be null

    const fetchReports = async () => {
      try {
        setIsLoading(true);
        
        // Fetch reports from Firestore, ordered by date descending
        const reportsRef = collection(db, `users/${userData.uid}/reports/daily/entries`);
        const reportsQuery = query(
          reportsRef,
          orderBy('date', 'desc')
        );
        
        const reportsSnapshot = await getDocs(reportsQuery);
        const reportsData: Report[] = [];

        // Process each report document
        for (const docSnapshot of reportsSnapshot.docs) {
          const data = docSnapshot.data();
          let date = new Date();
          
          if (data.date) {
            // Handle both Timestamp and date string formats
            date = data.date instanceof Timestamp ? data.date.toDate() : new Date(data.date);
          }
          
          // Format the date for display
          const formattedDate = new Intl.DateTimeFormat('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          }).format(date);

          // Check if there's a corresponding commitment
          const commitmentRef = doc(db, `users/${userData.uid}/commitments/daily/entries/${docSnapshot.id}`);
          const commitmentDoc = await getDoc(commitmentRef);
          
          reportsData.push({
            id: docSnapshot.id,
            date: docSnapshot.id,
            formattedDate,
            callsMade: data.callsMade || 0,
            callsTarget: data.callsTarget || 0,
            meetingsBooked: data.meetingsBooked || 0,
            totalExpectedRevenue: data.totalExpectedRevenue || 0,
            completion: data.completion || 0,
            hasCommitment: commitmentDoc.exists()
          });
        }
        
        setReports(reportsData);
      } catch (error) {
        console.error('Error fetching reports:', error);
        toast.error('Failed to load reports');
      } finally {
        setIsLoading(false);
      }
    };

    fetchReports();
  }, [auth]);

  // Filter reports based on completion
  const filteredReports = reports.filter(report => {
    if (filter === 'all') return true;
    if (filter === 'exceeded' && report.callsMade > report.callsTarget) return true;
    if (filter === 'met' && report.callsMade === report.callsTarget) return true;
    if (filter === 'missed' && report.callsMade < report.callsTarget) return true;
    return false;
  });

  const handleViewDetails = (report: Report) => {
    if (report.hasCommitment) {
      router.push(`/commitments/${report.date}`);
    } else {
      toast.info('This report does not have an associated commitment');
    }
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Report History</h1>
          <Button
            onClick={() => router.push('/reports/new')}
            variant="primary"
            size="sm"
          >
            <FiPlus className="mr-2" /> New Report
          </Button>
        </div>

        <div className="mb-6">
          <div className="flex space-x-2">
            <Button 
              variant={filter === 'all' ? 'primary' : 'outline'} 
              size="sm"
              onClick={() => setFilter('all')}
            >
              All
            </Button>
            <Button 
              variant={filter === 'exceeded' ? 'primary' : 'outline'} 
              size="sm"
              onClick={() => setFilter('exceeded')}
            >
              Exceeded
            </Button>
            <Button 
              variant={filter === 'met' ? 'primary' : 'outline'} 
              size="sm"
              onClick={() => setFilter('met')}
            >
              Met
            </Button>
            <Button 
              variant={filter === 'missed' ? 'primary' : 'outline'} 
              size="sm"
              onClick={() => setFilter('missed')}
            >
              Missed
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <p>Loading reports...</p>
          </div>
        ) : filteredReports.length > 0 ? (
          <div className="space-y-4">
            {filteredReports.map((report) => (
              <Card 
                key={report.id} 
                className="p-4 hover:shadow-md transition-shadow"
                onClick={() => handleViewDetails(report)}
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 p-2 rounded-full bg-indigo-100 text-indigo-600 mr-4">
                      <FiFileText size={20} />
                    </div>
                    <div>
                      <h3 className="font-medium">{report.formattedDate}</h3>
                      <p className="text-sm text-gray-500">
                        Calls: {report.callsMade}/{report.callsTarget} | 
                        Meetings: {report.meetingsBooked}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <div className="mr-4 text-right">
                      <div className={`px-2 py-1 rounded text-xs ${
                        report.callsMade > report.callsTarget 
                          ? 'bg-green-100 text-green-800' 
                          : report.callsMade === report.callsTarget
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-red-100 text-red-800'
                      }`}>
                        {report.callsMade > report.callsTarget 
                          ? 'Exceeded' 
                          : report.callsMade === report.callsTarget
                            ? 'Met Target'
                            : 'Missed Target'}
                      </div>
                      <span className="text-xs text-gray-500 mt-1 block">
                        ${report.totalExpectedRevenue.toLocaleString()} revenue
                      </span>
                    </div>
                    <FiChevronRight className="text-gray-400" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-6 text-center">
            <p className="text-gray-500 mb-4">No reports found for the selected filter.</p>
            <Button 
              variant="outline" 
              onClick={() => router.push('/reports/new')}
            >
              Submit your first report
            </Button>
          </Card>
        )}
      </div>
    </AppLayout>
  );
} 