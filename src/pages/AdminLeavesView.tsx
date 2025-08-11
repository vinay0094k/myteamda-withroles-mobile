/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
import React, { useState, useMemo, useEffect } from 'react';
import { ArrowLeft, Search, MessageCircle, ChevronRight, Info } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApi } from '@/hooks/useApi';
import { apiClient, LeaveApplication } from '@/lib/api'; // Import LeaveApplication
import { LoadingState } from '@/components/ui/loading-spinner';
import { ErrorMessage } from '@/components/ui/error-message';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import MobileHeader from '@/components/MobileHeader';
import BottomNavbar from '@/components/BottomNavbar';
import { format } from 'date-fns'; // Import format for date formatting
import { useAuth } from '@/contexts/AuthContext'; // Import useAuth to get user role
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog'; // Import Dialog components

// Interface for mock data (can be removed or kept for other tabs if needed)
interface LeaveRequest {
  id: string;
  user: {
    first_name: string;
    last_name: string;
    department?: string;
  };
  leave_type: {
    name: string;
  };
  start_date: string;
  end_date: string;
  status: 'pending' | 'approved' | 'rejected';
  reason?: string;
  submitted_at?: string;
  approved_by?: string;
  days_requested?: number;
}

interface DashboardStats {
  leaves_approved: number;
  leaves_pending: number;
  avg_days_per_employee: number;
  employees_out_today: number;
  total_employees: number;
}

interface TeamLeaveBalance {
  employee: string;
  total: number;
  sick: number;
  casual: number;
  used: number;
  remaining: number;
  compoff: number; 
}

const AdminLeavesView = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth(); // Get current user to check role
  // Check if there's a tab to return to from navigation state
  const initialTab = location.state?.activeTab || 'pending';
  const [activeTab, setActiveTab] = useState(initialTab);

  // Update tab when navigation state changes
  useEffect(() => {
    if (location.state?.activeTab) {
      setActiveTab(location.state.activeTab);
      // Clear the state to prevent it from persisting on future navigations
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, navigate, location.pathname]);




  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [dateRange, setDateRange] = useState('today'); // Default to today
  const [leaveType, setLeaveType] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'approved' | 'rejected'>('all');

  // Fetch pending leave applications - use different endpoint based on user role
  const { data: leavesData, loading, error, refetch } = useApi(
    () => {
      // If user is admin, use admin endpoint to get all leaves
      // If user is employee, use regular endpoint to get only their leaves
      if (user?.role === 'admin') {
        return apiClient.getAdminLeaves({ status: 'pending' });
      } else {
        return apiClient.getLeaves({ status: 'pending' });
      }
    },
    [user?.role] // Re-fetch when user role changes
  );

  // Fetch history (approved/rejected) leave applications
  const { data: historyData, loading: historyLoading, error: historyError, refetch: refetchHistory } = useApi(
    () => {
      if (user?.role === 'admin') {
        return apiClient.getAdminLeaves({ status: selectedStatus === 'all' ? undefined : selectedStatus });
      } else {
        return apiClient.getLeaves({ status: selectedStatus === 'all' ? undefined : selectedStatus });
      }
    },
    [user?.role, selectedStatus] // Re-fetch when user role or status filter changes
  );

  // Convert dateRange selection to actual date for API call
  const getDateFromRange = (range: string): string => {
    const today = new Date();
    switch (range) {
      case 'today':
        return format(today, 'yyyy-MM-dd');
      case 'this_week':
        // Get start of current week (Monday)
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay() + 1);
        return format(startOfWeek, 'yyyy-MM-dd');
      case 'this_month':
        // Get start of current month
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        return format(startOfMonth, 'yyyy-MM-dd');
      default:
        // Default to today if no range selected
        return format(today, 'yyyy-MM-dd');
    }
  };

  // Fetch dashboard statistics
  const { data: dashboardStatsData, loading: dashboardLoading, error: dashboardError, refetch: refetchDashboard } = useApi(
    () => {
      if (user?.role === 'admin') {
        const selectedDate = getDateFromRange(dateRange || 'today');
        return apiClient.getDashboardStats(selectedDate);
      }
      return Promise.resolve({ data: null }); // Return empty for non-admin users
    },
    [user?.role, dateRange] // Re-fetch when user role or date range changes
  );

  // Fetch team leave balances
  const { data: teamBalancesData, loading: teamBalancesLoading, error: teamBalancesError, refetch: refetchTeamBalances } = useApi(
    () => {
      if (user?.role === 'admin') {
        return apiClient.getTeamLeaveBalances();
      }
      return Promise.resolve({ data: null }); // Return empty for non-admin users
      },
      [user?.role] // Re-fetch when user role changes
  );

  // Filter pending leaves to show only those from 'employee' role users with search
  const pendingEmployeeLeaves = useMemo(() => {
    if (!leavesData?.leaves) return [];
    let filtered = leavesData.leaves.filter(
      (leave) => leave.user?.role === 'employee'
    );
    // Apply search filter
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter((leave) => {
        const fullName = `${leave.user?.first_name || ''} ${leave.user?.last_name || ''}`.toLowerCase();
        const employeeId = (leave.user?.employee_id || '').toLowerCase();
        const reason = (leave.reason || '').toLowerCase();
        const description = (leave.description || '').toLowerCase();
        const leaveType = (leave.leave_type?.name || '').toLowerCase();
        
        return fullName.includes(searchLower) ||
              employeeId.includes(searchLower) ||
              reason.includes(searchLower) ||
              description.includes(searchLower) ||
              leaveType.includes(searchLower);
      });
    }

    return filtered;
  }, [leavesData, searchTerm]);

  // Filter history leaves for approved/rejected with search
  const historyEmployeeLeaves = useMemo(() => {
    if (!historyData?.leaves) return [];
    let filtered = historyData.leaves.filter(
      (leave) => leave.user?.role === 'employee' && (leave.status === 'approved' || leave.status === 'rejected')
    );
    // Apply search filter
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter((leave) => {
        const fullName = `${leave.user?.first_name || ''} ${leave.user?.last_name || ''}`.toLowerCase();
        const employeeId = (leave.user?.employee_id || '').toLowerCase();
        const reason = (leave.reason || '').toLowerCase();
        const description = (leave.description || '').toLowerCase();
        const leaveType = (leave.leave_type?.name || '').toLowerCase();
        
        return fullName.includes(searchLower) ||
              employeeId.includes(searchLower) ||
              reason.includes(searchLower) ||
              description.includes(searchLower) ||
              leaveType.includes(searchLower);
      });
    }

    return filtered;
  }, [historyData, searchTerm]);

  // Handle approve leave
  const handleApproveLeave = async (leaveId: string) => {
    try {
      await apiClient.approveLeave(leaveId);
      // Refresh both pending and history data
      refetch();
      refetchHistory();
      // Show success message (you can add toast notification here)
      console.log('Leave approved successfully');
    } catch (error) {
      console.error('Failed to approve leave:', error);
      // Show error message (you can add toast notification here)
    }
  };

  // Handle reject leave
  const handleRejectLeave = async (leaveId: string, rejectionReason: string) => {
    try {
      await apiClient.rejectLeave(leaveId, rejectionReason);
      // Refresh both pending and history data
      refetch();
      refetchHistory();
      // Show success message (you can add toast notification here)
      console.log('Leave rejected successfully');
    } catch (error) {
      console.error('Failed to reject leave:', error);
      // Show error message (you can add toast notification here)
    }
  };

  // Mock data for history and dashboard (keep for now as per original code)
  const historyLeaves: LeaveRequest[] = [
    {
      id: '3',
      user: { first_name: 'Sarah', last_name: 'Parker', department: 'Design' },
      leave_type: { name: 'Comp Off' },
      start_date: '2024-01-15',
      end_date: '2024-01-18',
      status: 'approved',
      submitted_at: '2024-01-10',
      approved_by: 'John Manager',
      days_requested: 4
    },
    {
      id: '4',
      user: { first_name: 'Michael', last_name: 'Chen', department: 'Engineering' },
      leave_type: { name: 'Sick Leave' },
      start_date: '2024-01-12',
      end_date: '2024-01-12',
      status: 'rejected',
      submitted_at: '2024-01-11',
      approved_by: 'Lisa Lead',
      days_requested: 1
    },
    {
      id: '5',
      user: { first_name: 'Emily', last_name: 'Johnson', department: 'Marketing' },
      leave_type: { name: 'Personal Leave' },
      start_date: '2024-01-20',
      end_date: '2024-01-21',
      status: 'approved',
      submitted_at: '2024-01-15',
      days_requested: 2
    }
  ];

  // Use real dashboard stats from API or fallback to defaults
  const dashboardStats = useMemo(() => {
    if (dashboardStatsData?.data) {
      return {
        leaves_approved: dashboardStatsData.data.leaves_approved,
        leaves_pending: dashboardStatsData.data.leaves_pending,
        avg_days_per_employee: Math.round(dashboardStatsData.data.avg_days_per_employee * 10) / 10, // Round to 1 decimal
        employees_out_today: dashboardStatsData.data.employees_out_today,
        total_employees: dashboardStatsData.data.total_employees,
      };
    }
    // Fallback to default values while loading
    return {
      leaves_approved: 0,
      leaves_pending: 0,
      avg_days_per_employee: 0,
      employees_out_today: 0,
      total_employees: 0,
    };
  }, [dashboardStatsData]);

  // Process team leave balances data with search filtering
  const teamLeaveBalances = useMemo(() => {
    if (!teamBalancesData) return [];
    
    let processed = teamBalancesData.map((employee: any) => {
      const leaveTypes = employee.leave_types || {};
      
      return {
        employee: `${employee.first_name} ${employee.last_name}`,
        employeeId: employee.employee_id,
        userId: employee.user_id,
        position: employee.position,
        total: employee.total_allocated || 0,
        sick: leaveTypes['Sick Leave']?.allocated || 0,
        casual: leaveTypes['Casual Leave']?.allocated || leaveTypes['Annual Leave']?.allocated || 0,
        used: employee.total_used || 0,
        remaining: employee.total_remaining || 0,
        compoff: leaveTypes['Comp Off']?.allocated || 0,
        rawData: employee // Keep raw data for detailed view
      };
    });

    // Apply search filter to team balances
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      processed = processed.filter((balance) => {
        const employeeName = balance.employee.toLowerCase();
        const employeeId = (balance.employeeId || '').toLowerCase();
        const position = (balance.position || '').toLowerCase();
        
        return employeeName.includes(searchLower) ||
              employeeId.includes(searchLower) ||
              position.includes(searchLower);
      });
    }

    return processed;
}, [teamBalancesData, searchTerm]);


  const handleApprove = (leaveId: string) => {
    console.log('Approving leave:', leaveId);
    // Implement actual API call here
  };

  const handleReject = (leaveId: string) => {
    console.log('Rejecting leave:', leaveId);
    // Implement actual API call here
  };

  const handleComment = (leaveId: string) => {
    console.log('Adding comment to leave:', leaveId);
    // Implement actual API call here
  };

  const handleEmployeeClick = (employee: any) => {
    // Navigate to employee detail page with complete employee data and passing the current tab 
    navigate(`/admin/leaves/${employee.user_id}`, { 
      state: { 
        employeeName: `${employee.first_name} ${employee.last_name}`,
        employeeId: employee.employee_id,
        userId: employee.user_id,
        department: employee.department || 'Unknown Department',
        position: employee.position,
        total: employee.total_allocated,
        sick: employee.leave_types?.['Sick Leave']?.allocated || 0,
        casual: employee.leave_types?.['Casual Leave']?.allocated || employee.leave_types?.['Annual Leave']?.allocated || 0,
        compoff: employee.leave_types?.['Comp Off']?.allocated || 0,
        used: employee.total_used,
        remaining: employee.total_remaining,
        rawEmployeeData: employee, // Pass complete employee data
        returnTab: activeTab // Pass current tab to return to
      } 
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="bg-orange-100 text-orange-800">Pending</Badge>;
      case 'approved':
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Approved</Badge>;
      case 'rejected':
        return <Badge variant="secondary" className="bg-red-100 text-red-800">Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM dd, yyyy');
  };

  const formatDateTime = (dateString: string) => {
    return format(new Date(dateString), 'MMM dd, yyyy hh:mm a');
  };

  const calculateTotalDays = (startDate: string, endDate: string, isHalfDay: boolean) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return isHalfDay ? 0.5 : diffDays + 1; // +1 to include the start day
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        <MobileHeader userName="Admin" />
        <div className="p-4">
          <LoadingState message="Loading pending leaves..." />
        </div>
        <BottomNavbar />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        <MobileHeader userName="Admin" />
        <div className="p-4">
          <ErrorMessage
            message="Failed to load leave applications. Please try again."
            onRetry={refetch}
          />
        </div>
        <BottomNavbar />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <MobileHeader userName="Admin" />
      {/* ---------------------- Header ---------------------- */}
      <div className="px-4 pt-2 pb-24">
        <div className="flex items-center mb-3">
          <button onClick={() => navigate('/')} className="mr-4">
            <ArrowLeft className="w-6 h-6 text-gray-600" />
          </button>
          <h1 className="text-xl font-semibold text-gray-800">Leave Management</h1>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-3">
            <TabsTrigger value="pending" className="text-sm">Pending</TabsTrigger>
            <TabsTrigger value="history" className="text-sm">History</TabsTrigger>
            <TabsTrigger value="dashboard" className="text-sm">Dashboard</TabsTrigger>
          </TabsList>

          {/* ---------------------------- Common Filters ---------------------------- */}
          <div className="flex flex-col gap-3 mb-3">
            <div className="flex flex-nowrap overflow-x-auto gap-2 px-2 pb-2">
              <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  <SelectItem value="design">UI</SelectItem>
                  <SelectItem value="engineering">Backend</SelectItem>
                  <SelectItem value="marketing">Database</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Date Range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                </SelectContent>
              </Select>
              
              {activeTab === 'pending' && ( 
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
              )}
              
              {/* ----------------------- Status Filter for History Tab ----------------------- */}
              {activeTab === 'history' && (
                <Select value={selectedStatus} onValueChange={(value) => setSelectedStatus(value as 'all' | 'approved' | 'rejected')}>
                  <SelectTrigger className="w-32"><SelectValue placeholder="Status"/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
            
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search by name, employee ID, reason, or leave type"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                // className="pl-10"
                className="pl-10 pr-10"
              />
              {searchTerm && (
                 <button
                   onClick={() => setSearchTerm('')}
                   className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                 >
                   ✕
                 </button>
               )}
            </div>
          </div>

          {/* ---------------------------- Pending Tab ---------------------------- */}
          <TabsContent value="pending" className="mt-0">
            {searchTerm && (
               <div className="mb-4 text-sm text-gray-600">
                 Found {pendingEmployeeLeaves.length} pending leave{pendingEmployeeLeaves.length !== 1 ? 's' : ''} 
                 {searchTerm && ` matching "${searchTerm}"`}
               </div>
             )}
            <div className="space-y-4">
              {pendingEmployeeLeaves.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  {searchTerm ? `No pending leave applications found matching "${searchTerm}"` : 'No pending leave applications from employees.'}
                </div>
              ) : (
                pendingEmployeeLeaves.map((leave: LeaveApplication) => (
                  <Card key={leave.id} className="border-l-4 border-l-orange-400">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-medium text-lg">
                            {leave.user?.first_name} {leave.user?.last_name} - {leave.user?.employee_id}
                          </h3>
                          <p className="text-sm text-gray-600">{leave.user?.position || 'Designation not set'}</p>
                        </div>
                        {getStatusBadge(leave.status)}
                      </div>
                      
                      <div className="mb-3">
                        <p className="font-medium">{leave.leave_type?.name || 'Unknown Leave Type'}</p>
                        <div className="flex items-center justify-between text-sm text-gray-600">
                          <span>Applied on: {formatDateTime(leave.created_at)}</span>
                          <span>
                            {formatDate(leave.start_date)} - {formatDate(leave.end_date)}
                          </span>
                        </div>
                        <p className="text-sm font-medium mt-1">
                          Total Days: {calculateTotalDays(leave.start_date, leave.end_date, leave.is_half_day)}
                          {leave.is_half_day && ' (Half Day)'}
                        </p>
                      </div>

                      {/* Reason/Description with Dialog */}
                      <div className="mb-3">
                        <div className="flex items-center text-sm text-gray-700">
                          <span className="font-medium mr-2">Reason:</span>
                          <span className="truncate flex-1">
                            {leave.reason || leave.description || 'No reason provided.'}
                          </span>
                          {(leave.reason || leave.description) && (
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="ghost" size="sm" className="p-1 h-auto ml-2">
                                  <Info className="w-4 h-4 text-gray-500" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Leave Reason for {leave.user?.first_name} {leave.user?.last_name}</DialogTitle>
                                  <DialogDescription>
                                    <p className="font-medium mb-2">{leave.leave_type?.name}</p>
                                    <p className="text-gray-700 whitespace-pre-wrap">
                                      {leave.reason || leave.description}
                                    </p>
                                  </DialogDescription>
                                </DialogHeader>
                              </DialogContent>
                            </Dialog>
                          )}
                        </div>
                      </div>
                      
                      {/* Approve/Reject/Comment Buttons */}
                      <div className="flex gap-2 mt-4">
                        <Button
                          onClick={() => handleApproveLeave(leave.id)}
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                          size="sm"
                        >
                          Approve
                        </Button>
                        <Button
                          onClick={() => handleRejectLeave(leave.id, 'Rejected by admin')}
                          variant="destructive"
                          className="flex-1 bg-red-500"
                          size="sm"
                        >
                          Reject
                        </Button>
                        <Button
                          onClick={() => handleComment(leave.id)}
                          variant="outline"
                          size="sm"
                          className="px-3"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="mt-0">
            {searchTerm && (
               <div className="mb-4 text-sm text-gray-600">
                 Found {historyEmployeeLeaves.length} leave record{historyEmployeeLeaves.length !== 1 ? 's' : ''} 
                 {searchTerm && ` matching "${searchTerm}"`}
               </div>
             )}
            <div className="space-y-4">
              {historyLoading ? (
                <div className="text-center py-8 text-gray-500">
                  Loading history...
                </div>
              ) : historyEmployeeLeaves.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  {searchTerm ? `No leave records found matching "${searchTerm}"` : 'No leave history available.'}
                </div>
              ) : (
                historyEmployeeLeaves.map((leave: LeaveApplication) => (
                  <Card key={leave.id}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-medium text-lg">
                            {leave.user?.first_name} {leave.user?.last_name}
                          </h3>
                          <p className="text-sm text-gray-600">{leave.user?.department || 'N/A'}</p>
                        </div>
                        {getStatusBadge(leave.status)}
                      </div>
                      
                      <div className="mb-3">
                        <p className="font-medium">{leave.leave_type?.name}</p>
                        <p className="text-sm">
                          {format(new Date(leave.start_date), 'MMM dd, yyyy')} - {format(new Date(leave.end_date), 'MMM dd, yyyy')}
                        </p>
                        <p className="text-sm font-medium mt-1">
                          Total Days: {calculateTotalDays(leave.start_date, leave.end_date, leave.is_half_day)}
                          {leave.is_half_day && ' (Half Day)'}
                         </p>
                        {leave.reason && (
                          <p className="text-sm text-gray-600 mt-1">
                            Reason: {leave.reason}
                          </p>
                        )}
                        {leave.rejection_reason && (
                          <p className="text-sm text-red-600 mt-1">
                            Rejection Reason: {leave.rejection_reason}
                          </p>
                        )}
                        <p className="text-sm text-gray-600">
                          {/* Applied: {format(new Date(leave.created_at), 'MMM dd, yyyy')} */}
                          Applied: {formatDateTime(leave.created_at)}
                        </p>
                        {leave.approved_at && (
                          <p className="text-sm text-gray-600">
                            {/* Reviewed: {format(new Date(leave.approved_at), 'MMM dd, yyyy')} */}
                            Reviewed: {formatDateTime(leave.approved_at)}
                          </p>
                        )}
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <Button variant="outline" size="sm">
                          <MessageCircle className="w-4 h-4 mr-1" />
                          0
                        </Button>
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="mt-0">
            <div className="space-y-4">
              {/* Loading State */}
              {dashboardLoading && (
                <div className="text-center py-4 text-gray-500">
                  Loading dashboard statistics...
                </div>
              )}

              {/* Stats Cards */}
              <div className="grid grid-cols-2 gap-4">
                <Card className="bg-purple-50">
                  <CardContent className="p-4">
                    <h3 className="text-sm font-medium text-gray-700">Leaves Approved</h3>
                    <p className="text-2xl font-bold text-purple-700">{dashboardStats.leaves_approved}</p>
                  </CardContent>
                </Card>
                
                <Card className="bg-blue-50">
                  <CardContent className="p-4">
                    <h3 className="text-sm font-medium text-gray-700">Leaves Pending</h3>
                    <p className="text-2xl font-bold text-blue-700">{dashboardStats.leaves_pending}</p>
                  </CardContent>
                </Card>
                
                <Card className="bg-gray-50">
                  <CardContent className="p-4">
                    <h3 className="text-sm font-medium text-gray-700">Avg Days/Employee</h3>
                    <p className="text-2xl font-bold text-gray-700">{dashboardStats.avg_days_per_employee}</p>
                  </CardContent>
                </Card>
                
                <Card className="bg-yellow-50">
                  <CardContent className="p-4">
                    <h3 className="text-sm font-medium text-gray-700">Employees Out Today</h3>
                    <p className="text-2xl font-bold text-yellow-700">
                      {dashboardStats.employees_out_today}/{dashboardStats.total_employees}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* ------------------------------ Team Leave Balances ------------------------------ */}
              <div>
                {/* <h3 className="text-lg font-semibold mb-4">Team Leave Balances</h3> */}
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Team Leave Balances</h3>
                  {searchTerm && (
                    <div className="text-sm text-gray-600">
                      {teamLeaveBalances.length} employee{teamLeaveBalances.length !== 1 ? 's' : ''} found
                    </div>
                  )}
                </div>
                <Card>
                  <CardContent className="p-0">
                    {teamBalancesLoading ? (
                      <div className="p-8 text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                        <p className="mt-2 text-gray-600">Loading team balances...</p>
                      </div>
                    ) : teamBalancesError ? (
                      <div className="p-8 text-center text-red-600">
                        <p>Error loading team balances</p>
                        <button 
                          onClick={refetchTeamBalances}
                          className="mt-2 text-blue-600 hover:underline"
                        >
                          Try again
                        </button>
                      </div>
                    ) : teamLeaveBalances.length === 0 ? (
                      <div className="p-8 text-center text-gray-500">
                        {searchTerm ? `No employees found matching "${searchTerm}"` : 'No team leave balances found'}
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="font-medium">Employee</TableHead>
                            <TableHead className="text-center">Total</TableHead>
                            <TableHead className="text-center">Sick</TableHead>
                            <TableHead className="text-center">Casual</TableHead>
                            <TableHead className="text-center">Used</TableHead>
                            <TableHead className="text-center">Remaining</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {teamLeaveBalances.map((balance, index) => (
                            <TableRow 
                              key={balance.userId || index}
                              className="cursor-pointer hover:bg-gray-50"
                              onClick={() => handleEmployeeClick(balance.rawData)}
                            >
                              <TableCell className="font-medium">
                                <div>
                                  <div>{balance.employee}</div>
                                  <div className="text-xs text-gray-500">{balance.employeeId}</div>
                                  {balance.position && (
                                    <div className="text-xs text-gray-400">{balance.position}</div>
                                  )}
                                </div>
                              </TableCell>

                              <TableCell className="text-center">
                                {balance.total}
                              </TableCell>
                              <TableCell className="text-center">{balance.sick}</TableCell>
                              <TableCell className="text-center">{balance.casual}</TableCell>
                              <TableCell className="text-center">{balance.used}</TableCell>
                              <TableCell className="text-center font-medium">
                                {balance.remaining}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </div>            
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <BottomNavbar />
    </div>
  );
};

export default AdminLeavesView;
