
// import React from 'react';
// import { Home, Calendar, Clock, FileText, Star } from 'lucide-react';
// import { useNavigate, useLocation } from 'react-router-dom';
// import { useAuth } from '@/contexts/AuthContext'; 
// import { useRole } from '@/contexts/RoleContext';

// const BottomNavbar = () => {
//   const navigate = useNavigate();
//   const location = useLocation();
//   const { user } = useAuth();
//   const { hasRole } = useRole();

//   const items = [
//     { icon: Home,     label: 'Home',      path: '/' },
//     { icon: Calendar, label: 'Calendar',  path: '/calendar' },
//     { icon: Clock,    label: 'Time Sheet',path: '/timesheet' },
//     { icon: FileText, label: 'Leaves',    path: '/leaves' },
//     { icon: Star,     label: 'Whiz Space',path: '/whiz' },
//   ];
//   { /* -------------------------------------------return function ---------------------------------------------------- */ }
//   return (
//     <div className="fixed bottom-0 inset-x-0 bg-white shadow-lg border-t border-gray-200 z-50">
//       <div className="flex justify-around items-center py-3 sm:py-4 max-w-screen-xl mx-auto">
//         {items.map((item, idx) => {
//           // treat /whiz/* as active for Whiz Space
//           const isActive =
//             location.pathname === item.path ||
//             (item.path === '/whiz' && location.pathname.startsWith('/whiz'));

//           // purple if active, gray otherwise
//           const colorClass = isActive ? 'text-purple-600' : 'text-gray-500';

//           // Determine the Time Sheet icon based on user role
//           let itemPath = item.path;
//           if (item.label === 'Time Sheet') {
//             // Check if the user has any of the admin-like roles
//             if (user && hasRole(['admin', 'hr', 'manager', 'team-lead'])) {
//               itemPath = '/admin/timesheets';
//             } else {
//               // Default to employee timesheet for other roles or if user is null
//               itemPath = '/timesheet';
//             }
//           }

//           return (
//             //app bar icons buttons
//             <button
//               key={idx}
//               onClick={() => navigate(itemPath)}
//               className={`
//                 flex flex-col items-center 
//                 p-2 sm:p-3 rounded-lg min-w-0
//                 focus:outline-none 
//                 transition-all duration-200 ease-in-out
  
//                 ${isActive
//                   ? 'bg-purple-50 scale-110'
//                   : 'hover:bg-gray-100 hover:scale-110'}
//               `}
//             >
//               <item.icon className={`w-6 h-6 sm:w-7 sm:h-7 ${colorClass}`} />
//               <span className={`text-xs sm:text-sm mt-1 font-medium ${colorClass} truncate max-w-full`}>
//                 {item.label}
//               </span>
//           </button>
//           );
//         })}
//       </div>
//     </div>
//   );
// };

// export default BottomNavbar;

////////////////////////////////////////////// aug07 (above one is working) /////////////////////////////////////////////////////////////////////////////
import React from 'react';
import { Home, Calendar, Clock, FileText, Star } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext'; 
import { useRole } from '@/contexts/RoleContext';

const BottomNavbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { hasRole } = useRole();

  const items = [
    { icon: Home,     label: 'Home',      path: '/' },
    { icon: Calendar, label: 'Calendar',  path: '/calendar' },
    { icon: Clock,    label: 'Time Sheet',path: '/timesheet' },
    { icon: FileText, label: 'Leaves',    path: '/leaves' },
    { icon: Star,     label: 'Whiz Space',path: '/whiz' },
  ];

  return (
    <div className="fixed bottom-0 inset-x-0 bg-white shadow-lg border-t border-gray-200 z-50">
      <div className="flex justify-around items-center py-3 sm:py-4 max-w-screen-xl mx-auto">
        {items.map((item, idx) => {
          // Determine the correct navigation path based on role
          let itemPath = item.path;
          if (item.label === 'Time Sheet') {
            if (user && hasRole(['admin', 'hr', 'manager', 'team-lead'])) {
              itemPath = '/admin/timesheets';
            }
          }
          if (item.label === 'Leaves') {
            if (user && hasRole(['admin', 'hr', 'manager', 'team-lead'])) {
              itemPath = '/admin/leaves';
            }
          }

          // Active state detection (treat subpaths as active)
          const isActive =
            location.pathname === itemPath ||
            (item.label === 'Time Sheet' && location.pathname.startsWith('/admin/timesheets')) ||
            (item.label === 'Leaves' && location.pathname.startsWith('/admin/leaves')) ||
            (item.path === '/whiz' && location.pathname.startsWith('/whiz'));

          const colorClass = isActive ? 'text-purple-600' : 'text-gray-500';

          return (
            <button
              key={idx}
              onClick={() => navigate(itemPath)}
              className={
                `flex flex-col items-center p-2 sm:p-3 rounded-lg min-w-0 focus:outline-none transition-all duration-200 ease-in-out
                ${isActive ? 'bg-purple-50 scale-110' : 'hover:bg-gray-100 hover:scale-110'}`
              }
            >
              <item.icon className={`w-6 h-6 sm:w-7 sm:h-7 ${colorClass}`} />
              <span className={`text-xs sm:text-sm mt-1 font-medium ${colorClass} truncate max-w-full`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default BottomNavbar;
