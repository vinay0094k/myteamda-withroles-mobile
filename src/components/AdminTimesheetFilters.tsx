import React from 'react';
import { Calendar, Download, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface AdminTimesheetFiltersProps {
  selectedEmployeeId?: string;
  startDate: string;
  endDate: string;
  status: string;
  onEmployeeChange: (employeeId: string) => void;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  onStatusChange: (status: string) => void;
  onDownloadAll: () => void;
  onApplyFilters: () => void;
  employees: Array<{
    id: string;
    first_name: string;
    last_name: string;
    employee_id: string;
  }>;
}

const AdminTimesheetFilters: React.FC<AdminTimesheetFiltersProps> = ({
  selectedEmployeeId,
  startDate,
  endDate,
  status,
  onEmployeeChange,
  onStartDateChange,
  onEndDateChange,
  onStatusChange,
  onDownloadAll,
  onApplyFilters,
  employees,
}) => {
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Filter className="w-5 h-5" />
          Filters
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <Label htmlFor="employee">Employee</Label>
            <Select value={selectedEmployeeId || ''} onValueChange={onEmployeeChange}>
              <SelectTrigger>
                <SelectValue placeholder="All employees" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All employees</SelectItem>
                {employees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.first_name} {emp.last_name} ({emp.employee_id})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="startDate">Start Date</Label>
            <Input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => onStartDateChange(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="endDate">End Date</Label>
            <Input
              id="endDate"
              type="date"
              value={endDate}
              onChange={(e) => onEndDateChange(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="status">Status</Label>
            <Select value={status} onValueChange={onStatusChange}>
              <SelectTrigger>
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="submitted">Submitted</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-between mt-4">
          <Button onClick={onApplyFilters} className="flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Apply Filters
          </Button>
          <Button onClick={onDownloadAll} variant="outline" className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            Download All
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminTimesheetFilters;