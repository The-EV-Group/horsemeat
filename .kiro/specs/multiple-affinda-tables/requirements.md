# Requirements Document

## Introduction

The current Affinda resume parser integration only extracts keywords from a single table per type (e.g., one `skillsTable`), but the Affinda API can return multiple tables of the same type. This results in incomplete keyword extraction and data loss during resume processing.

## Requirements

### Requirement 1

**User Story:** As a user uploading a resume, I want all skills to be extracted from the document, so that no relevant keywords are missed during the parsing process.

#### Acceptance Criteria

1. WHEN a resume contains multiple skills sections THEN the system SHALL extract keywords from ALL skills tables
2. WHEN Affinda returns multiple `skillsTable` entries THEN the system SHALL process each table individually
3. WHEN processing multiple tables THEN the system SHALL combine all extracted keywords into a single category
4. WHEN duplicate keywords exist across tables THEN the system SHALL deduplicate them based on name (case-insensitive)

### Requirement 2

**User Story:** As a user uploading a resume, I want all job titles to be extracted from the document, so that my complete work history is captured.

#### Acceptance Criteria

1. WHEN a resume contains multiple job title sections THEN the system SHALL extract keywords from ALL job titles tables
2. WHEN Affinda returns multiple `jobTitlesTable` entries THEN the system SHALL process each table individually
3. WHEN processing multiple tables THEN the system SHALL combine all extracted keywords into a single category
4. WHEN duplicate job titles exist across tables THEN the system SHALL deduplicate them based on name (case-insensitive)

### Requirement 3

**User Story:** As a user uploading a resume, I want all companies to be extracted from the document, so that my complete employment history is captured.

#### Acceptance Criteria

1. WHEN a resume contains multiple company sections THEN the system SHALL extract keywords from ALL companies tables
2. WHEN Affinda returns multiple `companiesTable` entries THEN the system SHALL process each table individually
3. WHEN processing multiple tables THEN the system SHALL combine all extracted keywords into a single category
4. WHEN duplicate companies exist across tables THEN the system SHALL deduplicate them based on name (case-insensitive)

### Requirement 4

**User Story:** As a user uploading a resume, I want all industries to be extracted from the document, so that my complete industry experience is captured.

#### Acceptance Criteria

1. WHEN a resume contains multiple industry sections THEN the system SHALL extract keywords from ALL industries tables
2. WHEN Affinda returns multiple `industriesTable` entries THEN the system SHALL process each table individually
3. WHEN processing multiple tables THEN the system SHALL combine all extracted keywords into a single category
4. WHEN duplicate industries exist across tables THEN the system SHALL deduplicate them based on name (case-insensitive)

### Requirement 5

**User Story:** As a user uploading a resume, I want all certifications to be extracted from the document, so that my complete certification history is captured.

#### Acceptance Criteria

1. WHEN a resume contains multiple certification sections THEN the system SHALL extract keywords from ALL certifications tables
2. WHEN Affinda returns multiple `certificationsTable` entries THEN the system SHALL process each table individually
3. WHEN processing multiple tables THEN the system SHALL combine all extracted keywords into a single category
4. WHEN duplicate certifications exist across tables THEN the system SHALL deduplicate them based on name (case-insensitive)

### Requirement 6

**User Story:** As a developer, I want the system to handle both single and multiple table scenarios, so that the integration is robust and backward compatible.

#### Acceptance Criteria

1. WHEN Affinda returns a single table per type THEN the system SHALL process it correctly (backward compatibility)
2. WHEN Affinda returns multiple tables per type THEN the system SHALL process all tables
3. WHEN Affinda returns an array of tables THEN the system SHALL iterate through each table
4. WHEN Affinda returns a single table object THEN the system SHALL process it as a single-item array

### Requirement 7

**User Story:** As a developer, I want comprehensive logging for multiple table processing, so that I can debug and validate the extraction process.

#### Acceptance Criteria

1. WHEN processing multiple tables THEN the system SHALL log the number of tables found for each type
2. WHEN extracting from each table THEN the system SHALL log which table is being processed
3. WHEN combining keywords THEN the system SHALL log the total count before and after deduplication
4. WHEN deduplication occurs THEN the system SHALL log which keywords were removed as duplicates

### Requirement 8

**User Story:** As a user, I want the system to maintain data integrity when processing multiple tables, so that no keywords are lost or corrupted.

#### Acceptance Criteria

1. WHEN processing multiple tables THEN the system SHALL preserve all unique keywords
2. WHEN combining tables THEN the system SHALL maintain the original keyword structure (id, name, type)
3. WHEN deduplicating THEN the system SHALL keep the first occurrence of each unique keyword
4. WHEN an error occurs in one table THEN the system SHALL continue processing remaining tables

### Requirement 9

**User Story:** As a developer, I want the type definitions to support multiple tables, so that the code is type-safe and maintainable.

#### Acceptance Criteria

1. WHEN defining Affinda response types THEN the system SHALL support both single table and array of tables
2. WHEN processing tables THEN the system SHALL use proper TypeScript types
3. WHEN extracting keywords THEN the system SHALL maintain type safety throughout the process
4. WHEN handling edge cases THEN the system SHALL provide proper type guards

### Requirement 10

**User Story:** As a user, I want the system to provide accurate feedback about keyword extraction, so that I know how many keywords were found from my resume.

#### Acceptance Criteria

1. WHEN multiple tables are processed THEN the system SHALL report the total number of keywords extracted
2. WHEN deduplication occurs THEN the system SHALL report the final count after deduplication
3. WHEN displaying results THEN the system SHALL show keywords from all processed tables
4. WHEN logging extraction results THEN the system SHALL indicate which tables contributed to the final result