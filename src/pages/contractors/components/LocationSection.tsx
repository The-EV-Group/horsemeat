
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { FormInput } from '@/components/FormInput';
import type { UseFormRegister } from 'react-hook-form';
import type { ContractorFormData } from '../schemas/contractorSchema';
import { US_STATES } from '../schemas/contractorSchema';

interface LocationSectionProps {
  register: UseFormRegister<ContractorFormData>;
  watchedValues: ContractorFormData;
  setValue: (name: keyof ContractorFormData, value: any) => void;
}

export function LocationSection({ register, watchedValues, setValue }: LocationSectionProps) {
  return (
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
  );
}
