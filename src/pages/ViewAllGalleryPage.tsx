import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import MobileHeader from '@/components/MobileHeader';
import BottomNavbar from '@/components/BottomNavbar';
import { useApi } from '@/hooks/useApi';
import { apiClient } from '@/lib/api';
import { LoadingState } from '@/components/ui/loading-spinner';
import { ErrorMessage } from '@/components/ui/error-message';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const ViewAllGalleryPage = () => {
  const navigate = useNavigate();
  const { data: galleryImages, loading, error, refetch } = useApi(() => apiClient.getGalleryImages());

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <MobileHeader userName="User" /> {/* You might want to pass the actual user name here */}

      <div className="bg-white shadow-sm">
        <div className="flex items-center justify-between p-4">
          <button onClick={() => navigate('/whiz')} className="p-2">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h1 className="text-xl font-semibold text-gray-800">WhizGallery</h1>
          <div className="w-5 h-5" /> {/* Placeholder for alignment */}
        </div>
      </div>

      <div className="p-4">
        {loading ? (
          <LoadingState message="Loading gallery images..." />
        ) : error ? (
          <ErrorMessage
            message="Failed to load gallery images. Please try again."
            onRetry={refetch}
            variant="full"
          />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {galleryImages && galleryImages.length > 0 ? (
              galleryImages.map((image) => (
                <Card key={image.id} className="overflow-hidden">
                  <CardContent className="p-0">
                    <img
                      src={image.url}
                      alt={image.title}
                      className="w-full h-40 object-cover"
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.src = '/placeholder.svg'; // Fallback image
                      }}
                    />
                    <div className="p-3">
                      <CardTitle className="text-base font-semibold line-clamp-1">{image.title}</CardTitle>
                      {image.description && (
                        <p className="text-sm text-gray-600 line-clamp-2 mt-1">{image.description}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="col-span-full text-center py-8 text-gray-500">
                No images found in the gallery.
              </div>
            )}
          </div>
        )}
      </div>

      <BottomNavbar />
    </div>
  );
};

export default ViewAllGalleryPage;
