# Project Structure

## Source Organization

```
src/
├── components/           # Reusable UI components
│   ├── ui/              # shadcn/ui components (auto-generated, don't modify)
│   ├── auth/            # Authentication components
│   ├── contractors/     # Contractor-specific components
│   ├── keywords/        # Keyword management components
│   └── shared/          # Shared utility components
├── hooks/               # Custom React hooks
│   ├── auth/            # Authentication hooks
│   ├── contractors/     # Contractor data hooks
│   ├── keywords/        # Keyword management hooks
│   ├── dashboard/       # Dashboard-specific hooks
│   └── shared/          # Shared utility hooks
├── pages/               # Route components
│   ├── contractors/     # Contractor pages (New, Profile, Search)
│   ├── keywords/        # Keyword management pages
│   └── recruits/        # Recruitment pages
├── lib/                 # Utility libraries
│   └── schemas/         # Zod validation schemas
├── integrations/        # External service integrations
│   └── supabase/        # Supabase client and types
├── services/            # Business logic services
│   └── affinda/         # Resume parsing service
└── utils/               # General utilities
```

## Naming Conventions

- **Components**: PascalCase (e.g., `ContractorProfile.tsx`)
- **Hooks**: camelCase with `use` prefix (e.g., `useContractors.ts`)
- **Pages**: PascalCase matching route names (e.g., `Search.tsx`)
- **Utilities**: camelCase (e.g., `formUtils.ts`)

## Key Architectural Patterns

### Component Organization
- Feature-based grouping under `components/`
- Shared components in `components/shared/`
- UI primitives in `components/ui/` (managed by shadcn)

### Hook Structure
- Custom hooks follow `use[Feature]` pattern
- Return objects with consistent naming: `{ data, loading, error, actions }`
- Grouped by feature domain

### Page Structure
- Route components in `pages/` mirror URL structure
- Nested routes use folder organization
- Each page handles its own data fetching via hooks

### Service Layer
- External API integrations in `services/`
- Business logic separated from UI components
- Type definitions co-located with service code

## Import Patterns

Use absolute imports with `@/` alias:
```typescript
import { Button } from '@/components/ui/button'
import { useContractors } from '@/hooks/contractors/useContractors'
import { supabase } from '@/lib/supabase'
```

## Database Schema Integration
- Auto-generated types in `src/integrations/supabase/types.ts`
- Client configuration in `src/lib/supabase.ts`
- Database operations abstracted through custom hooks