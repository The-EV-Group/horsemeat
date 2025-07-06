
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, GitBranch } from 'lucide-react';

export default function PotentialRecruits() {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-primary mb-2">Potential Recruits</h1>
        <p className="text-gray-600">Manage your recruitment pipeline and prospects</p>
      </div>

      <Card className="shadow-soft">
        <CardHeader className="text-center">
          <div className="bg-success/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <GitBranch className="h-8 w-8 text-success" />
          </div>
          <CardTitle>Recruitment Pipeline</CardTitle>
          <CardDescription>
            Track prospects through your recruitment process
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-gray-600">
            This page will help you manage potential recruits with features like:
          </p>
          <ul className="text-left max-w-md mx-auto space-y-2 text-gray-600">
            <li>• Lead tracking and status</li>
            <li>• Interview scheduling</li>
            <li>• Follow-up reminders</li>
            <li>• Conversion tracking</li>
            <li>• Pipeline analytics</li>
            <li>• Communication history</li>
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
