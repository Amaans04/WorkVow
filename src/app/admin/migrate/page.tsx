'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { runDataMigration } from '@/lib/schemaMigration';
import AppLayout from '@/components/layout/AppLayout';
import Card from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useRouter } from 'next/navigation';

export default function MigrationPage() {
  const auth = useAuth();
  const router = useRouter();
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [migrationComplete, setMigrationComplete] = useState(false);

  // Override console.log to capture logs
  const originalConsoleLog = console.log;
  const originalConsoleError = console.error;

  const captureLog = (message: any) => {
    originalConsoleLog(message);
    setLogs(prev => [...prev, `[INFO] ${message}`]);
  };

  const captureError = (message: any) => {
    originalConsoleError(message);
    setLogs(prev => [...prev, `[ERROR] ${message}`]);
    setError(`Error: ${message}`);
  };

  const runMigration = async () => {
    if (!auth) {
      setError('Authentication not available');
      return;
    }

    // Only allow admins to run migration
    if (auth.userData?.role !== 'admin') {
      setError('Only administrators can run database migrations');
      return;
    }

    setIsRunning(true);
    setError(null);
    setLogs(['Starting migration...']);

    try {
      // Override console methods to capture output
      console.log = captureLog;
      console.error = captureError;

      await runDataMigration();
      
      setLogs(prev => [...prev, 'Migration completed successfully']);
      setMigrationComplete(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Migration failed: ${errorMessage}`);
      setLogs(prev => [...prev, `Migration failed: ${errorMessage}`]);
    } finally {
      // Restore original console methods
      console.log = originalConsoleLog;
      console.error = originalConsoleError;
      setIsRunning(false);
    }
  };

  if (!auth) {
    return null;
  }

  if (auth.loading) {
    return (
      <AppLayout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </AppLayout>
    );
  }

  // Redirect non-admins
  if (auth.userData && auth.userData.role !== 'admin') {
    router.push('/dashboard');
    return null;
  }

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto py-8 px-4">
        <h1 className="text-2xl font-bold mb-6">Database Schema Migration</h1>
        
        <Card className="p-6 mb-6">
          <div className="mb-6">
            <h2 className="text-lg font-medium mb-2">Migration Information</h2>
            <p className="text-sm text-gray-600 mb-4">
              This tool will migrate data from the old schema to the new nested schema structure.
              The migration will:
            </p>
            <ul className="list-disc pl-5 text-sm text-gray-600 mb-4 space-y-1">
              <li>Update user documents to match the new schema</li>
              <li>Migrate commitments to nested subcollections (daily, weekly, monthly)</li>
              <li>Migrate reports to user-specific subcollections</li>
              <li>Create new stats structure with weekly and monthly accomplishments</li>
            </ul>
            <p className="text-sm text-gray-600 font-medium">
              WARNING: This is a one-time operation and should be run only once.
              Make sure to back up your Firestore data before proceeding.
            </p>
          </div>
          
          <div className="flex justify-end">
            <Button
              onClick={runMigration}
              disabled={isRunning || migrationComplete}
              isLoading={isRunning}
            >
              {migrationComplete ? 'Migration Complete' : 'Run Migration'}
            </Button>
          </div>
        </Card>
        
        {(logs.length > 0 || error) && (
          <Card className="p-6">
            <h2 className="text-lg font-medium mb-2">Migration Logs</h2>
            
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-800 p-4 mb-4 rounded">
                {error}
              </div>
            )}
            
            <div className="bg-gray-100 p-4 rounded-lg max-h-96 overflow-y-auto font-mono text-sm">
              {logs.map((log, index) => (
                <div 
                  key={index} 
                  className={`py-1 ${log.includes('[ERROR]') ? 'text-red-600' : 'text-gray-800'}`}
                >
                  {log}
                </div>
              ))}
            </div>
          </Card>
        )}
        
        {migrationComplete && (
          <div className="flex justify-center mt-6">
            <Button
              variant="outline"
              onClick={() => router.push('/dashboard')}
            >
              Return to Dashboard
            </Button>
          </div>
        )}
      </div>
    </AppLayout>
  );
} 