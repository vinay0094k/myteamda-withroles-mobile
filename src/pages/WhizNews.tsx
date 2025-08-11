
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MobileHeader from '@/components/MobileHeader';
import BottomNavbar from '@/components/BottomNavbar';
import { ArrowLeft, Search, Bookmark } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const WhizNews = () => {
  const navigate = useNavigate();

  const featuredNews = {
    title: 'Annual Company Meeting Highlights...',
    description: 'Key announcements and strategic plans unveiled at this year\'s annual company meeting, setting',
    time: '2 hours ago',
    tag: 'FEATURED'
  };

  const recentNews = [
    {
      title: 'New Sports Facility Opening Next Month',
      description: 'State-of-the-art sports complex featuring modern amenities and',
      time: '1 day ago',
      category: 'Facilities'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <MobileHeader userName="Vinay" />
      
      <div className="p-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <button onClick={() => navigate('/whiz')} className="mr-4">
              <ArrowLeft className="w-6 h-6 text-gray-600" />
            </button>
            <h1 className="text-2xl font-bold text-gray-800">WhizNews</h1>
          </div>
          <Search className="w-6 h-6 text-gray-600" />
        </div>

        <p className="text-sm text-gray-600 mb-6">Latest updates</p>

        {/* Tabs */}
        <Tabs defaultValue="all news" className="mb-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all news">All News</TabsTrigger>
            <TabsTrigger value="company">Company Updates</TabsTrigger>
            <TabsTrigger value="events">Events</TabsTrigger>
          </TabsList>

          <TabsContent value="all news" className="mt-6">
            {/* Featured News */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border mb-6">
              <div className="h-32 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl mb-4"></div>
              <span className="text-xs text-purple-600 font-medium bg-purple-100 px-2 py-1 rounded">
                {featuredNews.tag}
              </span>
              <span className="text-xs text-gray-500 ml-2">{featuredNews.time}</span>
              <h3 className="font-semibold text-gray-800 mt-2 mb-1">{featuredNews.title}</h3>
              <p className="text-sm text-gray-600">{featuredNews.description}</p>
            </div>

            {/* Recent News */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-800">Recent News</h2>
                <span className="text-sm text-red-500 font-medium">Read More</span>
              </div>
              
              {recentNews.map((news, index) => (
                <div key={index} className="bg-white rounded-2xl p-4 shadow-sm border flex">
                  <div className="w-16 h-16 bg-gray-200 rounded-xl mr-4 flex-shrink-0"></div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-purple-600 font-medium">{news.category}</span>
                      <Bookmark className="w-4 h-4 text-gray-400" />
                    </div>
                    <span className="text-xs text-gray-500">{news.time}</span>
                    <h3 className="font-semibold text-gray-800 mt-1 mb-1">{news.title}</h3>
                    <p className="text-sm text-gray-600">{news.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="company" className="mt-6">
            <div className="text-center text-gray-500 py-8">
              <p>Company updates will appear here</p>
            </div>
          </TabsContent>

          <TabsContent value="events" className="mt-6">
            <div className="text-center text-gray-500 py-8">
              <p>Event news will appear here</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <BottomNavbar />
    </div>
  );
};

export default WhizNews;
