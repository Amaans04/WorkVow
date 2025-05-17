'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth as firebaseAuth, db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import AppLayout from '@/components/layout/AppLayout';
import Card from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { FiUserPlus, FiArrowLeft } from 'react-icons/fi';
import { toast } from 'react-toastify';

export default function NewEmployeePage() {
  const router = useRouter();
  const auth = useAuth();
  const userData = auth?.userData;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'employee' as 'employee' | 'admin' | 'manager'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userData || userData.role !== 'admin') {
      toast.error('Only administrators can add new employees');
      return;
    }

    setIsSubmitting(true);

    try {
      // Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        firebaseAuth,
        formData.email,
        formData.password
      );

      // Update profile with name
      await updateProfile(userCredential.user, {
        displayName: formData.name
      });

      // Create user document in Firestore
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        uid: userCredential.user.uid,
        email: formData.email,
        name: formData.name,
        role: formData.role,
        joinedDate: serverTimestamp(),
        isActive: true,
        lastLogin: serverTimestamp()
      });

      toast.success('Employee added successfully');
      router.push('/admin/employees');
    } catch (error: any) {
      console.error('Error adding employee:', error);
      toast.error(error.message || 'Failed to add employee');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
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
              Add New Employee
            </h1>
          </div>

          <Card>
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-secondary-900 dark:text-secondary-100 mb-1">
                  Full Name
                </label>
                <Input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  placeholder="Enter employee's full name"
                  className="bg-white dark:bg-secondary-800"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary-900 dark:text-secondary-100 mb-1">
                  Email Address
                </label>
                <Input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  placeholder="Enter employee's email"
                  className="bg-white dark:bg-secondary-800"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary-900 dark:text-secondary-100 mb-1">
                  Password
                </label>
                <Input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  placeholder="Enter temporary password"
                  minLength={6}
                  className="bg-white dark:bg-secondary-800"
                />
                <p className="mt-1 text-sm text-secondary-500 dark:text-secondary-400">
                  Employee can change this password after first login
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary-900 dark:text-secondary-100 mb-1">
                  Role
                </label>
                <Select
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  required
                  className="bg-white dark:bg-secondary-800"
                >
                  <option value="employee">Employee</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </Select>
              </div>

              <div className="flex justify-end space-x-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={isSubmitting}
                >
                  <FiUserPlus className="mr-2" />
                  Add Employee
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
} 