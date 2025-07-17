import React from 'react';
import { useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface BreadcrumbItem {
  label: string;
  href: string;
}

interface BreadcrumbsProps {
  items?: BreadcrumbItem[];
  currentPageLabel?: string;
}

// Define route mappings for automatic breadcrumb generation
const routeMappings: Record<string, string> = {
  'dashboard': 'Dashboard',
  'contractors': 'Contractors',
  'new': 'Add New',
  'search': 'Search',
  'profile': 'Profile',
  'keywords': 'Keywords',
  'recruits': 'Potential Recruits',
  'account': 'My Profile',
};

export function Breadcrumbs({ items, currentPageLabel }: BreadcrumbsProps) {
  const location = useLocation();
  
  // If items are provided, use those directly
  if (items && items.length > 0) {
    return (
      <nav aria-label="Breadcrumb" className="mb-4">
        <ol className="flex items-center space-x-2 text-sm text-gray-500">
          <li>
            <NavLink 
              to="/dashboard" 
              className="hover:text-primary transition-colors"
            >
              <Home className="h-4 w-4" />
              <span className="sr-only">Home</span>
            </NavLink>
          </li>
          
          {items.map((item, index) => (
            <React.Fragment key={item.href}>
              <li className="flex items-center">
                <ChevronRight className="h-4 w-4 mx-1" />
              </li>
              <li>
                {index === items.length - 1 ? (
                  <span className="font-medium text-gray-900">{item.label}</span>
                ) : (
                  <NavLink 
                    to={item.href}
                    className={({ isActive }) => 
                      cn("hover:text-primary transition-colors", 
                         isActive ? "text-gray-900 font-medium" : "")}
                  >
                    {item.label}
                  </NavLink>
                )}
              </li>
            </React.Fragment>
          ))}
        </ol>
      </nav>
    );
  }
  
  // Otherwise, generate breadcrumbs from the current path
  const pathSegments = location.pathname.split('/').filter(Boolean);
  
  // Don't show breadcrumbs on the dashboard
  if (pathSegments.length === 0 || (pathSegments.length === 1 && pathSegments[0] === 'dashboard')) {
    return null;
  }
  
  const breadcrumbItems = pathSegments.map((segment, index) => {
    // Build the path up to this segment
    const path = '/' + pathSegments.slice(0, index + 1).join('/');
    
    // Get a user-friendly label for this segment
    let label = routeMappings[segment] || segment;
    
    // For the last segment, use the provided currentPageLabel if available
    if (index === pathSegments.length - 1 && currentPageLabel) {
      label = currentPageLabel;
    }
    
    return { label, path };
  });

  return (
    <nav aria-label="Breadcrumb" className="mb-4">
      <ol className="flex items-center space-x-2 text-sm text-gray-500">
        <li>
          <NavLink 
            to="/dashboard" 
            className="hover:text-primary transition-colors"
          >
            <Home className="h-4 w-4" />
            <span className="sr-only">Home</span>
          </NavLink>
        </li>
        
        {breadcrumbItems.map((item, index) => (
          <React.Fragment key={item.path}>
            <li className="flex items-center">
              <ChevronRight className="h-4 w-4 mx-1" />
            </li>
            <li>
              {index === breadcrumbItems.length - 1 ? (
                <span className="font-medium text-gray-900">{item.label}</span>
              ) : (
                <NavLink 
                  to={item.path}
                  className={({ isActive }) => 
                    cn("hover:text-primary transition-colors", 
                       isActive ? "text-gray-900 font-medium" : "")}
                >
                  {item.label}
                </NavLink>
              )}
            </li>
          </React.Fragment>
        ))}
      </ol>
    </nav>
  );
}