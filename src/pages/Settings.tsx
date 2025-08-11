
import React from 'react';
import { ChevronLeft, ChevronRight, Key, Shield, Bell, Mail, Palette, Globe, Lock, HelpCircle, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import MobileHeader from '@/components/MobileHeader';
import BottomNavbar from '@/components/BottomNavbar';

const Settings = () => {
  const navigate = useNavigate();

  const handleBack = () => {
    navigate('/');
  };

  const settingsSections = [
    {
      title: 'Account Settings',
      items: [
        { icon: Key, label: 'Change Password', color: 'text-purple-600' },
        { icon: Shield, label: 'Two-Factor Authentication', color: 'text-purple-600' },
      ]
    },
    {
      title: 'Notifications',
      items: [
        { icon: Bell, label: 'Push Notifications', color: 'text-purple-600' },
        { icon: Mail, label: 'Email Notifications', color: 'text-purple-600' },
      ]
    },
    {
      title: 'App Settings',
      items: [
        { icon: Palette, label: 'Display & Theme', color: 'text-purple-600' },
        { icon: Globe, label: 'Language & Region', color: 'text-purple-600' },
      ]
    },
    {
      title: 'System',
      items: [
        { icon: Lock, label: 'Privacy & Security', color: 'text-purple-600' },
        { icon: HelpCircle, label: 'Help & Support', color: 'text-purple-600' },
        { icon: Info, label: 'About', color: 'text-purple-600' },
      ]
    }
  ];

  const handleSettingClick = (label: string) => {
    console.log(`${label} clicked`);
    // Handle navigation to specific setting pages
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <MobileHeader userName="Vinay" />
      
      {/* Back button header */}
      <div className="bg-white shadow-sm p-4 flex items-center">
        <button onClick={handleBack} className="mr-4">
          <ChevronLeft className="w-6 h-6 text-gray-600" />
        </button>
        <h1 className="text-lg font-semibold text-gray-800">Settings</h1>
      </div>

      {/* Settings Content */}
      <div className="p-4">
        {settingsSections.map((section, sectionIndex) => (
          <div key={sectionIndex} className="mb-6">
            <h2 className="text-sm font-medium text-gray-500 mb-3 px-2">
              {section.title}
            </h2>
            <div className="bg-white rounded-lg shadow-sm">
              {section.items.map((item, itemIndex) => (
                <div key={itemIndex}>
                  <button
                    onClick={() => handleSettingClick(item.label)}
                    className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <item.icon className={`w-5 h-5 ${item.color}`} />
                      <span className="text-gray-800 font-medium">{item.label}</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </button>
                  {itemIndex < section.items.length - 1 && (
                    <div className="border-b border-gray-100 ml-12" />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <BottomNavbar />
    </div>
  );
};

export default Settings;
