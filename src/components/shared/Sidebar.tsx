import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  UserPlus, 
  Search, 
  Users, 
  Bot, 
  Tags, 
  User,
  Menu,
  X,
  LogOut,
  Settings
} from 'lucide-react';
import { useAuth } from '@/hooks/auth/useAuth';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

// Grouped navigation items with role-based access control
const navigationGroups = [
  {
    label: "Main",
    items: [
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['staff', 'admin'] },
    ]
  },
  {
    label: "Contractors",
    items: [
      { name: 'Add Contractor', href: '/contractors/new', icon: UserPlus, roles: ['staff', 'admin'] },
      { name: 'Search Contractors', href: '/contractors/search', icon: Search, roles: ['staff', 'admin'] },
      { name: 'Potential Recruits', href: '/recruits', icon: Users, roles: ['staff', 'admin'] },
    ]
  },
  {
    label: "System",
    items: [
      { name: 'Manage Keywords', href: '/keywords', icon: Tags, roles: ['staff', 'admin'] },
      { name: 'My Profile', href: '/account', icon: User, roles: ['staff', 'admin'] },
    ]
  }
];

export function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const { user, employee, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="flex items-center px-6 py-4 border-b border-gray-200">
        <NavLink to="/dashboard" className="flex flex-col items-start space-y-1">
          <span className="text-xl font-bold text-primary">Horsemeat++</span>
          <span className="text-xs text-gray-500 italic">Fuel for Workhorses</span>
        </NavLink>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-6 overflow-y-auto">
        {navigationGroups.map((group) => (
          <div key={group.label} className="space-y-2">
            <h3 className="px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              {group.label}
            </h3>
            <div className="space-y-1">
              {group.items.map((item) => {
                // Check if user has permission to see this item
                const userRole = employee?.role || 'staff';
                const hasAccess = !item.roles || item.roles.includes(userRole);
                
                if (!hasAccess) return null;
                
                return (
                  <NavLink
                    key={item.name}
                    to={item.href}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors duration-200',
                        'hover:bg-primary/10 hover:text-primary',
                        isActive
                          ? 'bg-primary text-white shadow-soft border-l-4 border-accent'
                          : 'text-gray-700'
                      )
                    }
                    onClick={() => setIsOpen(false)}
                  >
                    <item.icon className="mr-3 h-5 w-5" />
                    {item.name}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User Profile */}
      <div className="border-t border-gray-200 p-4">
        <div className="flex items-center space-x-3 mb-4">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-primary text-white">
              {employee?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {employee?.full_name || user?.email?.split('@')[0] || 'User'}
            </p>
            <p className="text-xs text-gray-500 truncate">
              {user?.email}
            </p>
          </div>
        </div>
        <Button
          onClick={handleSignOut}
          variant="outline"
          size="sm"
          className="w-full justify-start"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile hamburger button */}
      <div className="md:hidden fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsOpen(!isOpen)}
          className="bg-white shadow-lg"
        >
          {isOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </Button>
      </div>

      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Desktop sidebar */}
      <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 bg-white shadow-lg z-30">
        <SidebarContent />
      </div>

      {/* Mobile sidebar */}
      <div
        className={cn(
          'md:hidden fixed inset-y-0 left-0 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out z-50',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <SidebarContent />
      </div>
    </>
  );
}