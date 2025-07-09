
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { FormInput } from '@/components/shared/FormInput';
import type { UseFormRegister, FieldErrors } from 'react-hook-form';
import type { ContractorFormData } from '@/lib/schemas/contractorSchema';
import type { Enums } from '@/integrations/supabase/types';

type ContactMethod = Enums<'contact_method'>;

interface BasicInfoSectionProps {
  register: UseFormRegister<ContractorFormData>;
  errors: FieldErrors<ContractorFormData>;
  watchedValues: ContractorFormData;
  setValue: (name: keyof ContractorFormData, value: any) => void;
}

export function BasicInfoSection({ register, errors, watchedValues, setValue }: BasicInfoSectionProps) {
  return (
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
  );
}
