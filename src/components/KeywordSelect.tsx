import { useState, useEffect, useRef } from 'react';
import { Check, X, Plus, ChevronDown } from 'lucide-react';
import { useKeywords } from '@/hooks/useKeywords';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Tables } from '@/integrations/supabase/types';

type Keyword = Tables<'keyword'>;

interface KeywordSelectProps {
  label: string;
  category: string;
  value: Keyword[];
  onChange: (keywords: Keyword[]) => void;
  error?: string;
  required?: boolean;
  helperText?: string;
}

export function KeywordSelect({
  label,
  category,
  value,
  onChange,
  error,
  required,
  helperText,
}: KeywordSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Keyword[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  
  const { searchKeywords, createKeyword } = useKeywords();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const searchDebounced = setTimeout(async () => {
      if (searchTerm.trim()) {
        const results = await searchKeywords(searchTerm, category);
        setSearchResults(results);
      } else {
        setSearchResults([]);
      }
    }, 200);

    return () => clearTimeout(searchDebounced);
  }, [searchTerm, category, searchKeywords]);

  const handleSelect = (keyword: Keyword) => {
    if (!value.find(k => k.id === keyword.id)) {
      onChange([...value, keyword]);
    }
    setSearchTerm('');
    // Keep dropdown open for multiple selections
    inputRef.current?.focus();
  };

  const handleRemove = (keywordId: string) => {
    onChange(value.filter(k => k.id !== keywordId));
  };

  const handleCreateKeyword = async () => {
    if (!searchTerm.trim() || isCreating) return;
    
    try {
      setIsCreating(true);
      const newKeyword = await createKeyword(searchTerm.trim(), category);
      handleSelect(newKeyword);
    } catch (err) {
      console.error('Error creating keyword:', err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && searchTerm.trim()) {
      e.preventDefault();
      
      // Check if exact match exists
      const exactMatch = searchResults.find(
        k => k.name.toLowerCase() === searchTerm.toLowerCase()
      );
      
      if (exactMatch) {
        handleSelect(exactMatch);
      } else {
        handleCreateKeyword();
      }
    }
  };

  const handleBlur = async () => {
    // Small delay to allow for click events to process
    setTimeout(async () => {
      if (searchTerm.trim() && !searchResults.find(k => k.name.toLowerCase() === searchTerm.toLowerCase())) {
        try {
          setIsCreating(true);
          const newKeyword = await createKeyword(searchTerm.trim(), category);
          handleSelect(newKeyword);
        } catch (err) {
          console.error('Error creating keyword:', err);
        } finally {
          setIsCreating(false);
        }
      }
    }, 150);
  };

  const exactMatch = searchResults.find(
    k => k.name.toLowerCase() === searchTerm.toLowerCase()
  );

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      
      {/* Selected Keywords */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {value.map((keyword) => (
            <Badge
              key={keyword.id}
              variant="secondary"
              className="bg-primary/10 text-primary hover:bg-primary/20"
            >
              {keyword.name}
              <button
                type="button"
                onClick={() => handleRemove(keyword.id)}
                className="ml-2 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Search Input */}
      <div className="relative" ref={dropdownRef}>
        <div className="relative">
          <Input
            ref={inputRef}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            placeholder={`Search ${category.toLowerCase()}...`}
            className={cn(
              'pr-8',
              error && 'border-destructive focus:border-destructive focus:ring-destructive'
            )}
          />
          <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        </div>

        {/* Dropdown */}
        {isOpen && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
            {searchTerm && !exactMatch && (
              <button
                type="button"
                onClick={handleCreateKeyword}
                disabled={isCreating}
                className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 flex items-center space-x-2 text-primary"
              >
                <Plus className="h-4 w-4" />
                <span>
                  {isCreating ? 'Creating...' : `Create "${searchTerm}"`}
                </span>
              </button>
            )}
            
            {searchResults.map((keyword) => (
              <button
                key={keyword.id}
                type="button"
                onClick={() => handleSelect(keyword)}
                className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center justify-between"
              >
                <span>{keyword.name}</span>
                {value.find(k => k.id === keyword.id) && (
                  <Check className="h-4 w-4 text-primary" />
                )}
              </button>
            ))}
            
            {searchTerm && searchResults.length === 0 && !isCreating && (
              <div className="px-4 py-3 text-gray-500 text-sm">
                No results found. Press Enter to create "{searchTerm}"
              </div>
            )}
            
            {!searchTerm && (
              <div className="px-4 py-3 text-gray-500 text-sm">
                Start typing to search {category.toLowerCase()}...
              </div>
            )}
          </div>
        )}
      </div>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
      {helperText && !error && (
        <p className="text-sm text-gray-500">{helperText}</p>
      )}
    </div>
  );
}
