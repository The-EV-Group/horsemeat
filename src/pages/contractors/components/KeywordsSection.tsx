
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { KeywordSelect } from '@/components/KeywordSelect';
import { Edit, Save, X } from 'lucide-react';
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
  onSave: (keywords: {
    skills: Keyword[];
    industries: Keyword[];
    certifications: Keyword[];
    companies: Keyword[];
    'job titles': Keyword[];
  }) => Promise<void>;
}

export function KeywordsSection({ keywords, onSave }: KeywordsSectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editingKeywords, setEditingKeywords] = useState(keywords);
  const [isSaving, setIsSaving] = useState(false);

  const handleEdit = () => {
    setEditingKeywords(keywords);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setEditingKeywords(keywords);
    setIsEditing(false);
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await onSave(editingKeywords);
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving keywords:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="shadow-soft">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Keywords & Skills</CardTitle>
            <CardDescription>Categorize the contractor's expertise and experience</CardDescription>
          </div>
          {!isEditing ? (
            <Button variant="outline" size="sm" onClick={handleEdit}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Keywords
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleCancel} disabled={isSaving}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave} disabled={isSaving}>
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {isEditing ? (
          // Edit mode - show KeywordSelect components
          Object.entries(editingKeywords).map(([category, selectedKeywords]) => (
            <KeywordSelect
              key={category}
              label={category.charAt(0).toUpperCase() + category.slice(1)}
              category={category}
              value={selectedKeywords}
              onChange={(newKeywords) => setEditingKeywords(prev => ({
                ...prev,
                [category]: newKeywords
              }))}
              helperText={`Search and select ${category} or create new ones`}
            />
          ))
        ) : (
          // View mode - display keywords as badges
          Object.entries(keywords).map(([category, categoryKeywords]) => (
            <div key={category} className="space-y-2">
              <h4 className="font-medium text-gray-700 capitalize">{category}</h4>
              <div className="flex flex-wrap gap-2">
                {categoryKeywords.length > 0 ? (
                  categoryKeywords.map((keyword) => (
                    <span
                      key={keyword.id}
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary"
                    >
                      {keyword.name}
                    </span>
                  ))
                ) : (
                  <span className="text-gray-400 text-sm italic">No {category} added</span>
                )}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
