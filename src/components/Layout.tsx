
import { Sidebar } from './Sidebar';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-app">
      <Sidebar />
      <div className="md:ml-64">
        <main className="p-6 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
