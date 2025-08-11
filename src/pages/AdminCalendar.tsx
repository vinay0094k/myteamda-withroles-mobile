import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isToday } from 'date-fns';
import { ArrowLeft, ChevronLeft, ChevronRight, Plus, Edit, Trash2, Calendar, Clock, MapPin, Users } from 'lucide-react';
import { useApi, useApiMutation } from '@/hooks/useApi';
import { apiClient } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import MobileHeader from '@/components/MobileHeader';
import BottomNavbar from '@/components/BottomNavbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LoadingState } from '@/components/ui/loading-spinner';
import { ErrorMessage } from '@/components/ui/error-message';

interface Event {
  id: string;
  title: string;
  description?: string;
  date: string;
  time?: string;
  location?: string;
  type: 'company' | 'holiday' | 'birthday' | 'anniversary' | 'meeting' | 'other';
  created_by?: string;
  attendees?: number;
}

interface EventFormData {
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  type: 'company' | 'holiday' | 'birthday' | 'anniversary' | 'meeting' | 'other';
  attendees: string;
}

const AdminCalendar = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [formData, setFormData] = useState<EventFormData>({
    title: '',
    description: '',
    date: '',
    time: '',
    location: '',
    type: 'company',
    attendees: ''
  });

  // Fetch events for the current month
  const { data: eventsData, loading, error, refetch } = useApi(
    () => apiClient.getEvents({
      start_date: format(startOfMonth(currentDate), 'yyyy-MM-dd'),
      end_date: format(endOfMonth(currentDate), 'yyyy-MM-dd')
    }),
    [currentDate]
  );

  // Mutations for CRUD operations
  const { mutate: createEvent, loading: creating } = useApiMutation();
  const { mutate: updateEvent, loading: updating } = useApiMutation();
  const { mutate: deleteEvent, loading: deleting } = useApiMutation();

  const events = eventsData?.data || [];

  // Calendar navigation
  const goToPreviousMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const goToNextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const goToToday = () => setCurrentDate(new Date());

  // Get days for calendar grid
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Get events for a specific date
  const getEventsForDate = (date: Date) => {
    return events.filter((event: Event) => 
      isSameDay(new Date(event.date), date)
    );
  };

  // Event type colors
  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'company': return 'bg-blue-100 text-blue-800';
      case 'holiday': return 'bg-red-100 text-red-800';
      case 'birthday': return 'bg-pink-100 text-pink-800';
      case 'anniversary': return 'bg-purple-100 text-purple-800';
      case 'meeting': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Handle form input changes
  const handleInputChange = (field: keyof EventFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      date: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '',
      time: '',
      location: '',
      type: 'company',
      attendees: ''
    });
  };

  // Handle create event
  const handleCreateEvent = async () => {
    if (!formData.title || !formData.date) {
      toast({
        title: 'Validation Error',
        description: 'Title and date are required.',
        variant: 'destructive'
      });
      return;
    }

    try {
      await createEvent(
        () => apiClient.createEvent({
          title: formData.title,
          description: formData.description,
          date: formData.date,
          time: formData.time,
          location: formData.location,
          type: formData.type,
          attendees: formData.attendees ? parseInt(formData.attendees) : undefined
        }),
        {}
      );

      toast({
        title: 'Event Created',
        description: 'Event has been created successfully.',
      });

      setIsCreateDialogOpen(false);
      resetForm();
      refetch();
    } catch (error) {
      toast({
        title: 'Create Failed',
        description: 'Failed to create event. Please try again.',
        variant: 'destructive'
      });
    }
  };

  // Handle edit event
  const handleEditEvent = (event: Event) => {
    setEditingEvent(event);
    setFormData({
      title: event.title,
      description: event.description || '',
      date: event.date,
      time: event.time || '',
      location: event.location || '',
      type: event.type,
      attendees: event.attendees?.toString() || ''
    });
    setIsEditDialogOpen(true);
  };

  // Handle update event
  const handleUpdateEvent = async () => {
    if (!editingEvent || !formData.title || !formData.date) {
      toast({
        title: 'Validation Error',
        description: 'Title and date are required.',
        variant: 'destructive'
      });
      return;
    }

    try {
      await updateEvent(
        () => apiClient.updateEvent(editingEvent.id, {
          title: formData.title,
          description: formData.description,
          date: formData.date,
          time: formData.time,
          location: formData.location,
          type: formData.type,
          attendees: formData.attendees ? parseInt(formData.attendees) : undefined
        }),
        {}
      );

      toast({
        title: 'Event Updated',
        description: 'Event has been updated successfully.',
      });

      setIsEditDialogOpen(false);
      setEditingEvent(null);
      resetForm();
      refetch();
    } catch (error) {
      toast({
        title: 'Update Failed',
        description: 'Failed to update event. Please try again.',
        variant: 'destructive'
      });
    }
  };

  // Handle delete event
  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm('Are you sure you want to delete this event?')) return;

    try {
      await deleteEvent(
        () => apiClient.deleteEvent(eventId),
        {}
      );

      toast({
        title: 'Event Deleted',
        description: 'Event has been deleted successfully.',
      });

      refetch();
    } catch (error) {
      toast({
        title: 'Delete Failed',
        description: 'Failed to delete event. Please try again.',
        variant: 'destructive'
      });
    }
  };

  // Handle date click
  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setFormData(prev => ({ ...prev, date: format(date, 'yyyy-MM-dd') }));
  };

  // Event form component
  const EventForm = ({ isEdit = false }: { isEdit?: boolean }) => (
    <div className="space-y-4">
      <div>
        <Label htmlFor="title">Event Title *</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => handleInputChange('title', e.target.value)}
          placeholder="Enter event title"
        />
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => handleInputChange('description', e.target.value)}
          placeholder="Enter event description"
          rows={3}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="date">Date *</Label>
          <Input
            id="date"
            type="date"
            value={formData.date}
            onChange={(e) => handleInputChange('date', e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="time">Time</Label>
          <Input
            id="time"
            type="time"
            value={formData.time}
            onChange={(e) => handleInputChange('time', e.target.value)}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="location">Location</Label>
        <Input
          id="location"
          value={formData.location}
          onChange={(e) => handleInputChange('location', e.target.value)}
          placeholder="Enter event location"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="type">Event Type</Label>
          <Select value={formData.type} onValueChange={(value) => handleInputChange('type', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="company">Company Event</SelectItem>
              <SelectItem value="holiday">Holiday</SelectItem>
              <SelectItem value="birthday">Birthday</SelectItem>
              <SelectItem value="anniversary">Anniversary</SelectItem>
              <SelectItem value="meeting">Meeting</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="attendees">Expected Attendees</Label>
          <Input
            id="attendees"
            type="number"
            value={formData.attendees}
            onChange={(e) => handleInputChange('attendees', e.target.value)}
            placeholder="Number of attendees"
          />
        </div>
      </div>

      <div className="flex gap-2 pt-4">
        <Button 
          onClick={isEdit ? handleUpdateEvent : handleCreateEvent}
          disabled={creating || updating}
          className="flex-1"
        >
          {(creating || updating) ? 'Saving...' : (isEdit ? 'Update Event' : 'Create Event')}
        </Button>
        <Button 
          variant="outline" 
          onClick={() => {
            if (isEdit) {
              setIsEditDialogOpen(false);
              setEditingEvent(null);
            } else {
              setIsCreateDialogOpen(false);
            }
            resetForm();
          }}
        >
          Cancel
        </Button>
      </div>
    </div>
  );

  if (loading) return <LoadingState message="Loading calendar..." />;
  if (error) return <ErrorMessage message="Failed to load calendar events" onRetry={refetch} />;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <MobileHeader userName="Admin" />
      
      <div className="px-4 pt-2 pb-24">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center">
            <button onClick={() => navigate('/calendar')} className="mr-4">
              <ArrowLeft className="w-6 h-6 text-gray-600" />
            </button>
            <h1 className="text-xl font-semibold text-gray-800">Admin Calendar</h1>
          </div>
          
          {/* Create Event Button */}
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-purple-600 hover:bg-purple-700">
                <Plus className="w-4 h-4 mr-1" />
                Event
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create New Event</DialogTitle>
              </DialogHeader>
              <EventForm />
            </DialogContent>
          </Dialog>
        </div>

        {/* Calendar Navigation */}
        <Card className="mb-4">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <button onClick={goToPreviousMonth}>
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </button>
              
              <div className="text-center">
                <h2 className="text-lg font-semibold">
                  {format(currentDate, 'MMMM yyyy')}
                </h2>
                <button 
                  onClick={goToToday}
                  className="text-sm text-purple-600 hover:text-purple-700"
                >
                  Today
                </button>
              </div>
              
              <button onClick={goToNextMonth}>
                <ChevronRight className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </CardHeader>
          
          <CardContent>
            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-center text-xs font-medium text-gray-500 py-2">
                  {day}
                </div>
              ))}
            </div>
            
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map(day => {
                const dayEvents = getEventsForDate(day);
                const isCurrentMonth = isSameMonth(day, currentDate);
                const isSelected = selectedDate && isSameDay(day, selectedDate);
                const isTodayDate = isToday(day);
                
                return (
                  <div
                    key={day.toISOString()}
                    onClick={() => handleDateClick(day)}
                    className={`
                      min-h-[40px] p-1 cursor-pointer border rounded-lg transition-colors
                      ${isCurrentMonth ? 'bg-white hover:bg-gray-50' : 'bg-gray-100 text-gray-400'}
                      ${isSelected ? 'ring-2 ring-purple-500' : ''}
                      ${isTodayDate ? 'bg-purple-100 text-purple-700 font-semibold' : ''}
                    `}
                  >
                    <div className="text-xs text-center mb-1">
                      {format(day, 'd')}
                    </div>
                    {dayEvents.length > 0 && (
                      <div className="space-y-1">
                        {dayEvents.slice(0, 2).map((event: Event) => (
                          <div
                            key={event.id}
                            className="w-2 h-2 rounded-full bg-purple-500 mx-auto"
                          />
                        ))}
                        {dayEvents.length > 2 && (
                          <div className="text-xs text-center text-gray-500">
                            +{dayEvents.length - 2}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Selected Date Events */}
        {selectedDate && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Events for {format(selectedDate, 'EEEE, MMMM d, yyyy')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {getEventsForDate(selectedDate).length === 0 ? (
                <p className="text-gray-500 text-center py-4">No events scheduled for this date</p>
              ) : (
                <div className="space-y-3">
                  {getEventsForDate(selectedDate).map((event: Event) => (
                    <div key={event.id} className="border rounded-lg p-3">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">{event.title}</h3>
                          {event.description && (
                            <p className="text-sm text-gray-600 mt-1">{event.description}</p>
                          )}
                        </div>
                        <div className="flex gap-1 ml-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEditEvent(event)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteEvent(event.id)}
                            disabled={deleting}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-2 text-sm text-gray-600">
                        <Badge variant="secondary" className={getEventTypeColor(event.type)}>
                          {event.type}
                        </Badge>
                        {event.time && (
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {event.time}
                          </div>
                        )}
                        {event.location && (
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {event.location}
                          </div>
                        )}
                        {event.attendees && (
                          <div className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {event.attendees} attendees
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Edit Event Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Event</DialogTitle>
            </DialogHeader>
            <EventForm isEdit />
          </DialogContent>
        </Dialog>
      </div>
      
      <BottomNavbar />
    </div>
  );
};

export default AdminCalendar;
