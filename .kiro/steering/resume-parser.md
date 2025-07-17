---
title: Resume Parser Steering
inclusion: fileMatch
fileMatchPattern: '**/resumeProcessor.ts'
---

# Resume Parser Guidelines

## Overview
The resume parser integrates with the Affinda API to extract structured data from contractor resumes. This component is critical for the contractor onboarding workflow, as it automates the extraction of key information like work experience, skills, and education.

## Current Implementation
- Uses Affinda API for document parsing
- Handles PDF and Word document formats
- Extracts data and maps it to our contractor schema
- Stores resume files in Supabase storage

## Known Issues
- Resume URLs from external systems may expire or be inaccessible
- Error handling for failed API requests needs improvement
- Resume parsing results may need manual verification
- Large files may cause timeouts or memory issues

## Best Practices
- Always validate input URLs before sending to Affinda
- Implement proper error handling with specific error messages
- Consider implementing a retry mechanism for transient failures
- Store parsed data alongside the original resume for reference
- Implement a fallback mechanism when parsing fails
- Add logging for debugging and monitoring purposes

## Implementation Guidelines
- Use the service role key for Supabase storage operations
- Implement proper file type validation before processing
- Consider adding a queue system for large batch processing
- Add progress reporting for long-running operations
- Ensure proper cleanup of temporary files

## Testing Approach
- Test with various resume formats (PDF, DOCX, etc.)
- Test with resumes of different sizes and complexities
- Test error scenarios (invalid URLs, API failures, etc.)
- Verify parsed data against expected output
- Test integration with the contractor import workflow

## Security Considerations
- Ensure secure handling of resume files and personal data
- Implement proper access controls for stored resumes
- Validate and sanitize all inputs to prevent injection attacks
- Use HTTPS for all external API calls
- Do not expose sensitive API keys in client-side code