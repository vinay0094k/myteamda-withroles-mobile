
import React from 'react';
import { useNavigate } from 'react-router-dom';
import MobileHeader from '@/components/MobileHeader';
import BottomNavbar from '@/components/BottomNavbar';
import { ArrowLeft, Clock, MapPin, Zap, Waves, Globe, Activity } from 'lucide-react';

const WhizSports = () => {
  const navigate = useNavigate();

  const upcomingEvents = [
    {
      title: 'Friday Football',
      time: 'Tomorrow, 5:00 PM',
      location: 'Main Ground',
      icon: Zap,
      color: 'bg-orange-100 text-orange-600'
    },
    {
      title: 'Weekend Cricket',
      time: 'Saturday, 9:00 AM',
      location: 'Sports Complex',
      icon: Globe,
      color: 'bg-red-100 text-red-600'
    }
  ];

  const facilities = [
    {
      title: 'Indoor Complex',
      icon: Zap,
      color: 'bg-orange-100 text-orange-600'
    },
    {
      title: 'Swimming Pool',
      icon: Waves,
      color: 'bg-blue-100 text-blue-600'
    },
    {
      title: 'Tennis Court',
      icon: Globe,
      color: 'bg-green-100 text-green-600'
    },
    {
      title: 'Track & Field',
      icon: Activity,
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
            <h1 className="text-2xl font-bold text-gray-800">WhizSports</h1>
          </div>
          <span className="text-sm text-purple-600 font-medium">Latest updates</span>
        </div>

        {/* Upcoming Events */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Upcoming Events</h2>
          <div className="space-y-4">
            {upcomingEvents.map((event, index) => (
              <div key={index} className="bg-white rounded-2xl p-4 shadow-sm border">
                <div className="flex items-center mb-3">
                  <div className={`w-10 h-10 rounded-full ${event.color} flex items-center justify-center mr-3`}>
                    <event.icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-semibold text-gray-800">{event.title}</h3>
                </div>
                <div className="flex items-center text-sm text-gray-600 mb-1">
                  <Clock className="w-4 h-4 mr-2" />
                  <span>{event.time}</span>
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <MapPin className="w-4 h-4 mr-2" />
                  <span>{event.location}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Facilities */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Facilities</h2>
          <div className="grid grid-cols-2 gap-4">
            {facilities.map((facility, index) => (
              <div key={index} className="bg-white rounded-2xl p-4 shadow-sm border text-center">
                <div className={`w-12 h-12 rounded-2xl ${facility.color} flex items-center justify-center mx-auto mb-3`}>
                  <facility.icon className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-gray-800 text-sm">{facility.title}</h3>
              </div>
            ))}
          </div>
        </div>
      </div>

      <BottomNavbar />
    </div>
  );
};

export default WhizSports;
