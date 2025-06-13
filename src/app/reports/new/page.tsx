'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { FiPlus, FiTrash2, FiSave, FiCheck, FiX, FiCalendar, FiLock, FiUsers } from 'react-icons/fi';
import { collection, query, where, getDocs, doc, getDoc, setDoc, updateDoc, Timestamp, serverTimestamp, DocumentData } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'react-toastify';
import AppLayout from '@/components/layout/AppLayout';
import Card from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';

interface Prospect {
  name: string;
  contact: string;
  source: string;
  remarks: string;
}

interface MeetingOutcome {
  meetingId: string;
  prospectId: string;
  prospectName: string;
  outcome: 'converted' | 'lost' | 'follow_up' | 'rescheduled';
  expectedRevenue: number;
  rescheduledDate?: string;
  notes?: string;
}

interface Closure {
  prospectId: string;
  prospectName: string;
  product: string;
  amount: number;
  closureDate: string;
  notes?: string;
}

interface ReportFormValues {
  callsMade: number;
  callsTarget: number;
  prospects: Prospect[];
  meetingsBooked: number;
  totalExpectedRevenue: number;
  feedback: string;
  meetingOutcomes: MeetingOutcome[];
  closures: Closure[];
  totalProspects: number;
  convertedProspects: number;
}

interface Commitment {
  id: string;
  target: number;
  achieved: number;
  status: string;
  expectedMeetings: Array<{
    prospectId: string;
    prospectName: string;
    type: 'online' | 'offline';
    product: string;
  }>;
}

export default function NewReportPage() {
  const router = useRouter();
  const auth = useAuth();
  const userData = auth?.userData;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [todayCommitment, setTodayCommitment] = useState<Commitment | null>(null);
  const [isLoadingCommitment, setIsLoadingCommitment] = useState(true);
  const [existingReport, setExistingReport] = useState<DocumentData | null>(null);
  const [formattedDate, setFormattedDate] = useState('');
  const [todayDateString, setTodayDateString] = useState('');
  const [prospects, setProspects] = useState<Array<{ id: string; name: string; dateAdded?: Timestamp }>>([]);
  
  const { 
    register, 
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    control
  } = useForm<ReportFormValues>({
    defaultValues: {
      callsMade: 0,
      callsTarget: 0,
      prospects: [],
      meetingsBooked: 0,
      totalExpectedRevenue: 0,
      feedback: '',
      meetingOutcomes: [],
      closures: [],
      totalProspects: 0,
      convertedProspects: 0
    }
  });
  
  const { fields: prospectFields, append: appendProspect, remove: removeProspect } = useFieldArray({
    control: control,
    name: "prospects"
  });

  const { fields: meetingFields, append: appendMeeting, remove: removeMeeting } = useFieldArray({
    control: control,
    name: "meetingOutcomes"
  });

  const { fields: closureFields, append: appendClosure, remove: removeClosure } = useFieldArray({
    control: control,
    name: "closures"
  });

  // Watch for meeting scheduled to conditionally show meeting details
  const watchedProspects = watch("prospects");

  // Watch closures to calculate total revenue
  const closures = watch('closures');
  const totalRevenue = closures?.reduce((sum, closure) => sum + (closure.amount || 0), 0) || 0;

  // Watch for changes in prospects and meeting outcomes to update totals
  useEffect(() => {
    const prospects = watch("prospects");
    const meetingOutcomes = watch("meetingOutcomes");
    
    // Update total prospects
    setValue("totalProspects", prospects.length);
    
    // Update converted prospects based on meeting outcomes
    const converted = meetingOutcomes.filter(outcome => outcome.outcome === 'converted').length;
    setValue("convertedProspects", converted);
  }, [watch("prospects"), watch("meetingOutcomes"), setValue]);

  // Helper function for getting date strings
  const getDateStrings = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const day = now.getDate();
    const weekNumber = getWeekNumber(now);
    
    // Set formatted date for display
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    setFormattedDate(now.toLocaleDateString('en-US', options));
    
    // Calculate date string
    const dateStr = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    setTodayDateString(dateStr);
    
    return {
      dateStr,
      weekStr: `${year}-W${weekNumber.toString().padStart(2, '0')}`,
      monthStr: `${year}-${month.toString().padStart(2, '0')}`,
      year,
      month,
      day,
      weekNumber
    };
  };

  // Fetch today's commitment and check for existing report
  useEffect(() => {
    if (!userData) return;

    const fetchData = async () => {
      try {
        setIsLoadingCommitment(true);
        const { dateStr } = getDateStrings();
        
        // Get today's daily commitment
        const dailyCommitmentRef = doc(db, `users/${userData.uid}/commitments/daily/entries/${dateStr}`);
        const dailyCommitmentDoc = await getDoc(dailyCommitmentRef);
        
        if (dailyCommitmentDoc.exists()) {
          const commitmentData = dailyCommitmentDoc.data();
          
          setTodayCommitment({
            id: dailyCommitmentDoc.id,
            target: commitmentData.target,
            achieved: commitmentData.achieved || 0,
            status: commitmentData.status,
            expectedMeetings: commitmentData.expectedMeetings || []
          });
          
          // Pre-fill callsMade with the committed number
          setValue('callsMade', commitmentData.target);
        } else {
          console.log('No commitment found for today');
          setTodayCommitment(null);
        }
        
        // Check if report already exists for today
        const reportRef = doc(db, `users/${userData.uid}/reports/daily/entries/${dateStr}`);
        const reportDoc = await getDoc(reportRef);
        
        if (reportDoc.exists()) {
          setExistingReport(reportDoc.data());
        } else {
          setExistingReport(null);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to fetch data');
      } finally {
        setIsLoadingCommitment(false);
      }
    };

    fetchData();
  }, [userData, setValue]);

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

  // Get week number
  const getWeekNumber = (date: Date): number => {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  };

  const onSubmit = async (data: ReportFormValues) => {
    if (!userData) {
      toast.error('You must be logged in to submit a report');
      return;
    }
    
    // Prevent submitting report if one already exists
    if (existingReport) {
      toast.error('You have already submitted a report for today');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Count meetings booked
      const meetingsBooked = data.meetingOutcomes.length;
      
      // Calculate total expected revenue
      const totalExpectedRevenue = data.meetingOutcomes.reduce((sum, meeting) => 
        sum + meeting.expectedRevenue, 0
      );
      
      // Get date information
      const { dateStr, weekStr, monthStr, year, month, day, weekNumber } = getDateStrings();
      const now = new Date();
      
      // 1. Update the daily commitment to mark it as achieved
      if (todayCommitment) {
        const dailyCommitmentRef = doc(db, `users/${userData.uid}/commitments/daily/entries/${dateStr}`);
        await updateDoc(dailyCommitmentRef, {
          achieved: data.callsMade,
          status: data.callsMade >= todayCommitment.target ? 'achieved' : 'missed',
          updatedAt: serverTimestamp()
        });
        
        // 2. Update weekly accomplishment stats
        const weeklyStatsRef = doc(db, `users/${userData.uid}/stats/weeklyAccomplishments/entries/${weekStr}`);
        const weeklyStatsDoc = await getDoc(weeklyStatsRef);
        
        if (weeklyStatsDoc.exists()) {
          const weeklyStats = weeklyStatsDoc.data();
          await updateDoc(weeklyStatsRef, {
            tasksCompleted: (weeklyStats.tasksCompleted || 0) + 1,
            extraTasks: (weeklyStats.extraTasks || 0) + Math.max(0, data.callsMade - todayCommitment.target),
            updatedAt: serverTimestamp()
          });
        } else {
          await setDoc(weeklyStatsRef, {
            tasksCompleted: 1,
            extraTasks: Math.max(0, data.callsMade - todayCommitment.target),
            startDate: Timestamp.fromDate(getStartOfWeek(now)),
            endDate: Timestamp.fromDate(getEndOfWeek(now)),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
        }
        
        // 3. Update monthly accomplishment stats
        const monthlyStatsRef = doc(db, `users/${userData.uid}/stats/monthlyAccomplishments/entries/${monthStr}`);
        const monthlyStatsDoc = await getDoc(monthlyStatsRef);
        
        if (monthlyStatsDoc.exists()) {
          const monthlyStats = monthlyStatsDoc.data();
          await updateDoc(monthlyStatsRef, {
            tasksCompleted: (monthlyStats.tasksCompleted || 0) + 1,
            extraTasks: (monthlyStats.extraTasks || 0) + Math.max(0, data.callsMade - todayCommitment.target),
            updatedAt: serverTimestamp()
          });
        } else {
          await setDoc(monthlyStatsRef, {
            tasksCompleted: 1,
            extraTasks: Math.max(0, data.callsMade - todayCommitment.target),
            startDate: Timestamp.fromDate(new Date(year, month - 1, 1)), // First day of month
            endDate: Timestamp.fromDate(getEndOfMonth(now)),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
        }
        
        // 4. Store the daily report
        const userReportsRef = collection(db, `users/${userData.uid}/reports/daily/entries`);
        await setDoc(doc(userReportsRef, dateStr), {
          callsMade: data.callsMade,
          callsTarget: todayCommitment.target,
          completion: (data.callsMade / todayCommitment.target) * 100,
          prospectsCount: data.prospects.length,
          totalProspects: data.totalProspects,
          convertedProspects: data.convertedProspects,
          meetingsBooked,
          totalExpectedRevenue,
          feedback: data.feedback || '',
          date: now,
          dateStr,
          weekStr,
          monthStr,
          year,
          month,
          day,
          weekNumber,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });

        // 5. Store prospects in the user's prospects collection
        const prospectsRef = collection(db, `users/${userData.uid}/prospects`);
        for (const prospect of data.prospects) {
          const newProspectRef = doc(prospectsRef);
          await setDoc(newProspectRef, {
            ...prospect,
            userId: userData.uid,
            dateAdded: serverTimestamp(),
            status: 'pending',
            reportDate: dateStr,
            updatedAt: serverTimestamp()
          });
        }

        // 6. Store meeting outcomes
        const meetingsRef = collection(db, `users/${userData.uid}/reports/daily/entries/${dateStr}/meetings`);
        for (const meeting of data.meetingOutcomes) {
          const newMeetingRef = doc(meetingsRef);
          await setDoc(newMeetingRef, {
            ...meeting,
            userId: userData.uid,
            date: now,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
        }
        
        console.log('Report submitted successfully');
        toast.success('Report submitted successfully! Your daily report is now recorded.');
        router.push('/dashboard');
      } else {
        // No commitment found, just store the report
        const userReportsRef = collection(db, `users/${userData.uid}/reports/daily/entries`);
        await setDoc(doc(userReportsRef, dateStr), {
          callsMade: data.callsMade,
          callsTarget: 0,
          completion: 100, // No target, so consider it 100% complete
          prospectsCount: data.prospects.length,
          totalProspects: data.totalProspects,
          convertedProspects: data.convertedProspects,
          meetingsBooked,
          totalExpectedRevenue,
          feedback: data.feedback || '',
          date: now,
          dateStr,
          weekStr,
          monthStr,
          year,
          month,
          day,
          weekNumber,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });

        // Store prospects in the user's prospects collection
        const prospectsRef = collection(db, `users/${userData.uid}/prospects`);
        for (const prospect of data.prospects) {
          const newProspectRef = doc(prospectsRef);
          await setDoc(newProspectRef, {
            ...prospect,
            userId: userData.uid,
            dateAdded: serverTimestamp(),
            status: 'pending',
            reportDate: dateStr,
            updatedAt: serverTimestamp()
          });
        }
        
        // Update stats
        const weeklyStatsRef = doc(db, `users/${userData.uid}/stats/weeklyAccomplishments/entries/${weekStr}`);
        const weeklyStatsDoc = await getDoc(weeklyStatsRef);
        
        if (weeklyStatsDoc.exists()) {
          const weeklyStats = weeklyStatsDoc.data();
          await updateDoc(weeklyStatsRef, {
            extraTasks: (weeklyStats.extraTasks || 0) + data.callsMade,
            updatedAt: serverTimestamp()
          });
        } else {
          await setDoc(weeklyStatsRef, {
            tasksCompleted: 0,
            extraTasks: data.callsMade,
            startDate: Timestamp.fromDate(getStartOfWeek(now)),
            endDate: Timestamp.fromDate(getEndOfWeek(now)),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
        }
        
        console.log('Report submitted without a commitment');
        toast.success('Report submitted successfully! (No prior commitment found)');
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('Error submitting report:', error);
      toast.error('Failed to submit report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper date functions
  const getStartOfWeek = (date: Date): Date => {
    const day = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Adjust to get Monday
    const monday = new Date(date);
    monday.setDate(diff);
    monday.setHours(0, 0, 0, 0);
    return monday;
  };
  
  const getEndOfWeek = (date: Date): Date => {
    const startOfWeek = getStartOfWeek(date);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6); // Sunday
    endOfWeek.setHours(23, 59, 59, 999);
    return endOfWeek;
  };
  
  const getEndOfMonth = (date: Date): Date => {
    const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    endOfMonth.setHours(23, 59, 59, 999);
    return endOfMonth;
  };

  if (isLoadingCommitment) {
    return (
      <AppLayout>
        <div className="flex justify-center items-center min-h-[60vh]">
          <p>Loading data...</p>
        </div>
      </AppLayout>
    );
  }

  if (existingReport) {
    return (
      <AppLayout>
        <div className="max-w-4xl mx-auto py-8 px-4">
          <div className="flex items-center mb-6">
            <FiCalendar className="text-blue-600 mr-2" size={24} />
            <h1 className="text-2xl font-bold">Report for {formattedDate}</h1>
          </div>
          
          <Card className="p-6 bg-green-50 border-green-200">
            <div className="flex items-center mb-4">
              <FiCheck className="text-green-600 mr-3" size={20} />
              <h2 className="text-xl font-semibold text-green-800">Report Already Submitted</h2>
            </div>
            <p className="mb-4">
              You have already submitted your report for today with {existingReport.callsMade} calls made
              {existingReport.meetingsBooked > 0 && ` and ${existingReport.meetingsBooked} meetings booked`}.
              Daily reports are locked once submitted to maintain accountability.
            </p>
            <div className="flex gap-4">
              <Button
                variant="outline"
                onClick={() => router.push('/commitments')}
              >
                View All Reports
              </Button>
              <Button
                variant="primary"
                onClick={() => router.push('/dashboard')}
              >
                Back to Dashboard
              </Button>
            </div>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8">
        <Card>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="flex items-center mb-6">
              <FiCalendar className="text-blue-600 mr-2" size={24} />
              <h1 className="text-2xl font-bold text-secondary-900 dark:text-secondary-100">Report for {formattedDate}</h1>
            </div>
            
            <Card className="p-6 mb-6">
              {isLoadingCommitment ? (
                <div className="flex justify-center py-6">
                  <p className="text-secondary-900 dark:text-secondary-100">Loading your commitment data...</p>
                </div>
              ) : todayCommitment ? (
                <div className="mb-4 bg-blue-50 p-4 rounded-lg">
                  <h2 className="text-lg font-medium text-blue-800 dark:text-blue-200">Today's Commitment</h2>
                  <p className="text-blue-700 dark:text-blue-300">
                    You committed to making <strong>{todayCommitment.target}</strong> calls today.
                  </p>
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-secondary-900 dark:text-secondary-100 mb-1">
                      Actual Calls Made
                    </label>
                    <input
                      type="number"
                      {...register('callsMade', { 
                        required: true,
                        min: 0,
                        valueAsNumber: true
                      })}
                      className="w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-secondary-700 text-secondary-900 dark:text-secondary-100"
                      placeholder="Enter the number of calls you made today"
                    />
                    {errors.callsMade && (
                      <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                        Please enter the number of calls made
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="mb-4 bg-yellow-50 p-4 rounded-lg">
                  <h2 className="text-lg font-medium text-yellow-800 dark:text-yellow-200">No Commitment Found</h2>
                  <p className="text-yellow-700 dark:text-yellow-300">
                    You didn't set a morning commitment for today. You can still submit your report.
                  </p>
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-secondary-900 dark:text-secondary-100 mb-1">
                      Calls Made Today
                    </label>
                    <input
                      type="number"
                      {...register('callsMade', { 
                        required: true,
                        min: 0,
                        valueAsNumber: true
                      })}
                      className="w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-secondary-700 text-secondary-900 dark:text-secondary-100"
                      placeholder="Enter the number of calls you made today"
                    />
                    {errors.callsMade && (
                      <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                        Please enter the number of calls made
                      </p>
                    )}
                  </div>
                </div>
              )}
            </Card>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-secondary-900 dark:text-secondary-100">Prospects Added Today</h3>
                <Button
                  type="button"
                  onClick={() => appendProspect({ name: '', contact: '', source: '', remarks: '' })}
                  className="flex items-center space-x-2"
                >
                  <FiPlus />
                  <span>Add Prospect</span>
                </Button>
              </div>

              {prospectFields.map((field, index) => (
                <div key={field.id} className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-secondary-800">
                  <Input
                    label="Name"
                    {...register(`prospects.${index}.name` as const)}
                    required
                    className="bg-white dark:bg-secondary-700 text-secondary-900 dark:text-secondary-100"
                  />
                  <Input
                    label="Contact"
                    {...register(`prospects.${index}.contact` as const)}
                    required
                    className="bg-white dark:bg-secondary-700 text-secondary-900 dark:text-secondary-100"
                  />
                  <Input
                    label="Source"
                    {...register(`prospects.${index}.source` as const)}
                    required
                    className="bg-white dark:bg-secondary-700 text-secondary-900 dark:text-secondary-100"
                  />
                  <Input
                    label="Remarks"
                    {...register(`prospects.${index}.remarks` as const)}
                    className="bg-white dark:bg-secondary-700 text-secondary-900 dark:text-secondary-100"
                  />
                  <div className="col-span-2 flex justify-end">
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      onClick={() => removeProspect(index)}
                    >
                      <FiTrash2 className="mr-1" />
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-secondary-900 dark:text-secondary-100">Meeting Outcomes</h3>
                <Button
                  type="button"
                  onClick={() => appendMeeting({
                    meetingId: '',
                    prospectId: '',
                    prospectName: '',
                    outcome: 'follow_up',
                    expectedRevenue: 0
                  })}
                  className="flex items-center space-x-2"
                >
                  <FiUsers />
                  <span>Add Meeting Outcome</span>
                </Button>
              </div>

              {meetingFields.map((field, index) => (
                <div key={field.id} className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-secondary-800">
                  <div>
                    <label className="block text-sm font-medium text-secondary-900 dark:text-secondary-100 mb-1">
                      Prospect
                    </label>
                    <Select
                      {...register(`meetingOutcomes.${index}.prospectId`)}
                      className="w-full bg-white dark:bg-secondary-700 text-secondary-900 dark:text-secondary-100 border-gray-300 dark:border-gray-600"
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
                    <label className="block text-sm font-medium text-secondary-900 dark:text-secondary-100 mb-1">
                      Outcome
                    </label>
                    <Select
                      {...register(`meetingOutcomes.${index}.outcome`)}
                      className="w-full bg-white dark:bg-secondary-700 text-secondary-900 dark:text-secondary-100 border-gray-300 dark:border-gray-600"
                    >
                      <option value="converted">Converted</option>
                      <option value="lost">Lost</option>
                      <option value="follow_up">Follow Up</option>
                      <option value="rescheduled">Rescheduled</option>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-secondary-900 dark:text-secondary-100 mb-1">
                      Expected Revenue
                    </label>
                    <Input
                      type="number"
                      {...register(`meetingOutcomes.${index}.expectedRevenue`)}
                      className="w-full bg-white dark:bg-secondary-700 text-secondary-900 dark:text-secondary-100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-secondary-900 dark:text-secondary-100 mb-1">
                      Rescheduled Date
                    </label>
                    <Input
                      type="date"
                      {...register(`meetingOutcomes.${index}.rescheduledDate`)}
                      className="w-full bg-white dark:bg-secondary-700 text-secondary-900 dark:text-secondary-100"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-secondary-900 dark:text-secondary-100 mb-1">
                      Notes
                    </label>
                    <Input
                      type="text"
                      {...register(`meetingOutcomes.${index}.notes`)}
                      className="w-full bg-white dark:bg-secondary-700 text-secondary-900 dark:text-secondary-100"
                    />
                  </div>

                  <div className="col-span-2 flex justify-end">
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      onClick={() => removeMeeting(index)}
                    >
                      <FiTrash2 className="mr-1" />
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-secondary-900 dark:text-secondary-100">Closures Received</h3>
                <Button
                  type="button"
                  onClick={() => appendClosure({
                    prospectId: '',
                    prospectName: '',
                    product: '',
                    amount: 0,
                    closureDate: new Date().toISOString().split('T')[0],
                    notes: ''
                  })}
                  className="flex items-center space-x-2"
                >
                  <FiCheck className="mr-1" />
                  <span>Add Closure</span>
                </Button>
              </div>

              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-lg font-medium text-green-800 dark:text-green-200">Total Revenue Generated</h4>
                    <p className="text-sm text-green-700 dark:text-green-300">Sum of all closure amounts</p>
                  </div>
                  <div className="text-2xl font-bold text-green-800 dark:text-green-200">
                    ${totalRevenue.toLocaleString()}
                  </div>
                </div>
              </div>

              {closureFields.map((field, index) => (
                <div key={field.id} className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-secondary-800">
                  <div>
                    <label className="block text-sm font-medium text-secondary-900 dark:text-secondary-100 mb-1">
                      Prospect
                    </label>
                    <Select
                      {...register(`closures.${index}.prospectId`)}
                      onChange={(e) => {
                        const selectedProspect = prospects.find(p => p.id === e.target.value);
                        if (selectedProspect) {
                          setValue(`closures.${index}.prospectName`, selectedProspect.name);
                          setValue(`closures.${index}.closureDate`, new Date().toISOString().split('T')[0]);
                        }
                      }}
                      className="w-full bg-white dark:bg-secondary-700 text-secondary-900 dark:text-secondary-100 border-gray-300 dark:border-gray-600"
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
                    <label className="block text-sm font-medium text-secondary-900 dark:text-secondary-100 mb-1">
                      Product
                    </label>
                    <Input
                      type="text"
                      {...register(`closures.${index}.product` as const)}
                      required
                      className="w-full bg-white dark:bg-secondary-700 text-secondary-900 dark:text-secondary-100"
                      placeholder="Enter product name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-secondary-900 dark:text-secondary-100 mb-1">
                      Amount
                    </label>
                    <Input
                      type="number"
                      {...register(`closures.${index}.amount` as const, {
                        required: true,
                        min: 0,
                        valueAsNumber: true
                      })}
                      required
                      className="w-full bg-white dark:bg-secondary-700 text-secondary-900 dark:text-secondary-100"
                      placeholder="Enter closure amount"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-secondary-900 dark:text-secondary-100 mb-1">
                      Closure Date
                    </label>
                    <Input
                      type="date"
                      {...register(`closures.${index}.closureDate` as const)}
                      required
                      className="w-full bg-white dark:bg-secondary-700 text-secondary-900 dark:text-secondary-100"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-secondary-900 dark:text-secondary-100 mb-1">
                      Notes
                    </label>
                    <Input
                      type="text"
                      {...register(`closures.${index}.notes` as const)}
                      className="w-full bg-white dark:bg-secondary-700 text-secondary-900 dark:text-secondary-100"
                      placeholder="Add any additional notes about the closure"
                    />
                  </div>

                  <div className="col-span-2 flex justify-end">
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      onClick={() => removeClosure(index)}
                    >
                      <FiTrash2 className="mr-1" />
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-secondary-900 dark:text-secondary-100 mb-1">
                Feedback (Optional)
              </label>
              <textarea
                {...register('feedback')}
                className="w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm p-3 focus:ring-blue-500 focus:border-blue-500 min-h-[120px] resize-y bg-white dark:bg-secondary-700 text-secondary-900 dark:text-secondary-100"
                placeholder="Share your experience today: any challenges faced, what went well, prospects that need follow-up, or suggestions for improvement..."
                rows={4}
              />
            </div>
            
            <div className="flex justify-end">
              <Button 
                type="submit" 
                isLoading={isSubmitting}
                disabled={isSubmitting}
              >
                <FiSave className="mr-2" /> Submit Report
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </AppLayout>
  );
} 