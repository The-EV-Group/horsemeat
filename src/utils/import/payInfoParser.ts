/**
 * Parses pay information from the source data
 */
export function parsePayInfo(payType: string | null, payAmount: string | null): {
  prefers_hourly: boolean;
  hourly_rate: number | null;
  salary_lower: number | null;
  salary_higher: number | null;
  pay_rate_upper: string | null;
} {
  const result = {
    prefers_hourly: payType === 'Hourly',
    hourly_rate: null,
    salary_lower: null,
    salary_higher: null,
    pay_rate_upper: null
  };
  
  if (!payAmount) return result;
  
  // Log the pay information for debugging
  console.log(`Parsing pay info: type=${payType}, amount=${payAmount}`);
  
  // Check if it's a range (contains hyphen or "to")
  const hasRange = payAmount.includes('-') || payAmount.toLowerCase().includes(' to ');
  
  if (hasRange) {
    // Split by hyphen or "to"
    let [lower, upper] = payAmount.includes('-') 
      ? payAmount.split('-') 
      : payAmount.toLowerCase().split(' to ');
    
    // Clean the values
    lower = lower.replace(/[^\d.]/g, '').trim();
    upper = upper.replace(/[^\d.]/g, '').trim();
    
    const lowerValue = parseFloat(lower);
    const upperValue = parseFloat(upper);
    
    if (result.prefers_hourly) {
      result.hourly_rate = !isNaN(lowerValue) ? lowerValue : null;
      result.pay_rate_upper = !isNaN(upperValue) ? upperValue.toString() : null;
    } else {
      result.salary_lower = !isNaN(lowerValue) ? lowerValue : null;
      result.salary_higher = !isNaN(upperValue) ? upperValue : null;
    }
  } else {
    // Single value - remove all non-numeric characters except decimal point
    const cleanedAmount = payAmount.replace(/[^\d.]/g, '').trim();
    const amount = parseFloat(cleanedAmount);
    
    if (!isNaN(amount)) {
      if (result.prefers_hourly) {
        result.hourly_rate = amount;
      } else {
        // For salary, use the same value for lower and higher
        result.salary_lower = amount;
        result.salary_higher = amount;
      }
    }
  }
  
  // Log the parsed values for debugging
  console.log('Parsed pay info:', {
    prefers_hourly: result.prefers_hourly,
    hourly_rate: result.hourly_rate,
    salary_lower: result.salary_lower,
    salary_higher: result.salary_higher,
    pay_rate_upper: result.pay_rate_upper
  });
  
  return result;
}