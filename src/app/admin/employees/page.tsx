'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, where, getDocs, orderBy, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import AppLayout from '@/components/layout/AppLayout';
import Card from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { FiUsers, FiPlus, FiEdit2, FiTrash2, FiSearch, FiFilter, FiFileText } from 'react-icons/fi';
import { toast } from 'react-toastify';

interface Employee {
  uid: string;
  name: string;
  email: string;
  role: 'employee' | 'admin' | 'manager';
  isActive: boolean;
  joinedDate: any;
  lastLogin?: any;
  profilePictureUrl?: string;
}

export default function EmployeesPage() {
  const router = useRouter();
  const auth = useAuth();
  const userData = auth?.userData;
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  useEffect(() => {
    if (!userData || userData.role !== 'admin') {
      router.push('/dashboard');
      return;
    }
    fetchEmployees();
  }, [userData, router]);

  const fetchEmployees = async () => {
    if (!userData) return;

    try {
      setLoading(true);
      const usersRef = collection(db, 'users');
      const usersQuery = query(usersRef, orderBy('name'));
      const usersSnapshot = await getDocs(usersQuery);
      
      const employeesData = usersSnapshot.docs.map(doc => ({
        uid: doc.id,
        ...doc.data()
      })) as Employee[];

      setEmployees(employeesData);
    } catch (error) {
      console.error('Error fetching employees:', error);
      toast.error('Failed to fetch employees');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (employee: Employee, newStatus: boolean) => {
    try {
      const userRef = doc(db, 'users', employee.uid);
      await updateDoc(userRef, {
        isActive: newStatus,
        updatedAt: serverTimestamp()
      });

      setEmployees(prev => prev.map(emp => 
        emp.uid === employee.uid ? { ...emp, isActive: newStatus } : emp
      ));

      toast.success(`Employee ${newStatus ? 'activated' : 'deactivated'} successfully`);
    } catch (error) {
      console.error('Error updating employee status:', error);
      toast.error('Failed to update employee status');
    }
  };

  const handleRoleChange = async (employee: Employee, newRole: string) => {
    try {
      const userRef = doc(db, 'users', employee.uid);
      await updateDoc(userRef, {
        role: newRole,
        updatedAt: serverTimestamp()
      });

      setEmployees(prev => prev.map(emp => 
        emp.uid === employee.uid ? { ...emp, role: newRole as 'employee' | 'admin' | 'manager' } : emp
      ));

      toast.success('Employee role updated successfully');
    } catch (error) {
      console.error('Error updating employee role:', error);
      toast.error('Failed to update employee role');
    }
  };

  const filteredEmployees = employees.filter(employee => {
    const matchesSearch = 
      employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = roleFilter === 'all' || employee.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && employee.isActive) ||
      (statusFilter === 'inactive' && !employee.isActive);

    return matchesSearch && matchesRole && matchesStatus;
  });

  if (loading) {
    return (
      <AppLayout>
        <div className="flex justify-center items-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-secondary-900 dark:text-secondary-100">Employee Management</h1>
          <Button
            variant="primary"
            onClick={() => router.push('/admin/employees/new')}
          >
            <FiPlus className="mr-2" />
            Add Employee
          </Button>
        </div>

        {/* Filters */}
        <Card className="p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Input
                type="text"
                placeholder="Search employees..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-white dark:bg-secondary-800"
              />
            </div>
            <div>
              <Select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="bg-white dark:bg-secondary-800"
              >
                <option value="all">All Roles</option>
                <option value="employee">Employee</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </Select>
            </div>
            <div>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-white dark:bg-secondary-800"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </Select>
            </div>
          </div>
        </Card>

        {/* Employees List */}
        <Card>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-secondary-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Employee
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Joined Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Last Login
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-secondary-900 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredEmployees.map((employee) => (
                  <tr key={employee.uid}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          {employee.profilePictureUrl ? (
                            <img
                              className="h-10 w-10 rounded-full"
                              src={employee.profilePictureUrl}
                              alt={employee.name}
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
                              <FiUsers className="text-primary-500" />
                            </div>
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {employee.name}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {employee.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Select
                        value={employee.role}
                        onChange={(e) => handleRoleChange(employee, e.target.value)}
                        className="w-32 bg-white dark:bg-secondary-800"
                      >
                        <option value="employee">Employee</option>
                        <option value="manager">Manager</option>
                        <option value="admin">Admin</option>
                      </Select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          employee.isActive
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        }`}
                      >
                        {employee.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {employee.joinedDate?.toDate().toLocaleDateString() || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {employee.lastLogin?.toDate().toLocaleDateString() || 'Never'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/admin/employees/${employee.uid}`)}
                        >
                          <FiFileText className="mr-1" />
                          View Details
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedEmployee(employee);
                            setShowEditModal(true);
                          }}
                        >
                          <FiEdit2 className="mr-1" />
                          Edit
                        </Button>
                        <Button
                          variant={employee.isActive ? "danger" : "primary"}
                          size="sm"
                          onClick={() => handleStatusChange(employee, !employee.isActive)}
                        >
                          {employee.isActive ? (
                            <>
                              <FiTrash2 className="mr-1" />
                              Deactivate
                            </>
                          ) : (
                            'Activate'
                          )}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </AppLayout>
  );
} 