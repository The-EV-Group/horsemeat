import { v4 as uuidv4 } from 'uuid';
import { 
  AffindaResumeData, 
  ParsedResumeData, 
  ExtractedKeyword, 
  ContractorData 
} from './affindaTypes';

/**
 * Split comma-separated keywords into individual keywords
 * @param text The text to split
 * @param type The keyword type
 * @returns Array of keyword objects
 */
export function splitKeywords(text: string, type: string): ExtractedKeyword[] {
  if (!text) return [];
  
  return text.split(',')
    .map(item => item.trim())
    .filter(item => item.length > 0)
    .map(item => ({
      id: uuidv4(),
      name: item.replace(/^\w/, c => c.toUpperCase()), // Capitalize first letter
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
export function processLocationData(contractor: ContractorData, resumeLocation: AffindaResumeData['location']): void {
  if (!resumeLocation) return;
  
  console.log('Processing location data:', JSON.stringify(resumeLocation, null, 2));
  
  // Handle when parsed is available as an object
  if (resumeLocation.parsed && typeof resumeLocation.parsed === 'object') {
    const parsedLocation = resumeLocation.parsed as AffindaLocationParsed;
    console.log('Using parsed location data:', JSON.stringify(parsedLocation, null, 2));
    
    // Extract city
    if (parsedLocation.city) {
      contractor.city = parsedLocation.city;
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
      contractor.street_address = parsedLocation.street.trim();
      console.log('Using street field:', contractor.street_address);
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
        contractor.phone = parsedPhone.formattedNumber || parsedPhone.nationalNumber;
      } else {
        contractor.phone = resumeData.phoneNumber.raw;
      }
    }
    
    // Extract email
    if (resumeData.email) {
      contractor.email = resumeData.email.raw;
    }
    
    // Extract summary/professional summary
    if (resumeData.summary) {
      contractor.professional_summary = resumeData.summary.raw;
    } else if (resumeData.goalsInterests) {
      contractor.professional_summary = resumeData.goalsInterests.raw;
    }
    
    // Extract skills
    if (resumeData.skills && resumeData.skills.length > 0) {
      console.log('Processing skills:', resumeData.skills.length, 'items');
      
      resumeData.skills.forEach(skill => {
        const skillName = typeof skill.parsed === 'string' ? skill.parsed : skill.raw;
        
        // Handle comma-separated skills
        if (skillName && skillName.includes(',')) {
          const splitSkills = splitKeywords(skillName, 'skill');
          console.log('Split skills into', splitSkills.length, 'individual skills');
          extractedKeywords.skills.push(...splitSkills);
        } else {
          // Single skill
          const cleanedSkillName = cleanKeywordName(skillName);
          if (cleanedSkillName) {
            extractedKeywords.skills.push({
              id: uuidv4(),
              name: cleanedSkillName,
              type: 'skill'
            });
          }
        }
      });
      
      console.log('Extracted skills:', extractedKeywords.skills.length);
    }
    
    // Extract job titles
    if (resumeData.jobTitles && resumeData.jobTitles.length > 0) {
      console.log('Processing job titles:', resumeData.jobTitles.length, 'items');
      
      resumeData.jobTitles.forEach(jobTitle => {
        const titleName = typeof jobTitle.parsed === 'string' ? jobTitle.parsed : jobTitle.raw;
        
        // Handle comma-separated job titles
        if (titleName && titleName.includes(',')) {
          const splitTitles = splitKeywords(titleName, 'job title');
          console.log('Split job titles into', splitTitles.length, 'individual titles');
          extractedKeywords["job titles"].push(...splitTitles);
        } else {
          // Single job title
          const cleanedTitleName = cleanKeywordName(titleName);
          if (cleanedTitleName) {
            extractedKeywords["job titles"].push({
              id: uuidv4(),
              name: cleanedTitleName,
              type: 'job title'
            });
          }
        }
      });
      
      console.log('Extracted job titles:', extractedKeywords["job titles"].length);
    }
    
    // Extract companies
    if (resumeData.companies && resumeData.companies.length > 0) {
      console.log('Processing companies:', resumeData.companies.length, 'items');
      
      resumeData.companies.forEach(company => {
        const companyName = typeof company.parsed === 'string' ? company.parsed : company.raw;
        
        // Handle comma-separated companies
        if (companyName && companyName.includes(',')) {
          const splitCompanies = splitKeywords(companyName, 'company');
          console.log('Split companies into', splitCompanies.length, 'individual companies');
          extractedKeywords.companies.push(...splitCompanies);
        } else {
          // Single company
          const cleanedCompanyName = cleanKeywordName(companyName);
          if (cleanedCompanyName) {
            extractedKeywords.companies.push({
              id: uuidv4(),
              name: cleanedCompanyName,
              type: 'company'
            });
          }
        }
      });
      
      console.log('Extracted companies:', extractedKeywords.companies.length);
    }
    
    // Extract industries
    if (resumeData.industries && resumeData.industries.length > 0) {
      console.log('Processing industries:', resumeData.industries.length, 'items');
      
      resumeData.industries.forEach(industry => {
        const industryName = typeof industry.parsed === 'string' ? industry.parsed : industry.raw;
        
        // Handle comma-separated industries
        if (industryName && industryName.includes(',')) {
          const splitIndustries = splitKeywords(industryName, 'industry');
          console.log('Split industries into', splitIndustries.length, 'individual industries');
          extractedKeywords.industries.push(...splitIndustries);
        } else {
          // Single industry
          const cleanedIndustryName = cleanKeywordName(industryName);
          if (cleanedIndustryName) {
            extractedKeywords.industries.push({
              id: uuidv4(),
              name: cleanedIndustryName,
              type: 'industry'
            });
          }
        }
      });
      
      console.log('Extracted industries:', extractedKeywords.industries.length);
    }
    
    // Extract certifications
    if (resumeData.certifications && resumeData.certifications.length > 0) {
      console.log('Processing certifications:', resumeData.certifications.length, 'items');
      
      resumeData.certifications.forEach(cert => {
        const certName = typeof cert.parsed === 'string' ? cert.parsed : cert.raw;
        
        // Handle comma-separated certifications
        if (certName && certName.includes(',')) {
          const splitCerts = splitKeywords(certName, 'certification');
          console.log('Split certifications into', splitCerts.length, 'individual certifications');
          extractedKeywords.certifications.push(...splitCerts);
        } else {
          // Single certification
          const cleanedCertName = cleanKeywordName(certName);
          if (cleanedCertName) {
            extractedKeywords.certifications.push({
              id: uuidv4(),
              name: cleanedCertName,
              type: 'certification'
            });
          }
        }
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
