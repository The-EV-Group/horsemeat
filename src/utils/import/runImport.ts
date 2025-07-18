import * as fs from 'fs';
import * as path from 'path';
import { importContractors } from './importContractors';

/**
 * Script to import contractors from the JSON file
 */
async function runImport(options: { limit?: number, batchSize?: number } = {}) {
  try {
    console.log('Starting contractor import process...');
    
    // Read the JSON file
    // Try multiple possible locations for the JSON file
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
    const result = await importContractors(
      contractors,
      options.batchSize || 5, // Process in batches (default: 5)
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

export { runImport };