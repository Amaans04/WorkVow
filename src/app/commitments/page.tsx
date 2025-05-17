'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FiCalendar, FiChevronRight, FiCheck, FiX, FiPlus } from 'react-icons/fi';
import { useAuth } from '@/context/AuthContext';
import { collection, query, getDocs, orderBy, where, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import AppLayout from '@/components/layout/AppLayout';
import Card from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { toast } from 'react-toastify';

interface Commitment {
  id: string;
  date: string;
  formattedDate: string;
  target: number;
  achieved: number;
  status: string;
  hasReport: boolean;
}

export default function CommitmentsPage() {
  const router = useRouter();
  const auth = useAuth();
  const [commitments, setCommitments] = useState<Commitment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'achieved' | 'missed'>('all');

  useEffect(() => {
    if (!auth?.userData) return;
    const userData = auth.userData;

    const fetchCommitments = async () => {
      try {
        // Get commitments from the daily entries collection
        const commitmentsRef = collection(db, `users/${userData.uid}/commitments/daily/entries`);
        const q = query(commitmentsRef, orderBy('date', 'desc'));
        const querySnapshot = await getDocs(q);

        const fetchedCommitments = await Promise.all(
          querySnapshot.docs.map(async (docSnapshot) => {
            const data = docSnapshot.data();
            const date = new Date(data.date);
            const formattedDate = new Intl.DateTimeFormat('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            }).format(date);

            // Check if there's a corresponding report
            const reportRef = doc(db, `users/${userData.uid}/reports/daily/entries/${docSnapshot.id}`);
            const reportDoc = await getDoc(reportRef);

            return {
              id: docSnapshot.id,
              date: docSnapshot.id,
              formattedDate,
              target: data.target || 0,
              achieved: data.achieved || 0,
              status: data.status || 'pending',
              hasReport: reportDoc.exists()
            };
          })
        );

        setCommitments(fetchedCommitments);
      } catch (error) {
        console.error('Error fetching commitments:', error);
        toast.error('Failed to load commitments');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCommitments();
  }, [auth?.userData]);

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

  // Filter commitments based on status
  const filteredCommitments = commitments.filter(commitment => {
    if (filter === 'all') return true;
    return commitment.status === filter;
  });

  const handleViewDetails = (commitment: Commitment) => {
    router.push(`/commitments/${commitment.date}`);
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Commitment History</h1>
          <Button
            onClick={() => router.push('/commitments/new')}
            variant="primary"
            size="sm"
          >
            <FiPlus className="mr-2" /> New Commitment
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
              variant={filter === 'achieved' ? 'primary' : 'outline'} 
              size="sm"
              onClick={() => setFilter('achieved')}
            >
              Achieved
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

        {filteredCommitments.length > 0 ? (
          <div className="space-y-4">
            {filteredCommitments.map((commitment) => (
              <Card key={commitment.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="p-3 rounded-full bg-blue-100 text-blue-600 mr-4">
                      <FiCalendar size={24} />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium">{commitment.formattedDate}</h3>
                      <div className="flex items-center mt-1">
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
                        {commitment.hasReport && (
                          <span className="ml-2 px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800">
                            Report Submitted
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Target</p>
                    <p className="text-lg font-medium">{commitment.target}</p>
                    <p className="text-sm text-gray-500 mt-2">Achieved</p>
                    <p className="text-lg font-medium">{commitment.achieved}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewDetails(commitment)}
                  >
                    <FiChevronRight className="h-5 w-5" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-6 text-center">
            <p className="text-gray-500 mb-4">No commitments found for the selected filter.</p>
            <Button 
              variant="outline" 
              onClick={() => router.push('/commitments/new')}
            >
              Create your first commitment
            </Button>
          </Card>
        )}
      </div>
    </AppLayout>
  );
} 