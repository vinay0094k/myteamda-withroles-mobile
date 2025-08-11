import React from 'react';
import { Bell, Menu, User, Settings, LogOut, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useRole } from '@/contexts/RoleContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface MobileHeaderProps {
  userName: string;
}

const MobileHeader = ({ userName }: MobileHeaderProps) => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { hasRole } = useRole();

  const handleViewProfile = () => {
    console.log('View Profile clicked');
    navigate('/profile');
  };

  const handleSettings = () => {
    navigate('/settings');
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="bg-white shadow-sm p-4 sm:p-6 flex items-center justify-between sticky top-0 z-50">
      <div className="flex items-center space-x-3">
        <img 
          src="/teamDa_icon.png" 
          alt="teamDa" 
          className="w-10 h-10 sm:w-12 sm:h-12 object-contain"
        />
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-purple-600">teamDa</h1>
        </div>
      </div>
      <div className="flex items-center space-x-3 sm:space-x-4">
        <Bell className="w-6 h-6 sm:w-7 sm:h-7 text-gray-600 cursor-pointer hover:text-purple-600 transition-colors" />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-300 rounded-full flex items-center justify-center cursor-pointer hover:bg-gray-400 transition-colors">
              <User className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 sm:w-56">
            <DropdownMenuItem onClick={handleViewProfile} className="flex items-center space-x-2">
              <User className="w-4 h-4" />
              <span>View Profile</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleSettings} className="flex items-center space-x-2">
              <Settings className="w-4 h-4" />
              <span>Settings</span>
            </DropdownMenuItem>
            {hasRole(['admin', 'hr', 'manager']) && (
              <DropdownMenuItem onClick={() => navigate('/admin/timesheets')} className="flex items-center space-x-2">
                <Clock className="w-4 h-4" />
                <span>View All Timesheets</span>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="flex items-center space-x-2 text-red-600">
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

export default MobileHeader;
