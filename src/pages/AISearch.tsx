
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bot, Sparkles } from 'lucide-react';

export default function AISearch() {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-primary mb-2">Contractor AI Search</h1>
        <p className="text-gray-600">Use artificial intelligence to find the perfect contractor match</p>
      </div>

      <Card className="shadow-soft">
        <CardHeader className="text-center">
          <div className="bg-warning/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Bot className="h-8 w-8 text-warning" />
          </div>
          <CardTitle>AI-Powered Contractor Matching</CardTitle>
          <CardDescription>
            Intelligent search and recommendation system
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-gray-600">
            This advanced AI system will help you find contractors using:
          </p>
          <ul className="text-left max-w-md mx-auto space-y-2 text-gray-600">
            <li>• Natural language job descriptions</li>
            <li>• Skill similarity matching</li>
            <li>• Experience-based recommendations</li>
            <li>• Availability optimization</li>
            <li>• Budget-conscious suggestions</li>
            <li>• Success rate predictions</li>
          </ul>
          <div className="pt-4">
            <Button disabled className="bg-gray-300 text-gray-500">
              <Sparkles className="mr-2 h-4 w-4" />
              Coming Soon
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
