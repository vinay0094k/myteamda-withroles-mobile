
import React, { useState, useEffect } from 'react';
import { ArrowLeft, Calendar, Filter, Eye, Search, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '@/hooks/useApi';
import { apiClient, UserListItem } from '@/lib/api';
import { LoadingState } from '@/components/ui/loading-spinner';
import { ErrorMessage } from '@/components/ui/error-message';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import MobileHeader from '@/components/MobileHeader';
import BottomNavbar from '@/components/BottomNavbar';
import RoleBasedAccess from '@/components/RoleBasedAccess';
import { useAuth } from '@/contexts/AuthContext';
import { format, startOfWeek, endOfWeek, subWeeks, addWeeks } from 'date-fns';
import { toast } from '@/hooks/use-toast';

interface EmployeeSummary {
  employee: UserListItem;
  summary: {
    total_hours: number;
    status: 'Draft' | 'Submitted' | 'Pending';
  };
}

/////// Admin TimeSheet View
const AdminTimesheetView: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [currentWeekStart, setCurrentWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Calculate week dates
  const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
  const startDate = format(currentWeekStart, 'yyyy-MM-dd');
  const endDate = format(weekEnd, 'yyyy-MM-dd');
  const weekLabel = `${format(currentWeekStart, 'MMM dd')} - ${format(weekEnd, 'MMM dd, yyyy')}`;

  // Fetch employees
  const {
    data: employees,
    loading: loadingEmployees,
    error: employeesError,
    refetch: refetchEmployees,
  } = useApi(() => apiClient.getUsers());

  // Fetch timesheet summaries for all employees
  const [timesheetSummaries, setTimesheetSummaries] = useState<EmployeeSummary[]>([]);
  const [loadingSummaries, setLoadingSummaries] = useState(false);
  const [summariesError, setSummariesError] = useState<string | null>(null);

  const fetchSummaries = async () => {
    if (!employees) return;
    
    setLoadingSummaries(true);
    setSummariesError(null);
    
    try {
      const summaries = await Promise.all(
        employees
          .filter(emp => emp.role === 'employee' || emp.role === 'manager' || emp.role === 'team-lead' || emp.role === 'hr' || emp.role === 'admin')
          .map(async (employee) => {
            try {
              // Explicitly passing employee.id to getTimesheetSummary 
              const summaryResponse = await apiClient.getTimesheetSummary(startDate, endDate, employee.id);
              const totalHours = summaryResponse.data?.summary?.total_hours || 0;
              
              // Frontend-derived status based on total hours
              let status: 'Draft' | 'Submitted' | 'Pending' = 'Draft';
              if (totalHours >= 40) {
                status = 'Submitted';
              } else if (totalHours > 0) {
                status = 'Pending';
              }
              
              return {
                employee,
                summary: {
                  total_hours: totalHours,
                  status: status,
                },
              };
            } catch (error) {
              return {
                employee,
                summary: {
                  total_hours: 0,
                  status: 'Draft' as const,
                },
              };
            }
          })
      );
      setTimesheetSummaries(summaries);
    } catch (error) {
      setSummariesError('Failed to load timesheet summaries');
    } finally {
      setLoadingSummaries(false);
    }
  };

  useEffect(() => {
    fetchSummaries();
  }, [employees, startDate, endDate]);

  const navigateWeek = (direction: 'prev' | 'next') => {
    setCurrentWeekStart(
      direction === 'prev' 
        ? subWeeks(currentWeekStart, 1)
        : addWeeks(currentWeekStart, 1)
    );
  };

//   const handleViewEmployee = (employeeId: string) => {
//     navigate(`/timesheet?userId=${employeeId}`);
//   };
    // const handleViewEmployee = (employee: UserListItem) => { // Change parameter to full employee object
    //     navigate(`/timesheet?userId=${employee.id}`, { state: { viewedEmployee: employee } });
    // };
  
  const handleViewEmployee = (employee: UserListItem) => {
    // Navigates to /admin/timesheets/:userId, passing the employee
    navigate(`/admin/timesheets/${employee.id}`, { state: { viewedEmployee: employee } });
  };

  const handleDownloadEmployeeTimesheet = async (employeeId: string) => {
    try {
      await apiClient.downloadTimesheetsBulk({
        user_id: employeeId,
        start_date: startDate,
        end_date: endDate,
      });
      toast({
        title: "Download Started",
        description: "Employee timesheet download initiated.",
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Download Failed",
        description: "Failed to download timesheet. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'submitted': return 'bg-green-100 text-green-800';
      case 'draft': return 'bg-orange-100 text-orange-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getProgressColor = (hours: number) => {
    if (hours >= 40) return 'bg-green-500';
    if (hours >= 30) return 'bg-blue-500';
    if (hours >= 20) return 'bg-yellow-500';
    return 'bg-purple-500';
  };

  const filteredSummaries = timesheetSummaries?.filter(({ employee, summary }) => {
    const matchesSearch = employee.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          employee.last_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          employee.employee_id.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || 
                          (summary?.status?.toLowerCase() === statusFilter.toLowerCase());
    
    return matchesSearch && matchesStatus;
  }) || [];

  if (loadingEmployees) {
    return <LoadingState message="Loading employees..." />;
  }

  if (employeesError) {
    return (
      <ErrorMessage
        message="Failed to load employees. Please try again."
        onRetry={refetchEmployees}
        variant="full"
      />
    );
  }

  return (
    <RoleBasedAccess 
      requiredRoles={['admin', 'hr', 'manager', 'team-lead']} 
      fallback={
        <ErrorMessage message="You do not have permission to view this page." variant="full" />
      }
    >
      <div className="min-h-screen bg-gray-50 pb-20">
        <MobileHeader userName={user?.first_name || "User"} />

        <div className="px-4 pt-2 pb-24">
          {/* ----------------------- Header ----------------------- */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center">
              <button onClick={() => navigate('/')} className="mr-4">
                <ArrowLeft className="w-6 h-6 text-gray-600" />
              </button>
              <h1 className="text-xl font-semibold text-gray-800">Employee Timesheets</h1>
            </div>
            <Calendar className="w-6 h-6 text-gray-600" />
          </div>

          {/* ------------------ Week Navigation ------------------------- */}
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => navigateWeek('prev')}
              className="p-2 rounded-full hover:bg-gray-100"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            
            <div className="text-center">
              <h2 className="text-lg font-medium text-gray-800">{weekLabel}</h2>
            </div>
            
            <button
              onClick={() => navigateWeek('next')}
              className="p-2 rounded-full hover:bg-gray-100"
            >
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {/* ----------------------------- Filters ----------------------------- */}
          <div className="flex gap-3 mb-3">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="submitted">Submitted</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search employee"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Employee List */}
          {loadingSummaries ? (
            <LoadingState message="Loading timesheet data..." />
          ) : summariesError ? (
            <ErrorMessage
              message="Failed to load timesheet summaries. Please try again."
              onRetry={fetchSummaries}
            />
          ) : (
            <div className="space-y-4">
              {filteredSummaries.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No employees found matching your criteria.
                </div>
              ) : (
                filteredSummaries.map(({ employee, summary }) => {
                  const totalHours = summary?.total_hours || 0;
                  const status = summary?.status || 'Draft';
                  
                  return (
                    <div
                      key={employee.id}
                      className="bg-white rounded-lg p-4 shadow-sm border"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={employee.profile_image_url || ''} />
                            <AvatarFallback className="bg-purple-100 text-purple-600">
                              {employee.first_name.charAt(0)}{employee.last_name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <h3 className="font-medium text-gray-900">
                              {employee.first_name} {employee.last_name}
                            </h3>
                            <p className="text-sm text-gray-500">
                              {employee.department || 'No Department'}
                            </p>
                          </div>
                        </div>
                        <Badge className={getStatusColor(status)}>
                          {status}
                        </Badge>
                      </div>

                      {/* Week Progress */}
                      <div className="mb-3">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm text-gray-600">Week Progress</span>
                          <span className="text-sm font-medium text-gray-800">
                            {totalHours}h / 40h
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(totalHours)}`}
                            style={{ width: `${Math.min((totalHours / 40) * 100, 100)}%` }}
                          />
                        </div>
                      </div>

                      {/* Date and Actions */}
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500">{weekLabel}</span>
                        <div className="flex space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            // onClick={() => handleViewEmployee(employee.id)}
                            onClick={() => handleViewEmployee(employee)}
                            className="text-blue-600 hover:text-blue-700"
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View
                          </Button>
                          {/* Download button */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDownloadEmployeeTimesheet(employee.id)}
                            className="text-purple-600 hover:text-purple-700"
                          >
                            <Download className="w-4 h-4 mr-1" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        <BottomNavbar />
      </div>
    </RoleBasedAccess>
  );
};

export default AdminTimesheetView;
