
import React, { useState, useCallback, useMemo } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Check, ChevronsUpDown, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useKeywords } from '@/hooks/keywords/useKeywords';

export type KeywordType = {
  id: string;
  name: string;
  category?: string;
};

export type KeywordSelectProps = {
  label?: string;
  category?: string;
  value: KeywordType[];
  onChange: (keywords: KeywordType[]) => void;
  helperText?: string;
};

export function KeywordSelect({ 
  label = 'Keywords', 
  category,
  value = [], 
  onChange,
  helperText,
}: KeywordSelectProps) {
  const { searchKeywords, createKeyword, searchLoading } = useKeywords(category);
  
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<KeywordType[]>([]);
  
  // Handle search term changes
  const handleSearchChange = useCallback(async (term: string) => {
    setSearchTerm(term);
    
    if (term.trim()) {
      const results = await searchKeywords(term, category);
      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  }, [searchKeywords, category]);
  
  const handleSelect = useCallback((keyword: KeywordType) => {
    // Check if keyword is already selected (prevent duplicates)
    const isAlreadySelected = value.some(k => k.id === keyword.id);
    if (isAlreadySelected) {
      return;
    }
    
    onChange([...value, keyword]);
    setSearchTerm('');
    setSearchResults([]);
    setOpen(false);
  }, [onChange, value]);
  
  const handleRemove = useCallback((keyword: KeywordType) => {
    onChange(value.filter(k => k.id !== keyword.id));
  }, [onChange, value]);
  
  const handleCreateNew = useCallback(async () => {
    if (!searchTerm.trim() || !category) return;
    
    // Check if keyword with same name already exists in selected values
    const existsInSelected = value.some(k => k.name.toLowerCase() === searchTerm.trim().toLowerCase());
    if (existsInSelected) {
      return;
    }
    
    try {
      const newKeyword = await createKeyword(searchTerm, category);
      onChange([...value, newKeyword]);
      setSearchTerm('');
      setSearchResults([]);
      setOpen(false);
    } catch (error) {
      console.error('Failed to create keyword:', error);
    }
  }, [searchTerm, category, createKeyword, onChange, value]);
  
  // Filter out selected keywords from search results
  const availableKeywords = useMemo(() => {
    return searchResults.filter(
      result => !value.some(selected => selected.id === result.id)
    );
  }, [searchResults, value]);
  
  // Check if we can create a new keyword (not already selected and doesn't exist in results)
  const canCreateNew = searchTerm.trim() && 
    !searchResults.some(k => k.name.toLowerCase() === searchTerm.trim().toLowerCase()) &&
    !value.some(k => k.name.toLowerCase() === searchTerm.trim().toLowerCase());

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-gray-700">{label}</Label>
      
      {/* Selected keywords */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {value.map((keyword) => (
            <Badge 
              key={keyword.id} 
              variant="secondary" 
              className="flex items-center gap-1"
            >
              {keyword.name}
              <X 
                className="h-3 w-3 cursor-pointer hover:text-destructive" 
                onClick={() => handleRemove(keyword)}
              />
            </Badge>
          ))}
        </div>
      )}

      {/* Dropdown */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            Search {category}...
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput 
              placeholder={`Search ${category}...`}
              value={searchTerm}
              onValueChange={handleSearchChange}
              className="border-none focus:ring-0"
            />
            <CommandList>
              {searchLoading ? (
                <CommandEmpty className="py-6 text-center">
                  <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
                  Searching...
                </CommandEmpty>
              ) : (
                <>
                  {searchTerm && availableKeywords.length === 0 && !canCreateNew && (
                    <CommandEmpty>No {category} found.</CommandEmpty>
                  )}
                  
                  {availableKeywords.length > 0 && (
                    <CommandGroup>
                      {availableKeywords.map((keyword) => (
                        <CommandItem
                          key={keyword.id}
                          value={keyword.name}
                          onSelect={() => handleSelect(keyword)}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4 opacity-0"
                            )}
                          />
                          {keyword.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}
                  
                  {canCreateNew && (
                    <CommandGroup>
                      <CommandItem
                        value={searchTerm}
                        onSelect={handleCreateNew}
                        className="text-blue-600"
                      >
                        <span className="mr-2">+</span>
                        Create "{searchTerm}"
                      </CommandItem>
                    </CommandGroup>
                  )}
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      
      {helperText && (
        <p className="text-sm text-gray-500">{helperText}</p>
      )}
    </div>
  );
}
