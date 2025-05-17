'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { FiMail, FiCheckCircle } from 'react-icons/fi';
import { useAuth } from '@/context/AuthContext';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import AppLayout from '@/components/layout/AppLayout';
import Card from '@/components/ui/Card';

interface ForgotPasswordFormValues {
  email: string;
}

export default function ForgotPasswordPage() {
  const auth = useAuth();
  const [resetSent, setResetSent] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<ForgotPasswordFormValues>();

  const onSubmit = async (data: ForgotPasswordFormValues) => {
    if (!auth) return;

    try {
      setIsLoading(true);
      setAuthError(null);
      await auth.resetPassword(data.email);
      setResetSent(true);
    } catch (error) {
      console.error('Error sending password reset:', error);
      setAuthError('Failed to send password reset email. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!auth) {
    return null;
  }

  return (
    <AppLayout>
      <div className="w-full max-w-md">
        <Card>
          <div className="p-8">
            <div className="mb-8 text-center">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Reset Password
              </h1>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Enter your email address and we'll send you a link to reset your password.
              </p>
            </div>

            {resetSent ? (
              <div className="text-center">
                <FiCheckCircle className="mx-auto h-12 w-12 text-green-500" />
                <h2 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
                  Check your email
                </h2>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  We've sent you a link to reset your password.
                </p>
                <Link
                  href="/login"
                  className="mt-4 inline-block text-sm text-blue-600 hover:text-blue-500 dark:text-blue-400"
                >
                  Return to login
                </Link>
              </div>
            ) : (
              <>
                {authError && (
                  <div className="mb-4 p-4 text-sm text-red-700 bg-red-100 rounded-lg dark:bg-red-200 dark:text-red-800">
                    {authError}
                  </div>
                )}

                <form onSubmit={handleSubmit(onSubmit)}>
                  <div className="space-y-6">
                    <div>
                      <label
                        htmlFor="email"
                        className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                      >
                        Email address
                      </label>
                      <input
                        type="email"
                        id="email"
                        {...register('email', {
                          required: 'Email is required',
                          pattern: {
                            value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                            message: 'Invalid email address'
                          }
                        })}
                        className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white sm:text-sm ${
                          errors.email ? 'border-red-500' : ''
                        }`}
                      />
                      {errors.email && (
                        <p className="mt-1 text-sm text-red-600">
                          {errors.email.message}
                        </p>
                      )}
                    </div>

                    <Button
                      type="submit"
                      variant="primary"
                      className="w-full"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <div className="flex items-center justify-center">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        </div>
                      ) : (
                        'Send reset link'
                      )}
                    </Button>
                  </div>
                </form>

                <div className="mt-6 text-center">
                  <Link
                    href="/login"
                    className="text-sm text-blue-600 hover:text-blue-500 dark:text-blue-400"
                  >
                    Back to login
                  </Link>
                </div>
              </>
            )}
          </div>
        </Card>
      </div>
    </AppLayout>
  );
} 