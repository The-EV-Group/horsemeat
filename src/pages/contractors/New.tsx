import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useKeywords } from "@/hooks/keywords/useKeywords";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/shared/use-toast";
import { supabase } from "@/lib/supabase";
import type {
  Tables,
  TablesInsert,
  Enums,
} from "@/integrations/supabase/types";

// Schema and types
import {
  contractorSchema,
  type ContractorFormData,
} from "@/lib/schemas/contractorSchema";

// Components
import { CandidateFlagsSection } from "@/components/contractors/CandidateFlagsSection";
import { ResumeUploadSection } from "@/components/contractors/ResumeUploadSection";
import { BasicInfoSection } from "@/components/contractors/BasicInfoSection";
import { LocationSection } from "@/components/contractors/LocationSection";
import { TravelSection } from "@/components/contractors/TravelSection";
import { PaySection } from "@/components/contractors/PaySection";
import { AdditionalInfoSection } from "@/components/contractors/AdditionalInfoSection";
import { NewContractorKeywordsSection } from "@/components/contractors/NewContractorKeywordsSection";
import { InternalEmployeeSection } from "@/components/contractors/InternalEmployeeSection";

// Hooks
import { useResumeUpload } from "@/hooks/contractors/useResumeUpload";
import { useAffindaResumeParser } from '@/hooks/contractors/useAffindaResumeParser';
import { ParsedResumeData } from '@/services/affinda';
import { highlightAutoFilledInputs, resetFormHighlights } from '@/utils/formUtils';

type Keyword = Tables<"keyword">;

export default function NewContractor() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { createKeyword } = useKeywords();

  // Form state
  const form = useForm<ContractorFormData>({
    resolver: zodResolver(contractorSchema),
    defaultValues: {
      available: true,
      prefers_hourly: false,
      travel_anywhere: false,
      preferred_contact: "email",
      pay_type: "W2", // Set default employment type
    },
  });

  // Use form.watch for reactive values
  const watchedValues = form.watch();

  // Keywords state
  const [keywords, setKeywords] = useState<{
    skills: Keyword[];
    industries: Keyword[];
    certifications: Keyword[];
    companies: Keyword[];
    "job titles": Keyword[];
  }>({
    skills: [],
    industries: [],
    certifications: [],
    companies: [],
    "job titles": [],
  });

  // Internal employees state
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);

  // Resume upload hook and state
  const { resumeFile, uploadProgress, uploading, uploadedUrl, handleFileChange, removeFile, uploadFile } = useResumeUpload();
  
  // Resume parsing hooks and state - using only Affinda
  const { parsing: affindaParsing, parseResume: parseResumeWithAffinda } = useAffindaResumeParser();
  
  // Enable/disable parsing toggle
  const [enableParsing, setEnableParsing] = useState(true);
  
  // Tracking parse success/failure status
  const [parseSuccess, setParseSuccess] = useState(false);
  const [parseError, setParseError] = useState(false);
  
  // Parsing state
  const parsing = affindaParsing;
  
  // No need for this effect anymore since we're only using Affinda

  // Helper function to process parsed keywords and update UI state
  const processAndAddKeywords = async (parsedKeywords: ParsedResumeData['keywords']) => {
    const updatedKeywords = { ...keywords };
    let keywordsAdded = 0;

    for (const [category, categoryKeywords] of Object.entries(parsedKeywords)) {
      if (!Array.isArray(categoryKeywords)) continue;

      const normalizedCategory = category.toLowerCase();
      if (!updatedKeywords[normalizedCategory as keyof typeof updatedKeywords]) {
        continue; // Skip unknown categories
      }

      for (const keyword of categoryKeywords) {
        // Check if keyword already exists in the current selection
        const isAlreadySelected = updatedKeywords[normalizedCategory as keyof typeof updatedKeywords]
          .some(k => k.name.toLowerCase() === keyword.name.toLowerCase());

        if (!isAlreadySelected) {
          try {
            // Create the keyword in the database (or fetch if it already exists)
            const createdKeyword = await createKeyword(keyword.name, normalizedCategory);
            updatedKeywords[normalizedCategory as keyof typeof updatedKeywords].push(createdKeyword);
            keywordsAdded++;
          } catch (error) {
            console.error(`Error creating keyword ${keyword.name}:`, error);
          }
        }
      }
    }

    // Update the keywords state to reflect in UI
    setKeywords(updatedKeywords);
    return keywordsAdded;
  };
  
  // Handle file change, upload, and parsing
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileChange(e);
    const file = e.target.files?.[0];
    
    if (file && enableParsing) {
      try {
        console.log('Starting resume processing for:', file.name);
        
        // Use Affinda for parsing - no fallback to OpenAI
        const parsed = await parseResumeWithAffinda(file);
        
        if (parsed && parsed.contractor) {
          console.log('Parsed data received:', parsed);
          
          // Check if we have meaningful data to populate
          const contractorData = parsed.contractor;
          const fieldsToPopulate: { [key: string]: string } = {};
          
          // Handle any value - even single characters or empty strings
          // Always use trim() to handle any whitespace consistently
          const value_full_name = contractorData.full_name?.trim() ?? "";
          fieldsToPopulate.full_name = value_full_name;
          form.setValue('full_name', value_full_name);
          
          const value_email = contractorData.email?.trim() ?? "";
          fieldsToPopulate.email = value_email;
          form.setValue('email', value_email);
          
          const value_phone = contractorData.phone?.trim() ?? "";
          fieldsToPopulate.phone = value_phone;
          form.setValue('phone', value_phone);
          
          // Address fields
          const value_city = contractorData.city?.trim() ?? "";
          fieldsToPopulate.city = value_city;
          form.setValue('city', value_city);
          
          const value_state = contractorData.state?.trim() ?? "";
          fieldsToPopulate.state = value_state;
          form.setValue('state', value_state);
          
          // New address fields from our updated Affinda mapping
          const value_street_address = contractorData.street_address?.trim() ?? "";
          fieldsToPopulate.street_address = value_street_address;
          form.setValue('street_address', value_street_address);
          
          const value_zip_code = contractorData.zip_code?.trim() ?? "";
          fieldsToPopulate.zip_code = value_zip_code;
          form.setValue('zip_code', value_zip_code);
          
          const value_country = contractorData.country?.trim() ?? "";
          fieldsToPopulate.country = value_country;
          form.setValue('country', value_country);
          
          // Handle summary that might not be a string
          const value_summary = typeof contractorData.summary === 'string' ? contractorData.summary.trim() : String(contractorData.summary || "");
          fieldsToPopulate.candidate_summary = value_summary;
          form.setValue('candidate_summary', value_summary);
          
          // Handle notes that might not be a string
          const value_notes = typeof contractorData.notes === 'string' ? contractorData.notes.trim() : String(contractorData.notes || "");
          fieldsToPopulate.notes = value_notes;
          form.setValue('notes', value_notes);

          // Process keywords and add them to the UI
          let keywordsAdded = 0;
          if (parsed.keywords) {
            console.log('Processing keywords from parsed data:', parsed.keywords);
            console.log('Skills:', parsed.keywords.skills?.length || 0);
            console.log('Job titles:', parsed.keywords["job titles"]?.length || 0);
            console.log('Companies:', parsed.keywords.companies?.length || 0);
            console.log('Industries:', parsed.keywords.industries?.length || 0);
            console.log('Certifications:', parsed.keywords.certifications?.length || 0);
            
            // Process keywords by category
            keywordsAdded = await processAndAddKeywords(parsed.keywords);
            console.log('Total keywords added:', keywordsAdded);
          } else {
            console.warn('No keywords found in parsed data');
          }
          
          // Only highlight and show success if we actually populated some fields or keywords
          // Consider any field population as success, even with empty strings
          setParseSuccess(true);
          setParseError(false);
          
          // Count non-empty fields that were populated
          const nonEmptyFields = Object.values(fieldsToPopulate).filter(v => v !== "").length;
          const totalItemsPopulated = nonEmptyFields + keywordsAdded;
          if (totalItemsPopulated > 0) {
            // Highlight the auto-filled fields
            if (Object.keys(fieldsToPopulate).length > 0) {
              highlightAutoFilledInputs(fieldsToPopulate);
            }
            
            let description = '';
            if (Object.keys(fieldsToPopulate).length > 0 && keywordsAdded > 0) {
              description = `${Object.keys(fieldsToPopulate).length} field${Object.keys(fieldsToPopulate).length > 1 ? 's' : ''} and ${keywordsAdded} keyword${keywordsAdded > 1 ? 's' : ''} have been pre-filled from the resume.`;
            } else if (Object.keys(fieldsToPopulate).length > 0) {
              description = `${Object.keys(fieldsToPopulate).length} field${Object.keys(fieldsToPopulate).length > 1 ? 's' : ''} have been pre-filled from the resume.`;
            } else if (keywordsAdded > 0) {
              description = `${keywordsAdded} keyword${keywordsAdded > 1 ? 's' : ''} have been pre-filled from the resume.`;
            }
            
            toast({
              title: 'Resume parsed successfully',
              description: description + ' Please review and modify as needed.',
            });
          } else {
            console.log('No meaningful data extracted to populate fields or keywords');
            toast({
              title: 'Resume processed',
              description: 'The resume was processed but no field data could be extracted. Please fill out the form manually.',
              variant: "default"
            });
          }
        } else {
          console.log('No parsed data received or parsing failed');
        }
      } catch (error) {
        console.error('Error processing resume:', error);
        setParseError(true);
        setParseSuccess(false);
        toast({
          title: 'Resume parsing failed',
          description: error instanceof Error ? error.message : 'Could not parse resume',
          variant: 'destructive',
        });
      }
    }
  };
  
  // Clear highlights when navigating away
  useEffect(() => {
    return () => {
      resetFormHighlights();
    };
  }, []);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createContractor = async (
    contractorData: TablesInsert<"contractor">
  ) => {
    const { data, error } = await supabase
      .from("contractor")
      .insert(contractorData)
      .select()
      .single();

    if (error) throw error;
    return data.id;
  };

  const updateContractorKeywords = async (
    contractorId: string,
    keywordIds: string[]
  ) => {
    const keywordInserts = keywordIds.map((keywordId) => ({
      contractor_id: contractorId,
      keyword_id: keywordId,
    }));

    const { error } = await supabase
      .from("contractor_keyword")
      .insert(keywordInserts);

    if (error) throw error;
  };

  const onSubmit = async (data: ContractorFormData) => {
    try {
      setIsSubmitting(true);
      setError(null);

      // Upload resume if file is selected
      let resumeUrl = uploadedUrl;
      if (resumeFile && !uploadedUrl) {
        resumeUrl = await uploadFile(resumeFile);
      }

      // Prepare contractor data with pay rate fields
      // Using type assertion to include new fields that may not be in the type definition yet
      const contractorData = {
        full_name: data.full_name,
        email: data.email,
        phone: data.phone,
        preferred_contact: data.preferred_contact as Enums<"contact_method">,
        street_address: data.street_address,
        city: data.city,
        state: data.state,
        zip_code: data.zip_code,
        country: data.country,
        travel_anywhere: data.travel_anywhere,
        travel_radius_miles: data.travel_anywhere
          ? null
          : data.travel_radius_miles,
        pay_type: data.pay_type,
        prefers_hourly: data.prefers_hourly,
        hourly_rate: data.prefers_hourly ? data.hourly_rate : null,
        salary_lower: !data.prefers_hourly ? data.salary_lower : null,
        salary_higher: !data.prefers_hourly ? data.salary_higher : null,
        // Map to new pay rate fields
        pay_rate_upper: data.prefers_hourly 
          ? data.hourly_rate_upper?.toString() 
          : data.salary_higher?.toString(),
        available: data.available,
        notes: data.notes,
        resume_url: resumeUrl,
        summary: data.candidate_summary,
      };

      // Create contractor - use type assertion to handle new fields
      const contractorId = await createContractor(contractorData as TablesInsert<"contractor">);
      
      // Create employee assignments if any are selected
      if (selectedEmployees.length > 0) {
        const { data: authData } = await supabase.auth.getUser();
        if (!authData.user) {
          throw new Error("User authentication required");
        }
        
        // Create all assignments in parallel
        await Promise.all(selectedEmployees.map(async (employeeId) => {
          await supabase
            .from('contractor_internal_link')
            .insert({
              contractor_id: contractorId,
              internal_employee_id: employeeId
            });
        }));
      }
      
      // Reset file state after successful upload
      removeFile();

      // Process keywords - all keywords are already processed and stored in the keywords state
      const allKeywords: string[] = [];
      Object.values(keywords).forEach((categoryKeywords) => {
        categoryKeywords.forEach((keyword) => {
          allKeywords.push(keyword.id);
        });
      });

      if (allKeywords.length > 0) {
        await updateContractorKeywords(contractorId, allKeywords);
      }

      toast({
        title: "Success",
        description: "Contractor created successfully!",
      });

      navigate("/contractors/search");
    } catch (err) {
      console.error("Error creating contractor:", err);
      setError(
        err instanceof Error ? err.message : "Failed to create contractor"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">Add New Contractor</h1>
        <p className="text-gray-600 mt-2">
          Fill out the form below to add a new contractor to the system
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <ResumeUploadSection
          resumeFile={resumeFile}
          resumeUrl={uploadedUrl}
          uploadProgress={uploadProgress}
          onFileChange={handleFileUpload}
          onRemoveFile={removeFile}
          isUploading={uploading}
          isParsing={parsing}
          parseSuccess={parseSuccess}
          parseError={parseError}
          enableParsing={enableParsing}
          onToggleParsing={setEnableParsing}
        />

        <BasicInfoSection
          register={form.register}
          errors={form.formState.errors}
          watchedValues={watchedValues}
          setValue={form.setValue}
        />

        <InternalEmployeeSection
          selectedEmployees={selectedEmployees}
          onEmployeesChange={setSelectedEmployees}
        />

        <LocationSection
          register={form.register}
          watchedValues={watchedValues}
          setValue={form.setValue}
        />

        <TravelSection
          register={form.register}
          errors={form.formState.errors}
          watchedValues={watchedValues}
          setValue={form.setValue}
        />

        <PaySection
          register={form.register}
          errors={form.formState.errors}
          watchedValues={watchedValues}
          setValue={form.setValue}
        />

        <NewContractorKeywordsSection
          keywords={keywords}
          setKeywords={setKeywords}
        />

        <CandidateFlagsSection
          watchedValues={watchedValues}
          setValue={form.setValue}
        />

        <AdditionalInfoSection register={form.register} />

        <div className="flex justify-end space-x-4 pt-6 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/contractors/search")}
            disabled={isSubmitting || parsing}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting || parsing}
            className="min-w-[120px]"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : parsing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Parsing...
              </>
            ) : (
              "Create Contractor"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
