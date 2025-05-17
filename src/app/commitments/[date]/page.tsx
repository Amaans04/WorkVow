'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { FiArrowLeft, FiCheck, FiX, FiCalendar, FiPhone, FiDollarSign, FiUser } from 'react-icons/fi';
import { useAuth } from '@/context/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import AppLayout from '@/components/layout/AppLayout';
import Card from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { toast } from 'react-toastify';

interface Commitment {
  date: string;
  formattedDate: string;
  target: number;
  achieved: number;
  status: string;
  expectedClosures: Array<{
    customerName: string;
    contactDetails: string;
    products: string;
    expectedRevenue: number;
    notes?: string;
  }>;
}

interface Report {
  callsMade: number;
  callsTarget: number;
  completion: number;
  prospects: Array<{
    name: string;
    product: string;
    meetingScheduled: boolean;
    meetingType?: string;
    meetingDate?: string;
    expectedRevenue: number;
    notes?: string;
  }>;
  meetingsBooked: number;
  totalExpectedRevenue: number;
  feedback?: string;
}

export default function CommitmentDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const auth = useAuth();
  const [commitment, setCommitment] = useState<Commitment | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const date = params?.date as string;

  useEffect(() => {
    if (!auth?.userData) return;
    const userData = auth.userData;

    const fetchCommitment = async () => {
      try {
        const date = params?.date as string;
        if (!date) {
          console.error('No date provided');
          return;
        }

        const userId = userData.uid;
        if (!userId) {
          console.error('No user ID available');
          return;
        }

        const commitmentRef = doc(db, `users/${userId}/commitments/daily/entries/${date}`);
        const commitmentSnap = await getDoc(commitmentRef);

        if (!commitmentSnap.exists()) {
          console.log('No commitment found for this date');
          toast.error('No commitment found for this date');
          return;
        }

        const data = commitmentSnap.data();
        const formattedDate = new Intl.DateTimeFormat('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }).format(new Date(date));

        setCommitment({
          ...data,
          date,
          formattedDate
        } as Commitment);

        const reportRef = doc(db, `users/${userId}/reports/daily/entries/${date}`);
        const reportSnap = await getDoc(reportRef);

        if (reportSnap.exists()) {
          setReport(reportSnap.data() as Report);
        }
      } catch (error) {
        console.error('Error fetching commitment:', error);
        toast.error('Failed to load commitment details');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCommitment();
  }, [params?.date, auth?.userData]);

  if (!auth) {
    return null;
  }

  if (auth.loading || isLoading) {
    return (
      <AppLayout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </AppLayout>
    );
  }

  if (!commitment) {
    return (
      <AppLayout>
        <div className="max-w-4xl mx-auto py-8 px-4">
          <Button
            variant="outline"
            size="sm"
            className="mb-6"
            onClick={() => router.push('/commitments')}
          >
            <FiArrowLeft className="mr-2" /> Back to Commitments
          </Button>
          <Card className="p-6 text-center">
            <p className="text-gray-500 mb-4">No commitment found for this date.</p>
            <Button 
              variant="outline" 
              onClick={() => router.push('/commitments/new')}
            >
              Create a new commitment
            </Button>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto py-8 px-4">
        <Button
          variant="outline"
          size="sm"
          className="mb-6"
          onClick={() => router.push('/commitments')}
        >
          <FiArrowLeft className="mr-2" /> Back to Commitments
        </Button>
        
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center mb-4">
              <div className="p-3 rounded-full bg-blue-100 text-blue-600 mr-4">
                <FiCalendar size={24} />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Commitment for {commitment.formattedDate}</h1>
                <div className="flex items-center mt-2">
                  <span className={`px-3 py-1 rounded-full text-sm ${
                    commitment.status === 'achieved' 
                      ? 'bg-green-100 text-green-800' 
                      : commitment.status === 'missed'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {commitment.status === 'achieved' ? (
                      <><FiCheck className="inline mr-1" /> Achieved</>
                    ) : commitment.status === 'missed' ? (
                      <><FiX className="inline mr-1" /> Missed</>
                    ) : (
                      'Pending'
                    )}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center mb-2">
                  <FiPhone className="mr-2 text-blue-600" />
                  <h3 className="font-medium text-black">Call Target</h3>
                </div>
                <p className="text-2xl text-black font-bold">{commitment.target}</p>
              </div>
              
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center mb-2">
                  <FiPhone className="mr-2 text-green-600" />
                  <h3 className="font-medium text-black">Calls Achieved</h3>
                </div>
                <p className="text-2xl font-bold text-black">{commitment.achieved}</p>
                <p className="text-sm text-gray-500">
                  {commitment.target > 0 && 
                    `${Math.round((commitment.achieved / commitment.target) * 100)}% of target`}
                </p>
              </div>
            </div>
            
            {commitment.expectedClosures && commitment.expectedClosures.length > 0 && (
              <div className="mt-8">
                <h2 className="text-xl font-semibold mb-4">Expected Closures</h2>
                <div className="space-y-4">
                  {commitment.expectedClosures.map((closure, index) => (
                    <Card key={index} className="p-4 border">
                      <div className="flex justify-between">
                        <div>
                          <h3 className="font-medium">{closure.customerName}</h3>
                          <p className="text-sm text-gray-500">{closure.contactDetails}</p>
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-green-600">${closure.expectedRevenue.toLocaleString()}</div>
                          <p className="text-sm text-gray-500">{closure.products}</p>
                        </div>
                      </div>
                      {closure.notes && (
                        <p className="text-sm mt-2 bg-gray-50 p-2 rounded">{closure.notes}</p>
                      )}
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {report && (
              <div className="mt-8">
                <h2 className="text-xl font-semibold mb-4">Daily Report</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center mb-2">
                      <FiPhone className="mr-2 text-blue-600" />
                      <h3 className="font-medium">Calls Made</h3>
                    </div>
                    <p className="text-2xl font-bold">{report.callsMade}</p>
                    <p className="text-sm text-gray-500">Target: {report.callsTarget}</p>
                  </div>
                  
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center mb-2">
                      <FiUser className="mr-2 text-green-600" />
                      <h3 className="font-medium">Meetings Booked</h3>
                    </div>
                    <p className="text-2xl font-bold">{report.meetingsBooked}</p>
                  </div>
                  
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center mb-2">
                      <FiDollarSign className="mr-2 text-purple-600" />
                      <h3 className="font-medium">Expected Revenue</h3>
                    </div>
                    <p className="text-2xl font-bold">${report.totalExpectedRevenue.toLocaleString()}</p>
                  </div>
                </div>

                {report.prospects && report.prospects.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-lg font-medium mb-3">Prospects</h3>
                    <div className="space-y-4">
                      {report.prospects.map((prospect, index) => (
                        <Card key={index} className="p-4 border">
                          <div className="flex justify-between">
                            <div>
                              <h4 className="font-medium">{prospect.name}</h4>
                              <p className="text-sm text-gray-500">{prospect.product}</p>
                            </div>
                            <div className="text-right">
                              <div className="font-medium text-green-600">${prospect.expectedRevenue.toLocaleString()}</div>
                              {prospect.meetingScheduled && (
                                <p className="text-sm text-blue-600">
                                  Meeting: {prospect.meetingType} on {prospect.meetingDate}
                                </p>
                              )}
                            </div>
                          </div>
                          {prospect.notes && (
                            <p className="text-sm mt-2 bg-gray-50 p-2 rounded">{prospect.notes}</p>
                          )}
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {report.feedback && (
                  <div className="mt-6">
                    <h3 className="text-lg font-medium mb-2">Feedback</h3>
                    <Card className="p-4 bg-gray-50">
                      <p className="text-gray-700">{report.feedback}</p>
                    </Card>
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>
      </div>
    </AppLayout>
  );
} 