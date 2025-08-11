import { useAuth } from '@/contexts/AuthContext';
import { LoadingState } from '@/components/ui/loading-spinner';
import Index from '@/pages/Index';
import IndexAdmin from '@/pages/IndexAdmin';

const RoleDashboard: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingState message="Loading dashboard..." />;
  }

  if (!user) {
    return <LoadingState message="Loading user data..." />;
  }

  // Determine which dashboard to show based on user role
  const isAdmin = user.role === 'admin' || user.role === 'hr';
  
  console.log('User role:', user.role, 'Is Admin:', isAdmin);

  // Show admin dashboard for admin and hr roles
  if (isAdmin) {
    return <IndexAdmin />;
  }

  // Show employee dashboard for all other roles
  return <Index />;
};

export default RoleDashboard;
