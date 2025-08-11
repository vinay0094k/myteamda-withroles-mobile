import React, { useState, useMemo } from 'react';
import { ArrowLeft, Download, CalendarDays } from 'lucide-react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { useApi } from '@/hooks/useApi';
import { apiClient } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import MobileHeader from '@/components/MobileHeader';
import BottomNavbar from '@/components/BottomNavbar';

// Helper function to calculate days between dates
const calculateDays = (startDate: string, endDate: string, isHalfDay: boolean = false): number => {
  if (!startDate || !endDate) return 0;
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  // Calculate the difference in time
  const timeDifference = end.getTime() - start.getTime();
  
  // Calculate the difference in days
  const dayDifference = Math.ceil(timeDifference / (1000 * 3600 * 24)) + 1;
  
  // If it's a half day, return 0.5, otherwise return the calculated days
  return isHalfDay ? 0.5 : dayDifference;
};


interface LeaveRequest {
  id: string;
  dateRange: string;
  leaveType: string;
  status: 'pending' | 'approved' | 'rejected';
  days: number;
  submittedDate: string;
  reviewedDate?: string;
  reviewedBy?: string;
  reason?: string;
  description?: string;
}

const AdminLeavesViewDetail = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { employeeId } = useParams();

  // Get employee data from navigation state
  const employeeName = location.state?.employeeName || 'Unknown Employee';
  const employeeIdFromState = location.state?.employeeId || employeeId;
  const userId = location.state?.userId || employeeId;
  const returnTab = location.state?.returnTab || 'pending'; // Get the tab to return to

  
  const [leaveType, setLeaveType] = useState('');
  const [dateRange, setDateRange] = useState('');
  const [year, setYear] = useState('2025');
  const [expandedDescriptions, setExpandedDescriptions] = useState<{[key: string]: boolean}>({});

  // Employee data from navigation state or fallback
  const employeeData = {
    name: employeeName,
    department: location.state?.department || 'Unknown Department',
    employeeId: employeeIdFromState || '#EMP000',
    leaveBalance: {
      total: location.state?.total || 0,
      sick: location.state?.sick || 0,
      casual: location.state?.casual || 0,
      compoff: location.state?.compoff || 0,
      used: location.state?.used || 0,
      remaining: location.state?.remaining || 0
    }
  };

  // Fetch employee's leave requests
  const { data: leaveRequestsData, loading: leaveRequestsLoading, error: leaveRequestsError, refetch: refetchLeaveRequests } = useApi(
    () => {
      if (userId) {
        return apiClient.getEmployeeLeaves(userId, { year: parseInt(year) });
      }
      return Promise.resolve({ data: [] });
    },
    [userId, year] // Re-fetch when userId or year changes
  );

  // Process leave requests data
  const leaveRequests = useMemo(() => {
    if (!leaveRequestsData) return [];
    
    return leaveRequestsData.map((leave: any) => ({
      id: leave.id,
      dateRange: leave.date_range || `${new Date(leave.start_date).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      })} - ${new Date(leave.end_date).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: '2-digit' 
      })}`,
      leaveType: leave.leave_type?.name || 'Unknown',
      status: leave.status as 'pending' | 'approved' | 'rejected',
      days: leave.days_requested || leave.days || leave.total_days || calculateDays(leave.start_date, leave.end_date, leave.is_half_day) || 0,
      isLOP: leave.is_lop || false,
      lopDays: leave.lop_days || 0,
      paidDays: leave.paid_days || 0,
      submittedDate: new Date(leave.created_at).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      }) + ' ' + new Date(leave.created_at).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      }),
      reviewedDate: leave.updated_at && leave.status !== 'pending' ?
        new Date(leave.updated_at).toLocaleDateString('en-US', {
          month: 'short', 
           day: 'numeric', 
           year: 'numeric' 
         }) + ' ' + new Date(leave.updated_at).toLocaleTimeString('en-US', {
           hour: '2-digit',
           minute: '2-digit',
           hour12: true
         }) : undefined,
      reviewedBy: leave.reviewed_by || undefined,
      reason: leave.reason,
      description: leave.description
    }));
  }, [leaveRequestsData]);


  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Pending</Badge>;
      case 'approved':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getLOPBadge = (isLOP: boolean = false, lopDays: number = 0) => {
    if (isLOP && lopDays > 0) {
      return (
        <Badge className="bg-red-100 text-red-800 hover:bg-red-100 ml-2">
          LOP ({lopDays} {lopDays === 1 ? 'day' : 'days'})
        </Badge>
      );
    }
    return null;
  };

  const handleDownload = () => {
    console.log('Download leave requests for', employeeName);
  };

  // Helper function to truncate description
  const truncateDescription = (text: string, wordLimit: number = 6) => {
    const words = text.split(' ');
    if (words.length <= wordLimit) return text;
    return words.slice(0, wordLimit).join(' ') + '...';
  };

  // Toggle description expansion
  const toggleDescription = (requestId: string) => {
    setExpandedDescriptions(prev => ({
      ...prev,
      [requestId]: !prev[requestId]
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <MobileHeader userName="Admin" />
      
      <div className="px-4 pt-2 pb-24">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center">
            <button 
              onClick={() => navigate('/admin/leaves', { state: { activeTab: returnTab } })} className="mr-4"
            >
              <ArrowLeft className="w-6 h-6 text-gray-600" />
            </button>
            <h1 className="text-xl font-semibold text-gray-800">Leave Requests</h1>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleDownload}
            className="text-purple-600 border-purple-200 hover:bg-purple-50"
          >
            <Download className="w-4 h-4 mr-1" />
            Download
          </Button>
        </div>

        {/* Employee Info Card */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-medium text-sm">
                  {employeeData.name.split(' ').map(n => n[0]).join('')}
                </span>
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-lg text-gray-900">{employeeData.name}</h3>
                <p className="text-sm text-gray-600">
                  {employeeData.department} • {employeeData.employeeId}
                </p>
              </div>
            </div>

            {/* Leave Balance Summary */}
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="grid grid-cols-6 gap-2 text-center">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Total</p>
                  <p className="font-medium">{employeeData.leaveBalance.total}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Sick</p>
                  <p className="font-medium">{employeeData.leaveBalance.sick}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Casual</p>
                  <p className="font-medium">{employeeData.leaveBalance.casual}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Compoff</p>
                  <p className="font-medium">{employeeData.leaveBalance.compoff}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Used</p>
                  <p className="font-medium">{employeeData.leaveBalance.used}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Remaining</p>
                  <p className="font-medium">{employeeData.leaveBalance.remaining}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <div className="flex flex-nowrap overflow-x-auto gap-2 px-2 pb-2 mb-6">
          <Select value={leaveType} onValueChange={setLeaveType}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Leave Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="annual">Annual</SelectItem>
              <SelectItem value="sick">Sick</SelectItem>
              <SelectItem value="casual">Casual</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Date range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2025">2025</SelectItem>
              <SelectItem value="2024">2024</SelectItem>
              <SelectItem value="2023">2023</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* ----------------------------- Leave Requests List ----------------------------- */}
        <div className="space-y-3">
          {leaveRequestsLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading leave requests...</p>
            </div>
          ) : leaveRequestsError ? (
            <div className="text-center py-8 text-red-600">
              <p>Error loading leave requests</p>
              <button 
                onClick={refetchLeaveRequests}
                className="mt-2 text-blue-600 hover:underline"
              >
                Try again
              </button>
            </div>
          ) : leaveRequests.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No leave requests found for {year}
            </div>
          ) : (
            leaveRequests.map((request) => (
            <Card key={request.id} className="border-l-4 border-l-gray-200">
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">📅</span>
                    <span className="font-medium text-gray-900">{request.dateRange}</span>
                  </div>
                  {getStatusBadge(request.status)}
                </div>
                {/* //////////////// things showing in the each leave card /////////////////////////////// */}
                <div className="space-y-1 text-xs text-gray-500">
                  {/* Leave Type + Days with LOP Badge */}
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1">
                      <CalendarDays className="w-4 h-4 text-gray-500" />
                      <span>Leave Type: {request.leaveType}</span>
                      {getLOPBadge(request.isLOP, request.lopDays)}
                    </div>
                    <div className="text-sm font-medium text-gray-900">
                      {request.days} days
                      {request.isLOP && (
                         <div className="text-xs text-red-600 mt-1">
                           Paid: {request.paidDays} • LOP: {request.lopDays}
                         </div>
                       )}
                    </div>
                  </div>

                  {/* Submitted Date with Time */}
                  <div className="flex items-center gap-1">
                    <span>⏰</span>
                    <span>Submitted: {request.submittedDate}</span>
                  </div>
                  {/* Reviewed Date with Time */}
                   {request.reviewedDate && (
                     <div className="flex items-center gap-1">
                       <span>✅</span>
                       <span>Reviewed: {request.reviewedDate}</span>
                     </div>
                   )}
                  {/* Reviewed By */}
                  {request.reviewedBy && (
                    <div className="flex items-center gap-1">
                      <span>👤</span>
                      <span>Reviewed by: {request.reviewedBy}</span>
                    </div>
                  )}
                  {/* Reason */}
                   {request.reason && (
                     <div className="flex items-start gap-1 mt-2">
                       <span>💭</span>
                       <div>
                         <span className="font-medium">Reason: </span>
                         <span>{request.reason}</span>
                       </div>
                     </div>
                   )}
                   {/* Description */}
                   {request.description && (
                     <div className="flex items-start gap-1 mt-1">
                       <span>📝</span>
                       {/* <div> */}
                       <div className="flex-1">
                         <span className="font-medium">Description: </span>
                         {/* <span>{request.description}</span> */}
                         <span>
                          {expandedDescriptions[request.id] 
                            ? request.description 
                            : truncateDescription(request.description)
                          }
                        </span>
                        {request.description.split(' ').length > 6 && (
                          <button
                            onClick={() => toggleDescription(request.id)}
                            className="ml-2 text-blue-600 hover:text-blue-800 text-sm font-medium"
                          >
                            {expandedDescriptions[request.id] ? 'Less' : 'View'}
                          </button>
                        )}
                       </div>
                     </div>
                   )}
                </div>
                {/* ////////////////////////////////////////////////////////////////////////////////// */}
              </CardContent>
            </Card>
          )))}
        </div>
      </div>
      <BottomNavbar />
    </div>
  );
};

export default AdminLeavesViewDetail;