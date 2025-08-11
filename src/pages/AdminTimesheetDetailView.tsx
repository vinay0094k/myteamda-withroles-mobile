// src/pages/AdminTimesheetViewDetail.tsx
import React, { useState, useEffect } from 'react';
import { ArrowLeft, Calendar, Download, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { useApi, useApiMutation } from '@/hooks/useApi';
import { apiClient, UserListItem } from '@/lib/api';
import { LoadingState } from '@/components/ui/loading-spinner';
import { ErrorMessage } from '@/components/ui/error-message';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { format, startOfWeek, endOfWeek, subDays, subMonths, addDays, parseISO, isSameDay, getDay, subWeeks, addWeeks, isAfter } from 'date-fns';
import MobileHeader from '@/components/MobileHeader';
import BottomNavbar from '@/components/BottomNavbar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from 'recharts';


// Helper functions
const displayLocalTime = (timeString: string) => {
  if (!timeString) return '';
  try {
    if (/^\d{2}:\d{2}$/.test(timeString)) return timeString;
    const date = parseISO(timeString);
    if (isNaN(date.getTime())) return timeString;
    return format(date, 'p');
  } catch {
    return timeString;
  }
};

const parseEntryDate = (dateString: string): Date => {
  try {
    if (dateString.includes('T') && (dateString.includes('+') || dateString.includes('Z'))) {
      const date = parseISO(dateString);
      return new Date(date.getFullYear(), date.getMonth(), date.getDate());
    }
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
  } catch {
    return new Date();
  }
};

const isWeekend = (date: Date): boolean => {
  const day = getDay(date);
  return day === 0 || day === 6;
};

const AdminTimesheetDetailView = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { userId } = useParams<{ userId: string }>();

  // Date calculations
  const today = new Date();
  const currentWeekStartInitial = startOfWeek(today, { weekStartsOn: 1 });

  // State declarations
  const [activeTab, setActiveTab] = useState<'detailed' | 'summary' | 'dashboard'>('detailed');
  const [viewAllDetailedEntries, setViewAllDetailedEntries] = useState(false);
  const [weeklySummaryTableData, setWeeklySummaryTableData] = useState<any[]>([]);
  const [currentWeekStart, setCurrentWeekStart] = useState(currentWeekStartInitial);
  const [viewedEmployee, setViewedEmployee] = useState<UserListItem | null>(null);
  const targetUserId = userId;

  //Derived values that depend on state
  const weekStart = currentWeekStart;
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
  const lastWorkday = subDays(weekEnd, 2);

  const startDate = format(weekStart, 'yyyy-MM-dd');
  const endDate = format(lastWorkday, 'yyyy-MM-dd');
  const weekLabel = `${format(weekStart, 'MMM dd')} - ${format(weekEnd, 'MMM dd, yyyy')}`;
  //   // Week navigation logic, allowing navigation upto 27weeks with current week (6months)
  const earliestWeekStart = subWeeks(startOfWeek(new Date(), { weekStartsOn: 1 }), 27); // Allow navigating up to 3 weeks back

  // Broad range for all entries
  const broadStartDate = format(subMonths(today, 3), 'yyyy-MM-dd');
  const broadEndDate = format(addDays(today, 7), 'yyyy-MM-dd');

  

  // Fetch users if needed
  const { data: allUsers } = useApi(
    () =>
      targetUserId && !location.state?.viewedEmployee
        ? apiClient.getUsers()
        : Promise.resolve([]),
    [targetUserId, location.state?.viewedEmployee]
  );

  // Fetch timesheet entries
  const {
    data: timesheetData,
    loading,
    error,
    refetch,
  } = useApi(
    () =>
      apiClient.getTimesheets({
        start_date: broadStartDate,
        end_date: broadEndDate,
        limit: 200,
        user_id: targetUserId,
      }),
    [broadStartDate, broadEndDate, targetUserId]
  );

  // Fetch summary
  const {
    data: summaryData,
    loading: summaryLoading,
    refetch: refetchSummary,
  } = useApi(
    () => apiClient.getTimesheetSummary(startDate, endDate, targetUserId),
    [startDate, endDate, targetUserId]
  );

  // Set viewed employee
  useEffect(() => {
    if (targetUserId) {
      if (location.state?.viewedEmployee) {
        setViewedEmployee(location.state.viewedEmployee);
      } else if (allUsers && Array.isArray(allUsers)) {
        const found = allUsers.find(u => u.id === targetUserId);
        if (found) setViewedEmployee(found);
      }
    } else {
      setViewedEmployee(null);
    }
  }, [targetUserId, location.state?.viewedEmployee, allUsers]);

  // Build weekly summary table
  useEffect(() => {
    if (!timesheetData?.timesheets) return;
    const allEntries = timesheetData.timesheets;
    const newSummary: any[] = [];
    for (let i = 0; i < 4; i++) {
      const ws = subWeeks(currentWeekStart, i);
      const we = endOfWeek(ws, { weekStartsOn: 1 });
      const lw = subDays(we, 2);
      const label = `${format(ws, 'MMM dd')} - ${format(lw, 'MMM dd, yyyy')}`;
      const entries = allEntries.filter(e => {
        const d = parseEntryDate(e.entry_date);
        return d >= ws && d <= lw;
      });
      const totalHrs = entries.reduce((sum, e) => sum + (e.duration_hours || 0), 0);
      const draftCount = entries.filter(e => e.status === 'draft').length;
      const submittedCount = entries.filter(e => e.status === 'submitted').length;
      let targetPct = '0 %';
      if (totalHrs >= 40) targetPct = '100 %';
      else if (totalHrs > 0) targetPct = `${Math.round((totalHrs / 40) * 100)} %`;
      newSummary.push({
        period: label,
        totalHrs,
        draft: draftCount,
        submitted: submittedCount,
        target: targetPct,
      });
    }
    setWeeklySummaryTableData(newSummary);
  }, [timesheetData, currentWeekStart]);

  // Week navigation
  // const navigateWeek = (dir: 'prev' | 'next') => {
  //   setCurrentWeekStart(
  //     dir === 'prev' ? subWeeks(currentWeekStart, 1) : addWeeks(currentWeekStart, 1)
  //   );
  // };
  const navigateWeek = (dir: 'prev' | 'next') => {
    const newWeekStart = dir === 'prev'
      ? subWeeks(currentWeekStart, 1)
      : addWeeks(currentWeekStart, 1);

    console.log('Old currentWeekStart:', currentWeekStart);
    console.log('New currentWeekStart (calculated):', newWeekStart);

    setCurrentWeekStart(newWeekStart);
  };


  const goToCurrentWeek = () => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const isCurrentWeek = isSameDay(currentWeekStart, startOfWeek(new Date(), { weekStartsOn: 1 }));

  // Derived data
  const timeEntries = timesheetData?.timesheets || [];
  const totalHours = summaryData?.summary?.total_hours || 0;

  // Helpers
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'submitted':
        return 'bg-green-100 text-green-800';
      case 'draft':
        return 'bg-orange-100 text-orange-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getProgressColor = (hours: number) => {
    if (hours >= 40) return 'bg-green-500';
    if (hours >= 30) return 'bg-blue-500';
    if (hours >= 20) return 'bg-purple-500';
    return 'bg-purple-500';
  };

  const handleDownloadEmployeeTimesheet = async (employeeId: string) => {
    try {
      console.log('=== Admin Download Debug Info ===');
      console.log('Employee ID (parameter):', employeeId);
      console.log('Start Date:', startDate);
      console.log('End Date:', endDate);
      console.log('Viewed Employee:', viewedEmployee);
      console.log('Current timeEntries in component:', timeEntries?.length || 0);

      // First, try to use the existing timeEntries if they match the current employee
      let timesheets = [];
      if (timeEntries && timeEntries.length > 0 && viewedEmployee?.id === employeeId) {
        console.log('Using existing timeEntries from component');
        timesheets = timeEntries;
      } else {
        console.log('Fetching fresh timesheet data from API');
        // Get the employee's timesheet data for the selected date range
        const response = await apiClient.getTimesheets({
          user_id: employeeId,
          start_date: startDate,
          end_date: endDate,
          limit: 500,
        });

        console.log('API Response:', response);
        timesheets = response.timesheets || [];
      }

      console.log('Final timesheets count:', timesheets.length);
      console.log('First timesheet (if any):', timesheets[0]);
      
      // Check if we have no timesheets
      if (timesheets.length === 0) {
        console.warn('No timesheets found for the selected date range');
        toast({
          title: 'No Data Found',
          description: 'No timesheet entries found for the selected date range.',
          variant: 'destructive',
        });
        return;
      }
      
      // Get employee name and ID from the first timesheet entry or viewedEmployee
      let employeeName = 'Employee';
      let empId = '';
      
      if (timesheets.length > 0 && (timesheets[0] as any).user) {
        const user = (timesheets[0] as any).user;
        employeeName = `${user.first_name || ''} ${user.last_name || ''}`.trim();
        empId = user.employee_id || '';
        console.log('Employee data from timesheet:', { name: employeeName, id: empId });
      } else if (viewedEmployee) {
        employeeName = `${viewedEmployee.first_name || ''} ${viewedEmployee.last_name || ''}`.trim();
        empId = viewedEmployee.employee_id || '';
        console.log('Employee data from viewedEmployee:', { name: employeeName, id: empId });
      }

      console.log('Final employee data for export:', { name: employeeName, id: empId });
      console.log('=== End Admin Download Debug Info ===');

      // Use the utility function to export Excel with the same format as EmployeeTimesheetReport
      const { exportTimesheetToExcel } = await import('@/utils/timesheetExcelExport');
      exportTimesheetToExcel(
        timesheets,
        employeeName,
        parseISO(startDate),
        parseISO(endDate),
        empId // Pass employee ID for proper filename
      );

      toast({
        title: 'Download Started',
        description: 'Employee timesheet download initiated.',
      });
    } catch (error) {
      console.error('Download failed:', error);
      toast({
        title: 'Download Failed',
        description: 'Failed to download timesheet. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Filter current week entries
  const currentWeekEntries = timeEntries.filter(entry => {
    const d = parseEntryDate(entry.entry_date);
    return d >= weekStart && d <= lastWorkday;
  });

  // Prepare daily hours
  const dailyHours = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map(
    (day, idx) => {
      const td = new Date(weekStart);
      td.setDate(weekStart.getDate() + idx);
      const hrs = timeEntries
        .filter(e => isSameDay(parseEntryDate(e.entry_date), td))
        .reduce((sum, e) => sum + (e.duration_hours || 0), 0);
      return { day, hours: hrs };
    }
  );

  // Project breakdown
  const projectBreakdown = timeEntries.reduce(
    (acc, entry) => {
      const name = entry.project?.name || 'Unknown Project';
      if (!acc[name]) acc[name] = { thisWeek: 0, lastWeek: 0, mtd: 0 };
      const d = parseEntryDate(entry.entry_date);
      const hrs = entry.duration_hours || 0;
      if (d >= weekStart && d <= lastWorkday) acc[name].thisWeek += hrs;
      acc[name].mtd += hrs;
      return acc;
    },
    {} as Record<string, { thisWeek: number; lastWeek: number; mtd: number }>
  );

  // Summary table data
  const summaryTableData = [
    {
      period: `Week of ${format(weekStart, 'MMM d')}`,
      totalHrs: totalHours,
      draft: currentWeekEntries.filter(e => e.status === 'draft').length,
      submitted: currentWeekEntries.filter(e => e.status === 'submitted').length,
      target: '37.5 %',
    },
  ];

  if (!viewedEmployee) {
    return <LoadingState message="Loading employee details..." />;
  }

  // Week status
  let weekStatus: 'Draft' | 'Submitted' | 'Pending' = 'Draft';
  if (totalHours >= 40) weekStatus = 'Submitted';
  else if (totalHours > 0) weekStatus = 'Pending';


  /////////////////////////////////////////// return //////////////////////////////////////////////////////
  return (
    <div className="min-h-screen bg-gray-50 pb-20 sm:pb-24">
      <MobileHeader userName={viewedEmployee.first_name} />

      <div className="px-4 pt-2 pb-24">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center">
            <button onClick={() => navigate('/admin/timesheets')} className="mr-4">
              <ArrowLeft className="w-6 h-6 text-gray-600" />
            </button>
            <h1 className="text-xl font-semibold text-gray-800">Employee Timesheet</h1>
          </div>
          <Calendar className="w-6 h-6 text-gray-600" />
        </div>

        {/* -------------------------------------------- Employee Info Card -------------------------------------------- */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <Avatar className="w-12 h-12">
                <AvatarImage src={viewedEmployee.profile_image_url || ''} />
                <AvatarFallback className="bg-purple-100 text-purple-600">
                  {viewedEmployee.first_name.charAt(0)}{viewedEmployee.last_name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-semibold text-lg">{viewedEmployee.first_name} {viewedEmployee.last_name}</h3>
                <p className="text-sm text-gray-500">{viewedEmployee.department || 'No Department'}</p>
              </div>
            </div>
            <Badge className={getStatusColor(weekStatus)}>
              {weekStatus}
            </Badge>
          </div>

          <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
            {/* -----------------------------  Week Navigation Controls ------------------------------- */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => navigateWeek('prev')}
                disabled={!isAfter(currentWeekStart, earliestWeekStart)}
                className={`p-2 rounded-full transition-colors ${
                  !isAfter(currentWeekStart, earliestWeekStart)
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:bg-gray-100'
                }`}
              >
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </button>
          
              <div className="text-center">
                <div className="text-sm font-medium text-gray-800">{weekLabel}</div>
                {!isCurrentWeek && (
                  <button
                    onClick={goToCurrentWeek}
                    className="text-xs text-purple-600 hover:text-purple-700 mt-1"
                  >
                    Go to current week
                  </button>
                )}
              </div>
          
              <button
                onClick={() => navigateWeek('next')}
                disabled={isCurrentWeek}
                className={`p-2 rounded-full transition-colors ${
                  isCurrentWeek
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:bg-gray-100'
                }`}
              >
                <ChevronRight className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            {/* ------------- Downdload button ------------- */}
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                className="text-purple-600"
                onClick={() => handleDownloadEmployeeTimesheet(viewedEmployee.id)}
              >
                <Download className="w-4 h-4 mr-1" />
              </Button>
            </div>
          </div>

          {/* Total Hours Progress Bar */}
          <div className="mb-2">
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm text-gray-600">Total Hours</span>
              <span className="text-sm font-medium text-gray-800">
                {totalHours}h / 40h
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(totalHours)}`}
                style={{ width: `${Math.min((totalHours / 40) * 100, 100)}%` }}
              />
            </div>
            </div>
          </div>
        </div>

        {/* -------------------------------- Tabs -------------------------------- */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="detailed">Detailed</TabsTrigger>
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          </TabsList>

          {/* ------------------ Detailed Tab ------------------------ */}
          <TabsContent value="detailed" className="mt-6">
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                {/* <h2 className="text-lg font-semibold text-gray-800">Today, {format(new Date(), 'MMM dd')}</h2> */}
                <h2 className="text-lg font-semibold text-gray-800">Daily Entries</h2>
                {/* <button className="text-purple-600 text-sm font-medium">View All</button> */}
                {currentWeekEntries.length > 4 && (
                  <div className="text-center mt-4">
                    {!viewAllDetailedEntries ? (
                      <Button
                        variant="outline"
                        onClick={() => setViewAllDetailedEntries(true)}
                        className="text-purple-600 border-purple-200 hover:bg-purple-50"
                      >
                        View All ({currentWeekEntries.length})
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        onClick={() => setViewAllDetailedEntries(false)}
                        className="text-purple-600 border-purple-200 hover:bg-purple-50"
                      >
                        Show Less
                      </Button>
                    )}
                  </div>
                )}
              </div>
              {loading ? (
                <LoadingState message="Loading time entries..." />
              ) : (
                <div className="space-y-3">
                  {(viewAllDetailedEntries ? currentWeekEntries : currentWeekEntries.slice(0,4)).length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <p>No time entries found for this week.</p>
                    </div>
                  ) : (
                    // Group entries by date
                    (() => {
                    const entriesToDisplay = viewAllDetailedEntries
                      ? currentWeekEntries
                      : currentWeekEntries.slice(0, 4); 

                    const groupedEntries: { [key: string]: typeof entriesToDisplay } = {};
                    entriesToDisplay.forEach(entry => {
                      const dateKey = format(parseEntryDate(entry.entry_date), 'yyyy-MM-dd');
                      if (!groupedEntries[dateKey]) {
                        groupedEntries[dateKey] = [];
                      }
                      groupedEntries[dateKey].push(entry);
                    });

                    // Sort dates to ensure chronological order
                    const sortedDates = Object.keys(groupedEntries).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

                    return sortedDates.map(dateKey => (
                      <div key={dateKey}>
                        <h3 className="text-md font-semibold text-gray-700 mb-3">
                          {format(parseISO(dateKey), 'EEEE, MMM dd, yyyy')}
                        </h3>
                        <div className="space-y-3"> {/* space-y-3 for entries within a day */}
                          {groupedEntries[dateKey].map(entry => (
                            <div key={entry.id} className="bg-white rounded-lg p-4 shadow-sm border">
                              <div className="flex justify-between items-start mb-2">
                                <div>
                                  <h3 className="font-medium text-gray-800">{entry.project?.name || 'Project-1'}</h3>
                                  <p className="text-sm text-gray-600">{entry.task_description}</p>
                                </div>
                                <Badge className={getStatusColor(entry.status)}>
                                  {entry.status.charAt(0).toUpperCase() + entry.status.slice(1)}
                                </Badge>
                              </div>
                              <div className="flex items-center text-sm text-gray-500">
                                <span className="mr-2">🕘</span>
                                <span>
                                  {entry.start_time && entry.end_time
                                    ? `${displayLocalTime(entry.start_time)} - ${displayLocalTime(entry.end_time)}`
                                    : 'Time not specified'}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ));
                  })()
                  )}   
                </div>               
              )}
            </div>
          </TabsContent>

          {/* ----------------------- Summary Tab ----------------------- */}
          <TabsContent value="summary" className="mt-6">
            <div className="space-y-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Period</TableHead>
                    <TableHead>Total Hrs</TableHead>
                    <TableHead>Draft</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Target</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* {summaryTableData.map((row, index) => ( */}
                  {weeklySummaryTableData.map((row, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{row.period}</TableCell>
                      <TableCell>{row.totalHrs} h</TableCell>
                      <TableCell>{row.draft}</TableCell>
                      <TableCell>{row.submitted}</TableCell>
                      <TableCell>{row.target}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div>
                <h3 className="text-lg font-semibold mb-4">Project Breakdown (Pivot)</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Project</TableHead>
                      <TableHead>This Week</TableHead>
                      <TableHead>Last Week</TableHead>
                      <TableHead>MTD</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(projectBreakdown).map(([project, data]) => (
                      <TableRow key={project}>
                        <TableCell className="font-medium">{project}</TableCell>
                        <TableCell>{data.thisWeek} h</TableCell>
                        <TableCell>{data.lastWeek} h</TableCell>
                        <TableCell>{data.mtd} h</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="mt-6">
            <div className="bg-white rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-4">Weekly Hours Distribution</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailyHours}>
                    <XAxis 
                      dataKey="day" 
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => value.slice(0, 3)}
                    />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Bar 
                      dataKey="hours" 
                      fill="#9333ea"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <BottomNavbar />
    </div>
  );
};

export default AdminTimesheetDetailView;
