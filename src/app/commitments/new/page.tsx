'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { FiPlus, FiTrash2, FiSave, FiLock, FiCalendar, FiUsers } from 'react-icons/fi';
import { collection, addDoc, serverTimestamp, doc, setDoc, Timestamp, getDoc, DocumentData, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'react-toastify';
import AppLayout from '@/components/layout/AppLayout';
import Card from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { format } from 'date-fns';

interface ExpectedClosure {
  customerName: string;
  contactDetails: string;
  products: string;
  expectedRevenue: number;
  notes?: string;
}

interface ExpectedMeeting {
  prospectId: string;
  prospectName: string;
  type: 'online' | 'offline';
  product: string;
}

interface ExpectedProspect {
  total: number;
}

interface CommitmentFormValues {
  callsToBeMade: number;
  expectedClosures: ExpectedClosure[];
  expectedMeetings: ExpectedMeeting[];
  expectedProspects: ExpectedProspect;
}

export default function NewCommitmentPage() {
  const router = useRouter();
  const auth = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingCommitment, setExistingCommitment] = useState<DocumentData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [todayDateString, setTodayDateString] = useState('');
  const [formattedDate, setFormattedDate] = useState('');
  const [prospects, setProspects] = useState<Array<{ id: string; name: string; dateAdded?: Timestamp }>>([]);
  
  const { 
    register, 
    control,
    handleSubmit, 
    formState: { errors },
    watch,
    setValue
  } = useForm<CommitmentFormValues>({
    defaultValues: {
      callsToBeMade: 0,
      expectedClosures: [],
      expectedMeetings: [],
      expectedProspects: {
        total: 0
      }
    }
  });
  
  const { fields: closureFields, append: appendClosure, remove: removeClosure } = useFieldArray({
    control,
    name: "expectedClosures"
  });

  const { fields: meetingFields, append: appendMeeting, remove: removeMeeting } = useFieldArray({
    control,
    name: "expectedMeetings"
  });

  // Fetch prospects for the user
  useEffect(() => {
    if (!auth?.userData) return;
    const userData = auth.userData;

    const fetchProspects = async () => {
      try {
        // Get all prospects from the main prospects collection
        const prospectsRef = collection(db, `users/${userData.uid}/prospects`);
        const prospectsQuery = query(prospectsRef, where('status', '==', 'pending'));
        const prospectsSnapshot = await getDocs(prospectsQuery);
        
        const prospectsData: Array<{ id: string; name: string; dateAdded?: Timestamp }> = [];
        
        prospectsSnapshot.forEach(doc => {
          const data = doc.data();
          prospectsData.push({
            id: doc.id,
            name: data.name,
            dateAdded: data.dateAdded
          });
        });
        
        // Sort prospects by date added (most recent first)
        prospectsData.sort((a, b) => {
          const dateA = a.dateAdded?.toDate() || new Date(0);
          const dateB = b.dateAdded?.toDate() || new Date(0);
          return dateB.getTime() - dateA.getTime();
        });
        
        setProspects(prospectsData);
      } catch (error) {
        console.error('Error fetching prospects:', error);
        toast.error('Failed to load prospects');
      }
    };

    fetchProspects();
  }, [auth?.userData]);

  // Get date information and check for existing commitment
  useEffect(() => {
    if (!auth?.userData) return;
    const userData = auth.userData;  // Store in a const to help TypeScript understand it won't be null

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const day = now.getDate();
    
    // Format date strings
    const dateStr = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    setTodayDateString(dateStr);
    
    // Format the date for display with correct typing
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    setFormattedDate(now.toLocaleDateString('en-US', options));

    const checkExistingCommitment = async () => {
      try {
        setIsLoading(true);
        const commitmentRef = doc(db, `users/${userData.uid}/commitments/daily/entries/${dateStr}`);
        const commitmentDoc = await getDoc(commitmentRef);
        
        if (commitmentDoc.exists()) {
          setExistingCommitment(commitmentDoc.data());
          router.push(`/commitments/${dateStr}`);
        } else {
          setExistingCommitment(null);
        }
      } catch (error) {
        console.error('Error checking existing commitment:', error);
        toast.error('Failed to check existing commitments');
      } finally {
        setIsLoading(false);
      }
    };

    checkExistingCommitment();
  }, [auth?.userData, router]);

  const onSubmit = async (data: CommitmentFormValues) => {
    if (!auth?.userData) {
      toast.error('You must be logged in to submit a commitment');
      return;
    }
    
    // If a commitment already exists for today, don't allow a new submission
    if (existingCommitment) {
      toast.error('You have already submitted a commitment for today');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Calculate total expected revenue from all expected closures
      const totalExpectedRevenue = data.expectedClosures.reduce(
        (sum, closure) => sum + Number(closure.expectedRevenue),
        0
      );

      const now = new Date();
      const weekOfYear = getWeekNumber(now);
      const year = now.getFullYear();
      const month = now.getMonth() + 1;
      const day = now.getDate();
      const monthStr = `${year}-${month.toString().padStart(2, '0')}`;
      const weekStr = `${year}-W${weekOfYear.toString().padStart(2, '0')}`;
      const dateStr = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      
      // Create commitment data
      const commitmentData = {
        target: data.callsToBeMade,
        achieved: 0,
        startDate: serverTimestamp(),
        endDate: Timestamp.fromDate(getEndOfDay(now)),
        status: 'pending', // "achieved", "pending", "missed"
        weekNumber: weekOfYear,
        expectedClosures: data.expectedClosures.map(closure => ({
          ...closure,
          expectedRevenue: Number(closure.expectedRevenue)
        })),
        expectedMeetings: data.expectedMeetings.map(meeting => ({
          ...meeting,
          prospectId: meeting.prospectId || '',
          prospectName: meeting.prospectName || ''
        })),
        expectedProspects: {
          total: Number(data.expectedProspects.total)
        },
        totalExpectedRevenue,
        userId: auth.userData.uid,
        date: dateStr,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      // Create daily commitment
      const dailyCommitmentsRef = collection(db, `users/${auth.userData.uid}/commitments/daily/entries`);
      await setDoc(doc(dailyCommitmentsRef, dateStr), commitmentData);
      
      // Store weekly commitment (aggregated)
      const weeklyCommitmentsRef = collection(db, `users/${auth.userData.uid}/commitments/weekly/entries`);
      await setDoc(doc(weeklyCommitmentsRef, weekStr), commitmentData);
      
      // Update daily commitment
      const monthlyCommitmentsRef = collection(db, `users/${auth.userData.uid}/commitments/monthly/entries`);
      await setDoc(doc(monthlyCommitmentsRef, monthStr), commitmentData);
      
      console.log('Created new commitments successfully');
      
      toast.success('Commitment submitted successfully! Your commitment is now locked for today.');
      router.push('/dashboard');
    } catch (error) {
      console.error('Error creating commitment:', error);
      toast.error('Failed to submit commitment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const addExpectedClosure = () => {
    appendClosure({ 
      customerName: '', 
      contactDetails: '', 
      products: '', 
      expectedRevenue: 0, 
      notes: '' 
    });
  };

  const addExpectedMeeting = () => {
    appendMeeting({ 
      prospectId: '',
      prospectName: '',
      type: 'online',
      product: ''
    });
  };

  // Helper function to get the week number of a date
  const getWeekNumber = (date: Date): number => {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  };

  // Helper function to get end of day
  const getEndOfDay = (date: Date): Date => {
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    return endOfDay;
  };

  // Helper function to get end of month
  const getEndOfMonth = (date: Date): Date => {
    const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    endOfMonth.setHours(23, 59, 59, 999);
    return endOfMonth;
  };

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

  if (existingCommitment) {
    return (
      <AppLayout>
        <div className="max-w-4xl mx-auto py-8 px-4">
          <div className="flex items-center mb-6">
            <FiCalendar className="text-blue-600 mr-2" size={24} />
            <h1 className="text-2xl font-bold">Commitment for {formattedDate}</h1>
          </div>
          
          <Card className="p-6 bg-blue-50 border-blue-200">
            <div className="flex items-center mb-4">
              <FiLock className="text-blue-600 mr-3" size={20} />
              <h2 className="text-xl font-semibold text-blue-800">Commitment Already Submitted</h2>
            </div>
            <p className="mb-4">
              You have already submitted your commitment for today to make <strong>{existingCommitment.target}</strong> calls.
              Daily commitments are locked once submitted to maintain accountability.
            </p>
            <div className="flex gap-4">
              <Button
                variant="outline"
                onClick={() => router.push('/commitments')}
              >
                View All Commitments
              </Button>
              <Button
                variant="primary"
                onClick={() => router.push('/reports/new')}
              >
                Submit Today's Report
              </Button>
            </div>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="flex items-center mb-6">
          <FiCalendar className="text-blue-600 mr-2" size={24} />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Commitment for {formattedDate}</h1>
        </div>
        
        <Card className="p-6 bg-white dark:bg-gray-800">
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                How many calls are you committing to make today?
              </label>
              <Input
                type="number"
                min="0"
                {...register('callsToBeMade', { 
                  required: 'This field is required',
                  min: { value: 1, message: 'Please commit to at least 1 call' }
                })}
                className="w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                error={errors.callsToBeMade?.message}
              />
            </div>
            
            <div className="mb-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Expected Meetings</h3>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={addExpectedMeeting}
                >
                  <FiUsers className="mr-1" /> Add Meeting
                </Button>
              </div>
              
              {meetingFields.map((field, index) => (
                <div key={field.id} className="border rounded-lg p-4 mb-4 bg-white dark:bg-gray-700">
                  <div className="flex justify-between mb-2">
                    <h4 className="font-medium text-gray-900 dark:text-white">Meeting #{index + 1}</h4>
                    <button 
                      type="button" 
                      onClick={() => removeMeeting(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <FiTrash2 />
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Prospect
                      </label>
                      <Select
                        {...register(`expectedMeetings.${index}.prospectId`)}
                        className="w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        <option value="">Select a prospect</option>
                        {prospects.map(prospect => (
                          <option key={prospect.id} value={prospect.id}>
                            {prospect.name}
                          </option>
                        ))}
                      </Select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Meeting Type
                      </label>
                      <Select
                        {...register(`expectedMeetings.${index}.type`)}
                        className="w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        <option value="online">Online</option>
                        <option value="offline">Offline</option>
                      </Select>
                    </div>
                    
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Product of Interest
                      </label>
                      <Input
                        type="text"
                        {...register(`expectedMeetings.${index}.product`)}
                        className="w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mb-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Expected Closures</h3>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={addExpectedClosure}
                >
                  <FiPlus className="mr-1" /> Add Closure
                </Button>
              </div>
              
              {closureFields.map((field, index) => (
                <div key={field.id} className="border rounded-lg p-4 mb-4 bg-white dark:bg-gray-700">
                  <div className="flex justify-between mb-2">
                    <h4 className="font-medium text-gray-900 dark:text-white">Expected Closure #{index + 1}</h4>
                    <button 
                      type="button" 
                      onClick={() => removeClosure(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <FiTrash2 />
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Customer Name
                      </label>
                      <Input
                        type="text"
                        {...register(`expectedClosures.${index}.customerName`, { 
                          required: 'Customer name is required' 
                        })}
                        className="w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        error={errors.expectedClosures?.[index]?.customerName?.message}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Contact Details
                      </label>
                      <Input
                        type="text"
                        {...register(`expectedClosures.${index}.contactDetails`, { 
                          required: 'Contact details are required' 
                        })}
                        className="w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        error={errors.expectedClosures?.[index]?.contactDetails?.message}
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Products
                      </label>
                      <Input
                        type="text"
                        {...register(`expectedClosures.${index}.products`, { 
                          required: 'Products are required' 
                        })}
                        className="w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        error={errors.expectedClosures?.[index]?.products?.message}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Expected Revenue
                      </label>
                      <Input
                        type="number"
                        min="0"
                        {...register(`expectedClosures.${index}.expectedRevenue`, { 
                          required: 'Expected revenue is required',
                          min: { value: 0, message: 'Revenue cannot be negative' }
                        })}
                        className="w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        error={errors.expectedClosures?.[index]?.expectedRevenue?.message}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Notes (Optional)
                    </label>
                    <textarea
                      {...register(`expectedClosures.${index}.notes`)}
                      className="w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm p-3 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white min-h-[100px] resize-y"
                      placeholder="Add any additional information about this expected closure..."
                      rows={3}
                    />
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Expected Prospects</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Total Number of Expected Prospects
                </label>
                <Input
                  type="number"
                  min="0"
                  {...register('expectedProspects.total', { 
                    required: 'This field is required',
                    min: { value: 0, message: 'Number cannot be negative' }
                  })}
                  className="w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  error={errors.expectedProspects?.total?.message}
                />
              </div>
            </div>
            
            <div className="flex justify-end">
              <Button 
                type="submit" 
                isLoading={isSubmitting}
                disabled={isSubmitting}
              >
                <FiSave className="mr-2" /> Submit Commitment
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </AppLayout>
  );
} 