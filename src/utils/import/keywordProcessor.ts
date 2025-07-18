import { supabase, supabaseAdmin } from '@/lib/supabase';

/**
 * Ensures a keyword exists in the database, creating it if necessary
 */
export async function ensureKeywordExists(name: string, category: string): Promise<string | null> {
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

        if (insertError) throw insertError;

        return newKeyword.id;
    } catch (error) {
        console.error(`Error ensuring keyword exists: ${normalizedName} (${category})`, error);
        throw error;
    }
}

/**
 * Processes all keywords for a contractor
 */
export async function processKeywords(contractor: any): Promise<string[]> {
    const keywordIds: string[] = [];
    const processedKeywords = new Set(); // Track processed keywords to avoid duplicates

    // Process each keyword category
    const categories = [
        { source: 'job_titles', target: 'job_title' }, // Singular form as per DB constraint
        { source: 'skills', target: 'skill' },         // Singular form as per DB constraint
        { source: 'industries', target: 'industry' },  // Singular form as per DB constraint
        { source: 'certifications', target: 'certification' }, // Singular form as per DB constraint
        { source: 'companies', target: 'company' }     // Singular form as per DB constraint
    ];

    console.log(`Processing keywords for contractor: ${contractor.full_name || 'Unknown'}`);
    
    // Check if contractor has any keywords
    const hasKeywords = categories.some(category => 
        Array.isArray(contractor[category.source]) && contractor[category.source].length > 0
    );
    
    if (!hasKeywords) {
        console.log(`No keywords found for contractor: ${contractor.full_name || 'Unknown'}`);
        return keywordIds;
    }

    for (const category of categories) {
        const keywords = contractor[category.source] || [];
        
        if (keywords.length > 0) {
            console.log(`Processing ${keywords.length} ${category.source} for ${contractor.full_name || 'Unknown'}`);
        }
        
        for (const keyword of keywords) {
            if (keyword && keyword.trim()) {
                // Create a unique key for this keyword+category combination
                const keywordKey = `${keyword.trim().toLowerCase()}:${category.target}`;
                
                // Skip if we've already processed this keyword in this category
                if (processedKeywords.has(keywordKey)) {
                    console.log(`Skipping duplicate keyword: ${keyword} (${category.target})`);
                    continue;
                }
                
                try {
                    const keywordId = await ensureKeywordExists(keyword, category.target);
                    if (keywordId) {
                        keywordIds.push(keywordId);
                        processedKeywords.add(keywordKey); // Mark as processed
                    }
                } catch (error) {
                    console.error(`Error processing keyword ${keyword} (${category.target}):`, error);
                    // Continue processing other keywords
                }
            }
        }
    }

    console.log(`Processed ${keywordIds.length} unique keywords for ${contractor.full_name || 'Unknown'}`);
    return keywordIds;
}