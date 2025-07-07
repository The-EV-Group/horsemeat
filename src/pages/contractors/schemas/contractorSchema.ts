
import { z } from 'zod';

export const contractorSchema = z.object({
  // Basic info
  full_name: z.string().min(1, 'Full name is required'),
  email: z.string().email('Invalid email format'),
  phone: z.string().regex(/^\+?[\d\s\(\)\-]{10,15}$/, 'Phone must be 10-15 digits'),
  
  // Location
  city: z.string().optional(),
  state: z.string().optional(),
  
  // Contact preference
  preferred_contact: z.enum(['email', 'phone', 'text']),
  
  // Travel
  travel_anywhere: z.boolean(),
  travel_radius_miles: z.coerce.number().positive('Travel radius must be greater than 0').optional(),
  
  // Pay
  pay_type: z.enum(['W2', '1099']),
  prefers_hourly: z.boolean(),
  hourly_rate: z.coerce.number().positive('Hourly rate must be greater than 0').optional(),
  salary_lower: z.coerce.number().positive('Salary must be greater than 0').optional(),
  salary_higher: z.coerce.number().positive('Salary must be greater than 0').optional(),
  
  // Flags
  star_candidate: z.boolean(),
  available: z.boolean(),
  
  // Notes
  notes: z.string().optional(),
  candidate_summary: z.string().optional(),
}).superRefine((data, ctx) => {
  // Travel validation - only check if not willing to travel anywhere
  if (!data.travel_anywhere && (!data.travel_radius_miles || data.travel_radius_miles <= 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Travel radius is required when not willing to travel anywhere',
      path: ['travel_radius_miles'],
    });
  }
  
  // Pay validation - check based on preference
  if (data.prefers_hourly) {
    if (!data.hourly_rate || data.hourly_rate <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Hourly rate is required',
        path: ['hourly_rate'],
      });
    }
  } else {
    if (!data.salary_lower || data.salary_lower <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Minimum salary is required',
        path: ['salary_lower'],
      });
    }
    if (!data.salary_higher || data.salary_higher <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Maximum salary is required',
        path: ['salary_higher'],
      });
    }
    if (data.salary_lower && data.salary_higher && data.salary_lower > data.salary_higher) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Minimum salary must be less than or equal to maximum salary',
        path: ['salary_lower'],
      });
    }
  }
});

export type ContractorFormData = z.infer<typeof contractorSchema>;

export const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',  
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
];
