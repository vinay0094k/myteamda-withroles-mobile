// ============================================================ updated aug 01 04pm ===============================================================
// ==================================================================================================================================================

// src/pages/Timesheet.tsx
import React, { useState, useEffect } from 'react';
import { ArrowLeft, Calendar, Plus, Edit, Trash2, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApi, useApiMutation } from '@/hooks/useApi';
import { apiClient } from '@/lib/api';
import { LoadingState } from '@/components/ui/loading-spinner';
import { ErrorMessage } from '@/components/ui/error-message';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, eachDayOfInterval, isSameDay, isAfter, parseISO, isFuture,
  isToday, isBefore, subDays, addDays, subMonths, getDay } from 'date-fns';
import MobileHeader from '@/components/MobileHeader';
import BottomNavbar from '@/components/BottomNavbar';
import { useAuth } from '@/contexts/AuthContext';


export interface TimesheetProps {
  viewingUserId?: string;
}

// FIXED: Display time properly for both new and updated entries
const displayLocalTime = (timeString: string) => {
  if (!timeString) return '';
  
  try {
    // If it's already in "HH:MM", just echo it
    if (/^\d{2}:\d{2}$/.test(timeString)) {
      return timeString;
    }
    
    // Otherwise parse the ISO offset into a Date…
    const date = parseISO(timeString);
    if (isNaN(date.getTime())) return timeString;
    
    // …and format it in local time, e.g. "2:00 PM"
    return format(date, 'p');
  } catch (error) {
    console.error('Error formatting time:', timeString, error);
    return timeString;
  }
}

// Helper function to parse entry date correctly
const parseEntryDate = (dateString: string): Date => {
  try {
    // Handle ISO date strings with timezone information
    if (dateString.includes('T') && (dateString.includes('+') || dateString.includes('Z'))) {
      const date = parseISO(dateString);
      // Return just the date part to avoid timezone issues
      return new Date(date.getFullYear(), date.getMonth(), date.getDate());
    } else {
      // Handle simple date strings (YYYY-MM-DD)
      const [year, month, day] = dateString.split('-').map(Number);
      return new Date(year, month - 1, day);
    }
  } catch (error) {
    console.error('Error parsing date:', dateString, error);
    return new Date(); // fallback to current date
  }
};

// NEW: Helper function to check if a date is weekend
const isWeekend = (date: Date): boolean => {
  const day = getDay(date); // 0 = Sunday, 6 = Saturday
  return day === 0 || day === 6;
};

// const Timesheet = () => {
const Timesheet: React.FC<TimesheetProps> = ({ viewingUserId }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { user } = useAuth(); // Ensure user is destructured here
  const [currentWeekStart, setCurrentWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [submitting, setSubmitting] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);

  // const targetUserId = viewingUserId || user?.id; // Determine which user's timesheet to view
  const targetUserId = user?.id;  //Always use current user's ID

  // Add state for selected day filter
  const [selectedDayForView, setSelectedDayForView] = useState<Date | null>(() => new Date());
  console.log('Selected Day for View:', selectedDayForView);
  
  // Calculate week dates
  const weekStart = currentWeekStart;
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd }).slice(0, 5); // Mon-Fri only
  
  // For current week summary, use the original week range
  const startDate = format(weekStart, 'yyyy-MM-dd');
  const lastWorkday = subDays(weekEnd, 2); 
  const endDate = format(lastWorkday, 'yyyy-MM-dd');
  const currentWeekLabel = `${format(weekStart, 'MMM dd')} - ${format(lastWorkday, 'MMM dd, yyyy')}`;
  
  // For fetching ALL entries, use a broader date range (e.g., last 3 months)
  const broadStartDate = format(subMonths(new Date(), 3), 'yyyy-MM-dd');
  const broadEndDate = format(addDays(new Date(), 7), 'yyyy-MM-dd'); // Include next week
  
  // Get broader range of timesheet data to include entries from any day user might click
  const { data: timesheetData, loading, error, refetch } = useApi(
    () => apiClient.getTimesheets({
      start_date: broadStartDate,
      end_date: broadEndDate,
      limit: 200,
      user_id: targetUserId // This is the user?.id for employee own timesheet view
    }),
    [broadStartDate, broadEndDate, targetUserId] 
  );

  console.log('Raw API timesheetData:', timesheetData);
  
  // Get current week's summary data (keep this for week progress bar)
  const { data: summaryData, loading: summaryLoading, refetch: refetchSummary } = useApi(
    () => apiClient.getTimesheetSummary(
      startDate, 
      endDate, 
      targetUserId), 
    [startDate, endDate, targetUserId] 
  );

  const { mutate } = useApiMutation();

  const timeEntries = timesheetData?.timesheets || [];

  console.log('Processed timeEntries array:', timeEntries);

  // NEW: Check if there are any draft entries for the currently selected day
  const hasDraftEntriesForSelectedDay = timeEntries.some(entry => {
    const entryDate = parseEntryDate(entry.entry_date);
    // Ensure selectedDayForView is not null and matches the entry date, and status is 'draft'
    return selectedDayForView && isSameDay(entryDate, selectedDayForView) && entry.status === 'draft';
  });

  // Submitted totalHours for current week (for progress bar)
  const totalHours = summaryData?.summary?.total_hours || 0;

  // Check if there are any draft entries to submit in current week
  const hasDraftEntries = timeEntries.some(entry => {
    const entryDate = parseEntryDate(entry.entry_date);
    const isInCurrentWeek = entryDate >= weekStart && entryDate <= lastWorkday;
    return entry.status === 'draft' && isInCurrentWeek;
  });

  // Helper to compute hours for a given date
  const getDayHours = (date: Date) =>
    timeEntries
      .filter(e => {
        const entryDate = parseEntryDate(e.entry_date);
        return isSameDay(entryDate, date);
      })
      .reduce((sum, e) => sum + (e.duration_hours || 0), 0);
  
  // const isDayCompleted = (date: Date) =>
  //   timeEntries.some(e => {
  //     const entryDate = parseEntryDate(e.entry_date);
  //     return isSameDay(entryDate, date) && e.status === 'submitted';
  //   });

  // Checks if **any** entry that day is submitted
  const isDayPartiallySubmitted = (date: Date) =>
    timeEntries.some(e => {
      const entryDate = parseEntryDate(e.entry_date);
      return isSameDay(entryDate, date) && e.status === 'submitted';
    });

  // Its True only if **all** entries that day are submitted (and at least one exists)
  const isDayFullySubmitted = (date: Date) => {
    const entriesForDay = timeEntries.filter(e => {
      const entryDate = parseEntryDate(e.entry_date);
      return isSameDay(entryDate, date);
    });
    return entriesForDay.length > 0 && entriesForDay.every(e => e.status === 'submitted');
  };

  // Its True if there is **any** draft entry that day
  const hasDraftEntriesForDay = (date: Date) =>
    timeEntries.some(e => {
      const entryDate = parseEntryDate(e.entry_date);
      return isSameDay(entryDate, date) && e.status === 'draft';
    });



  // STEP 3: Prevent navigating earlier than 3 weeks ago
  const earliestWeekStart = subWeeks(startOfWeek(new Date(), { weekStartsOn: 1 }), 3);

  const navigateWeek = (dir: 'prev' | 'next') => {
    setCurrentWeekStart(dir === 'prev'
      ? subWeeks(currentWeekStart, 1)
      : addWeeks(currentWeekStart, 1)
    );
  };

  const goToCurrentWeek = () => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const isCurrentWeek = isSameDay(currentWeekStart, startOfWeek(new Date(), { weekStartsOn: 1 }));

  // Get filtered entries for the selected day
  const getFilteredEntries = () => {
    if (selectedDayForView) {
      const selectedDayString = format(selectedDayForView, 'yyyy-MM-dd');
      console.log('Filtering entries. Selected day string:', selectedDayString);

      return timeEntries.filter(e => {
        const entryDate = parseEntryDate(e.entry_date);
        const entryDateString = format(entryDate, 'yyyy-MM-dd');

        console.log(
          'Comparing entry date string:', entryDateString, 
          'with selected day string:', selectedDayString, 
          'Result:', entryDateString === selectedDayString
        );

        return entryDateString === selectedDayString;
      });
    }
    return timeEntries;
  };
    
  const filteredEntries = getFilteredEntries();

  // Compute date context for Add button logic
  const dateForAddEntry = selectedDayForView || new Date();
  const viewedDateHours = getDayHours(dateForAddEntry);
  const viewedDateDrafts = timeEntries.filter(e => {
    const entryDate = parseEntryDate(e.entry_date);
    return isSameDay(entryDate, dateForAddEntry) && e.status === 'draft';
  });
  const viewedDateSubmittedCount = timeEntries.filter(e => {
    const entryDate = parseEntryDate(e.entry_date);
    return isSameDay(entryDate, dateForAddEntry) && e.status === 'submitted';
  }).length;

  // Define the state based on the 8-hour limit
  const isViewedDayLimitReached = viewedDateHours >= 8;
  
  // const isAddEntryButtonDisabled = isFuture(dateForAddEntry) || viewedDateHours >= 8 || isWeekend(dateForAddEntry);
  const isAddEntryButtonDisabled = isFuture(dateForAddEntry) || viewedDateHours >= 8 || isWeekend(dateForAddEntry) || isDayFullySubmitted(dateForAddEntry);


  // Check if current day is weekend for other buttons
  const isTodayWeekend = isWeekend(new Date());
  // ... keep existing code (handleSaveDraft, handleSubmitTimesheet, handleEditEntry, handleDeleteEntry functions)

  const handleSubmitTimesheet = async () => {
    if (timeEntries.length === 0) {
      toast({
        title: "No Entries",
        description: "Please add time entries before submitting.",
        variant: "destructive",
      });
      return;
    }
    
    // Add a check to ensure a day is selected for submission
    if (!selectedDayForView) {
      toast({
        title: "No Day Selected",
        description: "Please select a day to submit entries.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const dayToSubmit = format(selectedDayForView, 'yyyy-MM-dd');
      const result = await mutate(
        // () => apiClient.submitTimesheet(startDate, endDate),
        () => apiClient.submitTimesheet(dayToSubmit, dayToSubmit),
        {}
      ) as { submitted_entries: number } | null;

      if (result) {
        toast({
          title: "Timesheet Submitted",
          description: `Successfully submitted ${result.submitted_entries} time entries for ${format(selectedDayForView, 'MMM dd, yyyy')}.`,
        });
        refetch();
      }
    } catch (error) {
      toast({
        title: "Submit Failed",
        description: "Failed to submit timesheet. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // const handleEditEntry = (entryId: string) => {
  //   navigate(`/add-time-entry?edit=${entryId}`);
  // };
  const handleEditEntry = (entryId: string) => {
    if (viewingUserId) { // Disable editing when viewing another user's timesheet
      toast({
        title: "Action Not Allowed",
        description: "You can only edit your own timesheet entries.",
        variant: "destructive",
      });
      return;
    }
    navigate(`/add-time-entry?edit=${entryId}`);
  };
  
  const handleDeleteEntry = async (entryId: string) => {
    // if (!confirm('Are you sure you want to delete this time entry?')) {
    //   return;
    // }
    if (viewingUserId) { // Disable deleting when viewing another user's timesheet
      toast({
        title: "Action Not Allowed",
        description: "You can only delete your own timesheet entries.",
        variant: "destructive",
      });
      return;
    }

    try {
      const result = await mutate(
        () => apiClient.deleteTimesheet(entryId),
        {}
      );

      if (result === true) {
        toast({
          title: "Entry Deleted",
          description: "Time entry has been deleted successfully.",
        });
        refetch();
      }
    } catch (error) {
      toast({
        title: "Delete Failed",
        description: "Failed to delete entry. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getTodayEntries = () => {
    const today = new Date();
    return timeEntries.filter(entry => {
      const entryDate = parseEntryDate(entry.entry_date);
      return isSameDay(entryDate, today);
    });
  };

  const todayEntries = getTodayEntries();

  // NEW: calculate today's total logged hours and whether limit is reached
  const todayTotalHours = todayEntries.reduce(
    (sum, entry) => sum + (entry.duration_hours || 0),
    0
  );
  const isTodayLimitReached = todayTotalHours >= 8;
  
  // === NEW: useEffect to trigger a refetch when returning from AddTimeEntry ===
  useEffect(() => {
    // Check if the navigation state has the refresh flag
    if (location.state?.refresh) {
      refetch(); // Refetch the timesheet data
      refetchSummary(); // Refetch the summary data

      // If entryDate is provided, set it as the selected day
      if (location.state?.entryDate) {
        const entryDate = new Date(location.state.entryDate);
        setSelectedDayForView(entryDate);
      }

      //If weekStart is provided, set it as the current week
      if (location.state?.weekStart) {
        const weekStartDate = new Date(location.state.weekStart);
        setCurrentWeekStart(weekStartDate);
      }

      // Clear the state to prevent future, unintended re-fetches
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, navigate, refetch, refetchSummary]);

  return (
    <div className="min-h-screen bg-gray-50">
      <MobileHeader userName="User" />
      
      <div className="px-4 pt-4 pb-24">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <button onClick={() => navigate('/')} className="mr-4">
              <ArrowLeft className="w-6 h-6 text-gray-600" />
            </button>
            <h1 className="text-xl font-semibold text-gray-800">Timesheet</h1>
          </div>
          <Calendar className="w-6 h-6 text-gray-600" />
        </div>
        
        {/* Error Message Handling */}
        {error && (
          <ErrorMessage 
            message="Failed to load timesheet data. Please try again." 
            onRetry={refetch}
            className="mb-4"
          />
        )}

        {/* ----------------- Week Progress Navigation ----------------- */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
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
              <div className="text-sm font-medium text-gray-800">{currentWeekLabel}</div>
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

          {/* -------------------------- Week Progress -------------------------- */}
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-600">Week Progress</span>
            <span className="text-sm font-medium text-gray-800">
              {summaryLoading ? 'Loading...' : `${totalHours}h / 40h`}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-purple-600 h-2 rounded-full transition-all duration-300" 
              style={{ width: `${Math.min((totalHours / 40) * 100, 100)}%` }}
            ></div>
          </div>
        </div>

        {/* --------------------- Week Days with clickable along with showing Hours quoted and Completion Status with tick --------------------- */}
        <div className="grid grid-cols-5 gap-2 mb-6">
          {weekDays.map((day, idx) => {
            const dayHours = getDayHours(day);
            // const isCompleted = isDayCompleted(day);
            const isPartiallySubmitted = isDayPartiallySubmitted(day);
            const isFullySubmitted = isDayFullySubmitted(day);
            const hasDrafts = hasDraftEntriesForDay(day);

            const isToday = isSameDay(day, new Date());

            return (
              <div
                key={idx}
                onClick={() => setSelectedDayForView(day)}
                className={`text-center cursor-pointer ${
                  selectedDayForView && !isSameDay(day, selectedDayForView)
                    ? 'opacity-50'
                    : ''
                }`}
              >
                <div className="text-xs text-gray-500 mb-1">
                  {format(day, 'EEE')}
                </div>
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium mx-auto mb-1 relative ${
                    isToday
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 text-gray-800'
                  } ${selectedDayForView && isSameDay(day, selectedDayForView) ? 'ring-2 ring-purple-500' : ''}`}
                >
                  {format(day, 'd')}
                  {/* Green tick only if **fully** submitted */}
                  {isFullySubmitted && (
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 text-white" />
                    </div>
                  )}
                  {/* Yellow dot if there are drafts but not fully submitted */}
                  {!isFullySubmitted && hasDrafts && (
                     <div className="absolute bottom-1 right-1 w-2 h-2 bg-yellow-500 rounded-full"></div>
                  )}
                </div>
                <div className="text-xs text-gray-600">
                  {dayHours > 0 ? `${dayHours}h` : '0h'}
                </div>
              </div>
            );
          })}
        </div>

        {/* Showing the Today and Selected Day Section */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            {selectedDayForView && isSameDay(selectedDayForView, new Date())
              ? `Today, ${format(selectedDayForView, 'MMM dd')}`
              : selectedDayForView
              ? `${format(selectedDayForView, 'EEEE, MMM dd')}`
              : `Selected Week Entries`}
          </h2>

          {loading ? (
            <LoadingState message="Loading time entries..." />
          ) : (
            <div className="space-y-3">
              {filteredEntries.length === 0 ? (
                // <div className="text-center py-8 text-gray-500">
                //   No time entries found for {selectedDayForView ? format(selectedDayForView, 'EEEE') : 'today'}.
                // </div>
                <div className="text-center py-8 text-gray-500">
                  {selectedDayForView && isWeekend(selectedDayForView) ? (
                    <p>Time entries cannot be added on weekends.</p>
                  ) : (
                    <p>
                      No time entries found for{" "}
                      {selectedDayForView
                        ? format(selectedDayForView, "EEEE")
                        : "today"}
                      .
                    </p>
                  )}
                </div>
              ) : (
                filteredEntries.map((entry) => (
                  <div key={entry.id} className="bg-white rounded-lg p-4 shadow-sm border">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-medium text-gray-800">{entry.project?.name || 'Project'}</h3>
                        <p className="text-sm text-gray-600">{entry.task_description}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {format(parseEntryDate(entry.entry_date), 'EEE, MMM dd')}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-800">
                          {entry.duration_hours ? `${entry.duration_hours}h` : 'N/A'}
                        </span>
                        {entry.status === 'draft' && (
                          <div className="flex space-x-1">
                            <button
                              onClick={() => handleEditEntry(entry.id)}
                              className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteEntry(entry.id)}
                              className="p-1 text-red-600 hover:bg-red-50 rounded"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center text-sm text-gray-500">
                      <span className="mr-2">🕘</span>
                      <span>
                        {entry.start_time && entry.end_time
                          ? `${displayLocalTime(entry.start_time)} - ${displayLocalTime(entry.end_time)}`
                          : 'Time not specified'}
                      </span>
                      <span className={`ml-auto px-2 py-1 rounded-full text-xs font-medium ${
                        entry.status === 'draft'
                          ? 'bg-yellow-100 text-yellow-800'
                          : entry.status === 'submitted'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {entry.status.charAt(0).toUpperCase() + entry.status.slice(1)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* ------------------------- Add Time Entry Button ------------------------- */}
        {/* <Button
          onClick={() => navigate(`/add-time-entry?date=${format(selectedDayForView, 'yyyy-MM-dd')}&weekStart=${format(currentWeekStart, 'yyyy-MM-dd')}`)}

          disabled={isAddEntryButtonDisabled}
          className={`w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-lg mb-4 ${
            isAddEntryButtonDisabled ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          <Plus className="w-5 h-5 mr-2" />
          Add Time Entry
        </Button> */}
        <Button
          onClick={() => {
            if (!viewingUserId) { // Only allow adding for the current user
              navigate(`/add-time-entry?date=${format(selectedDayForView, 'yyyy-MM-dd')}`);
            }
          }}
          disabled={isAddEntryButtonDisabled || !!viewingUserId} // Disable if viewing another user
          className={`w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-lg mb-4 ${
            (isAddEntryButtonDisabled || !!viewingUserId) ? 'opacity-50 cursor-not-allowed' : '' // Apply disabled styles
          }`}
        >
          <Plus className="w-5 h-5 mr-2" />
          {viewingUserId ? 'View Only' : 'Add Time Entry'} {/* Change button text */}
        </Button>


        {/* Conditional completion message for the viewed day */}
        {isViewedDayLimitReached && (
          <div className="text-center text-sm text-gray-500 mb-4">
            8hrs completed for this day!
          </div>
        )}

        {/* Bottom Actions */}
        {/* <Button
          className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3"
          onClick={handleSubmitTimesheet}
          disabled={submitting || !hasDraftEntries || (selectedDayForView && isWeekend(selectedDayForView))}
        >
          {submitting ? (
            <>
              <LoadingSpinner size="sm" className="mr-2" />
              Submitting...
            </>
          ) : (
            hasDraftEntries ? 'Submit Timesheet' : 'No Drafts to Submit'
          )}
        </Button> */}
        <Button
          className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3"
          onClick={() => {
            if (!viewingUserId) { // Only allow submitting for the current user
              handleSubmitTimesheet();
            }
          }}
        //   {/* disabled={submitting || !hasDraftEntries || (selectedDayForView && isWeekend(selectedDayForView)) || !!viewingUserId} // Disable if viewing another user
        // > */}
          disabled={submitting || !hasDraftEntriesForSelectedDay || (selectedDayForView && isWeekend(selectedDayForView)) || !!viewingUserId}
>
          {submitting ? (
            <>
              <LoadingSpinner size="sm" className="mr-2" />
              Submitting...
            </>
          ) : (
            viewingUserId ? 'View Only' : (hasDraftEntries ? 'Submit Timesheet' : 'No Drafts to Submit') // Change button text
            // viewingUserId ? 'View Only' : (hasDraftEntriesForSelectedDay ? `Submit for ${format(selectedDayForView || new Date(), 'MMM dd')}` : 'No Drafts for Selected Day')

          )}
        </Button>
      </div>

      <BottomNavbar />
    </div>
  );
};

export default Timesheet;

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////