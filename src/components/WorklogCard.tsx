
import React from 'react';
import { Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface WorklogCardProps {
  totalHours?: number;
}

const WorklogCard = ({ totalHours }: WorklogCardProps) => {
  const navigate = useNavigate();
  return (
    <div 
      onClick={() => navigate('/timesheet')}
      className="cursor-pointer bg-gradient-to-br from-purple-100 to-purple-200 rounded-2xl p-4 sm:p-6 mb-4 hover:shadow-lg transition-all duration-200 hover:scale-105"
    >
      <div className="flex items-center mb-2 sm:mb-3">
        <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600 mr-2" />
        <span className="text-purple-700 font-medium text-sm sm:text-base">Current Week Worklog</span>
      </div>
      <div className="mb-2 sm:mb-3">
        <span className="text-2xl sm:text-3xl font-bold text-purple-600">{totalHours.toFixed(1)}</span>
        <span className="text-lg sm:text-xl text-purple-600 ml-1">/ 40</span>
      </div>
      {/* <p className="text-purple-700 text-sm sm:text-base">0.0% - Low</p> */}
      <p className="text-purple-700 text-sm sm:text-base">
        {((totalHours / 40) * 100).toFixed(1)}% - {totalHours < 20 ? 'Low' : totalHours < 35 ? 'Medium' : 'High'}
      </p>
    </div>
  );
};

export default WorklogCard;
{/* <div className="bg-gradient-to-br from-purple-100 to-purple-200 rounded-2xl p-6 mb-4"> */}
// className="cursor-pointer bg-gradient-to-br from-purple-100 to-purple-200 rounded-2xl p-4 mb-2 transition-transform duration-200 hover:scale-[1.02]"