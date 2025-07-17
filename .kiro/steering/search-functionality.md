---
title: Search Functionality Steering
inclusion: fileMatch
fileMatchPattern: '**/search*.ts'
---

# Search Functionality Guidelines

## Overview
The search functionality allows users to find contractors based on various criteria including skills, experience, location, and availability. This is a core feature of the Horsemeat++ application that enables efficient contractor management and matching.

## Current Implementation
- Uses Supabase PostgreSQL full-text search capabilities
- Supports filtering by multiple criteria (keywords, location, availability, etc.)
- Implements pagination for large result sets
- Handles keyword matching across different categories

## Known Issues
- Performance degradation with complex queries or large datasets
- Inconsistent results when searching across multiple keyword categories
- Potential issues with case sensitivity and special characters
- Lack of proper ranking/relevance scoring for search results
- Contractor-keyword relationship queries may be inefficient

## Best Practices
- Use PostgreSQL's full-text search capabilities (tsvector, tsquery) for text search
- Implement proper indexing for frequently searched fields
- Use parameterized queries to prevent SQL injection
- Implement caching for frequent searches
- Consider implementing a search queue for complex queries
- Use proper error handling and provide meaningful error messages

## Implementation Guidelines
- Optimize queries to minimize database round-trips
- Use JOINs efficiently when querying related tables
- Implement proper pagination with cursor-based approach for large datasets
- Consider implementing faceted search for better filtering
- Add sorting options (relevance, date added, name, etc.)
- Implement proper input validation and sanitization

## Query Optimization
- Use appropriate indexes on search fields
- Consider using materialized views for complex aggregations
- Use EXPLAIN ANALYZE to identify query bottlenecks
- Consider using GIN indexes for full-text search
- Optimize JOIN operations with contractor_keyword table

## Testing Approach
- Test with various search criteria combinations
- Test with large datasets to ensure performance
- Test edge cases (empty results, maximum results, etc.)
- Verify search results against expected output
- Test pagination and sorting functionality

## User Experience Considerations
- Provide clear feedback on search progress and results
- Implement type-ahead suggestions for common searches
- Allow saving and sharing of search queries
- Provide clear error messages for failed searches
- Consider implementing "did you mean" functionality for typos