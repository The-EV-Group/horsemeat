
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';

export function useResumeUpload() {
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState('');
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
    setUploadedUrl('');
  };

  const uploadFile = async (file: File): Promise<string> => {
    try {
      setUploading(true);
      setUploadProgress(0);
      
      // Generate a random UUID for the file name
      const fileExt = file.name.split('.').pop();
      const filePath = `${crypto.randomUUID()}.${fileExt}`;
      
      // Upload the file to Supabase storage
      const { error } = await supabase.storage.from('resumes').upload(filePath, file, {
        // Handle progress manually since onUploadProgress isn't available in the type
        // We'll set progress to 50% when upload starts and 100% when complete
      });
      
      // Set progress to 100% when upload completes
      setUploadProgress(100);
      
      if (error) {
        throw error;
      }
      
      // Get a signed URL for the uploaded file (valid for 30 days)
      const { data } = await supabase.storage
        .from('resumes')
        .createSignedUrl(filePath, 60 * 60 * 24 * 30);
      
      if (!data) {
        throw new Error('Failed to generate signed URL');
      }
      
      setUploadedUrl(data.signedUrl);
      return data.signedUrl;
    } catch (error) {
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload resume",
        variant: "destructive"
      });
      return '';
    } finally {
      setUploading(false);
    }
  };

  return {
    resumeFile,
    uploadProgress,
    uploading,
    uploadedUrl,
    handleFileChange,
    removeFile,
    uploadFile
  };
}
