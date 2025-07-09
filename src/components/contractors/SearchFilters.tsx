
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { KeywordSelect } from '@/components/keywords/KeywordSelect';
import { Search, RotateCcw } from 'lucide-react';
import { US_STATES } from '@/lib/schemas/contractorSchema';
import type { SearchFilters as SearchFiltersType } from '@/hooks/contractors/useContractorSearch';
import type { Tables } from '@/integrations/supabase/types';

type Keyword = Tables<'keyword'>;

interface SearchFiltersProps {
  onSearch: (filters: SearchFiltersType) => void;
  loading: boolean;
}

export function SearchFilters({ onSearch, loading }: SearchFiltersProps) {
  const [filters, setFilters] = useState<SearchFiltersType>({
    searchTerm: '',
    available: null,
    starCandidate: null,
    payType: null,
    state: '',
    city: '',
    skills: [],
    industries: [],
    companies: [],
    certifications: [],
    jobTitles: []
  });

  const handleSearch = () => {
    // Remove empty string values
    const cleanFilters = {
      ...filters,
      state: filters.state || undefined,
      city: filters.city || undefined,
      searchTerm: filters.searchTerm || undefined,
      payType: filters.payType || undefined
    };
    onSearch(cleanFilters);
  };

  const handleReset = () => {
    const resetFilters: SearchFiltersType = {
      searchTerm: '',
      available: null,
      starCandidate: null,
      payType: null,
      state: '',
      city: '',
      skills: [],
      industries: [],
      companies: [],
      certifications: [],
      jobTitles: []
    };
    setFilters(resetFilters);
    onSearch(resetFilters);
  };

  const updateKeywords = (category: keyof Pick<SearchFiltersType, 'skills' | 'industries' | 'companies' | 'certifications' | 'jobTitles'>, keywords: Keyword[]) => {
    setFilters(prev => ({
      ...prev,
      [category]: keywords
    }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Search Filters</CardTitle>
        <CardDescription>Filter contractors by various criteria</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Basic Search */}
        <div className="space-y-2">
          <Label htmlFor="search-term">Search Term</Label>
          <Input
            id="search-term"
            type="text"
            placeholder="Search by name, email, or phone"
            value={filters.searchTerm}
            onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
          />
        </div>

        {/* Location Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="state">State</Label>
            <Select 
              value={filters.state} 
              onValueChange={(value) => setFilters(prev => ({ ...prev, state: value }))}
            >
              <SelectTrigger id="state">
                <SelectValue placeholder="Select state" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All States</SelectItem>
                {US_STATES.map((state) => (
                  <SelectItem key={state} value={state}>
                    {state}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="city">City</Label>
            <Input
              id="city"
              type="text"
              placeholder="Enter city"
              value={filters.city}
              onChange={(e) => setFilters(prev => ({ ...prev, city: e.target.value }))}
            />
          </div>
        </div>

        {/* Status Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <Label>Availability</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="available-yes"
                  checked={filters.available === true}
                  onCheckedChange={(checked) => 
                    setFilters(prev => ({ ...prev, available: checked ? true : null }))
                  }
                />
                <Label htmlFor="available-yes">Available</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="available-no"
                  checked={filters.available === false}
                  onCheckedChange={(checked) => 
                    setFilters(prev => ({ ...prev, available: checked ? false : null }))
                  }
                />
                <Label htmlFor="available-no">Unavailable</Label>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <Label>Star Candidate</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="star-yes"
                  checked={filters.starCandidate === true}
                  onCheckedChange={(checked) => 
                    setFilters(prev => ({ ...prev, starCandidate: checked ? true : null }))
                  }
                />
                <Label htmlFor="star-yes">Star Candidate</Label>
              </div>
            </div>
          </div>
        </div>

        {/* Pay Type Filter */}
        <div className="space-y-2">
          <Label htmlFor="pay-type">Pay Type</Label>
          <Select 
            value={filters.payType || ''} 
            onValueChange={(value) => setFilters(prev => ({ ...prev, payType: value || null }))}
          >
            <SelectTrigger id="pay-type">
              <SelectValue placeholder="Select pay type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Types</SelectItem>
              <SelectItem value="W2">W2</SelectItem>
              <SelectItem value="1099">1099</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Keywords */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Keywords & Skills</h3>
          
          <KeywordSelect
            label="Skills"
            category="skills"
            value={filters.skills}
            onChange={(keywords) => updateKeywords('skills', keywords)}
            helperText="Search and select skills"
          />

          <KeywordSelect
            label="Industries"
            category="industries"
            value={filters.industries}
            onChange={(keywords) => updateKeywords('industries', keywords)}
            helperText="Search and select industries"
          />

          <KeywordSelect
            label="Companies"
            category="companies"
            value={filters.companies}
            onChange={(keywords) => updateKeywords('companies', keywords)}
            helperText="Search and select companies"
          />

          <KeywordSelect
            label="Certifications"
            category="certifications"
            value={filters.certifications}
            onChange={(keywords) => updateKeywords('certifications', keywords)}
            helperText="Search and select certifications"
          />

          <KeywordSelect
            label="Job Titles"
            category="job titles"
            value={filters.jobTitles}
            onChange={(keywords) => updateKeywords('jobTitles', keywords)}
            helperText="Search and select job titles"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t">
          <Button 
            onClick={handleSearch} 
            disabled={loading}
            className="flex-1"
          >
            <Search className="mr-2 h-4 w-4" />
            {loading ? 'Searching...' : 'Search'}
          </Button>
          <Button 
            variant="outline" 
            onClick={handleReset}
            disabled={loading}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
