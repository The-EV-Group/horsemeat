
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { FormInput } from '@/components/shared/FormInput';
import type { UseFormRegister } from 'react-hook-form';
import type { ContractorFormData } from '@/lib/schemas/contractorSchema';
import { US_STATES } from '@/lib/schemas/contractorSchema';

interface LocationSectionProps {
  register: UseFormRegister<ContractorFormData>;
  watchedValues: ContractorFormData;
  setValue: (name: keyof ContractorFormData, value: string | number | boolean | undefined) => void;
}

export function LocationSection({ register, watchedValues, setValue }: LocationSectionProps) {
  return (
    <Card className="shadow-soft">
      <CardHeader>
        <CardTitle>Location</CardTitle>
        <CardDescription>Geographic information</CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-6">
        <FormInput
          label="Street Address"
          {...register('street_address')}
          placeholder="123 Main St"
        />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormInput
            label="Zip Code"
            {...register('zip_code')}
            placeholder="10001"
          />
          
          <FormInput
            label="Country"
            {...register('country')}
            placeholder="United States"
            defaultValue="United States"
          />
        </div>
      </CardContent>
    </Card>
  );
}
