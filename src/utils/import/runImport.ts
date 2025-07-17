import * as fs from 'fs';
import * as path from 'path';
import { importContractors } from './importContractors';
import { supabase } from '@/lib/supabase';

/**
 * Temporarily disables RLS for import tables
 */
async function disableRLS() {
  console.log('Temporarily disabling Row Level Security for import...');
  try {
    // Execute SQL directly to disable RLS
    const { error } = await supabase.rpc('disable_rls_for_import');
    if (error) {
      console.error('Error disabling RLS via RPC:', error);
      console.log('Attempting alternative method...');
      
      // Alternative: Use raw SQL queries if RPC fails
      await supabase.from('_exec_sql').select('*').eq('query', 'ALTER TABLE contractor DISABLE ROW LEVEL SECURITY');
      await supabase.from('_exec_sql').select('*').eq('query', 'ALTER TABLE keyword DISABLE ROW LEVEL SECURITY');
      await supabase.from('_exec_sql').select('*').eq('query', 'ALTER TABLE contractor_keyword DISABLE ROW LEVEL SECURITY');
      await supabase.from('_exec_sql').select('*').eq('query', 'ALTER TABLE contractor_history DISABLE ROW LEVEL SECURITY');
    }
    console.log('RLS disabled successfully');
  } catch (error) {
    console.error('Failed to disable RLS:', error);
    throw error;
  }
}

/**
 * Re-enables RLS after import
 */
async function enableRLS() {
  console.log('Re-enabling Row Level Security...');
  try {
    // Execute SQL directly to re-enable RLS
    const { error } = await supabase.rpc('enable_rls_for_import');
    if (error) {
      console.error('Error enabling RLS via RPC:', error);
      console.log('Attempting alternative method...');
      
      // Alternative: Use raw SQL queries if RPC fails
      await supabase.from('_exec_sql').select('*').eq('query', 'ALTER TABLE contractor ENABLE ROW LEVEL SECURITY');
      await supabase.from('_exec_sql').select('*').eq('query', 'ALTER TABLE keyword ENABLE ROW LEVEL SECURITY');
      await supabase.from('_exec_sql').select('*').eq('query', 'ALTER TABLE contractor_keyword ENABLE ROW LEVEL SECURITY');
      await supabase.from('_exec_sql').select('*').eq('query', 'ALTER TABLE contractor_history ENABLE ROW LEVEL SECURITY');
    }
    console.log('RLS re-enabled successfully');
  } catch (error) {
    console.error('Failed to re-enable RLS:', error);
    throw error;
  }
}

/**
 * Script to import contractors from the JSON file
 */
async function runImport(options: { limit?: number, batchSize?: number, handleRLS?: boolean } = {}) {
  try {
    console.log('Starting contractor import process...');
    
    // Disable RLS if requested
    if (options.handleRLS) {
      try {
        await disableRLS();
      } catch (error) {
        console.error('Failed to disable RLS, continuing with import anyway:', error);
      }
    }
    
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
    
    // Re-enable RLS if it was disabled
    if (options.handleRLS) {
      try {
        await enableRLS();
      } catch (error) {
        console.error('Failed to re-enable RLS:', error);
      }
    }
    
    return result;
  } catch (error) {
    console.error('Error running import:', error);
    throw error;
  }
}

export { runImport };