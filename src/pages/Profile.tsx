
// import React from 'react';
// import { ArrowLeft, Edit } from 'lucide-react';
// import { useNavigate } from 'react-router-dom';
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// import { Button } from "@/components/ui/button";
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import MobileHeader from '@/components/MobileHeader';
// import BottomNavbar from '@/components/BottomNavbar';

// const Profile = () => {
//   const navigate = useNavigate();

//   const handleBack = () => {
//     navigate(-1);
//   };

//   const handleEditProfile = () => {
//     console.log('Edit Profile clicked');
//     // Navigate to edit profile page when implemented
//   };

//   return (
//     <div className="min-h-screen bg-gray-50 pb-20">
//       <MobileHeader userName="Vinay" />
      
//       {/* Profile Header */}
//       <div className="bg-white shadow-sm p-4">
//         <div className="flex items-center justify-between mb-4">
//           <button onClick={handleBack} className="p-2">
//             <ArrowLeft className="w-5 h-5 text-gray-600" />
//           </button>
//           <h1 className="text-lg font-semibold">Profile</h1>
//           <Button 
//             onClick={handleEditProfile}
//             variant="ghost"
//             size="sm"
//             className="text-purple-600"
//           >
//             Edit Profile
//           </Button>
//         </div>

//         {/* Profile Tabs */}
//         <Tabs defaultValue="myprofile" className="w-full">
//           {/* Primary Tabs */}
//           <TabsList className="grid w-full grid-cols-3 gap-2 mb-1">
//             <TabsTrigger value="myprofile">MyProfile</TabsTrigger>
//             <TabsTrigger value="assets">Assets Assigned</TabsTrigger>
//             <TabsTrigger value="about">About</TabsTrigger>
//           </TabsList>

//           {/* Secondary Tabs */}
//           <TabsList className="grid w-full grid-cols-3 gap-2 mb-6">
//             <TabsTrigger value="projects">Projects</TabsTrigger>
//             <TabsTrigger value="certificates">Certificates</TabsTrigger>
//             <TabsTrigger value="technologies">Technologies</TabsTrigger>
//           </TabsList>
                
//           <TabsContent value="myprofile" className="space-y-4">
//             {/* Profile Info Card */}
//             <Card>
//               <CardContent className="p-6">
//                 <div className="flex items-center space-x-4 mb-6">
//                   <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
//                     <span className="text-white font-bold text-xl">VK</span>
//                   </div>
//                   <div className="flex-1">
//                     <h2 className="text-xl font-semibold">Vinay Kumar</h2>
//                     <p className="text-purple-600 font-medium">Senior Software Developer</p>
//                     <p className="text-gray-500 text-sm">EMP001</p>
//                   </div>
//                   <Button variant="ghost" size="sm">
//                     <Edit className="w-4 h-4" />
//                   </Button>
//                 </div>
                
//                 {/* Contact Info */}
//                 <div className="space-y-3 mb-6">
//                   <div className="flex items-center space-x-3">
//                     <span className="text-gray-400">📧</span>
//                     <span className="text-gray-600">vinay@company.com</span>
//                     <Button variant="ghost" size="sm">
//                       <Edit className="w-3 h-3" />
//                     </Button>
//                   </div>
//                   <div className="flex items-center space-x-3">
//                     <span className="text-gray-400">📱</span>
//                     <span className="text-gray-600">+91 9876543210</span>
//                     <Button variant="ghost" size="sm">
//                       <Edit className="w-3 h-3" />
//                     </Button>
//                   </div>
//                   <div className="flex items-center space-x-3">
//                     <span className="text-gray-400">📅</span>
//                     <span className="text-gray-600">Joined: Jan 15, 2022</span>
//                   </div>
//                 </div>
                
//                 {/* Job Information */}
//                 <div className="border-t pt-4">
//                   <div className="flex items-center justify-between mb-4">
//                     <h3 className="font-semibold text-gray-900">Job Information</h3>
//                     <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
//                       Timesheet
//                     </div>
//                   </div>
                  
//                   <div className="grid grid-cols-2 gap-4">
//                     <div>
//                       <p className="text-gray-500 text-sm">Department</p>
//                       <p className="font-medium">Engineering</p>
//                     </div>
//                     <div>
//                       <p className="text-gray-500 text-sm">Location</p>
//                       <div className="flex items-center space-x-1">
//                         <span className="text-gray-400">📍</span>
//                         <span className="font-medium">Bangalore, India</span>
//                       </div>
//                     </div>
//                     <div>
//                       <p className="text-gray-500 text-sm">Reporting Manager</p>
//                       <p className="font-medium">John Smith</p>
//                     </div>
//                     <div>
//                       <p className="text-gray-500 text-sm">Employment Type</p>
//                       <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm font-medium">
//                         Full-time
//                       </span>
//                     </div>
//                   </div>
                  
//                   <div className="mt-4">
//                     <p className="text-gray-500 text-sm">Work Schedule</p>
//                     <p className="font-medium">9:00 AM - 6:00 PM IST</p>
//                   </div>
//                 </div>
//               </CardContent>
//             </Card>
//           </TabsContent>
          
//           <TabsContent value="assets" className="space-y-4">
//             <Card>
//               <CardHeader>
//                 <CardTitle className="flex items-center justify-between">
//                   Assets Assigned
//                   <Button variant="ghost" size="sm">
//                     <Edit className="w-4 h-4" />
//                   </Button>
//                 </CardTitle>
//               </CardHeader>
//               <CardContent>
//                 <div className="space-y-4">
//                   <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
//                     <div>
//                       <p className="font-medium">MacBook Pro 16"</p>
//                       <p className="text-sm text-gray-500">Asset ID: LAP001</p>
//                     </div>
//                     <span className="text-green-600 text-sm">Active</span>
//                   </div>
//                   <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
//                     <div>
//                       <p className="font-medium">iPhone 13</p>
//                       <p className="text-sm text-gray-500">Asset ID: PHN001</p>
//                     </div>
//                     <span className="text-green-600 text-sm">Active</span>
//                   </div>
//                   <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
//                     <div>
//                       <p className="font-medium">Monitor Dell 24"</p>
//                       <p className="text-sm text-gray-500">Asset ID: MON001</p>
//                     </div>
//                     <span className="text-green-600 text-sm">Active</span>
//                   </div>
//                 </div>
//               </CardContent>
//             </Card>
//           </TabsContent>
          
//           <TabsContent value="about" className="space-y-4">
//             <Card>
//               <CardHeader>
//                 <CardTitle className="flex items-center justify-between">
//                   About
//                   <Button variant="ghost" size="sm">
//                     <Edit className="w-4 h-4" />
//                   </Button>
//                 </CardTitle>
//               </CardHeader>
//               <CardContent>
//                 <div className="space-y-4">
//                   <div>
//                     <h4 className="font-medium mb-2">Bio</h4>
//                     <p className="text-gray-600 text-sm">
//                       Experienced Senior Software Developer with 5+ years in full-stack development. 
//                       Passionate about creating efficient, scalable solutions and mentoring junior developers.
//                     </p>
//                   </div>
//                   <div>
//                     <h4 className="font-medium mb-2">Skills</h4>
//                     <div className="flex flex-wrap gap-2">
//                       <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">React</span>
//                       <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">Node.js</span>
//                       <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">TypeScript</span>
//                       <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">Python</span>
//                       <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">AWS</span>
//                     </div>
//                   </div>
//                   <div>
//                     <h4 className="font-medium mb-2">Languages</h4>
//                     <div className="space-y-2">
//                       <div className="flex justify-between">
//                         <span>English</span>
//                         <span className="text-gray-500">Native</span>
//                       </div>
//                       <div className="flex justify-between">
//                         <span>Hindi</span>
//                         <span className="text-gray-500">Fluent</span>
//                       </div>
//                       <div className="flex justify-between">
//                         <span>Spanish</span>
//                         <span className="text-gray-500">Basic</span>
//                       </div>
//                     </div>
//                   </div>
//                 </div>
//               </CardContent>
//             </Card>
//           </TabsContent>
//         </Tabs>
//       </div>
      
//       <BottomNavbar />
//     </div>
//   );
// };

// export default Profile;
///////////////////////////////////////////added the edit functionality in this code //////////////////////////////////////////////////////

import React from 'react';
import { ArrowLeft, Edit } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from '@/hooks/use-toast';
import { useApi } from '@/hooks/useApi';
import { apiClient } from '@/lib/api';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import MobileHeader from '@/components/MobileHeader';
import BottomNavbar from '@/components/BottomNavbar';
import EditProfileDialog from '@/components/EditProfileDialog';

const Profile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: user, loading, error, refetch } = useApi(() => apiClient.getUserProfile());

  const handleBack = () => {
    navigate(-1);
  };

  const handleEditProfile = () => {
    console.log('Edit Profile clicked');
    // This could navigate to a full edit profile page if needed
  };

  const handleProfileUpdate = () => {
    refetch();
    toast({
      title: "Success",
      description: "Profile updated successfully",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        <MobileHeader userName="Loading..." />
        <div className="flex items-center justify-center p-8">
          <LoadingSpinner />
        </div>
        <BottomNavbar />
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        <MobileHeader userName="Error" />
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <p className="text-red-500 mb-4">Failed to load profile</p>
            <Button onClick={() => refetch()}>Retry</Button>
          </div>
        </div>
        <BottomNavbar />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <MobileHeader userName={user.first_name} />
      
      {/* Profile Header */}
      <div className="bg-white shadow-sm p-4">
        <div className="flex items-center justify-between mb-4">
          <button onClick={handleBack} className="p-2">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h1 className="text-lg font-semibold">Profile</h1>
          <Button 
            onClick={handleEditProfile}
            variant="ghost"
            size="sm"
            className="text-purple-600"
          >
            Edit Profile
          </Button>
        </div>

        {/* Profile Tabs */}
        <Tabs defaultValue="myprofile" className="w-full">
          {/* Primary Tabs */}
          <TabsList className="grid w-full grid-cols-3 gap-2 mb-1">
            <TabsTrigger value="myprofile">MyProfile</TabsTrigger>
            <TabsTrigger value="assets">Assets Assigned</TabsTrigger>
            <TabsTrigger value="about">About</TabsTrigger>
          </TabsList>

          {/* Secondary Tabs */}
          <TabsList className="grid w-full grid-cols-3 gap-2 mb-6">
            <TabsTrigger value="projects">Projects</TabsTrigger>
            <TabsTrigger value="certificates">Certificates</TabsTrigger>
            <TabsTrigger value="technologies">Technologies</TabsTrigger>
          </TabsList>
                
          <TabsContent value="myprofile" className="space-y-4">
            {/* Profile Info Card */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-4 mb-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-xl">
                      {user.first_name?.[0]}{user.last_name?.[0]}
                    </span>
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-semibold">{user.first_name} {user.last_name}</h2>
                    <p className="text-purple-600 font-medium">{user.position || 'Position not set'}</p>
                    <p className="text-gray-500 text-sm">{user.employee_id}</p>
                  </div>
                  <EditProfileDialog 
                    user={user} 
                    field="personal" 
                    onProfileUpdate={handleProfileUpdate}
                  />
                </div>
                
                {/* Contact Info */}
                <div className="space-y-3 mb-6">
                  <div className="flex items-center space-x-3">
                    <span className="text-gray-400">📧</span>
                    <span className="text-gray-600">{user.email}</span>
                    <span className="text-xs text-gray-400">(Cannot edit)</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="text-gray-400">📱</span>
                    <span className="text-gray-600">{user.phone || 'Not provided'}</span>
                    <EditProfileDialog 
                      user={user} 
                      field="contact" 
                      onProfileUpdate={handleProfileUpdate}
                    />
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="text-gray-400">📅</span>
                    <span className="text-gray-600">
                      Joined: {user.hire_date ? new Date(user.hire_date).toLocaleDateString() : 'Not set'}
                    </span>
                  </div>
                </div>
                
                {/* Job Information */}
                <div className="border-t pt-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900">Job Information</h3>
                    <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                      {user.status === 'active' ? 'Active' : user.status}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-gray-500 text-sm">Department</p>
                      <p className="font-medium">{user.department || 'Not set'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-sm">Position</p>
                      <p className="font-medium">{user.position || 'Not set'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-sm">Reporting Manager</p>
                      <p className="font-medium">{user.manager ? `${user.manager.first_name} ${user.manager.last_name}` : 'Not assigned'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-sm">Employment Type</p>
                      <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm font-medium">
                        {user.employment_type}
                      </span>
                    </div>
                  </div>
                  
                  <div className="mt-4 flex items-center justify-between">
                    <div>
                      <p className="text-gray-500 text-sm">Department & Position</p>
                      <p className="font-medium">{user.department} - {user.position}</p>
                    </div>
                    <EditProfileDialog 
                      user={user} 
                      field="job" 
                      onProfileUpdate={handleProfileUpdate}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* ... keep existing code (other tabs content) */}
          <TabsContent value="assets" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Assets Assigned
                  <Button variant="ghost" size="sm">
                    <Edit className="w-4 h-4" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">MacBook Pro 16"</p>
                      <p className="text-sm text-gray-500">Asset ID: LAP001</p>
                    </div>
                    <span className="text-green-600 text-sm">Active</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">iPhone 13</p>
                      <p className="text-sm text-gray-500">Asset ID: PHN001</p>
                    </div>
                    <span className="text-green-600 text-sm">Active</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">Monitor Dell 24"</p>
                      <p className="text-sm text-gray-500">Asset ID: MON001</p>
                    </div>
                    <span className="text-green-600 text-sm">Active</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="about" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  About
                  <Button variant="ghost" size="sm">
                    <Edit className="w-4 h-4" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Bio</h4>
                    <p className="text-gray-600 text-sm">
                      Experienced Senior Software Developer with 5+ years in full-stack development. 
                      Passionate about creating efficient, scalable solutions and mentoring junior developers.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Skills</h4>
                    <div className="flex flex-wrap gap-2">
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">React</span>
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">Node.js</span>
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">TypeScript</span>
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">Python</span>
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">AWS</span>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Languages</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>English</span>
                        <span className="text-gray-500">Native</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Hindi</span>
                        <span className="text-gray-500">Fluent</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Spanish</span>
                        <span className="text-gray-500">Basic</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      
      <BottomNavbar />
    </div>
  );
};

export default Profile;
