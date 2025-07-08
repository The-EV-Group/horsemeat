
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { FormInput } from '@/components/shared/FormInput';
import type { UseFormRegister, FieldErrors } from 'react-hook-form';
import type { ContractorFormData } from '../schemas/contractorSchema';

interface TravelSectionProps {
  register: UseFormRegister<ContractorFormData>;
  errors: FieldErrors<ContractorFormData>;
  watchedValues: ContractorFormData;
  setValue: (name: keyof ContractorFormData, value: any) => void;
}

export function TravelSection({ register, errors, watchedValues, setValue }: TravelSectionProps) {
  return (
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
              {...register('travel_radius_miles')}
              error={errors.travel_radius_miles?.message}
              placeholder="50"
              helperText="Maximum distance willing to travel"
              required
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
