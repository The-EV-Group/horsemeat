---
title: Keyword Management Steering
inclusion: fileMatch
fileMatchPattern: '**/keyword*.ts'
---

# Keyword Management Guidelines

## Overview
The keyword system is a core component of Horsemeat++, enabling categorization and tagging of contractors by skills, industries, certifications, companies, and job titles. This system powers the search functionality and helps match contractors to opportunities.

## Current Implementation
- Keywords are stored in a dedicated `keyword` table with name and category fields
- Categories are enforced via a check constraint (`keyword_category_check`)
- Valid categories: 'skill', 'industry', 'certification', 'company', 'job_title'
- Contractor-keyword relationships are managed via the `contractor_keyword` junction table
- Uniqueness constraint prevents duplicate keywords within the same category

## Known Issues
- Case sensitivity issues when adding or searching keywords
- Potential for duplicate keywords with different spellings or formats
- Inefficient queries when linking contractors to multiple keywords
- Constraint violations when using incorrect category values
- Potential race conditions when adding keywords concurrently

## Best Practices
- Always use the correct singular form for categories ('skill', not 'skills')
- Normalize keyword names before insertion (trim, lowercase comparison)
- Check for existing keywords before creating new ones
- Use batch operations when linking multiple keywords to a contractor
- Implement proper error handling for constraint violations
- Consider implementing a keyword suggestion system for common terms

## Implementation Guidelines
- Use the service role key for administrative keyword operations
- Implement proper validation for keyword names and categories
- Consider adding a synonym system for related keywords
- Add proper indexing for frequently queried keyword fields
- Implement a keyword cleanup/merge utility for maintenance

## Database Considerations
- Maintain the uniqueness constraint on (lower(name), category)
- Consider adding a weight or relevance score for keyword-contractor relationships
- Implement proper indexing on the junction table for efficient queries
- Consider adding a hierarchical relationship between keywords (parent-child)
- Add timestamps for tracking when keywords are added or modified

## Testing Approach
- Test with various keyword categories and names
- Test uniqueness constraints and error handling
- Test batch operations with multiple keywords
- Verify keyword normalization and matching
- Test integration with the search functionality

## User Experience Considerations
- Provide autocomplete suggestions when adding keywords
- Group keywords by category for better organization
- Allow bulk operations for keyword management
- Provide clear feedback on keyword operations
- Consider implementing a keyword cloud visualization