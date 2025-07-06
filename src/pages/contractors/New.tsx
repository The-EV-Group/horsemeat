
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useContractors } from '@/hooks/useContractors';
import { KeywordSelect } from '@/components/KeywordSelect';
import { FormInput, FormTextarea } from '@/components/FormInput';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, Loader2 } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type Keyword = Tables<'keyword'>;

const TIMEZONES = [
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'America/Phoenix', 'America/Anchorage', 'Pacific/Honolulu'
];

const STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
];

export default function NewContractor() {
  const navigate = useNavigate();
  const { createContractor, uploadResume, loading, error } = useContractors();

  // Form state
  const [formData, setFormData] = useState({
    // Candidate flags
    star_candidate: false,
    available: true,
    pay_type: 'W2' as 'W2' | '1099',
    
    // Basic info
    full_name: '',
    email: '',
    phone: '',
    timezone: '',
    
    // Address
    street: '',
    extended: '',
    city: '',
    state: '',
    postal: '',
    
    // Pay preference
    prefers_hourly: true,
    hourly_rate: '',
    salary_lower: '',
    salary_higher: '',
    
    // Additional info
    notes: '',
    preferred_contact: 'email' as 'email' | 'text' | 'phone',
    travel_anywhere: false,
    travel_radius_miles: '',
    candidate_summary: '',
  });

  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [keywords, setKeywords] = useState({
    skills: [] as Keyword[],
    industries: [] as Keyword[],
    certifications: [] as Keyword[],
    companies: [] as Keyword[],
    'job titles': [] as Keyword[],
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!allowedTypes.includes(file.type)) {
        setFormErrors(prev => ({ ...prev, resume: 'Please upload a PDF or Word document' }));
        return;
      }
      
      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        setFormErrors(prev => ({ ...prev, resume: 'File size must be less than 5MB' }));
        return;
      }
      
      setResumeFile(file);
      setFormErrors(prev => ({ ...prev, resume: '' }));
    }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    
    if (!formData.full_name.trim()) errors.full_name = 'Full name is required';
    if (!formData.email.trim()) errors.email = 'Email is required';
    if (!formData.phone.trim()) errors.phone = 'Phone is required';
    
    if (formData.prefers_hourly && !formData.hourly_rate) {
      errors.hourly_rate = 'Hourly rate is required';
    } else if (!formData.prefers_hourly && (!formData.salary_lower || !formData.salary_higher)) {
      errors.salary_range = 'Salary range is required';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      setSubmitting(true);
      
      // Upload resume if provided
      let resumeUrl = '';
      if (resumeFile) {
        resumeUrl = await uploadResume(resumeFile);
      }
      
      // Prepare travel preferences and contact preference for notes
      const additionalNotes = [];
      if (formData.preferred_contact !== 'email') {
        additionalNotes.push(`Preferred contact: ${formData.preferred_contact}`);
      }
      if (formData.travel_anywhere) {
        additionalNotes.push('Willing to travel anywhere');
      } else if (formData.travel_radius_miles) {
        additionalNotes.push(`Travel radius: ${formData.travel_radius_miles} miles`);
      }
      
      const combinedNotes = [
        formData.notes,
        ...additionalNotes,
        formData.candidate_summary,
      ].filter(Boolean).join('\n\n');
      
      // Prepare contractor data
      const contractorData = {
        full_name: formData.full_name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        star_candidate: formData.star_candidate,
        available: formData.available,
        pay_type: formData.pay_type,
        prefers_hourly: formData.prefers_hourly,
        hourly_rate: formData.prefers_hourly ? parseFloat(formData.hourly_rate) || null : null,
        salary_lower: !formData.prefers_hourly ? parseFloat(formData.salary_lower) || null : null,
        salary_higher: !formData.prefers_hourly ? parseFloat(formData.salary_higher) || null : null,
        notes: combinedNotes || null,
        resume_url: resumeUrl || null,
      };
      
      // Prepare keywords for insertion
      const allKeywords = [
        ...keywords.skills,
        ...keywords.industries,
        ...keywords.certifications,
        ...keywords.companies,
        ...keywords['job titles'],
      ].map(keyword => ({ keyword_id: keyword.id }));
      
      await createContractor(contractorData, allKeywords);
      
      // Navigate to success page or dashboard
      navigate('/dashboard', { 
        state: { message: 'Contractor created successfully!' }
      });
      
    } catch (err) {
      console.error('Error creating contractor:', err);
    } finally {
      setSubmitting(false);
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

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Candidate Flags */}
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle>Candidate Flags</CardTitle>
            <CardDescription>Key attributes and employment type</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="star_candidate"
                  checked={formData.star_candidate}
                  onCheckedChange={(checked) => handleInputChange('star_candidate', checked)}
                />
                <Label htmlFor="star_candidate" className="text-sm font-medium">
                  ⭐ Star Candidate
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="available"
                  checked={formData.available}
                  onCheckedChange={(checked) => handleInputChange('available', checked)}
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
                value={formData.pay_type}
                onValueChange={(value) => handleInputChange('pay_type', value as 'W2' | '1099')}
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
                <p className="text-sm text-primary mt-2">
                  ✓ {resumeFile.name}
                </p>
              )}
              {formErrors.resume && (
                <p className="text-sm text-destructive mt-2">{formErrors.resume}</p>
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
              value={formData.full_name}
              onChange={(e) => handleInputChange('full_name', e.target.value)}
              error={formErrors.full_name}
              required
              placeholder="John Doe"
            />
            
            <FormInput
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              error={formErrors.email}
              required
              placeholder="john@example.com"
            />
            
            <FormInput
              label="Phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              error={formErrors.phone}
              required
              placeholder="(555) 123-4567"
            />
            
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">
                Time Zone
              </Label>
              <Select value={formData.timezone} onValueChange={(value) => handleInputChange('timezone', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select timezone" />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz} value={tz}>
                      {tz.replace('_', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Address */}
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle>Address</CardTitle>
            <CardDescription>Physical location information</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <FormInput
                label="Street Address"
                value={formData.street}
                onChange={(e) => handleInputChange('street', e.target.value)}
                placeholder="123 Main St"
              />
            </div>
            
            <FormInput
              label="Apt/Suite/Unit"
              value={formData.extended}
              onChange={(e) => handleInputChange('extended', e.target.value)}
              placeholder="Apt 4B"
            />
            
            <FormInput
              label="City"
              value={formData.city}
              onChange={(e) => handleInputChange('city', e.target.value)}
              placeholder="New York"
            />
            
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">State</Label>
              <Select value={formData.state} onValueChange={(value) => handleInputChange('state', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select state" />
                </SelectTrigger>
                <SelectContent>
                  {STATES.map((state) => (
                    <SelectItem key={state} value={state}>
                      {state}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <FormInput
              label="Postal Code"
              value={formData.postal}
              onChange={(e) => handleInputChange('postal', e.target.value)}
              placeholder="10001"
            />
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
                value={formData.prefers_hourly ? 'hourly' : 'salary'}
                onValueChange={(value) => handleInputChange('prefers_hourly', value === 'hourly')}
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
            
            {formData.prefers_hourly ? (
              <div className="max-w-xs">
                <FormInput
                  label="Hourly Rate"
                  type="number"
                  step="0.01"
                  value={formData.hourly_rate}
                  onChange={(e) => handleInputChange('hourly_rate', e.target.value)}
                  error={formErrors.hourly_rate}
                  required
                  placeholder="65.00"
                />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormInput
                  label="Minimum Salary"
                  type="number"
                  value={formData.salary_lower}
                  onChange={(e) => handleInputChange('salary_lower', e.target.value)}
                  error={formErrors.salary_range}
                  required
                  placeholder="80000"
                />
                <FormInput
                  label="Maximum Salary"
                  type="number"
                  value={formData.salary_higher}
                  onChange={(e) => handleInputChange('salary_higher', e.target.value)}
                  required
                  placeholder="120000"
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Additional Info */}
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle>Additional Information</CardTitle>
            <CardDescription>Goals, interests, and preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <FormTextarea
              label="Goals / Interests"
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="What are their career goals and interests?"
              helperText="Optional notes about the contractor's aspirations"
            />
            
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-3 block">
                Preferred Contact Method
              </Label>
              <RadioGroup
                value={formData.preferred_contact}
                onValueChange={(value) => handleInputChange('preferred_contact', value)}
                className="flex space-x-6"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="email" id="contact-email" />
                  <Label htmlFor="contact-email">Email</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="text" id="contact-text" />
                  <Label htmlFor="contact-text">Text Message</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="phone" id="contact-phone" />
                  <Label htmlFor="contact-phone">Phone Call</Label>
                </div>
              </RadioGroup>
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
                checked={formData.travel_anywhere}
                onCheckedChange={(checked) => handleInputChange('travel_anywhere', checked)}
              />
              <Label htmlFor="travel_anywhere" className="text-sm font-medium">
                Willing to travel anywhere
              </Label>
            </div>
            
            {!formData.travel_anywhere && (
              <div className="max-w-xs">
                <FormInput
                  label="Travel Radius (miles)"
                  type="number"
                  value={formData.travel_radius_miles}
                  onChange={(e) => handleInputChange('travel_radius_miles', e.target.value)}
                  placeholder="50"
                  helperText="Maximum distance willing to travel"
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

        {/* Candidate Summary */}
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle>Candidate Summary</CardTitle>
            <CardDescription>Overall assessment and notes</CardDescription>
          </CardHeader>
          <CardContent>
            <FormTextarea
              label="Summary"
              value={formData.candidate_summary}
              onChange={(e) => handleInputChange('candidate_summary', e.target.value)}
              placeholder="Provide an overall summary of this contractor..."
              className="min-h-[120px]"
              helperText="This will be added to the contractor's notes"
            />
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex justify-end space-x-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(-1)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="bg-primary hover:bg-primary/90"
            disabled={submitting || loading}
          >
            {submitting ? (
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
