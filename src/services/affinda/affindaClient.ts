import { AffindaAPI, AffindaCredential } from '@affinda/affinda';
import { ParsedResumeData } from './affindaTypes';
import { mapAffindaResponseToAppData } from './affindaMappers';

// Get API key, workspace ID, and document type ID from environment variables
const AFFINDA_API_KEY = import.meta.env.VITE_AFFINDA_KEY;
const AFFINDA_WORKSPACE_ID = import.meta.env.VITE_AFFINDA_WORKSPACE_ID;
const AFFINDA_DOCUMENT_TYPE_ID = import.meta.env.VITE_AFFINDA_DOCUMENT_TYPE_ID;

// Validate that required environment variables are set
if (!AFFINDA_API_KEY) {
  console.error('VITE_AFFINDA_KEY environment variable is not set');
}

if (!AFFINDA_WORKSPACE_ID) {
  console.error('VITE_AFFINDA_WORKSPACE_ID environment variable is not set');
}

if (!AFFINDA_DOCUMENT_TYPE_ID) {
  console.error('VITE_AFFINDA_DOCUMENT_TYPE_ID environment variable is not set');
}

// Initialize Affinda client
const credential = new AffindaCredential(AFFINDA_API_KEY);
const client = new AffindaAPI(credential);

/**
 * Parse a resume file using Affinda API
 */
export const parseResumeWithAffinda = async (file: File): Promise<ParsedResumeData> => {
  try {
    // Check file size (Affinda has a 5MB limit)
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB in bytes
    if (file.size > MAX_FILE_SIZE) {
      throw new Error(`File size exceeds the 5MB limit. Please upload a smaller file.`);
    }

    // Create a document with Affinda
    const response = await client.createDocument({
      file,
      workspace: AFFINDA_WORKSPACE_ID,
      documentType: AFFINDA_DOCUMENT_TYPE_ID,
    });

    // Check if we have valid data
    if (!response.data) {
      throw new Error('No data returned from Affinda API');
    }

    // Map Affinda response to our app's data structure
    const parsedData = mapAffindaResponseToAppData(response.data);
    return parsedData;
  } catch (error) {
    console.error('Error parsing resume with Affinda:', error);
    throw error;
  }
};
