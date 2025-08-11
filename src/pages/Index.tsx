
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingState } from '@/components/ui/loading-spinner';
import { ErrorMessage } from '@/components/ui/error-message';
import MobileHeader from '@/components/MobileHeader';
import WelcomeSection from '@/components/WelcomeSection';
import WorklogCard from '@/components/WorklogCard';
import PendingLeavesCard from '@/components/PendingLeavesCard';
import LeaveApplicationCard from '@/components/LeaveApplicationCard';
import DocumentsCard from '@/components/DocumentsCard';
import MenuSection from '@/components/MenuSection';
import QuickActions from '@/components/QuickActions';
import BottomNavbar from '@/components/BottomNavbar';

// imports to render the totalHours from WorklogCard and API
import { useApi } from '@/hooks/useApi';
import { apiClient } from '@/lib/api';
import { format, startOfWeek, endOfWeek, subDays } from 'date-fns';


const Index = () => {
  const { user, loading, error, refreshUser } = useAuth(); 

  const startWorkDay = startOfWeek(new Date(), { weekStartsOn: 1 }); // Monday as the start of the week
  const lastWorkDay = subDays(endOfWeek(startWorkDay, { weekStartsOn: 1 }), 2); // Friday as the end of the week
  const startDate = format(startWorkDay, 'yyyy-MM-dd');
  const endDate = format(lastWorkDay, 'yyyy-MM-dd');

  //Fetch the timesheet summary for the current week
  const { data: summaryData, loading: summaryLoading, error: summaryError, refetch: refetchSummary } = useApi(
    () => apiClient.getTimesheetSummary(startDate, endDate),
    [startDate, endDate]  // refetch when dates change
  );

  const totalHours = summaryData?.summary?.total_hours || 0;



  if (loading) {
    return <LoadingState message="Loading dashboard..." />;
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

  const userName = user ? `${user.first_name} ${user.last_name}` : 'Guest';

  return (
    <div className="min-h-screen bg-gray-50 pb-20 sm:pb-24">
      <MobileHeader userName={userName} />
      <WelcomeSection userName={user?.first_name || 'Guest'} />
      
      {/* <div className="px-4 sm:px-6 py-6 sm:py-8 max-w-screen-xl mx-auto"> */}
        {/* <div className="grid grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6"> */}
      <div className="px-4 sm:px-6 py-3 sm:py-4 max-w-screen-xl mx-auto">
        <div className="grid grid-cols-2 gap-4 sm:gap-6 mb-3 sm:mb-4">
          <WorklogCard totalHours={totalHours}/>
          <PendingLeavesCard />
        </div>
        
        <LeaveApplicationCard />
        <DocumentsCard />
      </div>
      
      <MenuSection />
      {/* <div className="mt-6 sm:mt-8"> */}
      <div className="mt-3 sm:mt-4">
        <QuickActions />
      </div>
      
      <BottomNavbar />
    </div>
  );
};

export default Index;
