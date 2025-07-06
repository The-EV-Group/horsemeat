
# Horsemeat++ (EV Group Contractor CRM)

A modern contractor relationship management system built with React, TypeScript, and Supabase.

## Features

- **Authentication**: Secure login/signup with Supabase Auth
- **Contractor Management**: Comprehensive contractor profiles with skills, experience, and availability
- **Keyword System**: Searchable, categorized skills and expertise tagging
- **File Upload**: Resume storage with Supabase Storage
- **Responsive Design**: Mobile-first design with sticky sidebar navigation
- **Modern UI**: Built with shadcn/ui components and Tailwind CSS

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **UI Framework**: Tailwind CSS, shadcn/ui
- **Icons**: Lucide React
- **Routing**: React Router v6
- **State Management**: React Query (TanStack Query)

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account

### Installation

1. **Clone the repository**
   ```bash
   git clone <YOUR_GIT_URL>
   cd horsemeat-plus-plus
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   
   Create a `.env` file in the root directory:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

4. **Database Setup**
   
   The application expects the following Supabase database schema (already configured):
   - `contractor` - Main contractor information
   - `keyword` - Skills, industries, certifications, etc.
   - `contractor_keyword` - Many-to-many relationship
   - `contractor_history` - Activity logging
   - `contractor_task` - Task management
   - `internal_employee` - User profiles

5. **Start the development server**
   ```bash
   npm run dev
   ```

   The application will be available at `http://localhost:5173`

## Project Structure

```
src/
├── components/           # Reusable UI components
│   ├── ui/              # shadcn/ui components (auto-generated)
│   ├── Sidebar.tsx      # Main navigation
│   ├── KeywordSelect.tsx # Multi-select keyword input
│   ├── FormInput.tsx    # Form components with validation
│   └── ...
├── hooks/               # Custom React hooks
│   ├── useAuth.tsx      # Authentication management
│   ├── useKeywords.ts   # Keyword CRUD operations
│   └── useContractors.ts # Contractor operations
├── lib/                 # Utility libraries  
│   └── supabase.ts      # Supabase client configuration
├── pages/               # Route components
│   ├── Login.tsx        # Authentication page
│   ├── Dashboard.tsx    # Main dashboard
│   ├── contractors/     # Contractor-related pages
│   ├── keywords/        # Keyword management
│   └── ...
├── integrations/        # External service integrations
│   └── supabase/        # Auto-generated types
└── styles/              # Global styles
```

## Key Features

### Navigation
- Sticky sidebar with mobile hamburger menu
- Auto-highlights current route
- User profile section with sign-out

### Add Contractor Form
- Comprehensive form covering all contractor attributes
- File upload for resumes (PDF/Word documents)
- Multi-category keyword selection with search and create
- Responsive two-column layout
- Form validation with error handling

### Keyword System
- Searchable multi-select components
- Categories: skills, industries, certifications, companies, job titles
- Auto-complete with create-if-missing functionality
- Real-time search with debouncing

### Authentication
- Email/password signup and signin
- Automatic employee record creation
- Session persistence across page reloads
- Protected route wrapper

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_SUPABASE_URL` | Your Supabase project URL | Yes |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anonymous key | Yes |

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Contributing

1. Follow the existing code style and patterns
2. Use TypeScript for all new code
3. Add proper error handling and loading states
4. Test forms and authentication flows
5. Ensure responsive design on mobile devices

## License

This project is proprietary software for EV Group.
