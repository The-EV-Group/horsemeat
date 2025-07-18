import { Database } from '../../integrations/supabase/types';

// Define types for our application
export type ContractorData = Database['public']['Tables']['contractor']['Insert'];
export type KeywordData = Database['public']['Tables']['keyword']['Insert'];

// Define interface for extracted keywords
export interface ExtractedKeyword {
  id: string;
  name: string;
  type: string;
}

// Export the parser result interface used in the app
export interface ParsedResumeData {
  contractor: ContractorData;
  keywords: {
    skills: ExtractedKeyword[];
    industries: ExtractedKeyword[];
    certifications: ExtractedKeyword[];
    companies: ExtractedKeyword[];
    "job titles": ExtractedKeyword[];
  };
}

// Define types for Affinda API response structure
export interface AffindaDataPoint {
  id: number;
  rectangle?: { x0: number; y0: number; x1: number; y1: number; pageIndex: number };
  rectangles?: { x0: number; y0: number; x1: number; y1: number; pageIndex: number }[];
  document: string;
  pageIndex: number;
  raw: string;
  parsed: string | Record<string, unknown>;
  confidence: number | null;
  classificationConfidence: number | null;
  textExtractionConfidence: number | null;
  isVerified: boolean;
  isClientVerified: boolean;
  isAutoVerified: boolean;
  verifiedBy: string | null;
  dataPoint: string | null;
  contentType: string;
  parent: string | null;
}

export interface AffindaLocationParsed {
  formatted: string;
  streetNumber: string | null;
  street: string | null;
  apartmentNumber: string | null;
  city: string;
  postalCode: string;
  state: string;
  stateCode: string;
  country: string;
  rawInput: string;
  countryCode: string;
  latitude: number;
  longitude: number;
  poBox: string | null;
}

export interface AffindaPhoneNumberParsed {
  rawText: string;
  countryCode: string;
  nationalNumber: string;
  formattedNumber: string;
  internationalCountryCode: number;
}

// Table-based structure for Affinda response
export interface AffindaTableRow {
  id: number;
  rectangle?: { x0: number; y0: number; x1: number; y1: number; pageIndex: number };
  rectangles?: { x0: number; y0: number; x1: number; y1: number; pageIndex: number }[];
  document: string;
  pageIndex: number;
  raw: string;
  parsed: {
    skill?: AffindaDataPoint[];
    company?: AffindaDataPoint[];
    jobTitle?: AffindaDataPoint[];
    industry?: AffindaDataPoint[];
    certification?: AffindaDataPoint[];
  };
  confidence: number | null;
  classificationConfidence: number | null;
  textExtractionConfidence: number | null;
  isVerified: boolean;
  isClientVerified: boolean;
  isAutoVerified: boolean;
  verifiedBy: string | null;
  dataPoint: string | null;
  field: string;
  contentType: string;
  parent: number;
}

export interface AffindaTable {
  id: number;
  rectangle?: { x0: number; y0: number; x1: number; y1: number; pageIndex: number };
  rectangles?: { x0: number; y0: number; x1: number; y1: number; pageIndex: number }[];
  document: string;
  pageIndex: number;
  raw: string;
  parsed: {
    rows: AffindaTableRow[];
  };
  confidence: number | null;
  classificationConfidence: number | null;
  textExtractionConfidence: number | null;
  isVerified: boolean;
  isClientVerified: boolean;
  isAutoVerified: boolean;
  verifiedBy: string | null;
  dataPoint: string | null;
  field: string;
  contentType: string;
  parent: number | null;
}

export interface AffindaResumeData {
  summary?: AffindaDataPoint;
  location?: AffindaDataPoint & { parsed?: AffindaLocationParsed | Record<string, unknown> };
  fullName?: AffindaDataPoint;
  phoneNumber?: AffindaDataPoint & { parsed?: AffindaPhoneNumberParsed | Record<string, unknown> };
  email?: AffindaDataPoint;
  goalsInterests?: AffindaDataPoint;
  // Table structure (current format) - can be single table or array of tables
  skillsTable?: AffindaTable | AffindaTable[];
  industriesTable?: AffindaTable | AffindaTable[];
  jobTitlesTable?: AffindaTable | AffindaTable[];
  certificationsTable?: AffindaTable | AffindaTable[];
  companiesTable?: AffindaTable | AffindaTable[];
  // Legacy array structure for backward compatibility
  skills?: AffindaDataPoint[];
  industries?: AffindaDataPoint[];
  jobTitles?: AffindaDataPoint[];
  certifications?: AffindaDataPoint[];
  companies?: AffindaDataPoint[];
  rawText?: string;
}

// Response from Affinda includes a data object that contains the resume data
export interface AffindaResponse {
  data: AffindaResumeData;
  meta: Record<string, unknown>; // Other metadata from Affinda
}
