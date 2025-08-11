
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from '@/hooks/use-toast';
import { useApiMutation } from '@/hooks/useApi';
import { apiClient, User } from '@/lib/api';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Edit } from 'lucide-react';

interface EditProfileDialogProps {
  user: User;
  field: 'personal' | 'contact' | 'job';
  onProfileUpdate: () => void;
}

const EditProfileDialog: React.FC<EditProfileDialogProps> = ({ user, field, onProfileUpdate }) => {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const { mutate, loading } = useApiMutation<User>();

  const [formData, setFormData] = useState({
    first_name: user.first_name || '',
    last_name: user.last_name || '',
    phone: user.phone || '',
    department: user.department || '',
    position: user.position || '',
    profile_image_url: user.profile_image_url || '',
  });

  const handleInputChange = (key: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSave = async () => {
    try {
      await mutate(apiClient.updateProfile, formData);
      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
      onProfileUpdate();
      setOpen(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
    }
  };

  const renderFields = () => {
    switch (field) {
      case 'personal':
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="first_name">First Name</Label>
              <Input
                id="first_name"
                value={formData.first_name}
                onChange={(e) => handleInputChange('first_name', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Last Name</Label>
              <Input
                id="last_name"
                value={formData.last_name}
                onChange={(e) => handleInputChange('last_name', e.target.value)}
              />
            </div>
          </>
        );
      case 'contact':
        return (
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
            />
          </div>
        );
      case 'job':
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Input
                id="department"
                value={formData.department}
                onChange={(e) => handleInputChange('department', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="position">Position</Label>
              <Input
                id="position"
                value={formData.position}
                onChange={(e) => handleInputChange('position', e.target.value)}
              />
            </div>
          </>
        );
      default:
        return null;
    }
  };

  const getTitle = () => {
    switch (field) {
      case 'personal':
        return 'Edit Personal Information';
      case 'contact':
        return 'Edit Contact Information';
      case 'job':
        return 'Edit Job Information';
      default:
        return 'Edit Profile';
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Edit className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{getTitle()}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {renderFields()}
        </div>
        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? (
              <>
                <LoadingSpinner size="sm" />
                <span className="ml-2">Saving...</span>
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditProfileDialog;
