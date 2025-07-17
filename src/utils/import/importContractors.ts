import { supabase, supabaseAdmin } from '@/lib/supabase';
import { parseAddress } from './addressParser';
import { parsePayInfo } from './payInfoParser';
import { parseTravelPreferences } from './travelParser';
import { processResume } from './resumeProcessor';
import { processKeywords } from './keywordProcessor';

export interface ImportResult {
  success: number;
  failed: number;
  errors: { contractor: string; error: string }[];
  processedContractors: string[];
}

/**
 * Imports a single contractor from the source data
 */
export async function importContractor(sourceContractor: any): Promise<string> {
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
      preferred_contact: preferredContact as 'email' | 'phone' | 'text',
      summary: sourceContractor.candidate_summary,
      hourly_rate: payInfo.hourly_rate,
      salary_lower: payInfo.salary_lower,
      salary_higher: payInfo.salary_higher,
      pay_rate_upper: payInfo.pay_rate_upper,
      pay_type: sourceContractor.tax_form_type,
      prefers_hourly: payInfo.prefers_hourly,
      available: true, // Default to available
      // Removed star_candidate field as it's no longer in the schema
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
    
    // 8. Process keywords
    const keywordIds = await processKeywords(sourceContractor);
    
    // 9. Create contractor-keyword relationships
    if (keywordIds.length > 0) {
      const keywordLinks = keywordIds.map(keywordId => ({
        contractor_id: contractor.id,
        keyword_id: keywordId
      }));
      
      const { error: keywordError } = await client
        .from('contractor_keyword')
        .insert(keywordLinks);
      
      if (keywordError) {
        console.error(`Error linking keywords for ${sourceContractor.full_name}:`, keywordError);
      }
    }
    
    // 10. Add import note to history
    console.log('Step 10: Adding import note to history');
    
    const { error: historyError } = await client
      .from('contractor_history')
      .insert({
        contractor_id: contractor.id,
        note: `Imported from external system. External ID: ${sourceContractor.external_id || 'Unknown'}`
      });
    
    if (historyError) {
      console.warn(`Warning: Failed to add history note for ${sourceContractor.full_name}:`, historyError);
      // Don't throw error here, as the contractor was successfully imported
    }
    
    console.log(`Successfully imported contractor: ${sourceContractor.full_name || 'Unknown'} (ID: ${contractor.id})`);
    return contractor.id;
  } catch (error) {
    console.error(`Error importing contractor ${sourceContractor.full_name || 'Unknown'}:`, error);
    throw error;
  }
}

/**
 * Imports contractors in batches
 */
export async function importContractors(
  contractors: any[],
  batchSize = 10,
  onProgress?: (current: number, total: number) => void
): Promise<ImportResult> {
  const result: ImportResult = {
    success: 0,
    failed: 0,
    errors: [],
    processedContractors: []
  };
  
  // Limit the number of contractors for testing if needed
  // const limitedContractors = contractors.slice(0, 20); // Uncomment to limit
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
        const contractorId = await importContractor(sourceContractor);
        result.success++;
        result.processedContractors.push(contractorId);
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
  
  return result;
}