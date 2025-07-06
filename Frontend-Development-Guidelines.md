
# Frontend Development Guidelines for Horsemeat++ 

This document provides comprehensive guidelines for maintaining consistency when building additional pages and features for the Horsemeat++ Contractor CRM using Windsurf IDE.

## Design System & Branding

### Color Palette
```css
/* Primary Colors */
--color-primary: #2d4590;        /* Main brand blue */
--color-accent: #7784ae;         /* Secondary accent */
--color-accent-2: #8b9acd;       /* Light accent variant */

/* Hover states */
--color-accent-hover: #9b2a5c;   /* Accent hover color */

/* Background & Text */
--color-bg: #eef3f6;             /* Main background */
--color-text: #1f2937;           /* Primary text */
--color-text-dark: #f9fafb;      /* Light text on dark backgrounds */

/* Status Colors */
--color-error: #e11d48;          /* Error/destructive actions */
--color-success: #10b981;        /* Success states */
--color-warning: #f59e0b;        /* Warning states */
```

### Typography
- **Font Family**: Inter (imported from Google Fonts)
- **Font Weights**: 300 (light), 400 (normal), 500 (medium), 600 (semibold), 700 (bold)
- **Headings**: Use `text-primary` for main headings, proper hierarchy (h1-h6)
- **Body Text**: Use `text-gray-700` for primary content, `text-gray-600` for secondary

### Logo & Branding
- **Logo**: "H++" in white text on primary background circle
- **Full Brand**: "Horsemeat++" with primary color
- **Subtitle**: "EV Group Contractor CRM" in gray text

## Component Architecture

### File Organization
```
src/
├── components/
│   ├── ui/                    # shadcn/ui components (don't modify)
│   ├── [ComponentName].tsx    # Reusable components
├── pages/
│   ├── [PageName].tsx         # Route components
│   ├── [category]/            # Grouped route components
├── hooks/
│   ├── use[HookName].ts       # Custom hooks
├── lib/
│   ├── utils.ts               # Utility functions
│   └── supabase.ts            # Database client
```

### Component Naming Conventions
- **PascalCase** for component files and function names
- **camelCase** for variables, functions, and props
- **kebab-case** for route paths
- **SCREAMING_SNAKE_CASE** for constants

### Import Organization
```typescript
// 1. React imports
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// 2. Third-party libraries
import { Loader2, Plus } from 'lucide-react';

// 3. UI components (shadcn/ui)
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// 4. Custom components
import { FormInput } from '@/components/FormInput';
import { Sidebar } from '@/components/Sidebar';

// 5. Hooks and utilities
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

// 6. Types
import type { Tables } from '@/integrations/supabase/types';
```

## UI Components & Patterns

### Cards
- Use `shadow-soft` class for subtle shadows
- Include proper `CardHeader` with `CardTitle` and `CardDescription`
- Use `CardContent` for the main content area

```tsx
<Card className="shadow-soft">
  <CardHeader>
    <CardTitle>Section Title</CardTitle>
    <CardDescription>Brief description of the section</CardDescription>
  </CardHeader>
  <CardContent>
    {/* Content here */}
  </CardContent>
</Card>
```

### Forms
- Use `FormInput` and `FormTextarea` components for consistency
- Include proper error handling and validation
- Mark required fields with red asterisk
- Use helper text for guidance

```tsx
<FormInput
  label="Field Name"
  value={value}
  onChange={(e) => setValue(e.target.value)}
  error={errors.fieldName}
  required
  helperText="Optional guidance text"
/>
```

### Buttons
- Primary actions: `bg-primary hover:bg-primary/90`
- Secondary actions: `variant="outline"`
- Destructive actions: `variant="destructive"`
- Loading states: Include `Loader2` icon with `animate-spin`

### Navigation & Routing
- Use `NavLink` for navigation with active state styling
- Implement proper loading and error states
- Use `Navigate` for redirects, not `useNavigate().push()`

## Layout Patterns

### Page Structure
```tsx
export default function PageName() {
  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-primary mb-2">Page Title</h1>
        <p className="text-gray-600">Page description</p>
      </div>

      {/* Page Content */}
      <div className="space-y-6">
        {/* Content sections */}
      </div>
    </div>
  );
}
```

### Grid Layouts
- Use responsive grids: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`
- Consistent spacing: `gap-6` for cards, `gap-4` for form fields
- Full-width on mobile, appropriate columns on larger screens

### Spacing
- Section spacing: `space-y-8` for major sections
- Card spacing: `space-y-6` within cards
- Form spacing: `space-y-4` for form fields
- Text spacing: `mb-2`, `mb-4` for headings and paragraphs

## State Management

### React State
- Use `useState` for component-level state
- Destructure state updates for clarity
- Use proper TypeScript types

```typescript
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);
const [data, setData] = useState<DataType[]>([]);
```

### Custom Hooks
- Follow the `use[Name]` convention
- Return objects with consistent naming
- Include loading and error states
- Use proper TypeScript return types

```typescript
export function useCustomHook() {
  const [data, setData] = useState<Type[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  return {
    data,
    loading,
    error,
    actionFunction,
    refetch,
  };
}
```

## Data Handling

### Supabase Integration
- Use the centralized client from `@/lib/supabase`
- Always handle errors gracefully
- Use TypeScript types from `@/integrations/supabase/types`
- Implement proper loading states

```typescript
const { data, error } = await supabase
  .from('table_name')
  .select('*')
  .eq('field', value);

if (error) {
  console.error('Error:', error);
  throw error;
}
```

### Error Handling
- Display user-friendly error messages
- Use Alert components for important errors
- Log detailed errors to console for debugging
- Provide fallback UI states

## Responsive Design

### Breakpoints
- **Mobile**: Default (< 768px)
- **Tablet**: `md:` (768px+)
- **Desktop**: `lg:` (1024px+)
- **Large**: `xl:` (1280px+)

### Sidebar Behavior
- Hidden on mobile (hamburger menu)
- Fixed on tablet and desktop
- Content adjusts with `md:ml-64` on larger screens

### Form Layouts
- Single column on mobile
- Two columns on tablet and desktop for most forms
- Full-width for text areas and longer inputs

## Accessibility Guidelines

### ARIA Labels
- Include proper labels for all interactive elements
- Use `aria-describedby` for help text
- Implement `aria-expanded` for collapsible content

### Keyboard Navigation
- Ensure all interactive elements are keyboard accessible
- Implement proper focus states
- Use proper tab order

### Color Contrast
- Ensure sufficient contrast ratios
- Don't rely solely on color for information
- Use icons alongside color indicators

## Performance Considerations

### Component Optimization
- Use `React.memo()` for expensive components
- Implement proper dependency arrays in `useEffect`
- Debounce search inputs and API calls

### Image and File Handling
- Validate file types and sizes before upload
- Show progress indicators for uploads
- Implement proper error handling for file operations

## Testing Approach

### Manual Testing Checklist
- [ ] Mobile responsiveness on multiple screen sizes
- [ ] Form validation and error states
- [ ] Loading states and spinners
- [ ] Navigation and routing
- [ ] Authentication flows
- [ ] File upload functionality

### Error Scenarios
- Test network failures
- Test invalid form submissions
- Test unauthorized access attempts
- Test file upload errors

## Code Quality Standards

### TypeScript
- Use strict typing, avoid `any`
- Define proper interfaces for props and data
- Use utility types when appropriate (`Partial<T>`, `Pick<T, K>`)

### CSS/Styling
- Prefer Tailwind utility classes over custom CSS
- Use the design system colors consistently
- Implement proper hover and focus states

### Code Formatting
- Use consistent indentation (2 spaces)
- Keep lines under 100 characters when possible
- Use meaningful variable and function names

## Common Patterns

### Loading States
```tsx
{loading ? (
  <div className="flex items-center justify-center p-8">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
) : (
  // Content
)}
```

### Error States
```tsx
{error && (
  <Alert variant="destructive">
    <AlertDescription>{error}</AlertDescription>
  </Alert>
)}
```

### Empty States
```tsx
<div className="text-center py-12">
  <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
    <Icon className="h-8 w-8 text-gray-400" />
  </div>
  <h3 className="text-lg font-medium text-gray-900 mb-2">No items found</h3>
  <p className="text-gray-600 mb-4">Get started by creating your first item.</p>
  <Button>Create Item</Button>
</div>
```

## Future Considerations

### Scalability
- Keep components small and focused
- Use proper data normalization
- Implement infinite scrolling for large lists
- Consider virtual scrolling for performance

### Feature Flags
- Structure code to easily add feature toggles
- Plan for A/B testing capabilities
- Consider user role-based feature access

### SEO & Meta Tags
- Update page titles dynamically
- Include proper meta descriptions
- Implement Open Graph tags for sharing

This document should be referenced when building any new features to ensure consistency across the entire application. Update this document as new patterns emerge or requirements change.
