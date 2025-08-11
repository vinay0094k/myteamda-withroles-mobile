// import React, { useMemo } from 'react';
// import { useSearchParams, useNavigate } from 'react-router-dom';
// import { format, parseISO, isValid } from 'date-fns';
// import { useApi } from '@/hooks/useApi';
// import { apiClient, TimesheetEntry } from '@/lib/api';
// import { ErrorMessage } from '@/components/ui/error-message';
// import { LoadingState } from '@/components/ui/loading-spinner';
// import { Button } from '@/components/ui/button';
// import MobileHeader from '@/components/MobileHeader';
// import BottomNavbar from '@/components/BottomNavbar';
// import { useAuth } from '@/contexts/AuthContext';

// // Import xlsx and file-saver
// import * as XLSX from 'xlsx';
// import { saveAs } from 'file-saver';

// // Define the structure for a single row within a day's entries
// type TimesheetRow = {
//   id: string; // Unique ID for key prop
//   hoursSpent: number; // Corresponds to Duration (hours)
//   comments: string; // Corresponds to Task
//   startTime: string; // HH:MM
//   endTime: string; // HH:MM
// };

// // Define the structure for grouped entries by date
// type GroupedDay = {
//   date: Date;
//   dayHours: number; // Total hours for the day
//   activity: string; // Project Name (simplified: first project of the day)
//   hasBlocker: boolean; // Simplified: true if any entry has a blocker (placeholder)
//   entries: TimesheetRow[]; // Individual timesheet entries for this day
// };

// // Helper function to safely parse dates
// function parseDate(value: string | null | undefined): Date | null {
//   if (!value) return null;
//   const d = parseISO(value);
//   return isValid(d) ? d : null;
// }

// // Helper function to format date as dd-mm-yyyy
// function fmtDate_ddmmyyyy(d: Date) {
//   return format(d, 'dd-MM-yyyy');
// }

// // Helper function to format month in uppercase
// function fmtMonthUpper(d: Date) {
//   return format(d, 'LLLL').toUpperCase();
// }

// // Helper function to format time as HH:MM
// function prettyTime(isoOrHHmm?: string | null): string {
//   if (!isoOrHHmm) return '';
//   // If it's already in "HH:MM" format, return as is
//   if (/^\d{2}:\d{2}$/.test(isoOrHHmm)) return isoOrHHmm;
//   const parsed = parseISO(isoOrHHmm);
//   if (!isValid(parsed)) return '';
//   return format(parsed, 'HH:mm');
// }

// const EmployeeTimesheetReport: React.FC = () => {
//   const [params] = useSearchParams();
//   const navigate = useNavigate();
//   const { user: currentUser } = useAuth();

//   // Extract parameters from the URL
//   const userId = params.get('userId') ?? undefined;
//   const start = parseDate(params.get('start'));
//   const end = parseDate(params.get('end'));

//   // Fetch timesheet entries from the API
//   const { data, loading, error, refetch } = useApi(() =>
//     apiClient.getTimesheets({
//       start_date: start ? format(start, 'yyyy-MM-dd') : undefined,
//       end_date: end ? format(end, 'yyyy-MM-dd') : undefined,
//       limit: 500, // Fetch a reasonable number of entries
//       user_id: userId,
//     }),
//     [userId, start?.toISOString(), end?.toISOString()] // Dependencies for refetching
//   );

//   const timeEntries: TimesheetEntry[] = data?.timesheets ?? [];

//   // Determine the employee's name for the report header
//   const employeeName = useMemo(() => {
//     // Try to get the name from the first entry's preloaded user data
//     const first = timeEntries[0] as any;
//     const apiUser = first?.user;
//     if (apiUser?.first_name || apiUser?.last_name) {
//       return `${apiUser.first_name ?? ''} ${apiUser.last_name ?? ''}`.trim();
//     }
//     // Fallback to the current authenticated user's name
//     const appName = `${currentUser?.first_name ?? ''} ${currentUser?.last_name ?? ''}`.trim();
//     return appName || 'Employee'; // Default if no name found
//   }, [timeEntries, currentUser]);

//   // Transform raw timesheet entries into the grouped format for the report
//   const groupedDays: GroupedDay[] = useMemo(() => {
//     const map = new Map<string, GroupedDay>();

//     // Sort timeEntries by entry_date and then by start_time to ensure consistent ordering
//     const sortedTimeEntries = [...timeEntries].sort((a, b) => {
//       const dateA = new Date(a.entry_date).getTime();
//       const dateB = new Date(b.entry_date).getTime();
//       if (dateA !== dateB) return dateA - dateB;

//       // If dates are same, sort by start_time
//       const timeA = a.start_time ? parseISO(a.start_time).getTime() : 0;
//       const timeB = b.start_time ? parseISO(b.start_time).getTime() : 0;
//       return timeA - timeB;
//     });


//     for (const e of sortedTimeEntries) {
//       const d = new Date(e.entry_date);
//       const key = format(d, 'yyyy-MM-dd');

//       const row: TimesheetRow = {
//         id: e.id, // Use actual ID for key
//         hoursSpent: e.duration_hours ?? 0,
//         comments: e.task_description ?? '',
//         startTime: prettyTime(e.start_time),
//         endTime: prettyTime(e.end_time),
//       };

//       if (!map.has(key)) {
//         map.set(key, {
//           date: new Date(d.getFullYear(), d.getMonth(), d.getDate()),
//           dayHours: row.hoursSpent,
//           activity: e.project?.name ?? 'General', // Take first project name as activity for the day
//           hasBlocker: false, // Placeholder: assuming no blocker for now
//           entries: [row],
//         });
//       } else {
//         const rec = map.get(key)!;
//         rec.entries.push(row);
//         rec.dayHours += row.hoursSpent;
//         // If multiple projects on a day, 'activity' will just be the first one encountered.
//         // If 'hasBlocker' is per-entry, this logic needs to be adjusted to aggregate (e.g., any blocker = true)
//         // For now, keeping it simple as per the image's implied structure.
//       }
//     }

//     // Convert map values to an array and sort by date (already sorted by sorting timeEntries initially)
//     return Array.from(map.values()).sort((a, b) => a.date.getTime() - b.date.getTime());
//   }, [timeEntries]); // Dependency on timeEntries

//   // Calculate total hours for the entire period
//   const totalWeekHours = useMemo(
//     () => groupedDays.reduce((sum, g) => sum + g.dayHours, 0),
//     [groupedDays]
//   );

//   // Determine the month label for the header
//   const monthLabel = useMemo(() => {
//     const src = start ?? groupedDays[0]?.date ?? new Date();
//     return fmtMonthUpper(src);
//   }, [start, groupedDays]);

//   // Determine the time period text for the header
//   const periodText = useMemo(() => {
//     const from = start ?? groupedDays[0]?.date;
//     const to = end ?? groupedDays[groupedDays.length - 1]?.date ?? from;
//     if (!from) return '';
//     return `${fmtDate_ddmmyyyy(from)} to ${fmtDate_ddmmyyyy(to ?? from)}`;
//   }, [start, end, groupedDays]);

//   // Handle Export to Excel
//   const handleExport = () => {
//     const ws_data: any[][] = [];
//     const merges: XLSX.Range[] = [];
//     let currentRow = 0;

//     // Row 1: Month (e.g., MAY)
//     ws_data.push([monthLabel]);
//     merges.push({ s: { r: currentRow, c: 0 }, e: { r: currentRow, c: 7 } }); // Merge A1:H1
//     currentRow++;

//     // Row 2: Name
//     ws_data.push(['Name:', employeeName]);
//     merges.push({ s: { r: currentRow, c: 0 }, e: { r: currentRow, c: 1 } }); // Merge A2:B2
//     merges.push({ s: { r: currentRow, c: 1 }, e: { r: currentRow, c: 7 } }); // Merge B2:H2 (employee name)
//     currentRow++;

//     // Row 3: Time Period
//     ws_data.push(['Time Period(mm-dd-yyyy):', periodText]);
//     merges.push({ s: { r: currentRow, c: 0 }, e: { r: currentRow, c: 1 } }); // Merge A3:B3
//     merges.push({ s: { r: currentRow, c: 1 }, e: { r: currentRow, c: 7 } }); // Merge B3:H3 (time period)
//     currentRow++;

//     // Row 4: Number of Hrs in the week
//     ws_data.push(['Number of Hrs in the week:', totalWeekHours.toFixed(2)]);
//     merges.push({ s: { r: currentRow, c: 0 }, e: { r: currentRow, c: 1 } }); // Merge A4:B4
//     merges.push({ s: { r: currentRow, c: 1 }, e: { r: currentRow, c: 7 } }); // Merge B4:H4 (total hours)
//     currentRow++;

//     // Row 5: Empty row for spacing (optional, based on image)
//     ws_data.push([]);
//     currentRow++;

//     // Row 6: Main Headers
//     ws_data.push([
//       'Date\n(dd-mm-yyyy)',
//       'Day Hours',
//       'Hours Spent',
//       'Activity',
//       'Comments\n(If any)',
//       'Start Time',
//       'End Time',
//       'Has Blocker',
//     ]);
//     currentRow++;

//     // Data Rows
//     groupedDays.forEach((dayGroup) => {
//       dayGroup.entries.forEach((entry, entryIndex) => {
//         const rowData: any[] = [];
//         if (entryIndex === 0) {
//           // First entry for the day, include merged cells
//           rowData.push(
//             fmtDate_ddmmyyyy(dayGroup.date), // Date
//             dayGroup.dayHours.toFixed(2), // Day Hours
//             entry.hoursSpent.toFixed(2), // Hours Spent
//             dayGroup.activity, // Activity
//             entry.comments, // Comments
//             entry.startTime, // Start Time
//             entry.endTime, // End Time
//             dayGroup.hasBlocker ? 'Yes' : 'No' // Has Blocker
//           );

//           // Add merges for this day group
//           if (dayGroup.entries.length > 1) {
//             merges.push({ s: { r: currentRow, c: 0 }, e: { r: currentRow + dayGroup.entries.length - 1, c: 0 } }); // Date
//             merges.push({ s: { r: currentRow, c: 1 }, e: { r: currentRow + dayGroup.entries.length - 1, c: 1 } }); // Day Hours
//             merges.push({ s: { r: currentRow, c: 3 }, e: { r: currentRow + dayGroup.entries.length - 1, c: 3 } }); // Activity
//             merges.push({ s: { r: currentRow, c: 7 }, e: { r: currentRow + dayGroup.entries.length - 1, c: 7 } }); // Has Blocker
//           }
//         } else {
//           // Subsequent entries for the day, leave merged cells blank
//           rowData.push(
//             '', // Date (merged)
//             '', // Day Hours (merged)
//             entry.hoursSpent.toFixed(2), // Hours Spent
//             '', // Activity (merged)
//             entry.comments, // Comments
//             entry.startTime, // Start Time
//             entry.endTime, // End Time
//             '' // Has Blocker (merged)
//           );
//         }
//         ws_data.push(rowData);
//         currentRow++;
//       });
//     });

//     // Create worksheet
//     const ws = XLSX.utils.aoa_to_sheet(ws_data);

//     // Apply merges
//     ws['!merges'] = merges;

//     // Set column widths (optional, but improves readability)
//     ws['!cols'] = [
//       { wch: 12 }, // Date
//       { wch: 10 }, // Day Hours
//       { wch: 12 }, // Hours Spent
//       { wch: 15 }, // Activity
//       { wch: 40 }, // Comments
//       { wch: 10 }, // Start Time
//       { wch: 10 }, // End Time
//       { wch: 12 }, // Has Blocker
//     ];

//     // Create workbook and add the worksheet
//     const wb = XLSX.utils.book_new();
//     XLSX.utils.book_append_sheet(wb, ws, 'Timesheet Report');

//     // Generate filename
//     const filename = `${employeeName.replace(/\s/g, '_')}_${format(start!, 'yyyy-MM-dd')}_to_${format(end!, 'yyyy-MM-dd')}.xlsx`;

//     // Save the file
//     XLSX.writeFile(wb, filename);
//   };

//   // Render loading, error, or the report content
//   if (!userId || !start || !end) {
//     return (
//       <div className="min-h-screen bg-gray-50">
//         <MobileHeader userName="Report" />
//         <div className="p-4">
//           <ErrorMessage message="Missing query parameters. Please provide userId, start, and end dates in the URL (e.g., ?userId=<id>&start=YYYY-MM-DD&end=YYYY-MM-DD)." />
//           <div className="mt-4">
//             <Button variant="outline" onClick={() => navigate(-1)}>Go Back</Button>
//           </div>
//         </div>
//         <BottomNavbar />
//       </div>
//     );
//   }

//   return (
//     <div className="min-h-screen bg-gray-50">
//       <MobileHeader userName="Timesheet Report" />
//       <div className="px-4 pt-4 pb-24">
//         <div className="flex items-center justify-between mb-4">
//           <div>
//             <h1 className="text-xl font-semibold text-gray-800">Weekly Timesheet</h1>
//             <p className="text-sm text-gray-600">
//               {employeeName} • {periodText} • Total: {totalWeekHours.toFixed(2)} hrs
//             </p>
//           </div>
//           <Button onClick={handleExport}>Export XLSX</Button>
//         </div>

//         {loading && <LoadingState message="Loading timesheet data..." />}
//         {error && (
//           <ErrorMessage
//             message="Failed to load timesheet data. Please try again."
//             onRetry={refetch}
//           />
//         )}

//         {!loading && !error && (
//           <div className="overflow-x-auto p-2"> {/* Added p-2 for spacing */}
//             <table className="min-w-full border-collapse border border-gray-300">
//               <thead>
//                 {/* Top-level Report Headers */}
//                 <tr className="bg-yellow-100">
//                   <th colSpan={8} className="p-2 text-left font-bold border border-gray-300">
//                     {monthLabel}
//                   </th>
//                 </tr>
//                 <tr>
//                   <th colSpan={2} className="p-2 text-left font-bold border border-gray-300">Name:</th>
//                   <th colSpan={6} className="p-2 text-left border border-gray-300">{employeeName}</th>
//                 </tr>
//                 <tr>
//                   <th colSpan={2} className="p-2 text-left font-bold border border-gray-300">Time Period(mm-dd-yyyy):</th>
//                   <th colSpan={6} className="p-2 text-left border border-gray-300">{periodText}</th>
//                 </tr>
//                 <tr>
//                   <th colSpan={2} className="p-2 text-left font-bold border border-gray-300">Number of Hrs in the week:</th>
//                   <th colSpan={6} className="p-2 text-left border border-gray-300">{totalWeekHours.toFixed(2)}</th>
//                 </tr>
//                 {/* Main Table Headers */}
//                 <tr className="bg-gray-100">
//                   <th className="p-2 font-bold border border-gray-300 text-center">Date<br/>(dd-mm-yyyy)</th>
//                   <th className="p-2 font-bold border border-gray-300 text-center">Day Hours</th>
//                   <th className="p-2 font-bold border border-gray-300 text-center">Hours Spent</th>
//                   <th className="p-2 font-bold border border-gray-300 text-center">Activity</th>
//                   <th className="p-2 font-bold border border-gray-300 text-center">Comments<br/>(If any)</th>
//                   <th className="p-2 font-bold border border-gray-300 text-center">Start Time</th>
//                   <th className="p-2 font-bold border border-gray-300 text-center">End Time</th>
//                   <th className="p-2 font-bold border border-gray-300 text-center">Has Blocker</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {groupedDays.length === 0 ? (
//                   <tr>
//                     <td colSpan={8} className="p-4 text-center text-gray-500 border border-gray-300">
//                       No timesheet entries found for this period.
//                     </td>
//                   </tr>
//                 ) : (
//                   groupedDays.map((dayGroup, dayIndex) => (
//                     dayGroup.entries.map((entry, entryIndex) => (
//                       <tr key={`${dayGroup.date.toISOString()}-${entry.id}`} className="hover:bg-gray-50">
//                         {/* Date column - merged */}
//                         {entryIndex === 0 && (
//                           <td rowSpan={dayGroup.entries.length} className="p-2 text-center align-top border border-gray-300">
//                             {fmtDate_ddmmyyyy(dayGroup.date)}
//                           </td>
//                         )}
//                         {/* Day Hours column - merged */}
//                         {entryIndex === 0 && (
//                           <td rowSpan={dayGroup.entries.length} className="p-2 text-center align-top border border-gray-300">
//                             {dayGroup.dayHours.toFixed(2)}
//                           </td>
//                         )}
//                         {/* Hours Spent (per entry) */}
//                         <td className="p-2 text-center border border-gray-300">
//                           {entry.hoursSpent.toFixed(2)}
//                         </td>
//                         {/* Activity column - merged */}
//                         {entryIndex === 0 && (
//                           <td rowSpan={dayGroup.entries.length} className="p-2 text-center align-top border border-gray-300">
//                             {dayGroup.activity}
//                           </td>
//                         )}
//                         {/* Comments (per entry) */}
//                         <td className="p-2 text-left border border-gray-300">
//                           {entry.comments}
//                         </td>
//                         {/* Start Time (per entry) */}
//                         <td className="p-2 text-center border border-gray-300">
//                           {entry.startTime}
//                         </td>
//                         {/* End Time (per entry) */}
//                         <td className="p-2 text-center border border-gray-300">
//                           {entry.endTime}
//                         </td>
//                         {/* Has Blocker column - merged */}
//                         {entryIndex === 0 && (
//                           <td rowSpan={dayGroup.entries.length} className="p-2 text-center align-top border border-gray-300">
//                             {dayGroup.hasBlocker ? 'Yes' : 'No'} {/* Or leave blank if 'No' */}
//                           </td>
//                         )}
//                       </tr>
//                     ))
//                   ))
//                 )}
//               </tbody>
//             </table>
//           </div>
//         )}
//       </div>
//       <BottomNavbar />
//     </div>
//   );
// };

// export default EmployeeTimesheetReport;

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

import React, { useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { format, parseISO, isValid } from 'date-fns';
import { useApi } from '@/hooks/useApi';
import { apiClient, TimesheetEntry } from '@/lib/api';
import { ErrorMessage } from '@/components/ui/error-message';
import { LoadingState } from '@/components/ui/loading-spinner';
import { Button } from '@/components/ui/button';
import MobileHeader from '@/components/MobileHeader';
import BottomNavbar from '@/components/BottomNavbar';
import { useAuth } from '@/contexts/AuthContext';
import { exportTimesheetToExcel } from '@/utils/timesheetExcelExport';

import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

// Define the structure for a single row within a day's entries
type TimesheetRow = {
  id: string; // Unique ID for key prop
  hoursSpent: number; // Corresponds to Duration (hours)
  comments: string; // Corresponds to Task
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  project?: { name: string }; // Include project info for concatenation
};

// GroupedDay structure remains the same, it holds entries for a day
type GroupedDay = {
  date: Date;
  dayHours: number;
  hasBlocker: boolean;
  entries: TimesheetRow[]; // This will contain all individual entries for the day
};

// Helper function to safely parse dates
function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = parseISO(value);
  return isValid(d) ? d : null;
}

// Helper function to format date as dd-mm-yyyy
function fmtDate_ddmmyyyy(d: Date) {
  return format(d, 'dd-MM-yyyy');
}

// Helper function to format month in uppercase
function fmtMonthUpper(d: Date) {
  return format(d, 'LLLL').toUpperCase();
}

// Helper function to format time as HH:MM
function prettyTime(isoOrHHmm?: string | null): string {
  if (!isoOrHHmm) return '';
  // If it's already in "HH:MM" format, return as is
  if (/^\d{2}:\d{2}$/.test(isoOrHHmm)) return isoOrHHmm;
  const parsed = parseISO(isoOrHHmm);
  if (!isValid(parsed)) return '';
  return format(parsed, 'HH:mm');
}

const EmployeeTimesheetReport: React.FC = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  // Extract parameters from the URL
  const userId = params.get('userId') ?? undefined;
  const start = parseDate(params.get('start'));
  const end = parseDate(params.get('end'));

  // Fetch timesheet entries from the API
  const { data, loading, error, refetch } = useApi(() =>
    apiClient.getTimesheets({
      start_date: start ? format(start, 'yyyy-MM-dd') : undefined,
      end_date: end ? format(end, 'yyyy-MM-dd') : undefined,
      limit: 500, // Fetch a reasonable number of entries
      user_id: userId,
    }),
    [userId, start?.toISOString(), end?.toISOString()] // Dependencies for refetching
  );

  const timeEntries: TimesheetEntry[] = data?.timesheets ?? [];

  // Determine the employee's name for the report header
  const employeeName = useMemo(() => {
    // Try to get the name from the first entry's preloaded user data
    const first = timeEntries[0] as any;
    const apiUser = first?.user;
    if (apiUser?.first_name || apiUser?.last_name) {
      return `${apiUser.first_name ?? ''} ${apiUser.last_name ?? ''}`.trim();
    }
    // Fallback to the current authenticated user's name
    const appName = `${currentUser?.first_name ?? ''} ${currentUser?.last_name ?? ''}`.trim();
    return appName || 'Employee'; // Default if no name found
  }, [timeEntries, currentUser]);

  // Transform raw timesheet entries into the grouped format for the report
  const groupedDays: GroupedDay[] = useMemo(() => {
    const map = new Map<string, GroupedDay>();

    // Sort timeEntries by entry_date and then by start_time to ensure consistent ordering
    const sortedTimeEntries = [...timeEntries].sort((a, b) => {
      const dateA = new Date(a.entry_date).getTime();
      const dateB = new Date(b.entry_date).getTime();
      if (dateA !== dateB) return dateA - dateB;

      const timeA = a.start_time ? parseISO(a.start_time).getTime() : 0;
      const timeB = b.start_time ? parseISO(b.start_time).getTime() : 0;
      return timeA - timeB;
    });

    for (const e of sortedTimeEntries) {
      const d = new Date(e.entry_date);
      const key = format(d, 'yyyy-MM-dd');

      const row: TimesheetRow = {
        id: e.id,
        hoursSpent: e.duration_hours ?? 0,
        comments: e.task_description ?? '',
        startTime: prettyTime(e.start_time),
        endTime: prettyTime(e.end_time),
        project: e.project, // Include project here
      };

      if (!map.has(key)) {
        map.set(key, {
          date: new Date(d.getFullYear(), d.getMonth(), d.getDate()),
          dayHours: row.hoursSpent,
          hasBlocker: false, // Placeholder: assuming no blocker for now
          entries: [row],
        });
      } else {
        const rec = map.get(key)!;
        rec.entries.push(row);
        rec.dayHours += row.hoursSpent;
      }
    }

    // Convert map values to an array and sort by date
    return Array.from(map.values()).sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [timeEntries]); // Dependency on timeEntries

  // Calculate total hours for the entire period
  const totalWeekHours = useMemo(
    () => groupedDays.reduce((sum, g) => sum + g.dayHours, 0),
    [groupedDays]
  );

  // Determine the month label for the header
  const monthLabel = useMemo(() => {
    const src = start ?? groupedDays[0]?.date ?? new Date();
    return fmtMonthUpper(src);
  }, [start, groupedDays]);

  // Determine the time period text for the header
  const periodText = useMemo(() => {
    const from = start ?? groupedDays[0]?.date;
    const to = end ?? groupedDays[groupedDays.length - 1]?.date ?? from;
    if (!from) return '';
    return `${fmtDate_ddmmyyyy(from)} to ${fmtDate_ddmmyyyy(to ?? from)}`;
  }, [start, end, groupedDays]);

  // Handle Export to Excel
  const handleExport = () => {
    // Try to get employee ID from the first timesheet entry
    let empId = '';
    if (timeEntries.length > 0) {
      const firstEntry = timeEntries[0] as any;
      if (firstEntry.user?.employee_id) {
        empId = firstEntry.user.employee_id;
      }
    }
    
    exportTimesheetToExcel(timeEntries, employeeName, start, end, empId);
  };

  // Render loading, error, or the report content
  if (!userId || !start || !end) {
    return (
      <div className="min-h-screen bg-gray-50">
        <MobileHeader userName="Report" />
        <div className="p-4">
          <ErrorMessage message="Missing query parameters. Please provide userId, start, and end dates in the URL (e.g., ?userId=<id>&start=YYYY-MM-DD&end=YYYY-MM-DD)." />
          <div className="mt-4">
            <Button variant="outline" onClick={() => navigate(-1)}>Go Back</Button>
          </div>
        </div>
        <BottomNavbar />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <MobileHeader userName="Timesheet Report" />
      <div className="px-4 pt-4 pb-24">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-800">Weekly Timesheet</h1>
            <p className="text-sm text-gray-600">
              {employeeName} • {periodText} • Total: {totalWeekHours.toFixed(2)} hrs
            </p>
          </div>
          <Button onClick={handleExport}>Export XLSX</Button>
        </div>

        {loading && <LoadingState message="Loading timesheet data..." />}
        {error && (
          <ErrorMessage
            message="Failed to load timesheet data. Please try again."
            onRetry={refetch}
          />
        )}

        {!loading && !error && (
          <div className="overflow-x-auto p-2">
            <table className="min-w-full border-collapse border-2 border-foreground">
              <thead>
                {/* Top-level Report Headers */}
                <tr className="bg-yellow-100">
                  <th colSpan={8} className="p-2 text-left font-bold border-2 border-foreground">
                    {monthLabel}
                  </th>
                </tr>
                <tr>
                  <th colSpan={2} className="p-2 text-left font-bold border-2 border-foreground">Name:</th>
                  <th colSpan={6} className="p-2 text-left border-2 border-foreground">{employeeName}</th>
                </tr>
                <tr>
                  <th colSpan={2} className="p-2 text-left font-bold border-2 border-foreground">Time Period(mm-dd-yyyy):</th>
                  <th colSpan={6} className="p-2 text-left border-2 border-foreground">{periodText}</th>
                </tr>
                <tr>
                  <th colSpan={2} className="p-2 text-left font-bold border-2 border-foreground">Number of Hrs in the week:</th>
                  <th colSpan={6} className="p-2 text-left border-2 border-foreground">{totalWeekHours.toFixed(2)}</th>
                </tr>
                {/* Main Table Headers */}
                <tr className="bg-gray-100">
                  <th className="p-2 font-bold border-2 border-foreground text-center">Date<br/>(dd-mm-yyyy)</th>
                  <th className="p-2 font-bold border-2 border-foreground text-center">Day Hours</th>
                  <th className="p-2 font-bold border-2 border-foreground text-center">Hours Spent</th>
                  <th className="p-2 font-bold border-2 border-foreground text-center">Activity</th>
                  <th className="p-2 font-bold border-2 border-foreground text-center">Comments<br/>(If any)</th>
                  <th className="p-2 font-bold border-2 border-foreground text-center">Start Time</th>
                  <th className="p-2 font-bold border-2 border-foreground text-center">End Time</th>
                  <th className="p-2 font-bold border-2 border-foreground text-center">Has Blocker</th>
                </tr>
              </thead>
              <tbody>
                {groupedDays.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-4 text-center text-gray-500 border-2 border-foreground">
                      No timesheet entries found for this period.
                    </td>
                  </tr>
                ) : (
                  groupedDays.map((dayGroup, dayIndex) => (
                    <tr key={dayGroup.date.toISOString()} className="hover:bg-gray-50">
                      <td className="p-2 text-center align-top border-2 border-foreground">
                        {fmtDate_ddmmyyyy(dayGroup.date)}
                      </td>
                      <td className="p-2 text-center align-top border-2 border-foreground">
                        {dayGroup.dayHours.toFixed(2)}
                      </td>
                      <td className="p-2 text-center border-2 border-foreground">
                        {dayGroup.dayHours.toFixed(2)}
                      </td>
                      <td className="p-2 text-left border-2 border-foreground">
                        {dayGroup.entries.map(entry => 
                          `${entry.project?.name ?? 'Project'} - ${entry.comments} (${entry.startTime}-${entry.endTime})`
                        ).join(' | ')}
                      </td>
                      <td className="p-2 text-left border-2 border-foreground">
                        {/* This column is empty as per the image */}
                      </td>
                      <td className="p-2 text-center border-2 border-foreground">
                        {/* This column is empty as per the image */}
                      </td>
                      <td className="p-2 text-center border-2 border-foreground">
                        {/* This column is empty as per the image */}
                      </td>
                      <td className="p-2 text-center align-top border-2 border-foreground">
                        {dayGroup.hasBlocker ? 'Yes' : 'No'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <BottomNavbar />
    </div>
  );
};

export default EmployeeTimesheetReport;

