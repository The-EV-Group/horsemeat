-- Temporarily modify the keyword_category_check constraint
ALTER TABLE keyword DROP CONSTRAINT IF EXISTS keyword_category_check;

-- Add a new constraint that allows our categories (both singular and plural forms)
ALTER TABLE keyword ADD CONSTRAINT keyword_category_check 
CHECK (category IN ('skill', 'skills', 'industry', 'industries', 'certification', 'certifications', 'company', 'companies', 'job_title', 'job_titles', 'jobtitles'));