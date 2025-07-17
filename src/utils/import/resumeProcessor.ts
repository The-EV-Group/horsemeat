import { supabase, supabaseAdmin } from '@/lib/supabase';
import fetch from 'node-fetch';

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
    
    // Use supabaseAdmin if available (Node.js environment), otherwise fall back to regular client
    const client = typeof supabaseAdmin === 'object' && supabaseAdmin !== null ? supabaseAdmin : supabase;
    
    // Download the resume
    console.log(`Downloading resume from: ${url}`);
    const response = await fetch(url);
    if (!response.ok) {
      console.warn(`Failed to download resume: ${response.statusText}`);
      return url; // Fall back to original URL if download fails
    }
    
    // Get the file content as an ArrayBuffer
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Determine file type from URL or content-type
    let fileExtension = 'pdf'; // Default to PDF
    const contentType = response.headers.get('content-type');
    
    if (url.toLowerCase().endsWith('.docx') || contentType?.includes('officedocument.wordprocessingml.document')) {
      fileExtension = 'docx';
    } else if (url.toLowerCase().endsWith('.doc') || contentType?.includes('msword')) {
      fileExtension = 'doc';
    }
    
    // Generate a safe filename with timestamp to avoid collisions
    const timestamp = new Date().getTime();
    const safeFileName = `${contractorName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${timestamp}.${fileExtension}`;
    const filePath = `contractors/${safeFileName}`;
    
    console.log(`Generated safe filename: ${filePath}`);
    
    // Check if the resumes bucket exists, create it if it doesn't
    try {
      const { data: buckets } = await client.storage.listBuckets();
      const resumesBucketExists = buckets?.some(bucket => bucket.name === 'resumes');
      
      if (!resumesBucketExists) {
        console.log('Creating resumes bucket...');
        const { error: bucketError } = await client.storage.createBucket('resumes', {
          public: true
        });
        
        if (bucketError) {
          console.error('Error creating resumes bucket:', bucketError);
          throw bucketError;
        }
      }
    } catch (error) {
      console.error('Error checking/creating bucket:', error);
      // Continue anyway, the bucket might already exist
    }
    
    // Upload to Supabase storage
    console.log(`Uploading resume to Supabase storage...`);
    const { data, error } = await client.storage
      .from('resumes')
      .upload(filePath, buffer, {
        contentType: fileExtension === 'pdf' 
          ? 'application/pdf' 
          : fileExtension === 'docx'
            ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            : 'application/msword',
        upsert: true
      });
    
    if (error) {
      console.error('Error uploading resume:', error);
      return url; // Fall back to original URL if upload fails
    }
    
    // Get the public URL
    const { data: urlData } = client.storage
      .from('resumes')
      .getPublicUrl(filePath);
    
    console.log(`Resume uploaded successfully. Public URL: ${urlData.publicUrl}`);
    return urlData.publicUrl;
  } catch (error) {
    console.error(`Error processing resume for ${contractorName}:`, error);
    // Fall back to original URL if any error occurs
    return url;
  }
}