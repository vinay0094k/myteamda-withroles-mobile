
import React, { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApi } from '@/hooks/useApi';
import { apiClient } from '@/lib/api';
import { LoadingState } from '@/components/ui/loading-spinner';
import { ErrorMessage } from '@/components/ui/error-message';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import MobileHeader from '@/components/MobileHeader';
import BottomNavbar from '@/components/BottomNavbar';
import ApplyLeaveForm from '@/components/ApplyLeaveForm';
import LeaveHistory from '@/components/LeaveHistory';
import TotalLeaves from '@/components/TotalLeaves';
import { useRole } from '@/contexts/RoleContext';

const LeaveManagement = () => {
  const navigate = useNavigate();
  const location = useLocation();
  //useRole state
  const { isAdmin, isHR, isEmployee } = useRole();
  
  // API calls  for isEmployee
  const { data: leavesData, loading: leavesLoading, error: leavesError, refetch: refetchLeaves } = useApi(
    () => apiClient.getLeaves({ page: 1, limit: 20 })
  );
  
  const { data: leaveBalance, loading: balanceLoading, error: balanceError, refetch: refetchBalance } = useApi(
    () => apiClient.getLeaveBalance()
  );
  
  const { data: leaveTypes, loading: typesLoading, error: typesError } = useApi(
    () => apiClient.getLeaveTypes()
  );

  // Check if state.activeTab is passed, otherwise default to 'apply'
  const [activeTab, setActiveTab] = useState(location.state?.activeTab || 'apply');

  const handleRefresh = () => {
    refetchLeaves();
    refetchBalance();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <MobileHeader userName="User" />
      
      <div className="px-4 pt-4 pb-24">
        <div className="flex items-center mb-6">
          <button onClick={() => navigate('/')} className="mr-4">
            <ArrowLeft className="w-6 h-6 text-gray-600" />
          </button>
          <h1 className="text-xl font-semibold text-gray-800">Leave Management</h1>
        </div>

        {(leavesError || balanceError || typesError) && (
          <ErrorMessage 
            message="Failed to load leave data. Please try again." 
            onRetry={handleRefresh}
            className="mb-4"
          />
        )}

        {/* <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="apply" className="text-sm">Apply Leave</TabsTrigger>
            <TabsTrigger value="history" className="text-sm">Leave History</TabsTrigger>
            <TabsTrigger value="total" className="text-sm">Total Leaves</TabsTrigger>
          </TabsList>

          <TabsContent value="apply" className="mt-0">
            {typesLoading ? (
              <LoadingState message="Loading leave types..." />
            ) : (
              <ApplyLeaveForm leaveTypes={leaveTypes || []} onSuccess={handleRefresh} />
            )}
          </TabsContent>

          <TabsContent value="history" className="mt-0">
            {leavesLoading ? (
              <LoadingState message="Loading leave history..." />
            ) : (
              <LeaveHistory leaves={leavesData?.leaves || []} />
            )}
          </TabsContent>

          <TabsContent value="total" className="mt-0">
            {balanceLoading ? (
              <LoadingState message="Loading leave balance..." />
            ) : (
              <TotalLeaves leaveBalance={leaveBalance || []} />
            )}
          </TabsContent>
        </Tabs> */}

        {/* -------------------------- Conditional rendering based on role ---------------------------------- */}
        {isHR || isAdmin ? (
          // HR/Admin View
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="dashboard" className="text-sm">Dashboard</TabsTrigger>
              <TabsTrigger value="pending" className="text-sm">Pending Requests</TabsTrigger>
              <TabsTrigger value="reports" className="text-sm">Reports</TabsTrigger>
            </TabsList>

            <TabsContent value="dashboard" className="mt-0">
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <h2 className="text-lg font-semibold mb-4">HR/Admin Dashboard</h2>
                <p className="text-gray-600">
                  This section would display an overview of leave statistics, upcoming absences, and other key metrics for HR/Admin.
                  <br /><br />
                  **Note:** Full functionality for company-wide data requires backend API modifications to fetch all leave applications.
                </p>
              </div>
            </TabsContent>

            <TabsContent value="pending" className="mt-0">
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <h2 className="text-lg font-semibold mb-4">Pending Leave Requests</h2>
                <p className="text-gray-600">
                  This section would list all pending leave requests from employees, allowing HR/Admin to approve or reject them.
                  <br /><br />
                  **Note:** Displaying and managing all pending requests requires backend API modifications to fetch all leave applications, not just the current user's.
                </p>
              </div>
            </TabsContent>

            <TabsContent value="reports" className="mt-0">
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <h2 className="text-lg font-semibold mb-4">Leave Reports</h2>
                <p className="text-gray-600">
                  This section would provide various reports on leave usage, trends, and compliance across the organization.
                  <br /><br />
                  **Note:** Generating comprehensive reports requires backend API modifications to access and aggregate company-wide leave data.
                </p>
              </div>
            </TabsContent>
          </Tabs>
        ) : (
          // Employee View (existing functionality)
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="apply" className="text-sm">Apply Leave</TabsTrigger>
              <TabsTrigger value="history" className="text-sm">Leave History</TabsTrigger>
              <TabsTrigger value="total" className="text-sm">Total Leaves</TabsTrigger>
            </TabsList>

            <TabsContent value="apply" className="mt-0">
              {typesLoading ? (
                <LoadingState message="Loading leave types..." />
              ) : (
                <ApplyLeaveForm leaveTypes={leaveTypes || []} onSuccess={handleRefresh} />
              )}
            </TabsContent>

            <TabsContent value="history" className="mt-0">
              {leavesLoading ? (
                <LoadingState message="Loading leave history..." />
              ) : (
                <LeaveHistory leaves={leavesData?.leaves || []} />
              )}
            </TabsContent>

            <TabsContent value="total" className="mt-0">
              {balanceLoading ? (
                <LoadingState message="Loading leave balance..." />
              ) : (
                <TotalLeaves leaveBalance={leaveBalance || []} />
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
      <BottomNavbar />
    </div>
  );
};

export default LeaveManagement;
