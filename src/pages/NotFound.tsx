
export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-app">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-primary mb-4">404</h1>
        <p className="text-gray-600 mb-6">Page not found</p>
        <a 
          href="/dashboard" 
          className="text-primary hover:text-accent underline"
        >
          Return to Dashboard
        </a>
      </div>
    </div>
  );
}
