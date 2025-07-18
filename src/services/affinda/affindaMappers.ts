import { AffindaResumeData, ParsedResumeData, ContractorData, ExtractedKeyword, AffindaTable } from './affindaTypes';
import { v4 as uuidv4 } from 'uuid';

/**
 * Extract text from Affinda data point
 */
const extractText = (dataPoint: any): string => {
  if (!dataPoint) return '';
  
  // Try parsed first (this is cleaned and formatted), then raw
  if (dataPoint.parsed && typeof dataPoint.parsed === 'string') {
    return dataPoint.parsed.trim();
  }
  
  if (dataPoint.raw && typeof dataPoint.raw === 'string') {
    return dataPoint.raw.trim();
  }
  
  return '';
};

/**
 * Extract phone number and clean it to digits only
 */
const extractPhoneNumber = (phoneData: any): string => {
  if (!phoneData) return '';
  
  let phoneText = '';
  
  // Try to get phone from parsed data first
  if (phoneData.parsed && typeof phoneData.parsed === 'object') {
    const parsed = phoneData.parsed;
    phoneText = String(parsed.nationalNumber || parsed.formattedNumber || '');
  }
  
  // Fallback to raw
  if (!phoneText && phoneData.raw) {
    phoneText = String(phoneData.raw);
  }
  
  // Clean to digits only
  return phoneText.replace(/\D/g, '');
};

/**
 * Extract location data from Affinda's parsed location object
 */
const extractLocationData = (locationData: any): Partial<ContractorData> => {
  const location: Partial<ContractorData> = {};
  
  if (!locationData) return location;
  
  console.log('Processing location data:', locationData);
  
  // Try parsed location first (this is an object)
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
};

/**
 * Normalize table input to array (handles both single table and array of tables)
 */
const normalizeToArray = <T>(input: T | T[] | undefined): T[] => {
  if (!input) return [];
  return Array.isArray(input) ? input : [input];
};

/**
 * Deduplicate keywords based on name (case-insensitive)
 */
const deduplicateKeywords = (keywords: ExtractedKeyword[]): ExtractedKeyword[] => {
  const seen = new Set<string>();
  const deduplicated: ExtractedKeyword[] = [];
  
  for (const keyword of keywords) {
    const normalizedName = keyword.name.toLowerCase().trim();
    if (!seen.has(normalizedName)) {
      seen.add(normalizedName);
      deduplicated.push(keyword);
    } else {
      console.log(`Deduplicating: "${keyword.name}" (already exists)`);
    }
  }
  
  if (keywords.length !== deduplicated.length) {
    console.log(`Deduplication: ${keywords.length} → ${deduplicated.length} keywords`);
  }
  return deduplicated;
};

/**
 * Extract keywords from single table structure (PRIMARY METHOD)
 * Keywords are already individual items - DO NOT SPLIT
 */
const extractKeywordsFromTable = (table: AffindaTable | undefined, keywordType: string): ExtractedKeyword[] => {
  if (!table?.parsed?.rows) {
    return [];
  }
  
  const keywords: ExtractedKeyword[] = [];
  
  console.log(`Processing ${keywordType} table with ${table.parsed.rows.length} rows`);
  
  table.parsed.rows.forEach((row, rowIndex) => {
    console.log(`Row ${rowIndex + 1}: "${row.raw}"`);
    
    // Get the appropriate keyword array based on type
    let keywordArray: any[] = [];
    
    switch (keywordType) {
      case 'skill':
        keywordArray = row.parsed.skill || [];
        break;
      case 'company':
        keywordArray = row.parsed.company || [];
        break;
      case 'job title':
        keywordArray = row.parsed.jobTitle || [];
        break;
      case 'industry':
        keywordArray = row.parsed.industry || [];
        break;
      case 'certification':
        keywordArray = row.parsed.certification || [];
        break;
    }
    
    // Process each keyword in the array - these are already individual items
    keywordArray.forEach((keywordItem, keywordIndex) => {
      const keywordText = extractText(keywordItem);
      if (keywordText) {
        console.log(`  ${keywordType} ${keywordIndex + 1}: "${keywordText}"`);
        
        // Create keyword directly - NO SPLITTING needed
        const keyword: ExtractedKeyword = {
          id: uuidv4(),
          name: keywordText, // Use as-is, already clean
          type: keywordType
        };
        keywords.push(keyword);
      }
    });
  });
  
  console.log(`Total ${keywordType}s extracted from table:`, keywords.length);
  return keywords;
};

/**
 * Extract keywords from multiple tables (handles arrays of tables)
 */
const extractKeywordsFromMultipleTables = (
  tables: (AffindaTable | AffindaTable[]) | undefined, 
  keywordType: string
): ExtractedKeyword[] => {
  const tableArray = normalizeToArray(tables);
  
  if (tableArray.length === 0) {
    return [];
  }
  
  console.log(`Processing ${tableArray.length} ${keywordType} table(s)`);
  
  const allKeywords: ExtractedKeyword[] = [];
  
  tableArray.forEach((table, index) => {
    console.log(`Processing ${keywordType} table ${index + 1}/${tableArray.length}`);
    const tableKeywords = extractKeywordsFromTable(table, keywordType);
    allKeywords.push(...tableKeywords);
  });
  
  // Deduplicate keywords across all tables
  const deduplicatedKeywords = deduplicateKeywords(allKeywords);
  
  console.log(`Total ${keywordType}s extracted from ${tableArray.length} table(s):`, deduplicatedKeywords.length);
  return deduplicatedKeywords;
};

/**
 * Extract keywords from array structure (FALLBACK ONLY)
 * Only used if table structure is not available
 */
const extractKeywordsFromArray = (keywordArray: any[] | undefined, keywordType: string): ExtractedKeyword[] => {
  if (!keywordArray || !Array.isArray(keywordArray)) {
    return [];
  }
  
  const keywords: ExtractedKeyword[] = [];
  
  console.log(`Processing ${keywordType} array with ${keywordArray.length} items (FALLBACK)`);
  
  keywordArray.forEach((keywordItem, index) => {
    const keywordText = extractText(keywordItem);
    if (keywordText) {
      console.log(`  ${keywordType} ${index + 1}: "${keywordText.substring(0, 100)}${keywordText.length > 100 ? '...' : ''}"`);
      
      // For array format, we need to split concatenated strings
      const splitItems = splitConcatenatedKeywords(keywordText, keywordType);
      keywords.push(...splitItems);
      console.log(`    -> Split into ${splitItems.length} items: ${splitItems.map(k => k.name).slice(0, 5).join(', ')}${splitItems.length > 5 ? '...' : ''}`);
    }
  });
  
  console.log(`Total ${keywordType}s extracted:`, keywords.length);
  return keywords;
};

/**
 * Split concatenated keywords (ONLY for array fallback format)
 */
const splitConcatenatedKeywords = (text: string, category: string): ExtractedKeyword[] => {
  if (!text || !text.trim()) return [];
  
  const normalizedText = text.trim();
  let items: string[] = [];
  
  // Split by common delimiters
  if (normalizedText.includes('\n\n')) {
    items = normalizedText.split('\n\n');
  } else if (normalizedText.includes('\n')) {
    items = normalizedText.split('\n');
  } else if (normalizedText.includes(',')) {
    items = normalizedText.split(',');
  } else if (normalizedText.includes(';')) {
    items = normalizedText.split(';');
  } else if (normalizedText.includes('|')) {
    items = normalizedText.split('|');
  } else if (normalizedText.includes('/') && !normalizedText.includes('http')) {
    items = normalizedText.split('/');
  } else if (normalizedText.includes(' and ')) {
    items = normalizedText.split(' and ');
  } else if (normalizedText.includes(' & ')) {
    items = normalizedText.split(' & ');
  } else {
    items = [normalizedText];
  }
  
  // Clean and create keyword objects
  return items
    .map(item => item.trim())
    .filter(item => item.length > 0 && item.length < 100)
    .map(item => ({
      id: uuidv4(),
      name: item.charAt(0).toUpperCase() + item.slice(1),
      type: category
    }));
};

/**
 * Map Affinda response to our application data structure
 * Prioritizes table structure over array structure
 */
export const mapAffindaResponseToAppData = (resumeData: AffindaResumeData): ParsedResumeData => {
  console.log('=== Starting Affinda mapping ===');
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

    // Extract keywords - PRIORITIZE TABLE STRUCTURE (supports multiple tables)
    console.log('--- Extracting keywords from tables ---');

    // Skills - TABLE FIRST (preferred, supports multiple tables)
    if (resumeData.skillsTable) {
      console.log('✅ Processing skills table(s)...');
      keywords.skills = extractKeywordsFromMultipleTables(resumeData.skillsTable, 'skill');
    } else if (resumeData.skills) {
      console.log('⚠️ Fallback: Processing skills array...');
      keywords.skills = extractKeywordsFromArray(resumeData.skills, 'skill');
    }

    // Job Titles - TABLE FIRST (preferred, supports multiple tables)
    if (resumeData.jobTitlesTable) {
      console.log('✅ Processing job titles table(s)...');
      keywords["job titles"] = extractKeywordsFromMultipleTables(resumeData.jobTitlesTable, 'job title');
    } else if (resumeData.jobTitles) {
      console.log('⚠️ Fallback: Processing job titles array...');
      keywords["job titles"] = extractKeywordsFromArray(resumeData.jobTitles, 'job title');
    }

    // Companies - TABLE FIRST (preferred, supports multiple tables)
    if (resumeData.companiesTable) {
      console.log('✅ Processing companies table(s)...');
      keywords.companies = extractKeywordsFromMultipleTables(resumeData.companiesTable, 'company');
    } else if (resumeData.companies) {
      console.log('⚠️ Fallback: Processing companies array...');
      keywords.companies = extractKeywordsFromArray(resumeData.companies, 'company');
    }

    // Industries - TABLE FIRST (preferred, supports multiple tables)
    if (resumeData.industriesTable) {
      console.log('✅ Processing industries table(s)...');
      keywords.industries = extractKeywordsFromMultipleTables(resumeData.industriesTable, 'industry');
    } else if (resumeData.industries) {
      console.log('⚠️ Fallback: Processing industries array...');
      keywords.industries = extractKeywordsFromArray(resumeData.industries, 'industry');
    }

    // Certifications - TABLE FIRST (preferred, supports multiple tables)
    if (resumeData.certificationsTable) {
      console.log('✅ Processing certifications table(s)...');
      keywords.certifications = extractKeywordsFromMultipleTables(resumeData.certificationsTable, 'certification');
    } else if (resumeData.certifications) {
      console.log('⚠️ Fallback: Processing certifications array...');
      keywords.certifications = extractKeywordsFromArray(resumeData.certifications, 'certification');
    }

    // Final validation against expected results
    console.log('=== Final Mapping Results ===');
    console.log('Contractor fields populated:', Object.keys(contractor).filter(key => contractor[key as keyof ContractorData] !== undefined).length);
    console.log('Keywords extracted:');
    console.log('- Skills:', keywords.skills.length, '(expected: 5)');
    console.log('- Job Titles:', keywords["job titles"].length, '(expected: 2)');
    console.log('- Companies:', keywords.companies.length, '(expected: 1)');
    console.log('- Industries:', keywords.industries.length, '(expected: 1)');
    console.log('- Certifications:', keywords.certifications.length, '(expected: 1)');

    // Log actual extracted keywords for debugging
    console.log('Extracted keywords:');
    console.log('Skills:', keywords.skills.map(k => k.name));
    console.log('Job Titles:', keywords["job titles"].map(k => k.name));
    console.log('Companies:', keywords.companies.map(k => k.name));
    console.log('Industries:', keywords.industries.map(k => k.name));
    console.log('Certifications:', keywords.certifications.map(k => k.name));

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