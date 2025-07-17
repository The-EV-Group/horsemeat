/**
 * Parses travel preferences from the source data
 */
export function parseTravelPreferences(preferences: string | null): {
  travel_anywhere: boolean;
  travel_radius_miles: number | null;
} {
  const result = {
    travel_anywhere: false,
    travel_radius_miles: null
  };
  
  if (!preferences) return result;
  
  // Log the travel preferences for debugging
  console.log(`Parsing travel preferences: "${preferences}"`);
  
  // Check for "travel anywhere" in various formats
  if (preferences.toLowerCase().includes('travel anywhere: yes') || 
      preferences.toLowerCase().includes('anywhere: yes') ||
      preferences.toLowerCase().includes('willing to travel') ||
      preferences.toLowerCase().includes('can travel anywhere')) {
    result.travel_anywhere = true;
  } else {
    // Try to extract radius in various formats
    const radiusPatterns = [
      /radius:\s*(\d+)/i,
      /(\d+)\s*miles?/i,
      /(\d+)\s*mi/i,
      /within\s*(\d+)/i
    ];
    
    for (const pattern of radiusPatterns) {
      const match = preferences.match(pattern);
      if (match) {
        result.travel_radius_miles = parseInt(match[1], 10);
        break;
      }
    }
  }
  
  // Log the parsed values for debugging
  console.log('Parsed travel preferences:', {
    travel_anywhere: result.travel_anywhere,
    travel_radius_miles: result.travel_radius_miles
  });
  
  return result;
}