import { useState, useEffect, useRef } from 'react';
import { Check, X, Plus, ChevronDown } from 'lucide-react';
import { useKeywords } from '@/hooks/useKeywords';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
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
  // flag to skip blur auto-create right after a selection
  const justSelected = useRef(false);
  
  const { searchKeywords } = useKeywords();
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
    justSelected.current = true;
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
    const trimmedTerm = searchTerm.trim();
    if (!trimmedTerm || isCreating) return;

    // prevent duplicate in current selection
    if (value.some(k => k.name.toLowerCase() === trimmedTerm.toLowerCase())) {
      setSearchTerm('');
      return;
    }

    // create local placeholder keyword (not persisted yet)
    const placeholder: Keyword = {
      id: `local-${crypto.randomUUID()}`,
      name: trimmedTerm,
      category,
    } as Keyword;
    handleSelect(placeholder);
    setSearchTerm('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const trimmedTerm = searchTerm.trim();
      if (!trimmedTerm) return;
      // Prioritize exact or first search result
      if (exactMatch) {
        handleSelect(exactMatch);
      } else if (searchResults.length > 0) {
        handleSelect(searchResults[0]);
      } else {
        handleCreateKeyword();
      }
    }
  };

  const handleBlur = async () => {
    if (justSelected.current) {
      // reset flag and skip auto creation
      justSelected.current = false;
      return;
    }
    // Small delay to allow for click events to process
    setTimeout(async () => {
      const trimmedTerm = searchTerm.trim();
      
      // Ignore blank or whitespace-only inputs
      if (!trimmedTerm) return;
      
      // Check if this keyword already exists in the current selection
      const isDuplicate = value.some(k => k.name.toLowerCase() === trimmedTerm.toLowerCase());
      if (isDuplicate) {
        setSearchTerm('');
        return;
      }
      
      // Check if it exists in search results
      if (!searchResults.find(k => k.name.toLowerCase() === trimmedTerm.toLowerCase())) {
        // create local placeholder instead
          const placeholder: Keyword = {
            id: `local-${crypto.randomUUID()}`,
            name: trimmedTerm,
            category,
          } as Keyword;
          handleSelect(placeholder);
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
                onMouseDown={handleCreateKeyword}
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
                onMouseDown={() => handleSelect(keyword)}
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
