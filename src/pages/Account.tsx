
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FormInput } from '@/components/FormInput';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { User, Mail, Calendar, Shield } from 'lucide-react';

export default function Account() {
  const { user, employee } = useAuth();

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-primary mb-2">My Profile</h1>
        <p className="text-gray-600">Manage your account settings and preferences</p>
      </div>

      {/* Profile Overview */}
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <User className="h-5 w-5" />
            <span>Profile Information</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center space-x-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="bg-primary text-white text-xl">
                {employee?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="text-lg font-semibold">
                {employee?.full_name || 'No name set'}
              </h3>
              <p className="text-gray-600">{user?.email}</p>
              <p className="text-sm text-gray-500 capitalize">
                {employee?.role || 'Staff'}
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormInput
              label="Full Name"
              value={employee?.full_name || ''}
              disabled
              icon={<User className="h-4 w-4" />}
            />
            <FormInput
              label="Email"
              value={user?.email || ''}
              disabled
              icon={<Mail className="h-4 w-4" />}
            />
          </div>
          
          <Button disabled className="bg-gray-300 text-gray-500">
            Edit Profile (Coming Soon)
          </Button>
        </CardContent>
      </Card>

      {/* Account Details */}
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span>Account Details</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between py-2 border-b">
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium">Member Since</span>
            </div>
            <span className="text-sm text-gray-600">
              {employee?.inserted_at 
                ? new Date(employee.inserted_at).toLocaleDateString()
                : 'Recently'
              }
            </span>
          </div>
          
          <div className="flex items-center justify-between py-2 border-b">
            <div className="flex items-center space-x-2">
              <Shield className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium">Role</span>
            </div>
            <span className="text-sm text-gray-600 capitalize">
              {employee?.role || 'Staff'}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Security */}
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle>Security</CardTitle>
          <CardDescription>Manage your password and security settings</CardDescription>
        </CardHeader>
        <CardContent>
          <Button disabled className="bg-gray-300 text-gray-500">
            Change Password (Coming Soon)
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
