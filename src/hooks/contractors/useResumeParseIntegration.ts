import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';
import mammoth from 'mammoth';

// Define types for parsed resume data
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
      
      // Call the Edge Function
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/parse-resume`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify(params)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response from parse-resume:', errorText);
        throw new Error(`Failed to parse resume: ${errorText || response.statusText}`);
      }

      const data = await response.json();
      console.log('Response from parse-resume:', data);
      
      if (!data.parsed) {
        throw new Error('Invalid response format from parse API');
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
      // For DOCX files, extract text in the browser and send directly
      if (file.name.endsWith('.docx')) {
        const buffer = await file.arrayBuffer();
        const { value: text } = await mammoth.extractRawText({ arrayBuffer: buffer });
        return await callParseResume({ text });
      }
      
      // For PDF files, upload to storage first
      else if (file.type === 'application/pdf') {
        // Generate path for the file
        const fileExt = file.name.split('.').pop();
        const filePath = `${crypto.randomUUID()}.${fileExt}`;
        
        // Upload to Supabase storage
        const { error } = await supabase.storage.from('resumes').upload(filePath, file);
        
        if (error) {
          throw error;
        }
        
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
