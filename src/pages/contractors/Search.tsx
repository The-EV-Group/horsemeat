import { useState, useEffect } from "react";
import {
  useContractorSearch,
  type SearchFilters as SearchFiltersType,
} from "@/hooks/contractors/useContractorSearch";
import { SearchFilters } from "@/components/contractors/SearchFilters";
import { ContractorProfile } from "@/components/contractors/ContractorProfile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Eye, Star, MapPin, DollarSign, List, Users } from "lucide-react";
import { useLocation } from "react-router-dom";

export default function SearchContractors() {
  const { contractors, loading, searchContractors, listAllContractors, error } =
    useContractorSearch();
  const [selectedContractorId, setSelectedContractorId] = useState<
    string | null
  >(null);
  const [viewMode, setViewMode] = useState<"table" | "list">("table");
  const location = useLocation();

  // Track the returnPath for when closing the contractor profile
  const [returnToPath, setReturnToPath] = useState<string | undefined>(
    undefined
  );

  // Check if we should open a specific contractor profile on load
  useEffect(() => {
    if (location.state?.openProfile) {
      // Set the selected contractor ID
      setSelectedContractorId(location.state.openProfile);

      // Store the return path if provided
      if (location.state.returnPath) {
        console.log("Setting return path:", location.state.returnPath);
        setReturnToPath(location.state.returnPath);
      }

      // Clear the navigation state to prevent reopening on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const handleSearch = (filters: SearchFiltersType) => {
    console.log("Executing search with filters:", filters);
    searchContractors(filters);
    setViewMode("table");
  };

  const handleListAll = () => {
    console.log("Listing all contractors");
    listAllContractors();
    setViewMode("list");
  };

  const handleViewProfile = (contractorId: string) => {
    setSelectedContractorId(contractorId);
  };

  const handleCloseProfile = () => {
    setSelectedContractorId(null);
  };

  // Sort contractors by match percentage (highest first)
  const sortedContractors = [...contractors].sort((a, b) => {
    if (a.matchPercentage !== undefined && b.matchPercentage !== undefined) {
      return (b.matchPercentage || 0) - (a.matchPercentage || 0);
    }
    if (a.matchPercentage !== undefined) return -1;
    if (b.matchPercentage !== undefined) return 1;
    return 0;
  });

  if (selectedContractorId) {
    return (
      <ContractorProfile
        contractorId={selectedContractorId}
        onClose={handleCloseProfile}
        returnToPath={returnToPath}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Search Contractors
        </h1>
        <p className="text-gray-600">Find and manage your contractor network</p>
      </div>

      <SearchFilters onSearch={handleSearch} loading={loading} />

      <div className="flex gap-4 mb-4">
        <Button
          onClick={handleListAll}
          disabled={loading}
          variant="outline"
          className="flex items-center gap-2"
        >
          <Users className="h-4 w-4" />
          {loading ? "Loading..." : "List All Contractors"}
        </Button>


      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800">Error: {error}</p>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>
            {viewMode === "list" ? "All Contractors" : "Search Results"}
            {contractors.length > 0 && (
              <span className="text-sm font-normal text-gray-500 ml-2">
                ({contractors.length} found)
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-gray-600">Loading contractors...</p>
            </div>
          ) : contractors.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No contractors found. Try adjusting your search criteria or click
              "List All Contractors".
            </p>
          ) : viewMode === "list" ? (
            <ScrollArea className="h-[600px] w-full">
              <div className="space-y-4 pr-4">
                {sortedContractors.map((contractor) => (
                  <Card
                    key={contractor.id}
                    className="p-4 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => handleViewProfile(contractor.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-lg">
                            {contractor.full_name}
                          </h3>

                          {contractor.matchPercentage !== undefined && (
                            <Badge variant="outline" className="ml-2">
                              {contractor.matchPercentage}% match
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                          <div className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            <span>
                              {contractor.city && contractor.state
                                ? `${contractor.city}, ${contractor.state}`
                                : contractor.state
                                  ? contractor.state
                                  : "Not Specified"}
                            </span>
                          </div>

                          <div className="flex items-center gap-1">
                            <DollarSign className="h-4 w-4" />
                            <span>
                              {contractor.prefers_hourly
                                ? contractor.pay_rate_upper
                                  ? `$${contractor.hourly_rate}-$${contractor.pay_rate_upper}/hr`
                                  : `$${contractor.hourly_rate}/hr`
                                : `$${contractor.salary_lower}-$${contractor.salary_higher}`}
                            </span>
                          </div>

                          <Badge
                            variant={
                              contractor.available ? "default" : "secondary"
                            }
                          >
                            {contractor.available ? "Available" : "Unavailable"}
                          </Badge>
                        </div>


                      </div>

                      <Button variant="outline" size="sm" className="ml-4">
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Pay</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Match %</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedContractors.map((contractor) => (
                    <TableRow key={contractor.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {contractor.full_name}
                          </span>
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
                                : "Not Specified"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-4 w-4 text-gray-400" />
                          <span>
                            {contractor.prefers_hourly
                              ? contractor.pay_rate_upper
                                ? `$${contractor.hourly_rate}-$${contractor.pay_rate_upper}/hr`
                                : `$${contractor.hourly_rate}/hr`
                              : `$${contractor.salary_lower}-$${contractor.salary_higher}`}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            contractor.available ? "default" : "secondary"
                          }
                        >
                          {contractor.available ? "Available" : "Unavailable"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {contractor.matchPercentage !== undefined && (
                          <Badge variant="outline">
                            {contractor.matchPercentage}%
                          </Badge>
                        )}
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
