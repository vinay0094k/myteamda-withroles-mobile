import React from 'react';
import { Calendar, User, Clock, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LeaveApplication } from '@/types/leave';

interface AdminLeaveApplicationCardProps {
  leave: LeaveApplication;
  onApprove?: (leaveId: string) => void;
  onReject?: (leaveId: string) => void;
  onViewDetails?: (leaveId: string) => void;
  showActions?: boolean;
}

const AdminLeaveApplicationCard: React.FC<AdminLeaveApplicationCardProps> = ({
  leave,
  onApprove,
  onReject,
  onViewDetails,
  showActions = true
}) => {
  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Approved</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Pending</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Rejected</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">{status}</Badge>;
    }
  };

  const calculateDays = () => {
    if (leave.is_half_day) return 0.5;
    const start = new Date(leave.start_date);
    const end = new Date(leave.end_date);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  return (
    <Card className="hover:shadow-md transition-shadow duration-200">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">
                {leave.user ? `${leave.user.first_name} ${leave.user.last_name}` : 'Unknown User'}
              </h3>
              <p className="text-sm text-gray-500">
                {leave.user?.employee_id || 'N/A'} • {leave.user?.position || 'N/A'}
              </p>
            </div>
          </div>
          {getStatusBadge(leave.status)}
        </div>

        <div className="space-y-3 mb-4">
          {/* Date Range - Using the new formatted field */}
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-900">
              {leave.date_range}
            </span>
            <span className="text-sm text-gray-500">
              ({calculateDays()} {calculateDays() === 1 ? 'day' : 'days'})
            </span>
          </div>

          {/* Leave Type */}
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-700">
              {leave.leave_type?.name || 'Unknown Type'}
            </span>
          </div>

          {/* Applied Date */}
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-500">
              Applied on {new Date(leave.created_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              })}
            </span>
          </div>

          {/* Reason */}
          {leave.reason && (
            <div className="mt-3 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-700">
                <span className="font-medium">Reason:</span> {leave.reason}
              </p>
            </div>
          )}

          {/* Description */}
          {leave.description && (
            <div className="mt-2 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-700">
                <span className="font-medium">Description:</span> {leave.description}
              </p>
            </div>
          )}

          {/* Approval Info */}
          {leave.status === 'approved' && leave.approver && leave.approved_at && (
            <div className="mt-3 p-3 bg-green-50 rounded-lg">
              <p className="text-sm text-green-700">
                <span className="font-medium">Approved by:</span> {leave.approver.first_name} {leave.approver.last_name}
              </p>
              <p className="text-sm text-green-600">
                on {new Date(leave.approved_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </p>
            </div>
          )}

          {/* Rejection Info */}
          {leave.status === 'rejected' && leave.rejection_reason && (
            <div className="mt-3 p-3 bg-red-50 rounded-lg">
              <p className="text-sm text-red-700">
                <span className="font-medium">Rejection Reason:</span> {leave.rejection_reason}
              </p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        {showActions && leave.status === 'pending' && (
          <div className="flex gap-2 pt-4 border-t">
            <Button
              onClick={() => onApprove?.(leave.id)}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              size="sm"
            >
              Approve
            </Button>
            <Button
              onClick={() => onReject?.(leave.id)}
              variant="outline"
              className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
              size="sm"
            >
              Reject
            </Button>
          </div>
        )}

        {/* View Details Button */}
        {onViewDetails && (
          <div className="pt-4 border-t">
            <Button
              onClick={() => onViewDetails(leave.id)}
              variant="outline"
              className="w-full"
              size="sm"
            >
              View Details
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminLeaveApplicationCard;
