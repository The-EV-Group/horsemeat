# Technology Stack

## Frontend Framework
- **React 18** with TypeScript
- **Vite** as build tool and dev server
- **React Router v6** for client-side routing
- **TanStack Query** for server state management

## UI & Styling
- **Tailwind CSS** for styling with custom design system
- **shadcn/ui** component library (Radix UI primitives)
- **Lucide React** for icons
- **Inter** font family

## Backend & Database
- **Supabase** (PostgreSQL, Auth, Storage, Edge Functions)
- **Affinda API** for resume parsing integration

## Key Libraries
- **React Hook Form** with Zod validation
- **date-fns** for date manipulation
- **uuid** for unique identifiers
- **mammoth** for document processing

## Development Tools
- **ESLint** with TypeScript rules
- **PostCSS** with Autoprefixer
- **Lovable Tagger** for development mode

## Common Commands

```bash
# Development
npm run dev              # Start dev server on port 8080

# Building
npm run build           # Production build
npm run build:dev       # Development build
npm run preview         # Preview production build

# Code Quality
npm run lint            # Run ESLint

# Dependencies
npm install             # Install all dependencies
```

## Environment Variables
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key

## TypeScript Configuration
- Path aliases: `@/*` maps to `./src/*`
- Relaxed strict mode for rapid development
- Skip lib checks enabled for performance