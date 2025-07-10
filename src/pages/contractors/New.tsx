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
  const [autoParsedKeywords, setAutoParsedKeywords] = useState<ParsedResumeData['keywords'] | null>(null);
  
  // Handle file change, upload, and parsing
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileChange(e);
    const file = e.target.files?.[0];
    
    if (file) {
      try {
        // Process the resume file (upload and parse)
        const parsed = await processResumeFile(file);
        
        if (parsed) {
          // Auto-fill form fields with parsed contractor data
          Object.entries(parsed.contractor).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
              // Use type assertion to handle form field types
              form.setValue(key as keyof ContractorFormData, value);
            }
          });
          
          // Store parsed keywords for later use in submission
          setAutoParsedKeywords(parsed.keywords);
          
          // Highlight the auto-filled fields
          highlightAutoFilledInputs(parsed.contractor);
          
          toast({
            title: 'Resume parsed successfully',
            description: 'Form has been pre-filled with resume data',
          });
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

      // Process keywords and create any new ones
      const processedKeywords = { ...keywords };

      // Process user-selected keywords first
      for (const [category, categoryKeywords] of Object.entries(keywords)) {
        const processedCategoryKeywords: typeof categoryKeywords = [];

        for (const keyword of categoryKeywords) {
          if (keyword.id.startsWith("local-")) {
            // Create new keyword
            try {
              const createdKeyword = await createKeyword(
                keyword.name,
                category
              );
              processedCategoryKeywords.push(createdKeyword);
            } catch (error) {
              console.error("Error creating keyword:", error);
            }
          } else {
            processedCategoryKeywords.push(keyword);
          }
        }

        processedKeywords[category as keyof typeof processedKeywords] =
          processedCategoryKeywords;
      }
      
      // Process any auto-parsed keywords that aren't already in the selected keywords
      if (autoParsedKeywords) {
        for (const [category, categoryKeywords] of Object.entries(autoParsedKeywords)) {
          if (!Array.isArray(categoryKeywords)) continue;
          
          // Get normalized category and ensure we have an array for this category
          const normalizedCategory = category.toLowerCase();
          if (!processedKeywords[normalizedCategory as keyof typeof processedKeywords]) {
            processedKeywords[normalizedCategory as keyof typeof processedKeywords] = [];
          }
          
          // Process each keyword from parsed results
          for (const keyword of categoryKeywords) {
            // Skip if already in our processed keywords
            const isAlreadyIncluded = processedKeywords[normalizedCategory as keyof typeof processedKeywords]
              .some(k => k.name.toLowerCase() === keyword.name.toLowerCase());
              
            if (!isAlreadyIncluded) {
              try {
                // Create the new keyword or fetch if it already exists
                const createdKeyword = await createKeyword(
                  keyword.name,
                  normalizedCategory
                );
                processedKeywords[normalizedCategory as keyof typeof processedKeywords].push(createdKeyword);
              } catch (error) {
                console.error(`Error creating keyword ${keyword.name}:`, error);
              }
            }
          }
        }
      }

      // Add keywords if any were selected
      const allKeywords: string[] = [];
      Object.values(processedKeywords).forEach((categoryKeywords) => {
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
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="min-w-[120px]"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
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
