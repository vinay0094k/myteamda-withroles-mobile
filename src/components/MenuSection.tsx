
import React from 'react';
import { Calendar, FileText, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom'

const MenuSection = () => {
  const navigate = useNavigate(); 
  const menuItems = [
    { icon: Calendar, title: 'Upcoming Events', color: 'text-blue-600' },
    { icon: FileText, title: 'Latest News', color: 'text-green-600' },
    { icon: Users, title: 'Whiz News', color: 'text-purple-600' },
  ];

  return (
    <div className="px-4 sm:px-6 space-y-3 sm:space-y-4">
      {menuItems.map((item, index) => {
      
        let onClickHandler: (() => void) | undefined;

        if (item.title === 'Upcoming Events') {
          onClickHandler = () => navigate('/calendar');
        } else if (item.title === 'Latest News') {
          onClickHandler = () => navigate('/whiz/latestnews');
        } else if (item.title === 'Whiz News') {
          onClickHandler = () => navigate('/whiz/whiznews');
        }

        const isClickable = !!onClickHandler;

        return (
          <div
            key={index}
            onClick={onClickHandler}
            className={`flex items-center justify-between p-3 sm:p-4 bg-white rounded-xl shadow-sm border ${
              isClickable ? 'cursor-pointer hover:bg-gray-50 hover:shadow-md transition-all duration-200' : ''
            }`}
          >
            <div className="flex items-center">
              <item.icon className={`w-5 h-5 sm:w-6 sm:h-6 ${item.color} mr-3 sm:mr-4`} />
              <span className="font-medium sm:text-lg text-gray-800">{item.title}</span>
            </div>
            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gray-100 rounded flex items-center justify-center">
              <span className="text-xs sm:text-sm text-gray-500">›</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default MenuSection;

