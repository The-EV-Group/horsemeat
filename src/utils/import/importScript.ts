import * as dotenv from 'dotenv';
import { runImport } from './runImport';

// Load environment variables from .env file
dotenv.config();

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
Usage: ts-node src/utils/import/importScript.ts [options]

Options:
  --limit N       Limit import to N contractors
  --batch N       Process contractors in batches of N (default: 5)
  --test          Run in test mode (imports 3 contractors)
  --help, -h      Show this help message
`);
    process.exit(0);
  }
}

console.log('Starting contractor import process...');
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