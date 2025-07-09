
import { useState, useEffect, useMemo } from 'react';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { useKeywords } from '@/hooks/keywords/useKeywords';
import { cn } from '@/lib/utils';
import type { Tables } from '@/integrations/supabase/types';

type Keyword = Tables<'keyword'>;

interface KeywordSelectProps {
  label: string;
  category: string;
  value: Keyword[];
  onChange: (keywords: Keyword[]) => void;
  helperText?: string;
}

export function KeywordSelect({ label, category, value, onChange, helperText }: KeywordSelectProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Keyword[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  const { searchKeywords, createKeyword } = useKeywords();

  // Debounce search
  useEffect(() => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    const timeoutId = setTimeout(async () => {
      try {
        const results = await searchKeywords(searchTerm, category);
        setSearchResults(results);
      } catch (error) {
        console.error('Error searching keywords:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, category, searchKeywords]);

  const availableKeywords = useMemo(() => {
    return searchResults.filter(keyword => 
      !value.some(selected => selected.id === keyword.id)
    );
  }, [searchResults, value]);

  const handleSelect = (keyword: Keyword) => {
    const isSelected = value.some(k => k.id === keyword.id);
    
    if (isSelected) {
      onChange(value.filter(k => k.id !== keyword.id));
    } else {
      onChange([...value, keyword]);
    }
    setSearchTerm('');
  };

  const handleCreateNew = async () => {
    const trimmedTerm = searchTerm.trim();
    if (!trimmedTerm) return;

    // Check if keyword already exists
    const existsInResults = searchResults.some(k => 
      k.name.toLowerCase() === trimmedTerm.toLowerCase()
    );
    const existsInSelected = value.some(k => 
      k.name.toLowerCase() === trimmedTerm.toLowerCase()
    );

    if (existsInResults || existsInSelected) {
      return;
    }

    try {
      const newKeyword = await createKeyword(trimmedTerm, category);
      onChange([...value, newKeyword]);
      setSearchTerm('');
    } catch (error) {
      console.error('Error creating keyword:', error);
    }
  };

  const handleRemove = (keywordToRemove: Keyword) => {
    onChange(value.filter(k => k.id !== keywordToRemove.id));
  };

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
              onValueChange={setSearchTerm}
            />
            <CommandList>
              {isSearching ? (
                <CommandEmpty>Searching...</CommandEmpty>
              ) : (
                <>
                  {availableKeywords.length === 0 && !canCreateNew && (
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
