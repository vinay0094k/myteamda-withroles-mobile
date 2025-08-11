
import React from 'react';
import { Clock, Wallet, Receipt, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';


const QuickActions = () => {
  const navigate = useNavigate();
  const quickActions = [
    { icon: Clock, label: 'Clock In', color: 'bg-purple-100 text-purple-600',  path: '/coming-soon' },
    { icon: Wallet, label: 'WFH', color: 'bg-green-100 text-green-600',  path: '/coming-soon' },
    { icon: FileText, label: 'Policies', color: 'bg-pink-100 text-pink-600', path: '/whiz/policies' },
    { icon: Receipt, label: 'Payslips', color: 'bg-purple-100 text-purple-600',  path: '/manage-files' },
  ];

  return (
    <div className="px-4 sm:px-6 pb-6">
      <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4 sm:mb-6">Quick Actions</h3>
      <div className="grid grid-cols-4 sm:grid-cols-4 gap-4 sm:gap-6">
        {quickActions.map((action, idx) => (
          <div 
            key={idx} 
            onClick={() => {
              if (action.label === 'Payslips') {
                navigate(action.path, { state: { activeFilter: 'payslips' } });
              } else if (action.path) {
                navigate(action.path);
              }
            }}
            className={`flex flex-col items-center ${action.path ? 'cursor-pointer hover:opacity-90 hover:scale-105 transition-all duration-200' : ''}`}
          >
            <div
              className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl ${action.color} flex items-center justify-center mb-2 sm:mb-3`}
            >
              <action.icon className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>
            <span className="text-xs sm:text-sm text-gray-600 text-center font-medium">
              {action.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default QuickActions;