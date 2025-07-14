import { useEffect } from 'react';
import { ContractorProfile } from "@/components/contractors/ContractorProfile";
import { useParams, useNavigate, useLocation } from 'react-router-dom';

export default function ContractorProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  // Get returnToPath from location state if available
  const returnToPath = location.state?.returnPath;
  
  // Use useEffect to log navigation state for debugging
  useEffect(() => {
    console.log('ContractorProfilePage mounted with state:', {
      id,
      returnToPath,
      locationState: location.state
    });
  }, [id, returnToPath, location.state]);
  
  // Handler for closing profile - goes back to previous page
  const handleClose = () => {
    console.log('Closing contractor profile, navigating to:', returnToPath || 'history back');
    
    if (returnToPath) {
      // Use replace: true to avoid adding to the history stack
      navigate(returnToPath, { replace: true });
    } else {
      // If no return path specified, go back in history
      navigate(-1);
    }
  };

  if (!id) {
    return <div>Contractor ID is required</div>;
  }

  return (
    <ContractorProfile
      contractorId={id}
      onClose={handleClose}
    />
  );
}
