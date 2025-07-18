# Resume Parser Integration Guide

## Overview
This document provides comprehensive guidance for integrating with the Affinda Resume Parser API and correctly extracting all keyword data from resume parsing results.

## Affinda API Response Structure

The Affinda API returns a structured response with the following key components:

### Top-Level Structure
```json
{
  "data": {
    // Basic Information
    "fullName": { "parsed": "Garrison Gagnon" },
    "email": { "parsed": "gsquared0236@gmail.com" },
    "phoneNumber": { 
      "raw": "(603) 325-7987",
      "parsed": {
        "rawText": "(603) 325-7987",
        "countryCode": "US",
        "nationalNumber": "(603) 325-7987",
        "formattedNumber": "+1 603-325-7987"
      }
    },
    "location": {
      "raw": "Gilmanton Iron Works, NH 03837",
      "parsed": {
        "formatted": "Gilmanton Iron Works, Gilmanton, NH 03837, USA",
        "city": "Gilmanton",
        "postalCode": "03837",
        "state": "New Hampshire",
        "stateCode": "NH",
        "country": "United States",
        "rawInput": "Gilmanton Iron Works, NH 03837"
      }
    },
    "summary": { "parsed": "Generated summary text..." },
    "goalsInterests": { "parsed": "Determined and team-oriented student..." },
    
    // Keyword Tables (MAIN EXTRACTION SOURCE)
    "skillsTable": { /* table structure */ },
    "jobTitlesTable": { /* table structure */ },
    "companiesTable": { /* table structure */ },
    "industriesTable": { /* table structure */ },
    "certificationsTable": { /* table structure */ }
  }
}
```

## Critical: Table Structure for Keywords

**IMPORTANT**: Keywords are extracted from TABLE structures, not arrays. Each table contains individual, pre-parsed keywords that should NOT be split further.

### Table Structure Pattern
```json
"skillsTable": {
  "id": 1171648191,
  "raw": "interpersonal, pointofStructures Information (POS) sale inventory Statistical control --Systems Analysis",
  "parsed": {
    "rows": [
      {
        "id": 1171648192,
        "raw": "interpersonal,",
        "parsed": {
          "skill": [
            {
              "id": 1171648193,
              "raw": "interpersonal,",
              "parsed": "interpersonal"  // ← INDIVIDUAL KEYWORD (already cleaned)
            }
          ]
        }
      },
      {
        "id": 1171648194,
        "raw": "Statistical Analysis",
        "parsed": {
          "skill": [
            {
              "id": 1171648195,
              "raw": "Statistical Analysis",
              "parsed": "Statistical Analysis"  // ← INDIVIDUAL KEYWORD (already cleaned)
            }
          ]
        }
      }
      // ... more rows with individual skills
    ]
  }
}
```

### Complete Skills Example from Live Data
From the actual API response, the skillsTable contains these individual skills:
1. "interpersonal"
2. "Statistical Analysis" 
3. "Information Systems Structures"
4. "inventory control"
5. "point-of-sale (POS)"

### Complete Job Titles Example
From jobTitlesTable:
1. "Tax Intern"
2. "Fellow"

### Complete Companies Example
From companiesTable:
1. "Ernst & Young"

### Complete Industries Example
From industriesTable:
1. "Accounting"

### Complete Certifications Example
From certificationsTable:
1. "Beta Gamma Sigma International Business Honors Society Member"

## Extraction Rules

### 1. Use Table Structure (Primary)
- Extract from `skillsTable`, `jobTitlesTable`, `companiesTable`, `industriesTable`, `certificationsTable`
- Each table has `parsed.rows[]` array
- Each row has `parsed.{keywordType}[]` array
- Each keyword item has `parsed` field with the clean keyword text
- **DO NOT SPLIT** - keywords are already individual items

### 2. Keyword Type Mapping
```javascript
const keywordTypeMap = {
  skillsTable: 'skill',
  jobTitlesTable: 'jobTitle', 
  companiesTable: 'company',
  industriesTable: 'industry',
  certificationsTable: 'certification'
};
```

### 3. Extraction Algorithm
```javascript
function extractKeywordsFromTable(table, keywordType) {
  if (!table?.parsed?.rows) return [];
  
  const keywords = [];
  
  table.parsed.rows.forEach(row => {
    const keywordArray = row.parsed[keywordType] || [];
    
    keywordArray.forEach(keywordItem => {
      const cleanText = keywordItem.parsed?.trim();
      if (cleanText) {
        keywords.push({
          id: generateId(),
          name: cleanText,
          type: keywordType
        });
      }
    });
  });
  
  return keywords;
}
```

## Data Mapping

### Contractor Basic Info
```javascript
const contractor = {
  full_name: data.fullName?.parsed,
  email: data.email?.parsed,
  phone: data.phoneNumber?.parsed?.nationalNumber?.replace(/\D/g, ''), // digits only
  street_address: data.location?.parsed?.rawInput?.split(',')[0],
  city: data.location?.parsed?.city,
  state: data.location?.parsed?.stateCode,
  zip_code: data.location?.parsed?.postalCode,
  country: data.location?.parsed?.country,
  summary: data.summary?.parsed || data.goalsInterests?.parsed,
  notes: data.goalsInterests?.parsed
};
```

### Keywords Structure
```javascript
const keywords = {
  skills: extractKeywordsFromTable(data.skillsTable, 'skill'),
  "job titles": extractKeywordsFromTable(data.jobTitlesTable, 'jobTitle'),
  companies: extractKeywordsFromTable(data.companiesTable, 'company'),
  industries: extractKeywordsFromTable(data.industriesTable, 'industry'),
  certifications: extractKeywordsFromTable(data.certificationsTable, 'certification')
};
```

## Common Mistakes to Avoid

### ❌ Wrong: Splitting Already-Split Keywords
```javascript
// DON'T DO THIS - keywords are already individual
const skillText = "Statistical Analysis";
const splitSkills = skillText.split(' '); // Wrong!
```

### ❌ Wrong: Using Array Structure
```javascript
// DON'T USE - this is legacy/fallback only
const skills = data.skills; // Array format (concatenated strings)
```

### ❌ Wrong: Missing Keywords
```javascript
// DON'T MISS - extract from ALL table rows
table.parsed.rows.forEach(row => {
  // Process EVERY row, not just the first one
});
```

### ✅ Correct: Direct Table Extraction
```javascript
// DO THIS - extract individual keywords from table structure
table.parsed.rows.forEach(row => {
  const skillArray = row.parsed.skill || [];
  skillArray.forEach(skill => {
    keywords.push({
      name: skill.parsed, // Already clean, individual keyword
      type: 'skill'
    });
  });
});
```

## Testing and Validation

### Expected Results from Sample Resume
When processing the Garrison Gagnon resume, you should extract:

**Skills (5 total):**
- interpersonal
- Statistical Analysis
- Information Systems Structures
- inventory control
- point-of-sale (POS)

**Job Titles (2 total):**
- Tax Intern
- Fellow

**Companies (1 total):**
- Ernst & Young

**Industries (1 total):**
- Accounting

**Certifications (1 total):**
- Beta Gamma Sigma International Business Honors Society Member

### Validation Checklist
- [ ] All 5 skills extracted individually
- [ ] All 2 job titles extracted individually  
- [ ] All 1 company extracted
- [ ] All 1 industry extracted
- [ ] All 1 certification extracted
- [ ] No keyword splitting performed
- [ ] Clean text without punctuation artifacts
- [ ] Proper capitalization maintained

## Multiple Table Support

**CRITICAL**: Affinda can return multiple tables of the same type (e.g., multiple `skillsTable` entries). The system must process ALL tables to avoid data loss.

### Multiple Table Scenarios
- Single table: `skillsTable: { ... }`
- Multiple tables: `skillsTable: [{ ... }, { ... }]`

### Processing Logic
```javascript
// Normalize input to array (handles both single and multiple tables)
const normalizeToArray = (input) => {
  if (!input) return [];
  return Array.isArray(input) ? input : [input];
};

// Process all tables and deduplicate results
const extractKeywordsFromMultipleTables = (tables, keywordType) => {
  const tableArray = normalizeToArray(tables);
  const allKeywords = [];
  
  tableArray.forEach((table, index) => {
    console.log(`Processing ${keywordType} table ${index + 1}/${tableArray.length}`);
    const tableKeywords = extractKeywordsFromTable(table, keywordType);
    allKeywords.push(...tableKeywords);
  });
  
  return deduplicateKeywords(allKeywords);
};
```

## Implementation Priority

1. **Primary**: Extract from table structures (`*Table` fields) - supports multiple tables
2. **Fallback**: Only use array structures (`skills`, `companies`, etc.) if tables are not available
3. **Never**: Split keywords that come from table structures - they are already individual items
4. **Always**: Process ALL tables of the same type to prevent data loss

## Error Handling

```javascript
function safeExtractKeywords(data) {
  try {
    // Try table structure first
    if (data.skillsTable) {
      return extractKeywordsFromTable(data.skillsTable, 'skill');
    }
    
    // Fallback to array structure with splitting
    if (data.skills) {
      return extractKeywordsFromArray(data.skills, 'skill');
    }
    
    return [];
  } catch (error) {
    console.error('Keyword extraction failed:', error);
    return [];
  }
}
```

This approach ensures maximum keyword extraction accuracy and prevents data loss during resume processing.