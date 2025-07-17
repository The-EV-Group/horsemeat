#!/usr/bin/env node

// This script links contractors to keywords
console.log('Starting contractor-keyword linking script...');

// Load environment variables from .env file
require('dotenv').config();

// Use CommonJS require for Node.js script
require('esbuild-register');

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  batchSize: 50,
  test: false
};

// Process arguments
for (let i = 0; i < args.length; i++) {
  const arg = args[i].toLowerCase();
  
  if (arg === '--batch' && i + 1 < args.length) {
    options.batchSize = parseInt(args[i + 1], 10);
    i++;
  } else if (arg === '--test') {
    options.test = true;
  } else if (arg === '--help' || arg === '-h') {
    console.log(`
Usage: node scripts/link-contractors-keywords.cjs [options]

Options:
  --batch N       Process links in batches of N (default: 50)
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

// Function to link contractors to keywords
async function linkContractorsToKeywords(contractors, keywordMap, batchSize) {
  console.log(`Starting contractor-keyword linking for ${contractors.length} contractors...`);
  
  // Use supabaseAdmin if available (Node.js environment), otherwise fall back to regular client
  const client = typeof supabaseAdmin === 'object' && supabaseAdmin !== null ? supabaseAdmin : supabase;
  
  // Track results
  const results = {
    totalContractors: contractors.length,
    processedContractors: 0,
    totalLinks: 0,
    successfulLinks: 0,
    failedLinks: 0,
    errors: []
  };
  
  // Define the category mappings
  const categories = [
    { source: 'job_titles', target: 'job_title' },
    { source: 'skills', target: 'skill' },
    { source: 'industries', target: 'industry' },
    { source: 'certifications', target: 'certification' },
    { source: 'companies', target: 'company' }
  ];
  
  // Process each contractor
  for (const contractor of contractors) {
    const contractorId = contractor.id;
    const sourceData = contractor.sourceData;
    const contractorName = sourceData.full_name || 'Unknown';
    
    console.log(`\nProcessing contractor: ${contractorName} (ID: ${contractorId})`);
    
    // Collect all keywords for this contractor
    const keywordLinks = [];
    const processedKeywordIds = new Set(); // Track processed keyword IDs to avoid duplicates
    
    for (const category of categories) {
      const keywords = sourceData[category.source] || [];
      console.log(`Processing ${keywords.length} ${category.source} for ${contractorName}`);
      
      for (const keyword of keywords) {
        if (keyword && keyword.trim()) {
          const normalizedKeyword = keyword.trim();
          const key = `${normalizedKeyword.toLowerCase()}:${category.target}`;
          
          const keywordId = keywordMap.get(key);
          
          if (keywordId && !processedKeywordIds.has(keywordId)) {
            keywordLinks.push({
              contractor_id: contractorId,
              keyword_id: keywordId
            });
            processedKeywordIds.add(keywordId);
          } else if (!keywordId) {
            console.warn(`Warning: No keyword ID found for "${normalizedKeyword}" (${category.target})`);
          }
        }
      }
    }
    
    console.log(`Found ${keywordLinks.length} keywords to link for ${contractorName}`);
    results.totalLinks += keywordLinks.length;
    
    if (keywordLinks.length === 0) {
      console.log(`No keywords to link for ${contractorName}`);
      results.processedContractors++;
      continue;
    }
    
    // Check for existing links to avoid duplicates
    try {
      const { data: existingLinks, error: checkError } = await client
        .from('contractor_keyword')
        .select('keyword_id')
        .eq('contractor_id', contractorId);
      
      if (checkError) {
        console.error(`Error checking existing keyword links for ${contractorName}:`, checkError);
        results.errors.push({
          contractor: contractorName,
          error: `Error checking existing links: ${checkError.message}`
        });
        continue;
      }
      
      // Filter out keywords that are already linked to this contractor
      const existingKeywordIds = new Set(existingLinks?.map(link => link.keyword_id) || []);
      const newKeywordLinks = keywordLinks.filter(link => !existingKeywordIds.has(link.keyword_id));
      
      if (newKeywordLinks.length === 0) {
        console.log(`All keywords are already linked to contractor ${contractorName}`);
        results.processedContractors++;
        continue;
      }
      
      console.log(`Adding ${newKeywordLinks.length} new keyword links for ${contractorName}`);
      
      // Insert the links in batches
      for (let i = 0; i < newKeywordLinks.length; i += batchSize) {
        const batch = newKeywordLinks.slice(i, i + batchSize);
        
        const { error: insertError } = await client
          .from('contractor_keyword')
          .insert(batch);
        
        if (insertError) {
          console.error(`Error linking keywords batch ${Math.floor(i / batchSize) + 1} for ${contractorName}:`, insertError);
          results.failedLinks += batch.length;
          results.errors.push({
            contractor: contractorName,
            error: `Error linking keywords: ${insertError.message}`
          });
        } else {
          console.log(`Successfully linked batch ${Math.floor(i / batchSize) + 1} of keywords for ${contractorName}`);
          results.successfulLinks += batch.length;
        }
      }
    } catch (error) {
      console.error(`Error processing contractor ${contractorName}:`, error);
      results.errors.push({
        contractor: contractorName,
        error: error.message
      });
    }
    
    results.processedContractors++;
  }
  
  return results;
}

// Main function to run the linking process
async function runLinking(options) {
  try {
    console.log('Starting contractor-keyword linking process...');
    
    // Read the imported contractors file
    const contractorsFile = path.resolve(process.cwd(), 'imported_contractors.json');
    
    if (!fs.existsSync(contractorsFile)) {
      throw new Error('Could not find imported_contractors.json file. Run import-contractors-only.cjs first.');
    }
    
    console.log(`Reading contractors from: ${contractorsFile}`);
    
    const contractorsContent = fs.readFileSync(contractorsFile, 'utf8');
    const contractors = JSON.parse(contractorsContent);
    
    console.log(`Found ${contractors.length} imported contractors`);
    
    // Read the keyword map file
    const keywordMapFile = path.resolve(process.cwd(), 'keyword_map.json');
    
    if (!fs.existsSync(keywordMapFile)) {
      throw new Error('Could not find keyword_map.json file. Run import-keywords.cjs first.');
    }
    
    console.log(`Reading keyword map from: ${keywordMapFile}`);
    
    const keywordMapContent = fs.readFileSync(keywordMapFile, 'utf8');
    const keywordMapArray = JSON.parse(keywordMapContent);
    const keywordMap = new Map(keywordMapArray);
    
    console.log(`Found ${keywordMap.size} keywords in map`);
    
    // Run the linking process
    const result = await linkContractorsToKeywords(contractors, keywordMap, options.batchSize);
    
    // Log the results
    console.log('\nContractor-keyword linking completed!');
    console.log(`Processed contractors: ${result.processedContractors}/${result.totalContractors}`);
    console.log(`Total links: ${result.totalLinks}`);
    console.log(`Successful links: ${result.successfulLinks}`);
    console.log(`Failed links: ${result.failedLinks}`);
    
    if (result.errors.length > 0) {
      console.log('\nErrors:');
      result.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error.contractor}: ${error.error}`);
      });
    }
    
    return result;
  } catch (error) {
    console.error('Error running contractor-keyword linking:', error);
    throw error;
  }
}

console.log('Running contractor-keyword linking process...');
console.log(`Options: ${JSON.stringify(options)}`);

// Run the linking process
runLinking(options)
  .then(result => {
    console.log(`Contractor-keyword linking completed with ${result.successfulLinks} successful links and ${result.failedLinks} failures.`);
    process.exit(0);
  })
  .catch(error => {
    console.error('Contractor-keyword linking process failed:', error);
    process.exit(1);
  });