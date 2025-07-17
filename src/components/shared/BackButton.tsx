import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

interface BackButtonProps {
  returnToPath?: string;
  onBack?: () => void;
  label?: string;
  className?: string;
}

export function BackButton({ returnToPath, onBack, label = 'Back', className }: BackButtonProps) {
  const navigate = useNavigate();
  
  const handleBack = () => {
    if (onBack) {
      // Use the provided callback if available
      onBack();
    } else if (returnToPath) {
      // Navigate to the specified return path
      navigate(returnToPath, { replace: true });
    } else {
      // Try to get the last path from localStorage
      const lastPath = localStorage.getItem('lastPath');
      if (lastPath && lastPath !== window.location.pathname) {
        navigate(lastPath);
      } else {
        // If no stored path or it's the same as current, go back in history
        navigate(-1);
      }
    }
  };
  
  return (
    <Button 
      variant="ghost" 
      onClick={handleBack}
      className={className}
      size="sm"
    >
      <ArrowLeft className="h-4 w-4 mr-2" />
      {label}
    </Button>
  );
}