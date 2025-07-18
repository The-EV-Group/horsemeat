import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Search, RotateCcw, UserSearch, Plus, X } from 'lucide-react';
import type { SearchFilters } from '@/services/linkedinSearch';

interface RecruitmentSearchFiltersProps {
  onSearch: (filters: SearchFilters) => void;
  loading: boolean;
}

export function RecruitmentSearchFilters({ onSearch, loading }: RecruitmentSearchFiltersProps) {
  const [filters, setFilters] = useState<SearchFilters>({
    skills: [],
    industries: [],
    companies: [],
    certifications: [],
    jobTitles: []
  });

  const [currentInputs, setCurrentInputs] = useState({
    skills: '',
    industries: '',
    companies: '',
    certifications: '',
    jobTitles: ''
  });

  const handleSearch = () => {
    onSearch(filters);
  };

  const handleReset = () => {
    const resetFilters: SearchFilters = {
      skills: [],
      industries: [],
      companies: [],
      certifications: [],
      jobTitles: []
    };
    setFilters(resetFilters);
    setCurrentInputs({
      skills: '',
      industries: '',
      companies: '',
      certifications: '',
      jobTitles: ''
    });
  };

  const addKeyword = (category: keyof SearchFilters, value: string) => {
    if (value.trim() && !filters[category].includes(value.trim())) {
      setFilters(prev => ({
        ...prev,
        [category]: [...prev[category], value.trim()]
      }));
      setCurrentInputs(prev => ({
        ...prev,
        [category]: ''
      }));
    }
  };

  const removeKeyword = (category: keyof SearchFilters, index: number) => {
    setFilters(prev => ({
      ...prev,
      [category]: prev[category].filter((_, i) => i !== index)
    }));
  };

  const handleKeyPress = (category: keyof SearchFilters, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addKeyword(category, currentInputs[category]);
    }
  };

  // Check if any meaningful search criteria are provided
  const hasSearchCriteria = [
    ...filters.skills,
    ...filters.industries,
    ...filters.companies,
    ...filters.certifications,
    ...filters.jobTitles
  ].length > 0;

  const renderKeywordInput = (category: keyof SearchFilters, label: string, placeholder: string, helperText: string) => (
    <div className="space-y-2">
      <Label htmlFor={category}>{label}</Label>
      <div className="flex gap-2">
        <Input
          id={category}
          type="text"
          placeholder={placeholder}
          value={currentInputs[category]}
          onChange={(e) => setCurrentInputs(prev => ({ ...prev, [category]: e.target.value }))}
          onKeyPress={(e) => handleKeyPress(category, e)}
          className="flex-1"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => addKeyword(category, currentInputs[category])}
          disabled={!currentInputs[category].trim()}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      {filters[category].length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {filters[category].map((keyword, index) => (
            <Badge key={index} variant="secondary" className="flex items-center gap-1">
              {keyword}
              <button
                type="button"
                onClick={() => removeKeyword(category, index)}
                className="ml-1 hover:text-red-600"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
      <p className="text-sm text-gray-600">{helperText}</p>
    </div>
  );

  return (
    <Card className="shadow-soft">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserSearch className="h-5 w-5" />
          LinkedIn Recruitment Search
        </CardTitle>
        <CardDescription>
          Search LinkedIn profiles by entering keywords for skills, industries, companies, certifications, and job titles
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Search Keywords</h3>
          
          {renderKeywordInput(
            'skills',
            'Skills & Technologies',
            'e.g., Python, React, Machine Learning',
            'Add technical skills and technologies to search for'
          )}

          {renderKeywordInput(
            'industries',
            'Industry Experience',
            'e.g., Healthcare, Finance, Technology',
            'Add industries where candidates should have experience'
          )}

          {renderKeywordInput(
            'companies',
            'Company Experience',
            'e.g., Google, Microsoft, Amazon',
            'Add companies where candidates have worked'
          )}

          {renderKeywordInput(
            'certifications',
            'Certifications',
            'e.g., AWS Certified, PMP, Scrum Master',
            'Add professional certifications to search for'
          )}

          {renderKeywordInput(
            'jobTitles',
            'Job Titles',
            'e.g., Software Engineer, Product Manager, Data Scientist',
            'Add job titles or roles to search for'
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t">
          <Button 
            onClick={handleSearch} 
            disabled={loading || !hasSearchCriteria}
            className="flex-1"
          >
            <Search className="mr-2 h-4 w-4" />
            {loading ? 'Searching LinkedIn...' : 'Search LinkedIn Profiles'}
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

        {!hasSearchCriteria && (
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <p className="text-blue-800 text-sm">
              <strong>Tip:</strong> Add keywords in any category above, then click "Search LinkedIn Profiles" to find potential recruits.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
