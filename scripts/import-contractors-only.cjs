#!/usr/bin/env node

// This script imports only contractor data without keywords
console.log('Starting contractor-only import script...');

// Load environment variables from .env file
require('dotenv').config();

// Use CommonJS require for Node.js script
require('esbuild-register');

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  limit: 0,
  batchSize: 5,
  test: false
};

// Process arguments
for (let i = 0; i < args.length; i++) {
  const arg = args[i].toLowerCase();
  
  if (arg === '--limit' && i + 1 < args.length) {
    options.limit = parseInt(args[i + 1], 10);
    i++;
  } else if (arg === '--batch' && i + 1 < args.length) {
    options.batchSize = parseInt(args[i + 1], 10);
    i++;
  } else if (arg === '--test') {
    options.test = true;
    if (!options.limit) options.limit = 3; // Default test limit
  } else if (arg === '--help' || arg === '-h') {
    console.log(`
Usage: node scripts/import-contractors-only.cjs [options]

Options:
  --limit N       Limit import to N contractors
  --batch N       Process contractors in batches of N (default: 5)
  --test          Run in test mode (imports 3 contractors)
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
const { parseAddress } = require('../src/utils/import/addressParser');
const { parsePayInfo } = require('../src/utils/import/payInfoParser');
const { parseTravelPreferences } = require('../src/utils/import/travelParser');
const { processResume } = require('../src/utils/import/resumeProcessor');
const fs = require('fs');
const path = require('path');

// Function to import a single contractor without keywords
async function importContractorOnly(sourceContractor) {
  try {
    console.log(`\nProcessing contractor: ${sourceContractor.full_name || 'Unknown'}`);
    
    // Validate required fields
    if (!sourceContractor.full_name) {
      console.warn('Warning: Contractor missing full_name, using "Unknown"');
    }
    
    // 1. Parse address
    console.log('Step 1: Parsing address');
    const addressInfo = parseAddress(sourceContractor.address);
    
    // 2. Parse pay information
    console.log('Step 2: Parsing pay information');
    const payInfo = parsePayInfo(
      sourceContractor.desired_pay_type,
      sourceContractor.desired_pay_amount
    );
    
    // 3. Parse travel preferences
    console.log('Step 3: Parsing travel preferences');
    const travelInfo = parseTravelPreferences(sourceContractor.travel_preferences);
    
    // Ensure travel_radius_miles has a default value if travel_anywhere is false
    if (travelInfo.travel_anywhere === false && travelInfo.travel_radius_miles === null) {
      travelInfo.travel_radius_miles = 50; // Default to 50 miles if not specified
    }
    
    // 4. Process resume if available
    console.log('Step 4: Processing resume');
    let resumeUrl = null;
    if (sourceContractor.resume_url) {
      resumeUrl = await processResume(
        sourceContractor.resume_url,
        sourceContractor.full_name || 'Unknown'
      );
    }
    
    // 5. Map preferred contact method to enum
    console.log('Step 5: Mapping preferred contact method');
    let preferredContact = 'email'; // Default
    if (sourceContractor.preferred_contact_method) {
      const method = sourceContractor.preferred_contact_method.toLowerCase();
      if (method.includes('phone')) {
        preferredContact = 'phone';
      } else if (method.includes('text')) {
        preferredContact = 'text';
      }
    }
    
    // 6. Check if contractor already exists by email
    console.log('Step 6: Checking for existing contractor');
    if (sourceContractor.email) {
      const { data: existingContractor } = await supabase
        .from('contractor')
        .select('id')
        .eq('email', sourceContractor.email)
        .maybeSingle();
      
      if (existingContractor) {
        throw new Error(`Contractor with email ${sourceContractor.email} already exists`);
      }
    } else {
      console.warn('Warning: Contractor has no email address');
    }
    
    // 7. Create contractor record
    const contractorData = {
      full_name: sourceContractor.full_name || 'Unknown',
      email: sourceContractor.email,
      phone: sourceContractor.phone,
      street_address: addressInfo.street_address,
      city: addressInfo.city,
      state: addressInfo.state,
      zip_code: addressInfo.zip_code,
      country: addressInfo.country,
      preferred_contact: preferredContact,
      summary: sourceContractor.candidate_summary,
      hourly_rate: payInfo.hourly_rate,
      salary_lower: payInfo.salary_lower,
      salary_higher: payInfo.salary_higher,
      pay_rate_upper: payInfo.pay_rate_upper,
      pay_type: sourceContractor.tax_form_type,
      prefers_hourly: payInfo.prefers_hourly,
      available: true, // Default to available
      travel_anywhere: travelInfo.travel_anywhere,
      travel_radius_miles: travelInfo.travel_radius_miles,
      resume_url: resumeUrl,
      notes: sourceContractor.goals_interests
    };
    
    // Log the contractor data for debugging
    console.log('Inserting contractor data:', JSON.stringify(contractorData, null, 2));
    
    // Use supabaseAdmin if available (Node.js environment), otherwise fall back to regular client
    const client = typeof supabaseAdmin === 'object' && supabaseAdmin !== null ? supabaseAdmin : supabase;
    
    const { data: contractor, error: contractorError } = await client
      .from('contractor')
      .insert(contractorData)
      .select('id')
      .single();
    
    if (contractorError) throw contractorError;
    
    // 8. Add import note to history
    console.log('Step 8: Adding import note to history');
    const { error: historyError } = await client
      .from('contractor_history')
      .insert({
        contractor_id: contractor.id,
        note: `Imported from external system. External ID: ${sourceContractor.external_id || 'Unknown'}`
      });
    
    if (historyError) {
      console.warn(`Warning: Failed to add history note for ${sourceContractor.full_name}:`, historyError);
    }
    
    console.log(`Successfully imported contractor: ${sourceContractor.full_name || 'Unknown'} (ID: ${contractor.id})`);
    
    // Return both the contractor ID and the source data for later keyword processing
    return {
      id: contractor.id,
      sourceData: sourceContractor
    };
  } catch (error) {
    console.error(`Error importing contractor ${sourceContractor.full_name || 'Unknown'}:`, error);
    throw error;
  }
}

// Function to import contractors in batches
async function importContractorsOnly(contractors, batchSize = 10, onProgress) {
  const result = {
    success: 0,
    failed: 0,
    errors: [],
    processedContractors: []
  };
  
  const contractorsToProcess = contractors;
  
  console.log(`Starting import of ${contractorsToProcess.length} contractors in batches of ${batchSize}`);
  
  // Process in batches to avoid timeouts
  for (let i = 0; i < contractorsToProcess.length; i += batchSize) {
    const batch = contractorsToProcess.slice(i, i + batchSize);
    console.log(`\nProcessing batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(contractorsToProcess.length / batchSize)}`);
    
    // Process each contractor in the batch
    const batchPromises = batch.map(async (sourceContractor) => {
      try {
        console.log(`  - Processing: ${sourceContractor.full_name || 'Unknown'}`);
        const contractorResult = await importContractorOnly(sourceContractor);
        result.success++;
        result.processedContractors.push(contractorResult);
        console.log(`  ✓ Success: ${sourceContractor.full_name || 'Unknown'}`);
        return { success: true, contractor: sourceContractor.full_name || 'Unknown' };
      } catch (error) {
        result.failed++;
        result.errors.push({
          contractor: sourceContractor.full_name || 'Unknown',
          error: error.message
        });
        console.log(`  ✗ Failed: ${sourceContractor.full_name || 'Unknown'} - ${error.message}`);
        return { success: false, contractor: sourceContractor.full_name || 'Unknown', error };
      }
    });
    
    // Wait for all contractors in this batch to be processed
    await Promise.all(batchPromises);
    
    // Report progress
    if (onProgress) {
      onProgress(i + batch.length, contractorsToProcess.length);
    }
    
    console.log(`Batch complete. Progress: ${i + batch.length}/${contractorsToProcess.length} (${Math.round(((i + batch.length) / contractorsToProcess.length) * 100)}%)`);
  }
  
  // Save the processed contractors to a file for later keyword processing
  const outputFile = path.resolve(process.cwd(), 'imported_contractors.json');
  fs.writeFileSync(outputFile, JSON.stringify(result.processedContractors, null, 2));
  console.log(`Saved imported contractor data to ${outputFile} for keyword processing`);
  
  return result;
}

// Main function to run the import
async function runImport(options) {
  try {
    console.log('Starting contractor-only import process...');
    
    // Read the JSON file
    let filePath = '';
    const possiblePaths = [
      path.resolve(process.cwd(), 'contractors_supabase.json'),
      path.resolve(process.cwd(), '../contractors_supabase.json'),
      path.resolve(process.cwd(), '../../contractors_supabase.json')
    ];
    
    for (const possiblePath of possiblePaths) {
      if (fs.existsSync(possiblePath)) {
        filePath = possiblePath;
        break;
      }
    }
    
    if (!filePath) {
      throw new Error('Could not find contractors_supabase.json file');
    }
    
    console.log(`Reading file from: ${filePath}`);
    
    const fileContent = fs.readFileSync(filePath, 'utf8');
    let contractors = JSON.parse(fileContent);
    
    console.log(`Found ${contractors.length} contractors in file`);
    
    // Apply limit if specified
    if (options.limit && options.limit > 0 && options.limit < contractors.length) {
      console.log(`Limiting import to ${options.limit} contractors for testing`);
      contractors = contractors.slice(0, options.limit);
    }
    
    // Run the import with progress reporting
    const result = await importContractorsOnly(
      contractors,
      options.batchSize || 5,
      (current, total) => {
        console.log(`Progress: ${current}/${total} (${Math.round((current / total) * 100)}%)`);
      }
    );
    
    // Log the results
    console.log('\nImport completed!');
    console.log(`Successfully imported: ${result.success}`);
    console.log(`Failed imports: ${result.failed}`);
    
    if (result.errors.length > 0) {
      console.log('\nErrors:');
      result.errors.forEach(error => {
        console.log(`- ${error.contractor}: ${error.error}`);
      });
    }
    
    return result;
  } catch (error) {
    console.error('Error running import:', error);
    throw error;
  }
}

console.log('Running import process...');
console.log(`Options: ${JSON.stringify(options)}`);

// Run the import
runImport(options)
  .then(result => {
    console.log(`Import completed with ${result.success} successful imports and ${result.failed} failures.`);
    
    if (result.errors.length > 0) {
      console.log('\nSummary of errors:');
      console.log(`${result.errors.length} contractors failed to import.`);
      
      // Show detailed errors
      console.log('\nDetailed errors:');
      result.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error.contractor}: ${error.error}`);
      });
    }
    
    process.exit(0);
  })
  .catch(error => {
    console.error('Import process failed:', error);
    process.exit(1);
  });