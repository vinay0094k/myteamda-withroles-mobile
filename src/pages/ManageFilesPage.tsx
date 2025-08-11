
import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import MobileHeader from '@/components/MobileHeader';
import BottomNavbar from '@/components/BottomNavbar';
import { ArrowLeft, Search, Upload, FolderPlus, ArrowUpDown, Filter, FileText, Receipt, Image, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';

const ManageFilesPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeFilter, setActiveFilter] = useState(() => location.state?.activeFilter || 'all'); // ✅ (3)


  const categories = [
    {
      id: 'important',
      title: 'Important Documents',
      count: 15,
      icon: FileText,
      color: 'bg-blue-100 text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      id: 'payslips',
      title: 'Payslips',
      count: 24,
      icon: Receipt,
      color: 'bg-purple-100 text-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      id: 'certificates',
      title: 'Certificates',
      count: 8,
      icon: Image,
      color: 'bg-green-100 text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      id: 'personal',
      title: 'Personal Files',
      count: 32,
      icon: FileText,
      color: 'bg-orange-100 text-orange-600',
      bgColor: 'bg-orange-50'
    }
  ];

  const recentFiles = [
    {
      id: 1,
      name: 'Annual_Report_2023.pdf',
      size: '2.4 MB',
      date: 'Dec 12, 2023',
      type: 'pdf'
    },
    {
      id: 2,
      name: 'Certificate_Course.jpg',
      size: '1.8 MB',
      date: 'Dec 10, 2023',
      type: 'image'
    },
    {
      id: 3,
      name: 'Payslip_November.pdf',
      size: '856 KB',
      date: 'Dec 1, 2023',
      type: 'pdf'
    }
  ];

  const actionButtons = [
    { id: 'upload', label: 'Upload', icon: Upload, color: 'text-purple-600' },
    { id: 'folder', label: 'New Folder', icon: FolderPlus, color: 'text-blue-600' },
    { id: 'sort', label: 'Sort', icon: ArrowUpDown, color: 'text-green-600' },
    { id: 'filter', label: 'Filter', icon: Filter, color: 'text-orange-600' }
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <MobileHeader userName="Vinay" />
      
      <div className="bg-white shadow-sm">
        <div className="flex items-center justify-between p-4">
          <button onClick={() => navigate('/')} className="p-2">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h1 className="text-xl font-semibold text-gray-800">My Documents</h1>
          <Search className="w-6 h-6 text-gray-600" />
        </div>
      </div>

      <div className="p-4">
        {/* Action Buttons */}
        <div className="flex justify-between items-center mb-6">
          {actionButtons.map((action) => (
            <div key={action.id} className="flex flex-col items-center">
              <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-2">
                <action.icon className={`w-6 h-6 ${action.color}`} />
              </div>
              <span className="text-xs text-gray-600 font-medium">{action.label}</span>
            </div>
          ))}
        </div>

        {/* Categories */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Categories</h2>
          <div className="grid grid-cols-2 gap-4">
            {categories.map((category) => (
              <div key={category.id} className={`${category.bgColor} rounded-2xl p-4 border`}>
                <div className={`w-10 h-10 ${category.color} rounded-xl flex items-center justify-center mb-3`}>
                  <category.icon className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-gray-800 mb-1">{category.title}</h3>
                <p className="text-sm text-gray-600">{category.count} files</p>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Files */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">Recent Files</h2>
            <span className="text-sm text-purple-600 font-medium">See All</span>
          </div>
          <div className="space-y-3">
            {recentFiles.map((file) => (
              <div key={file.id} className="bg-white rounded-xl p-4 shadow-sm border flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center mr-3">
                    {file.type === 'pdf' ? (
                      <FileText className="w-5 h-5 text-red-500" />
                    ) : (
                      <Image className="w-5 h-5 text-blue-500" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-800">{file.name}</h3>
                    <p className="text-sm text-gray-500">{file.size} • {file.date}</p>
                  </div>
                </div>
                <button className="p-2">
                  <MoreVertical className="w-5 h-5 text-gray-400" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <BottomNavbar />
    </div>
  );
};

export default ManageFilesPage;
