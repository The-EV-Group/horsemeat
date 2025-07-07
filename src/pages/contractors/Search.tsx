
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { SearchFilters } from './components/SearchFilters';
import { ContractorProfile } from './components/ContractorProfile';
import { useContractorSearch } from '@/hooks/useContractorSearch';
import { Search, Star, MapPin, DollarSign, Phone, Mail } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type Contractor = Tables<'contractor'>;

export default function SearchContractors() {
  const { contractors, loading, error, searchContractors, updateContractor, deleteContractor } = useContractorSearch();
  const [selectedContractor, setSelectedContractor] = useState<Contractor | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [hasSearched, setHasSearched] = useState(false);

  // Load all contractors on initial page load
  useEffect(() => {
    handleSearch({
      skills: [],
      industries: [],
      certifications: [],
      companies: [],
      jobTitles: [],
    });
  }, []);

  const handleSearch = async (filters: any) => {
    await searchContractors(filters);
    setHasSearched(true);
  };

  const filteredContractors = contractors.filter(contractor =>
    !searchTerm || 
    contractor.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contractor.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contractor.city?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (selectedContractor) {
    return (
      <ContractorProfile
        contractor={selectedContractor}
        onUpdate={updateContractor}
        onDelete={deleteContractor}
        onClose={() => setSelectedContractor(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-primary mb-2">Search Contractors</h1>
        <p className="text-gray-600">Find contractors based on location, skills, and requirements</p>
      </div>

      <SearchFilters onSearch={handleSearch} loading={loading} />

      {error && (
        <Card className="border-red-200">
          <CardContent className="pt-6">
            <p className="text-red-600">Error: {error}</p>
          </CardContent>
        </Card>
      )}

      {hasSearched && (
        <Card className="shadow-soft">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Search Results</CardTitle>
                <CardDescription>
                  Found {contractors.length} contractor{contractors.length !== 1 ? 's' : ''}
                </CardDescription>
              </div>
              {contractors.length > 0 && (
                <div className="w-80">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Filter results..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <p className="text-gray-600">Searching contractors...</p>
              </div>
            ) : filteredContractors.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-600">
                  {contractors.length === 0 ? 'No contractors found matching your criteria.' : 'No contractors match your filter.'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredContractors.map((contractor) => (
                  <Card 
                    key={contractor.id} 
                    className="hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-transparent hover:border-l-primary"
                    onClick={() => setSelectedContractor(contractor)}
                  >
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <h3 className="text-lg font-semibold">{contractor.full_name}</h3>
                            <div className="flex gap-2">
                              {contractor.star_candidate && (
                                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                                  <Star className="w-3 h-3 mr-1" />
                                  Star
                                </Badge>
                              )}
                              <Badge variant={contractor.available ? 'default' : 'secondary'}>
                                {contractor.available ? 'Available' : 'Unavailable'}
                              </Badge>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4" />
                              <span>
                                {contractor.city && contractor.state 
                                  ? `${contractor.city}, ${contractor.state}`
                                  : contractor.state || 'Location not specified'
                                }
                              </span>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <DollarSign className="h-4 w-4" />
                              <span>
                                {contractor.prefers_hourly 
                                  ? `$${contractor.hourly_rate || 0}/hr`
                                  : `$${contractor.salary_lower || 0} - $${contractor.salary_higher || 0}/yr`
                                }
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              {contractor.preferred_contact === 'email' ? (
                                <Mail className="h-4 w-4" />
                              ) : (
                                <Phone className="h-4 w-4" />
                              )}
                              <span>
                                {contractor.preferred_contact === 'email' 
                                  ? contractor.email 
                                  : contractor.phone || 'No contact info'
                                }
                              </span>
                            </div>
                          </div>

                          {contractor.notes && (
                            <p className="mt-3 text-sm text-gray-600 line-clamp-2">
                              {contractor.notes}
                            </p>
                          )}
                        </div>

                        <Button variant="outline" size="sm">
                          View Profile
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
