import { v4 as uuidv4 } from 'uuid';
import { 
  AffindaResumeData, 
  ParsedResumeData, 
  ExtractedKeyword, 
  ContractorData,
  AffindaLocationParsed
} from './affindaTypes';

/**
 * Split keywords into individual keywords with improved handling
 * @param text The text to split
 * @param type The keyword type
 * @returns Array of keyword objects
 */
export function splitKeywords(text: string, type: string): ExtractedKeyword[] {
  if (!text) return [];
  
  // First try to split by common delimiters
  let items: string[];
  
  // Check for common delimiters in order of preference
  if (text.includes(',')) {
    items = text.split(',');
  } else if (text.includes(';')) {
    items = text.split(';');
  } else if (text.includes('•')) {
    items = text.split('•');
  } else if (text.includes('|')) {
    items = text.split('|');
  } else if (text.includes('/')) {
    items = text.split('/');
  } else {
    // Try to split by capitalized words pattern if there are no commas
    // This regex splits text like "JavaReactNodeJS" into ["Java", "React", "NodeJS"]
    const capitalWordSplitRegex = /([A-Z][a-z]+)(?=[A-Z])/g;
    if (/[a-z][A-Z]/.test(text)) { // Test if there's a lowercase followed by uppercase
      items = text.replace(capitalWordSplitRegex, '$1,').split(',');
    } else {
      // Only split on spaces in very specific cases (comma-separated list without commas)
      if (text.includes(' and ') || text.includes(' + ') || text.includes(' & ')) {
        // Split on conjunction indicators and clean up
        items = text
          .replace(/ and /gi, ',')
          .replace(/ \+ /g, ',')
          .replace(/ & /g, ',')
          .split(',');
      } else {
        // Keep the keyword as is - don't split on spaces
        items = [text];
      }
    }
  }
  
  console.log(`Split "${text}" into ${items.length} items:`, items);
  
  return items
    .map(item => item.trim())
    .filter(item => item.length > 0)
    .map(item => ({
      id: uuidv4(),
      name: cleanKeywordName(item), // Use cleanKeywordName for consistent cleaning
      type
    }));
}

/**
 * Clean and format a keyword name
 * @param text The text to clean
 * @returns Cleaned keyword text
 */
export function cleanKeywordName(text: string): string {
  if (!text) return '';
  
  return text.trim()
    .replace(/,$/, '') // Remove trailing comma
    .replace(/^\w/, c => c.toUpperCase()); // Capitalize first letter
}

/**
 * Process location data from Affinda response
 * @param contractor The contractor object to update
 * @param locationData The location data from Affinda
 */
/**
 * Clean phone numbers to just digits
 * @param phoneNumber The phone number to clean
 * @returns Phone number with only digits
 */
export function cleanPhoneNumber(phoneNumber: string): string {
  if (!phoneNumber) return '';
  
  // Remove all non-digit characters
  return phoneNumber.replace(/\D/g, '');
}

/**
 * Clean street address to remove phone numbers
 * @param streetAddress The address to clean
 * @returns Cleaned street address
 */
export function cleanStreetAddress(streetAddress: string): string {
  if (!streetAddress) return '';
  
  // Remove common phone number patterns (digits with optional formatting characters)
  // This matches phone numbers like (123) 456-7890, 123-456-7890, +1 123 456 7890, etc.
  return streetAddress
    .replace(/\+?\d{1,3}?[\s.-]?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g, '')
    .replace(/\(\d+\)/, '') // Remove any remaining parenthesized numbers
    .replace(/\s{2,}/g, ' ') // Replace multiple spaces with a single space
    .trim();
}

/**
 * Process location data from Affinda response
 * @param contractor The contractor object to update
 * @param locationData The location data from Affinda
 */
export function processLocationData(contractor: ContractorData, resumeLocation: AffindaResumeData['location']): void {
  if (!resumeLocation) return;
  
  console.log('Processing location data:', JSON.stringify(resumeLocation, null, 2));
  
  // Handle when parsed is available as an object
  if (resumeLocation.parsed && typeof resumeLocation.parsed === 'object') {
    const parsedLocation = resumeLocation.parsed as AffindaLocationParsed;
    console.log('Using parsed location data:', JSON.stringify(parsedLocation, null, 2));
    
    // Extract city (preserve multi-word city names like 'Gilmanton Iron Works')
    if (parsedLocation.city) {
      contractor.city = parsedLocation.city.trim();
      console.log('Using city from parsed location:', contractor.city);
    }
    
    // Extract state - prefer stateCode when available
    if (parsedLocation.stateCode) {
      contractor.state = parsedLocation.stateCode;
      console.log('Using stateCode:', parsedLocation.stateCode);
    } else if (parsedLocation.state) {
      contractor.state = parsedLocation.state;
      console.log('Using state:', parsedLocation.state);
    }
    
    // Extract zip code
    if (parsedLocation.postalCode) {
      contractor.zip_code = parsedLocation.postalCode;
    }
    
    // Extract country
    if (parsedLocation.country) {
      contractor.country = parsedLocation.country;
    }
    
    // Extract street address - try multiple approaches
    if (parsedLocation.street) {
      // Direct street field is available
      // Clean the street field to remove potential phone numbers
      let streetAddress = parsedLocation.street.trim();
      streetAddress = cleanStreetAddress(streetAddress);
      
      // Check if the street already contains the street number
      const containsStreetNumber = parsedLocation.streetNumber && 
                                 streetAddress.startsWith(parsedLocation.streetNumber);
      
      // If street number is available and not already in the street name, prepend it
      if (parsedLocation.streetNumber && !containsStreetNumber) {
        contractor.street_address = `${parsedLocation.streetNumber} ${streetAddress}`;
        console.log('Using street number + street field (cleaned):', contractor.street_address);
      } else {
        // Street already contains the number or no street number available
        contractor.street_address = streetAddress;
        console.log('Using street field only (cleaned):', contractor.street_address);
      }
    } else {
      // Build from components
      const addressParts = [];
      
      if (parsedLocation.streetNumber) {
        addressParts.push(parsedLocation.streetNumber);
      }
      
      if (parsedLocation.street) {
        addressParts.push(parsedLocation.street);
      }
      
      if (parsedLocation.apartmentNumber) {
        addressParts.push(`Apt ${parsedLocation.apartmentNumber}`);
      }
      
      if (addressParts.length > 0) {
        contractor.street_address = addressParts.join(' ').trim();
        console.log('Built street address from components:', contractor.street_address);
      } else if (parsedLocation.formatted) {
        // Try to extract from formatted address
        const formattedParts = parsedLocation.formatted.split(',');
        if (formattedParts.length > 0) {
          contractor.street_address = formattedParts[0].trim();
          console.log('Using first part of formatted address:', contractor.street_address);
        }
      }
    }
    
    // Last resort: try rawInput if no street address set
    if (!contractor.street_address && parsedLocation.rawInput) {
      const rawParts = parsedLocation.rawInput.split(',');
      if (rawParts.length > 0) {
        contractor.street_address = rawParts[0].trim();
        console.log('Using first part of rawInput:', contractor.street_address);
      }
    }
  } else if (resumeLocation.raw) {
    // No parsed data, try to use raw data
    console.log('No parsed location data, using raw:', resumeLocation.raw);
    
    const rawAddressParts = resumeLocation.raw.split(',');
    if (rawAddressParts.length >= 3) {
      // Assume format: "street, city, state zip"
      contractor.street_address = rawAddressParts[0].trim();
      contractor.city = rawAddressParts[1].trim();
      
      // Try to extract state and zip from the last part
      const stateZipPart = rawAddressParts[2].trim();
      const stateZipMatch = stateZipPart.match(/([A-Z]{2})\s+(\d{5}(-\d{4})?)/);
      
      if (stateZipMatch) {
        contractor.state = stateZipMatch[1];
        contractor.zip_code = stateZipMatch[2];
      } else {
        contractor.state = stateZipPart;
      }
    }
  }
  
  console.log('Final location data:', {
    street_address: contractor.street_address || 'NOT SET',
    city: contractor.city || 'NOT SET',
    state: contractor.state || 'NOT SET',
    zip_code: contractor.zip_code || 'NOT SET',
    country: contractor.country || 'NOT SET'
  });
}

/**
 * Map the Affinda response to our app's data structure
 */
export const mapAffindaResponseToAppData = (resumeData: AffindaResumeData): ParsedResumeData => {
  // Initialize contractor object with default values
  const contractor: ContractorData = {
    travel_anywhere: true,
    preferred_contact: 'email',
    star_candidate: false,
    available: true,
    prefers_hourly: true,
    pay_type: '1099',
  };
  
  // Initialize keywords array with category structure
  const extractedKeywords: ParsedResumeData['keywords'] = {
    skills: [],
    industries: [],
    certifications: [],
    companies: [],
    "job titles": []
  };
  
  try {
    // Extract full name
    if (resumeData.fullName) {
      const fullName = typeof resumeData.fullName.parsed === 'string' 
        ? resumeData.fullName.parsed 
        : resumeData.fullName.raw;
      
      if (fullName) {
        contractor.full_name = fullName;
      }
    }
    
    // Process location data
    if (resumeData.location) {
      processLocationData(contractor, resumeData.location);
    }
    
    // Extract phone number
    if (resumeData.phoneNumber) {
      if (resumeData.phoneNumber.parsed && typeof resumeData.phoneNumber.parsed === 'object') {
        const parsedPhone = resumeData.phoneNumber.parsed;
        // Use nationalNumber if available, otherwise use formattedNumber or raw as fallback
        const phoneString = String(parsedPhone.nationalNumber || parsedPhone.formattedNumber || resumeData.phoneNumber.raw || '');
        // Strip all non-digit characters to get clean digits
        contractor.phone = cleanPhoneNumber(phoneString);
      } else if (resumeData.phoneNumber.raw) {
        // Strip all non-digit characters from raw phone
        contractor.phone = cleanPhoneNumber(String(resumeData.phoneNumber.raw));
      }
      console.log('Extracted phone (digits only):', contractor.phone);
    }
    
    // Extract email
    if (resumeData.email) {
      contractor.email = resumeData.email.raw;
    }
    
    // Extract professional summary (maps to contractor.summary)
    if (resumeData.summary && resumeData.summary.raw) {
      contractor.summary = resumeData.summary.raw.trim();
      console.log('Using summary for contractor.summary:', contractor.summary);
    }
    
    // Extract goals/interests (maps to contractor.notes)
    if (resumeData.goalsInterests && resumeData.goalsInterests.raw) {
      contractor.notes = resumeData.goalsInterests.raw.trim();
      console.log('Using goalsInterests for contractor.notes:', contractor.notes);
      
      // If no summary was found, also use goals as the summary
      if (!contractor.summary) {
        contractor.summary = resumeData.goalsInterests.raw.trim();
        console.log('Using goalsInterests as fallback for contractor.summary');
      }
    }
    
    // Extract skills
    if (resumeData.skills && resumeData.skills.length > 0) {
      console.log('Processing skills:', resumeData.skills.length, 'items', JSON.stringify(resumeData.skills, null, 2));
      
      resumeData.skills.forEach(skill => {
        // Handle different forms of skill data
        let skillName = '';
        if (skill.parsed !== undefined) {
          skillName = typeof skill.parsed === 'string' ? skill.parsed : skill.raw || '';
        } else if (skill.raw) {
          skillName = skill.raw;
        } else if (typeof skill === 'string') {
          skillName = skill;
        }
        
        console.log(`Processing skill: "${skillName}"`);
        
        if (!skillName) return; // Skip empty skills
        
        // Always use the enhanced splitKeywords function to handle different delimiter patterns
        const splitSkills = splitKeywords(skillName, 'skill');
        // Always add the split skills regardless of count
        console.log(`Processing skill "${skillName}" into ${splitSkills.length} parts:`, 
          splitSkills.map(s => s.name).join(', '));
        extractedKeywords.skills.push(...splitSkills);
      });
      
      console.log('Extracted skills:', extractedKeywords.skills.length, extractedKeywords.skills.map(s => s.name));
    }
    
    // Extract job titles
    if (resumeData.jobTitles && resumeData.jobTitles.length > 0) {
      console.log('Processing job titles:', resumeData.jobTitles.length, 'items');
      
      resumeData.jobTitles.forEach(jobTitle => {
        const titleName = typeof jobTitle.parsed === 'string' ? jobTitle.parsed : jobTitle.raw;
        
        if (!titleName) return; // Skip empty job titles
        
        // Always use the enhanced splitKeywords function to handle different delimiter patterns
        const splitTitles = splitKeywords(titleName, 'job title');
        console.log(`Processing job title "${titleName}" into ${splitTitles.length} parts:`, 
          splitTitles.map(s => s.name).join(', '));
        extractedKeywords["job titles"].push(...splitTitles);
      });
      
      console.log('Extracted job titles:', extractedKeywords["job titles"].length);
    }
    
    // Extract companies
    if (resumeData.companies && resumeData.companies.length > 0) {
      console.log('Processing companies:', resumeData.companies.length, 'items');
      
      resumeData.companies.forEach(company => {
        const companyName = typeof company.parsed === 'string' ? company.parsed : company.raw;
        
        if (!companyName) return; // Skip empty companies
        
        // Always use the enhanced splitKeywords function to handle different delimiter patterns
        const splitCompanies = splitKeywords(companyName, 'company');
        console.log(`Processing company "${companyName}" into ${splitCompanies.length} parts:`, 
          splitCompanies.map(s => s.name).join(', '));
        extractedKeywords.companies.push(...splitCompanies);
      });
      
      console.log('Extracted companies:', extractedKeywords.companies.length);
    }
    
    // Extract industries
    if (resumeData.industries && resumeData.industries.length > 0) {
      console.log('Processing industries:', resumeData.industries.length, 'items');
      
      resumeData.industries.forEach(industry => {
        const industryName = typeof industry.parsed === 'string' ? industry.parsed : industry.raw;
        
        if (!industryName) return; // Skip empty industries
        
        // Always use the enhanced splitKeywords function to handle different delimiter patterns
        const splitIndustries = splitKeywords(industryName, 'industry');
        console.log(`Processing industry "${industryName}" into ${splitIndustries.length} parts:`, 
          splitIndustries.map(s => s.name).join(', '));
        extractedKeywords.industries.push(...splitIndustries);
      });
      
      console.log('Extracted industries:', extractedKeywords.industries.length);
    }
    
    // Extract certifications
    if (resumeData.certifications && resumeData.certifications.length > 0) {
      console.log('Processing certifications:', resumeData.certifications.length, 'items');
      
      resumeData.certifications.forEach(cert => {
        const certName = typeof cert.parsed === 'string' ? cert.parsed : cert.raw;
        
        if (!certName) return; // Skip empty certifications
        
        // Always use the enhanced splitKeywords function to handle different delimiter patterns
        const splitCerts = splitKeywords(certName, 'certification');
        console.log(`Processing certification "${certName}" into ${splitCerts.length} parts:`, 
          splitCerts.map(s => s.name).join(', '));
        extractedKeywords.certifications.push(...splitCerts);
      });
      
      console.log('Extracted certifications:', extractedKeywords.certifications.length);
    }
    
    // Debug log the extracted keywords
    console.log('Extracted keywords:', extractedKeywords);
    
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
