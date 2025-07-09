
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import type { ContractorFormData } from '@/lib/schemas/contractorSchema';

interface CandidateFlagsSectionProps {
  watchedValues: ContractorFormData;
  setValue: (name: keyof ContractorFormData, value: any) => void;
}

export function CandidateFlagsSection({ watchedValues, setValue }: CandidateFlagsSectionProps) {
  return (
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
  );
}
