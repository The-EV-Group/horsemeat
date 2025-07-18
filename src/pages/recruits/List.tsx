import { useState } from "react";
import { useLinkedInSearch } from "@/hooks/recruits/useLinkedInSearch";
import type { SearchFilters } from '@/services/linkedinSearch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ExternalLink, Search, Users, GitBranch, UserPlus, Linkedin } from 'lucide-react';
import { RecruitmentSearchFilters } from '@/components/recruits/RecruitmentSearchFilters';

export default function PotentialRecruits() {
  const { profiles, loading, searchLinkedInProfiles, error, searchQuery, categories, totalResults } = useLinkedInSearch();
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = (filters: SearchFilters) => {
    console.log("Executing LinkedIn recruitment search with filters:", filters);
    searchLinkedInProfiles(filters);
    setHasSearched(true);
  };

  const handleViewProfile = (profileUrl: string) => {
    window.open(profileUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-primary mb-2">Recruitment Pipeline</h1>
        <p className="text-gray-600">Search and manage potential recruits by skills, industry, and company</p>
      </div>

      {/* Search Filters */}
      <RecruitmentSearchFilters onSearch={handleSearch} loading={loading} />

      {/* Search Results */}
      {hasSearched && (
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Linkedin className="h-5 w-5" />
              LinkedIn Search Results
              {profiles.length > 0 && (
                <Badge variant="outline" className="ml-2">
                  {profiles.length} {profiles.length === 1 ? 'profile' : 'profiles'}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              LinkedIn profiles matching your search keywords: {searchQuery}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {categories.length > 0 && (
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">Search categories:</p>
                <div className="flex flex-wrap gap-2">
                  {categories.map((category, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {category}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
                <p className="text-red-800">Error: {error}</p>
              </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <span className="ml-2 text-gray-600">Searching LinkedIn profiles...</span>
              </div>
            ) : profiles.length === 0 ? (
              <div className="text-center py-12">
                <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Linkedin className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No LinkedIn profiles found</h3>
                <p className="text-gray-600 mb-4">
                  Try adjusting your search keywords to find potential recruits.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Profile</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>LinkedIn URL</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {profiles.map((profile, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Linkedin className="h-5 w-5 text-blue-600" />
                            <div>
                              <div className="font-medium">
                                {profile.name || 'LinkedIn User'}
                              </div>
                              <p className="text-sm text-gray-500 truncate max-w-xs">
                                {profile.title}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-md">
                            <p className="text-sm text-gray-600 line-clamp-3">
                              {profile.snippet || 'No description available'}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <ExternalLink className="h-4 w-4 text-gray-400" />
                            <a 
                              href={profile.link} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 underline text-sm truncate max-w-xs"
                            >
                              View on LinkedIn
                            </a>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewProfile(profile.link)}
                            >
                              <ExternalLink className="h-4 w-4 mr-2" />
                              Open Profile
                            </Button>
                            <Button
                              size="sm"
                              className="bg-primary hover:bg-primary/90"
                            >
                              <UserPlus className="h-4 w-4 mr-2" />
                              Add to Pipeline
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Getting Started Card - shown when no search has been performed */}
      {!hasSearched && (
        <Card className="shadow-soft">
          <CardHeader className="text-center">
            <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <GitBranch className="h-8 w-8 text-primary" />
            </div>
            <CardTitle>Find Your Next Great Hire</CardTitle>
            <CardDescription>
              Use the search filters above to find potential recruits based on skills, industry, and company experience
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-gray-600">
              Search through our contractor database to identify candidates who match your requirements:
            </p>
            <ul className="text-left max-w-md mx-auto space-y-2 text-gray-600">
              <li>• Filter by specific skills and technologies</li>
              <li>• Find candidates with industry experience</li>
              <li>• Search by previous company experience</li>
              <li>• View match percentages for better targeting</li>
              <li>• Access detailed candidate profiles</li>
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
