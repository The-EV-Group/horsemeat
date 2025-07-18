require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkKeywordCategories() {
  try {
    // Get all distinct categories
    const { data: categories, error: catError } = await supabase
      .from('keyword')
      .select('category')
      .limit(1000);
    
    if (catError) {
      console.error('Error fetching categories:', catError);
      return;
    }
    
    // Count unique categories
    const uniqueCategories = new Set(categories.map(k => k.category));
    console.log('Unique categories in database:', Array.from(uniqueCategories));
    
    // Count keywords per category
    for (const category of uniqueCategories) {
      const { data, error } = await supabase
        .from('keyword')
        .select('id')
        .eq('category', category);
        
      if (error) {
        console.error(`Error counting keywords for category ${category}:`, error);
        continue;
      }
      
      console.log(`Category "${category}": ${data.length} keywords`);
    }
    
    // Check total keyword count
    const { data: allKeywords, error: countError } = await supabase
      .from('keyword')
      .select('id');
      
    if (countError) {
      console.error('Error counting all keywords:', countError);
      return;
    }
    
    console.log(`Total keywords in database: ${allKeywords.length}`);
    
    // Count total links
    const { data, error: countLinksError } = await supabase
      .from('contractor_keyword')
      .select('id');
      
    if (countLinksError) {
      console.error('Error counting all links:', countLinksError);
    } else {
      console.log(`\nTotal contractor-keyword links: ${data.length}`);
    }
    
    // Check a specific keyword to see if it has links
    const { data: sampleKeyword, error: sampleError } = await supabase
      .from('keyword')
      .select('*')
      .eq('category', 'skill')
      .limit(1)
      .single();
      
    if (sampleError) {
      console.error('Error fetching sample keyword:', sampleError);
    } else {
      console.log(`\nSample keyword: ${sampleKeyword.name} (${sampleKeyword.category})`);
      
      const { data: keywordLinks, error: linkError } = await supabase
        .from('contractor_keyword')
        .select('contractor_id')
        .eq('keyword_id', sampleKeyword.id);
        
      if (linkError) {
        console.error(`Error checking links for keyword ${sampleKeyword.id}:`, linkError);
      } else {
        console.log(`Links for keyword "${sampleKeyword.name}": ${keywordLinks.length}`);
      }
    }
    
  } catch (err) {
    console.error('Error:', err);
  }
}

checkKeywordCategories();