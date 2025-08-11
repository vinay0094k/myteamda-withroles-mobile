
import React from 'react';
import { Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';


const PendingLeavesCard = () => {
  const navigate = useNavigate();
  return (
    <div
      onClick={() => navigate('/leaves', { state: {activeTab: 'history' } } )}
      className="cursor-pointer bg-gradient-to-br from-green-100 to-green-200 rounded-2xl p-4 sm:p-6 mb-4 hover:shadow-lg transition-all duration-200 hover:scale-105"
    >
      <div className="flex items-center mb-2 sm:mb-3">
        <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-green-600 mr-2" />
        <span className="text-green-700 font-medium text-sm sm:text-base">Pending Leaves</span>
      </div>
      <div className="mb-2 sm:mb-3">
        <span className="text-3xl sm:text-4xl font-bold text-green-600">2</span>
      </div>
      <p className="text-green-700 text-sm sm:text-base">+2 from last month</p>
    </div>
  );
};

export default PendingLeavesCard;

// <div className="bg-gradient-to-br from-green-100 to-green-200 rounded-2xl p-6 mb-4">
// className="cursor-pointer bg-gradient-to-br from-green-100 to-green-200 rounded-2xl p-6 mb-4 transition-transform duration-200 hover:scale-105"
