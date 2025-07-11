import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';
import mammoth from 'mammoth';

// Define extended mammoth options type
interface ExtendedMammothOptions {
  arrayBuffer: ArrayBuffer;
  styleMap?: string[];
  preserveEmptyParagraphs?: boolean;
  includeDefaultStyleMap?: boolean;
}

// Define types for parsed resume data - aligned with form schema
// Matching the structure exported by the Edge Function
export interface ParsedResumeData {
  contractor: {
    full_name: string;
    email: string;
    phone: string;
    city: string;
    state: string;
    summary: string;
    notes: string;
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

// Text normalization helper - must match the Edge Function implementation
function normalizeText(text: string): string {
  return text
    .replace(/^Page \d+( of \d+)?$/gm, "") // Remove page numbers
    .replace(/^\d+\/\d+\/\d{2,4}$/gm, "") // Remove dates
    .replace(/\n{3,}/g, "\n\n") // Normalize multiple line breaks
    .replace(/[ \t]{2,}/g, " ") // Normalize multiple spaces
    .replace(/[□■○●☐☑☒]/g, "") // Remove form field markers
    .replace(/(\w+)-\s*\n\s*(\w+)/g, "$1$2") // Join hyphenated words across lines
    .replace(/^[\s•\-*⁃⦁⦾⦿⧆⧇⏺]+/gm, "- ") // Standardize bullet points
    .replace(/\s+/g, " ") // Normalize all whitespace
    .replace(/\n\s*\n/g, "\n\n") // Normalize paragraph breaks
    .trim(); // Remove trailing/leading whitespace
}

export function useResumeParseIntegration() {
  const [parsing, setParsing] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedResumeData | null>(null);
  const { toast } = useToast();

  /**
   * Calls the Edge Function to parse a resume
   */
  const callParseResume = async (params: { text: string } | { bucket: string; path: string }): Promise<ParsedResumeData | null> => {
    // Remove client-side truncation - rely on edge function instead
    // We'll only log the size for debugging purposes
    if ('text' in params && params.text) {
      console.log(`Text length being sent to edge function: ${params.text.length} chars`);
    }
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
      
      // Apply regex fallbacks for email and phone if they're missing
      const parsedData = data.parsed;
      const rawText = 'text' in params ? params.text : '';
      
      // If email is missing, try to extract it with regex
      if (!parsedData.contractor.email?.trim() && rawText) {
        const emailRegex = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
        const emailMatch = rawText.match(emailRegex);
        if (emailMatch) {
          console.log('Found email with regex fallback:', emailMatch[0]);
          parsedData.contractor.email = emailMatch[0];
        }
      }
      
      // If phone is missing, try to extract it with regex
      if (!parsedData.contractor.phone?.trim() && rawText) {
        const phoneRegex = /\+?\d{1,2}?[-.\s]?(\d{3}[-.\s]?){2}\d{4}/;
        const phoneMatch = rawText.match(phoneRegex);
        if (phoneMatch) {
          console.log('Found phone with regex fallback:', phoneMatch[0]);
          parsedData.contractor.phone = phoneMatch[0];
        }
      }
      
      setParsedData(parsedData);
      return parsedData;
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
        
        // Use HTML conversion first to preserve structure (headings, lists, paragraphs)
        const result = await mammoth.convertToHtml({
          arrayBuffer: buffer,
          // Preserve formatting and structure
          styleMap: [
            "p[style-name='Heading 1'] => h1:fresh",
            "p[style-name='Heading 2'] => h2:fresh",
            "p[style-name='Heading 3'] => h3:fresh",
            "p[style-name='Heading 4'] => h4:fresh",
            "p[style-name='List Paragraph'] => p:fresh"
          ]
        } as ExtendedMammothOptions);
        
        // Convert HTML to plain text while preserving structure
        const htmlString = result.value;
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlString, 'text/html');
        
        // Process text nodes with proper paragraph breaks
        let plainText = '';
        const processNode = (node: Node) => {
          if (node.nodeType === Node.TEXT_NODE) {
            plainText += node.textContent;
          } else if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element;
            // Add paragraph breaks for block elements
            if (['P', 'DIV', 'LI', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(element.tagName)) {
              if (plainText.length > 0 && !plainText.endsWith('\n\n')) {
                plainText += '\n\n';
              }
            }
            // Handle list items - let the edge function normalize bullet points
            // No manual bullet prefix needed
            // Process child nodes
            node.childNodes.forEach(processNode);
            // Add extra paragraph break after block elements
            if (['P', 'DIV', 'LI', 'UL', 'OL', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(element.tagName)) {
              if (!plainText.endsWith('\n\n')) {
                plainText += '\n\n';
              }
            }
          } else {
            node.childNodes.forEach(processNode);
          }
        };
        
        processNode(doc.body);
        
        // Apply the same normalization that the Edge Function uses for PDFs
        const normalizedText = normalizeText(plainText);
        console.log('Extracted text length:', normalizedText.length);
        
        // Log a sample of the extracted text for debugging
        if (normalizedText.length > 0) {
          console.log('Normalized DOCX text preview:', normalizedText.substring(0, 200) + '...');
        }
        
        return await callParseResume({ text: normalizedText });
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
