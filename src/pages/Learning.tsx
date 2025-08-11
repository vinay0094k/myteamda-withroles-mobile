
import React from 'react';
import { useNavigate } from 'react-router-dom';
import MobileHeader from '@/components/MobileHeader';
import BottomNavbar from '@/components/BottomNavbar';
import { ArrowLeft, Clock, BookOpen, Database, Users, Video } from 'lucide-react';

const Learning = () => {
  const navigate = useNavigate();

  const upcomingSessions = [
    {
      title: 'AI & Machine Learning Basics',
      time: 'Tomorrow, 2:00 PM',
      icon: BookOpen,
      color: 'bg-purple-100 text-purple-600'
    },
    {
      title: 'Data Analytics Workshop',
      time: 'Wed, 10:00 AM',
      icon: Database,
      color: 'bg-purple-100 text-purple-600'
    },
    {
      title: 'Cloud Computing Fundamentals',
      time: 'Thu, 3:00 PM',
      icon: BookOpen,
      color: 'bg-purple-100 text-purple-600'
    }
  ];

  const popularTopics = [
    {
      title: 'Programming',
      icon: BookOpen,
      color: 'bg-purple-100 text-purple-600'
    },
    {
      title: 'Data Science',
      icon: Database,
      color: 'bg-purple-100 text-purple-600'
    },
    {
      title: 'Leadership',
      icon: Users,
      color: 'bg-purple-100 text-purple-600'
    },
    {
      title: 'Design',
      icon: Video,
      color: 'bg-purple-100 text-purple-600'
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
            <h1 className="text-2xl font-bold text-gray-800">Learning</h1>
          </div>
          <span className="text-sm text-purple-600 font-medium">8 upcoming sessions</span>
        </div>

        {/* Upcoming Sessions */}
        <div className="mb-6">
          <div className="space-y-4">
            {upcomingSessions.map((session, index) => (
              <div key={index} className="bg-white rounded-2xl p-4 shadow-sm border">
                <div className="flex items-center">
                  <div className={`w-12 h-12 rounded-2xl ${session.color} flex items-center justify-center mr-4`}>
                    <session.icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-800 mb-1">{session.title}</h3>
                    <div className="flex items-center text-sm text-gray-600">
                      <Clock className="w-4 h-4 mr-2" />
                      <span>{session.time}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Popular Topics */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Popular Topics</h2>
          <div className="grid grid-cols-2 gap-4">
            {popularTopics.map((topic, index) => (
              <div key={index} className="bg-white rounded-2xl p-4 shadow-sm border text-center">
                <div className={`w-12 h-12 rounded-2xl ${topic.color} flex items-center justify-center mx-auto mb-3`}>
                  <topic.icon className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-gray-800 text-sm">{topic.title}</h3>
              </div>
            ))}
          </div>
        </div>
      </div>

      <BottomNavbar />
    </div>
  );
};

export default Learning;
