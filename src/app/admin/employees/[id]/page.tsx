'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, where, getDocs, orderBy, doc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import AppLayout from '@/components/layout/AppLayout';
import Card from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { FiArrowLeft, FiCalendar, FiFileText, FiCheck, FiX } from 'react-icons/fi';
import { toast } from 'react-toastify';

interface Employee {
  uid: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  joinedDate: Timestamp;
  lastLogin?: Timestamp;
}

interface Commitment {
  id: string;
  date: Timestamp;
  target: number;
  achieved: number;
  status: 'pending' | 'completed' | 'failed';
}

interface Report {
  id: string;
  date: Timestamp;
  calls_made: number;
  prospects_generated: number;
  meetings_done: number;
  closures_achieved: number;
  revenue_generated: number;
  notes: string;
}

// Helper function to format date
const formatDate = (timestamp: Timestamp | undefined) => {
  if (!timestamp) return 'N/A';
  return timestamp.toDate().toLocaleDateString();
};

// Helper function to format revenue
const formatRevenue = (amount: number | undefined | null) => {
  if (amount === undefined || amount === null) return '$0';
  return `$${amount.toLocaleString()}`;
};

export default function EmployeeDetailsPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const auth = useAuth();
  const userData = auth?.userData;
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [commitments, setCommitments] = useState<Commitment[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'commitments' | 'reports'>('commitments');

  useEffect(() => {
    if (!userData || userData.role !== 'admin') {
      router.push('/dashboard');
      return;
    }
    fetchEmployeeData();
  }, [userData, router, params.id]);

  const fetchEmployeeData = async () => {
    try {
      setLoading(true);

      // Fetch employee details
      const employeeDoc = await getDoc(doc(db, 'users', params.id));
      if (employeeDoc.exists()) {
        const data = employeeDoc.data();
        setEmployee({
          uid: employeeDoc.id,
          ...data,
          joinedDate: data.joinedDate instanceof Timestamp ? data.joinedDate : Timestamp.fromDate(new Date(data.joinedDate)),
          lastLogin: data.lastLogin instanceof Timestamp ? data.lastLogin : data.lastLogin ? Timestamp.fromDate(new Date(data.lastLogin)) : undefined
        } as Employee);
      }

      // Fetch commitments
      const commitmentsRef = collection(db, `users/${params.id}/commitments/daily/entries`);
      const commitmentsQuery = query(commitmentsRef, orderBy('date', 'desc'));
      const commitmentsSnapshot = await getDocs(commitmentsQuery);
      
      const commitmentsData = commitmentsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          date: data.date instanceof Timestamp ? data.date : Timestamp.fromDate(new Date(data.date))
        };
      }) as Commitment[];

      setCommitments(commitmentsData);

      // Fetch reports
      const reportsRef = collection(db, `users/${params.id}/reports/daily/entries`);
      const reportsQuery = query(reportsRef, orderBy('date', 'desc'));
      const reportsSnapshot = await getDocs(reportsQuery);
      
      const reportsData = reportsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          date: data.date instanceof Timestamp ? data.date : Timestamp.fromDate(new Date(data.date))
        };
      }) as Report[];

      setReports(reportsData);

    } catch (error) {
      console.error('Error fetching employee data:', error);
      toast.error('Failed to fetch employee data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex justify-center items-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
        </div>
      </AppLayout>
    );
  }

  if (!employee) {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-secondary-900 dark:text-secondary-100 mb-4">
              Employee not found
            </h1>
            <Button
              variant="outline"
              onClick={() => router.back()}
            >
              <FiArrowLeft className="mr-2" />
              Go Back
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center mb-8">
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="mr-4"
          >
            <FiArrowLeft className="mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold text-secondary-900 dark:text-secondary-100">
            {employee.name}'s Details
          </h1>
        </div>

        {/* Employee Info */}
        <Card className="mb-6">
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <p className="text-sm text-secondary-500 dark:text-secondary-400">Email</p>
                <p className="font-medium">{employee.email}</p>
              </div>
              <div>
                <p className="text-sm text-secondary-500 dark:text-secondary-400">Role</p>
                <p className="font-medium capitalize">{employee.role}</p>
              </div>
              <div>
                <p className="text-sm text-secondary-500 dark:text-secondary-400">Status</p>
                <p className={`font-medium ${
                  employee.isActive ? 'text-green-600' : 'text-red-600'
                }`}>
                  {employee.isActive ? 'Active' : 'Inactive'}
                </p>
              </div>
              <div>
                <p className="text-sm text-secondary-500 dark:text-secondary-400">Joined Date</p>
                <p className="font-medium">
                  {formatDate(employee.joinedDate)}
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Tabs */}
        <div className="flex space-x-4 mb-6">
          <Button
            variant={activeTab === 'commitments' ? 'primary' : 'outline'}
            onClick={() => setActiveTab('commitments')}
          >
            <FiCalendar className="mr-2" />
            Commitments
          </Button>
          <Button
            variant={activeTab === 'reports' ? 'primary' : 'outline'}
            onClick={() => setActiveTab('reports')}
          >
            <FiFileText className="mr-2" />
            Reports
          </Button>
        </div>

        {/* Commitments Tab */}
        {activeTab === 'commitments' && (
          <Card>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-secondary-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Target
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Achieved
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-secondary-900 divide-y divide-gray-200 dark:divide-gray-700">
                  {commitments.map((commitment) => (
                    <tr key={commitment.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(commitment.date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {commitment.target}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {commitment.achieved}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          commitment.status === 'completed'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : commitment.status === 'failed'
                            ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                        }`}>
                          {commitment.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Reports Tab */}
        {activeTab === 'reports' && (
          <Card>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-secondary-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Calls Made
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Prospects
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Meetings
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Closures
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Revenue
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-secondary-900 divide-y divide-gray-200 dark:divide-gray-700">
                  {reports.map((report) => (
                    <tr key={report.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(report.date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {report.calls_made}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {report.prospects_generated}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {report.meetings_done}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {report.closures_achieved}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {formatRevenue(report.revenue_generated)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </AppLayout>
  );
} 