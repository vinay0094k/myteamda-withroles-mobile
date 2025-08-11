
import React from 'react';
import { format } from 'date-fns';
import { Download, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { TimesheetEntry } from '@/lib/api';

interface AdminTimesheetTableProps {
  timesheets: TimesheetEntry[];
  onViewDetails: (timesheetId: string) => void;
  onDownloadEntry: (timesheetId: string) => void;
}

const AdminTimesheetTable: React.FC<AdminTimesheetTableProps> = ({
  timesheets,
  onViewDetails,
  onDownloadEntry,
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'submitted': return 'bg-blue-100 text-blue-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Employee</TableHead>
            <TableHead>Project</TableHead>
            <TableHead>Task</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Time</TableHead>
            <TableHead>Duration</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {timesheets.map((entry) => (
            <TableRow key={entry.id}>
              <TableCell>
                <div>
                  <div className="font-medium">
                    {entry.user?.first_name || 'N/A'} {entry.user?.last_name || ''}
                  </div>
                  <div className="text-sm text-gray-500">
                    {entry.user?.employee_id || 'N/A'}
                  </div>
                </div>
              </TableCell>
              <TableCell>{entry.project?.name || 'N/A'}</TableCell>
              <TableCell className="max-w-xs truncate">
                {entry.task_description}
              </TableCell>
              <TableCell>
                {format(new Date(entry.entry_date), 'MMM dd, yyyy')}
              </TableCell>
              <TableCell>
                {entry.start_time && entry.end_time ? (
                  <div className="text-sm">
                    {format(new Date(entry.start_time), 'HH:mm')} - {format(new Date(entry.end_time), 'HH:mm')}
                  </div>
                ) : (
                  <span className="text-gray-400">--</span>
                )}
              </TableCell>
              <TableCell>
                {entry.duration_hours ? `${entry.duration_hours}h` : '--'}
              </TableCell>
              <TableCell>
                <Badge className={getStatusColor(entry.status)}>
                  {entry.status}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onViewDetails(entry.id)}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDownloadEntry(entry.id)}
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default AdminTimesheetTable;
