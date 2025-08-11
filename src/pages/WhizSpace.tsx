
import React from 'react';
import { useNavigate } from 'react-router-dom';
import MobileHeader from '@/components/MobileHeader';
import BottomNavbar from '@/components/BottomNavbar';
import { Search, Clock, FileText, Zap, BookOpen, Newspaper, ArrowLeft } from 'lucide-react';
import { useApi } from '@/hooks/useApi';
import { apiClient } from '@/lib/api';
import { LoadingState } from '@/components/ui/loading-spinner';

const WhizSpace = () => {
  const navigate = useNavigate();

  //Fetch gallery images from the backend
  const { data: galleryImages, loading, error, refetch } = useApi(() => apiClient.getGalleryImages());


  const latestNews = {
    title: "Latest in Tech: AI Breakthroughs...",
    summary: "Discover the most significant AI developments shaping our future",
    readTime: "5 min read",
    path: "/whiz/latestnews",
  };

  const cardItems = [
    {
      id: 'latestnews',
      title: latestNews.title,
      subtitle: latestNews.summary,
      icon: FileText,
      color: 'bg-orange-100 text-orange-600',
      path: latestNews.path
    },
    {
      id: 'whiznews',
      title: 'WhizNews',
      subtitle: '12 new updates',
      icon: Newspaper,
      color: 'bg-blue-100 text-blue-600',
      path: '/whiz/whiznews'
    },
    {
      id: 'policies',
      title: 'Policies',
      subtitle: '4 recent changes',
      icon: FileText,
      color: 'bg-green-100 text-green-600',
      path: '/whiz/policies'
    },
    {
      id: 'mydocuments',
      title: 'My Documents',
      subtitle: 'Manage your files',
      icon: FileText,
      color: 'bg-yellow-100 text-yellow-600',
      path: '/whiz/mydocuments'
    },
    {
      id: 'learning',
      title: 'Learning',
      subtitle: '8 upcoming sessions',
      icon: BookOpen,
      color: 'bg-orange-100 text-orange-600',
      path: '/whiz/learning'
    },
    {
      id: 'whizsports',
      title: 'WhizSports',
      subtitle: 'Latest updates',
      icon: Zap,
      color: 'bg-purple-100 text-purple-600',
      path: '/whiz/sports'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <MobileHeader userName="Vinay" />
      
      <div className="bg-white shadow-sm">
        <div className="flex items-center justify-between p-4">
          <button onClick={() => navigate('/')} className="p-2">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h1 className="text-xl font-semibold text-gray-800">Whizspace</h1>
          <Search className="w-6 h-6 text-gray-600" />
        </div>
      </div>

      <div className="p-4">
        {/* Quick Access Cards - 3 Rows of 2 Columns */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {cardItems.map((item) => (
            <div
              key={item.id}
              onClick={() => navigate(item.path)}
              className="bg-white rounded-2xl p-4 shadow-sm border cursor-pointer hover:shadow-md transition-shadow"
            >
              <div className={`w-12 h-12 rounded-2xl ${item.color} flex items-center justify-center mb-3`}>
                <item.icon className="w-6 h-6" />
              </div>
              <h3 className="font-semibold text-gray-800 mb-1">{item.title}</h3>
              <p className="text-sm text-gray-600">{item.subtitle}</p>
            </div>
          ))}
        </div>

        {/* ---------------------------- WhizGallery ---------------------------- */}
        <div className="mb-6">
          {/* <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">WhizGallery</h3>
            <span className="text-sm text-purple-600 font-medium">View all ›</span>
          </div> */}

          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">WhizGallery</h3>
            <button
              onClick={() => navigate('/whiz/gallery')} // Add this onClick handler
              className="text-sm text-purple-600 font-medium hover:text-purple-700 transition-colors"
            >
              View all ›
            </button>
          </div>

          {/* <div className="flex space-x-3 overflow-x-auto pb-2">
            <div className="w-32 h-32 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex-shrink-0"></div>
            <div className="w-32 h-32 bg-gradient-to-br from-orange-400 to-red-500 rounded-2xl flex-shrink-0"></div>
            <div className="w-32 h-32 bg-gradient-to-br from-green-400 to-blue-500 rounded-2xl flex-shrink-0"></div>
          </div> */}
          {loading ? (
            <LoadingState message="Loading gallery images..." />
          ) : error ? (
            <div className="text-center py-8">
              {/* Showing this when no images found */}
              <p className="text-red-600 mb-4">Failed to load gallery images.</p>
              <button
                onClick={refetch}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                Retry
              </button>
            </div>
          ) : (
            <div className="flex space-x-3 overflow-x-auto pb-2">
              {galleryImages && galleryImages.length > 0 ? (
                galleryImages.map((image) => (
                  <img
                    key={image.id}
                    src={image.url}
                    alt={image.title}
                    className="w-32 h-32 rounded-2xl flex-shrink-0 object-cover"
                    loading="lazy"
                    onError={(e) => {
                      // Fallback for broken images
                      e.currentTarget.src = '/placeholder.svg';
                    }}
                  />
                ))
              ) : (
                // Fallback to placeholder gradients when no images are available
                <>
                  <div className="w-32 h-32 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex-shrink-0"></div>
                  <div className="w-32 h-32 bg-gradient-to-br from-orange-400 to-red-500 rounded-2xl flex-shrink-0"></div>
                  <div className="w-32 h-32 bg-gradient-to-br from-green-400 to-blue-500 rounded-2xl flex-shrink-0"></div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <BottomNavbar />
    </div>
  );
};

export default WhizSpace;
