-- Check the constraint definition for keyword_category_check
SELECT pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conname = 'keyword_category_check';

-- Check the current distinct values in the category column
SELECT DISTINCT category FROM keyword ORDER BY category;