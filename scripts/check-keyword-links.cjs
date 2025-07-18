require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkKeywordLinks() {
  try {
    console.log('Checking keyword links...');
    
    // Get total count of links
    const { count: totalLinks, error: countError } = await supabase
      .from('contractor_keyword')
      .select('*', { count: 'exact', head: true });
      
    if (countError) {
      console.error('Error counting links:', countError);
      return;
    }
    
    console.log(`Total contractor-keyword links: ${totalLinks}`);
    
    // Get all unique keyword IDs that have links
    const { data: linkedKeywords, error: keywordError } = await supabase
      .from('contractor_keyword')
      .select('keyword_id')
      .limit(10000);
      
    if (keywordError) {
      console.error('Error fetching linked keywords:', keywordError);
      return;
    }
    
    // Create a set of unique keyword IDs
    const linkedKeywordIds = new Set();
    linkedKeywords.forEach(link => {
      linkedKeywordIds.add(link.keyword_id);
    });
    
    console.log(`Found ${linkedKeywordIds.size} unique keywords with links`);
    
    // Save the linked keyword IDs to a file
    const linkedKeywordIdsArray = Array.from(linkedKeywordIds);
    fs.writeFileSync('linked_keyword_ids.json', JSON.stringify(linkedKeywordIdsArray, null, 2));
    
    console.log('Saved linked keyword IDs to linked_keyword_ids.json');
    
  } catch (err) {
    console.error('Error:', err);
  }
}

checkKeywordLinks();