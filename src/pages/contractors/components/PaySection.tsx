
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { FormInput } from '@/components/FormInput';
import type { UseFormRegister, FieldErrors } from 'react-hook-form';
import type { ContractorFormData } from '../schemas/contractorSchema';

interface PaySectionProps {
  register: UseFormRegister<ContractorFormData>;
  errors: FieldErrors<ContractorFormData>;
  watchedValues: ContractorFormData;
  setValue: (name: keyof ContractorFormData, value: any) => void;
}

export function PaySection({ register, errors, watchedValues, setValue }: PaySectionProps) {
  return (
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
              {...register('hourly_rate')}
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
              {...register('salary_lower')}
              error={errors.salary_lower?.message}
              required
              placeholder="80000"
            />
            <FormInput
              label="Maximum Salary"
              type="number"
              {...register('salary_higher')}
              error={errors.salary_higher?.message}
              required
              placeholder="120000"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
