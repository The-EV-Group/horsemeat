# Design Document

## Overview

This design addresses the limitation in the current Affinda integration where only single tables per keyword type are processed. The solution will enable extraction from multiple tables of the same type (e.g., multiple `skillsTable` entries) while maintaining backward compatibility and ensuring no data loss.

## Architecture

### Current Architecture Issues

The current implementation assumes a single table per type:
```typescript
// Current - only processes one table
if (resumeData.skillsTable) {
  keywords.skills = extractKeywordsFromTable(resumeData.skillsTable, 'skill');
}
```

### New Architecture

The new architecture will support both single tables and arrays of tables:
```typescript
// New - processes multiple tables
const skillsTables = normalizeToArray(resumeData.skillsTable);
keywords.skills = extractKeywordsFromMultipleTables(skillsTables, 'skill');
```

## Components and Interfaces

### 1. Type System Updates

#### Updated AffindaResumeData Interface
```typescript
export interface AffindaResumeData {
  // ... existing fields ...
  
  // Support both single table and array of tables
  skillsTable?: AffindaTable | AffindaTable[];
  industriesTable?: AffindaTable | AffindaTable[];
  jobTitlesTable?: AffindaTable | AffindaTable[];
  certificationsTable?: AffindaTable | AffindaTable[];
  companiesTable?: AffindaTable | AffindaTable[];
  
  // ... rest of interface ...
}
```

#### Table Processing Configuration
```typescript
interface TableProcessingConfig {
  tableKey: keyof AffindaResumeData;
  keywordType: string;
  categoryName: keyof ParsedResumeData['keywords'];
}

const TABLE_CONFIGS: TableProcessingConfig[] = [
  { tableKey: 'skillsTable', keywordType: 'skill', categoryName: 'skills' },
  { tableKey: 'jobTitlesTable', keywordType: 'jobTitle', categoryName: 'job titles' },
  { tableKey: 'companiesTable', keywordType: 'company', categoryName: 'companies' },
  { tableKey: 'industriesTable', keywordType: 'industry', categoryName: 'industries' },
  { tableKey: 'certificationsTable', keywordType: 'certification', categoryName: 'certifications' }
];
```

### 2. Core Processing Functions

#### Table Normalization Function
```typescript
function normalizeToArray<T>(input: T | T[] | undefined): T[] {
  if (!input) return [];
  return Array.isArray(input) ? input : [input];
}
```

#### Multiple Table Extraction Function
```typescript
function extractKeywordsFromMultipleTables(
  tables: AffindaTable[], 
  keywordType: string
): ExtractedKeyword[] {
  const allKeywords: ExtractedKeyword[] = [];
  
  tables.forEach((table, index) => {
    console.log(`Processing ${keywordType} table ${index + 1}/${tables.length}`);
    const tableKeywords = extractKeywordsFromTable(table, keywordType);
    allKeywords.push(...tableKeywords);
  });
  
  return deduplicateKeywords(allKeywords);
}
```

#### Deduplication Function
```typescript
function deduplicateKeywords(keywords: ExtractedKeyword[]): ExtractedKeyword[] {
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
  
  console.log(`Deduplication: ${keywords.length} → ${deduplicated.length} keywords`);
  return deduplicated;
}
```

### 3. Enhanced Mapper Function

#### Main Mapping Logic
```typescript
export const mapAffindaResponseToAppData = (resumeData: AffindaResumeData): ParsedResumeData => {
  // ... existing contractor extraction ...
  
  // Process all table types with multiple table support
  const keywords = {
    skills: [] as ExtractedKeyword[],
    industries: [] as ExtractedKeyword[],
    certifications: [] as ExtractedKeyword[],
    companies: [] as ExtractedKeyword[],
    "job titles": [] as ExtractedKeyword[]
  };
  
  // Process each table type
  for (const config of TABLE_CONFIGS) {
    const tables = normalizeToArray(resumeData[config.tableKey] as AffindaTable | AffindaTable[]);
    
    if (tables.length > 0) {
      console.log(`✅ Processing ${tables.length} ${config.tableKey}(s)...`);
      keywords[config.categoryName] = extractKeywordsFromMultipleTables(tables, config.keywordType);
    } else {
      console.log(`⚠️ No ${config.tableKey} found, trying fallback...`);
      // Fallback to array structure if available
      // ... fallback logic ...
    }
  }
  
  return { contractor, keywords };
};
```

## Data Models

### Processing Flow Data Model

```typescript
interface ProcessingStats {
  tablesProcessed: number;
  keywordsExtracted: number;
  keywordsAfterDeduplication: number;
  duplicatesRemoved: number;
}

interface TableProcessingResult {
  categoryName: string;
  stats: ProcessingStats;
  keywords: ExtractedKeyword[];
}
```

### Logging Data Model

```typescript
interface ExtractionLog {
  tableType: string;
  tableIndex: number;
  totalTables: number;
  keywordsFound: number;
  sampleKeywords: string[];
}
```

## Error Handling

### Table Processing Error Handling

```typescript
function safeExtractFromMultipleTables(
  tables: AffindaTable[], 
  keywordType: string
): ExtractedKeyword[] {
  const allKeywords: ExtractedKeyword[] = [];
  let successfulTables = 0;
  
  for (let i = 0; i < tables.length; i++) {
    try {
      const tableKeywords = extractKeywordsFromTable(tables[i], keywordType);
      allKeywords.push(...tableKeywords);
      successfulTables++;
    } catch (error) {
      console.error(`Error processing ${keywordType} table ${i + 1}:`, error);
      // Continue processing remaining tables
    }
  }
  
  console.log(`Successfully processed ${successfulTables}/${tables.length} ${keywordType} tables`);
  return deduplicateKeywords(allKeywords);
}
```

### Graceful Degradation

1. **Single Table Fallback**: If multiple table processing fails, fall back to single table processing
2. **Array Structure Fallback**: If table processing fails entirely, fall back to array structure
3. **Partial Success**: Continue processing even if some tables fail
4. **Empty Result Handling**: Return empty arrays rather than throwing errors

## Testing Strategy

### Unit Tests

1. **Table Normalization Tests**
   - Test single table input → array output
   - Test array input → same array output
   - Test undefined input → empty array output

2. **Multiple Table Processing Tests**
   - Test extraction from 2+ tables of same type
   - Test deduplication across tables
   - Test error handling when one table fails

3. **Backward Compatibility Tests**
   - Test single table scenarios still work
   - Test existing API responses continue to work

### Integration Tests

1. **End-to-End Processing Tests**
   - Mock Affinda response with multiple tables
   - Verify all keywords extracted
   - Verify deduplication works correctly

2. **Real API Response Tests**
   - Test with actual multi-table API responses
   - Validate against expected keyword counts
   - Verify no data loss occurs

### Performance Tests

1. **Large Dataset Tests**
   - Test with resumes containing many tables
   - Verify performance remains acceptable
   - Test memory usage with large keyword sets

## Implementation Phases

### Phase 1: Core Infrastructure
1. Update type definitions to support multiple tables
2. Implement table normalization function
3. Create deduplication logic
4. Add comprehensive logging

### Phase 2: Mapper Integration
1. Update main mapper function
2. Implement multiple table processing
3. Add error handling and fallbacks
4. Update existing extraction functions

### Phase 3: Testing and Validation
1. Create comprehensive test suite
2. Test with various resume formats
3. Validate against real API responses
4. Performance testing and optimization

### Phase 4: Documentation and Monitoring
1. Update steering documentation
2. Add monitoring for multiple table scenarios
3. Create debugging tools
4. Update user-facing documentation

## Backward Compatibility

The design maintains full backward compatibility:

1. **Single Table Support**: Existing single table responses continue to work
2. **API Compatibility**: No changes to public API interfaces
3. **Fallback Mechanisms**: Multiple fallback strategies ensure robustness
4. **Type Safety**: Union types support both old and new response formats

## Performance Considerations

1. **Deduplication Efficiency**: Use Set-based deduplication for O(n) performance
2. **Memory Management**: Process tables sequentially to avoid memory spikes
3. **Early Termination**: Stop processing if critical errors occur
4. **Logging Optimization**: Use conditional logging to avoid performance impact

## Security Considerations

1. **Input Validation**: Validate table structure before processing
2. **Error Information**: Avoid exposing sensitive data in error messages
3. **Resource Limits**: Prevent excessive memory usage with large datasets
4. **Sanitization**: Ensure extracted keywords are properly sanitized