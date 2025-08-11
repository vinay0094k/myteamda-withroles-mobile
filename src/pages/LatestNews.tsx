import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, ExternalLink, Clock } from 'lucide-react';
import { useApi } from '@/hooks/useApi';
import { apiClient } from '@/lib/api';
import { LoadingState } from '@/components/ui/loading-spinner';
import { ErrorMessage } from '@/components/ui/error-message';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import MobileHeader from '@/components/MobileHeader';
import BottomNavbar from '@/components/BottomNavbar';

const LatestNews: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Get available categories
  const { data: categories } = useApi(() => apiClient.getRSSCategories());

  // Get RSS news data
  const { data: rssNewsData, loading, error, refetch } = useApi(
    () => apiClient.getLatestRSSNews({ 
      limit: 50,
      category: selectedCategory === 'all' ? undefined : selectedCategory
    }),
    [selectedCategory]
  );

  const newsItems = rssNewsData || [];
  const availableCategories = ['all', ...(categories || [])];

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await apiClient.refreshRSSFeeds();
      toast({
        title: "Refresh Triggered",
        description: "News feeds are being updated in the background.",
      });
      // Refetch data after a short delay
      setTimeout(() => {
        refetch();
      }, 2000);
    } catch (error) {
      toast({
        title: "Refresh Failed",
        description: "Failed to trigger news refresh. Please try again.",
        variant: "destructive",
      });
    } finally {
      setRefreshing(false);
    }
  };

  const handleNewsClick = (link: string) => {
    window.open(link, '_blank', 'noopener,noreferrer');
  };

  const formatTimeAgo = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return 'Recently';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <MobileHeader userName="User" />

      <div className="bg-white shadow-sm">
        <div className="flex items-center justify-between p-4">
          <button onClick={() => navigate('/')} className="mr-4">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h1 className="text-lg font-semibold">Latest News</h1>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      <div className="p-4">
        {error && (
          <ErrorMessage 
            message="Failed to load news. Please try again." 
            onRetry={refetch}
            className="mb-4"
          />
        )}

        {/* Filter Badges */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          {availableCategories.map((cat) => (
            <Badge
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`cursor-pointer px-3 py-1 text-sm font-medium rounded-full ${
                selectedCategory === cat
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-blue-100'
              }`}
            >
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </Badge>
          ))}
        </div>

        {/* News Cards */}
        {loading ? (
          <LoadingState message="Loading latest news from RSS feeds..." />
        ) : (
          <div className="space-y-4">
            {newsItems.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p className="mb-2">No news available at the moment.</p>
                <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
                  <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                  Refresh News
                </Button>
              </div>
            ) : (
              newsItems.map((item) => (
                <Card 
                  key={item.id} 
                  className="shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => handleNewsClick(item.link)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h2 className="font-semibold text-gray-800 text-base flex-1 mr-2">
                        {item.title}
                      </h2>
                      <ExternalLink className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    </div>
                    
                    {item.description && (
                      <p className="text-sm text-gray-600 mb-3 line-clamp-3">
                        {item.description}
                      </p>
                    )}
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Badge variant="secondary" className="text-xs">
                          {item.feed?.name || item.category || 'News'}
                        </Badge>
                        {item.author && (
                          <span className="text-xs text-gray-500">by {item.author}</span>
                        )}
                      </div>
                      <div className="flex items-center text-xs text-gray-500">
                        <Clock className="w-3 h-3 mr-1" />
                        {formatTimeAgo(item.published_at)}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </div>

      <BottomNavbar />
    </div>
  );
};

export default LatestNews;
