import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, ArrowLeft, Home, Calendar as CalendarIcon, Clock, FileText, Star } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { format, isSameDay } from 'date-fns';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApi } from '@/hooks/useApi';
import { apiClient } from '@/lib/api';
import { LoadingState } from '@/components/ui/loading-spinner';
import { ErrorMessage } from '@/components/ui/error-message';
import MobileHeader from '@/components/MobileHeader';
import BottomNavbar from '@/components/BottomNavbar';

const CalendarPage = () => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showDateEvents, setShowDateEvents] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(location.state?.activeTab || 'All Events');

  // API calls for events
  const { data: eventsData, loading, error, refetch } = useApi(
    () => apiClient.getEvents({ 
      page: 1, 
      limit: 50,
      start_date: format(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1), 'yyyy-MM-dd'),
      end_date: format(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0), 'yyyy-MM-dd')
    }),
    [currentMonth]
  );

  const { data: birthdays } = useApi(
    () => apiClient.getBirthdays(currentMonth.getMonth() + 1, currentMonth.getFullYear()),
    [currentMonth]
  );

  const { data: anniversaries } = useApi(
    () => apiClient.getAnniversaries(currentMonth.getMonth() + 1, currentMonth.getFullYear()),
    [currentMonth]
  );

  const { data: holidays } = useApi(
    () => apiClient.getHolidays(currentMonth.getFullYear(), currentMonth.getMonth() + 1),
    [currentMonth]
  );

  // Process events data
  const allEvents = [
    ...(eventsData?.events || []),
    ...(birthdays || []),
    ...(anniversaries || []),
    ...(holidays || [])
  ].filter((event, index, self) => 
    // Remove duplicates based on id
    index === self.findIndex(e => e.id === event.id)
  );

  const processedEvents = allEvents.map(event => ({
    id: event.id,
    type: event.event_type,
    name: event.title,
    date: new Date(event.event_date),
    icon: event.event_type === 'birthday' ? '🎂' : 
          event.event_type === 'anniversary' ? '💼' : 
          event.event_type === 'holiday' ? '⭐' : '📅',
    color: event.event_type === 'birthday' ? 'bg-gradient-to-r from-pink-100 to-pink-200 text-pink-700 border-pink-300' :
           event.event_type === 'anniversary' ? 'bg-gradient-to-r from-green-100 to-green-200 text-green-700 border-green-300' :
           event.event_type === 'holiday' ? 'bg-gradient-to-r from-orange-100 to-orange-200 text-orange-700 border-orange-300' :
           'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-700 border-blue-300',
    description: event.description || format(new Date(event.event_date), 'MMM dd'),
    user: event.user
  }));

  // Count events by type
  const eventCounts = {
    total: processedEvents.length,
    birthdays: processedEvents.filter(e => e.type === 'birthday').length,
    anniversaries: processedEvents.filter(e => e.type === 'anniversary').length,
    holidays: processedEvents.filter(e => e.type === 'holiday').length,
    other: processedEvents.filter(e => !['birthday', 'anniversary', 'holiday'].includes(e.type)).length
  };

  // Create tabs with counts
  const tabs = [
    { name: 'All Events', count: eventCounts.total },
    { name: 'Birthdays', count: eventCounts.birthdays },
    { name: 'Anniversaries', count: eventCounts.anniversaries },
    { name: 'Holidays', count: eventCounts.holidays }
  ];

  const getEventsForDate = (date: Date) => processedEvents.filter(e => isSameDay(e.date, date));
  
  const getFilteredEvents = () => {
    if (showDateEvents && selectedDate) {
      // Show events for selected date
      const dateEvents = getEventsForDate(selectedDate);
      switch (activeTab) {
        case 'Birthdays': return dateEvents.filter(e => e.type === 'birthday');
        case 'Anniversaries': return dateEvents.filter(e => e.type === 'anniversary');
        case 'Holidays': return dateEvents.filter(e => e.type === 'holiday');
        default: return dateEvents;
      }
    } else {
      // Show all events for the month
      switch (activeTab) {
        case 'Birthdays': return processedEvents.filter(e => e.type === 'birthday');
        case 'Anniversaries': return processedEvents.filter(e => e.type === 'anniversary');
        case 'Holidays': return processedEvents.filter(e => e.type === 'holiday');
        default: return processedEvents;
      }
    }
  };

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    if (date) {
      setShowDateEvents(true);
    }
  };

  const handleTabChange = (tabName: string) => {
    setActiveTab(tabName);
    // Reset to show all events when changing tabs
    setShowDateEvents(false);
  };

  // Get dates with events for calendar highlighting
  const getBirthdayDates = () => processedEvents.filter(e => e.type === 'birthday').map(e => e.date);
  const getAnniversaryDates = () => processedEvents.filter(e => e.type === 'anniversary').map(e => e.date);
  const getHolidayDates = () => processedEvents.filter(e => e.type === 'holiday').map(e => e.date);
  const getOtherEventDates = () => processedEvents.filter(e => !['birthday', 'anniversary', 'holiday'].includes(e.type)).map(e => e.date);

  return (
    <div className="min-h-screen bg-gray-50 pb-20 sm:pb-24">
      <MobileHeader userName="User" />
      
      <div className="bg-white shadow-sm">
        <div className="flex items-center justify-between p-4 sm:p-6">
          <button onClick={() => navigate('/')} className="p-2">
            <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600" />
          </button>
          <h1 className="text-lg sm:text-xl font-semibold">Calendar</h1>
          <div className="w-9" />
        </div>
      </div>

      <div className="p-4 sm:p-6 max-w-screen-xl mx-auto">
        {error && (
          <ErrorMessage 
            message="Failed to load calendar events. Please try again." 
            onRetry={refetch}
            className="mb-4"
          />
        )}

        {/* Calendar with color-coded event highlighting */}
        <div className="bg-white rounded-2xl shadow-sm p-4 sm:p-6 mb-6 max-w-* mx-auto">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleDateSelect}
            month={currentMonth}
            onMonthChange={setCurrentMonth}
            className="w-full"
            modifiers={{
              birthdayDate: getBirthdayDates(),
              anniversaryDate: getAnniversaryDates(),
              holidayDate: getHolidayDates(),
              otherEventDate: getOtherEventDates()
            }}
            modifiersStyles={{
              birthdayDate: { 
                background: 'linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%)', 
                color: '#be185d',
                borderRadius: '50%',
                fontWeight: 'bold'
              },
              anniversaryDate: { 
                background: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)', 
                color: '#15803d',
                borderRadius: '50%',
                fontWeight: 'bold'
              },
              holidayDate: { 
                background: 'linear-gradient(135deg, #fed7aa 0%, #fdba74 100%)', 
                color: '#c2410c',
                borderRadius: '50%',
                fontWeight: 'bold'
              },
              otherEventDate: { 
                background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)', 
                color: '#1d4ed8',
                borderRadius: '50%',
                fontWeight: 'bold'
              }
            }}
          />
          
          {/* Legend */}
          <div className="mt-4 flex flex-wrap gap-3 justify-center text-xs">
            <div className="flex items-center">
              <div className="w-4 h-4 rounded-full mr-2" style={{background: 'linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%)'}}></div>
              <span className="text-pink-700">Birthdays</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 rounded-full mr-2" style={{background: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)'}}></div>
              <span className="text-green-700">Anniversaries</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 rounded-full mr-2" style={{background: 'linear-gradient(135deg, #fed7aa 0%, #fdba74 100%)'}}></div>
              <span className="text-orange-700">Holidays</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-4 sm:p-6">
          {/* Tabs with event counts */}
          <div className="flex space-x-2 sm:space-x-3 mb-4 sm:mb-6 overflow-x-auto">
            {tabs.map(tab => (
              <button
                key={tab.name}
                onClick={() => handleTabChange(tab.name)}
                className={`px-4 py-2 sm:px-6 sm:py-3 rounded-full text-sm sm:text-base font-medium transition-colors whitespace-nowrap flex items-center space-x-2 ${
                  activeTab === tab.name
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <span>{tab.name}</span>
                {(showDateEvents && selectedDate ? getEventsForDate(selectedDate).filter(e => 
                  tab.name === 'All Events' || 
                  (tab.name === 'Birthdays' && e.type === 'birthday') ||
                  (tab.name === 'Anniversaries' && e.type === 'anniversary') ||
                  (tab.name === 'Holidays' && e.type === 'holiday')
                ).length : tab.count) > 0 && (
                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                    activeTab === tab.name 
                      ? 'bg-white text-purple-600' 
                      : 'bg-purple-100 text-purple-600'
                  }`}>
                    {showDateEvents && selectedDate ? getEventsForDate(selectedDate).filter(e => 
                      tab.name === 'All Events' || 
                      (tab.name === 'Birthdays' && e.type === 'birthday') ||
                      (tab.name === 'Anniversaries' && e.type === 'anniversary') ||
                      (tab.name === 'Holidays' && e.type === 'holiday')
                    ).length : tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div>
            {showDateEvents && selectedDate && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-blue-800 font-medium">
                    Events for {format(selectedDate, 'EEEE, MMMM dd, yyyy')}
                  </span>
                  <button
                    onClick={() => setShowDateEvents(false)}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    Show All Events
                  </button>
                </div>
              </div>
            )}
            <h3 className="text-lg sm:text-xl font-semibold mb-4 sm:mb-6">
              {showDateEvents && selectedDate 
                ? `${activeTab} on ${format(selectedDate, 'MMM dd')}`
                : activeTab
              } 
              {getFilteredEvents().length > 0 && (
                <span className="text-purple-600 ml-2">({getFilteredEvents().length})</span>
              )}
            </h3>
            {loading ? (
              <LoadingState message="Loading events..." />
            ) : (
              <div className="space-y-3 sm:space-y-4">
                {getFilteredEvents().length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    {showDateEvents && selectedDate 
                      ? `No ${activeTab.toLowerCase()} on ${format(selectedDate, 'MMMM dd, yyyy')}.`
                      : `No ${activeTab.toLowerCase()} found for ${format(currentMonth, 'MMMM yyyy')}.`
                    }
                  </div>
                ) : (
                  getFilteredEvents().map(event => (
                    <div key={event.id} className={`p-4 sm:p-6 rounded-xl border-2 ${event.color} flex items-center space-x-3 sm:space-x-4`}>
                      <div className="text-2xl sm:text-3xl">{event.icon}</div>
                      <div className="flex-1">
                        <h4 className="font-semibold sm:text-lg">{event.name}</h4>
                        <p className="text-sm sm:text-base opacity-80">
                          {format(event.date, 'EEEE, MMMM dd, yyyy')}
                        </p>
                        {event.user && (
                          <p className="text-xs sm:text-sm opacity-70 mt-1">
                            {event.user.first_name} {event.user.last_name}
                          </p>
                        )}
                        {event.type === 'birthday' && (
                          <p className="text-xs sm:text-sm opacity-60 mt-1">🎉 Birthday Celebration</p>
                        )}
                        {event.type === 'anniversary' && (
                          <p className="text-xs sm:text-sm opacity-60 mt-1">🏢 Work Anniversary</p>
                        )}
                        {event.type === 'holiday' && (
                          <p className="text-xs sm:text-sm opacity-60 mt-1">🎊 Company Holiday</p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <BottomNavbar />
    </div>
  );
};

export default CalendarPage;