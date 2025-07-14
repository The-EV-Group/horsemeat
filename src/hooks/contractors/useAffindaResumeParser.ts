import { useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { parseResumeWithAffinda, ParsedResumeData } from '@/services/affindaService';

export function useAffindaResumeParser() {
  const [parsing, setParsing] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedResumeData | null>(null);
  const { toast } = useToast();

  /**
   * Process a resume file with Affinda
   */
  const parseResume = async (file: File): Promise<ParsedResumeData | null> => {
    try {
      setParsing(true);
      console.log('Processing resume with Affinda:', file.name);

      const parsedData = await parseResumeWithAffinda(file);
      
      // Validate that we have valid data
      const hasValidData = parsedData?.contractor && 
        (parsedData.contractor.full_name || 
         parsedData.contractor.email || 
         parsedData.contractor.phone ||
         parsedData.contractor.summary);
      
      if (!hasValidData) {
        console.warn('No meaningful data extracted from resume');
        toast({
          title: "Limited data extracted",
          description: "The resume was processed but no meaningful information could be extracted. Please fill out the form manually.",
          variant: "default"
        });
        return null;
      }
      
      // Log successful extraction and the keywords found
      console.log('Successfully extracted resume data:', parsedData.contractor);
      
      // Count total keywords from all categories
      const totalKeywords = 
        parsedData.keywords.skills.length +
        parsedData.keywords.industries.length +
        parsedData.keywords.certifications.length + 
        parsedData.keywords.companies.length +
        parsedData.keywords["job titles"].length;
        
      console.log('Extracted keywords:', totalKeywords, 'items');
      console.log('Keywords by category:', {
        skills: parsedData.keywords.skills.length,
        industries: parsedData.keywords.industries.length,
        certifications: parsedData.keywords.certifications.length,
        companies: parsedData.keywords.companies.length,
        "job titles": parsedData.keywords["job titles"].length
      });
      
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

  return {
    parsing,
    parsedData,
    parseResume
  };
}
