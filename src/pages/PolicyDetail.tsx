import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { useApi } from '@/hooks/useApi';
import { apiClient } from '@/lib/api';
import { LoadingState } from '@/components/ui/loading-spinner';
import { ErrorMessage } from '@/components/ui/error-message';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import MobileHeader from '@/components/MobileHeader';
import BottomNavbar from '@/components/BottomNavbar';

const PolicyDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: policyData, loading, error, refetch } = useApi(
    () => apiClient.getPolicy(id || '') // Fetch policy by ID
  );

//   const policy = policyData?.data; // Extract the policy object
  const policy = policyData;

  const handleBack = () => {
    navigate('/whiz/policies'); // Go back to the policies list
  };

  const handleOpenDocument = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        <MobileHeader userName="User" />
        <div className="p-4">
          <LoadingState message="Loading policy details..." />
        </div>
        <BottomNavbar />
      </div>
    );
  }

  if (error || !policy) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        <MobileHeader userName="User" />
        <div className="p-4">
          <ErrorMessage
            message={error || "Policy not found."}
            onRetry={refetch}
          />
        </div>
        <BottomNavbar />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <MobileHeader userName="User" />

      <div className="bg-white shadow-sm">
        <div className="flex items-center justify-between p-4">
          <button onClick={handleBack} className="p-2">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h1 className="text-xl font-semibold text-gray-800">Policy Details</h1>
          <div className="w-5 h-5" /> {/* Placeholder for alignment */}
        </div>
      </div>

      <div className="p-4">
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-purple-700">{policy.title}</CardTitle>
            {policy.description && (
              <p className="text-gray-600 text-sm mt-1">{policy.description}</p>
            )}
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {policy.content && (
                <div>
                  <h3 className="font-semibold text-gray-800 mb-2">Content</h3>
                  <p className="text-gray-700 whitespace-pre-wrap">{policy.content}</p>
                </div>
              )}

              {policy.category && (
                <div>
                  <h3 className="font-semibold text-gray-800 mb-2">Category</h3>
                  <p className="text-gray-700">{policy.category}</p>
                </div>
              )}

              {policy.version && (
                <div>
                  <h3 className="font-semibold text-gray-800 mb-2">Version</h3>
                  <p className="text-gray-700">{policy.version}</p>
                </div>
              )}

              {policy.effective_date && (
                <div>
                  <h3 className="font-semibold text-gray-800 mb-2">Effective Date</h3>
                  <p className="text-gray-700">{new Date(policy.effective_date).toLocaleDateString()}</p>
                </div>
              )}

              {policy.url && ( // Check if the policy has a pre-signed URL
                <Button
                  onClick={() => handleOpenDocument(policy.url)}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open Document
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <BottomNavbar />
    </div>
  );
};

export default PolicyDetail;
