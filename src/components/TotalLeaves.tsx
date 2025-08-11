
// import React from 'react';
// import { Progress } from '@/components/ui/progress';
// import { useApi } from '@/hooks/useApi';
// import { apiClient } from '@/lib/api';
// import { LoadingSpinner } from '@/components/ui/loading-spinner';
// import { ErrorMessage } from '@/components/ui/error-message';

// const TotalLeaves = () => {
//   const { data: leaveBalance, loading, error, refetch } = useApi(
//     () => apiClient.getLeaveBalance()
//   );

//   if (loading) {
//     return (
//       <div className="bg-white rounded-2xl p-6 shadow-sm">
//         <LoadingSpinner size="lg" />
//       </div>
//     );
//   }

//   if (error) {
//     return (
//       <div className="bg-white rounded-2xl p-6 shadow-sm">
//         <ErrorMessage message={error} onRetry={refetch} />
//       </div>
//     );
//   }

//   const leaveData = (leaveBalance || []).map(balance => ({
//     type: balance.leave_type?.name || 'Unknown',
//     allocated: balance.allocated_days,
//     used: balance.used_days,
//     remaining: balance.allocated_days - balance.used_days,
//     color: balance.leave_type?.name === 'Annual Leave' ? 'bg-purple-600' :
//            balance.leave_type?.name === 'Sick Leave' ? 'bg-red-500' :
//            balance.leave_type?.name === 'Casual Leave' ? 'bg-blue-500' :
//            'bg-gray-500'
//   }));

//   const totalRemaining = leaveData.reduce((sum, leave) => sum + leave.remaining, 0);

//   const leaveCycle = 'Jan 2025 - Dec 2025';
//   const expiryDate = 'Dec 31, 2025';

//   return (
//     <div className="bg-white rounded-2xl p-6 shadow-sm">
//       {/* Leaves Remaining */}
//       <div className="text-center mb-8">
//         <h2 className="text-4xl font-bold text-purple-600 mb-2">{totalRemaining}</h2>
//         <p className="text-gray-600">Leaves Remaining</p>
//       </div>

//       {/* Leave Types */}
//       {leaveData.length > 0 ? (
//         <div className="space-y-6 mb-8">
//           {leaveData.map((leave, index) => (
//             <div key={index} className="space-y-2">
//               <div className="flex justify-between items-center">
//                 <span className="text-sm font-medium text-gray-700">{leave.type}</span>
//                 <span className="text-sm text-gray-500">{leave.allocated} days allocated</span>
//               </div>
//               <Progress 
//                 value={leave.allocated > 0 ? (leave.used / leave.allocated) * 100 : 0} 
//                 className="h-3 bg-gray-200"
//               />
//               <div className="flex justify-between text-sm text-gray-600">
//                 <span>{leave.used} days used</span>
//                 <span>{leave.remaining} days remaining</span>
//               </div>
//             </div>
//           ))}
//         </div>
//       ) : (
//         <div className="text-center py-8 text-gray-500">
//           <p>No leave allocations found</p>
//         </div>
//       )}

//       {/* Leave Cycle */}
//       <div className="space-y-4">
//         <div>
//           <p className="text-sm font-medium text-gray-700 mb-1">Leave cycle:</p>
//           <p className="text-sm text-gray-600">{leaveCycle}</p>
//         </div>
        
//         <div className="p-4 bg-orange-50 rounded-lg">
//           <p className="text-sm text-orange-700">
//             Leave balances expire on {expiryDate}
//           </p>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default TotalLeaves;

// =================================================================================================

// import React from 'react';
// import { LeaveBalance } from '@/lib/api';

// interface TotalLeavesProps {
//   leaveBalance: LeaveBalance[];
// }

// const TotalLeaves: React.FC<TotalLeavesProps> = ({ leaveBalance }) => {
//   return (
//     <div className="bg-white rounded-lg shadow-md p-4">
//       <h2 className="text-lg font-semibold mb-2">Total Leaves</h2>
//       {leaveBalance.map((balance) => (
//         <div key={balance.leave_type_id} className="mb-2">
//           <h3 className="font-medium">{balance.leave_type?.name}</h3>
//           <p className="text-sm text-gray-500">
//             Allocated: {balance.allocated_days}, Used: {balance.used_days}, Remaining: {balance.remaining_days}
//           </p>
//         </div>
//       ))}
//     </div>
//   );
// };

// export default TotalLeaves;

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

import React, { useMemo } from 'react';
import { Progress } from '@/components/ui/progress';
import { useApi } from '@/hooks/useApi';
import { apiClient, LeaveBalance } from '@/lib/api';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { ErrorMessage } from '@/components/ui/error-message';

const TotalLeaves: React.FC = () => {
  const { data, loading, error, refetch } = useApi(() => apiClient.getLeaveBalance(), []);

  // Normalize whatever the API returns into an array of LeaveBalance
  const balances: LeaveBalance[] = useMemo(() => {
    if (!data) return [];
    // supports shapes like { leave_balance: [...] } or just [...]
    return (data.leave_balance ?? data.balances ?? data) as LeaveBalance[];
  }, [data]);

  const leaveData = useMemo(() => {
    return (balances || []).map((b) => {
      const allocated = Number(b.allocated_days ?? 0);
      const used = Number(b.used_days ?? 0);
      const remaining = Number(
        'remaining_days' in b && b.remaining_days != null
          ? b.remaining_days
          : allocated - used
      );

      const type = b.leave_type?.name ?? 'Unknown';
      const color =
        type === 'Annual Leave' ? 'bg-purple-600' :
        type === 'Sick Leave'   ? 'bg-red-500'    :
        type === 'Casual Leave' ? 'bg-blue-500'   :
        'bg-gray-500';

      return { type, allocated, used, remaining, color };
    });
  }, [balances]);

  const totalRemaining = useMemo(
    () => leaveData.reduce((sum, l) => sum + (l.remaining || 0), 0),
    [leaveData]
  );

  // If you have cycle/expiry from API, wire them in here. Otherwise keep placeholders:
  const leaveCycle = useMemo(() => {
    // Example: from policy API; placeholder for now:
    return 'Jan 2025 - Dec 2025';
  }, []);
  const expiryDate = useMemo(() => 'Dec 31, 2025', []);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <ErrorMessage message={String(error)} onRetry={refetch} />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm">
      {/* Leaves Remaining */}
      <div className="text-center mb-8">
        <h2 className="text-4xl font-bold text-purple-600 mb-2">{totalRemaining}</h2>
        <p className="text-gray-600">Leaves Remaining</p>
      </div>

      {/* Leave Types */}
      {leaveData.length > 0 ? (
        <div className="space-y-6 mb-8">
          {leaveData.map((leave) => (
            <div key={leave.type} className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">{leave.type}</span>
                <span className="text-sm text-gray-500">{leave.allocated} allocated</span>
              </div>
              <Progress
                value={leave.allocated > 0 ? (leave.used / leave.allocated) * 100 : 0}
                className="h-3 bg-gray-200"
              />
              <div className="flex justify-between text-sm text-gray-600">
                <span>{leave.used} days used</span>
                <span>{leave.remaining} remaining</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <p>No leave allocations found</p>
        </div>
      )}

      {/* Leave Cycle */}
      <div className="space-y-4">
        <div>
          <p className="text-sm font-medium text-gray-700 mb-1">Leave cycle:</p>
          <p className="text-sm text-gray-600">{leaveCycle}</p>
        </div>

        <div className="p-4 bg-orange-50 rounded-lg">
          <p className="text-sm text-orange-700">
            Leave balances expire on {expiryDate}
          </p>
        </div>
      </div>
    </div>
  );
};

export default TotalLeaves;
