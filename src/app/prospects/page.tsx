'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FiUser, FiCalendar, FiFilter, FiSearch } from 'react-icons/fi';
import { collection, query, getDocs, orderBy, where, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import AppLayout from '@/components/layout/AppLayout';
import Card from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { toast } from 'react-toastify';

interface Prospect {
  id: string;
  name: string;
  contact: string;
  source: string;
  remarks: string;
  status: string;
  dateAdded: Date;
}

export default function ProspectsPage() {
  const router = useRouter();
  const auth = useAuth();
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');

  const fetchProspects = async () => {
    if (!auth?.userData) {
      console.log('No user data available');
      return;
    }

    try {
      setIsLoading(true);
      console.log('Fetching prospects for user:', auth.userData.uid);
      
      // Query prospects collection
      const prospectsRef = collection(db, `users/${auth.userData.uid}/prospects`);
      console.log('Collection path:', `users/${auth.userData.uid}/prospects`);
      
      let prospectsQuery = query(
        prospectsRef,
        orderBy('dateAdded', 'desc')
      );

      // Apply status filter if not 'all'
      if (statusFilter !== 'all') {
        prospectsQuery = query(prospectsQuery, where('status', '==', statusFilter));
      }

      // Apply date filter if not 'all'
      if (dateFilter !== 'all') {
        const today = new Date();
        let startDate = new Date();

        switch (dateFilter) {
          case 'today':
            startDate.setHours(0, 0, 0, 0);
            break;
          case 'week':
            startDate.setDate(today.getDate() - 7);
            break;
          case 'month':
            startDate.setMonth(today.getMonth() - 1);
            break;
        }

        prospectsQuery = query(
          prospectsQuery,
          where('dateAdded', '>=', startDate)
        );
      }

      console.log('Executing query...');
      const prospectsSnapshot = await getDocs(prospectsQuery);
      console.log('Query results:', prospectsSnapshot.size, 'documents found');

      const prospectsData: Prospect[] = [];

      prospectsSnapshot.forEach((doc) => {
        const data = doc.data();
        console.log('Document data:', data);
        prospectsData.push({
          id: doc.id,
          name: data.name,
          contact: data.contact,
          source: data.source,
          remarks: data.remarks,
          status: data.status,
          dateAdded: data.dateAdded?.toDate() || new Date()
        });
      });

      console.log('Processed prospects:', prospectsData);
      setProspects(prospectsData);
    } catch (error) {
      console.error('Error fetching prospects:', error);
      toast.error('Failed to fetch prospects');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    console.log('Auth state:', auth);
    if (!auth?.userData) {
      console.log('No user data, waiting for auth...');
      return;
    }
    console.log('User data available, fetching prospects...');
    fetchProspects();
  }, [auth?.userData, statusFilter, dateFilter]);

  const handleStatusUpdate = async (prospectId: string, newStatus: string) => {
    if (!auth?.userData) return;

    try {
      const prospectRef = doc(db, `users/${auth.userData.uid}/prospects/${prospectId}`);
      await updateDoc(prospectRef, {
        status: newStatus,
        updatedAt: serverTimestamp()
      });

      toast.success(`Prospect marked as ${newStatus}`);
      await fetchProspects(); // Refresh the prospects list
    } catch (error) {
      console.error('Error updating prospect status:', error);
      toast.error('Failed to update prospect status');
    }
  };

  // Filter prospects based on search term
  const filteredProspects = prospects.filter(prospect => {
    const searchLower = searchTerm.toLowerCase();
    return (
      prospect.name.toLowerCase().includes(searchLower) ||
      prospect.contact.toLowerCase().includes(searchLower) ||
      prospect.source.toLowerCase().includes(searchLower) ||
      prospect.remarks.toLowerCase().includes(searchLower)
    );
  });

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto py-8 px-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-secondary-900 dark:text-secondary-100">Prospects</h1>
          <Button
            onClick={() => router.push('/reports/new')}
            variant="primary"
            size="sm"
          >
            Add New Prospect
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="relative">
            <Input
              type="text"
              placeholder="Search prospects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          </div>

          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="contacted">Contacted</option>
            <option value="qualified">Qualified</option>
            <option value="converted">Converted</option>
            <option value="lost">Lost</option>
          </Select>

          <Select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="w-full"
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">Last 7 Days</option>
            <option value="month">Last 30 Days</option>
          </Select>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <p className="text-secondary-900 dark:text-secondary-100">Loading prospects...</p>
          </div>
        ) : filteredProspects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProspects.map((prospect) => (
              <Card key={prospect.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 p-2 rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 mr-4">
                      <FiUser size={20} />
                    </div>
                    <div>
                      <h3 className="font-medium text-secondary-900 dark:text-secondary-100">
                        {prospect.name}
                      </h3>
                      <p className="text-sm text-secondary-500 dark:text-secondary-400">
                        {prospect.contact}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={`px-2 py-1 rounded text-xs ${
                      prospect.status === 'converted' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
                      prospect.status === 'lost' ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' :
                      'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                    }`}>
                      {prospect.status}
                    </span>
                    {prospect.status === 'pending' && (
                      <div className="flex gap-2">
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleStatusUpdate(prospect.id, 'converted')}
                        >
                          Mark as Converted
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleStatusUpdate(prospect.id, 'lost')}
                        >
                          Mark as Lost
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <div className="flex items-center text-sm text-secondary-500 dark:text-secondary-400">
                    <FiCalendar className="mr-2" />
                    <span>Added: {prospect.dateAdded.toLocaleDateString()}</span>
                  </div>
                  <p className="text-sm text-secondary-500 dark:text-secondary-400">
                    <span className="font-medium">Source:</span> {prospect.source}
                  </p>
                  {prospect.remarks && (
                    <p className="text-sm text-secondary-500 dark:text-secondary-400">
                      <span className="font-medium">Remarks:</span> {prospect.remarks}
                    </p>
                  )}
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-6 text-center">
            <p className="text-secondary-500 dark:text-secondary-400 mb-4">
              No prospects found matching your criteria.
            </p>
            <Button
              variant="outline"
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
                setDateFilter('all');
              }}
            >
              Clear Filters
            </Button>
          </Card>
        )}
      </div>
    </AppLayout>
  );
} 