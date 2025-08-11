
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { RoleProvider } from "@/contexts/RoleContext";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import ProtectedRoute from "@/components/ProtectedRoute";
import RoleDashboard from "@/components/RoleDashboard";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Index from "./pages/Index";
import Settings from "./pages/Settings";
import Calendar from "./pages/Calendar";
import LeaveManagement from "./pages/LeaveManagement";
import Timesheet from "./pages/Timesheet";
import AddTimeEntry from "./pages/AddTimeEntry";
import WhizSpace from "./pages/WhizSpace";
import Policies from "./pages/Policies";
import PolicyDetail  from "./pages/PolicyDetail";
import WhizSports from "./pages/WhizSports";
import Learning from "./pages/Learning";
import WhizNews from "./pages/WhizNews";
import LatestNews from "./pages/LatestNews";
import NotFound from "./pages/NotFound";
import Profile from "./pages/Profile";
import ManageFilesPage from "./pages/ManageFilesPage";
import ViewAllGalleryPage from "./pages/ViewAllGalleryPage";
import AdminCalendar from "./pages/AdminCalendar";
import AdminTimesheetView from "./pages/AdminTimesheetView";
import AdminTimesheetDetailView from "@/pages/AdminTimesheetDetailView";
import AdminLeavesView from "@/pages/AdminLeavesView";
import AdminLeavesViewDetail from '@/pages/AdminLeavesViewDetail';
import EmployeeTimesheetReport from "./pages/EmployeeTimesheetReport";



const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RoleProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                {/* Public routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                
                  {/* Protected routes */}
                  {/* <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} /> */}
                  {/* Protected routes - Role-based dashboard */}
                  <Route path="/" element={<ProtectedRoute><RoleDashboard /></ProtectedRoute>} />
                  <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                  <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                  <Route path="/calendar" element={<ProtectedRoute><Calendar /></ProtectedRoute>} />
                  <Route path="/admin/calendar" element={<ProtectedRoute><AdminCalendar /></ProtectedRoute>} />
                  
                  {/* Admin Leave Management Route */}
                  {/* <Route path="/admin/leaves" element={<ProtectedRoute><RoleBasedAccess allowedRoles={['admin', 'hr']}><AdminLeavesView /></RoleBasedAccess></ProtectedRoute>} /> */}
                  <Route path="/leaves" element={<ProtectedRoute><LeaveManagement /></ProtectedRoute>} />
                  {/* for admin */}
                  <Route path="/admin/leaves" element={<ProtectedRoute><AdminLeavesView /></ProtectedRoute>} />
                  <Route path="/admin/leaves/:employeeId" element={<ProtectedRoute><AdminLeavesViewDetail /></ProtectedRoute>} />

                  <Route path="/timesheet" element={<ProtectedRoute><Timesheet /></ProtectedRoute>} />
                  <Route path="/admin/timesheets" element={<ProtectedRoute><AdminTimesheetView /></ProtectedRoute>} />
                  <Route path="/admin/timesheets/:userId" element={<ProtectedRoute><AdminTimesheetDetailView /></ProtectedRoute>} />
                  <Route path="/add-time-entry" element={<ProtectedRoute><AddTimeEntry /></ProtectedRoute>} />
                  <Route path="/whiz" element={<ProtectedRoute><WhizSpace /></ProtectedRoute>} />
                  <Route path="/whiz/mydocuments" element={<ProtectedRoute><ManageFilesPage /></ProtectedRoute>} />
                  <Route path="/whiz/policies" element={<ProtectedRoute><Policies /></ProtectedRoute>} />
                  <Route path="/whiz/policies/:id" element={<ProtectedRoute><PolicyDetail /></ProtectedRoute>} />
                  <Route path="/whiz/sports" element={<ProtectedRoute><WhizSports /></ProtectedRoute>} />
                  <Route path="/whiz/learning" element={<ProtectedRoute><Learning /></ProtectedRoute>} />
                  <Route path="/whiz/whiznews" element={<ProtectedRoute><WhizNews /></ProtectedRoute>} />
                  <Route path="/whiz/latestnews" element={<ProtectedRoute><LatestNews /></ProtectedRoute>} />
                  <Route path="/whiz/gallery" element={<ProtectedRoute><ViewAllGalleryPage /></ProtectedRoute>} />
                  <Route path="/manage-files" element={<ProtectedRoute><ManageFilesPage /></ProtectedRoute>} />
                  <Route path="/employee-report" element={<ProtectedRoute><EmployeeTimesheetReport /></ProtectedRoute>} />

                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
          </TooltipProvider>
        </RoleProvider> 
      </AuthProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
