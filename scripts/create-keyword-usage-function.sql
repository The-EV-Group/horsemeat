-- Create a function to efficiently count keyword usage
CREATE OR REPLACE FUNCTION get_keyword_usage()
RETURNS TABLE (
  keyword_id UUID,
  contractor_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ck.keyword_id,
    COUNT(DISTINCT ck.contractor_id) as contractor_count
  FROM 
    contractor_keyword ck
  GROUP BY 
    ck.keyword_id;
END;
$$ LANGUAGE plpgsql;