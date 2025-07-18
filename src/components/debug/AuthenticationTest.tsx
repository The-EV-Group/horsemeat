import React, { useState } from 'react';
import { useAuth } from '@/hooks/auth/useAuth';
import { useContractorData } from '@/hooks/contractors/useContractorData';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/lib/supabase';

interface AuthenticationTestProps {
  contractorId?: string;
}

export function AuthenticationTest({ contractorId }: AuthenticationTestProps) {
  const { user, employee, loading, authError, retryEmployeeCreation } = useAuth();
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; message: string }>>({});
  const [testing, setTesting] = useState(false);

  const runTest = async (testName: string, testFn: () => Promise<void>) => {
    try {
      setTesting(true);
      await testFn();
      setTestResults(prev => ({
        ...prev,
        [testName]: { success: true, message: 'Test passed' }
      }));
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        [testName]: { 
          success: false, 
          message: error instanceof Error ? error.message : 'Test failed' 
        }
      }));
    } finally {
      setTesting(false);
    }
  };

  const testEmployeeCreation = async () => {
    if (!user) throw new Error('No user found');
    if (!employee) throw new Error('No employee record found');
    
    // Test employee record exists and has correct user_id
    const { data, error } = await supabase
      .from('internal_employee')
      .select('*')
      .eq('user_id', user.id)
      .single();
    
    if (error) throw error;
    if (!data) throw new Error('Employee record not found in database');
    if (data.user_id !== user.id) throw new Error('Employee user_id mismatch');
  };

  const testTaskCreation = async () => {
    if (!contractorId) throw new Error('No contractor ID provided for testing');
    if (!user?.id) throw new Error('No authenticated user');
    if (!employee?.id) throw new Error('No employee record');

    // Test task creation
    const testTask = {
      title: 'Test Task',
      description: 'This is a test task',
      status: 'in progress' as const,
      due_date: null,
      is_public: false
    };

    const { error } = await supabase
      .from('contractor_task')
      .insert({
        ...testTask,
        contractor_id: contractorId,
        created_by: user.id,
        created_at: new Date().toISOString()
      });

    if (error) throw error;
  };

  const testHistoryCreation = async () => {
    if (!contractorId) throw new Error('No contractor ID provided for testing');
    if (!user?.id) throw new Error('No authenticated user');
    if (!employee?.id) throw new Error('No employee record');

    // Test history entry creation
    const { error } = await supabase
      .from('contractor_history')
      .insert({
        contractor_id: contractorId,
        note: 'Test history entry',
        created_by: user.id,
        inserted_at: new Date().toISOString()
      });

    if (error) throw error;
  };

  const testContractorAssignment = async () => {
    if (!contractorId) throw new Error('No contractor ID provided for testing');
    if (!employee?.id) throw new Error('No employee record');

    // Test contractor assignment creation
    const { error } = await supabase
      .from('contractor_internal_link')
      .insert({
        contractor_id: contractorId,
        internal_employee_id: employee.id
      });

    if (error && error.code !== '23505') { // Ignore duplicate key errors
      throw error;
    }
  };

  const runAllTests = async () => {
    setTestResults({});
    await runTest('Employee Creation', testEmployeeCreation);
    if (contractorId) {
      await runTest('Task Creation', testTaskCreation);
      await runTest('History Creation', testHistoryCreation);
      await runTest('Contractor Assignment', testContractorAssignment);
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Authentication Test Suite</CardTitle>
        <CardDescription>
          Test all authentication flows and database operations
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Authentication Status */}
        <div className="space-y-2">
          <h3 className="font-semibold">Authentication Status</h3>
          <div className="grid grid-cols-2 gap-2">
            <Badge variant={user ? 'default' : 'destructive'}>
              User: {user ? 'Authenticated' : 'Not authenticated'}
            </Badge>
            <Badge variant={employee ? 'default' : 'destructive'}>
              Employee: {employee ? 'Found' : 'Not found'}
            </Badge>
            <Badge variant={loading ? 'secondary' : 'default'}>
              Loading: {loading ? 'Yes' : 'No'}
            </Badge>
            <Badge variant={authError ? 'destructive' : 'default'}>
              Error: {authError ? 'Yes' : 'No'}
            </Badge>
          </div>
        </div>

        {/* Error Display */}
        {authError && (
          <Alert variant="destructive">
            <AlertDescription>
              {authError}
              <Button 
                variant="outline" 
                size="sm" 
                className="ml-2"
                onClick={retryEmployeeCreation}
              >
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* User Info */}
        {user && (
          <div className="space-y-2">
            <h3 className="font-semibold">User Information</h3>
            <div className="text-sm space-y-1">
              <p><strong>ID:</strong> {user.id}</p>
              <p><strong>Email:</strong> {user.email}</p>
              <p><strong>Created:</strong> {new Date(user.created_at).toLocaleString()}</p>
            </div>
          </div>
        )}

        {/* Employee Info */}
        {employee && (
          <div className="space-y-2">
            <h3 className="font-semibold">Employee Information</h3>
            <div className="text-sm space-y-1">
              <p><strong>ID:</strong> {employee.id}</p>
              <p><strong>User ID:</strong> {employee.user_id}</p>
              <p><strong>Full Name:</strong> {employee.full_name}</p>
              <p><strong>Email:</strong> {employee.email}</p>
            </div>
          </div>
        )}

        {/* Test Controls */}
        <div className="space-y-2">
          <h3 className="font-semibold">Test Controls</h3>
          <div className="flex gap-2">
            <Button 
              onClick={runAllTests} 
              disabled={testing || !user || !employee}
            >
              {testing ? 'Running Tests...' : 'Run All Tests'}
            </Button>
            <Button 
              variant="outline"
              onClick={() => setTestResults({})}
            >
              Clear Results
            </Button>
          </div>
        </div>

        {/* Test Results */}
        {Object.keys(testResults).length > 0 && (
          <div className="space-y-2">
            <h3 className="font-semibold">Test Results</h3>
            <div className="space-y-2">
              {Object.entries(testResults).map(([testName, result]) => (
                <div key={testName} className="flex items-center justify-between p-2 border rounded">
                  <span className="font-medium">{testName}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant={result.success ? 'default' : 'destructive'}>
                      {result.success ? 'PASS' : 'FAIL'}
                    </Badge>
                    <span className="text-sm text-gray-600">{result.message}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Debug Info */}
        <div className="space-y-2">
          <h3 className="font-semibold">Debug Information</h3>
          <div className="text-xs bg-gray-100 p-2 rounded">
            <p><strong>Contractor ID:</strong> {contractorId || 'Not provided'}</p>
            <p><strong>User ID:</strong> {user?.id || 'None'}</p>
            <p><strong>Employee ID:</strong> {employee?.id || 'None'}</p>
            <p><strong>Employee User ID:</strong> {employee?.user_id || 'None'}</p>
            <p><strong>IDs Match:</strong> {user?.id === employee?.user_id ? 'Yes' : 'No'}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}