-- Temporarily modify the keyword_category_check constraint
ALTER TABLE keyword DROP CONSTRAINT IF EXISTS keyword_category_check;

-- Add a new constraint that allows our categories
ALTER TABLE keyword ADD CONSTRAINT keyword_category_check 
CHECK (category IN ('skills', 'industries', 'certifications', 'companies', 'job_titles', 'jobtitles'));