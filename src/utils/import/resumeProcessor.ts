import { supabase } from '@/lib/supabase';

/**
 * Downloads a resume from the source URL and uploads it to Supabase storage
 */
export async function processResume(url: string | null, contractorName: string): Promise<string | null> {
  if (!url) return null;
  
  try {
    console.log(`Processing resume for ${contractorName}...`);
    
    // Check if the URL is valid
    if (!url.startsWith('http')) {
      console.warn(`Invalid resume URL for ${contractorName}: ${url}`);
      return null;
    }
    
    // For the MVP, we'll just store the original URL instead of downloading and re-uploading
    // This simplifies the process and avoids potential issues with cross-origin requests
    // In a production environment, we would download and re-upload the files
    
    console.log(`Using original resume URL: ${url}`);
    return url;
    
    /* 
    // The following code would be used in production to download and re-upload resumes
    // But for the MVP, we'll just use the original URLs
    
    // Download the resume
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to download resume: ${response.statusText}`);
    
    const blob = await response.blob();
    
    // Generate a safe filename
    const fileExtension = url.toLowerCase().endsWith('.pdf') ? 'pdf' : 'docx';
    const safeFileName = `${contractorName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_resume.${fileExtension}`;
    
    // Check if the resumes bucket exists, create it if it doesn't
    const { data: buckets } = await supabase.storage.listBuckets();
    const resumesBucketExists = buckets?.some(bucket => bucket.name === 'resumes');
    
    if (!resumesBucketExists) {
      console.log('Creating resumes bucket...');
      const { error: bucketError } = await supabase.storage.createBucket('resumes', {
        public: true
      });
      
      if (bucketError) {
        console.error('Error creating resumes bucket:', bucketError);
        throw bucketError;
      }
    }
    
    // Upload to Supabase storage
    const { data, error } = await supabase.storage
      .from('resumes')
      .upload(`contractors/${safeFileName}`, blob, {
        contentType: fileExtension === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        upsert: true
      });
    
    if (error) throw error;
    
    // Get the public URL
    const { data: urlData } = supabase.storage
      .from('resumes')
      .getPublicUrl(`contractors/${safeFileName}`);
    
    return urlData.publicUrl;
    */
  } catch (error) {
    console.error(`Error processing resume for ${contractorName}:`, error);
    return null;
  }
}