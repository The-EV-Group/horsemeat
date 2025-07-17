#!/usr/bin/env node

// This script imports contractors from the JSON file
console.log('Starting contractor import script...');

// Load environment variables from .env file
require('dotenv').config();

// Use CommonJS require for Node.js script
require('esbuild-register');

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  limit: 0,
  batchSize: 5,
  test: false,
  handleRLS: false
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
  } else if (arg === '--disable-rls') {
    options.handleRLS = true;
  } else if (arg === '--help' || arg === '-h') {
    console.log(`
Usage: npm run import-contractors [options]

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

// Import the runImport function
const { runImport } = require('../src/utils/import/runImport');

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