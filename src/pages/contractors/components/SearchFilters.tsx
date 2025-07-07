
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { KeywordSelect } from '@/components/KeywordSelect';
import { Search } from 'lucide-react';
import { US_STATES } from '../schemas/contractorSchema';
import type { SearchFilters } from '@/hooks/useContractorSearch';
import type { Tables } from '@/integrations/supabase/types';

type Keyword = Tables<'keyword'>;

interface SearchFiltersProps {
  onSearch: (filters: SearchFilters) => void;
  loading: boolean;
}

export function SearchFilters({ onSearch, loading }: SearchFiltersProps) {
  const [filters, setFilters] = useState<SearchFilters>({
    skills: [],
    industries: [],
    certifications: [],
    companies: [],
    jobTitles: [],
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate location: either empty, state only, or city + state
    if (filters.city && !filters.state) {
      alert('Please select a state when entering a city');
      return;
    }

    // Validate pay ranges
    if (filters.payType === 'hourly' || filters.payType === 'salary') {
      if (!filters.payMin || !filters.payMax) {
        alert('Please enter both minimum and maximum pay values');
        return;
      }
      if (filters.payMin >= filters.payMax) {
        alert('Minimum pay must be less than maximum pay');
        return;
      }
    }

    onSearch(filters);
  };

  const updateKeywords = (category: keyof Pick<SearchFilters, 'skills' | 'industries' | 'certifications' | 'companies' | 'jobTitles'>, keywords: Keyword[]) => {
    setFilters(prev => ({ ...prev, [category]: keywords }));
  };

  return (
    <Card className="shadow-soft mb-6">
      <CardHeader>
        <CardTitle>Search Contractors</CardTitle>
        <CardDescription>Filter contractors by location, pay, and skills</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Location Filter */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Location</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>State</Label>
                <Select value={filters.state || ''} onValueChange={(value) => setFilters(prev => ({ ...prev, state: value || undefined }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select state (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Any State</SelectItem>
                    {US_STATES.map((state) => (
                      <SelectItem key={state} value={state}>
                        {state}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>City</Label>
                <Input
                  placeholder="Enter city (requires state)"
                  value={filters.city || ''}
                  onChange={(e) => setFilters(prev => ({ ...prev, city: e.target.value || undefined }))}
                  disabled={!filters.state}
                />
              </div>
            </div>
          </div>

          {/* Pay Filter */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Desired Pay</h3>
            <RadioGroup
              value={filters.payType || 'no-preference'}
              onValueChange={(value) => setFilters(prev => ({ ...prev, payType: value as SearchFilters['payType'] }))}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="no-preference" id="no-preference" />
                <Label htmlFor="no-preference">No Preference</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="hourly" id="hourly" />
                <Label htmlFor="hourly">Hourly</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="salary" id="salary" />
                <Label htmlFor="salary">Salary</Label>
              </div>
            </RadioGroup>

            {(filters.payType === 'hourly' || filters.payType === 'salary') && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Minimum {filters.payType === 'hourly' ? '($/hour)' : '($/year)'}</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={filters.payMin || ''}
                    onChange={(e) => setFilters(prev => ({ ...prev, payMin: e.target.value ? parseFloat(e.target.value) : undefined }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Maximum {filters.payType === 'hourly' ? '($/hour)' : '($/year)'}</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={filters.payMax || ''}
                    onChange={(e) => setFilters(prev => ({ ...prev, payMax: e.target.value ? parseFloat(e.target.value) : undefined }))}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Keyword Filters */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Keywords & Skills</h3>
            <div className="space-y-4">
              <KeywordSelect
                label="Skills"
                category="skills"
                value={filters.skills}
                onChange={(keywords) => updateKeywords('skills', keywords)}
                helperText="Search and select relevant skills"
              />
              
              <KeywordSelect
                label="Industries"
                category="industries"
                value={filters.industries}
                onChange={(keywords) => updateKeywords('industries', keywords)}
                helperText="Search and select relevant industries"
              />
              
              <KeywordSelect
                label="Certifications"
                category="certifications"
                value={filters.certifications}
                onChange={(keywords) => updateKeywords('certifications', keywords)}
                helperText="Search and select relevant certifications"
              />
              
              <KeywordSelect
                label="Companies"
                category="companies"
                value={filters.companies}
                onChange={(keywords) => updateKeywords('companies', keywords)}
                helperText="Search and select relevant companies"
              />
              
              <KeywordSelect
                label="Job Titles"
                category="job titles"
                value={filters.jobTitles}
                onChange={(keywords) => updateKeywords('jobTitles', keywords)}
                helperText="Search and select relevant job titles"
              />
            </div>
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            <Search className="mr-2 h-4 w-4" />
            {loading ? 'Searching...' : 'Search Contractors'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
