import * as XLSX from 'xlsx';
import { format, parseISO, isValid } from 'date-fns';
import { TimesheetEntry } from '@/lib/api';

// Define the structure for a single row within a day's entries
type TimesheetRow = {
  id: string;
  hoursSpent: number;
  comments: string;
  startTime: string;
  endTime: string;
  project?: { name: string };
};

// GroupedDay structure
type GroupedDay = {
  date: Date;
  dayHours: number;
  hasBlocker: boolean;
  entries: TimesheetRow[];
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
  if (/^\d{2}:\d{2}$/.test(isoOrHHmm)) return isoOrHHmm;
  const parsed = parseISO(isoOrHHmm);
  if (!isValid(parsed)) return '';
  return format(parsed, 'HH:mm');
}

// Main export function that matches EmployeeTimesheetReport logic
export function exportTimesheetToExcel(
  timeEntries: TimesheetEntry[],
  employeeName: string,
  startDate: Date | null,
  endDate: Date | null,
  employeeId?: string // Optional employee ID for filename
) {
  // Transform raw timesheet entries into the grouped format for the report
  const groupedDays: GroupedDay[] = (() => {
    const map = new Map<string, GroupedDay>();

    // Sort timeEntries by entry_date and then by start_time
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
        project: e.project,
      };

      if (!map.has(key)) {
        map.set(key, {
          date: new Date(d.getFullYear(), d.getMonth(), d.getDate()),
          dayHours: row.hoursSpent,
          hasBlocker: false,
          entries: [row],
        });
      } else {
        const rec = map.get(key)!;
        rec.entries.push(row);
        rec.dayHours += row.hoursSpent;
      }
    }

    return Array.from(map.values()).sort((a, b) => a.date.getTime() - b.date.getTime());
  })();

  // Calculate total hours for the entire period
  const totalWeekHours = groupedDays.reduce((sum, g) => sum + g.dayHours, 0);

  // Determine the month label for the header
  const monthLabel = (() => {
    const src = startDate ?? groupedDays[0]?.date ?? new Date();
    return fmtMonthUpper(src);
  })();

  // Determine the time period text for the header
  const periodText = (() => {
    const from = startDate ?? groupedDays[0]?.date;
    const to = endDate ?? groupedDays[groupedDays.length - 1]?.date ?? from;
    if (!from) return '';
    return `${fmtDate_ddmmyyyy(from)} to ${fmtDate_ddmmyyyy(to ?? from)}`;
  })();

  // Create Excel data
  const ws_data: any[][] = [];
  const merges: XLSX.Range[] = [];
  let currentRow = 0;

  // Row 1: Month (e.g., AUGUST)
  ws_data.push([monthLabel]);
  merges.push({ s: { r: currentRow, c: 0 }, e: { r: currentRow, c: 7 } });
  currentRow++;

  // Row 2: Name
  ws_data.push(['Name:', employeeName]);
  merges.push({ s: { r: currentRow, c: 0 }, e: { r: currentRow, c: 1 } });
  merges.push({ s: { r: currentRow, c: 1 }, e: { r: currentRow, c: 7 } });
  currentRow++;

  // Row 3: Time Period
  ws_data.push(['Time Period(mm-dd-yyyy):', periodText]);
  merges.push({ s: { r: currentRow, c: 0 }, e: { r: currentRow, c: 1 } });
  merges.push({ s: { r: currentRow, c: 1 }, e: { r: currentRow, c: 7 } });
  currentRow++;

  // Row 4: Number of Hrs in the week
  ws_data.push(['Number of Hrs in the week:', totalWeekHours.toFixed(2)]);
  merges.push({ s: { r: currentRow, c: 0 }, e: { r: currentRow, c: 1 } });
  merges.push({ s: { r: currentRow, c: 1 }, e: { r: currentRow, c: 7 } });
  currentRow++;

  // Row 5: Empty row for spacing
  ws_data.push([]);
  currentRow++;

  // Row 6: Main Headers
  ws_data.push([
    'Date\n(dd-mm-yyyy)',
    'Day Hours',
    'Hours Spent',
    'Activity',
    'Comments\n(If any)',
    'Start Time',
    'End Time',
    'Has Blocker',
  ]);
  currentRow++;

  // Data Rows (one row per dayGroup)
  groupedDays.forEach((dayGroup) => {
    const activityString = dayGroup.entries.map(entry => {
      return `${entry.project?.name ?? 'Project'} - ${entry.comments} (${entry.startTime}-${entry.endTime})`;
    }).join(' | ');

    const rowData: any[] = [
      fmtDate_ddmmyyyy(dayGroup.date),
      dayGroup.dayHours.toFixed(2),
      dayGroup.dayHours.toFixed(2),
      activityString,
      '',
      '',
      '',
      dayGroup.hasBlocker ? 'Yes' : 'No',
    ];
    ws_data.push(rowData);
    currentRow++;
  });

  // Create worksheet
  const ws = XLSX.utils.aoa_to_sheet(ws_data);

  // Apply merges for header section
  ws['!merges'] = merges;

  // Apply wrapText style to the 'Activity' column (column index 3)
  for (let i = 5; i < ws_data.length; i++) {
    const cellAddress = XLSX.utils.encode_cell({ r: i, c: 3 });
    if (ws[cellAddress]) {
      ws[cellAddress].s = { alignment: { wrapText: true } };
    }
  }

  // Set column widths
  ws['!cols'] = [
    { wch: 12 }, // Date
    { wch: 10 }, // Day Hours
    { wch: 12 }, // Hours Spent
    { wch: 45 }, // Activity (increased width for combined text)
    { wch: 15 }, // Comments (If any)
    { wch: 10 }, // Start Time
    { wch: 10 }, // End Time
    { wch: 12 }, // Has Blocker
  ];

  // Create workbook and add the worksheet
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Timesheet Report');

  // Generate filename with proper format
  let filename = 'timesheet_export.xlsx';
  
  console.log('=== Excel Export Debug Info ===');
  console.log('Employee Name:', employeeName);
  console.log('Employee ID (passed):', employeeId);
  console.log('Start Date:', startDate);
  console.log('End Date:', endDate);
  console.log('Time Entries Count:', timeEntries.length);
  
  if (startDate && endDate) {
    // Try to get employee ID from the first timesheet entry
    let empId = employeeId;
    if (!empId && timeEntries.length > 0) {
      const firstEntry = timeEntries[0] as any;
      console.log('First Entry User Data:', firstEntry.user);
      if (firstEntry.user?.employee_id) {
        empId = firstEntry.user.employee_id;
        console.log('Employee ID from timesheet data:', empId);
      }
    }
    
    if (empId) {
      // Format: <employee_id>_timesheet_from_<startdate>To<enddate>.xlsx
      filename = `${empId}_timesheet_from_${format(startDate, 'yyyy-MM-dd')}To${format(endDate, 'yyyy-MM-dd')}.xlsx`;
      console.log('Generated filename with Employee ID:', filename);
    } else {
      // Fallback: use employee name
      const cleanName = employeeName.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
      filename = `${cleanName}_timesheet_from_${format(startDate, 'yyyy-MM-dd')}To${format(endDate, 'yyyy-MM-dd')}.xlsx`;
      console.log('Generated filename with Employee Name (fallback):', filename);
    }
  } else {
    console.log('Using default filename (no date range):', filename);
  }
  
  console.log('Final filename that will be downloaded:', filename);
  console.log('=== End Excel Export Debug Info ===');

  // Save the file
  XLSX.writeFile(wb, filename);
}
