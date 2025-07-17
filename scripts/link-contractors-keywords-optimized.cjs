#!/usr/bin/env node

// This script links contractors to keywords with optimized batch processing
console.log('Starting optimized contractor-keyword linking script...');

// Load environment variables from .env file
require('dotenv').config();

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  batchSize: 100, // Smaller batch size to avoid potential issues
  test: false,
  debug: true // Enable debug mode
};

// Process arguments
for (let i = 0; i < args.length; i++) {
  const arg = args[i].toLowerCase();
  
  if (arg === '--batch' && i + 1 < args.length) {
    options.batchSize = parseInt(args[i + 1], 10);
    i++;
  } else if (arg === '--test') {
    options.test = true;
  } else if (arg === '--no-debug') {
    options.debug = false;
  } else if (arg === '--help' || arg === '-h') {
    console.log(`
Usage: node scripts/link-contractors-keywords-optimized.cjs [options]

Options:
  --batch N          Process links in batches of N (default: 100)
  --test             Run in test mode
  --no-debug         Disable debug output
  --help, -h         Show this help message
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
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Create Supabase client with service role key
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Function to link contractors to keywords with optimized batch processing
async function linkContractorsToKeywords(contractors, keywordMap, options) {
  console.log(`Starting contractor-keyword linking for ${contractors.length} contractors...`);
  
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
  
  // Collect all links first
  const allLinks = [];
  
  console.log('Collecting all contractor-keyword links...');
  
  for (const contractor of contractors) {
    const contractorId = contractor.id;
    const sourceData = contractor.sourceData;
    const contractorName = sourceData.full_name || 'Unknown';
    
    // Track processed keyword IDs for this contractor to avoid duplicates
    const processedKeywordIds = new Set();
    
    // Process each category
    for (const category of categories) {
      const keywords = sourceData[category.source] || [];
      
      if (options.debug && keywords.length > 0) {
        console.log(`Processing ${keywords.length} ${category.source} for ${contractorName}`);
      }
      
      for (const keyword of keywords) {
        if (keyword && keyword.trim()) {
          const normalizedKeyword = keyword.trim();
          const key = `${normalizedKeyword.toLowerCase()}:${category.target}`;
          
          const keywordId = keywordMap.get(key);
          
          if (keywordId && !processedKeywordIds.has(keywordId)) {
            allLinks.push({
              contractor_id: contractorId,
              keyword_id: keywordId
            });
            processedKeywordIds.add(keywordId);
            results.totalLinks++;
          } else if (!keywordId && options.debug) {
            console.warn(`Warning: No keyword ID found for "${normalizedKeyword}" (${category.target})`);
          }
        }
      }
    }
    
    results.processedContractors++;
    
    // Log progress every 10 contractors
    if (results.processedContractors % 10 === 0 || options.debug) {
      console.log(`Processed ${results.processedContractors}/${contractors.length} contractors, found ${allLinks.length} links so far`);
    }
  }
  
  console.log(`\nCollected ${allLinks.length} total links from ${results.processedContractors} contractors`);
  
  if (options.test) {
    console.log('Test mode: Not inserting links into database');
    return {
      ...results,
      successfulLinks: allLinks.length
    };
  }
  
  // First, clear existing links to avoid duplicates
  console.log('Clearing existing contractor-keyword links...');
  
  try {
    const { error: deleteError } = await supabase
      .from('contractor_keyword')
      .delete()
      .neq('contractor_id', 'dummy'); // Delete all rows
      
    if (deleteError) {
      console.error('Error clearing existing links:', deleteError);
      results.errors.push({
        phase: 'clear',
        error: deleteError.message
      });
    } else {
      console.log('Successfully cleared existing links');
    }
  } catch (error) {
    console.error('Exception clearing links:', error);
    results.errors.push({
      phase: 'clear',
      error: error.message
    });
  }
  
  // Insert links in batches
  console.log(`Inserting ${allLinks.length} links in batches of ${options.batchSize}...`);
  
  for (let i = 0; i < allLinks.length; i += options.batchSize) {
    const batch = allLinks.slice(i, i + options.batchSize);
    const batchNumber = Math.floor(i / options.batchSize) + 1;
    const totalBatches = Math.ceil(allLinks.length / options.batchSize);
    
    console.log(`Processing batch ${batchNumber}/${totalBatches} (${batch.length} links)...`);
    
    try {
      const { data, error } = await supabase
        .from('contractor_keyword')
        .insert(batch)
        .select();
      
      if (error) {
        console.error(`Error inserting batch ${batchNumber}:`, error);
        results.failedLinks += batch.length;
        results.errors.push({
          batch: batchNumber,
          error: error.message
        });
      } else {
        console.log(`Successfully inserted batch ${batchNumber} (${data.length} links)`);
        results.successfulLinks += data.length;
        
        // Verify the batch was inserted correctly
        if (data.length !== batch.length) {
          console.warn(`Warning: Only ${data.length} out of ${batch.length} links were inserted in batch ${batchNumber}`);
        }
      }
    } catch (error) {
      console.error(`Exception in batch ${batchNumber}:`, error);
      results.failedLinks += batch.length;
      results.errors.push({
        batch: batchNumber,
        error: error.message
      });
    }
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
    const result = await linkContractorsToKeywords(contractors, keywordMap, options);
    
    // Log the results
    console.log('\nContractor-keyword linking completed!');
    console.log(`Processed contractors: ${result.processedContractors}/${result.totalContractors}`);
    console.log(`Total links: ${result.totalLinks}`);
    console.log(`Successful links: ${result.successfulLinks}`);
    console.log(`Failed links: ${result.failedLinks}`);
    
    if (result.errors.length > 0) {
      console.log('\nErrors:');
      result.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error.batch ? `Batch ${error.batch}` : error.phase}: ${error.error}`);
      });
    }
    
    return result;
  } catch (error) {
    console.error('Error running contractor-keyword linking:', error);
    throw error;
  }
}

console.log('Running optimized contractor-keyword linking process...');
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