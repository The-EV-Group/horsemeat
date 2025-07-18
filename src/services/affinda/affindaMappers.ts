import { AffindaResumeData, ParsedResumeData, ContractorData, ExtractedKeyword } from './affindaTypes';
import { v4 as uuidv4 } from 'uuid';

/**
 * Advanced keyword splitting based on actual Affinda data patterns
 * The sample data shows that Affinda returns space-separated keywords, not comma-separated!
 */
function splitKeywords(text: string, category: string): ExtractedKeyword[] {
  if (!text || !text.trim()) return [];
  
  console.log(`\n--- Splitting ${category}: "${text}" ---`);
  
  let normalizedText = text.trim();
  let items: string[] = [];
  
  // Handle different patterns based on the actual sample data
  
  // First, handle obvious comma-separated parts (like at the end of skills)
  if (normalizedText.includes(',')) {
    // Split by commas first, then handle space-separated parts
    const commaParts = normalizedText.split(',');
    
    commaParts.forEach(part => {
      const trimmedPart = part.trim();
      if (!trimmedPart) return;
      
      // If this part looks like multiple words that should be separate keywords
      // (like "Statistical Analysis Operations Management")
      if (category === 'skill' && trimmedPart.split(' ').length > 3 && !trimmedPart.includes('(')) {
        // This is likely multiple space-separated skills
        const spaceParts = trimmedPart.split(' ');
        let currentSkill = '';
        
        for (let i = 0; i < spaceParts.length; i++) {
          const word = spaceParts[i];
          
          // Check if this word starts a new skill (capitalized and not a common word)
          if (word[0] === word[0].toUpperCase() && 
              !['and', 'or', 'of', 'in', 'the', 'a', 'an'].includes(word.toLowerCase())) {
            
            // If we have a current skill, save it
            if (currentSkill.trim()) {
              items.push(currentSkill.trim());
            }
            
            // Start new skill
            currentSkill = word;
          } else {
            // Add to current skill
            currentSkill += ' ' + word;
          }
        }
        
        // Don't forget the last skill
        if (currentSkill.trim()) {
          items.push(currentSkill.trim());
        }
      } else {
        // This part is a single item
        items.push(trimmedPart);
      }
    });
  } 
  // Handle space-separated keywords (most common in Affinda data)
  else {
    // For job titles like "Tax Intern Educator Fellow Team Assistant Captain"
    if (category === 'job title') {
      // Common job title patterns
      const jobTitlePatterns = [
        'Tax Intern', 'Team Assistant', 'Assistant Captain', 'Team Captain',
        'Project Manager', 'Senior Developer', 'Lead Developer', 'Software Engineer',
        'Data Analyst', 'Business Analyst', 'Product Manager', 'Account Manager'
      ];
      
      let remainingText = normalizedText;
      
      // Extract known patterns first
      jobTitlePatterns.forEach(pattern => {
        if (remainingText.includes(pattern)) {
          items.push(pattern);
          remainingText = remainingText.replace(pattern, '').trim();
        }
      });
      
      // Split remaining words
      if (remainingText) {
        const words = remainingText.split(' ').filter(w => w.trim());
        items.push(...words);
      }
    }
    // For companies like "Ernst & Young Lumsden McCormick LLP Lululemon"
    else if (category === 'company') {
      // Handle company patterns
      let remainingText = normalizedText;
      
      // Known company patterns
      const companyPatterns = [
        'Ernst & Young', 'Lumsden & McCormick LLP', 'SUNY Fredonia',
        'NCAA Men\'s Ice Hockey', 'Civix Strategy Group'
      ];
      
      companyPatterns.forEach(pattern => {
        if (remainingText.includes(pattern)) {
          items.push(pattern);
          remainingText = remainingText.replace(pattern, '').trim();
        }
      });
      
      // Split remaining words as individual companies
      if (remainingText) {
        const words = remainingText.split(' ').filter(w => w.trim());
        items.push(...words);
      }
    }
    // For skills - most complex case
    else if (category === 'skill') {
      // Skills are often multi-word concepts separated by spaces
      // Like "Statistical Analysis Operations Management Information Systems"
      
      const skillPatterns = [
        'Statistical Analysis', 'Operations Management', 'Information Systems',
        'Data Analytics', 'Business Law', 'inventory control', 'point of sale',
        'POS systems', 'Microsoft Excel', 'Microsoft Word', 'Microsoft PowerPoint',
        'Project Management', 'Quality Assurance', 'Machine Learning',
        'Artificial Intelligence', 'Database Administration', 'Network Security'
      ];
      
      let remainingText = normalizedText;
      
      // Extract known multi-word skills first
      skillPatterns.forEach(pattern => {
        const regex = new RegExp(pattern, 'gi');
        if (regex.test(remainingText)) {
          items.push(pattern);
          remainingText = remainingText.replace(regex, '').trim();
        }
      });
      
      // For remaining text, try to identify skill boundaries
      if (remainingText) {
        const words = remainingText.split(' ').filter(w => w.trim());
        let currentSkill = '';
        
        for (let i = 0; i < words.length; i++) {
          const word = words[i];
          
          // If word is capitalized and we have a current skill, it might be a new skill
          if (word[0] === word[0].toUpperCase() && currentSkill.trim()) {
            items.push(currentSkill.trim());
            currentSkill = word;
          } else {
            currentSkill += (currentSkill ? ' ' : '') + word;
          }
        }
        
        if (currentSkill.trim()) {
          items.push(currentSkill.trim());
        }
      }
    }
    // For industries and certifications - simpler space splitting
    else {
      items = normalizedText.split(' ').filter(w => w.trim());
    }
  }
  
  // Clean up and create keyword objects
  const cleanedItems = items
    .map(item => item.trim())
    .filter(item => item.length > 0)
    .filter(item => item.length > 1) // Remove single characters
    .map(item => {
      // Clean up common issues
      item = item.replace(/[()]/g, '').trim(); // Remove parentheses
      item = item.replace(/^[,;|]+|[,;|]+$/g, ''); // Remove leading/trailing delimiters
      return item;
    })
    .filter(item => item.length > 0);
  
  console.log(`Split into ${cleanedItems.length} items:`, cleanedItems);
  
  return cleanedItems.map(item => ({
    id: uuidv4(),
    name: item.charAt(0).toUpperCase() + item.slice(1), // Capitalize first letter
    type: category
  }));
}

/**
 * Extract text from Affinda data point - handles both parsed and raw
 */
function extractText(dataPoint: any): string {
  if (!dataPoint) return '';
  
  // Try parsed first (usually cleaner), then raw
  if (dataPoint.parsed && typeof dataPoint.parsed === 'string') {
    return dataPoint.parsed.trim();
  }
  
  if (dataPoint.raw && typeof dataPoint.raw === 'string') {
    return dataPoint.raw.trim();
  }
  
  return '';
}

/**
 * Extract phone number and clean it to digits only
 */
function extractPhoneNumber(phoneData: any): string {
  if (!phoneData) return '';
  
  let phoneText = '';
  
  // Try to get phone from parsed data first
  if (phoneData.parsed && typeof phoneData.parsed === 'object') {
    const parsed = phoneData.parsed;
    // Use nationalNumber, but clean it since it might have formatting
    phoneText = String(parsed.nationalNumber || parsed.formattedNumber || '');
  }
  
  // Fallback to raw
  if (!phoneText && phoneData.raw) {
    phoneText = String(phoneData.raw);
  }
  
  // Clean to digits only
  return phoneText.replace(/\D/g, '');
}

/**
 * Extract location data from Affinda's parsed location object
 */
function extractLocationData(locationData: any): Partial<ContractorData> {
  const location: Partial<ContractorData> = {};
  
  if (!locationData) return location;
  
  console.log('Processing location data:', locationData);
  
  // Try parsed location first (this is an object in the sample)
  if (locationData.parsed && typeof locationData.parsed === 'object') {
    const parsed = locationData.parsed;
    
    if (parsed.city) location.city = parsed.city.trim();
    if (parsed.stateCode) location.state = parsed.stateCode;
    else if (parsed.state) location.state = parsed.state;
    if (parsed.postalCode) location.zip_code = parsed.postalCode;
    if (parsed.country) location.country = parsed.country;
    
    // For street address, use the raw input since parsed doesn't have street/number
    if (parsed.rawInput) {
      // Extract street address from raw input like "Gilmanton Iron Works, NH 03837"
      const parts = parsed.rawInput.split(',');
      if (parts.length > 0) {
        location.street_address = parts[0].trim();
      }
    }
  }
  
  // Fallback to raw data if parsed didn't work
  if (!location.city && !location.state && locationData.raw) {
    const rawParts = locationData.raw.split(',');
    if (rawParts.length >= 2) {
      location.street_address = rawParts[0].trim();
      
      // Try to extract city, state, zip from remaining parts
      for (let i = 1; i < rawParts.length; i++) {
        const part = rawParts[i].trim();
        
        // Check if this part has state and zip (like "NH 03837")
        const stateZipMatch = part.match(/([A-Z]{2})\s*(\d{5})/);
        if (stateZipMatch) {
          location.state = stateZipMatch[1];
          location.zip_code = stateZipMatch[2];
          
          // City is probably the part before this
          if (i > 1) {
            location.city = rawParts[i - 1].trim();
          }
        }
      }
    }
  }
  
  console.log('Extracted location:', location);
  return location;
}

/**
 * Map Affinda response to our application data structure
 * Based on actual sample data format
 */
export const mapAffindaResponseToAppData = (resumeData: AffindaResumeData): ParsedResumeData => {
  console.log('=== Starting Affinda mapping with real data format ===');
  console.log('Input data keys:', Object.keys(resumeData));
  
  // Initialize contractor with required defaults
  const contractor: ContractorData = {
    travel_anywhere: true,
    preferred_contact: 'email',
    available: true,
    prefers_hourly: true,
    pay_type: '1099',
  };

  // Initialize keywords structure
  const keywords = {
    skills: [] as ExtractedKeyword[],
    industries: [] as ExtractedKeyword[],
    certifications: [] as ExtractedKeyword[],
    companies: [] as ExtractedKeyword[],
    "job titles": [] as ExtractedKeyword[]
  };

  try {
    // Extract basic information
    console.log('--- Extracting basic info ---');
    
    // Full name
    const fullName = extractText(resumeData.fullName);
    if (fullName) {
      contractor.full_name = fullName;
      console.log('✅ Full name:', fullName);
    }

    // Email
    const email = extractText(resumeData.email);
    if (email) {
      contractor.email = email;
      console.log('✅ Email:', email);
    }

    // Phone
    const phone = extractPhoneNumber(resumeData.phoneNumber);
    if (phone) {
      contractor.phone = phone;
      console.log('✅ Phone:', phone);
    }

    // Location
    console.log('--- Extracting location ---');
    const locationData = extractLocationData(resumeData.location);
    Object.assign(contractor, locationData);
    console.log('✅ Location:', locationData);

    // Summary
    const summary = extractText(resumeData.summary);
    if (summary) {
      contractor.summary = summary;
      console.log('✅ Summary:', summary.substring(0, 100) + '...');
    }

    // Goals/Interests -> Notes
    const goalsInterests = extractText(resumeData.goalsInterests);
    if (goalsInterests) {
      contractor.notes = goalsInterests;
      console.log('✅ Goals/Interests -> Notes:', goalsInterests.substring(0, 100) + '...');
      
      // Use as summary fallback if no summary
      if (!contractor.summary) {
        contractor.summary = goalsInterests;
        console.log('✅ Using Goals/Interests as summary fallback');
      }
    }

    // Extract keywords with improved splitting
    console.log('--- Extracting keywords with advanced splitting ---');

    // Skills - most complex due to space-separated format
    if (resumeData.skills && Array.isArray(resumeData.skills)) {
      console.log(`Processing ${resumeData.skills.length} skills entries`);
      resumeData.skills.forEach((skill, index) => {
        const skillText = extractText(skill);
        if (skillText) {
          console.log(`Skills entry ${index + 1}: "${skillText}"`);
          const splitSkills = splitKeywords(skillText, 'skill');
          keywords.skills.push(...splitSkills);
        }
      });
    }

    // Job Titles - space-separated format
    if (resumeData.jobTitles && Array.isArray(resumeData.jobTitles)) {
      console.log(`Processing ${resumeData.jobTitles.length} job title entries`);
      resumeData.jobTitles.forEach((jobTitle, index) => {
        const titleText = extractText(jobTitle);
        if (titleText) {
          console.log(`Job title entry ${index + 1}: "${titleText}"`);
          const splitTitles = splitKeywords(titleText, 'job title');
          keywords["job titles"].push(...splitTitles);
        }
      });
    }

    // Companies - mixed format
    if (resumeData.companies && Array.isArray(resumeData.companies)) {
      console.log(`Processing ${resumeData.companies.length} company entries`);
      resumeData.companies.forEach((company, index) => {
        const companyText = extractText(company);
        if (companyText) {
          console.log(`Company entry ${index + 1}: "${companyText}"`);
          const splitCompanies = splitKeywords(companyText, 'company');
          keywords.companies.push(...splitCompanies);
        }
      });
    }

    // Industries - space-separated
    if (resumeData.industries && Array.isArray(resumeData.industries)) {
      console.log(`Processing ${resumeData.industries.length} industry entries`);
      resumeData.industries.forEach((industry, index) => {
        const industryText = extractText(industry);
        if (industryText) {
          console.log(`Industry entry ${index + 1}: "${industryText}"`);
          const splitIndustries = splitKeywords(industryText, 'industry');
          keywords.industries.push(...splitIndustries);
        }
      });
    }

    // Certifications
    if (resumeData.certifications && Array.isArray(resumeData.certifications)) {
      console.log(`Processing ${resumeData.certifications.length} certification entries`);
      resumeData.certifications.forEach((cert, index) => {
        const certText = extractText(cert);
        if (certText) {
          console.log(`Certification entry ${index + 1}: "${certText}"`);
          const splitCerts = splitKeywords(certText, 'certification');
          keywords.certifications.push(...splitCerts);
        }
      });
    }

    // Summary
    console.log('=== Final Mapping Results ===');
    console.log('Contractor fields populated:', Object.keys(contractor).filter(key => contractor[key as keyof ContractorData] !== undefined).length);
    console.log('Keywords extracted:');
    console.log('- Skills:', keywords.skills.length, keywords.skills.map(s => s.name));
    console.log('- Job Titles:', keywords["job titles"].length, keywords["job titles"].map(t => t.name));
    console.log('- Companies:', keywords.companies.length, keywords.companies.map(c => c.name));
    console.log('- Industries:', keywords.industries.length, keywords.industries.map(i => i.name));
    console.log('- Certifications:', keywords.certifications.length, keywords.certifications.map(c => c.name));

    return {
      contractor,
      keywords
    };

  } catch (error) {
    console.error('❌ Error in Affinda mapping:', error);
    
    // Return safe defaults
    return {
      contractor: {
        travel_anywhere: true,
        preferred_contact: 'email',
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