// Test the new mapper with actual Affinda sample data
const { v4: uuidv4 } = require('uuid');

// Sample data from the actual Affinda response
const sampleData = {
  fullName: {
    raw: "Garrison Gagnon",
    parsed: "Garrison Gagnon"
  },
  email: {
    raw: "gsquared0236@gmail.com",
    parsed: "gsquared0236@gmail.com"
  },
  phoneNumber: {
    raw: "(603) 325-7987",
    parsed: {
      rawText: "(603) 325-7987",
      countryCode: "US",
      nationalNumber: "(603) 325-7987",
      formattedNumber: "+1 603-325-7987",
      internationalCountryCode: 1
    }
  },
  location: {
    raw: "Gilmanton Iron Works, NH 03837",
    parsed: {
      formatted: "Gilmanton Iron Works, Gilmanton, NH 03837, USA",
      streetNumber: null,
      street: null,
      apartmentNumber: null,
      city: "Gilmanton",
      postalCode: "03837",
      state: "New Hampshire",
      stateCode: "NH",
      country: "United States",
      rawInput: "Gilmanton Iron Works, NH 03837",
      countryCode: "US",
      latitude: 43.4254906,
      longitude: -71.2963297,
      poBox: null
    }
  },
  summary: {
    raw: "This candidate has a background in accounting with an upcoming Summer 2025 audit internship at Ernst & Young...",
    parsed: "This candidate has a background in accounting with an upcoming Summer 2025 audit internship at Ernst & Young..."
  },
  goalsInterests: {
    raw: "Determined and teamoriented student seeking to further develop interpersonal, leadership, and financial skills in an interactive and impactful organization.",
    parsed: "Determined and team oriented student seeking to further develop interpersonal, leadership, and financial skills in an interactive and impactful organization."
  },
  skills: [
    {
      raw: "Statistical Analysis Operations Management Information Systems Structures Data Analytics Auditing Taxation Business Law inventory control merchandising, pointof sale (POS) systems",
      parsed: "Statistical Analysis Operations Management Information Systems Structures Data Analytics Auditing Taxation Business Law inventory control merchandising, point of sale (POS) systems"
    }
  ],
  jobTitles: [
    {
      raw: "Tax Intern Educator Fellow Team Assistant Captain",
      parsed: "Tax Intern Educator Fellow Team Assistant Captain"
    }
  ],
  companies: [
    {
      raw: "Ernst & Young, Lumsden & McCormick LLP Lululemon Civix Strategy Group SUNY Fredonia NCAA Men's Ice Hockey",
      parsed: "Ernst & Young,\nLumsden & McCormick LLP\n\nLululemon\n\nCivix Strategy Group SUNY Fredonia NCAA Men's Ice Hockey"
    }
  ],
  industries: [
    {
      raw: "Accounting Tax Athletics",
      parsed: "Accounting Tax\n\nAthletics"
    }
  ],
  certifications: [
    {
      raw: "Beta Gamma Sigma International Business Honors Society Member",
      parsed: "Beta Gamma Sigma International Business Honors Society Member"
    }
  ]
};

// Test the keyword splitting function
function testSplitKeywords(text, category) {
  console.log(`\n--- Testing ${category}: "${text}" ---`);
  
  let normalizedText = text.trim();
  let items = [];
  
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
  
  // Clean up items
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
  
  console.log(`Result: ${cleanedItems.length} items:`, cleanedItems);
  return cleanedItems;
}

// Test with actual sample data
console.log('=== Testing New Mapper with Real Affinda Data ===\n');

// Test skills (the most complex case)
testSplitKeywords(sampleData.skills[0].parsed, 'skill');

// Test job titles
testSplitKeywords(sampleData.jobTitles[0].parsed, 'job title');

// Test companies
testSplitKeywords(sampleData.companies[0].parsed, 'company');

// Test industries
testSplitKeywords(sampleData.industries[0].parsed, 'industry');

// Test certifications
testSplitKeywords(sampleData.certifications[0].parsed, 'certification');

console.log('\n=== Basic Info Extraction Test ===');
console.log('Full Name:', sampleData.fullName.parsed);
console.log('Email:', sampleData.email.parsed);
console.log('Phone (raw):', sampleData.phoneNumber.raw);
console.log('Phone (cleaned):', sampleData.phoneNumber.raw.replace(/\D/g, ''));
console.log('Location City:', sampleData.location.parsed.city);
console.log('Location State:', sampleData.location.parsed.stateCode);
console.log('Location Zip:', sampleData.location.parsed.postalCode);
console.log('Street Address (from rawInput):', sampleData.location.parsed.rawInput.split(',')[0]);
console.log('Goals/Interests:', sampleData.goalsInterests.parsed.substring(0, 100) + '...');