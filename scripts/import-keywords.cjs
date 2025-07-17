#!/usr/bin/env node

// This script imports keywords from the contractors data
console.log('Starting keywords import script...');

// Load environment variables from .env file
require('dotenv').config();

// Use CommonJS require for Node.js script
require('esbuild-register');

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  test: false
};

// Process arguments
for (let i = 0; i < args.length; i++) {
  const arg = args[i].toLowerCase();
  
  if (arg === '--test') {
    options.test = true;
  } else if (arg === '--help' || arg === '-h') {
    console.log(`
Usage: node scripts/import-keywords.cjs [options]

Options:
  --test          Run in test mode
  --help, -h      Show this help message
`);
    process.exit(0);
  }
}

// Set environment variables for Supabase
process.env.VITE_SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://rvpipfohtzpftehwrake.supabase.co';
process.env.VITE_SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2cGlwZm9odHpwZnRlaHdyYWtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE4MjYzMDYsImV4cCI6MjA2NzQwMjMwNn0.6Xdivl91QgaQwzSwe_j2bWSFDfufrHUNSZ9rf80-XHA';

// Use service role key for admin operations if available
if (process.env.VITE_SUPABASE_SERVICE_ROLE_KEY) {
  console.log('Service role key found. Using elevated permissions for import.');
} else {
  console.warn('No service role key found. Import may fail due to permission issues.');
  console.warn('Add VITE_SUPABASE_SERVICE_ROLE_KEY to your .env file for proper permissions.');
}

// Import the necessary functions
const { supabase, supabaseAdmin } = require('../src/lib/supabase');
const fs = require('fs');
const path = require('path');

// Function to ensure a keyword exists in the database
async function ensureKeywordExists(name, category) {
  // Normalize the name
  const normalizedName = name.trim();
  
  // Skip empty keywords
  if (!normalizedName) return null;
  
  try {
    // Use supabaseAdmin if available (Node.js environment), otherwise fall back to regular client
    const client = typeof supabaseAdmin === 'object' && supabaseAdmin !== null ? supabaseAdmin : supabase;
    
    // First, try to find the keyword with the exact name and category
    const { data: existingKeyword, error: searchError } = await client
      .from('keyword')
      .select('id')
      .eq('name', normalizedName)
      .eq('category', category)
      .maybeSingle();
    
    if (searchError && searchError.code !== 'PGRST116') {
      console.error(`Error searching for keyword ${normalizedName} (${category}):`, searchError);
      return null;
    }
    
    // If we found the keyword, return its ID
    if (existingKeyword) {
      console.log(`Found existing keyword: ${normalizedName} (${category})`);
      return existingKeyword.id;
    }
    
    console.log(`Creating new keyword: ${normalizedName} (${category})`);
    
    // Create new keyword with the specified category
    const { data: newKeyword, error: insertError } = await client
      .from('keyword')
      .insert({
        name: normalizedName,
        category: category
      })
      .select('id')
      .single();
    
    if (insertError) {
      console.error(`Error creating keyword ${normalizedName} (${category}):`, insertError);
      throw insertError;
    }
    
    return newKeyword.id;
  } catch (error) {
    console.error(`Error ensuring keyword exists: ${normalizedName} (${category})`, error);
    return null;
  }
}

// Function to extract and import all keywords from contractors data
async function importKeywords(contractors) {
  console.log(`Starting keyword import for ${contractors.length} contractors...`);
  
  // Track all keywords to avoid duplicates
  const processedKeywords = new Map();
  const keywordMap = new Map();
  
  // Define the category mappings
  const categories = [
    { source: 'job_titles', target: 'job_title' },
    { source: 'skills', target: 'skill' },
    { source: 'industries', target: 'industry' },
    { source: 'certifications', target: 'certification' },
    { source: 'companies', target: 'company' }
  ];
  
  // First pass: collect all unique keywords
  console.log('Collecting all unique keywords...');
  for (const contractor of contractors) {
    const sourceData = contractor.sourceData;
    
    for (const category of categories) {
      const keywords = sourceData[category.source] || [];
      for (const keyword of keywords) {
        if (keyword && keyword.trim()) {
          const normalizedKeyword = keyword.trim();
          const key = `${normalizedKeyword.toLowerCase()}:${category.target}`;
          
          if (!processedKeywords.has(key)) {
            processedKeywords.set(key, {
              name: normalizedKeyword,
              category: category.target
            });
          }
        }
      }
    }
  }
  
  console.log(`Found ${processedKeywords.size} unique keywords to process`);
  
  // Second pass: ensure all keywords exist in the database
  console.log('Creating keywords in database...');
  let created = 0;
  let existing = 0;
  let failed = 0;
  
  for (const [key, keywordData] of processedKeywords.entries()) {
    const keywordId = await ensureKeywordExists(keywordData.name, keywordData.category);
    
    if (keywordId) {
      keywordMap.set(key, keywordId);
      if (key.includes('existing')) {
        existing++;
      } else {
        created++;
      }
    } else {
      failed++;
    }
  }
  
  console.log(`Keyword import complete: ${created} created, ${existing} already existed, ${failed} failed`);
  
  // Save the keyword map to a file for later linking
  const outputFile = path.resolve(process.cwd(), 'keyword_map.json');
  fs.writeFileSync(outputFile, JSON.stringify(Array.from(keywordMap.entries()), null, 2));
  console.log(`Saved keyword map to ${outputFile} for contractor-keyword linking`);
  
  return {
    created,
    existing,
    failed,
    total: processedKeywords.size
  };
}

// Main function to run the import
async function runImport(options) {
  try {
    console.log('Starting keyword import process...');
    
    // Read the imported contractors file
    const contractorsFile = path.resolve(process.cwd(), 'imported_contractors.json');
    
    if (!fs.existsSync(contractorsFile)) {
      throw new Error('Could not find imported_contractors.json file. Run import-contractors-only.cjs first.');
    }
    
    console.log(`Reading contractors from: ${contractorsFile}`);
    
    const fileContent = fs.readFileSync(contractorsFile, 'utf8');
    const contractors = JSON.parse(fileContent);
    
    console.log(`Found ${contractors.length} imported contractors`);
    
    // Run the keyword import
    const result = await importKeywords(contractors);
    
    // Log the results
    console.log('\nKeyword import completed!');
    console.log(`Total keywords: ${result.total}`);
    console.log(`Created: ${result.created}`);
    console.log(`Already existed: ${result.existing}`);
    console.log(`Failed: ${result.failed}`);
    
    return result;
  } catch (error) {
    console.error('Error running keyword import:', error);
    throw error;
  }
}

console.log('Running keyword import process...');
console.log(`Options: ${JSON.stringify(options)}`);

// Run the import
runImport(options)
  .then(result => {
    console.log(`Keyword import completed with ${result.created + result.existing} successful imports and ${result.failed} failures.`);
    process.exit(0);
  })
  .catch(error => {
    console.error('Keyword import process failed:', error);
    process.exit(1);
  });