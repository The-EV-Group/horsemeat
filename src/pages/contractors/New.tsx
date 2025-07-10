
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
import { useResumeParseIntegration, ParsedResumeData } from '@/hooks/contractors/useResumeParseIntegration';
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
      star_candidate: false,
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

  // Internal employee state
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);

  // Resume upload hook and state
  const { resumeFile, uploadProgress, uploading, uploadedUrl, handleFileChange, removeFile, uploadFile } = useResumeUpload();
  
  // Resume parsing hook and state
  const { parsing, parsedData, processResumeFile } = useResumeParseIntegration();

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
    
    if (file) {
      try {
        console.log('Starting resume processing for:', file.name);
        
        // Process the resume file (upload and parse)
        const parsed = await processResumeFile(file);
        
        if (parsed && parsed.contractor) {
          console.log('Parsed data received:', parsed);
          
          // Check if we have meaningful data to populate
          const contractorData = parsed.contractor;
          const fieldsToPopulate: { [key: string]: any } = {};
          
          // Only populate fields that have actual values
          if (contractorData.full_name?.trim()) {
            fieldsToPopulate.full_name = contractorData.full_name.trim();
            form.setValue('full_name', contractorData.full_name.trim());
          }
          
          if (contractorData.email?.trim()) {
            fieldsToPopulate.email = contractorData.email.trim();
            form.setValue('email', contractorData.email.trim());
          }
          
          if (contractorData.phone?.trim()) {
            fieldsToPopulate.phone = contractorData.phone.trim();
            form.setValue('phone', contractorData.phone.trim());
          }
          
          if (contractorData.city?.trim()) {
            fieldsToPopulate.city = contractorData.city.trim();
            form.setValue('city', contractorData.city.trim());
          }
          
          if (contractorData.state?.trim()) {
            fieldsToPopulate.state = contractorData.state.trim();
            form.setValue('state', contractorData.state.trim());
          }
          
          if (contractorData.summary?.trim()) {
            fieldsToPopulate.candidate_summary = contractorData.summary.trim();
            form.setValue('candidate_summary', contractorData.summary.trim());
          }
          
          if (contractorData.notes?.trim()) {
            fieldsToPopulate.notes = contractorData.notes.trim();
            form.setValue('notes', contractorData.notes.trim());
          }

          // Process keywords and add them to the UI
          let keywordsAdded = 0;
          if (parsed.keywords) {
            keywordsAdded = await processAndAddKeywords(parsed.keywords);
          }
          
          // Only highlight and show success if we actually populated some fields or keywords
          const totalItemsPopulated = Object.keys(fieldsToPopulate).length + keywordsAdded;
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
      const contractorData: TablesInsert<"contractor"> = {
        full_name: data.full_name,
        email: data.email,
        phone: data.phone,
        preferred_contact: data.preferred_contact as Enums<"contact_method">,
        city: data.city,
        state: data.state,
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
        star_candidate: data.star_candidate,
        notes: data.notes,
        resume_url: resumeUrl,
        summary: data.candidate_summary,
        owner_id: selectedEmployee, // Link to internal employee
      };

      // Create contractor
      const contractorId = await createContractor(contractorData);

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
          isUploading={uploading}
          isParsing={parsing}
          onFileChange={handleFileUpload}
          onRemoveFile={removeFile}
          onUrlChange={() => {}} // URL changes handled by the hook internally
        />

        <BasicInfoSection
          register={form.register}
          errors={form.formState.errors}
          watchedValues={watchedValues}
          setValue={form.setValue}
        />

        <InternalEmployeeSection
          selectedEmployee={selectedEmployee}
          onEmployeeChange={setSelectedEmployee}
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
