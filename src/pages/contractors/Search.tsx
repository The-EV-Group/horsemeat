
import { useState, useEffect } from 'react';
import { useContractorSearch, type SearchFilters as SearchFiltersType } from '@/hooks/contractors/useContractorSearch';
import { SearchFilters } from '@/components/contractors/SearchFilters';
import { ContractorProfile } from '@/components/contractors/ContractorProfile';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Eye, Star, MapPin, DollarSign, Search as SearchIcon } from 'lucide-react';
import { useLocation } from 'react-router-dom';

export default function SearchContractors() {
  const { contractors, loading, searchContractors, searchByName, error } = useContractorSearch();
  const [selectedContractorId, setSelectedContractorId] = useState<string | null>(null);
  const [lastSearchFilters, setLastSearchFilters] = useState<SearchFiltersType | null>(null);
  const [nameSearchTerm, setNameSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('advanced');
  const location = useLocation();

  // Check if we should open a specific contractor profile on load
  useEffect(() => {
    if (location.state?.openProfile) {
      setSelectedContractorId(location.state.openProfile);
      // Clear the navigation state to prevent reopening on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Handle name search as user types
  useEffect(() => {
    if (activeTab === 'name' && nameSearchTerm.trim()) {
      const debounceTimer = setTimeout(() => {
        searchByName(nameSearchTerm.trim());
      }, 300);
      return () => clearTimeout(debounceTimer);
    } else if (activeTab === 'name' && !nameSearchTerm.trim()) {
      // Clear results when search term is empty
      searchByName('');
    }
  }, [nameSearchTerm, activeTab, searchByName]);

  const handleSearch = (filters: SearchFiltersType) => {
    setLastSearchFilters(filters);
    searchContractors(filters);
  };

  const handleViewProfile = (contractorId: string) => {
    setSelectedContractorId(contractorId);
  };

  const handleCloseProfile = () => {
    setSelectedContractorId(null);
    // Refresh the search results if we had previous search filters
    if (activeTab === 'advanced' && lastSearchFilters) {
      searchContractors(lastSearchFilters);
    } else if (activeTab === 'name' && nameSearchTerm.trim()) {
      searchByName(nameSearchTerm.trim());
    }
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    // Clear results when switching tabs
    if (value === 'name') {
      setNameSearchTerm('');
    }
  };

  if (selectedContractorId) {
    return (
      <ContractorProfile
        contractorId={selectedContractorId}
        onClose={handleCloseProfile}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Search Contractors</h1>
        <p className="text-gray-600">Find and manage your contractor network</p>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="advanced">Advanced Search</TabsTrigger>
          <TabsTrigger value="name">Search by Name</TabsTrigger>
        </TabsList>

        <TabsContent value="advanced" className="space-y-6">
          <SearchFilters onSearch={handleSearch} loading={loading} />
        </TabsContent>

        <TabsContent value="name" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Search by Name</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  type="text"
                  placeholder="Type contractor's name..."
                  value={nameSearchTerm}
                  onChange={(e) => setNameSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle>Search Results</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-gray-600">Searching contractors...</p>
            </div>
          ) : contractors.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              {activeTab === 'name' && !nameSearchTerm.trim() 
                ? "Start typing to search contractors by name"
                : "No contractors found. Try adjusting your search criteria."
              }
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Pay</TableHead>
                    <TableHead>Status</TableHead>
                    {activeTab === 'advanced' && <TableHead>Match %</TableHead>}
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contractors.map((contractor) => (
                    <TableRow key={contractor.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{contractor.full_name}</span>
                          {contractor.star_candidate && (
                            <Star className="h-4 w-4 text-yellow-500" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4 text-gray-400" />
                          <span>
                            {contractor.city && contractor.state 
                              ? `${contractor.city}, ${contractor.state}`
                              : contractor.state 
                              ? contractor.state
                              : 'Not Specified'
                            }
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-4 w-4 text-gray-400" />
                          <span>
                            {contractor.prefers_hourly 
                              ? `$${contractor.hourly_rate}/hr`
                              : `$${contractor.salary_lower}-$${contractor.salary_higher}`
                            }
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={contractor.available ? 'default' : 'secondary'}>
                          {contractor.available ? 'Available' : 'Unavailable'}
                        </Badge>
                      </TableCell>
                      {activeTab === 'advanced' && (
                        <TableCell>
                          {contractor.matchPercentage !== undefined && (
                            <Badge variant="outline">
                              {contractor.matchPercentage}%
                            </Badge>
                          )}
                        </TableCell>
                      )}
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewProfile(contractor.id)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
