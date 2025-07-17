# Database Schema

## Overview
Horsemeat++ uses Supabase (PostgreSQL) with Row Level Security (RLS) policies for data access control. The schema supports contractor management, keyword tagging, task tracking, and internal employee management.

## Core Tables

### contractor
Primary entity for contractor information.
```sql
- id (uuid, PK) - Auto-generated UUID
- full_name (text) - Contractor's full name
- email (text) - Contact email
- phone (text) - Contact phone number
- street_address (text) - Street address
- city (text) - City
- state (char(2)) - Two-letter state code
- zip_code (text) - Postal code
- country (text) - Country
- preferred_contact (contact_method enum) - email|phone|text
- summary (text) - Professional summary
- hourly_rate (numeric) - Hourly rate if prefers_hourly=true
- salary_lower (numeric) - Lower salary range if prefers_hourly=false
- salary_higher (numeric) - Upper salary range if prefers_hourly=false
- pay_rate_upper (text) - Upper hourly rate range
- pay_type (text) - Employment type (W2, 1099, etc.)
- prefers_hourly (boolean) - Payment preference flag
- available (boolean) - Availability status
- star_candidate (boolean) - Flagged as star candidate
- travel_anywhere (boolean) - Willing to travel anywhere
- travel_radius_miles (integer) - Travel radius if not travel_anywhere
- resume_url (text) - URL to stored resume file
- notes (text) - Additional notes
- inserted_at (timestamp) - Creation timestamp
```

### keyword
Categorized skills, industries, certifications, companies, and job titles.
```sql
- id (uuid, PK) - Auto-generated UUID
- name (text, NOT NULL) - Keyword name
- category (text, NOT NULL) - skills|industries|certifications|companies|job titles
- inserted_at (timestamp) - Creation timestamp
- UNIQUE(name, category) - Prevents duplicates within categories
```

### contractor_keyword
Many-to-many relationship between contractors and keywords.
```sql
- contractor_id (uuid, PK) - FK to contractor.id
- keyword_id (uuid, PK) - FK to keyword.id
- position (integer) - Optional ordering
- note (text) - Optional notes about the relationship
```

### internal_employee
System users who manage contractors.
```sql
- id (uuid, PK) - Auto-generated UUID
- user_id (uuid, NOT NULL, UNIQUE) - FK to Supabase auth.users
- full_name (text) - Employee's full name
- email (text, UNIQUE) - Employee email
- role (text) - Default: 'staff'
- inserted_at (timestamp) - Creation timestamp
```

### contractor_internal_link
Assignment relationship between contractors and internal employees.
```sql
- contractor_id (uuid) - FK to contractor.id
- internal_employee_id (uuid) - FK to internal_employee.id
- assigned_at (timestamp) - Assignment timestamp
```

### contractor_task
Task management for contractors.
```sql
- id (uuid, PK) - Auto-generated UUID
- contractor_id (uuid) - FK to contractor.id
- title (text, NOT NULL) - Task title
- description (text) - Task description
- due_date (timestamp) - Due date
- status (task_status enum) - overdue|in progress|completed
- is_public (boolean) - Visibility flag (default: false)
- created_by (uuid) - FK to internal_employee.user_id
- created_at (timestamp) - Creation timestamp
- updated_at (timestamp) - Last update timestamp
```

### contractor_history
Activity log for contractor interactions.
```sql
- id (uuid, PK) - Auto-generated UUID
- contractor_id (uuid) - FK to contractor.id
- note (text, NOT NULL) - History entry note
- created_by (uuid) - FK to internal_employee.user_id
- inserted_at (timestamp) - Creation timestamp
```

## Enums

### contact_method
```sql
- email
- phone
- text
```

### task_status
```sql
- overdue
- in progress
- completed
```

## Storage

### resumes bucket
- Private bucket for storing contractor resume files
- Accessed via signed URLs for security
- Supports PDF and Word document formats

## Row Level Security (RLS)

All tables have RLS enabled with policies allowing:
- Authenticated users can read/write most data
- Users can only modify their own created records (tasks, history)
- Development environment has broader access for testing

## Key Relationships

1. **Contractor ↔ Keywords**: Many-to-many via contractor_keyword
2. **Contractor ↔ Employees**: Many-to-many via contractor_internal_link
3. **Contractor → Tasks**: One-to-many
4. **Contractor → History**: One-to-many
5. **Employee → Auth User**: One-to-one via user_id

## Data Access Patterns

- Use Supabase client with TypeScript types from `src/integrations/supabase/types.ts`
- All database operations should handle errors gracefully
- Use transactions for multi-table operations (contractor creation with keywords)
- Implement proper loading states for async operations