
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/auth/useAuth';

export default function Index() {
  const { user } = useAuth();
  
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <Navigate to="/login" replace />;
}
