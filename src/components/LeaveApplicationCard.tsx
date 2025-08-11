
import React from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';


const LeaveApplicationCard = () => {
  const navigate = useNavigate();
  return (
    <div 
      onClick={() => navigate('/leaves')}
      className="cursor-pointer bg-white rounded-2xl p-4 sm:p-6 shadow-sm border mb-4 sm:mb-6 hover:shadow-md transition-all duration-200"
    >
      <div className="flex items-center justify-between mb-2 sm:mb-3">
        <div className="flex items-center">
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-100 rounded-full flex items-center justify-center mr-3">
            <Plus className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
          </div>
          <span className="font-semibold text-gray-800 text-base sm:text-lg">Apply Leave</span>
        </div>
        <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gray-100 rounded flex items-center justify-center">
          <span className="text-xs sm:text-sm text-gray-500">≡</span>
        </div>
      </div>
      <p className="text-gray-600 text-sm sm:text-base mb-4 sm:mb-6">Manage your leave applications.</p>
      <Button className="w-full bg-green-500 hover:bg-green-600 text-white rounded-xl h-12 sm:h-14 font-semibold text-base sm:text-lg">
        Apply Now
      </Button>
    </div>
  );
};

export default LeaveApplicationCard;

// <div className="bg-white rounded-2xl p-6 shadow-sm border mb-4">
