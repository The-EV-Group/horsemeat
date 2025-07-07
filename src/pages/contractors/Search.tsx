
import { useState } from 'react';
import { useContractorSearch } from '@/hooks/useContractorSearch';
import { SearchFilters } from './components/SearchFilters';
import { ContractorProfile } from './components/ContractorProfile';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Eye, Star, MapPin, DollarSign } from 'lucide-react';

export default function SearchContractors() {
  const { contractors, loading, searchContractors } = useContractorSearch();
  const [selectedContractorId, setSelectedContractorId] = useState<string | null>(null);

  const handleSearch = (filters: any) => {
    searchContractors(filters);
  };

  const handleViewProfile = (contractorId: string) => {
    setSelectedContractorId(contractorId);
  };

  const handleCloseProfile = () => {
    setSelectedContractorId(null);
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

      <SearchFilters onSearch={handleSearch} />

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
              No contractors found. Try adjusting your search criteria.
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
                          <span>{contractor.city}, {contractor.state}</span>
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
