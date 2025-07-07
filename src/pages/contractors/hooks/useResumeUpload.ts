
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

export function useResumeUpload() {
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: "Please upload a PDF or Word document",
          variant: "destructive"
        });
        return;
      }
      
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "File size must be less than 5MB",
          variant: "destructive"
        });
        return;
      }
      
      setResumeFile(file);
    }
  };

  const removeFile = () => {
    setResumeFile(null);
    setUploadProgress(0);
  };

  return {
    resumeFile,
    uploadProgress,
    setUploadProgress,
    handleFileChange,
    removeFile,
  };
}
