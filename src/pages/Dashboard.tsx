
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { NavLink } from 'react-router-dom';
import { UserPlus, Search, Users, Bot, BarChart3, Clock } from 'lucide-react';

export default function Dashboard() {
  const { employee, user } = useAuth();

  const quickActions = [
    {
      title: 'Add New Contractor',
      description: 'Register a new contractor in the system',
      href: '/contractors/new',
      icon: UserPlus,
      color: 'primary',
    },
    {
      title: 'Search Contractors',
      description: 'Find and browse existing contractors',
      href: '/contractors/search',
      icon: Search,
      color: 'accent',
    },
    {
      title: 'Potential Recruits',
      description: 'Manage your recruitment pipeline',
      href: '/recruits',
      icon: Users,
      color: 'success',
    },
    {
      title: 'AI Search',
      description: 'Use AI to find the perfect contractor',
      href: '/ai-search',
      icon: Bot,
      color: 'warning',
    },
  ];

  const stats = [
    { label: 'Total Contractors', value: '0', icon: Users },
    { label: 'Active Recruits', value: '0', icon: Clock },
    { label: 'Completed This Month', value: '0', icon: BarChart3 },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-primary/5 to-accent/5 rounded-lg p-6 border border-primary/10">
        <h1 className="text-3xl font-bold text-primary mb-2">
          Welcome back, {employee?.full_name || user?.email?.split('@')[0] || 'User'}!
        </h1>
        <p className="text-gray-600">
          Manage your contractor relationships and recruitment pipeline from here.
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, index) => (
          <Card key={index} className="shadow-soft">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                  <p className="text-3xl font-bold text-primary">{stat.value}</p>
                </div>
                <div className="bg-primary/10 p-3 rounded-lg">
                  <stat.icon className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {quickActions.map((action, index) => (
            <Card key={index} className="shadow-soft hover:shadow-lg transition-shadow duration-200">
              <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                <div className={`bg-${action.color}/10 p-2 rounded-lg mr-4`}>
                  <action.icon className={`h-6 w-6 text-${action.color}`} />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-lg">{action.title}</CardTitle>
                  <CardDescription>{action.description}</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <Button asChild className="w-full">
                  <NavLink to={action.href}>
                    Get Started
                  </NavLink>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Recent Activity Placeholder */}
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Your latest contractor interactions</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 text-center py-8">
            No recent activity to display. Start by adding your first contractor!
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
