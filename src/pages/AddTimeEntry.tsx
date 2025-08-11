// src/pages/AddTimeEntry.tsx
import React, { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { ArrowLeft } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useApi, useApiMutation } from '@/hooks/useApi';
import { apiClient } from '@/lib/api';
import { LoadingState } from '@/components/ui/loading-spinner';
import { ErrorMessage } from '@/components/ui/error-message';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import MobileHeader from '@/components/MobileHeader';
import BottomNavbar from '@/components/BottomNavbar';
import TimeRangePicker from '@/components/TimeRangePicker';

const AddTimeEntry = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const editId = searchParams.get('edit');
  const isEditing = !!editId;
  const weekStartParam = searchParams.get('weekStart');

  // const getUTCTimeString = (iso?: string, fallback = '00:00') => {
  //   if (!iso) return fallback;
  const getTimeString = (timeValue?: string, fallback = '00:00') => {
    if (!timeValue) return fallback;
    // const d = parseISO(iso);
    // const pad = (n: number) => n.toString().padStart(2, '0');
    // return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
    try {
      // const d = parseISO(iso);

      // If it's already in HH:MM format, return as is
      if (/^\d{2}:\d{2}$/.test(timeValue)) {
        return timeValue;
      }
      
      // Try to parse as ISO string and extract local time
      const d = parseISO(timeValue);


      if (isNaN(d.getTime())) return fallback;
      const pad = (n: number) => n.toString().padStart(2, '0');
      // return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
       // Use local time instead of UTC
      return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
    } catch (error) {
      // console.error('Error parsing time:', iso, error);
      console.error('Error parsing time:', timeValue, error);
      return fallback;
    }
  };

  const { data: projectsData, loading: loadingProjects, error: projectsError } = useApi(
    () => apiClient.getProjects()
  );

  const { data: existingEntry, loading: loadingEntry } = useApi(
    () => editId ? apiClient.getTimesheets({ limit: 50 }) : Promise.resolve(null),
    [editId]
  );

  const { mutate, loading, error: apiError, clearError } = useApiMutation();
  // Local state to control generic error message display
  const [displayErrorMessage, setDisplayErrorMessage] = useState<string | null>(null);


  interface FormData {
    project: string;
    taskDescription: string;
    date: string;
    startTime: string;
    endTime: string;
    duration: string;
    addBreakTime: boolean;
  }

  // const [formData, setFormData] = useState<FormData>({
  //   project: '',
  //   taskDescription: '',
  //   date: format(new Date(), 'yyyy-MM-dd'),
  //   startTime: '09:00',
  //   endTime: '17:00',
  //   duration: '1.0',
  //   addBreakTime: false
  // });

  const [formData, setFormData] = useState<FormData>(() => {
    const dateParam = searchParams.get('date');
    const initialDate = dateParam ?? format(new Date(), 'yyyy-MM-dd');
    console.log('[TimeEntry] Initial date from URL (or today):', initialDate);

    return {
      project: '',
      taskDescription: '',
      date: initialDate,
      startTime: '09:00',
      endTime: '17:00',
      duration: '1.0',
      addBreakTime: false
    };
  });


  const {
    data: dailySummaryData,
    loading: dailySummaryLoading,
    refetch: refetchDailySummary
  } = useApi(
    () => apiClient.getTimesheetSummary(formData.date, formData.date),
    [formData.date]
  );

  interface Project {
    id: string;
    name: string;
  }

  interface TimesheetEntry {
    id: string;
    project_id: string;
    task_description: string;
    entry_date: string;
    start_time: string;
    end_time: string;
    duration_hours: number;
    break_time_minutes?: number;
  }

  interface TimesheetsResponse {
    timesheets: TimesheetEntry[];
  }

  interface TimesheetSummary {
    summary?: {
      total_hours: number;
    };
  }

  // const originalEntry: TimesheetEntry | undefined = isEditing
  //   ? (existingEntry as TimesheetsResponse | null)?.timesheets.find((e: TimesheetEntry) => e.id === editId)
  //   : undefined;
  const originalEntry: TimesheetEntry | undefined = isEditing && existingEntry && typeof existingEntry === 'object' && 'timesheets' in existingEntry
    ? (existingEntry as TimesheetsResponse).timesheets.find((e: TimesheetEntry) => e.id === editId)
    : undefined;

  const totalLogged = dailySummaryData?.summary?.total_hours || 0;
  const originalDur = originalEntry?.duration_hours || 0;
  const usedHours = totalLogged - originalDur;
  const remainingRaw = Math.max(8 - usedHours, 0);
  const remainingHours = Math.round(remainingRaw * 10) / 10;
  const remainingMax = remainingHours.toFixed(1);

  const projects = projectsData || [];

  React.useEffect(() => {
    // if (isEditing && existingEntry?.timesheets && editId) {
    //   const entry = existingEntry.timesheets.find(e => e.id === editId);
     if (isEditing && existingEntry && typeof existingEntry === 'object' && 'timesheets' in existingEntry && editId) {
      const entry = (existingEntry as TimesheetsResponse).timesheets.find(e => e.id === editId);
      if (!entry) return;

      // const entryDate = format(new Date(entry.entry_date + 'T00:00:00'), 'yyyy-MM-dd');
      // setFormData({
      //   project: entry.project_id,
      //   taskDescription: entry.task_description,
      //   date: entryDate,
      //   startTime: getUTCTimeString(entry.start_time, '09:00'),
      //   endTime: getUTCTimeString(entry.end_time, '17:00'),
      //   duration: entry.duration_hours.toString(),
      //   addBreakTime: (entry.break_time_minutes || 0) > 0,
      // });
      try {
        // Safely format the entry date
        let entryDate: string;
        try {
          entryDate = format(new Date(entry.entry_date), 'yyyy-MM-dd');
        } catch (dateError) {
          console.error('Error parsing entry date:', entry.entry_date, dateError);
          entryDate = format(new Date(), 'yyyy-MM-dd'); // fallback to today
        }

        setFormData({
          project: entry.project_id,
          taskDescription: entry.task_description,
          date: entryDate,
          startTime: getTimeString(entry.start_time, '09:00'),
          endTime: getTimeString(entry.end_time, '17:00'),
          duration: entry.duration_hours.toString(),
          addBreakTime: (entry.break_time_minutes || 0) > 0,
        });
      } catch (error) {
        console.error('Error setting form data from existing entry:', error);
        // Keep default form data if there's an error
      }
    }
  }, [existingEntry, editId, isEditing]);

  const handleInputChange = (field: string, value: string | boolean | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  React.useEffect(() => {
    if (formData.startTime && formData.endTime) {
      const start = new Date(`2000-01-01T${formData.startTime}:00`);
      const end = new Date(`2000-01-01T${formData.endTime}:00`);
      const diffMs = end.getTime() - start.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);

      if (diffHours > 0) {
        setFormData(prev => ({ ...prev, duration: (Math.round(diffHours * 10) / 10).toString() }));
      }
    }
  }, [formData.startTime, formData.endTime]);


  const handleSave = async () => {
    if (!formData.project || !formData.taskDescription || !formData.date) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    if (isEditing) {
      console.log("[TimeEntry] Updating entry:", {
        id: editId,
        date: formData.date,
        start: formData.startTime,
        end: formData.endTime,
        duration: formData.duration,
      });
    } else {
      console.log("[TimeEntry] Creating new entry:", {
        date: formData.date,
        project: formData.project,
        start: formData.startTime,
        end: formData.endTime,
        duration: formData.duration,
      });
    }

    // Clear previous error messages before attempting API call
    setDisplayErrorMessage(null);

    const timesheetData = {
      project_id: formData.project,
      task_description: formData.taskDescription,
      entry_date: formData.date,
      start_time: formData.startTime,
      end_time: formData.endTime,
      duration_hours: parseFloat(formData.duration),
      break_time_minutes: formData.addBreakTime ? 30 : 0,
    };
    
    try {
      const result = await (isEditing
        ? mutate((data) => apiClient.updateTimesheet(editId!, data), timesheetData)
        : mutate((data) => apiClient.createTimesheet(data), timesheetData)
      );

      if (isEditing) {
        console.log("[TimeEntry] Update successful:", result);
      } else {
        console.log("[TimeEntry] Creation successful:", result);
      }

      toast({
        title: isEditing ? "Entry Updated" : "Entry Created",
        description: `Time entry has been ${isEditing ? 'updated' : 'saved'} successfully.`,
        className: "border-green-300",
        duration: 5000,   //5 seconds
      });

      navigate('/timesheet', { state: { refresh: true, entryDate: formData.date, weekStart: weekStartParam } });
      
    } catch (err: any) {
      // clearError(); // Clear the API mutation's internal error stat

      // const errorMessage = err?.message || 'An unexpected error occurred.';
      // if (errorMessage.toLowerCase().includes("overlaps")) {
      //   toast({
      //     title: "Time Overlap",
      //     description: errorMessage,
      //     className: "bg-white text-red-500 border-red-300",
      //     duration: 5000,
      //   });
      // } else {
      //   // For other errors, show both toast and set displayErrorMessage for persistent error display
      //   setDisplayErrorMessage(errorMessage);
      //   toast({
      //     title: "Save Failed",
      //     description: errorMessage,
      //     variant: "destructive",
      //   });
      // }

      clearError(); 
      // Log: The raw error object log
      console.log('[TimeEntry] API error object:', err);
      // 1) Extract the error message from the backend api response
      const rawMsg = err.response?.data?.message 
        ?? err.message 
        ?? 'An unexpected error occurred.';

      
      // 2) If its 8-hour limit error, show a specific toast
      if ( rawMsg.includes("Cannot exceed 8 hours per day")) {
        const limitExceedMessage = rawMsg
          .replace(/^(?:.*?API[^:]*:\s*)*/i, '')
          .trim();

        console.log('[TimeEntry] Detected daily-limit-exceeded error');
        toast ({
          title: "Daily Limit Exceeded",
          description: limitExceedMessage,
          className: "bg-white text-red-500 border-red-300",
          duration: 5000,   //5 seconds
        });
        return; //skip the generic error UI message
      }
      // 3) Checking the existing overlap error message
      if (rawMsg.toLowerCase().includes("time entry")) {
        const timeOverlapsMessage = rawMsg
          .replace(/^(?:.*?API[^:]*:\s*)*/i, '')
          .replace(/this\s*.*?\s*\(/i, 'this (')
          .trim();
        
        console.log('[TimeEntry] Detected time-overlap error');
        toast({
          title: "Time Overlaps",
          description: timeOverlapsMessage,
          className: "bg-white text-red-500 border-red-300",
          duration: 5000,   //5 seconds
        });
        return;

      } else {
        console.log('[TimeEntry] Detected general error, falling back');
        // 4) Fallback for any other errors
        setDisplayErrorMessage(rawMsg);
        toast({
          title: "Save Failed",
          description: rawMsg,
          variant: "destructive",
          duration: 5000,   //5 seconds
        });
      }
    }
  };

  if (loadingProjects || (isEditing && loadingEntry)) {
    return <LoadingState message="Loading time entry..." />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <MobileHeader userName="John Doe" />

      <div className="px-4 pt-4 pb-24">
        <div className="flex items-center mb-6">
          <button onClick={() => navigate('/timesheet')} className="mr-4">
            <ArrowLeft className="w-6 h-6 text-gray-600" />
          </button>
          <h1 className="text-xl font-semibold text-gray-800">
            {isEditing ? 'Edit Time Entry' : 'Add Time Entry'}
          </h1>
        </div>

        {(displayErrorMessage || projectsError) && (
          <ErrorMessage
            message={displayErrorMessage || projectsError || 'An error occurred'}
            className="mb-4"
          />
        )}

        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="project" className="text-sm font-medium text-gray-700">
              Project
            </Label>
            <Select value={formData.project} onValueChange={(value) => handleInputChange('project', value)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select Project" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="taskDescription" className="text-sm font-medium text-gray-700">
              Task Description
            </Label>
            <Textarea
              id="taskDescription"
              placeholder="Enter task description"
              value={formData.taskDescription}
              onChange={(e) => handleInputChange('taskDescription', e.target.value)}
              className="min-h-[80px] resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="date" className="text-sm font-medium text-gray-700">
              Date
            </Label>
            <div className="relative">
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => handleInputChange('date', e.target.value)}
                className="pr-10"
              />
            </div>
          </div>

          <TimeRangePicker
            startTime={formData.startTime}
            endTime={formData.endTime}
            onChange={({ startTime, endTime }) => {
              handleInputChange('startTime', startTime);
              handleInputChange('endTime', endTime);
            }}
          />

          <div className="space-y-2">
            <Label htmlFor="duration" className="text-sm font-medium text-gray-700">
              Duration (hours)
            </Label>
            <Input
              id="duration"
              type="number"
              step="0.1"
              min="0"
              max={remainingMax}
              value={formData.duration}
              onChange={(e) => {
                const v = parseFloat(e.target.value) || 0;
                handleInputChange('duration', Math.min(v, remainingHours));
              }}
              placeholder="0.0"
            />
            <p className="text-xs text-gray-500">
              {dailySummaryLoading ? (
                'Checking daily usage…'
              ) : (
                <>You can still log up to <span className="font-bold">{remainingMax}</span> hrs.</>
              )}
            </p>
          </div>

          <div className="flex items-center justify-between py-2">
            <Label htmlFor="addBreakTime" className="text-sm font-medium text-gray-700">
              Add Break Time
            </Label>
            <Switch
              id="addBreakTime"
              checked={formData.addBreakTime}
              onCheckedChange={(checked) => handleInputChange('addBreakTime', checked)}
            />
          </div>

          <Button
            onClick={handleSave}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-lg mt-8"
            disabled={loading}
          >
            {loading ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                {isEditing ? 'Updating...' : 'Saving...'}
              </>
            ) : (
              isEditing ? 'Update Entry' : 'Save Entry'
            )}
          </Button>
        </div>
      </div>

      <BottomNavbar />
    </div>
  );
};

export default AddTimeEntry;