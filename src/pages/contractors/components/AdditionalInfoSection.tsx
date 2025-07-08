
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FormTextarea } from '@/components/FormInput';
import type { UseFormRegister } from 'react-hook-form';
import type { ContractorFormData } from '../schemas/contractorSchema';

interface AdditionalInfoSectionProps {
  register: UseFormRegister<ContractorFormData>;
}

export function AdditionalInfoSection({ register }: AdditionalInfoSectionProps) {
  return (
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
  );
}
