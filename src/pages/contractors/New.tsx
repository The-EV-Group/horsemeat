
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useKeywords } from '@/hooks/useKeywords';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import type { Tables, TablesInsert } from '@/integrations/supabase/types';

// Schema and types
import { contractorSchema, type ContractorFormData } from './schemas/contractorSchema';

// Components
import { CandidateFlagsSection } from './components/CandidateFlagsSection';
import { ResumeUploadSection } from './components/ResumeUploadSection';
import { BasicInfoSection } from './components/BasicInfoSection';
import { LocationSection } from './components/LocationSection';
import { TravelSection } from './components/TravelSection';
import { PaySection } from './components/PaySection';
import { AdditionalInfoSection } from './components/AdditionalInfoSection';
import { NewContractorKeywordsSection } from './components/NewContractorKeywordsSection';

// Hooks
import { useResumeUpload } from './hooks/useResumeUpload';

type Keyword = Tables<'keyword'>;

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
      preferred_contact: 'email'
    }
  });

  // Keywords state
  const [keywords, setKeywords] = useState<{
    skills: Keyword[];
    industries: Keyword[];
    certifications: Keyword[];
    companies: Keyword[];
    'job titles': Keyword[];
  }>({
    skills: [],
    industries: [],
    certifications: [],
    companies: [],
    'job titles': []
  });

  // Resume upload
  const { uploadFile, uploading, uploadedUrl } = useResumeUpload();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createContractor = async (contractorData: TablesInsert<'contractor'>) => {
    const { data, error } = await supabase
      .from('contractor')
      .insert(contractorData)
      .select()
      .single();

    if (error) throw error;
    return data.id;
  };

  const updateContractorKeywords = async (contractorId: string, keywordIds: string[]) => {
    const keywordInserts = keywordIds.map(keywordId => ({
      contractor_id: contractorId,
      keyword_id: keywordId
    }));

    const { error } = await supabase
      .from('contractor_keyword')
      .insert(keywordInserts);

    if (error) throw error;
  };

  const onSubmit = async (data: ContractorFormData) => {
    try {
      setIsSubmitting(true);
      setError(null);

      // Upload resume if file is selected
      let resumeUrl = uploadedUrl;
      if (data.resume_file && !uploadedUrl) {
        resumeUrl = await uploadFile(data.resume_file);
      }

      // Prepare contractor data
      const contractorData: TablesInsert<'contractor'> = {
        full_name: data.full_name,
        email: data.email,
        phone: data.phone,
        preferred_contact: data.preferred_contact,
        city: data.city,
        state: data.state,
        travel_anywhere: data.travel_anywhere,
        travel_radius_miles: data.travel_anywhere ? null : data.travel_radius_miles,
        pay_type: data.pay_type,
        prefers_hourly: data.prefers_hourly,
        hourly_rate: data.prefers_hourly ? data.hourly_rate : null,
        salary_lower: !data.prefers_hourly ? data.salary_lower : null,
        salary_higher: !data.prefers_hourly ? data.salary_higher : null,
        available: data.available,
        star_candidate: data.star_candidate,
        notes: data.notes,
        summary: data.candidate_summary,
        resume_url: resumeUrl
      };

      // Create contractor
      const contractorId = await createContractor(contractorData);

      // Process keywords and create any new ones
      const processedKeywords = { ...keywords };
      
      for (const [category, categoryKeywords] of Object.entries(keywords)) {
        const processedCategoryKeywords: typeof categoryKeywords = [];
        
        for (const keyword of categoryKeywords) {
          if (keyword.id.startsWith('local-')) {
            // Create new keyword
            try {
              const createdKeyword = await createKeyword(keyword.name, category);
              processedCategoryKeywords.push(createdKeyword);
            } catch (error) {
              console.error('Error creating keyword:', error);
            }
          } else {
            processedCategoryKeywords.push(keyword);
          }
        }
        
        processedKeywords[category as keyof typeof processedKeywords] = processedCategoryKeywords;
      }

      // Add keywords if any were selected
      const allKeywords: string[] = [];
      Object.values(processedKeywords).forEach(categoryKeywords => {
        categoryKeywords.forEach(keyword => {
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

      navigate('/contractors/search');
    } catch (err) {
      console.error('Error creating contractor:', err);
      setError(err instanceof Error ? err.message : 'Failed to create contractor');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">Add New Contractor</h1>
        <p className="text-gray-600 mt-2">Fill out the form below to add a new contractor to the system</p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <BasicInfoSection form={form} />
        
        <LocationSection form={form} />
        
        <TravelSection form={form} />
        
        <PaySection form={form} />
        
        <NewContractorKeywordsSection 
          keywords={keywords}
          setKeywords={setKeywords}
        />
        
        <CandidateFlagsSection form={form} />
        
        <AdditionalInfoSection form={form} />
        
        <ResumeUploadSection 
          form={form}
          uploading={uploading}
          uploadedUrl={uploadedUrl}
          onUpload={uploadFile}
        />

        <div className="flex justify-end space-x-4 pt-6 border-t">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => navigate('/contractors/search')}
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
              'Create Contractor'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
