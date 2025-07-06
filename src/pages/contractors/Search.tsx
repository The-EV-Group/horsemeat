
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Search, Users } from 'lucide-react';

export default function SearchContractors() {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-primary mb-2">Search Contractors</h1>
        <p className="text-gray-600">Find and browse existing contractors in the system</p>
      </div>

      <Card className="shadow-soft">
        <CardHeader className="text-center">
          <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="h-8 w-8 text-primary" />
          </div>
          <CardTitle>Search & Filter Contractors</CardTitle>
          <CardDescription>
            Advanced search functionality coming soon
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-gray-600">
            This page will feature powerful search and filtering capabilities including:
          </p>
          <ul className="text-left max-w-md mx-auto space-y-2 text-gray-600">
            <li>• Keyword-based search</li>
            <li>• Skill and industry filtering</li>
            <li>• Availability status</li>
            <li>• Pay rate ranges</li>
            <li>• Geographic location</li>
            <li>• Star candidate filtering</li>
          </ul>
          <div className="pt-4">
            <Button disabled className="bg-gray-300 text-gray-500">
              <Users className="mr-2 h-4 w-4" />
              Coming Soon
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
