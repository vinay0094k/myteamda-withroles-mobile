
import React from 'react';
import { useApi, useApiMutation } from '@/hooks/useApi';
import { apiClient, User } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { LoadingState } from '@/components/ui/loading-spinner';
import { useToast } from '@/hooks/use-toast';
import { UserCheck, UserX, Clock, Mail, Phone, Calendar } from 'lucide-react';

const UserApprovalManagement: React.FC = () => {
  const { toast } = useToast();
  const { data: pendingUsers, loading, refetch } = useApi(() => apiClient.getPendingUsers());
  const { mutate: approveUser, loading: approvingUser } = useApiMutation();
  const { mutate: rejectUser, loading: rejectingUser } = useApiMutation();

  const [selectedRole, setSelectedRole] = React.useState<string>('');
  const [rejectionReason, setRejectionReason] = React.useState('');
  const [selectedUser, setSelectedUser] = React.useState<User | null>(null);

  const handleApproveUser = async (userId: string) => {
    if (!selectedRole) {
      toast({
        title: "Error",
        description: "Please select a role before approving the user",
        variant: "destructive",
      });
      return;
    }

    try {
      await approveUser(
        (params: { userId: string; role: string }) => apiClient.approveUser(params.userId, params.role),
        { userId, role: selectedRole }
      );
      
      toast({
        title: "Success",
        description: "User approved successfully",
      });
      
      setSelectedRole('');
      refetch();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to approve user",
        variant: "destructive",
      });
    }
  };

  const handleRejectUser = async (userId: string) => {
    if (!rejectionReason.trim()) {
      toast({
        title: "Error",
        description: "Please provide a reason for rejection",
        variant: "destructive",
      });
      return;
    }

    try {
      await rejectUser(
        (params: { userId: string; reason: string }) => apiClient.rejectUser(params.userId, params.reason),
        { userId, reason: rejectionReason }
      );
      
      toast({
        title: "Success",
        description: "User rejected successfully",
      });
      
      setRejectionReason('');
      setSelectedUser(null);
      refetch();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reject user",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <LoadingState message="Loading pending users..." />;
  }

  if (!pendingUsers || pendingUsers.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            User Approval Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No pending user registrations found.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Pending User Registrations ({pendingUsers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {pendingUsers.map((user) => (
              <Card key={user.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-lg">
                        {user.first_name} {user.last_name}
                      </h3>
                      <Badge variant="outline" className="text-orange-600 border-orange-200">
                        <Clock className="h-3 w-3 mr-1" />
                        Pending
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        {user.email}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Employee ID:</span>
                        {user.employee_id}
                      </div>
                      {user.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4" />
                          {user.phone}
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Registered: {new Date(user.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 ml-4">
                    <div className="flex items-center gap-2">
                      <Select
                        value={selectedRole}
                        onValueChange={setSelectedRole}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="employee">Employee</SelectItem>
                          <SelectItem value="team-lead">Team Lead</SelectItem>
                          <SelectItem value="manager">Manager</SelectItem>
                          <SelectItem value="hr">HR</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      <Button
                        onClick={() => handleApproveUser(user.id)}
                        disabled={approvingUser || !selectedRole}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <UserCheck className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                    </div>
                    
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="destructive"
                          onClick={() => setSelectedUser(user)}
                        >
                          <UserX className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Reject User Registration</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <p className="text-sm text-muted-foreground">
                            Are you sure you want to reject the registration for {selectedUser?.first_name} {selectedUser?.last_name}?
                          </p>
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Reason for rejection:</label>
                            <Textarea
                              placeholder="Please provide a reason for rejection..."
                              value={rejectionReason}
                              onChange={(e) => setRejectionReason(e.target.value)}
                              rows={3}
                            />
                          </div>
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              onClick={() => {
                                setSelectedUser(null);
                                setRejectionReason('');
                              }}
                            >
                              Cancel
                            </Button>
                            <Button
                              variant="destructive"
                              onClick={() => selectedUser && handleRejectUser(selectedUser.id)}
                              disabled={rejectingUser || !rejectionReason.trim()}
                            >
                              {rejectingUser ? 'Rejecting...' : 'Reject User'}
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserApprovalManagement;
