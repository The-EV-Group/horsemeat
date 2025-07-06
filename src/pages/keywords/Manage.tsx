
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tags, Settings } from 'lucide-react';

export default function ManageKeywords() {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-primary mb-2">Manage Keywords</h1>
        <p className="text-gray-600">Organize and maintain your keyword taxonomy</p>
      </div>

      <Card className="shadow-soft">
        <CardHeader className="text-center">
          <div className="bg-accent/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Tags className="h-8 w-8 text-accent" />
          </div>
          <CardTitle>Keyword Management System</CardTitle>
          <CardDescription>
            Administrative tools for keyword organization
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-gray-600">
            This admin interface will provide tools for:
          </p>
          <ul className="text-left max-w-md mx-auto space-y-2 text-gray-600">
            <li>• Bulk keyword import/export</li>
            <li>• Category management</li>
            <li>• Duplicate detection and merging</li>
            <li>• Usage analytics</li>
            <li>• Synonym management</li>
            <li>• Archive unused keywords</li>
          </ul>
          <div className="pt-4">
            <Button disabled className="bg-gray-300 text-gray-500">
              <Settings className="mr-2 h-4 w-4" />
              Admin Only - Coming Soon
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
