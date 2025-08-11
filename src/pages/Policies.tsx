import React from 'react';
import { useNavigate } from 'react-router-dom';
import MobileHeader from '@/components/MobileHeader';
import BottomNavbar from '@/components/BottomNavbar';

import { ArrowLeft, Search, Calendar, FileText, MapPin } from 'lucide-react'; // Ensure these icons are imported
import { useApi } from '@/hooks/useApi';
import { apiClient } from '@/lib/api';
import { LoadingState } from '@/components/ui/loading-spinner';
import { ErrorMessage } from '@/components/ui/error-message';

const Policies = () => {
  const navigate = useNavigate();

  // Define a mapping for categories to icons and colors
  const categoryStyles: { [key: string]: { icon: React.ElementType, color: string, bgColor: string } } = {
    'HR': { icon: Calendar, color: 'bg-blue-100 text-blue-600', bgColor: 'bg-blue-50' },
    'Operations': { icon: FileText, color: 'bg-purple-100 text-purple-600', bgColor: 'bg-purple-50' },
    'Compliance': { icon: MapPin, color: 'bg-green-100 text-green-600', bgColor: 'bg-green-50' },
    // Add a default fallback if a category from the API doesn't match
    'default': { icon: FileText, color: 'bg-gray-100 text-gray-600', bgColor: 'bg-gray-50' },
  };

  const {
    data: policiesData,
    loading,
    error,
    refetch
  } = useApi(
    () => apiClient.getPolicies(
      {
        page: 1,
        limit: 50,
      }
    )
  );

  // Extract the policies array
  const policies = policiesData?.policies || [];

  // Conditional rendering for loading and error states
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        <MobileHeader userName="User" />
        <div className="p-4">
          <LoadingState message="Loading policies..." />
        </div>
        <BottomNavbar />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        <MobileHeader userName="User" />
        <div className="p-4">
          <ErrorMessage
            message="Failed to load policies. Please try again."
            onRetry={refetch}
          />
        </div>
        <BottomNavbar />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <MobileHeader userName="Vinay" />

      <div className="p-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <button onClick={() => navigate('/whiz')} className="mr-4">
              <ArrowLeft className="w-6 h-6 text-gray-600" />
            </button>
            <h1 className="text-2xl font-bold text-gray-800">Policies</h1>
          </div>
          {/* Corrected Search icon as a button */}
          <button onClick={() => console.log('Search clicked')} className="p-2">
            <Search className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Company Policies</h2>
          <div className="space-y-4">
            {policies.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No policies found.
              </div>
            ) : (
              policies.map((policy) => {
                // Determine the style based on policy category, fallback to default
                const style = policy.category
                  ? categoryStyles[policy.category] || categoryStyles.default
                  : categoryStyles.default;

                const IconComponent = style.icon; // Get the icon component

                return (
                  <div
                    key={policy.id} // Use policy.id as the key
                    onClick={() => navigate(`/whiz/policies/${policy.id}`)}
                    className={`${style.bgColor} rounded-2xl p-4 border cursor-pointer hover:shadow-md transition-shadow`}
                  >
                    <div className={`w-12 h-12 rounded-2xl ${style.color} flex items-center justify-center mr-4`}>
                      <IconComponent className="w-6 h-6" /> {/* Use the dynamically selected icon */}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-800">{policy.title}</h3>
                      <p className="text-sm text-gray-600">{policy.description}</p> {/* Use policy.description */}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
      <BottomNavbar />
    </div>
  );
};

export default Policies;
