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

  // Local state for new keywords being created
  const [localKeywords, setLocalKeywords] = useState<Keyword[]>([]);

  // Combine actual keywords with local ones
  const allSelectedKeywords = useMemo(() => {
    return [...value, ...localKeywords];
  }, [value, localKeywords]);

  useEffect(() => {
    const performSearch = async () => {
      if (searchTerm.trim()) {
        setIsSearching(true);
        try {
          const results = await searchKeywords(searchTerm, category);
          setSearchResults(results);
        } catch (error) {
          console.error('Error searching keywords:', error);
          setSearchResults([]);
        } finally {
          setIsSearching(false);
        }
      } else {
        setSearchResults([]);
      }
    };

    const debounceTimer = setTimeout(performSearch, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchTerm, category, searchKeywords]);

  const handleSelect = (keyword: Keyword) => {
    const isSelected = allSelectedKeywords.some(k => k.id === keyword.id);
    
    if (isSelected) {
      // Remove keyword
      const newSelected = value.filter(k => k.id !== keyword.id);
      const newLocal = localKeywords.filter(k => k.id !== keyword.id);
      onChange(newSelected);
      setLocalKeywords(newLocal);
    } else {
      // Add keyword
      if (keyword.id.startsWith('local-')) {
        setLocalKeywords(prev => [...prev, keyword]);
      } else {
        onChange([...value, keyword]);
      }
    }
  };

  const handleCreateNew = async () => {
    const trimmedTerm = searchTerm.trim();
    if (!trimmedTerm) return;

    // Check if keyword already exists
    const existsInResults = searchResults.some(k => 
      k.name.toLowerCase() === trimmedTerm.toLowerCase()
    );
    const existsInSelected = allSelectedKeywords.some(k => 
      k.name.toLowerCase() === trimmedTerm.toLowerCase()
    );

    if (existsInResults || existsInSelected) {
      return;
    }

    // Create a temporary local keyword
    const localKeyword: Keyword = {
      id: `local-${Date.now()}-${Math.random()}`,
      name: trimmedTerm,
      category: category,
      inserted_at: new Date().toISOString()
    };

    setLocalKeywords(prev => [...prev, localKeyword]);
    setSearchTerm('');
  };

  const handleRemove = (keywordToRemove: Keyword) => {
    if (keywordToRemove.id.startsWith('local-')) {
      setLocalKeywords(prev => prev.filter(k => k.id !== keywordToRemove.id));
    } else {
      onChange(value.filter(k => k.id !== keywordToRemove.id));
    }
  };

  const availableKeywords = useMemo(() => {
    return searchResults.filter(keyword => 
      !allSelectedKeywords.some(selected => selected.id === keyword.id)
    );
  }, [searchResults, allSelectedKeywords]);

  const canCreateNew = searchTerm.trim() && 
    !searchResults.some(k => k.name.toLowerCase() === searchTerm.trim().toLowerCase()) &&
    !allSelectedKeywords.some(k => k.name.toLowerCase() === searchTerm.trim().toLowerCase());

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-gray-700">{label}</Label>
      
      {/* Selected keywords */}
      {allSelectedKeywords.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {allSelectedKeywords.map((keyword) => (
            <Badge 
              key={keyword.id} 
              variant="secondary" 
              className={cn(
                "flex items-center gap-1",
                keyword.id.startsWith('local-') && "bg-blue-100 text-blue-800 border-blue-300"
              )}
            >
              {keyword.name}
              {keyword.id.startsWith('local-') && <span className="text-xs">(new)</span>}
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
          <Command>
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
                          onSelect={() => {
                            handleSelect(keyword);
                            setSearchTerm('');
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              allSelectedKeywords.some(k => k.id === keyword.id) 
                                ? "opacity-100" 
                                : "opacity-0"
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
                        onSelect={() => {
                          handleCreateNew();
                        }}
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