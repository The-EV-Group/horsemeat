import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useContractors } from '@/hooks/useContractors';
import { useKeywords } from '@/hooks/useKeywords';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
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
import { KeywordsSection } from './components/KeywordsSection';
import { AdditionalInfoSection } from './components/AdditionalInfoSection';

// Hooks
import { useResumeUpload } from './hooks/useResumeUpload';

type Keyword = Tables<'keyword'>;
type ContractorInsert = TablesInsert<'contractor'>;

export default function NewContractor() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { createContractor, uploadResume, loading, error } = useContractors();
  const { createKeyword } = useKeywords();

  const { resumeFile, uploadProgress, setUploadProgress, handleFileChange, removeFile } = useResumeUpload();

  const [keywords, setKeywords] = useState({
    skills: [] as Keyword[],
    industries: [] as Keyword[],
    certifications: [] as Keyword[],
    companies: [] as Keyword[],
    'job titles': [] as Keyword[],
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting, isValid }
  } = useForm<ContractorFormData>({
    resolver: zodResolver(contractorSchema),
    defaultValues: {
      full_name: '',
      email: '',
      phone: '',
      city: '',
      state: '',
      star_candidate: false,
      available: true,
      pay_type: 'W2',
      prefers_hourly: true,
      preferred_contact: 'email',
      travel_anywhere: false,
      hourly_rate: undefined,
      salary_lower: undefined,
      salary_higher: undefined,
      travel_radius_miles: undefined,
      notes: '',
      candidate_summary: '',
    },
    mode: 'onChange'
  });

  const watchedValues = watch();

  const onSubmit = async (data: ContractorFormData) => {
    try {
      let resumeUrl = '';
      
      if (resumeFile) {
        setUploadProgress(10);
        resumeUrl = await uploadResume(resumeFile);
        setUploadProgress(100);
      }
      
      const contractorData: ContractorInsert = {
        full_name: data.full_name,
        email: data.email,
        phone: data.phone,
        city: data.city || null,
        state: data.state || null,
        preferred_contact: data.preferred_contact,
        travel_anywhere: data.travel_anywhere,
        travel_radius_miles: data.travel_anywhere ? null : data.travel_radius_miles || null,
        pay_type: data.pay_type,
        prefers_hourly: data.prefers_hourly,
        hourly_rate: data.prefers_hourly ? data.hourly_rate || null : null,
        salary_lower: !data.prefers_hourly ? data.salary_lower || null : null,
        salary_higher: !data.prefers_hourly ? data.salary_higher || null : null,
        star_candidate: data.star_candidate,
        available: data.available,
        notes: data.notes || null,
        summary: data.candidate_summary || null,
        resume_url: resumeUrl || null,
      };
      
      // Resolve keyword IDs; create any local placeholders
      const selectedKeywords = [
        ...keywords.skills,
        ...keywords.industries,
        ...keywords.certifications,
        ...keywords.companies,
        ...keywords['job titles'],
      ];

      const allKeywordsPromises = selectedKeywords.map(async (kw) => {
        // local placeholder ids are prefixed with 'local-'
        if (kw.id && !kw.id.startsWith('local-')) {
          return { keyword_id: kw.id };
        }
        // create in DB
        const inserted = await createKeyword(kw.name, kw.category);
        return { keyword_id: inserted.id };
      });

      const allKeywords = await Promise.all(allKeywordsPromises);
      
      const newContractor = await createContractor(contractorData, allKeywords);
      
      toast({
        title: "Success",
        description: "Contractor created successfully!",
      });
      
      // Reset form and clear keywords
      reset();
      setKeywords({
        skills: [],
        industries: [],
        certifications: [],
        companies: [],
        'job titles': [],
      });
      removeFile();
      
      // Stay on the same page with cleared inputs
      
    } catch (err) {
      console.error('Error creating contractor:', err);
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : 'Failed to create contractor',
        variant: "destructive"
      });
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-primary mb-2">Add New Contractor</h1>
        <p className="text-gray-600">Register a new contractor in the system</p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        <CandidateFlagsSection 
          watchedValues={watchedValues} 
          setValue={setValue} 
        />

        <ResumeUploadSection
          resumeFile={resumeFile}
          uploadProgress={uploadProgress}
          onFileChange={handleFileChange}
          onRemoveFile={removeFile}
          isUploading={loading}
        />

        <BasicInfoSection
          register={register}
          errors={errors}
          watchedValues={watchedValues}
          setValue={setValue}
        />

        <LocationSection
          register={register}
          watchedValues={watchedValues}
          setValue={setValue}
        />

        <TravelSection
          register={register}
          errors={errors}
          watchedValues={watchedValues}
          setValue={setValue}
        />

        <PaySection
          register={register}
          errors={errors}
          watchedValues={watchedValues}
          setValue={setValue}
        />

        <KeywordsSection
          keywords={keywords}
          setKeywords={setKeywords}
        />

        <AdditionalInfoSection
          register={register}
        />

        {/* Submit Button */}
        <div className="flex justify-end space-x-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(-1)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="bg-primary hover:bg-primary/90"
            disabled={isSubmitting || loading || !isValid}
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
