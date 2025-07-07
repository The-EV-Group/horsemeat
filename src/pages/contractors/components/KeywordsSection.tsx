
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { KeywordSelect } from '@/components/KeywordSelect';
import type { Tables } from '@/integrations/supabase/types';

type Keyword = Tables<'keyword'>;

interface KeywordsSectionProps {
  keywords: {
    skills: Keyword[];
    industries: Keyword[];
    certifications: Keyword[];
    companies: Keyword[];
    'job titles': Keyword[];
  };
  setKeywords: React.Dispatch<React.SetStateAction<{
    skills: Keyword[];
    industries: Keyword[];
    certifications: Keyword[];
    companies: Keyword[];
    'job titles': Keyword[];
  }>>;
}

export function KeywordsSection({ keywords, setKeywords }: KeywordsSectionProps) {
  return (
    <Card className="shadow-soft">
      <CardHeader>
        <CardTitle>Keywords & Skills</CardTitle>
        <CardDescription>Categorize the contractor's expertise and experience</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {Object.entries(keywords).map(([category, selectedKeywords]) => (
          <KeywordSelect
            key={category}
            label={category.charAt(0).toUpperCase() + category.slice(1)}
            category={category}
            value={selectedKeywords}
            onChange={(newKeywords) => setKeywords(prev => ({
              ...prev,
              [category]: newKeywords
            }))}
            helperText={`Search and select ${category} or create new ones`}
          />
        ))}
      </CardContent>
    </Card>
  );
}
