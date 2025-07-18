const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function testKeywordFunction() {
  console.log('Testing get_keyword_usage function...');
  
  try {
    // Test the RPC function
    const { data, error } = await supabase.rpc('get_keyword_usage');
    
    if (error) {
      console.error('Error calling function:', error);
      return;
    }
    
    console.log(`Function returned ${data?.length || 0} results`);
    
    if (data && data.length > 0) {
      console.log('Sample results:');
      data.slice(0, 5).forEach(row => {
        console.log(`- Keyword ID: ${row.keyword_id}, Count: ${row.contractor_count}`);
      });
    }
    
    // Also test a simple keyword query to compare
    const { data: keywords, error: keywordError } = await supabase
      .from('keyword')
      .select('id, name, category')
      .limit(5);
      
    if (keywordError) {
      console.error('Error fetching keywords:', keywordError);
    } else {
      console.log(`\nFound ${keywords?.length || 0} keywords in database`);
      if (keywords && keywords.length > 0) {
        console.log('Sample keywords:');
        keywords.forEach(k => {
          console.log(`- ${k.name} (${k.category})`);
        });
      }
    }
    
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

testKeywordFunction();