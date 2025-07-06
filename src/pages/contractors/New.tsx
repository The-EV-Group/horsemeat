
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useContractors } from '@/hooks/useContractors';
import { useKeywords } from '@/hooks/useKeywords';
import { KeywordSelect } from '@/components/KeywordSelect';
import { FormInput, FormTextarea } from '@/components/FormInput';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Upload, Loader2, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Tables, TablesInsert, Enums } from '@/integrations/supabase/types';

type Keyword = Tables<'keyword'>;
type ContractorInsert = TablesInsert<'contractor'>;
type ContactMethod = Enums<'contact_method'>;

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',  
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
];

const contractorSchema = z.object({
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

type ContractorFormData = z.infer<typeof contractorSchema>;

export default function NewContractor() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { createContractor, uploadResume, loading, error } = useContractors();
  const { createKeyword } = useKeywords();

  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
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
    formState: { errors, isSubmitting }
  } = useForm<ContractorFormData>({
    resolver: zodResolver(contractorSchema),
    defaultValues: {
      star_candidate: false,
      available: true,
      pay_type: 'W2',
      prefers_hourly: true,
      preferred_contact: 'email',
      travel_anywhere: false,
    },
    mode: 'onBlur'
  });

  const watchedValues = watch();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: "Please upload a PDF or Word document",
          variant: "destructive"
        });
        return;
      }
      
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "File size must be less than 5MB",
          variant: "destructive"
        });
        return;
      }
      
      setResumeFile(file);
    }
  };

  const removeFile = () => {
    setResumeFile(null);
    setUploadProgress(0);
  };

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
        notes: [data.notes, data.candidate_summary].filter(Boolean).join('\n\n') || null,
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
      
      navigate(`/contractors/${newContractor.id}`);
      
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
        {/* Candidate Flags */}
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle>Candidate Flags</CardTitle>
            <CardDescription>Key attributes and employment type</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="star_candidate"
                  checked={watchedValues.star_candidate}
                  onCheckedChange={(checked) => setValue('star_candidate', !!checked)}
                />
                <Label htmlFor="star_candidate" className="text-sm font-medium">
                  ⭐ Star Candidate
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="available"
                  checked={watchedValues.available}
                  onCheckedChange={(checked) => setValue('available', !!checked)}
                />
                <Label htmlFor="available" className="text-sm font-medium">
                  Currently Available
                </Label>
              </div>
            </div>
            
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-3 block">
                Employment Type *
              </Label>
              <RadioGroup
                value={watchedValues.pay_type}
                onValueChange={(value) => setValue('pay_type', value as 'W2' | '1099')}
                className="flex space-x-6"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="W2" id="w2" />
                  <Label htmlFor="w2">W2 Employee</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="1099" id="1099" />
                  <Label htmlFor="1099">1099 Contractor</Label>
                </div>
              </RadioGroup>
            </div>
          </CardContent>
        </Card>

        {/* Resume Upload */}
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle>Resume</CardTitle>
            <CardDescription>Upload the contractor's resume (PDF or Word document)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <Label htmlFor="resume" className="cursor-pointer">
                <span className="text-primary hover:text-primary/80 font-medium">
                  Click to upload
                </span>
                {' or drag and drop'}
              </Label>
              <input
                id="resume"
                type="file"
                className="hidden"
                accept=".pdf,.doc,.docx"
                onChange={handleFileChange}
              />
              <p className="text-sm text-gray-500 mt-2">
                PDF, DOC, or DOCX up to 5MB
              </p>
              {resumeFile && (
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between text-sm text-primary">
                    <span>✓ {resumeFile.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={removeFile}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  {uploadProgress > 0 && uploadProgress < 100 && (
                    <Progress value={uploadProgress} className="w-full" />
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Basic Info */}
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>Contact details and personal information</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormInput
              label="Full Name"
              {...register('full_name')}
              error={errors.full_name?.message}
              required
              placeholder="John Doe"
            />
            
            <FormInput
              label="Email"
              type="email"
              {...register('email')}
              error={errors.email?.message}
              required
              placeholder="john@example.com"
            />
            
            <FormInput
              label="Phone"
              type="tel"
              {...register('phone')}
              error={errors.phone?.message}
              required
              placeholder="(555) 123-4567"
            />
            
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-3 block">
                Preferred Contact Method
              </Label>
              <RadioGroup
                value={watchedValues.preferred_contact}
                onValueChange={(value) => setValue('preferred_contact', value as ContactMethod)}
                className="flex space-x-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="email" id="contact-email" />
                  <Label htmlFor="contact-email">Email</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="phone" id="contact-phone" />
                  <Label htmlFor="contact-phone">Phone</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="text" id="contact-text" />
                  <Label htmlFor="contact-text">Text</Label>
                </div>
              </RadioGroup>
            </div>
          </CardContent>
        </Card>

        {/* Location */}
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle>Location</CardTitle>
            <CardDescription>Geographic information</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormInput
              label="City"
              {...register('city')}
              placeholder="New York"
            />
            
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">State</Label>
              <Select value={watchedValues.state} onValueChange={(value) => setValue('state', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select state" />
                </SelectTrigger>
                <SelectContent>
                  {US_STATES.map((state) => (
                    <SelectItem key={state} value={state}>
                      {state}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Travel Preferences */}
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle>Travel Preferences</CardTitle>
            <CardDescription>Willingness to travel for work</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="travel_anywhere"
                checked={watchedValues.travel_anywhere}
                onCheckedChange={(checked) => setValue('travel_anywhere', !!checked)}
              />
              <Label htmlFor="travel_anywhere" className="text-sm font-medium">
                Willing to travel anywhere
              </Label>
            </div>
            
            {!watchedValues.travel_anywhere && (
              <div className="max-w-xs">
                <FormInput
                  label="Travel Radius (miles)"
                  type="number"
                  {...register('travel_radius_miles', { valueAsNumber: true })}
                  error={errors.travel_radius_miles?.message}
                  placeholder="50"
                  helperText="Maximum distance willing to travel"
                  required
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Desired Pay */}
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle>Desired Pay</CardTitle>
            <CardDescription>Compensation preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-3 block">
                Pay Preference *
              </Label>
              <RadioGroup
                value={watchedValues.prefers_hourly ? 'hourly' : 'salary'}
                onValueChange={(value) => setValue('prefers_hourly', value === 'hourly')}
                className="flex space-x-6"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="hourly" id="hourly" />
                  <Label htmlFor="hourly">Hourly Rate</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="salary" id="salary" />
                  <Label htmlFor="salary">Annual Salary</Label>
                </div>
              </RadioGroup>
            </div>
            
            {watchedValues.prefers_hourly ? (
              <div className="max-w-xs">
                <FormInput
                  label="Hourly Rate"
                  type="number"
                  step="0.01"
                  {...register('hourly_rate', { valueAsNumber: true })}
                  error={errors.hourly_rate?.message}
                  required
                  placeholder="65.00"
                />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormInput
                  label="Minimum Salary"
                  type="number"
                  {...register('salary_lower', { valueAsNumber: true })}
                  error={errors.salary_lower?.message}
                  required
                  placeholder="80000"
                />
                <FormInput
                  label="Maximum Salary"
                  type="number"
                  {...register('salary_higher', { valueAsNumber: true })}
                  required
                  placeholder="120000"
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Keywords */}
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle>Keywords & Skills</CardTitle>
            <CardDescription>Categorize the contractor's expertise and experience</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {Object.entries(keywords).map(([category, selectedKeywords]) => (
              <KeywordSelect
                key={category}
                label={category.charAt(0).toUpperCase() + category.slice(1)}
                category={category}
                value={selectedKeywords}
                onChange={(newKeywords) => setKeywords(prev => ({
                  ...prev,
                  [category]: newKeywords
                }))}
                helperText={`Search and select ${category} or create new ones`}
              />
            ))}
          </CardContent>
        </Card>

        {/* Additional Info */}
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle>Additional Information</CardTitle>
            <CardDescription>Goals, interests, and overall assessment</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <FormTextarea
              label="Goals / Interests"
              {...register('notes')}
              placeholder="What are their career goals and interests?"
              helperText="Optional notes about the contractor's aspirations"
            />
            
            <FormTextarea
              label="Candidate Summary"
              {...register('candidate_summary')}
              placeholder="Provide an overall summary of this contractor..."
              className="min-h-[120px]"
              helperText="Overall assessment and notes"
            />
          </CardContent>
        </Card>

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
            disabled={isSubmitting || loading}
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
