# Complete Database Schema

Here's the full schema of your current Supabase database:

## Tables and Columns

1. contractor

   id (uuid, NOT NULL, PK) - Default: extensions.uuid_generate_v4()
   full_name (text, nullable)
   email (text, nullable)
   phone (text, nullable)
   hourly_rate (numeric, nullable)
   available (boolean, nullable) - Default: true
   star_candidate (boolean, nullable) - Default: false
   notes (text, nullable)
   resume_url (text, nullable)
   prefers_hourly (boolean, nullable) - Default: false
   inserted_at (timestamp with time zone, nullable) - Default: now()
   salary_lower (numeric, nullable)
   salary_higher (numeric, nullable)
   pay_type (text, nullable)
   city (text, nullable)
   state (character(2), nullable)
   preferred_contact (contact_method enum, NOT NULL) - Default: 'email'::contact_method
   travel_anywhere (boolean, NOT NULL) - Default: false
   travel_radius_miles (integer, nullable)
   summary (text, nullable)
   owner_id (uuid, nullable) - FK to internal_employee.id
   pay_rate_upper (text, nullable)

2. contractor_history

   id (uuid, NOT NULL, PK) - Default: extensions.uuid_generate_v4()
   contractor_id (uuid, nullable) - FK to contractor.id
   note (text, NOT NULL)
   inserted_at (timestamp with time zone, nullable) - Default: now()
   created_by (uuid, nullable) - FK to internal_employee.user_id

3. contractor_keyword (Junction table)

   contractor_id (uuid, NOT NULL, PK) - FK to contractor.id
   keyword_id (uuid, NOT NULL, PK) - FK to keyword.id
   position (integer, nullable)
   note (text, nullable)

4. contractor_task

   id (uuid, NOT NULL, PK) - Default: extensions.uuid_generate_v4()
   contractor_id (uuid, nullable) - FK to contractor.id
   title (text, NOT NULL)
   description (text, nullable)
   due_date (timestamp with time zone, nullable)
   status (task_status enum, NOT NULL)
   created_at (timestamp with time zone, nullable) - Default: now()
   updated_at (timestamp with time zone, nullable) - Default: now()
   created_by (uuid, nullable) - FK to internal_employee.user_id
   is_public (boolean, nullable) - Default: false

5. internal_employee

   id (uuid, NOT NULL, PK) - Default: extensions.uuid_generate_v4()
   user_id (uuid, NOT NULL, UNIQUE)
   full_name (text, nullable)
   email (text, nullable, UNIQUE)
   role (text, nullable) - Default: 'staff'::text
   inserted_at (timestamp with time zone, nullable) - Default: now()

6. keyword

   id (uuid, NOT NULL, PK) - Default: extensions.uuid_generate_v4()
   name (text, NOT NULL)
   category (text, NOT NULL)
   inserted_at (timestamp with time zone, nullable) - Default: now()
   UNIQUE constraint: (name, category)

Enums

1. contact_method

   email
   phone
   text

2. task_status

   overdue
   in progress
   completed

Foreign Key Relationships

    contractor.owner_id → internal_employee.id
    contractor_keyword.contractor_id → contractor.id
    contractor_keyword.keyword_id → keyword.id
    contractor_task.contractor_id → contractor.id
    contractor_task.created_by → internal_employee.user_id
    contractor_history.contractor_id → contractor.id
    contractor_history.created_by → internal_employee.user_id

Constraints
Check Constraints

    contractor: Travel radius validation (positive values and travel_anywhere logic)
    keyword: Category validation

Unique Constraints

    internal_employee: user_id, email
    keyword: (name, category) combination

Row Level Security (RLS) Policies
contractor

    contractor_read: Allow authenticated users to SELECT
    contractor_insert/contractor_write: Allow authenticated users to INSERT
    contractor_update: Allow authenticated users to UPDATE
    contractor_delete: Allow authenticated users to DELETE

contractor_history

    All internal users can read contractor history: Everyone can SELECT
    Allow all read/write for dev: Full access for development
    User can insert their own contractor history entry: Users can INSERT their own records
    User can update their own contractor history: Users can UPDATE their own records

contractor_task

    Allow all read/write for dev: Full access for development

contractor_keyword

    Allow all read/write for dev: Full access for development

internal_employee

    All authenticated users can view internal employees: Authenticated users can SELECT all employee records
    Allow employee to insert self: Users can INSERT their own employee record

keyword

    Allow all read/write for dev: Full access for development

Storage

    resumes bucket (private) - For storing contractor resume files

This schema supports a contractor management system with task tracking, keyword tagging, history logging, and internal employee management, all with appropriate security policies and data relationships.
