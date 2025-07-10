import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';
import mammoth from 'mammoth';

// Define types for parsed resume data - aligned with form schema
export interface ParsedResumeData {
  contractor: {
    full_name?: string;
    email?: string;
    phone?: string;
    city?: string;
    state?: string;
    summary?: string;
    notes?: string;
  };
  keywords: {
    skills: { id: string | null; name: string }[];
    industries: { id: string | null; name: string }[];
    certifications: { id: string | null; name: string }[];
    companies: { id: string | null; name: string }[];
    'job titles': { id: string | null; name: string }[];
  };
}

interface ParsedResponse {
  parsed: ParsedResumeData;
  error?: string;
}

export function useResumeParseIntegration() {
  const [parsing, setParsing] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedResumeData | null>(null);
  const { toast } = useToast();

  /**
   * Calls the Edge Function to parse a resume
   */
  const callParseResume = async (params: { text: string } | { bucket: string; path: string }): Promise<ParsedResumeData | null> => {
    try {
      setParsing(true);

      console.log('Calling parse-resume with params:', params);
      
      const { data, error } = await supabase.functions.invoke('parse-resume', {
        body: params
      });

      if (error) {
        console.error('Error response from parse-resume:', error);
        throw new Error(`Failed to parse resume: ${error.message}`);
      }

      console.log('Response from parse-resume:', data);
      
      // Check if there's an error in the response
      if (data.error) {
        throw new Error(data.error);
      }
      
      if (!data.parsed) {
        throw new Error('Invalid response format from parse API');
      }
      
      // Validate that we have valid data
      const hasValidData = data.parsed.contractor && 
        (data.parsed.contractor.full_name || 
         data.parsed.contractor.email || 
         data.parsed.contractor.phone ||
         data.parsed.contractor.summary);
      
      if (!hasValidData) {
        console.warn('No meaningful data extracted from resume');
        toast({
          title: "Limited data extracted",
          description: "The resume was processed but no meaningful information could be extracted. Please fill out the form manually.",
          variant: "default"
        });
        return null;
      }
      
      setParsedData(data.parsed);
      return data.parsed;
    } catch (error) {
      console.error('Error parsing resume:', error);
      toast({
        title: "Resume parsing failed",
        description: error instanceof Error ? error.message : "Failed to parse resume content",
        variant: "destructive"
      });
      return null;
    } finally {
      setParsing(false);
    }
  };

  /**
   * Processes a resume file - either uploads PDF to storage and calls parse API
   * or extracts text from DOCX locally and sends it directly
   */
  const processResumeFile = async (file: File): Promise<ParsedResumeData | null> => {
    try {
      console.log('Processing file:', file.name, 'Type:', file.type);
      
      // For DOCX files, extract text in the browser and send directly
      if (file.name.toLowerCase().endsWith('.docx') || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        console.log('Processing DOCX file');
        const buffer = await file.arrayBuffer();
        const { value: text } = await mammoth.extractRawText({ arrayBuffer: buffer });
        console.log('Extracted text length:', text.length);
        return await callParseResume({ text });
      }
      
      // For PDF files, upload to storage first
      else if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        console.log('Processing PDF file');
        // Generate path for the file
        const fileExt = file.name.split('.').pop();
        const filePath = `${crypto.randomUUID()}.${fileExt}`;
        
        console.log('Uploading to storage:', filePath);
        
        // Upload to Supabase storage
        const { error } = await supabase.storage.from('resumes').upload(filePath, file);
        
        if (error) {
          console.error('Storage upload error:', error);
          throw error;
        }
        
        console.log('File uploaded, parsing...');
        // Call the parse resume function with bucket and path
        return await callParseResume({ bucket: 'resumes', path: filePath });
      } else {
        throw new Error('Unsupported file type. Please upload a PDF or DOCX file.');
      }
    } catch (error) {
      console.error('Error processing resume:', error);
      toast({
        title: "Resume processing failed",
        description: error instanceof Error ? error.message : "Failed to process resume",
        variant: "destructive"
      });
      return null;
    }
  };

  return {
    parsing,
    parsedData,
    processResumeFile,
    callParseResume
  };
}
