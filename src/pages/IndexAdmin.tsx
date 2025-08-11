// import { useAuth } from '@/contexts/AuthContext';
// import { useNavigate } from 'react-router-dom';
// import { LoadingState } from '@/components/ui/loading-spinner';
// import { ErrorMessage } from '@/components/ui/error-message';
// import MobileHeader from '@/components/MobileHeader';
// import BottomNavbar from '@/components/BottomNavbar';
// import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
// import { Button } from '@/components/ui/button';
// import {
//   Users,
//   Calendar,
//   Clock,
//   FileText,
//   BarChart3,
//   Settings,
//   UserCheck,
//   ClipboardList,
//   TrendingUp,
//   AlertCircle
// } from 'lucide-react';
// import { useApi } from '@/hooks/useApi';
// import { apiClient } from '@/lib/api';
// import { format } from 'date-fns';

// const IndexAdmin = () => {
//   const { user, loading, error, refreshUser } = useAuth();
//   const navigate = useNavigate();

//   // Fetch admin dashboard stats
//   const { data: dashboardStats, loading: statsLoading } = useApi(
//     () => apiClient.getDashboardStats(format(new Date(), 'yyyy-MM-dd')),
//     []
//   );

//   if (loading) {
//     return <LoadingState message="Loading admin dashboard..." />;
//   }

//   if (error) {
//     return (
//       <ErrorMessage
//         message={error}
//         onRetry={refreshUser}
//         variant="full"
//       />
//     );
//   }

//   const userName = user ? `${user.first_name} ${user.last_name}` : 'Admin';
//   const stats = dashboardStats?.data || {};

//   // Quick action cards for admin
//   const quickActions = [
//     {
//       title: 'Manage Leaves',
//       description: 'Review and approve leave requests',
//       icon: Calendar,
//       color: 'bg-blue-500',
//       onClick: () => navigate('/admin/leaves'),
//       count: stats.leaves_pending || 0,
//       countLabel: 'Pending'
//     },
//     {
//       title: 'Timesheet Review',
//       description: 'Monitor employee timesheets',
//       icon: Clock,
//       color: 'bg-green-500',
//       onClick: () => navigate('/admin/timesheets'),
//       count: stats.employees_out_today || 0,
//       countLabel: 'Out Today'
//     },
//     {
//       title: 'Team Overview',
//       description: 'View team performance metrics',
//       icon: Users,
//       color: 'bg-purple-500',
//       onClick: () => navigate('/admin/team'),
//       count: stats.total_employees || 0,
//       countLabel: 'Employees'
//     },
//     {
//       title: 'Reports',
//       description: 'Generate and view reports',
//       icon: BarChart3,
//       color: 'bg-orange-500',
//       onClick: () => navigate('/admin/reports'),
//       count: stats.leaves_approved || 0,
//       countLabel: 'Approved'
//     }
//   ];

//   // Stats cards
//   const statsCards = [
//     {
//       title: 'Pending Approvals',
//       value: stats.leaves_pending || 0,
//       icon: AlertCircle,
//       color: 'text-orange-600',
//       bgColor: 'bg-orange-50'
//     },
//     {
//       title: 'Active Employees',
//       value: stats.total_employees || 0,
//       icon: UserCheck,
//       color: 'text-green-600',
//       bgColor: 'bg-green-50'
//     },
//     {
//       title: 'Avg Days/Employee',
//       value: stats.avg_days_per_employee?.toFixed(1) || '0.0',
//       icon: TrendingUp,
//       color: 'text-blue-600',
//       bgColor: 'bg-blue-50'
//     },
//     {
//       title: 'Out Today',
//       value: stats.employees_out_today || 0,
//       icon: ClipboardList,
//       color: 'text-purple-600',
//       bgColor: 'bg-purple-50'
//     }
//   ];

//   return (
//     <div className="min-h-screen bg-gray-50 pb-20 sm:pb-24">
//       <MobileHeader userName={userName} />

//       {/* Welcome Section */}
//       <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
//         <div className="px-4 sm:px-6 py-4 max-w-screen-xl mx-auto">
//           <h1 className="text-2xl font-bold mb-1">Welcome back, {user?.first_name}!</h1>
//           <p className="text-purple-100">Admin Dashboard - Manage your team effectively</p>
//         </div>
//       </div>

//       <div className="px-4 sm:px-6 py-3 sm:py-4 max-w-screen-xl mx-auto">

//         {/* Stats Overview */}
//         <div className="mb-4">
//           <h2 className="text-lg font-semibold text-gray-800 mb-3">Today's Overview</h2>
//           <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
//             {statsCards.map((stat, index) => (
//               <Card key={index} className={`${stat.bgColor} border-0`}>
//                 <CardContent className="p-4">
//                   <div className="flex items-center justify-between">
//                     <div>
//                       <p className="text-sm font-medium text-gray-600">{stat.title}</p>
//                       <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
//                     </div>
//                     <stat.icon className={`w-8 h-8 ${stat.color}`} />
//                   </div>
//                 </CardContent>
//               </Card>
//             ))}
//           </div>
//         </div>

//         {/* Quick Actions */}
//         <div className="mb-4">
//           <h2 className="text-lg font-semibold text-gray-800 mb-3">Quick Actions</h2>
//           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
//             {quickActions.map((action, index) => (
//               <Card key={index} className="cursor-pointer hover:shadow-md transition-shadow" onClick={action.onClick}>
//                 <CardContent className="p-4">
//                   <div className="flex items-center space-x-4">
//                     <div className={`w-12 h-12 rounded-lg ${action.color} flex items-center justify-center`}>
//                       <action.icon className="w-6 h-6 text-white" />
//                     </div>
//                     <div className="flex-1">
//                       <h3 className="font-semibold text-gray-900">{action.title}</h3>
//                       <p className="text-sm text-gray-600">{action.description}</p>
//                       {action.count > 0 && (
//                         <p className="text-xs text-gray-500 mt-1">
//                           {action.count} {action.countLabel}
//                         </p>
//                       )}
//                     </div>
//                   </div>
//                 </CardContent>
//               </Card>
//             ))}
//           </div>
//         </div>

//         {/* Recent Activity */}
//         <div className="mb-4">
//           <h2 className="text-lg font-semibold text-gray-800 mb-3">Recent Activity</h2>
//           <Card>
//             <CardContent className="p-4">
//               <div className="space-y-3">
//                 <div className="flex items-center space-x-3">
//                   <div className="w-2 h-2 bg-green-500 rounded-full"></div>
//                   <p className="text-sm text-gray-600">
//                     {stats.leaves_approved || 0} leave requests approved today
//                   </p>
//                 </div>
//                 <div className="flex items-center space-x-3">
//                   <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
//                   <p className="text-sm text-gray-600">
//                     {stats.leaves_pending || 0} leave requests pending review
//                   </p>
//                 </div>
//                 <div className="flex items-center space-x-3">
//                   <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
//                   <p className="text-sm text-gray-600">
//                     {stats.employees_out_today || 0} employees out today
//                   </p>
//                 </div>
//               </div>
//             </CardContent>
//           </Card>
//         </div>

//         {/* Admin Settings */}
//         <div className="mb-4">
//           <Card>
//             <CardContent className="p-4">
//               <div className="flex items-center justify-between">
//                 <div className="flex items-center space-x-3">
//                   <Settings className="w-6 h-6 text-gray-600" />
//                   <div>
//                     <h3 className="font-semibold text-gray-900">Admin Settings</h3>
//                     <p className="text-sm text-gray-600">Manage system configuration</p>
//                   </div>
//                 </div>
//                 <Button variant="outline" size="sm" onClick={() => navigate('/admin/settings')}>
//                   Configure
//                 </Button>
//               </div>
//             </CardContent>
//           </Card>
//         </div>

//       </div>

//       <BottomNavbar />
//     </div>
//   );
// };

// export default IndexAdmin;
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { LoadingState } from '@/components/ui/loading-spinner';
import { ErrorMessage } from '@/components/ui/error-message';
import MobileHeader from '@/components/MobileHeader';
import BottomNavbar from '@/components/BottomNavbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Users,
  Calendar,
  Clock,
  FileText,
  BarChart3,
  Settings,
  UserCheck,
  ClipboardList,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { useApi } from '@/hooks/useApi';
import { apiClient } from '@/lib/api';
import { format } from 'date-fns';

const IndexAdmin = () => {
  const { user, loading, error, refreshUser } = useAuth();
  const navigate = useNavigate();

  // Fetch admin dashboard stats
  const { data: dashboardStats, loading: statsLoading } = useApi(
    () => apiClient.getDashboardStats(format(new Date(), 'yyyy-MM-dd')),
    []
  );

  if (loading) {
    return <LoadingState message="Loading admin dashboard..." />;
  }

  if (error) {
    return (
      <ErrorMessage
        message={error}
        onRetry={refreshUser}
        variant="full"
      />
    );
  }

  const userName = user ? `${user.first_name} ${user.last_name}` : 'Admin';
  const stats = dashboardStats?.data || {};

  // Quick action cards for admin
  const quickActions = [
    {
      title: 'Calendar Management',
      description: 'Create and manage all events',
      icon: Calendar,
      color: 'bg-blue-500',
      onClick: () => navigate('/admin/calendar'),
      count: 0,
      countLabel: 'Events'
    },
    {
      title: 'Timesheet Review',
      description: 'Monitor employee timesheets',
      icon: Clock,
      color: 'bg-green-500',
      onClick: () => navigate('/admin/timesheets'),
      count: stats.employees_out_today || 0,
      countLabel: 'Out Today'
    },
    {
      title: 'Team Overview',
      description: 'View team performance metrics',
      icon: Users,
      color: 'bg-purple-500',
      onClick: () => navigate('/admin/team'),
      count: stats.total_employees || 0,
      countLabel: 'Employees'
    },
    {
      title: 'Reports',
      description: 'Generate and view reports',
      icon: BarChart3,
      color: 'bg-orange-500',
      onClick: () => navigate('/admin/reports'),
      count: stats.leaves_approved || 0,
      countLabel: 'Approved'
    }
  ];

  // Stats cards
  const statsCards = [
    {
      title: 'Pending Approvals',
      value: stats.leaves_pending || 0,
      icon: AlertCircle,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50'
    },
    {
      title: 'Active Employees',
      value: stats.total_employees || 0,
      icon: UserCheck,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      title: 'Avg Days/Employee',
      value: stats.avg_days_per_employee?.toFixed(1) || '0.0',
      icon: TrendingUp,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Out Today',
      value: stats.employees_out_today || 0,
      icon: ClipboardList,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-20 sm:pb-24">
      <MobileHeader userName={userName} />

      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
        <div className="px-4 sm:px-6 py-4 max-w-screen-xl mx-auto">
          <h1 className="text-2xl font-bold mb-1">Welcome back, {user?.first_name}!</h1>
          <p className="text-purple-100">Admin Dashboard - Manage your team effectively</p>
        </div>
      </div>

      <div className="px-4 sm:px-6 py-3 sm:py-4 max-w-screen-xl mx-auto">

        {/* Stats Overview */}
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Today's Overview</h2>
          <div className="grid grid-cols-3 gap-3">
            {/* First Row - Dashboard Cards */}
            {/* <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/admin/employees')}> */}
            <Card className="cursor-pointer hover:shadow-md transition-shadow bg-blue-50 border-0" onClick={() => navigate('/admin/employees')}>
                <CardContent className="p-4 text-center">
                <p className="text-sm font-medium text-gray-600 mb-1">Employee Dashboard</p>
                <p className="text-xl font-bold text-blue-600">{stats.total_employees || 0}</p>
                <p className="text-xs text-gray-500">Total Staff</p>
                </CardContent>
            </Card>
            
            <Card className="cursor-pointer hover:shadow-md transition-shadow bg-green-50 border-0" onClick={() => navigate('/admin/leaves', { state: { activeTab: 'dashboard' } })}>
                <CardContent className="p-4 text-center">
                <p className="text-sm font-medium text-gray-600 mb-1">Leave Dashboard</p>
                <p className="text-xl font-bold text-green-600">{stats.leaves_approved || 0}</p>
                <p className="text-xs text-gray-500">Approved</p>
                </CardContent>
            </Card>
            
            <Card className="cursor-pointer hover:shadow-md transition-shadow bg-purple-50 border-0" onClick={() => navigate('/admin/timesheets')}>
                <CardContent className="p-4 text-center">
                <p className="text-sm font-medium text-gray-600 mb-1">Timesheet Dashboard</p>
                <p className="text-xl font-bold text-purple-600">85%</p>
                <p className="text-xs text-gray-500">Submitted</p>
                </CardContent>
            </Card>

            {/* Second Row - Status Cards */}
            {/* <Card className="bg-orange-50 border-0"> */}
            <Card className="cursor-pointer hover:shadow-md transition-shadow bg-orange-50 border-0" onClick={() => navigate('/admin/leaves', { state: { activeTab: 'pending' } })}>
                <CardContent className="p-4 text-center">
                <p className="text-sm font-medium text-gray-600 mb-1">Pending Approvals</p>
                <p className="text-xl font-bold text-orange-600">{stats.leaves_pending || 0}</p>
                <p className="text-xs text-gray-500">Need Review</p>
                </CardContent>
            </Card>
            
            <Card className="bg-green-50 border-0">
                <CardContent className="p-4 text-center">
                <p className="text-sm font-medium text-gray-600 mb-1">Active Employees</p>
                <p className="text-xl font-bold text-green-600">{stats.total_employees || 0}</p>
                <p className="text-xs text-gray-500">Working Today</p>
                </CardContent>
            </Card>
            
            <Card className="bg-blue-50 border-0">
                <CardContent className="p-4 text-center">
                <p className="text-sm font-medium text-gray-600 mb-1">Out Today</p>
                <p className="text-xl font-bold text-blue-600">{stats.employees_out_today || 0}</p>
                <p className="text-xs text-gray-500">On Leave</p>
                </CardContent>
            </Card>

            {/* Third Row - Dummy Cards */}
            <Card className="bg-gray-50 border-0">
                <CardContent className="p-4 text-center">
                <p className="text-sm font-medium text-gray-600 mb-1">Projects Active</p>
                <p className="text-xl font-bold text-gray-600">12</p>
                <p className="text-xs text-gray-500">In Progress</p>
                </CardContent>
            </Card>
            
            <Card className="bg-yellow-50 border-0">
                <CardContent className="p-4 text-center">
                <p className="text-sm font-medium text-gray-600 mb-1">This Month</p>
                <p className="text-xl font-bold text-yellow-600">1,240</p>
                <p className="text-xs text-gray-500">Total Hours</p>
                </CardContent>
            </Card>
            
            <Card className="bg-indigo-50 border-0">
                <CardContent className="p-4 text-center">
                <p className="text-sm font-medium text-gray-600 mb-1">Departments</p>
                <p className="text-xl font-bold text-indigo-600">8</p>
                <p className="text-xs text-gray-500">Active Teams</p>
                </CardContent>
            </Card>
            </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {quickActions.map((action, index) => (
              <Card key={index} className="cursor-pointer hover:shadow-md transition-shadow" onClick={action.onClick}>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-4">
                    <div className={`w-12 h-12 rounded-lg ${action.color} flex items-center justify-center`}>
                      <action.icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{action.title}</h3>
                      <p className="text-sm text-gray-600">{action.description}</p>
                      {action.count > 0 && (
                        <p className="text-xs text-gray-500 mt-1">
                          {action.count} {action.countLabel}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Recent Activity</h2>
          <Card>
            <CardContent className="p-4">
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <p className="text-sm text-gray-600">
                    {stats.leaves_approved || 0} leave requests approved today
                  </p>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  <p className="text-sm text-gray-600">
                    {stats.leaves_pending || 0} leave requests pending review
                  </p>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <p className="text-sm text-gray-600">
                    {stats.employees_out_today || 0} employees out today
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Admin Settings */}
        <div className="mb-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Settings className="w-6 h-6 text-gray-600" />
                  <div>
                    <h3 className="font-semibold text-gray-900">Admin Settings</h3>
                    <p className="text-sm text-gray-600">Manage system configuration</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => navigate('/admin/settings')}>
                  Configure
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

      </div>

      <BottomNavbar />
    </div>
  );
};

export default IndexAdmin;