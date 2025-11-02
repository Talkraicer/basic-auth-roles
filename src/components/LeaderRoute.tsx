import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';
import { toast } from 'sonner';

interface LeaderRouteProps {
  children: React.ReactNode;
}

export const LeaderRoute = ({ children }: LeaderRouteProps) => {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user && user.role !== 'leader') {
      toast.error('Access denied: Leaders only');
    }
  }, [loading, user]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (user.role !== 'leader') {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};
