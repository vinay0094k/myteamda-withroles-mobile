
import React, { useState } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useApiMutation } from '@/hooks/useApi';
import { apiClient, LeaveType } from '@/lib/api';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

interface ApplyLeaveFormProps {
  leaveTypes: LeaveType[];
  onSuccess?: () => void;
}

const ApplyLeaveForm: React.FC<ApplyLeaveFormProps> = ({ leaveTypes, onSuccess }) => {
  const [formData, setFormData] = useState({
    leaveType: '',
    startDate: '',
    endDate: '',
    reason: '',
    description: '',
    halfDay: false,
    supervisor: '',
    subject: ''
  });
  const { toast } = useToast();
  const { mutate, loading, error } = useApiMutation();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.leaveType || !formData.startDate || !formData.endDate) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    mutate(
      (data) => apiClient.createLeave(data),
      {
        leave_type_id: formData.leaveType,
        start_date: formData.startDate,
        end_date: formData.endDate,
        is_half_day: formData.halfDay,
        reason: formData.reason,
        description: formData.description,
      }
    ).then((result) => {
      if (result) {
        toast({
          title: "Leave Application Submitted",
          description: "Your leave application has been submitted successfully.",
        });
        // Reset form
        setFormData({
          leaveType: '',
          startDate: '',
          endDate: '',
          reason: '',
          description: '',
          halfDay: false,
          supervisor: '',
          subject: ''
        });
        onSuccess?.();
      }
    });
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm">
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <Label htmlFor="leaveType" className="text-sm font-medium text-gray-700">Type of Leave</Label>
          <Select value={formData.leaveType} onValueChange={(value) => setFormData({...formData, leaveType: value})}>
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Select leave type" />
            </SelectTrigger>
            <SelectContent>
              {leaveTypes.map((type) => (
                <SelectItem key={type.id} value={type.id}>
                  {type.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="startDate" className="text-sm font-medium text-gray-700">Start Date</Label>
            <div className="mt-1 relative">
              <Input
                type="date"
                id="startDate"
                value={formData.startDate}
                onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                className="pr-10"
                required
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="endDate" className="text-sm font-medium text-gray-700">End Date</Label>
            <div className="mt-1 relative">
              <Input
                type="date"
                id="endDate"
                value={formData.endDate}
                onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                className="pr-10"
                required
              />
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="halfDay"
            checked={formData.halfDay}
            onCheckedChange={(checked) =>
              setFormData({ ...formData, halfDay: checked as boolean })
            }
          />
          <Label htmlFor="halfDay" className="text-sm text-gray-700">Half Day Leave</Label>
        </div>

        <div>
          <Label htmlFor="reason" className="text-sm font-medium text-gray-700">Reason</Label>
          <Input
            id="reason"
            placeholder="Enter reason for leave"
            value={formData.reason}
            onChange={(e) => setFormData({...formData, reason: e.target.value})}
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="description" className="text-sm font-medium text-gray-700">Description</Label>
          <Textarea
            id="description"
            placeholder="Enter additional details..."
            value={formData.description}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
            className="mt-1 min-h-[100px]"
          />
        </div>

        <Button 
          type="submit" 
          className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-xl font-semibold"
          disabled={loading}
        >
          {loading ? (
            <>
              <LoadingSpinner size="sm" className="mr-2" />
              Submitting...
            </>
          ) : (
            'Apply Leave'
          )}
        </Button>
      </form>
    </div>
  );
};

export default ApplyLeaveForm;
