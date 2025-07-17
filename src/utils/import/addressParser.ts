/**
 * Parses a raw address string into structured components
 */
export function parseAddress(address: string | null): {
  street_address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  country: string | null;
} {
  // Default values
  const result = {
    street_address: null,
    city: null,
    state: null,
    zip_code: null,
    country: 'USA' // Default country
  };
  
  if (!address) return result;
  
  // Log the address for debugging
  console.log(`Parsing address: "${address}"`);
  
  // Common US address format: "123 Main St, City, ST 12345" or "123 Main St City ST 12345"
  // Try to extract components using regex for state and zip code
  const stateZipRegex = /\b([A-Z]{2})\s+(\d{5}(?:-\d{4})?)\b/i;
  const stateZipMatch = address.match(stateZipRegex);
  
  if (stateZipMatch) {
    result.state = stateZipMatch[1].toUpperCase();
    result.zip_code = stateZipMatch[2];
    
    // Remove state and zip from address to process the rest
    const beforeStateZip = address.substring(0, stateZipMatch.index).trim();
    
    // Try to find the city
    const parts = beforeStateZip.split(',');
    if (parts.length > 1) {
      // Address has commas
      result.city = parts[parts.length - 1].trim();
      result.street_address = parts.slice(0, parts.length - 1).join(',').trim();
    } else {
      // No commas, try to find the last space before state
      const lastSpace = beforeStateZip.lastIndexOf(' ');
      if (lastSpace > 0) {
        result.city = beforeStateZip.substring(lastSpace + 1).trim();
        result.street_address = beforeStateZip.substring(0, lastSpace).trim();
      } else {
        // Can't parse reliably, put everything in street_address
        result.street_address = beforeStateZip;
      }
    }
  } else {
    // Try to handle other formats
    // Check if it's a format like "City State Zip" with no street address
    const cityStateZipRegex = /^([A-Za-z\s.]+)\s+([A-Z]{2})\s+(\d{5}(?:-\d{4})?)$/i;
    const cityStateZipMatch = address.match(cityStateZipRegex);
    
    if (cityStateZipMatch) {
      result.city = cityStateZipMatch[1].trim();
      result.state = cityStateZipMatch[2].toUpperCase();
      result.zip_code = cityStateZipMatch[3];
    } else {
      // Can't parse reliably, put everything in street_address
      result.street_address = address;
    }
  }
  
  // Log the parsed components for debugging
  console.log('Parsed address components:', {
    street_address: result.street_address,
    city: result.city,
    state: result.state,
    zip_code: result.zip_code
  });
  
  return result;
}