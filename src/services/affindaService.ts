import { AffindaAPI, AffindaCredential } from '@affinda/affinda';
import { v4 as uuidv4 } from 'uuid';
import { Database } from '../integrations/supabase/types';

// Define types for our application
export type ContractorData = Database['public']['Tables']['contractor']['Insert'];
export type KeywordData = Database['public']['Tables']['keyword']['Insert'];

// Define interface for extracted keywords
export interface ExtractedKeyword {
  id: string;
  name: string;
  type: string;
}

// Export the parser result interface used in the app
export interface ParsedResumeData {
  contractor: ContractorData;
  keywords: {
    skills: ExtractedKeyword[];
    industries: ExtractedKeyword[];
    certifications: ExtractedKeyword[];
    companies: ExtractedKeyword[];
    "job titles": ExtractedKeyword[];
  };
}

// Define types for Affinda API response structure based on actual API response
interface AffindaDataPoint {
  id: number;
  rectangle?: { x0: number; y0: number; x1: number; y1: number; pageIndex: number };
  rectangles?: { x0: number; y0: number; x1: number; y1: number; pageIndex: number }[];
  document: string;
  pageIndex: number;
  raw: string;
  parsed: string | Record<string, unknown>; // Using more specific type instead of any
  confidence: number | null;
  classificationConfidence: number | null;
  textExtractionConfidence: number | null;
  isVerified: boolean;
  isClientVerified: boolean;
  isAutoVerified: boolean;
  verifiedBy: string | null;
  dataPoint: string | null;
  contentType: string;
  parent: string | null;
}

interface AffindaLocationParsed {
  formatted: string;
  streetNumber: string | null;
  street: string | null;
  apartmentNumber: string | null;
  city: string;
  postalCode: string;
  state: string;
  stateCode: string;
  country: string;
  rawInput: string;
  countryCode: string;
  latitude: number;
  longitude: number;
  poBox: string | null;
}

interface AffindaPhoneNumberParsed {
  rawText: string;
  countryCode: string;
  nationalNumber: string;
  formattedNumber: string;
  internationalCountryCode: number;
}

interface AffindaResumeData {
  summary?: AffindaDataPoint;
  location?: AffindaDataPoint & { parsed?: AffindaLocationParsed };
  fullName?: AffindaDataPoint;
  phoneNumber?: AffindaDataPoint & { parsed?: AffindaPhoneNumberParsed };
  email?: AffindaDataPoint;
  goalsInterests?: AffindaDataPoint;
  skills?: AffindaDataPoint[];
  industries?: AffindaDataPoint[];
  jobTitles?: AffindaDataPoint[];
  certifications?: AffindaDataPoint[] | null;
  companies?: AffindaDataPoint[];
  rawText?: string;
}

// Response from Affinda includes a data object that contains the resume data
interface AffindaResponse {
  data: AffindaResumeData;
  meta: Record<string, unknown>; // Other metadata from Affinda
}

// Get API key, workspace ID, and document type ID from environment variables
const AFFINDA_API_KEY = import.meta.env.VITE_AFFINDA_KEY;
const AFFINDA_WORKSPACE_ID = import.meta.env.VITE_AFFINDA_WORKSPACE_ID;
const AFFINDA_DOCUMENT_TYPE_ID = import.meta.env.VITE_AFFINDA_DOCUMENT_TYPE_ID;

// Validate that required environment variables are set
if (!AFFINDA_API_KEY) {
  console.error('VITE_AFFINDA_KEY environment variable is not set');
}

if (!AFFINDA_WORKSPACE_ID) {
  console.error('VITE_AFFINDA_WORKSPACE_ID environment variable is not set');
}

if (!AFFINDA_DOCUMENT_TYPE_ID) {
  console.error('VITE_AFFINDA_DOCUMENT_TYPE_ID environment variable is not set');
}

// Initialize Affinda client
const credential = new AffindaCredential(AFFINDA_API_KEY);
const client = new AffindaAPI(credential);

/**
 * Parse a resume file using Affinda API
 */
export const parseResumeWithAffinda = async (file: File): Promise<ParsedResumeData> => {
  try {
    // Check file size (Affinda has a 5MB limit)
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB in bytes
    if (file.size > MAX_FILE_SIZE) {
      throw new Error(`File size exceeds the 5MB limit. Please upload a smaller file.`);
    }

    // Create a document with Affinda
    const response = await client.createDocument({
      file,
      workspace: AFFINDA_WORKSPACE_ID, // Use workspace ID from environment variable
      documentType: AFFINDA_DOCUMENT_TYPE_ID, // Use document type ID from environment variable
    });

    // The response from Affinda has a nested data structure
    const responseData = response as unknown as AffindaResponse;
    
    // Map Affinda response to our application's data structure
    return mapAffindaResponseToAppData(responseData.data);
  } catch (error) {
    console.error('Error parsing resume with Affinda:', error);
    throw error;
  }
};

/**
 * Map the Affinda response to our app's data structure
 */
export const mapAffindaResponseToAppData = (resumeData: AffindaResumeData): ParsedResumeData => {
  // Initialize contractor object with Supabase schema field names
  const contractor: ContractorData = {
    // Default values
    travel_anywhere: true, // Default to true for new contractors
    preferred_contact: 'email', // Default contact method
    star_candidate: false, // Default not a star
    available: true, // Default available
    prefers_hourly: true, // Default to hourly
    pay_type: '1099', // Default pay type
  };
  
  // Initialize keywords array with category structure
  const extractedKeywords: {
    skills: ExtractedKeyword[];
    industries: ExtractedKeyword[];
    certifications: ExtractedKeyword[];
    companies: ExtractedKeyword[];
    "job titles": ExtractedKeyword[];
  } = {
    skills: [],
    industries: [],
    certifications: [],
    companies: [],
    "job titles": []
  };

  try {
    // Map name - Supabase uses full_name field
    if (resumeData.fullName) {
      const fullName = typeof resumeData.fullName.parsed === 'string' 
        ? resumeData.fullName.parsed 
        : resumeData.fullName.raw;
      
      if (fullName) {
        contractor.full_name = fullName;
      }
    }

    // Map location details
    if (resumeData.location?.parsed) {
      const locationData = resumeData.location.parsed;
      
      // Map individual location components to Supabase schema fields
      if (locationData.city) contractor.city = locationData.city;
      
      // Use stateCode instead of full state name (NY instead of New York) if available
      if (locationData.stateCode) {
        contractor.state = locationData.stateCode;
        console.log('Using stateCode:', locationData.stateCode);
      } else if (locationData.state) {
        contractor.state = locationData.state;
        console.log('Using state:', locationData.state);
      }
      
      if (locationData.street) contractor.street_address = locationData.street;
      if (locationData.postalCode) contractor.zip_code = locationData.postalCode;
      if (locationData.country) contractor.country = locationData.country;
      
      // Debug logging for location parsing
      console.log('Parsed location data:', {
        city: contractor.city,
        state: contractor.state,
        street_address: contractor.street_address,
        zip_code: contractor.zip_code,
        country: contractor.country
      });
    } else if (resumeData.location?.raw) {
      // Try to extract city and state from raw location if possible
      const locationParts = resumeData.location.raw.split(',').map(part => part.trim());
      console.log('Raw location parts:', locationParts);
      
      if (locationParts.length >= 2) {
        contractor.city = locationParts[0] || '';
        contractor.state = locationParts[1] || '';
        console.log('Extracted from raw location - city:', contractor.city, 'state:', contractor.state);
      } else {
        contractor.city = resumeData.location.raw;
        console.log('Only city extracted from raw location:', contractor.city);
      }
    }

    // Map email
    if (resumeData.email) {
      const emailValue = typeof resumeData.email.parsed === 'string' 
        ? resumeData.email.parsed 
        : resumeData.email.raw;
      
      if (emailValue) {
        contractor.email = emailValue;
      }
    }

    // Map phone number to the Supabase schema field 'phone'
    if (resumeData.phoneNumber) {
      let phoneValue = '';
      
      if (resumeData.phoneNumber.parsed?.formattedNumber) {
        phoneValue = resumeData.phoneNumber.parsed.formattedNumber;
      } else if (resumeData.phoneNumber.parsed?.rawText) {
        phoneValue = resumeData.phoneNumber.parsed.rawText;
      } else {
        phoneValue = resumeData.phoneNumber.raw || '';
      }
      
      // Clean the phone number to match expected format
      // Remove all non-numeric characters to get just the digits
      const digitsOnly = phoneValue.replace(/\D/g, '');
      
      // Store only up to 10 digits as per schema validation
      if (digitsOnly.length >= 10) {
        contractor.phone = digitsOnly.substring(digitsOnly.length - 10);
      } else {
        contractor.phone = digitsOnly;
      }
    }

    // Map summary to the Supabase schema field 'summary'
    if (resumeData.summary) {
      const summaryValue = typeof resumeData.summary.parsed === 'string' 
        ? resumeData.summary.parsed 
        : resumeData.summary.raw;
      
      if (summaryValue) {
        contractor.summary = summaryValue;
      }
    } else if (resumeData.goalsInterests) {
      const summaryValue = typeof resumeData.goalsInterests.parsed === 'string' 
        ? resumeData.goalsInterests.parsed 
        : resumeData.goalsInterests.raw;
      
      if (summaryValue) {
        contractor.summary = summaryValue;
      }
    }

    // Map goals/interests to notes field (or use as fallback for summary if summary is empty)
    if (resumeData.goalsInterests) {
      const goalsValue = typeof resumeData.goalsInterests.parsed === 'string' 
        ? resumeData.goalsInterests.parsed 
        : resumeData.goalsInterests.raw;
      
      if (goalsValue) {
        // If summary is empty, use goals for summary, otherwise put in notes
        if (!contractor.summary) {
          console.log('Using goalsInterests as summary');
          contractor.summary = goalsValue;
        } else {
          console.log('Using goalsInterests as notes');
          contractor.notes = `Goals & Interests:\n${goalsValue}`;
        }
      }
    } else {
      contractor.notes = ''; // Default empty notes
    }

    // Process and map skills to keywords
    console.log('Processing skills:', resumeData.skills ? resumeData.skills.length : 0, 'items');
    if (resumeData.skills && resumeData.skills.length > 0) {
      const skillKeywords = resumeData.skills.map((skill) => {
        // Get the name from either parsed or raw
        const skillName = typeof skill.parsed === 'string' ? skill.parsed : skill.raw;
        console.log('Processing skill:', skillName);
        
        return {
          id: uuidv4(),
          name: skillName || '',
          type: 'skill'
        };
      }).filter(skill => skill.name.trim() !== '');
      
      console.log('Extracted skills:', skillKeywords.length);
      extractedKeywords.skills.push(...skillKeywords);
    }

    // Process and map job titles as keywords
    console.log('Processing job titles:', resumeData.jobTitles ? resumeData.jobTitles.length : 0, 'items');
    if (resumeData.jobTitles && resumeData.jobTitles.length > 0) {
      const jobTitleKeywords = resumeData.jobTitles.map((title) => {
        const titleName = typeof title.parsed === 'string' ? title.parsed : title.raw;
        console.log('Processing job title:', titleName);
        
        return {
          id: uuidv4(),
          name: titleName || '',
          type: 'role'
        };
      }).filter(title => title.name.trim() !== '');
      
      console.log('Extracted job titles:', jobTitleKeywords.length);
      extractedKeywords["job titles"].push(...jobTitleKeywords);
    }

    // Process and map companies/organizations as keywords
    console.log('Processing companies:', resumeData.companies ? resumeData.companies.length : 0, 'items');
    if (resumeData.companies && resumeData.companies.length > 0) {
      const companyKeywords = resumeData.companies.map((company) => {
        const companyName = typeof company.parsed === 'string' ? company.parsed : company.raw;
        console.log('Processing company:', companyName);
        
        return {
          id: uuidv4(),
          name: companyName || '',
          type: 'organization'
        };
      }).filter(company => company.name.trim() !== '');
      
      console.log('Extracted companies:', companyKeywords.length);
      extractedKeywords.companies.push(...companyKeywords);
    }
    
    // Process and map industries as keywords
    console.log('Processing industries:', resumeData.industries ? resumeData.industries.length : 0, 'items');
    if (resumeData.industries && resumeData.industries.length > 0) {
      const industryKeywords = resumeData.industries.map((industry) => {
        const industryName = typeof industry.parsed === 'string' ? industry.parsed : industry.raw;
        console.log('Processing industry:', industryName);
        
        return {
          id: uuidv4(),
          name: industryName || '',
          type: 'industry'
        };
      }).filter(industry => industry.name.trim() !== '');
      
      console.log('Extracted industries:', industryKeywords.length);
      extractedKeywords.industries.push(...industryKeywords);
    }
    
    // Check if we have certifications (not present in the sample JSON, but handle if added later)
    if (resumeData.certifications && resumeData.certifications.length > 0) {
      console.log('Processing certifications:', resumeData.certifications.length, 'items');
      const certificationKeywords = resumeData.certifications.map((cert) => {
        const certName = typeof cert.parsed === 'string' ? cert.parsed : cert.raw;
        return {
          id: uuidv4(),
          name: certName || '',
          type: 'certification'
        };
      }).filter(cert => cert.name.trim() !== '');
      
      console.log('Extracted certifications:', certificationKeywords.length);
      extractedKeywords.certifications.push(...certificationKeywords);
    }

    // Debug log the extracted keywords
    console.log('Extracted keywords:', extractedKeywords);

    // Create and return the ParsedResumeData object
    return {
      contractor,
      keywords: extractedKeywords
    };
  } catch (error) {
    console.error('Error mapping Affinda response to app data:', error);
    // Return an empty object with required structure to avoid errors
    return {
      contractor: {
        travel_anywhere: true,
        preferred_contact: 'email',
        star_candidate: false,
        available: true,
        prefers_hourly: true,
        pay_type: '1099',
      },
      keywords: {
        skills: [],
        industries: [],
        certifications: [],
        companies: [],
        "job titles": []
      }
    };
  }
};
